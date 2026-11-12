import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { notifications, posts, statusEvents } from "@/db/schema";
import { addComment, createPost, listComments, listPosts } from "@/server/services/posts";
import { changeStatus, mergePosts } from "@/server/services/triage";
import { toggleVote } from "@/server/services/votes";
import { db, fx, withFreshDatabase } from "./helpers";

withFreshDatabase();

async function postWithVoters(title = "Dark mode") {
  const { id } = await createPost(db, fx.alice, {
    title,
    body: "Please add a dark theme for late nights.",
    categoryId: fx.categoryId,
  });
  await toggleVote(db, fx.bob, id);
  await toggleVote(db, fx.carol, id);
  return id;
}

describe("changing status", () => {
  it("is limited to the team", async () => {
    const id = await postWithVoters();
    await expect(changeStatus(db, fx.alice, id, "planned")).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("records history and notifies the author and voters, but not the actor", async () => {
    const id = await postWithVoters();
    await toggleVote(db, fx.member, id);
    const { notified } = await changeStatus(db, fx.member, id, "shipped");

    expect(new Set(notified)).toEqual(new Set([fx.alice.id, fx.bob.id, fx.carol.id]));
    const rows = await db.select().from(notifications);
    expect(rows.every((n) => n.type === "shipped")).toBe(true);
    const events = await db.select().from(statusEvents).where(eq(statusEvents.postId, id));
    expect(events).toMatchObject([
      { fromStatus: "under_review", toStatus: "shipped", actorId: fx.member.id },
    ]);
  });

  it("rejects transitions the workflow doesn't allow", async () => {
    const id = await postWithVoters();
    await changeStatus(db, fx.member, id, "closed");
    await expect(changeStatus(db, fx.member, id, "shipped")).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });
});

describe("merging duplicates", () => {
  it("moves votes without double counting, and closes the duplicate", async () => {
    const target = await postWithVoters("Dark mode"); // alice, bob, carol
    const { id: source } = await createPost(db, fx.member, {
      title: "Night theme",
      body: "A darker theme would be easier on the eyes.",
      categoryId: fx.categoryId,
    });
    await toggleVote(db, fx.bob, source); // bob voted on both

    const result = await mergePosts(db, fx.member, source, target);
    expect(result.targetVoteCount).toBe(4); // alice, bob, carol, member

    const [dup] = await db.select().from(posts).where(eq(posts.id, source));
    expect(dup).toMatchObject({ status: "closed", mergedIntoId: target });
    await expect(toggleVote(db, fx.carol, source)).rejects.toMatchObject({ code: "CONFLICT" });

    const board = await listPosts(db, { sort: "top", page: 1 });
    expect(board.posts.map((p) => p.id)).toEqual([target]);
  });

  it("refuses to merge a post into itself or into a merged post", async () => {
    const a = await postWithVoters("A request");
    const b = await postWithVoters("B request");
    const c = await postWithVoters("C request");
    await expect(mergePosts(db, fx.member, a, a)).rejects.toMatchObject({ code: "VALIDATION" });
    await mergePosts(db, fx.member, b, a);
    await expect(mergePosts(db, fx.member, c, b)).rejects.toMatchObject({ code: "CONFLICT" });
  });
});

describe("comments", () => {
  it("hides internal notes from customers and keeps them out of the public count", async () => {
    const id = await postWithVoters();
    await addComment(db, fx.bob, { postId: id, body: "Yes please", isInternal: false });
    await addComment(db, fx.member, {
      postId: id,
      body: "Big customer asked too",
      isInternal: true,
    });

    expect(await listComments(db, id, false)).toHaveLength(1);
    expect(await listComments(db, id, true)).toHaveLength(2);
    const [post] = await db.select().from(posts).where(eq(posts.id, id));
    expect(post.commentCount).toBe(1);
  });

  it("only lets the team write internal notes", async () => {
    const id = await postWithVoters();
    await expect(
      addComment(db, fx.bob, { postId: id, body: "sneaky", isInternal: true }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("notifies the author when someone else comments", async () => {
    const id = await postWithVoters();
    const { notified } = await addComment(db, fx.bob, {
      postId: id,
      body: "Same here",
      isInternal: false,
    });
    expect(notified).toEqual([fx.alice.id]);
    const own = await addComment(db, fx.alice, { postId: id, body: "Thanks!", isInternal: false });
    expect(own.notified).toEqual([]);
  });
});
