import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export function createDb(url: string | undefined, options: { max?: number } = {}) {
  if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env.");
  const client = postgres(url, { max: options.max ?? 10, prepare: false });
  return drizzle(client, { schema, casing: "snake_case" });
}

export type Database = ReturnType<typeof createDb>;
/** A database handle or an open transaction; services accept either. */
export type Executor = Database | Parameters<Parameters<Database["transaction"]>[0]>[0];
