"use server";

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { db } from "@/db";
import type { ActionResult } from "@/lib/errors";
import { commentSchema, createPostSchema } from "@/lib/validation";
import { requireActor } from "../auth";
import { addComment, createPost } from "../services/posts";
import { toggleVote } from "../services/votes";
import { tags } from "../tags";
import { safeAction } from "./safe-action";

export async function createPostAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const result = await safeAction(async () => {
    const actor = await requireActor("post:create");
    const input = createPostSchema.parse(Object.fromEntries(formData));
    const post = await createPost(db, actor, input);
    updateTag(tags.posts);
    updateTag(tags.votes(actor.id));
    return post;
  });
  if (!result.ok) return result;
  redirect(`/posts/${result.data.id}`);
}

export async function toggleVoteAction(postId: number) {
  return safeAction(async () => {
    const actor = await requireActor("post:vote");
    const result = await toggleVote(db, actor, postId);
    updateTag(tags.posts);
    updateTag(tags.votes(actor.id));
    return result;
  });
}

export async function addCommentAction(_prev: unknown, formData: FormData) {
  return safeAction(async () => {
    const actor = await requireActor("comment:create");
    const input = commentSchema.parse(Object.fromEntries(formData));
    const comment = await addComment(db, actor, input);
    updateTag(tags.comments(input.postId));
    updateTag(tags.posts);
    comment.notified.forEach((id) => updateTag(tags.notifications(id)));
    return { id: comment.id };
  });
}
