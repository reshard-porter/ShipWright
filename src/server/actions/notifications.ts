"use server";

import { updateTag } from "next/cache";
import { db } from "@/db";
import { requireActor } from "../auth";
import { markAllRead } from "../services/notifications";
import { tags } from "../tags";
import { safeAction } from "./safe-action";

export async function markNotificationsReadAction() {
  return safeAction(async () => {
    const actor = await requireActor();
    await markAllRead(db, actor.id);
    updateTag(tags.notifications(actor.id));
  });
}
