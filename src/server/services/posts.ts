import { and, asc, count, desc, eq, inArray, isNull, sql, type SQL } from "drizzle-orm";
import { categories, comments, posts, statusEvents, users, votes } from "@/db/schema";
import type { Executor } from "@/db/client";
import type { PostStatus } from "@/db/schema";
import { AppError } from "@/lib/errors";
import { can } from "@/lib/permissions";
import type { BoardFilters } from "@/lib/validation";
import { notifyAuthorOfComment } from "./notifications";
import type { Actor } from "./types";

export const PAGE_SIZE = 20;

/** Columns every list view needs. Selecting explicitly keeps payloads small. */
const listColumns = {
  id: posts.id,
  title: posts.title,
  body: posts.body,
  status: posts.status,
  voteCount: posts.voteCount,
  commentCount: posts.commentCount,
  createdAt: posts.createdAt,
  categoryName: categories.name,
  categorySlug: categories.slug,
  authorName: users.name,
};

export type PostListItem = {
  id: number;
  title: string;
  excerpt: string;
  status: PostStatus;
  voteCount: number;
  commentCount: number;
  createdAt: Date;
  categoryName: string;
  categorySlug: string;
  authorName: string;
};

function toListItem(row: { body: string } & Omit<PostListItem, "excerpt">): PostListItem {
  const { body, ...rest } = row;
  return { ...rest, excerpt: body.length > 180 ? `${body.slice(0, 177).trimEnd()}…` : body };
}

/**
 * Hot ranking: votes decay with age so new, popular requests surface.
 * score = votes / (hours_since_created + 2) ^ 1.5
 */
const trendingScore = sql`(${posts.voteCount} + 1) / power(extract(epoch from (now() - ${posts.createdAt})) / 3600 + 2, 1.5)`;

