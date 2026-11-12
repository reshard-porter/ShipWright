import "server-only";
import { createDb } from "./client";

/**
 * Shared database client for the app. In development, Next.js reloads modules
 * on every change, so the client is cached on globalThis to avoid exhausting
 * Postgres connections.
 */
const globalForDb = globalThis as unknown as { db?: ReturnType<typeof createDb> };

export const db = globalForDb.db ?? createDb(process.env.DATABASE_URL);
if (process.env.NODE_ENV !== "production") globalForDb.db = db;
