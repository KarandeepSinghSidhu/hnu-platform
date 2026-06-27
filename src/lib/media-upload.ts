// Filesystem-level primitives for the media upload pipeline: a single source of
// truth for size/format limits, filename sanitisation, and safe deletion of
// managed upload files. Security-critical (path-traversal + stored-XSS guards),
// so kept dependency-free and shared by every upload/replace route.
import { unlink } from "fs/promises";
import path from "path";

// Shared constants/helpers for the media upload + replace routes (kept in one
// place so the allow-list and limits can't drift between them).

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const MEDIA_UPLOAD_PREFIX = "uploads/media";

export function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

// Raster formats only — SVG is excluded to avoid stored-XSS via uploaded markup.
export function isAllowedImage(file: File): boolean {
  return (
    /^image\/(png|jpe?g|webp|gif|avif)$/i.test(file.type) ||
    /\.(png|jpe?g|webp|gif|avif)$/i.test(file.name)
  );
}

// Remove a managed upload file. The prefix guard keeps deletes inside the
// managed upload directory (defaults to uploads/media; branding uploads pass
// their own prefix), so a stored path can never escape it.
export async function tryRemoveFile(
  filePath: string,
  prefix: string = MEDIA_UPLOAD_PREFIX,
): Promise<void> {
  const relative = filePath.replace(/^\/+/, "");
  if (!relative.startsWith(prefix)) return;
  try {
    await unlink(path.join(process.cwd(), "public", relative));
  } catch (error) {
    console.warn("Upload file could not be removed:", error);
  }
}
