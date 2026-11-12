import { describe, expect, it } from "vitest";
import { POST_STATUSES } from "@/db/schema";
import { can, isTeam, type Permission } from "@/lib/permissions";
import { allowedTransitions, canTransition } from "@/lib/status";

describe("status transitions", () => {
  it("never allows a no-op transition", () => {
    for (const s of POST_STATUSES) expect(canTransition(s, s)).toBe(false);
  });

  it("can't jump from closed straight to shipped", () => {
    expect(canTransition("closed", "shipped")).toBe(false);
    expect(allowedTransitions("closed")).toEqual(["under_review"]);
  });

  it("lets a shipped request be reopened", () => {
    expect(canTransition("shipped", "in_progress")).toBe(true);
  });
});

describe("permissions", () => {
  const user = { role: "user" as const };
  const member = { role: "member" as const };
  const admin = { role: "admin" as const };

  it("denies everything when signed out", () => {
    expect(can(null, "post:vote")).toBe(false);
    expect(isTeam(undefined)).toBe(false);
  });

  it.each<[Permission, boolean, boolean, boolean]>([
    ["post:vote", true, true, true],
    ["comment:internal", false, true, true],
    ["post:triage", false, true, true],
    ["changelog:publish", false, true, true],
    ["team:manage", false, false, true],
  ])("%s: user=%s member=%s admin=%s", (permission, u, m, a) => {
    expect(can(user, permission)).toBe(u);
    expect(can(member, permission)).toBe(m);
    expect(can(admin, permission)).toBe(a);
  });
});
