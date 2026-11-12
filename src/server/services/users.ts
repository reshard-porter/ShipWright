import bcrypt from "bcryptjs";
import { asc, eq, inArray } from "drizzle-orm";
import { users } from "@/db/schema";
import type { Executor } from "@/db/client";
import type { Role } from "@/db/schema";
import { AppError } from "@/lib/errors";
import { can } from "@/lib/permissions";
import type { Actor } from "./types";

const BCRYPT_ROUNDS = 10;
// Compared against when the email doesn't exist, so a failed sign-in takes the
// same time either way and can't be used to discover registered emails.
const DUMMY_HASH = "$2b$10$IrXGMXTRzJtLBqqvsx6ku.K411KKo9bXESuFheEBxkLRXgz4xppG6";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function createUser(
  db: Executor,
  input: { name: string; email: string; password: string; role?: Role },
) {
  const existing = await db.query.users.findFirst({
    where: eq(users.email, input.email),
    columns: { id: true },
  });
  if (existing) {
    throw new AppError("CONFLICT", "An account with that email already exists.", {
      email: ["An account with that email already exists."],
    });
  }
  const [user] = await db
    .insert(users)
    .values({
      name: input.name,
      email: input.email,
      passwordHash: await hashPassword(input.password),
      role: input.role ?? "user",
    })
    .returning({ id: users.id, name: users.name, role: users.role });
  return user;
}

export async function verifyCredentials(db: Executor, email: string, password: string) {
  const user = await db.query.users.findFirst({ where: eq(users.email, email) });
  const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid) return null;
  return { id: user.id, name: user.name, role: user.role };
}

export async function getUserById(db: Executor, id: string) {
  return db.query.users.findFirst({
    where: eq(users.id, id),
    columns: { id: true, name: true, email: true, role: true },
  });
}

export async function listTeam(db: Executor) {
  return db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role })
    .from(users)
    .where(inArray(users.role, ["member", "admin"]))
    .orderBy(asc(users.name));
}

export async function setRole(db: Executor, actor: Actor, userId: string, role: Role) {
  if (!can(actor, "team:manage")) throw new AppError("FORBIDDEN", "Only admins can change roles.");
  if (actor.id === userId) throw new AppError("VALIDATION", "You can't change your own role.");
  const updated = await db
    .update(users)
    .set({ role })
    .where(eq(users.id, userId))
    .returning({ id: users.id });
  if (updated.length === 0) throw new AppError("NOT_FOUND", "That user doesn't exist.");
}
