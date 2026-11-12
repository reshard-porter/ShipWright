import type { Role } from "@/db/schema";

export type Permission =
  | "post:create"
  | "post:vote"
  | "comment:create"
  | "comment:internal"
  | "post:triage"
  | "post:merge"
  | "changelog:publish"
  | "team:manage";

/**
 * Role → permission matrix. Kept as data (not scattered `if role === ...`
 * checks) so it's easy to review and unit-test in one place.
 */
const MATRIX: Record<Role, readonly Permission[]> = {
  user: ["post:create", "post:vote", "comment:create"],
  member: [
    "post:create",
    "post:vote",
    "comment:create",
    "comment:internal",
    "post:triage",
    "post:merge",
    "changelog:publish",
  ],
  admin: [
    "post:create",
    "post:vote",
    "comment:create",
    "comment:internal",
    "post:triage",
    "post:merge",
    "changelog:publish",
    "team:manage",
  ],
};

export function can(user: { role: Role } | null | undefined, permission: Permission): boolean {
  return !!user && MATRIX[user.role].includes(permission);
}

export function isTeam(user: { role: Role } | null | undefined): boolean {
  return can(user, "post:triage");
}
