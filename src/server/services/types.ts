import type { Role } from "@/db/schema";

/** The signed-in user performing an action, as resolved by the auth layer. */
export type Actor = { id: string; name: string; role: Role };
