import "server-only";
import { unstable_rethrow } from "next/navigation";
import { ZodError } from "zod";
import { AppError, type ActionResult } from "@/lib/errors";
import { fieldErrors } from "@/lib/validation";

/**
 * Runs a Server Action body and converts expected failures into a typed
 * result the UI can render. Unexpected errors are logged and replaced with a
 * generic message so internals never leak to the client.
 */
export async function safeAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    unstable_rethrow(error); // let redirect()/notFound() through
    if (error instanceof AppError) {
      return { ok: false, code: error.code, error: error.message, fieldErrors: error.fieldErrors };
    }
    if (error instanceof ZodError) {
      return {
        ok: false,
        code: "VALIDATION",
        error: "Check the highlighted fields.",
        fieldErrors: fieldErrors(error),
      };
    }
    console.error("[action] unexpected error", error);
    return { ok: false, code: "INTERNAL", error: "Something went wrong. Try again." };
  }
}
