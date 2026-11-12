"use client";

import { useActionState, useEffect, useRef } from "react";
import { Field, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { addCommentAction } from "@/server/actions/posts";

export function CommentForm({
  postId,
  canPostInternal,
}: {
  postId: number;
  canPostInternal: boolean;
}) {
  const [state, action] = useActionState(addCommentAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-3">
      <input type="hidden" name="postId" value={postId} />
      <Field
        label="Add a comment"
        error={state && !state.ok ? (state.fieldErrors?.body ?? [state.error]) : undefined}
      >
        {(props) => (
          <Textarea
            {...props}
            name="body"
            required
            maxLength={2000}
            placeholder="Share your use case or ask a question"
          />
        )}
      </Field>
      <div className="flex items-center justify-between gap-3">
        {canPostInternal ? (
          <label className="text-muted flex items-center gap-2 text-sm">
            <input type="checkbox" name="isInternal" className="size-4 accent-[var(--primary)]" />
            Internal note (team only)
          </label>
        ) : (
          <span />
        )}
        <SubmitButton pendingLabel="Posting…">Comment</SubmitButton>
      </div>
    </form>
  );
}
