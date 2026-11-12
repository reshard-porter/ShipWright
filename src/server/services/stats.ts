import { and, count, eq, gte, isNull, sql } from "drizzle-orm";
import { posts, votes } from "@/db/schema";
import type { Executor } from "@/db/client";

export async function getDashboardStats(db: Executor) {
  const weekAgo = sql`now() - interval '7 days'`;
  const monthAgo = sql`now() - interval '30 days'`;
  const [[untriaged], [votesThisWeek], [shipped30d], [open]] = await Promise.all([
    db
      .select({ value: count() })
      .from(posts)
      .where(and(eq(posts.status, "under_review"), isNull(posts.mergedIntoId))),
    db.select({ value: count() }).from(votes).where(gte(votes.createdAt, weekAgo)),
    db
      .select({ value: count() })
      .from(posts)
      .where(and(eq(posts.status, "shipped"), gte(posts.statusChangedAt, monthAgo))),
    db
      .select({ value: count() })
      .from(posts)
      .where(and(sql`${posts.status} in ('planned', 'in_progress')`, isNull(posts.mergedIntoId))),
  ]);
  return {
    untriaged: untriaged.value,
    votesThisWeek: votesThisWeek.value,
    shipped30d: shipped30d.value,
    inFlight: open.value,
  };
}
