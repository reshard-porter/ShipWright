import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { toggleVoteAction } from "@/server/actions/posts";
import type { PostListItem } from "@/server/services/posts";
import { RelativeTime } from "@/components/ui/relative-time";
import { VoteButton } from "./vote-button";

export function PostCard({
  post,
  voted,
  signedIn,
}: {
  post: PostListItem;
  voted: boolean;
  signedIn: boolean;
}) {
  return (
    <li className="border-border flex gap-4 border-b p-4 last:border-b-0 sm:p-5">
      <VoteButton
        key={`${voted}-${post.voteCount}`}
        postId={post.id}
        voted={voted}
        voteCount={post.voteCount}
        signedIn={signedIn}
        onToggle={toggleVoteAction}
      />
      <div className="min-w-0 flex-1">
        <h3 className="text-ink font-medium">
          <Link href={`/posts/${post.id}`} className="hover:text-primary hover:underline">
            {post.title}
          </Link>
        </h3>
        <p className="text-muted mt-1 line-clamp-2 text-sm">{post.excerpt}</p>
        <div className="text-muted mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
          <StatusBadge status={post.status} />
          <span className="border-border rounded-full border px-2 py-0.5">{post.categoryName}</span>
          <span className="inline-flex items-center gap-1">
            <MessageSquare className="size-3.5" aria-hidden />
            <span className="sr-only">Comments:</span>
            {post.commentCount}
          </span>
          <span>
            {post.authorName} · <RelativeTime date={post.createdAt} />
          </span>
        </div>
      </div>
    </li>
  );
}
