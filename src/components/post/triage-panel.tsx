"use client";

import { useActionState, useState, useTransition } from "react";
import type { PostStatus } from "@/db/schema";
import { Field, Input, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { STATUS_META, allowedTransitions } from "@/lib/status";
import { assignOwnerAction, changeStatusAction, mergeAction } from "@/server/actions/team";

type Props = {
  postId: number;
  status: PostStatus;
  ownerId: string | null;
  team: { id: string; name: string }[];
  merged: boolean;
};

export function TriagePanel({ postId, status, ownerId, team, merged }: Props) {
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [mergeState, merge] = useActionState(mergeAction, null);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, success: string) =>
    startTransition(async () => {
      const result = await fn();
      setMessage(
        result.ok
          ? { tone: "ok", text: success }
          : { tone: "error", text: result.error ?? "Failed." },
      );
    });

  if (merged)
    return (
      <p className="text-muted text-sm">This request was merged, so it can&apos;t be triaged.</p>
    );

  return (
    <div className="space-y-4" aria-busy={isPending}>
      <Field label="Status">
        {(props) => (
          <Select
            {...props}
            value={status}
            disabled={isPending}
            onChange={(e) => {
              const to = e.target.value as PostStatus;
              run(
                () => changeStatusAction(postId, to),
                `Moved to ${STATUS_META[to].label}. Followers were notified.`,
              );
            }}
          >
            <option value={status}>{STATUS_META[status].label}</option>
            {allowedTransitions(status).map((s) => (
              <option key={s} value={s}>
                {STATUS_META[s].label}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Owner">
        {(props) => (
          <Select
            {...props}
            value={ownerId ?? ""}
            disabled={isPending}
            onChange={(e) =>
              run(() => assignOwnerAction(postId, e.target.value || null), "Owner updated.")
            }
          >
            <option value="">Unassigned</option>
            {team.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <p
        role="status"
        aria-live="polite"
        className={
          message?.tone === "error"
            ? "text-sm text-[var(--st-closed)]"
            : "text-sm text-[var(--st-shipped)]"
        }
      >
        {message?.text}
      </p>

      <form action={merge} className="border-border space-y-2 border-t pt-4">
        <input type="hidden" name="sourceId" value={postId} />
        <Field
          label="Merge into request #"
          hint="Votes move to the other request and this one is closed."
          error={mergeState && !mergeState.ok ? [mergeState.error] : undefined}
        >
          {(props) => (
            <Input {...props} name="targetId" type="number" min={1} required placeholder="12" />
          )}
        </Field>
        <SubmitButton variant="secondary" pendingLabel="Merging…" className="w-full">
          Merge duplicate
        </SubmitButton>
      </form>
    </div>
  );
}
