"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { changeStatusAction } from "@/server/actions/team";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { status: "planned", label: "Plan" },
  { status: "in_progress", label: "Start" },
  { status: "closed", label: "Close" },
] as const;

export function QuickStatus({ postId }: { postId: number }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-1">
      {OPTIONS.map((o) => (
        <button
          key={o.status}
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await changeStatusAction(postId, o.status);
              setError(result.ok ? null : result.error);
            })
          }
          className={cn(
            "border-border text-muted hover:border-border-strong hover:text-ink rounded-md border px-2 py-1 text-xs font-medium disabled:opacity-50",
          )}
        >
          {o.label}
        </button>
      ))}
      {isPending && <Check className="text-muted size-4 animate-pulse" aria-label="Saving" />}
      {error && (
        <span role="alert" className="text-xs text-[var(--st-closed)]">
          {error}
        </span>
      )}
    </div>
  );
}
