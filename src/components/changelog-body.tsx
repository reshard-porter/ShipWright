import Link from "next/link";

/** Renders plain text with blank-line paragraphs. No HTML is ever injected. */
export function ChangelogBody({ body }: { body: string }) {
  return (
    <div className="text-ink space-y-3 leading-relaxed">
      {body.split(/\n{2,}/).map((para, i) => (
        <p key={i} className="whitespace-pre-wrap">
          {para}
        </p>
      ))}
    </div>
  );
}

export function ShippedRequests({
  posts,
}: {
  posts: { id: number; title: string; voteCount: number }[];
}) {
  return (
    <div className="border-border mt-4 border-t pt-4">
      <p className="text-muted text-xs font-medium tracking-wide uppercase">Requests shipped</p>
      <ul className="mt-2 space-y-1">
        {posts.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-3 text-sm">
            <Link href={`/posts/${p.id}`} className="text-primary hover:underline">
              {p.title}
            </Link>
            <span className="text-muted text-xs tabular-nums">{p.voteCount} votes</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
