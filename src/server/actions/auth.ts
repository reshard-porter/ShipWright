"use server";

import type { Route } from "next";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { AppError, type ActionResult } from "@/lib/errors";
import { signInSchema, signUpSchema } from "@/lib/validation";
import { createUser, verifyCredentials } from "../services/users";
import { getSession } from "../session";
import { safeAction } from "./safe-action";

/** Only allow same-site relative redirects, to prevent open-redirect attacks. */
function safeNext(value: FormDataEntryValue | null): Route {
  const next = typeof value === "string" ? value : "/";
  return (next.startsWith("/") && !next.startsWith("//") ? next : "/") as Route;
}

export async function signIn(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const result = await safeAction(async () => {
    const input = signInSchema.parse(Object.fromEntries(formData));
    const user = await verifyCredentials(db, input.email, input.password);
    if (!user) throw new AppError("UNAUTHORIZED", "That email and password don't match.");
    const session = await getSession();
    session.userId = user.id;
    await session.save();
  });
  if (!result.ok) return result;
  redirect(safeNext(formData.get("next")));
}

export async function signUp(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const result = await safeAction(async () => {
    const input = signUpSchema.parse(Object.fromEntries(formData));
    const user = await createUser(db, input);
    const session = await getSession();
    session.userId = user.id;
    await session.save();
  });
  if (!result.ok) return result;
  redirect(safeNext(formData.get("next")));
}

export async function signOut() {
  const session = await getSession();
  session.destroy();
  redirect("/");
}
