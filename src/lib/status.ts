import type { PostStatus } from "@/db/schema";

export const STATUS_META: Record<PostStatus, { label: string; description: string }> = {
  under_review: { label: "Under review", description: "The team hasn't triaged this yet." },
  planned: { label: "Planned", description: "On the roadmap." },
  in_progress: { label: "In progress", description: "Being built right now." },
  shipped: { label: "Shipped", description: "Live for everyone." },
  closed: { label: "Closed", description: "Won't be built, or merged into another request." },
};

/** Statuses shown as columns on the public roadmap, in order. */
export const ROADMAP_STATUSES = [
  "planned",
  "in_progress",
  "shipped",
] as const satisfies PostStatus[];

/**
 * Allowed transitions. Shipped and closed requests can be reopened to review,
 * but you can't jump straight from closed to shipped.
 */
const TRANSITIONS: Record<PostStatus, PostStatus[]> = {
  under_review: ["planned", "in_progress", "shipped", "closed"],
  planned: ["under_review", "in_progress", "shipped", "closed"],
  in_progress: ["planned", "shipped", "closed"],
  shipped: ["in_progress", "under_review"],
  closed: ["under_review"],
};

export function canTransition(from: PostStatus, to: PostStatus): boolean {
  return from !== to && TRANSITIONS[from].includes(to);
}

export function allowedTransitions(from: PostStatus): PostStatus[] {
  return TRANSITIONS[from];
}
