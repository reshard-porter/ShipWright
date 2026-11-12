import Link from "next/link";
import type { Metadata } from "next";
import { Card, EmptyState } from "@/components/ui/card";
import { RelativeTime } from "@/components/ui/relative-time";
import { StatusBadge } from "@/components/ui/status-badge";
import { QuickStatus } from "@/components/dashboard/quick-status";
import { getBoard, getStats } from "@/server/queries";

export const metadata: Metadata = { title: "Triage" };

export default async function TriagePage() {
  const [stats, queue, inFlight] = await Promise.all([
    getStats(),
    getBoard({ status: "under_review", sort: "top", page: 1 }),
    getBoard({ status: "in_progress", sort: "top", page: 1 }),
  ]);

  const tiles = [
    { label: "Waiting for triage", value: stats.untriaged, tone: "text-[var(--st-progress)]" },
    { label: "Planned or in progress", value: stats.inFlight, tone: "text-[var(--st-planned)]" },
    { label: "Votes this week", value: stats.votesThisWeek, tone: "text-accent" },
    { label: "Shipped in 30 days", value: stats.shipped30d, tone: "text-[var(--st-shipped)]" },
  ];

  return (
    <div className="space-y-8">
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.label} className="p-4">
            <dt className="text-muted text-sm">{t.label}</dt>
            <dd className={`mt-1 text-3xl font-semibold tabular-nums ${t.tone}`}>{t.value}</dd>
          </Card>
        ))}
      </dl>

      <section aria-labelledby="queue-heading" className="space-y-3">
        <div>
          <h2 id="queue-heading" className="text-ink font-semibold">
            Triage queue
          </h2>
          <p className="text-muted text-sm">
            New requests, most-voted first. Pick a status to move them on.
          </p>
        </div>
        {queue.posts.length === 0 ? (
          <EmptyState title="Inbox zero" body="Every request has been triaged." />
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-border text-muted border-b text-left">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Request
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Votes
                  </th>
                  <th scope="col" className="hidden px-4 py-3 font-medium md:table-cell">
                    Category
                  </th>
                  <th scope="col" className="hidden px-4 py-3 font-medium md:table-cell">
                    Submitted
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Move to
                  </th>
                </tr>
              </thead>
              <tbody>
                {queue.posts.map((post) => (
                  <tr key={post.id} className="border-border border-b last:border-b-0">
                    <td className="px-4 py-3">
                      <Link
                        href={`/posts/${post.id}`}
                        className="text-ink hover:text-primary font-medium hover:underline"
                      >
                        {post.title}
                      </Link>
                      <span className="text-muted ml-2 font-mono text-xs">#{post.id}</span>
                    </td>
                    <td className="text-ink px-4 py-3 text-right font-semibold tabular-nums">
                      {post.voteCount}
                    </td>
                    <td className="text-muted hidden px-4 py-3 md:table-cell">
                      {post.categoryName}
                    </td>
                    <td className="text-muted hidden px-4 py-3 md:table-cell">
                      <RelativeTime date={post.createdAt} />
                    </td>
                    <td className="px-4 py-3">
                      <QuickStatus postId={post.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>

      <section aria-labelledby="progress-heading" className="space-y-3">
        <h2 id="progress-heading" className="text-ink font-semibold">
          In progress
        </h2>
        <Card>
          <ul>
            {inFlight.posts.map((post) => (
              <li
                key={post.id}
                className="border-border flex items-center justify-between gap-4 border-b px-4 py-3 last:border-b-0"
              >
                <Link
                  href={`/posts/${post.id}`}
                  className="text-ink hover:text-primary text-sm font-medium hover:underline"
                >
                  {post.title}
                </Link>
                <StatusBadge status={post.status} />
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </div>
  );
}
