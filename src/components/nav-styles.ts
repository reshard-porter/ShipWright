import { cn } from "@/lib/utils";

export const navLinkStyles = (active: boolean) =>
  cn(
    "shrink-0 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors sm:px-3",
    active ? "bg-primary-soft text-primary" : "text-muted hover:bg-surface-muted hover:text-ink",
  );
