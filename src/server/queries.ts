import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import type { PostStatus } from "@/db/schema";
import type { BoardFilters } from "@/lib/validation";
import * as changelog from "./services/changelog";
import * as notifications from "./services/notifications";
import * as postsService from "./services/posts";
import { getDashboardStats as dashboardStats } from "./services/stats";
import { listTeam } from "./services/users";
import { getVotedPostIds } from "./services/votes";
import { getCurrentUser } from "./auth";
import { tags } from "./tags";

/*
 * Cached read layer. Every function here is wrapped in `use cache` with a
 * tag, and every Server Action that changes the data calls `updateTag` with
 * the same tag. Public pages therefore render from cache and are prerendered
 * into the static shell, while writes are visible immediately.
 */

export async function getBoard(filters: BoardFilters) {
  "use cache";
  cacheTag(tags.posts);
  cacheLife("minutes");
  return postsService.listPosts(db, filters);
}

export async function getRoadmap(statuses: PostStatus[]) {
  "use cache";
  cacheTag(tags.posts);
  cacheLife("hours");
  return postsService.listPostsByStatus(db, statuses);
}

export async function getPost(id: number) {
  "use cache";
  cacheTag(tags.posts, tags.post(id));
  cacheLife("hours");
  return postsService.getPostDetail(db, id);
}

export async function getComments(postId: number, includeInternal: boolean) {
  "use cache";
  cacheTag(tags.comments(postId));
  cacheLife("hours");
  return postsService.listComments(db, postId, includeInternal);
}

export async function getCategories() {
  "use cache";
  cacheTag(tags.categories);
  cacheLife("days");
  return postsService.listCategories(db);
}

export async function getChangelog() {
  "use cache";
  cacheTag(tags.changelog);
  cacheLife("hours");
  return changelog.listEntries(db);
}

export async function getChangelogEntry(slug: string) {
  "use cache";
  cacheTag(tags.changelog);
  cacheLife("hours");
  return changelog.getEntryBySlug(db, slug);
}

/*
 * Per-user data: the exported getter resolves the signed-in user itself and
 * the cached helper stays private, so no caller can ask for someone else's
 * data by passing a different id.
 */
export async function getMyVotes(): Promise<number[]> {
  const user = await getCurrentUser();
  return user ? votesFor(user.id) : [];
}

async function votesFor(userId: string) {
  "use cache";
  cacheTag(tags.votes(userId));
  cacheLife("minutes");
  return getVotedPostIds(db, userId);
}

export async function getMyNotifications() {
  const user = await getCurrentUser();
  return user ? notificationsFor(user.id) : { items: [], unread: 0 };
}

async function notificationsFor(userId: string) {
  "use cache";
  cacheTag(tags.notifications(userId));
  cacheLife("minutes");
  const [items, unread] = await Promise.all([
    notifications.listNotifications(db, userId),
    notifications.countUnread(db, userId),
  ]);
  return { items, unread };
}

export async function getTeam() {
  "use cache";
  cacheTag(tags.team);
  cacheLife("hours");
  return listTeam(db);
}

export async function getStats() {
  "use cache";
  cacheTag(tags.posts);
  cacheLife("minutes");
  return dashboardStats(db);
}
