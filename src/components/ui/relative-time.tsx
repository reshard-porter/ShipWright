"use client";

import { formatDate, timeAgo } from "@/lib/utils";

/**
 * "3 days ago", computed in the browser. Rendering it on the server would bake
 * a stale value into cached pages; the absolute date stays in the tooltip.
 */
export function RelativeTime({ date }: { date: Date | string }) {
  const d = new Date(date);
  return (
    <time dateTime={d.toISOString()} title={formatDate(d)} suppressHydrationWarning>
      {timeAgo(d)}
    </time>
  );
}
