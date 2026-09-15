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

export async function GET(_req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;
  // Reject traversal/absolute segments before building the blob pathname —
  // there's no legitimate reason a segment would contain "/" or "..".
  if (segments.some((s) => s === ".." || s.includes("/"))) {
    return NextResponse.json({ error: "Invalid path." }, { status: 400 });
  }
  const filename = segments.join("/");

  const result = await getBinaryFileStream(`${BLOB_PREFIX}/${filename}`);
  if (!result) {
    return NextResponse.json({ error: "Asset not found." }, { status: 404 });
  }

  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": result.contentType || "application/octet-stream",
      // Deliberately NOT setting Content-Length from result.size: @vercel/
      // blob's get() was confirmed (real repro, not a hunch) to report
      // blob.size as 0 while the stream itself carries the full byte count
      // correctly — setting Content-Length: 0 from that value made every
      // client (curl, the browser) truncate the response to zero bytes,
      // since Content-Length is authoritative over whatever the body
      // actually contains. Omitting it lets Next stream this chunked
      // instead, which is what actually worked in the real end-to-end
      // compile test.
      // Immutable: pathname is versioned (busytex-v1/...) — a future
      // texlyre-busytex upgrade uploads under a new prefix rather than
      // overwriting these, so caching forever is safe.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