export async function listPosts(db: Executor, filters: BoardFilters) {
  const where: SQL[] = [isNull(posts.mergedIntoId)];
  if (filters.status) where.push(eq(posts.status, filters.status));
  else where.push(sql`${posts.status} <> 'closed'`);
  if (filters.category) where.push(eq(categories.slug, filters.category));

  const query = filters.q ? sql`websearch_to_tsquery('english', ${filters.q})` : null;
  if (query) where.push(sql`${posts.searchVector} @@ ${query}`);

  const orderBy =
    query && filters.sort === "trending"
      ? [desc(sql`ts_rank(${posts.searchVector}, ${query})`), desc(posts.voteCount)]
      : filters.sort === "top"
        ? [desc(posts.voteCount), desc(posts.createdAt)]
        : filters.sort === "new"
          ? [desc(posts.createdAt)]
          : [desc(trendingScore), desc(posts.id)];

  const [rows, [{ total }]] = await Promise.all([
    db
      .select(listColumns)
      .from(posts)
      .innerJoin(categories, eq(posts.categoryId, categories.id))
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(and(...where))
      .orderBy(...orderBy)
      .limit(PAGE_SIZE)
      .offset((filters.page - 1) * PAGE_SIZE),
    db
      .select({ total: count() })
      .from(posts)
      .innerJoin(categories, eq(posts.categoryId, categories.id))
      .where(and(...where)),
  ]);

  return {
    posts: rows.map(toListItem),
    total,
    page: filters.page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export async function listPostsByStatus(db: Executor, statuses: PostStatus[], limitPerStatus = 25) {
  const rows = await db
    .select(listColumns)
    .from(posts)
    .innerJoin(categories, eq(posts.categoryId, categories.id))
    .innerJoin(users, eq(posts.authorId, users.id))
    .where(and(inArray(posts.status, statuses), isNull(posts.mergedIntoId)))
    .orderBy(desc(posts.voteCount), desc(posts.statusChangedAt));

  const grouped = Object.fromEntries(statuses.map((s) => [s, [] as PostListItem[]])) as Record<
    PostStatus,
    PostListItem[]
  >;
  for (const row of rows) {
    const bucket = grouped[row.status];
    if (bucket.length < limitPerStatus) bucket.push(toListItem(row));
  }
  return grouped;
}

export async function getPostDetail(db: Executor, id: number) {
  const post = await db.query.posts.findFirst({
    where: eq(posts.id, id),
    with: {
      author: { columns: { id: true, name: true } },
      owner: { columns: { id: true, name: true } },
      category: true,
      mergedInto: { columns: { id: true, title: true } },
    },
  });
  if (!post) return null;

  const [timeline, mergedFrom] = await Promise.all([
    db
      .select({
        id: statusEvents.id,
        fromStatus: statusEvents.fromStatus,
        toStatus: statusEvents.toStatus,
        createdAt: statusEvents.createdAt,
        actorName: users.name,
      })
      .from(statusEvents)
      .leftJoin(users, eq(statusEvents.actorId, users.id))
      .where(eq(statusEvents.postId, id))
      .orderBy(asc(statusEvents.createdAt)),
    db.select({ id: posts.id, title: posts.title }).from(posts).where(eq(posts.mergedIntoId, id)),
  ]);

  const { searchVector: _searchVector, ...rest } = post;
  return { ...rest, timeline, mergedFrom };
}
export type PostDetail = NonNullable<Awaited<ReturnType<typeof getPostDetail>>>;

export async function listComments(db: Executor, postId: number, includeInternal: boolean) {
  return db
    .select({
      id: comments.id,
      body: comments.body,
      isInternal: comments.isInternal,
      createdAt: comments.createdAt,
      authorName: users.name,
      authorRole: users.role,
    })
    .from(comments)
    .innerJoin(users, eq(comments.authorId, users.id))
    .where(
      includeInternal
        ? eq(comments.postId, postId)
        : and(eq(comments.postId, postId), eq(comments.isInternal, false)),
    )
    .orderBy(asc(comments.createdAt));
}
export type CommentItem = Awaited<ReturnType<typeof listComments>>[number];

export async function listCategories(db: Executor) {
  return db.select().from(categories).orderBy(asc(categories.name));
}

export async function createPost(
  db: Executor,
  actor: Actor,
  input: { title: string; body: string; categoryId: number },
) {
  if (!can(actor, "post:create")) throw new AppError("FORBIDDEN", "You can't create posts.");

  const category = await db.query.categories.findFirst({
    where: eq(categories.id, input.categoryId),
  });
  if (!category) {
    throw new AppError("VALIDATION", "Pick a category.", { categoryId: ["Pick a category."] });
  }

  return db.transaction(async (tx) => {
    const [post] = await tx
      .insert(posts)
      .values({ ...input, authorId: actor.id, voteCount: 1 })
      .returning({ id: posts.id });
    // Authors automatically vote for their own request.
    await tx.insert(votes).values({ postId: post.id, userId: actor.id });
    return post;
  });
}

export async function addComment(
  db: Executor,
  actor: Actor,
  input: { postId: number; body: string; isInternal: boolean },
) {
  if (!can(actor, "comment:create")) throw new AppError("FORBIDDEN", "You can't comment.");
  if (input.isInternal && !can(actor, "comment:internal")) {
    throw new AppError("FORBIDDEN", "Only the team can leave internal notes.");
  }

  return db.transaction(async (tx) => {
    const [post] = await tx
      .select({ id: posts.id })
      .from(posts)
      .where(eq(posts.id, input.postId))
      .for("update");
    if (!post) throw new AppError("NOT_FOUND", "That post doesn't exist.");

    const [comment] = await tx
      .insert(comments)
      .values({ ...input, authorId: actor.id })
      .returning({ id: comments.id });
    if (!input.isInternal) {
      await tx
        .update(posts)
        .set({ commentCount: sql`${posts.commentCount} + 1`, updatedAt: new Date() })
        .where(eq(posts.id, input.postId));
    }
    const notified = input.isInternal
      ? []
      : await notifyAuthorOfComment(tx, {
          postId: input.postId,
          actorId: actor.id,
          actorName: actor.name,
        });
    return { ...comment, notified };
  });
}
