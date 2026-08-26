import { ApiError } from "./api";

/**
 * The API answers a failed zod check with
 *   { msg: "Validation error", errors: [{ field, message }] }
 * so a form can show the message next to the field that caused it instead of
 * dropping one generic banner on the whole form.
 */
export function fieldErrorsFrom(err: unknown): Record<string, string> {
  if (!(err instanceof ApiError)) return {};
  const data = err.data as { errors?: { field?: string; message?: string }[] } | undefined;
  if (!Array.isArray(data?.errors)) return {};

  const out: Record<string, string> = {};
  for (const e of data.errors) {
    if (e?.field && e?.message && !out[e.field]) out[e.field] = e.message;
  }
  return out;
}

/** The message to show above a form when no single field owns the failure. */
export function formErrorFrom(err: unknown, fallback: string): string {
  if (!(err instanceof ApiError)) return fallback;
  // A validation error is already reported per field; don't repeat it up top.
  return Object.keys(fieldErrorsFrom(err)).length > 0 ? "" : err.message || fallback;
}
