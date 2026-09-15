import { NextRequest, NextResponse } from "next/server";
import { getBinaryFileStream } from "@/lib/storage/blob-storage";

// texlyre-busytex's BusyTexRunner does `new Worker(`${busytexBasePath}/busytex_worker.js`)`
// (node_modules/texlyre-busytex/dist/index.js) — classic Worker construction
// is same-origin only, so busytexBasePath can't be a cross-origin blob URL
// directly. This route keeps the client-side BUSYTEX_BASE_PATH same-origin
// ("/core/busytex", see browser-compiler-client.ts) while the ~660MB of
// actual WASM/TeX-Live engine bytes live in Vercel Blob instead of the
// Next.js build output — committing them to git or shipping them through
// `public/` isn't viable (see the download-compiler-assets script; the
// asset set is gitignored under /public/core/ for exactly this reason).
//
// This app's Blob store is provisioned private-only (confirmed by a real
// upload attempt: "Cannot use public access on a private store"), so these
// are stored the same way as per-project figures — via getBinaryFileStream,
// server-side, with the read-write token. No per-request auth check is
// needed beyond that: these are static compiler engine files, not user
// data, so any signed-in-or-not visitor may fetch them the same as any
// other static asset this app serves.
export const maxDuration = 60;

const BLOB_PREFIX = "compiler-assets/busytex-v1";

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;
  // Reject traversal/absolute segments before building the blob pathname —
  // there's no legitimate reason a segment would contain "/" or "..".
  if (segments.some((s) => s === ".." || s.includes("/"))) {
    return NextResponse.json({ error: "Invalid path." }, { status: 400 });
  }
  const filename = segments.join("/");

  // Real root cause of "File `microtype.sty' not found" persisting even
  // after texlive-recommended/texlive-extra were registered as catalogs
  // (see browser-compiler-client.ts): this route never advertised
  // Accept-Ranges, so Emscripten's lazy-loading file reader (busytex.js's
  // LazyUint8Array — checks the Accept-Ranges response header) fell back
  // to downloading each *entire* data file (up to 326MB) in one request.
  // That routinely exceeded this function's execution time budget and got
  // killed mid-transfer, surfacing to the client as a generic
  // "TypeError: network error" — confirmed via a real live repro, not
  // guessed — after which the runtime silently falls back to only the
  // packages it already had, i.e. exactly the original bug. Forwarding
  // the real Range header lets the client fetch only the specific
  // KB-sized pieces it actually needs, which comfortably finishes inside
  // any reasonable function timeout.
  const range = req.headers.get("range");
  const result = await getBinaryFileStream(`${BLOB_PREFIX}/${filename}`, range);
  if (!result) {
    return NextResponse.json({ error: "Asset not found." }, { status: 404 });
  }

  // result.statusCode is hardcoded to 200 by this @vercel/blob version even
  // when the upstream response was actually 206 Partial Content — the real
  // signal is whether a Content-Range header came back.
  const contentRange = result.headers.get("content-range");
  const contentLength = result.headers.get("content-length");

  return new NextResponse(result.stream, {
    status: contentRange ? 206 : 200,
    headers: {
      "Content-Type": result.contentType || "application/octet-stream",
      "Accept-Ranges": "bytes",
      ...(contentRange ? { "Content-Range": contentRange } : {}),
      // Safe here (unlike the unranged full-file case this used to try):
      // this is the real length of THIS response body (the requested
      // slice, or the true full size when no Range was requested), read
      // from the actual upstream response headers rather than the known-
      // unreliable blob.size metadata field.
      ...(contentLength ? { "Content-Length": contentLength } : {}),
      // Immutable: pathname is versioned (busytex-v1/...) — a future
      // texlyre-busytex upgrade uploads under a new prefix rather than
      // overwriting these, so caching forever is safe.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
