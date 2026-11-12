"use client";

import { useActionState } from "react";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { createPostAction } from "@/server/actions/posts";

export function NewPostForm({ categories }: { categories: { id: number; name: string }[] }) {
  const [state, action] = useActionState(createPostAction, null);
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
      <Field
        label="Title"
        error={errors?.title}
        hint="A short summary, like “Export feedback to CSV”."
      >
        {(props) => <Input {...props} name="title" required maxLength={120} autoFocus />}
      </Field>
      <Field label="Category" error={errors?.categoryId}>
        {(props) => (
          <Select {...props} name="categoryId" required defaultValue="">
            <option value="" disabled>
              Choose a category
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field
        label="Details"
        error={errors?.body}
        hint="What are you trying to do, and what gets in the way?"
      >
        {(props) => <Textarea {...props} name="body" required maxLength={5000} rows={6} />}
      </Field>
      <SubmitButton pendingLabel="Posting…">Post feedback</SubmitButton>
    </form>
  );
}
