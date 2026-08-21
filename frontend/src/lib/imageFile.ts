// Client-side checks for a picked image, shared by the cover dropzone and the
// editor's inline images so the two paths cannot drift apart — the inline one
// previously had no size guard and would upload a file the cover refused.

/** Matches the backend's 5MB upload limit. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Returns a message to show the user, or null when the file is fine. */
export function imageFileError(file: File): string | null {
  if (!file.type.startsWith("image/")) return "That file isn’t an image.";
  if (file.size > MAX_IMAGE_BYTES) return "Images must be 5MB or smaller.";
  return null;
}
