import "server-only";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { AppError } from "@/lib/errors";
import { can, type Permission } from "@/lib/permissions";
import { getUserById } from "./services/users";
import { getSession } from "./session";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: "user" | "member" | "admin";
};

/**
 * Data Access Layer entry point for rendering. Reads the session cookie and
 * returns a narrow user object, or null when signed out.
 *
 * `use cache: private` lets the result be prefetched and reused in the
 * browser for a short time without ever being stored on the server.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  "use cache: private";
  const session = await getSession();
  if (!session.userId) return null;
  return (await getUserById(db, session.userId)) ?? null;
}

/** For pages that need a signed-in user. Redirects to sign-in otherwise. */
export async function requirePageUser(permission?: Permission, next = "/"): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  if (permission && !can(user, permission)) redirect("/");
  return user;
}

/**
 * For Server Actions. Deliberately uncached: every mutation re-reads the
 * session and the user's current role from the database, so a revoked role
 * takes effect immediately.
 */
export async function requireActor(permission?: Permission) {
  const session = await getSession();
  const user = session.userId ? await getUserById(db, session.userId) : undefined;
  if (!user) throw new AppError("UNAUTHORIZED", "Sign in to continue.");
  if (permission && !can(user, permission)) {
    throw new AppError("FORBIDDEN", "You don't have permission to do that.");
  }
  return user;
}
