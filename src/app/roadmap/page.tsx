import Link from "next/link";
import type { Metadata } from "next";
import { ChevronUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { STATUS_DOT } from "@/components/ui/status-badge";
import { ROADMAP_STATUSES, STATUS_META } from "@/lib/status";
import { cn } from "@/lib/utils";
import { getRoadmap } from "@/server/queries";

export const metadata: Metadata = {
  title: "Roadmap",
  description: "What we're planning, building, and have shipped.",
};

/** Fully cached: prerendered at build time and refreshed when a status changes. */
export default async function RoadmapPage() {
  const roadmap = await getRoadmap([...ROADMAP_STATUSES]);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-ink text-2xl font-semibold tracking-tight">Roadmap</h1>
        <p className="text-muted mt-1">
          What we&apos;re planning, building, and have shipped, based on your votes.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {ROADMAP_STATUSES.map((status) => (
          <section key={status} aria-labelledby={`col-${status}`} className="space-y-3">
            <h2
              id={`col-${status}`}
              className="text-ink flex items-center gap-2 px-1 text-sm font-semibold"
            >
              <span className={cn("size-2 rounded-full", STATUS_DOT[status])} aria-hidden />
              {STATUS_META[status].label}
              <span className="text-muted font-normal">{roadmap[status].length}</span>
            </h2>
            <ul className="space-y-2">
              {roadmap[status].map((post) => (
                <li key={post.id}>
                  <Card className="group hover:border-border-strong relative flex gap-3 p-3 transition-colors">
                    <span className="bg-surface-muted text-ink flex h-11 w-10 shrink-0 flex-col items-center justify-center rounded-md text-xs font-semibold tabular-nums">
                      <ChevronUp className="size-3.5" aria-hidden />
                      {post.voteCount}
                      <span className="sr-only"> votes</span>
                    </span>
                    <div className="min-w-0">
                      <Link
                        href={`/posts/${post.id}`}
                        className="text-ink group-hover:text-primary text-sm font-medium"
                      >
                        <span className="absolute inset-0" aria-hidden />
                        {post.title}
                      </Link>
                      <p className="text-muted mt-0.5 text-xs">{post.categoryName}</p>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
