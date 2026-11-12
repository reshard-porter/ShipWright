import { relations, sql, type SQL } from "drizzle-orm";
import {
  boolean,
  customType,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uuid,
  varchar,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

/** Postgres tsvector, used for full-text search on feedback posts. */
const tsvector = customType<{ data: string }>({
  dataType: () => "tsvector",
});

export const roleEnum = pgEnum("role", ["user", "member", "admin"]);

export const POST_STATUSES = [
  "under_review",
  "planned",
  "in_progress",
  "shipped",
  "closed",
] as const;
export const postStatusEnum = pgEnum("post_status", POST_STATUSES);

export const notificationTypeEnum = pgEnum("notification_type", [
  "status_changed",
  "shipped",
  "comment",
  "merged",
]);

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 254 }).notNull().unique(),
  name: varchar("name", { length: 80 }).notNull(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull().default("user"),
  createdAt: createdAt(),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 40 }).notNull(),
  slug: varchar("slug", { length: 40 }).notNull().unique(),
});

export const posts = pgTable(
  "posts",
  {
    id: serial("id").primaryKey(),
    title: varchar("title", { length: 120 }).notNull(),
    body: text("body").notNull(),
    status: postStatusEnum("status").notNull().default("under_review"),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
    mergedIntoId: integer("merged_into_id").references((): AnyPgColumn => posts.id, {
      onDelete: "set null",
    }),
    // Denormalised counters keep list queries to a single indexed scan.
    voteCount: integer("vote_count").notNull().default(0),
    commentCount: integer("comment_count").notNull().default(0),
    searchVector: tsvector("search_vector").generatedAlwaysAs(
      (): SQL =>
        sql`setweight(to_tsvector('english', coalesce(${posts.title}, '')), 'A') || setweight(to_tsvector('english', coalesce(${posts.body}, '')), 'B')`,
    ),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    statusChangedAt: timestamp("status_changed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("posts_status_votes_idx").on(t.status, t.voteCount.desc()),
    index("posts_created_idx").on(t.createdAt.desc()),
    index("posts_category_idx").on(t.categoryId),
    index("posts_search_idx").using("gin", t.searchVector),
  ],
);

export const votes = pgTable(
  "votes",
  {
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.postId, t.userId] }), index("votes_user_idx").on(t.userId)],
);

export const comments = pgTable(
  "comments",
  {
    id: serial("id").primaryKey(),
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    /** Internal notes are visible to the team only. */
    isInternal: boolean("is_internal").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("comments_post_idx").on(t.postId, t.createdAt)],
);

/** Audit trail of every status change, shown on the post timeline. */
export const statusEvents = pgTable(
  "status_events",
  {
    id: serial("id").primaryKey(),
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    fromStatus: postStatusEnum("from_status").notNull(),
    toStatus: postStatusEnum("to_status").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("status_events_post_idx").on(t.postId, t.createdAt)],
);

export const changelogEntries = pgTable("changelog_entries", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 140 }).notNull().unique(),
  title: varchar("title", { length: 120 }).notNull(),
  body: text("body").notNull(),
  authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
});

export const changelogPosts = pgTable(
  "changelog_posts",
  {
    entryId: integer("entry_id")
      .notNull()
      .references(() => changelogEntries.id, { onDelete: "cascade" }),
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.entryId, t.postId] })],
);

export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull(),
    postId: integer("post_id").references(() => posts.id, { onDelete: "cascade" }),
    message: text("message").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    index("notifications_user_unread_idx")
      .on(t.userId, t.createdAt.desc())
      .where(sql`${t.readAt} is null`),
  ],
);

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, { fields: [posts.authorId], references: [users.id], relationName: "author" }),
  owner: one(users, { fields: [posts.ownerId], references: [users.id], relationName: "owner" }),
  category: one(categories, { fields: [posts.categoryId], references: [categories.id] }),
  mergedInto: one(posts, { fields: [posts.mergedIntoId], references: [posts.id] }),
  comments: many(comments),
  votes: many(votes),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  post: one(posts, { fields: [comments.postId], references: [posts.id] }),
  author: one(users, { fields: [comments.authorId], references: [users.id] }),
}));

export type User = typeof users.$inferSelect;
export type Role = (typeof roleEnum.enumValues)[number];
export type PostStatus = (typeof POST_STATUSES)[number];
export type Post = typeof posts.$inferSelect;
