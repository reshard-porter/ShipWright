import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import type { Metadata } from "next";
import { ArrowLeft, GitMerge, Lock } from "lucide-react";
import { VoteButton } from "@/components/board/vote-button";
import { CommentForm } from "@/components/post/comment-form";
import { TriagePanel } from "@/components/post/triage-panel";
import { Avatar, Card, Skeleton } from "@/components/ui/card";
import { RelativeTime } from "@/components/ui/relative-time";
import { StatusBadge } from "@/components/ui/status-badge";
import { isTeam } from "@/lib/permissions";
import { STATUS_META } from "@/lib/status";
import { cn, pluralize } from "@/lib/utils";
import { toggleVoteAction } from "@/server/actions/posts";
import { getCurrentUser } from "@/server/auth";
import { getComments, getMyVotes, getPost, getTeam } from "@/server/queries";

type Params = PageProps<"/posts/[id]">["params"];

function parseId(raw: string) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const id = parseId((await params).id);
  const post = id ? await getPost(id) : null;
  return post
    ? { title: post.title, description: post.body.slice(0, 160) }
    : { title: "Not found" };
}

export default function PostPage({ params }: { params: Params }) {
  return (
    <div className="space-y-6">
      <Link href="/" className="text-muted hover:text-ink inline-flex items-center gap-1 text-sm">
        <ArrowLeft className="size-4" aria-hidden />
        All feedback
      </Link>
      <Suspense fallback={<PostSkeleton />}>
        <PostView params={params} />
      </Suspense>
    </div>
  );
}

async function PostView({ params }: { params: Params }) {
  const id = parseId((await params).id);
  if (!id) notFound();
  const [post, user, voted] = await Promise.all([getPost(id), getCurrentUser(), getMyVotes()]);
  if (!post) notFound();
  const team = isTeam(user);
  const [comments, members] = await Promise.all([getComments(id, team), team ? getTeam() : []]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div className="space-y-6">
        <Card className="p-5 sm:p-6">
          {post.mergedInto && (
            <div className="bg-surface-muted text-ink mb-5 flex items-center gap-2 rounded-lg px-3 py-2 text-sm">
              <GitMerge className="text-muted size-4" aria-hidden />
              Merged into{" "}
              <Link
                href={`/posts/${post.mergedInto.id}`}
                className="text-primary font-medium hover:underline"
              >
                {post.mergedInto.title}
              </Link>
            </div>
          )}
          <div className="flex gap-4">
            {!post.mergedInto && (
              <VoteButton
                key={`${voted.includes(id)}-${post.voteCount}`}
                postId={post.id}
                voted={voted.includes(id)}
                voteCount={post.voteCount}
                signedIn={!!user}
                onToggle={toggleVoteAction}
                size="lg"
              />
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-ink text-xl font-semibold tracking-tight sm:text-2xl">
                {post.title}
              </h1>
              <div className="text-muted mt-2 flex flex-wrap items-center gap-2 text-sm">
                <StatusBadge status={post.status} />
                <span>{post.category.name}</span>
                <span aria-hidden>·</span>
                <span>
                  {post.author.name}, <RelativeTime date={post.createdAt} />
                </span>
              </div>
            </div>
          </div>
          <p className="text-ink mt-5 leading-relaxed whitespace-pre-wrap">{post.body}</p>
          {post.mergedFrom.length > 0 && (
            <p className="text-muted mt-4 text-sm">
              Includes votes from {post.mergedFrom.map((m) => `"${m.title}"`).join(", ")}.
            </p>
          )}
        </Card>

        <section aria-labelledby="comments-heading" className="space-y-4">
          <h2 id="comments-heading" className="text-ink font-semibold">
            {pluralize(comments.length, "comment")}
          </h2>
          {comments.length > 0 && (
            <ol className="space-y-3">
              {comments.map((c) => (
                <li
                  key={c.id}
                  className={cn(
                    "rounded-xl border p-4",
                    c.isInternal
                      ? "border-dashed border-[var(--st-progress)] bg-[var(--st-progress-bg)]"
                      : "border-border bg-surface",
                  )}
                >
                  <div className="flex items-center gap-2 text-sm">
                    <Avatar name={c.authorName} className="size-6 text-[10px]" />
                    <span className="text-ink font-medium">{c.authorName}</span>
                    {c.authorRole !== "user" && (
                      <span className="bg-primary-soft text-primary rounded px-1.5 py-0.5 text-xs font-medium">
                        Team
                      </span>
                    )}
                    {c.isInternal && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--st-progress)]">
                        <Lock className="size-3" aria-hidden /> Internal
                      </span>
                    )}
                    <span className="text-muted ml-auto text-xs">
                      <RelativeTime date={c.createdAt} />
                    </span>
                  </div>
                  <p className="text-ink mt-2 text-sm leading-relaxed whitespace-pre-wrap">
                    {c.body}
                  </p>
                </li>
              ))}
            </ol>
          )}
          {user ? (
            <Card className="p-4">
              <CommentForm postId={post.id} canPostInternal={team} />
            </Card>
          ) : (
            <p className="text-muted text-sm">
              <Link
                href={`/sign-in?next=/posts/${post.id}`}
                className="text-primary font-medium hover:underline"
              >
                Sign in
              </Link>{" "}
              to join the discussion.
            </p>
          )}
        </section>
      </div>

      <aside className="space-y-4">
        {team && (
          <Card className="p-4">
            <h2 className="text-ink mb-3 text-sm font-semibold">Triage</h2>
            <TriagePanel
              postId={post.id}
              status={post.status}
              ownerId={post.ownerId}
              team={members}
              merged={!!post.mergedInto}
            />
          </Card>
        )}
        <Card className="p-4">
          <h2 className="text-ink mb-3 text-sm font-semibold">Details</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Request</dt>
              <dd className="text-ink font-mono">#{post.id}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Owner</dt>
              <dd className="text-ink">{post.owner?.name ?? "Unassigned"}</dd>
            </div>
          </dl>
        </Card>
        {post.timeline.length > 0 && (
          <Card className="p-4">
            <h2 className="text-ink mb-3 text-sm font-semibold">History</h2>
            <ol className="border-border space-y-3 border-l pl-4">
              {post.timeline.map((e) => (
                <li key={e.id} className="text-sm">
                  <p className="text-ink">
                    {STATUS_META[e.fromStatus].label} →{" "}
                    <span className="font-medium">{STATUS_META[e.toStatus].label}</span>
                  </p>
                  <p className="text-muted text-xs">
                    {e.actorName ?? "Someone"}, <RelativeTime date={e.createdAt} />
                  </p>
                </li>
              ))}
            </ol>
          </Card>
        )}
      </aside>
    </div>
  );
}

function PostSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]" aria-busy="true">
      <Card className="space-y-3 p-6">
        <Skeleton className="h-7 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-20 w-full" />
      </Card>
      <Card className="space-y-3 p-4">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-full" />
      </Card>
    </div>
  );
}
