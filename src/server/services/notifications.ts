import { and, desc, eq, isNull, ne, count } from "drizzle-orm";
import { notifications, votes, posts } from "@/db/schema";
import type { Executor } from "@/db/client";

type NotificationType = (typeof notifications.$inferInsert)["type"];

/**
 * Notifies everyone following a post: its voters and its author, minus the
 * person who triggered the change. Returns the user ids notified.
 */
export async function notifyFollowers(
  db: Executor,
  input: { postId: number; actorId: string | null; type: NotificationType; message: string },
) {
  const voterRows = await db
    .select({ userId: votes.userId })
    .from(votes)
    .where(eq(votes.postId, input.postId));
  const [post] = await db
    .select({ authorId: posts.authorId })
    .from(posts)
    .where(eq(posts.id, input.postId));

  const recipients = new Set(voterRows.map((v) => v.userId));
  if (post) recipients.add(post.authorId);
  if (input.actorId) recipients.delete(input.actorId);
  if (recipients.size === 0) return [];

  await db.insert(notifications).values(
    [...recipients].map((userId) => ({
      userId,
      type: input.type,
      postId: input.postId,
      message: input.message,
    })),
  );
  return [...recipients];
}

export async function listNotifications(db: Executor, userId: string, limit = 50) {
  return db
    .select({
      id: notifications.id,
      type: notifications.type,
      message: notifications.message,
      postId: notifications.postId,
      readAt: notifications.readAt,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function countUnread(db: Executor, userId: string) {
  const [{ value }] = await db
    .select({ value: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return value;
}

export async function markAllRead(db: Executor, userId: string) {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
}

/** Notify a post's author that someone else commented. */
export async function notifyAuthorOfComment(
  db: Executor,
  input: { postId: number; actorId: string; actorName: string },
) {
  const [post] = await db
    .select({ authorId: posts.authorId, title: posts.title })
    .from(posts)
    .where(and(eq(posts.id, input.postId), ne(posts.authorId, input.actorId)));
  if (!post) return [];
  await db.insert(notifications).values({
    userId: post.authorId,
    type: "comment",
    postId: input.postId,
    message: `${input.actorName} commented on "${post.title}"`,
  });
  return [post.authorId];
}
