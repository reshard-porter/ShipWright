import "server-only";
import { cookies } from "next/headers";
import { getIronSession, type SessionOptions } from "iron-session";
import { env } from "@/lib/env";

export type SessionData = { userId?: string };

export const SESSION_COOKIE = "sw_session";

function options(): SessionOptions {
  return {
    cookieName: SESSION_COOKIE,
    password: env().SESSION_SECRET,
    ttl: 60 * 60 * 24 * 14, // 14 days
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    },
  };
}

/** Encrypted, signed cookie session. Holds only the user id; everything else is read from the DB. */
export async function getSession() {
  return getIronSession<SessionData>(await cookies(), options());
}
