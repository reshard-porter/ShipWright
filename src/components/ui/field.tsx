import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

export const controlStyles =
  "w-full rounded-lg border border-border-strong bg-surface px-3 text-sm text-ink placeholder:text-muted " +
  "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 aria-[invalid=true]:border-[var(--st-closed)]";

type FieldProps = {
  label: string;
  error?: string[];
  hint?: string;
  children: (props: {
    id: string;
    "aria-invalid"?: boolean;
    "aria-describedby"?: string;
  }) => ReactNode;
};

/** Label + control + hint/error, wired up with the right ARIA attributes. */
export function Field({ label, error, hint, children }: FieldProps) {
  const id = useId();
  const describedBy = error?.length ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-ink block text-sm font-medium">
        {label}
      </label>
      {children({
        id,
        "aria-invalid": error?.length ? true : undefined,
        "aria-describedby": describedBy,
      })}
      {error?.length ? (
        <p id={`${id}-error`} className="text-sm text-[var(--st-closed)]">
          {error[0]}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-muted text-sm">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlStyles, "h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(controlStyles, "min-h-28 py-2 leading-relaxed", className)}
      {...props}
    />
  );
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(controlStyles, "h-10 pr-8", className)} {...props} />;
}
