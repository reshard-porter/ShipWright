import Link from "next/link";
import type { Metadata } from "next";
import { ChangelogBody, ShippedRequests } from "@/components/changelog-body";
import { Card, EmptyState } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { getChangelog } from "@/server/queries";

export const metadata: Metadata = {
  title: "Changelog",
  description: "Everything we've shipped, newest first.",
};

export default async function ChangelogPage() {
  const entries = await getChangelog();
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-ink text-2xl font-semibold tracking-tight">Changelog</h1>
        <p className="text-muted mt-1">Everything we&apos;ve shipped, newest first.</p>
      </div>
      {entries.length === 0 ? (
        <EmptyState
          title="Nothing shipped yet"
          body="Updates will appear here as features go live."
        />
      ) : (
        <ol className="space-y-6">
          {entries.map((entry) => (
            <li key={entry.id} className="grid gap-2 sm:grid-cols-[140px_1fr] sm:gap-6">
              <time
                dateTime={new Date(entry.publishedAt).toISOString()}
                className="text-muted pt-5 text-sm"
              >
                {formatDate(entry.publishedAt)}
              </time>
              <Card className="p-5">
                <h2 className="text-ink text-lg font-semibold">
                  <Link
                    href={`/changelog/${entry.slug}`}
                    className="hover:text-primary hover:underline"
                  >
                    {entry.title}
                  </Link>
                </h2>
                <div className="mt-3">
                  <ChangelogBody body={entry.body} />
                </div>
                {entry.posts.length > 0 && <ShippedRequests posts={entry.posts} />}
              </Card>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
