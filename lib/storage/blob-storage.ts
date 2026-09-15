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
  pathname: string,
  // Forwarded verbatim as the upstream Range header — needed so large
  // assets (the WASM compiler's 100-300MB+ TeX Live data files) can be
  // fetched in small pieces instead of requiring one full-file transfer
  // through a time-limited serverless function. See
  // app/core/busytex/[...path]/route.ts for why this exists.
  range?: string | null
  // Typed as this minimal shape (not the DOM Headers type) because
  // @vercel/blob returns undici's Headers here, which is structurally
  // close enough for .get() but not assignable to the newer DOM Headers
  // type this TS lib version expects (extra iterator methods it lacks).
): Promise<{ stream: ReadableStream<Uint8Array>; contentType: string; headers: { get(name: string): string | null } } | null> {
  const token = requireToken();
  const result = await get(pathname, {
    access: "private",
    token,
    headers: {
      // Vercel Blob's CDN Brotli-compresses full-file (unranged) responses
      // by default, which drops Content-Length in favor of chunked
      // transfer (confirmed by a real repro: same request with/without
      // this header). These are already-compressed binary formats (wasm,
      // pre-packed TeX Live .data archives) that gain nothing from an
      // extra compression layer, and losing Content-Length broke the
      // caller's ability to know the real file size up front — which
      // matters here specifically because Emscripten's lazy-loading file
      // reader (busytex.js) probes Content-Length via a HEAD/GET request
      // before ever attempting Range requests, and silently falls back to
      // downloading the entire file otherwise.
      "Accept-Encoding": "identity",
      ...(range ? { Range: range } : {}),
    },
  });
  if (!result || result.statusCode !== 200) return null;
  // Deliberately not exposing result.blob.size here — confirmed by a real
  // repro that this SDK version reports it as 0 even when the stream
  // itself carries the full byte count. A caller that trusted it to set
  // Content-Length would make every client truncate the response to zero
  // bytes (Content-Length is authoritative over the actual body). The raw
  // result.headers (the actual upstream response headers — accurate,
  // unlike blob.size) is exposed instead: real Content-Length,
  // Content-Range and Accept-Ranges when a Range request was honored.
  // (result.statusCode is hardcoded to 200 by this SDK version even for a
  // real 206 Partial Content upstream response — this is why the caller
  // must check result.headers.get("content-range") itself to know which
  // one actually happened, not statusCode.)
  return { stream: result.stream, contentType: result.blob.contentType, headers: result.headers };
}

export async function deleteBinaryFile(pathname: string): Promise<void> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return; // best-effort cleanup; don't block on a missing token
  await del(pathname, { token }).catch(() => {});
}
