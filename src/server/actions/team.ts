"use server";

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { changelogSchema, statusSchema } from "@/lib/validation";
import { requireActor } from "../auth";
import { publishEntry } from "../services/changelog";
import { assignOwner, changeStatus, mergePosts } from "../services/triage";
import { setRole } from "../services/users";
import { tags } from "../tags";
import { safeAction } from "./safe-action";

const postId = z.coerce.number().int().positive();

function refreshNotifications(userIds: string[]) {
  userIds.forEach((id) => updateTag(tags.notifications(id)));
}

export async function changeStatusAction(id: number, status: string) {
  return safeAction(async () => {
    const actor = await requireActor("post:triage");
    const result = await changeStatus(db, actor, postId.parse(id), statusSchema.parse(status));
    updateTag(tags.posts);
    refreshNotifications(result.notified);
    return { to: result.to };
  });
}

export async function assignOwnerAction(id: number, ownerId: string | null) {
  return safeAction(async () => {
    const actor = await requireActor("post:triage");
    await assignOwner(db, actor, postId.parse(id), ownerId ? z.uuid().parse(ownerId) : null);
    updateTag(tags.post(id));
  });
}

export async function mergeAction(_prev: unknown, formData: FormData) {
  const result = await safeAction(async () => {
    const actor = await requireActor("post:merge");
    const sourceId = postId.parse(formData.get("sourceId"));
    const targetId = postId.parse(formData.get("targetId"));
    const merged = await mergePosts(db, actor, sourceId, targetId);
    updateTag(tags.posts);
    refreshNotifications(merged.notified);
    return { targetId };
  });
  if (!result.ok) return result;
  redirect(`/posts/${result.data.targetId}`);
}

export async function publishChangelogAction(_prev: unknown, formData: FormData) {
  const result = await safeAction(async () => {
    const actor = await requireActor("changelog:publish");
    const input = changelogSchema.parse({
      title: formData.get("title"),
      body: formData.get("body"),
      postIds: formData.getAll("postIds"),
    });
    const entry = await publishEntry(db, actor, input);
    updateTag(tags.changelog);
    updateTag(tags.posts);
    refreshNotifications(entry.notified);
    return entry;
  });
  if (!result.ok) return result;
  redirect(`/changelog/${result.data.slug}`);
}

export async function setRoleAction(userId: string, role: string) {
  return safeAction(async () => {
    const actor = await requireActor("team:manage");
    await setRole(
      db,
      actor,
      z.uuid().parse(userId),
      z.enum(["user", "member", "admin"]).parse(role),
    );
    updateTag(tags.team);
  });
}
