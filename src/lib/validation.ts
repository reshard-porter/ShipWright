import { z } from "zod";
import { POST_STATUSES } from "@/db/schema";

const trimmed = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .min(min, `${label} needs at least ${min} characters.`)
    .max(max, `${label} can be at most ${max} characters.`);

export const signUpSchema = z.object({
  name: trimmed(2, 80, "Name"),
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address.")),
  password: z
    .string()
    .min(8, "Password needs at least 8 characters.")
    .max(128, "Password can be at most 128 characters."),
});

export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address.")),
  password: z.string().min(1, "Enter your password."),
});

export const createPostSchema = z.object({
  title: trimmed(6, 120, "Title"),
  body: trimmed(10, 5000, "Description"),
  categoryId: z.coerce.number().int().positive("Pick a category."),
});

export const commentSchema = z.object({
  postId: z.coerce.number().int().positive(),
  body: trimmed(1, 2000, "Comment"),
  isInternal: z
    .union([z.literal("on"), z.literal("true"), z.boolean()])
    .optional()
    .transform((v) => v === true || v === "on" || v === "true"),
});

export const statusSchema = z.enum(POST_STATUSES);

export const changelogSchema = z.object({
  title: trimmed(4, 120, "Title"),
  body: trimmed(10, 10000, "Body"),
  postIds: z.array(z.coerce.number().int().positive()).max(50).default([]),
});

export const SORTS = ["top", "trending", "new"] as const;
export type Sort = (typeof SORTS)[number];

/** Parses board filters from the URL. Invalid values fall back to defaults instead of erroring. */
export const boardFiltersSchema = z.object({
  q: z.string().trim().max(100).optional().catch(undefined),
  status: z.enum(POST_STATUSES).optional().catch(undefined),
  category: z.string().trim().max(40).optional().catch(undefined),
  sort: z.enum(SORTS).default("trending").catch("trending"),
  page: z.coerce.number().int().min(1).max(500).default(1).catch(1),
});
export type BoardFilters = z.infer<typeof boardFiltersSchema>;

export function parseBoardFilters(
  params: Record<string, string | string[] | undefined>,
): BoardFilters {
  const flat = Object.fromEntries(
    Object.entries(params).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v || undefined]),
  );
  return boardFiltersSchema.parse(flat);
}

/** Turns a ZodError into `{ field: [messages] }` for forms. */
export function fieldErrors(error: z.ZodError): Record<string, string[]> {
  return z.flattenError(error).fieldErrors as Record<string, string[]>;
}
