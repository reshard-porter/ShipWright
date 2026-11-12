import type { Route } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { BoardFilters } from "@/components/board/board-filters";
import { PostCard } from "@/components/board/post-card";
import { buttonStyles } from "@/components/ui/button";
import { Card, EmptyState, Skeleton } from "@/components/ui/card";
import { parseBoardFilters } from "@/lib/validation";
import { getCurrentUser } from "@/server/auth";
import { getBoard, getCategories, getMyVotes } from "@/server/queries";
import { pluralize } from "@/lib/utils";

export default function BoardPage({ searchParams }: PageProps<"/">) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-ink text-2xl font-semibold tracking-tight">Feedback</h1>
          <p className="text-muted mt-1">
            Tell us what to build next, and vote on ideas you care about.
          </p>
        </div>
        <Link href="/posts/new" className={buttonStyles("primary")}>
          <Plus className="size-4" aria-hidden />
          New feedback
        </Link>
      </div>

      <Suspense fallback={<Skeleton className="h-36 w-full" />}>
        <Filters />
      </Suspense>

      <Suspense fallback={<BoardSkeleton />}>
        <Board searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Filters() {
  const categories = await getCategories();
  return <BoardFilters categories={categories} />;
}

async function Board({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const filters = parseBoardFilters(await searchParams);
  const [board, voted, user] = await Promise.all([
    getBoard(filters),
    getMyVotes(),
    getCurrentUser(),
  ]);
  const votedSet = new Set(voted);

  if (board.posts.length === 0) {
    return (
      <EmptyState
        title={filters.q ? `No results for "${filters.q}"` : "No feedback here yet"}
        body={
          filters.q
            ? "Try different words, or post it as a new idea."
            : "Be the first to suggest something."
        }
        action={
          <Link href="/posts/new" className={buttonStyles("primary", "sm")}>
            Share an idea
          </Link>
        }
      />
    );
  }

  const pageHref = (page: number): Route => {
    const qs = new URLSearchParams(
      Object.entries({ ...filters, page: String(page) }).filter(
        ([k, v]) =>
          v !== undefined && !(k === "sort" && v === "trending") && !(k === "page" && v === "1"),
      ) as [string, string][],
    ).toString();
    return (qs ? `/?${qs}` : "/") as Route;
  };

  return (
    <section aria-labelledby="results-heading" className="space-y-4">
      <h2 id="results-heading" className="text-muted text-sm" aria-live="polite">
        {pluralize(board.total, "request")}
      </h2>
      <Card>
        <ul>
          {board.posts.map((post) => (
            <PostCard key={post.id} post={post} voted={votedSet.has(post.id)} signedIn={!!user} />
          ))}
        </ul>
      </Card>
      {board.pageCount > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-between text-sm">
          {board.page > 1 ? (
            <Link href={pageHref(board.page - 1)} className={buttonStyles("secondary", "sm")}>
              Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-muted">
            Page {board.page} of {board.pageCount}
          </span>
          {board.page < board.pageCount ? (
            <Link href={pageHref(board.page + 1)} className={buttonStyles("secondary", "sm")}>
              Next
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </section>
  );
}

function BoardSkeleton() {
  return (
    <Card aria-busy="true" aria-label="Loading feedback">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="border-border flex gap-4 border-b p-5 last:border-b-0">
          <Skeleton className="h-14 w-12" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </Card>
  );
}
