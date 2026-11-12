import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Bell, GitMerge, MessageSquare, Rocket } from "lucide-react";
import { MarkReadButton } from "@/components/mark-read-button";
import { Card, EmptyState, Skeleton } from "@/components/ui/card";
import { RelativeTime } from "@/components/ui/relative-time";
import { cn } from "@/lib/utils";
import { requirePageUser } from "@/server/auth";
import { getMyNotifications } from "@/server/queries";

export const metadata: Metadata = { title: "Notifications" };

const ICONS = { shipped: Rocket, status_changed: Bell, comment: MessageSquare, merged: GitMerge };

export default function NotificationsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-ink text-2xl font-semibold tracking-tight">Notifications</h1>
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <List />
      </Suspense>
    </div>
  );
}

async function List() {
  await requirePageUser(undefined, "/notifications");
  const { items, unread } = await getMyNotifications();
  if (items.length === 0) {
    return (
      <EmptyState
        title="You're all caught up"
        body="Vote on requests to hear when they move forward or ship."
      />
    );
  }
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-muted text-sm">{unread ? `${unread} unread` : "All read"}</p>
        {unread > 0 && <MarkReadButton />}
      </div>
      <Card>
        <ul>
          {items.map((n) => {
            const Icon = ICONS[n.type];
            return (
              <li
                key={n.id}
                className={cn(
                  "border-border flex gap-3 border-b px-4 py-3 last:border-b-0",
                  !n.readAt && "bg-primary-soft/50",
                )}
              >
                <Icon
                  className={cn(
                    "mt-0.5 size-4 shrink-0",
                    n.type === "shipped" ? "text-[var(--st-shipped)]" : "text-muted",
                  )}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  {n.postId ? (
                    <Link
                      href={`/posts/${n.postId}`}
                      className="text-ink hover:text-primary text-sm hover:underline"
                    >
                      {n.message}
                    </Link>
                  ) : (
                    <p className="text-ink text-sm">{n.message}</p>
                  )}
                  <p className="text-muted text-xs">
                    <RelativeTime date={n.createdAt} />
                  </p>
                </div>
                {!n.readAt && (
                  <span className="bg-accent mt-1.5 size-2 rounded-full" aria-label="Unread" />
                )}
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
