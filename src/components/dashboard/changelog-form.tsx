"use client";

import { useActionState } from "react";
import { Field, Input, Textarea } from "@/components/ui/field";
import { StatusBadge } from "@/components/ui/status-badge";
import { SubmitButton } from "@/components/ui/submit-button";
import type { PostStatus } from "@/db/schema";
import { publishChangelogAction } from "@/server/actions/team";

type Candidate = { id: number; title: string; status: PostStatus; voteCount: number };

export function ChangelogForm({ candidates }: { candidates: Candidate[] }) {
  const [state, action] = useActionState(publishChangelogAction, null);
  const errors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={action} className="space-y-5" noValidate>
      {state && !state.ok && !state.fieldErrors && (
        <p
          role="alert"
          className="rounded-lg bg-[var(--st-closed-bg)] px-3 py-2 text-sm text-[var(--st-closed)]"
        >
          {state.error}
        </p>
      )}
      <Field label="Title" error={errors?.title}>
        {(props) => (
          <Input
            {...props}
            name="title"
            required
            maxLength={120}
            placeholder="CSV export and faster search"
          />
        )}
      </Field>
      <Field
        label="What changed"
        error={errors?.body}
        hint="Plain text. Blank lines start new paragraphs."
      >
        {(props) => <Textarea {...props} name="body" required rows={7} />}
      </Field>
      <fieldset className="space-y-2">
        <legend className="text-ink text-sm font-medium">Requests this ships</legend>
        <p className="text-muted text-sm">
          Linked requests move to Shipped and their voters get notified.
        </p>
        <div className="border-border max-h-72 space-y-1 overflow-y-auto rounded-lg border p-2">
          {candidates.map((c) => (
            <label
              key={c.id}
              className="hover:bg-surface-muted flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5"
            >
              <input
                type="checkbox"
                name="postIds"
                value={c.id}
                className="size-4 accent-[var(--primary)]"
              />
              <span className="text-ink flex-1 text-sm">{c.title}</span>
              <span className="text-muted text-xs tabular-nums">{c.voteCount} votes</span>
              <StatusBadge status={c.status} />
            </label>
          ))}
        </div>
      </fieldset>
      <SubmitButton pendingLabel="Publishing…">Publish update</SubmitButton>
    </form>
  );
}
