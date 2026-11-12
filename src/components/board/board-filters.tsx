"use client";

import type { Route } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { controlStyles } from "@/components/ui/field";
import { POST_STATUSES } from "@/db/schema";
import { STATUS_META } from "@/lib/status";
import { cn } from "@/lib/utils";
import { SORTS } from "@/lib/validation";

const SORT_LABELS = { trending: "Trending", top: "Top", new: "New" } as const;

/**
 * Filters live in the URL so every view is shareable and the back button
 * works. Links and a GET form mean it all works before JavaScript loads; the
 * search box is then enhanced to update as you type.
 */
export function BoardFilters({ categories }: { categories: { name: string; slug: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const hrefWith = (changes: Record<string, string | null>): Route => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    next.delete("page");
    const qs = next.toString();
    return (qs ? `${pathname}?${qs}` : pathname) as Route;
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  const sort = params.get("sort") ?? "trending";
  const status = params.get("status");
  const category = params.get("category");

  return (
    <div className="space-y-4" data-pending={isPending || undefined}>
      <form
        role="search"
        action={pathname}
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(() => router.replace(hrefWith({ q: query.trim() || null })));
        }}
        className="relative"
      >
        <Search
          className="text-muted pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          aria-hidden
        />
        <label htmlFor="board-search" className="sr-only">
          Search feedback
        </label>
        <input
          id="board-search"
          name="q"
          type="search"
          value={query}
          placeholder="Search feedback"
          className={cn(controlStyles, "h-10 pl-9")}
          onChange={(e) => {
            const value = e.target.value;
            setQuery(value);
            clearTimeout(timer.current);
            timer.current = setTimeout(() => {
              startTransition(() =>
                router.replace(hrefWith({ q: value.trim() || null }), { scroll: false }),
              );
            }, 300);
          }}
        />
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="group"
          aria-label="Sort"
          className="border-border bg-surface inline-flex rounded-lg border p-0.5"
        >
          {SORTS.map((s) => (
            <Link
              key={s}
              href={hrefWith({ sort: s === "trending" ? null : s })}
              scroll={false}
              aria-current={sort === s ? "true" : undefined}
              className={cn(
                "rounded-md px-3 py-1 text-sm font-medium",
                sort === s ? "bg-primary-soft text-primary" : "text-muted hover:text-ink",
              )}
            >
              {SORT_LABELS[s]}
            </Link>
          ))}
        </div>
        <label className="text-muted flex items-center gap-2 text-sm">
          <span aria-hidden>Category</span>
          <select
            aria-label="Filter by category"
            value={category ?? ""}
            onChange={(e) =>
              startTransition(() =>
                router.replace(hrefWith({ category: e.target.value || null }), { scroll: false }),
              )
            }
            className={cn(controlStyles, "h-9 w-40")}
          >
            <option value="">All</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div role="group" aria-label="Status" className="flex flex-wrap gap-2">
        {[null, ...POST_STATUSES.filter((s) => s !== "closed")].map((s) => (
          <Link
            key={s ?? "all"}
            href={hrefWith({ status: s })}
            scroll={false}
            aria-current={status === s ? "true" : undefined}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium",
              status === s
                ? "border-primary bg-primary-soft text-primary"
                : "border-border text-muted hover:border-border-strong hover:text-ink",
            )}
          >
            {s ? STATUS_META[s].label : "All open"}
          </Link>
        ))}
      </div>
    </div>
  );
}
