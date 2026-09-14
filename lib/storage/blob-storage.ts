import "server-only";
import { put, del, get } from "@vercel/blob";

// Real object storage for binary project files (images/figures) — these
// were never actually persisted anywhere before this (only their name/
// size/mimeType metadata was kept; the bytes themselves were read
// client-side then discarded), which is why \includegraphics always failed
// for a real compile and "local save" never included figures. Vercel Blob
// since this app deploys on Vercel — BLOB_READ_WRITE_TOKEN is set
// automatically for a linked Blob store there; for local dev, add it to
// .env.local from the Vercel dashboard's Storage tab.
//
// Private access, not public: these can be unpublished research figures —
// direct-by-URL access (what a "public" blob gives you) would mean anyone
// who obtained/guessed a URL could read them with no auth at all. Private
// blobs require the read-write token to fetch, so retrieval always goes
// through our own authenticated route (app/api/files/[fileId]/blob), which
// checks the requesting user actually owns/collaborates on the project
// first — same access-control shape as every other real project resource.

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

/** `pathname` should be unique per file (e.g. `<projectId>/<path>`) —
 * Vercel Blob namespaces by pathname, and a collision silently overwrites
 * unless `addRandomSuffix` is used, which we don't want here since we
 * store the exact resulting pathname ourselves. */
export async function uploadBinaryFile(
  pathname: string,
  bytes: Buffer,
  contentType?: string
): Promise<{ pathname: string }> {
  const token = requireToken();
  const blob = await put(pathname, bytes, {
    access: "private",
    contentType,
    token,
    addRandomSuffix: false,
  });
  return { pathname: blob.pathname };
}

export async function getBinaryFileStream(
  pathname: string
): Promise<{ stream: ReadableStream<Uint8Array>; contentType: string } | null> {
  const token = requireToken();
  const result = await get(pathname, { access: "private", token });
  if (!result || result.statusCode !== 200) return null;
  return { stream: result.stream, contentType: result.blob.contentType };
}

export async function deleteBinaryFile(pathname: string): Promise<void> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return; // best-effort cleanup; don't block on a missing token
  await del(pathname, { token }).catch(() => {});
}
