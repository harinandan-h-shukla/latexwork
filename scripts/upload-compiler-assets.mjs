// Uploads public/core/busytex/* (downloaded by `npm run download-compiler-assets`)
// to this app's Vercel Blob store, under compiler-assets/busytex-v1/<filename>,
// with a fixed pathname (no random suffix) so app/core/busytex/[...path]/route.ts
// can find them deterministically.
//
// This app's Blob store is provisioned private-only (confirmed by a real
// upload attempt: "Cannot use public access on a private store"), so these
// are uploaded the same way as per-project figures (lib/storage/blob-storage.ts)
// — access: "private", fetched server-side with BLOB_READ_WRITE_TOKEN by the
// proxy route. That route is what actually serves them to the browser, kept
// same-origin — texlyre-busytex's `new Worker(...)` call requires a
// same-origin script URL, so the client can never point directly at a
// cross-origin blob URL even though the files themselves aren't sensitive.
//
// Only needs to be run once per texlyre-busytex version (bump PREFIX below
// on a real engine upgrade so a partial re-upload can never mix old/new
// engine files under one version's pathname). Re-running against an
// unchanged version is safe — `allowOverwrite: true` makes it idempotent.
//
// Usage: node scripts/upload-compiler-assets.mjs [path-to-busytex-dir]
// Needs BLOB_READ_WRITE_TOKEN in the environment (already in .env.local for
// local use; already set on Vercel for the deployed app).
import { put } from "@vercel/blob";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const SRC_DIR = path.resolve(process.argv[2] || "./public/core/busytex");
const PREFIX = "compiler-assets/busytex-v1";

const CONTENT_TYPES = {
  ".wasm": "application/wasm",
  ".js": "text/javascript",
  ".data": "application/octet-stream",
  ".txt": "text/plain",
  ".profile": "text/plain",
  ".cnf": "text/plain",
};

async function main() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN is not set. Add it to .env.local (from your Vercel project's Storage tab)."
    );
  }

  const files = (await readdir(SRC_DIR)).sort();
  const results = [];
  for (const name of files) {
    const full = path.join(SRC_DIR, name);
    const s = await stat(full);
    if (!s.isFile()) continue;
    const ext = path.extname(name);
    const contentType = CONTENT_TYPES[ext] || "application/octet-stream";
    const bytes = await readFile(full);
    process.stdout.write(`Uploading ${name} (${(s.size / 1024 / 1024).toFixed(1)} MB)... `);
    const blob = await put(`${PREFIX}/${name}`, bytes, {
      access: "private",
      contentType,
      token,
      addRandomSuffix: false,
      allowOverwrite: true,
      multipart: s.size > 8 * 1024 * 1024,
    });
    console.log("done");
    results.push({ name, pathname: blob.pathname, size: s.size });
  }

  console.log(`\nUploaded ${results.length} files under ${PREFIX}/ in this app's Blob store.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
