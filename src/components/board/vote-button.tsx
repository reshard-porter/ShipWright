"use client";

import Link from "next/link";
import { ChevronUp } from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";
import type { ActionResult } from "@/lib/errors";
import { cn } from "@/lib/utils";

type VoteState = { voted: boolean; voteCount: number };

type Props = VoteState & {
  postId: number;
  signedIn: boolean;
  /** Injected so the component can be tested without a server. */
  onToggle: (postId: number) => Promise<ActionResult<VoteState>>;
  size?: "md" | "lg";
};

/**
 * Optimistic upvote. The count changes instantly; if the server rejects the
 * vote the UI rolls back and explains why. Rapid clicks are serialised by the
 * transition, and the server locks the row, so counts can't drift.
 */
export function VoteButton({ postId, voted, voteCount, signedIn, onToggle, size = "md" }: Props) {
  const [confirmed, setConfirmed] = useState<VoteState>({ voted, voteCount });
  const [optimistic, setOptimistic] = useOptimistic(confirmed, (state: VoteState) => ({
    voted: !state.voted,
    voteCount: state.voteCount + (state.voted ? -1 : 1),
  }));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const classes = cn(
    "flex shrink-0 flex-col items-center justify-center rounded-lg border font-semibold tabular-nums transition-colors",
    size === "lg" ? "h-16 w-14 text-base" : "h-14 w-12 text-sm",
    optimistic.voted
      ? "border-accent bg-accent-soft text-accent"
      : "border-border-strong bg-surface text-ink hover:border-accent hover:text-accent",
  );
  const label = `${optimistic.voted ? "Remove vote" : "Upvote"}, ${optimistic.voteCount} ${optimistic.voteCount === 1 ? "vote" : "votes"}`;

  if (!signedIn) {
    return (
      <Link
        href={`/sign-in?next=/posts/${postId}`}
        className={classes}
        aria-label={`Sign in to vote, ${voteCount} votes`}
      >
        <ChevronUp className="size-4" aria-hidden />
        {voteCount}
      </Link>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        className={classes}
        aria-pressed={optimistic.voted}
        aria-label={label}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            setOptimistic(null);
            const result = await onToggle(postId);
            if (result.ok) setConfirmed(result.data);
            else setError(result.error);
          });
        }}
        data-pending={isPending || undefined}
      >
        <ChevronUp className="size-4" aria-hidden />
        {optimistic.voteCount}
      </button>
      <p
        role="status"
        aria-live="polite"
        className={cn(
          error
            ? "bg-ink text-page absolute top-full left-0 z-10 mt-1 w-48 rounded-md px-2 py-1 text-xs"
            : "sr-only",
        )}
      >
        {error}
      </p>
    </div>
  );
}
