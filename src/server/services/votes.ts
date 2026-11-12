import { and, eq, inArray, sql } from "drizzle-orm";
import { posts, votes } from "@/db/schema";
import type { Executor } from "@/db/client";
import { AppError } from "@/lib/errors";
import { can } from "@/lib/permissions";
import type { Actor } from "./types";

/**
 * Toggles the actor's vote on a post and returns the new state.
 *
 * Runs in a transaction that locks the post row, so concurrent toggles from
 * double-clicks or multiple tabs can't drift the denormalised `vote_count`.
 */
export async function toggleVote(db: Executor, actor: Actor, postId: number) {
  if (!can(actor, "post:vote")) throw new AppError("FORBIDDEN", "You can't vote.");

  return db.transaction(async (tx) => {
    const [post] = await tx
      .select({ id: posts.id, status: posts.status, mergedIntoId: posts.mergedIntoId })
      .from(posts)
      .where(eq(posts.id, postId))
      .for("update");
    if (!post) throw new AppError("NOT_FOUND", "That post doesn't exist.");
    if (post.mergedIntoId) {
      throw new AppError("CONFLICT", "This request was merged. Vote on the original instead.");
    }

    const removed = await tx
      .delete(votes)
      .where(and(eq(votes.postId, postId), eq(votes.userId, actor.id)))
      .returning({ postId: votes.postId });
    const voted = removed.length === 0;
    if (voted) await tx.insert(votes).values({ postId, userId: actor.id });

    const [updated] = await tx
      .update(posts)
      .set({ voteCount: sql`${posts.voteCount} + ${voted ? 1 : -1}` })
      .where(eq(posts.id, postId))
      .returning({ voteCount: posts.voteCount });

    return { voted, voteCount: updated.voteCount };
  });
}

/** Post ids the user has voted on, optionally limited to a set of posts. */
export async function getVotedPostIds(db: Executor, userId: string, postIds?: number[]) {
  if (postIds && postIds.length === 0) return [];
  const rows = await db
    .select({ postId: votes.postId })
    .from(votes)
    .where(
      postIds
        ? and(eq(votes.userId, userId), inArray(votes.postId, postIds))
        : eq(votes.userId, userId),
    );
  return rows.map((r) => r.postId);
}
