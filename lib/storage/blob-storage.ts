import "server-only";
import { put, del } from "@vercel/blob";

// Real object storage for binary project files (images/figures) — these
// were never actually persisted anywhere before this (only their name/
// size/mimeType metadata was kept; the bytes themselves were read
// client-side then discarded), which is why \includegraphics always failed
// for a real compile and "local save" never included figures. Vercel Blob
// since this app deploys on Vercel — BLOB_READ_WRITE_TOKEN is set
// automatically for a linked Blob store there; for local dev, add it to
// .env.local from the Vercel dashboard's Storage tab.

function requireToken(): string {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN is not set. Add it to .env.local (from your Vercel project's Storage " +
        "tab, or `vercel env pull`) to enable uploading binary files (images/figures)."
    );
  }
  return token;
}

/** `pathname` should be unique per file (e.g. `<projectId>/<fileId or
 * random>-<name>`) — Vercel Blob namespaces by pathname, and a collision
 * silently overwrites unless `addRandomSuffix` is used, which we don't
 * want here since we store the exact resulting URL ourselves. */
export async function uploadBinaryFile(
  pathname: string,
  bytes: Buffer,
  contentType?: string
): Promise<{ url: string }> {
  const token = requireToken();
  const blob = await put(pathname, bytes, {
    access: "public",
    contentType,
    token,
    addRandomSuffix: false,
  });
  return { url: blob.url };
}

export async function deleteBinaryFile(url: string): Promise<void> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return; // best-effort cleanup; don't block on a missing token
  await del(url, { token }).catch(() => {});
}
