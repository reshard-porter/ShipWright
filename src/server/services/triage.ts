import { and, count, eq, sql } from "drizzle-orm";
import { posts, statusEvents, users, votes } from "@/db/schema";
import type { Executor } from "@/db/client";
import type { PostStatus } from "@/db/schema";
import { AppError } from "@/lib/errors";
import { can } from "@/lib/permissions";
import { STATUS_META, canTransition } from "@/lib/status";
import { notifyFollowers } from "./notifications";
import type { Actor } from "./types";

/**
 * Moves a post to a new status, records it on the timeline, and notifies
 * everyone following it. Returns the user ids that were notified so callers
 * can refresh their caches.
 */
export async function changeStatus(db: Executor, actor: Actor, postId: number, to: PostStatus) {
  if (!can(actor, "post:triage"))
    throw new AppError("FORBIDDEN", "Only the team can change status.");

  return db.transaction(async (tx) => {
    const [post] = await tx
      .select({ id: posts.id, title: posts.title, status: posts.status })
      .from(posts)
      .where(eq(posts.id, postId))
      .for("update");
    if (!post) throw new AppError("NOT_FOUND", "That post doesn't exist.");
    if (!canTransition(post.status, to)) {
      throw new AppError(
        "CONFLICT",
        `Can't move from ${STATUS_META[post.status].label} to ${STATUS_META[to].label}.`,
      );
    }

    const now = new Date();
    await tx
      .update(posts)
      .set({ status: to, statusChangedAt: now, updatedAt: now })
      .where(eq(posts.id, postId));
    await tx
      .insert(statusEvents)
      .values({ postId, actorId: actor.id, fromStatus: post.status, toStatus: to });

    const notified = await notifyFollowers(tx, {
      postId,
      actorId: actor.id,
      type: to === "shipped" ? "shipped" : "status_changed",
      message:
        to === "shipped"
          ? `"${post.title}" just shipped`
          : `"${post.title}" moved to ${STATUS_META[to].label}`,
    });
    return { from: post.status, to, notified };
  });
}

export async function assignOwner(
  db: Executor,
  actor: Actor,
  postId: number,
  ownerId: string | null,
) {
  if (!can(actor, "post:triage"))
    throw new AppError("FORBIDDEN", "Only the team can assign owners.");
  if (ownerId) {
    const owner = await db.query.users.findFirst({
      where: eq(users.id, ownerId),
      columns: { role: true },
    });
    if (!owner || !can(owner, "post:triage")) {
      throw new AppError("VALIDATION", "Owners must be team members.");
    }
  }
  const updated = await db
    .update(posts)
    .set({ ownerId, updatedAt: new Date() })
    .where(eq(posts.id, postId))
    .returning({ id: posts.id });
  if (updated.length === 0) throw new AppError("NOT_FOUND", "That post doesn't exist.");
}

/**
 * Merges a duplicate request into a target. Votes move to the target (users
 * who voted on both are only counted once), the source is closed and linked
 * to the target, and followers of the source are told where to go.
 */
export async function mergePosts(db: Executor, actor: Actor, sourceId: number, targetId: number) {
  if (!can(actor, "post:merge")) throw new AppError("FORBIDDEN", "Only the team can merge posts.");
  if (sourceId === targetId)
    throw new AppError("VALIDATION", "A post can't be merged into itself.");

  return db.transaction(async (tx) => {
    // Lock both rows in a consistent order to avoid deadlocks.
    const locked = await tx
      .select({
        id: posts.id,
        title: posts.title,
        status: posts.status,
        mergedIntoId: posts.mergedIntoId,
      })
      .from(posts)
      .where(sql`${posts.id} in (${sourceId}, ${targetId})`)
      .orderBy(posts.id)
      .for("update");
    const source = locked.find((p) => p.id === sourceId);
    const target = locked.find((p) => p.id === targetId);
    if (!source || !target) throw new AppError("NOT_FOUND", "One of those posts doesn't exist.");
    if (source.mergedIntoId) throw new AppError("CONFLICT", "That post was already merged.");
    if (target.mergedIntoId)
      throw new AppError("CONFLICT", "You can't merge into a post that was itself merged.");

    await tx.execute(sql`
      insert into ${votes} (post_id, user_id, created_at)
      select ${targetId}, user_id, created_at from ${votes} where post_id = ${sourceId}
      on conflict do nothing
    `);
    const [{ total }] = await tx
      .select({ total: count() })
      .from(votes)
      .where(eq(votes.postId, targetId));
    await tx
      .update(posts)
      .set({ voteCount: total, updatedAt: new Date() })
      .where(eq(posts.id, targetId));

    const notified = await notifyFollowers(tx, {
      postId: sourceId,
      actorId: actor.id,
      type: "merged",
      message: `"${source.title}" was merged into "${target.title}"`,
    });

    const now = new Date();
    await tx
      .update(posts)
      .set({ mergedIntoId: targetId, status: "closed", statusChangedAt: now, updatedAt: now })
      .where(and(eq(posts.id, sourceId)));
    if (source.status !== "closed") {
      await tx.insert(statusEvents).values({
        postId: sourceId,
        actorId: actor.id,
        fromStatus: source.status,
        toStatus: "closed",
      });
    }

    return { targetVoteCount: total, notified };
  });
}
