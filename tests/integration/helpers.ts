import "dotenv/config";
import { sql } from "drizzle-orm";
import { afterAll, beforeEach } from "vitest";
import { createDb } from "@/db/client";
import { categories, users, type Role } from "@/db/schema";
import type { Actor } from "@/server/services/types";

export const db = createDb(process.env.TEST_DATABASE_URL, { max: 5 });

// Precomputed bcrypt hash of "password123" so fixtures don't pay hashing cost.
const HASH = "$2b$10$F3JCnDH.Dr.ggWRZ5uGbtOKHmLexOZpI01iPcqNtCG1SB74XTbOdu";

export type Fixture = {
  admin: Actor;
  member: Actor;
  alice: Actor;
  bob: Actor;
  carol: Actor;
  categoryId: number;
};
export let fx: Fixture;

async function makeUser(name: string, role: Role = "user"): Promise<Actor> {
  const [u] = await db
    .insert(users)
    .values({ name, email: `${name.toLowerCase()}@test.dev`, passwordHash: HASH, role })
    .returning({ id: users.id, name: users.name, role: users.role });
  return u;
}

/** Every test starts from an empty database with a known cast of users. */
export function withFreshDatabase() {
  beforeEach(async () => {
    await db.execute(
      sql`truncate users, categories, posts, votes, comments, status_events, changelog_entries, changelog_posts, notifications restart identity cascade`,
    );
    const [cat] = await db
      .insert(categories)
      .values({ name: "Feature", slug: "feature" })
      .returning();
    fx = {
      admin: await makeUser("Admin", "admin"),
      member: await makeUser("Member", "member"),
      alice: await makeUser("Alice"),
      bob: await makeUser("Bob"),
      carol: await makeUser("Carol"),
      categoryId: cat.id,
    };
  });
  afterAll(async () => {
    await db.$client.end();
  });
}
