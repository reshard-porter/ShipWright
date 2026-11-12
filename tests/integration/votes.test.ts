import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { posts, votes } from "@/db/schema";
import { createPost } from "@/server/services/posts";
import { getVotedPostIds, toggleVote } from "@/server/services/votes";
import { db, fx, withFreshDatabase } from "./helpers";

withFreshDatabase();

const newPost = () =>
  createPost(db, fx.alice, {
    title: "Export to CSV",
    body: "We need CSV export for reports.",
    categoryId: fx.categoryId,
  });

describe("voting", () => {
  it("authors automatically vote for their own post", async () => {
    const { id } = await newPost();
    expect(await getVotedPostIds(db, fx.alice.id)).toEqual([id]);
    const [post] = await db.select().from(posts).where(eq(posts.id, id));
    expect(post.voteCount).toBe(1);
  });

  it("toggles on and off", async () => {
    const { id } = await newPost();
    expect(await toggleVote(db, fx.bob, id)).toEqual({ voted: true, voteCount: 2 });
    expect(await toggleVote(db, fx.bob, id)).toEqual({ voted: false, voteCount: 1 });
  });

  it("keeps the counter consistent under concurrent toggles", async () => {
    const { id } = await newPost();
    // 9 rapid toggles from one user (odd, so they end up voted) plus votes from two others, all at once.
    await Promise.all([
      ...Array.from({ length: 9 }, () => toggleVote(db, fx.bob, id)),
      toggleVote(db, fx.carol, id),
      toggleVote(db, fx.member, id),
    ]);
    const [post] = await db.select().from(posts).where(eq(posts.id, id));
    const rows = await db.select().from(votes).where(eq(votes.postId, id));
    expect(rows).toHaveLength(4);
    expect(post.voteCount).toBe(rows.length);
  });

  it("rejects votes on missing posts", async () => {
    await expect(toggleVote(db, fx.bob, 999)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
