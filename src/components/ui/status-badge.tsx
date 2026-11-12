import type { PostStatus } from "@/db/schema";
import { STATUS_META } from "@/lib/status";
import { cn } from "@/lib/utils";

const STYLES: Record<PostStatus, string> = {
  under_review: "bg-[var(--st-review-bg)] text-[var(--st-review)]",
  planned: "bg-[var(--st-planned-bg)] text-[var(--st-planned)]",
  in_progress: "bg-[var(--st-progress-bg)] text-[var(--st-progress)]",
  shipped: "bg-[var(--st-shipped-bg)] text-[var(--st-shipped)]",
  closed: "bg-[var(--st-closed-bg)] text-[var(--st-closed)]",
};

export const STATUS_DOT: Record<PostStatus, string> = {
  under_review: "bg-[var(--st-review)]",
  planned: "bg-[var(--st-planned)]",
  in_progress: "bg-[var(--st-progress)]",
  shipped: "bg-[var(--st-shipped)]",
  closed: "bg-[var(--st-closed)]",
};

export function StatusBadge({ status, className }: { status: PostStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        STYLES[status],
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", STATUS_DOT[status])} aria-hidden />
      {STATUS_META[status].label}
    </span>
  );
}
