"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionResult } from "@/lib/errors";

type Mode = "sign-in" | "sign-up";
type Action = (prev: unknown, formData: FormData) => Promise<ActionResult>;

const DEMO_ACCOUNTS = [
  { label: "Admin", name: "Ava", email: "ava@shipwright.dev" },
  { label: "Team member", name: "Marcus", email: "marcus@shipwright.dev" },
  { label: "Customer", name: "Jordan", email: "jordan.blake@example.com" },
];

export function AuthForm({
  mode,
  action,
  next,
  showDemo,
}: {
  mode: Mode;
  action: Action;
  next: string;
  showDemo: boolean;
}) {
  const [state, formAction] = useActionState(action, null);
  const errors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-4" noValidate>
        <input type="hidden" name="next" value={next} />
        {state && !state.ok && !state.fieldErrors && (
          <p
            role="alert"
            className="rounded-lg bg-[var(--st-closed-bg)] px-3 py-2 text-sm text-[var(--st-closed)]"
          >
            {state.error}
          </p>
        )}
        {mode === "sign-up" && (
          <Field label="Name" error={errors?.name}>
            {(props) => <Input {...props} name="name" autoComplete="name" required />}
          </Field>
        )}
        <Field label="Email" error={errors?.email}>
          {(props) => <Input {...props} name="email" type="email" autoComplete="email" required />}
        </Field>
        <Field
          label="Password"
          error={errors?.password}
          hint={mode === "sign-up" ? "At least 8 characters." : undefined}
        >
          {(props) => (
            <Input
              {...props}
              name="password"
              type="password"
              autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
              required
            />
          )}
        </Field>
        <SubmitButton
          className="w-full"
          pendingLabel={mode === "sign-in" ? "Signing in…" : "Creating account…"}
        >
          {mode === "sign-in" ? "Sign in" : "Create account"}
        </SubmitButton>
      </form>

      <p className="text-muted text-center text-sm">
        {mode === "sign-in" ? "New here? " : "Already have an account? "}
        <Link
          href={`/${mode === "sign-in" ? "sign-up" : "sign-in"}?next=${encodeURIComponent(next)}`}
          className="text-primary font-medium hover:underline"
        >
          {mode === "sign-in" ? "Create an account" : "Sign in"}
        </Link>
      </p>

      {showDemo && mode === "sign-in" && (
        <div className="border-border border-t pt-5">
          <p className="text-ink text-sm font-medium">Try a demo account</p>
          <p className="text-muted mb-3 text-sm">Each role sees a different version of the app.</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {DEMO_ACCOUNTS.map((demo) => (
              <form key={demo.email} action={formAction}>
                <input type="hidden" name="email" value={demo.email} />
                <input type="hidden" name="password" value="shipwright-demo" />
                <input type="hidden" name="next" value={next} />
                <button
                  type="submit"
                  className="border-border-strong bg-surface hover:border-primary hover:bg-primary-soft w-full rounded-lg border px-3 py-2 text-left"
                >
                  <span className="text-ink block text-sm font-medium">{demo.name}</span>
                  <span className="text-muted block text-xs">{demo.label}</span>
                </button>
              </form>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
