import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { ChangelogBody, ShippedRequests } from "@/components/changelog-body";
import { Card, Skeleton } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { getChangelog, getChangelogEntry } from "@/server/queries";

type Params = PageProps<"/changelog/[slug]">["params"];

/** Prerender every published entry at build time; new ones render on first visit. */
export async function generateStaticParams() {
  const entries = await getChangelog();
  return entries.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const entry = await getChangelogEntry((await params).slug);
  return entry
    ? { title: entry.title, description: entry.body.slice(0, 160) }
    : { title: "Not found" };
}

export default function EntryPage({ params }: { params: Params }) {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/changelog"
        className="text-muted hover:text-ink inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Changelog
      </Link>
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <Entry params={params} />
      </Suspense>
    </div>
  );
}

async function Entry({ params }: { params: Params }) {
  const entry = await getChangelogEntry((await params).slug);
  if (!entry) notFound();
  return (
    <Card className="p-6">
      <time dateTime={new Date(entry.publishedAt).toISOString()} className="text-muted text-sm">
        {formatDate(entry.publishedAt)}
      </time>
      <h1 className="text-ink mt-1 text-2xl font-semibold tracking-tight">{entry.title}</h1>
      <div className="mt-4">
        <ChangelogBody body={entry.body} />
      </div>
      {entry.posts.length > 0 && <ShippedRequests posts={entry.posts} />}
    </Card>
  );
}
