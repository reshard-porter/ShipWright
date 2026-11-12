import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("border-border bg-surface rounded-xl border", className)} {...props} />;
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="border-border-strong rounded-xl border border-dashed px-6 py-12 text-center">
      <p className="text-ink font-medium">{title}</p>
      <p className="text-muted mx-auto mt-1 max-w-sm text-sm">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("bg-surface-muted animate-pulse rounded-md", className)} aria-hidden />;
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      className={cn(
        "bg-primary-soft text-primary inline-flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-medium",
        className,
      )}
      aria-hidden
    >
      {initials}
    </span>
  );
}
