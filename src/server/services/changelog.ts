import { desc, eq, inArray } from "drizzle-orm";
import { changelogEntries, changelogPosts, posts } from "@/db/schema";
import type { Executor } from "@/db/client";
import { AppError } from "@/lib/errors";
import { can } from "@/lib/permissions";
import { canTransition } from "@/lib/status";
import { slugify } from "@/lib/utils";
import { changeStatus } from "./triage";
import type { Actor } from "./types";

/**
 * Publishes a changelog entry. Any linked request that isn't shipped yet is
 * moved to Shipped, which notifies its voters.
 */
export async function publishEntry(
  db: Executor,
  actor: Actor,
  input: { title: string; body: string; postIds: number[] },
) {
  if (!can(actor, "changelog:publish"))
    throw new AppError("FORBIDDEN", "Only the team can publish updates.");

  return db.transaction(async (tx) => {
    const postIds = [...new Set(input.postIds)];
    const linked = postIds.length
      ? await tx
          .select({ id: posts.id, status: posts.status })
          .from(posts)
          .where(inArray(posts.id, postIds))
      : [];
    if (linked.length !== postIds.length)
      throw new AppError("VALIDATION", "Some linked requests don't exist.");
    const blocked = linked.filter(
      (p) => p.status !== "shipped" && !canTransition(p.status, "shipped"),
    );
    if (blocked.length)
      throw new AppError("CONFLICT", "Closed requests can't be linked to an update.");

    const base = slugify(input.title) || "update";
    const clash = await tx.query.changelogEntries.findFirst({
      where: eq(changelogEntries.slug, base),
    });
    const slug = clash ? `${base}-${Date.now().toString(36)}` : base;

    const [entry] = await tx
      .insert(changelogEntries)
      .values({ slug, title: input.title, body: input.body, authorId: actor.id })
      .returning({ id: changelogEntries.id, slug: changelogEntries.slug });
    if (postIds.length) {
      await tx
        .insert(changelogPosts)
        .values(postIds.map((postId) => ({ entryId: entry.id, postId })));
    }

    const notified = new Set<string>();
    for (const post of linked) {
      if (post.status === "shipped") continue;
      const result = await changeStatus(tx, actor, post.id, "shipped");
      result.notified.forEach((id) => notified.add(id));
    }
    return { ...entry, shippedPostIds: linked.map((p) => p.id), notified: [...notified] };
  });
}

export async function listEntries(db: Executor, limit = 30) {
  const entries = await db
    .select({
      id: changelogEntries.id,
      slug: changelogEntries.slug,
      title: changelogEntries.title,
      body: changelogEntries.body,
      publishedAt: changelogEntries.publishedAt,
    })
    .from(changelogEntries)
    .orderBy(desc(changelogEntries.publishedAt))
    .limit(limit);
  if (entries.length === 0) return [];

  const links = await db
    .select({
      entryId: changelogPosts.entryId,
      id: posts.id,
      title: posts.title,
      voteCount: posts.voteCount,
    })
    .from(changelogPosts)
    .innerJoin(posts, eq(changelogPosts.postId, posts.id))
    .where(
      inArray(
        changelogPosts.entryId,
        entries.map((e) => e.id),
      ),
    );

  return entries.map((entry) => ({
    ...entry,
    posts: links.filter((l) => l.entryId === entry.id).map(({ entryId: _e, ...p }) => p),
  }));
}

export async function getEntryBySlug(db: Executor, slug: string) {
  const entry = await db.query.changelogEntries.findFirst({
    where: eq(changelogEntries.slug, slug),
  });
  if (!entry) return null;
  const linked = await db
    .select({ id: posts.id, title: posts.title, voteCount: posts.voteCount })
    .from(changelogPosts)
    .innerJoin(posts, eq(changelogPosts.postId, posts.id))
    .where(eq(changelogPosts.entryId, entry.id));
  return { ...entry, posts: linked };
}
