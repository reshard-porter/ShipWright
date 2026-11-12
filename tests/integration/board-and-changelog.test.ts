import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { posts } from "@/db/schema";
import { getEntryBySlug, publishEntry } from "@/server/services/changelog";
import { createPost, listPosts, PAGE_SIZE } from "@/server/services/posts";
import { changeStatus } from "@/server/services/triage";
import { createUser, verifyCredentials } from "@/server/services/users";
import { db, fx, withFreshDatabase } from "./helpers";

withFreshDatabase();

const make = (title: string, body = "Some detail about the request.") =>
  createPost(db, fx.alice, { title, body, categoryId: fx.categoryId });

describe("board queries", () => {
  it("searches titles and bodies with stemming", async () => {
    await make("Export feedback to CSV");
    await make("Slack alerts", "Send notifications to our Slack workspace.");
    await make("Unrelated idea");

    const byTitle = await listPosts(db, { q: "exporting", sort: "trending", page: 1 });
    expect(byTitle.posts.map((p) => p.title)).toEqual(["Export feedback to CSV"]);
    const byBody = await listPosts(db, { q: "notification", sort: "trending", page: 1 });
    expect(byBody.posts.map((p) => p.title)).toEqual(["Slack alerts"]);
  });

  it("paginates and hides closed requests unless asked", async () => {
    for (let i = 0; i < PAGE_SIZE + 3; i++) await make(`Request number ${i}`);
    const page2 = await listPosts(db, { sort: "new", page: 2 });
    expect(page2).toMatchObject({ total: PAGE_SIZE + 3, pageCount: 2 });
    expect(page2.posts).toHaveLength(3);

    await changeStatus(db, fx.member, page2.posts[0].id, "closed");
    expect((await listPosts(db, { sort: "new", page: 1 })).total).toBe(PAGE_SIZE + 2);
    expect((await listPosts(db, { status: "closed", sort: "new", page: 1 })).total).toBe(1);
  });
});

describe("publishing a changelog entry", () => {
  it("ships linked requests and gives clashing titles unique slugs", async () => {
    const a = await make("CSV export");
    const b = await make("Dark mode");
    const entry = await publishEntry(db, fx.member, {
      title: "New: CSV export",
      body: "You can now export.",
      postIds: [a.id, b.id],
    });

    const rows = await db.select({ id: posts.id, status: posts.status }).from(posts);
    expect(rows.every((r) => r.status === "shipped")).toBe(true);
    expect(entry.slug).toBe("new-csv-export");
    expect((await getEntryBySlug(db, entry.slug))?.posts).toHaveLength(2);

    const again = await publishEntry(db, fx.member, {
      title: "New: CSV export",
      body: "Follow-up.",
      postIds: [],
    });
    expect(again.slug).not.toBe(entry.slug);
  });

  it("is atomic: nothing is published if a linked request can't ship", async () => {
    const ok = await make("Good one");
    const closed = await make("Closed one");
    await changeStatus(db, fx.member, closed.id, "closed");

    await expect(
      publishEntry(db, fx.member, {
        title: "Mixed",
        body: "Should fail.",
        postIds: [ok.id, closed.id],
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    const [still] = await db.select().from(posts).where(eq(posts.id, ok.id));
    expect(still.status).toBe("under_review");
  });

  it("is limited to the team", async () => {
    await expect(
      publishEntry(db, fx.alice, { title: "Hi", body: "Nope nope nope", postIds: [] }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("accounts", () => {
  it("verifies passwords and rejects duplicate emails", async () => {
    await createUser(db, { name: "Dana", email: "dana@test.dev", password: "correct horse" });
    expect(await verifyCredentials(db, "dana@test.dev", "correct horse")).toMatchObject({
      name: "Dana",
      role: "user",
    });
    expect(await verifyCredentials(db, "dana@test.dev", "wrong")).toBeNull();
    expect(await verifyCredentials(db, "nobody@test.dev", "whatever")).toBeNull();
    await expect(
      createUser(db, { name: "Dana 2", email: "dana@test.dev", password: "another one" }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });
});
