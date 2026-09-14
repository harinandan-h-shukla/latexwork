import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default is 1MB, far too small once binary files (images/figures)
      // are actually sent through as base64 (which inflates size by ~33%)
      // in zip imports and uploads — importZipTree/uploadFiles send the
      // whole batch as one Server Action call. Matches local-agent's own
      // maxProjectSizeMb default for consistency.
      bodySizeLimit: "50mb",
    },
  },
  async headers() {
    return [
      {
        // The in-browser WASM LaTeX compiler's assets (lib/browser-compiler) —
        // wasm/js engine binaries plus TeX Live package data, self-hosted
        // under public/core/busytex (see .gitignore and
        // `npm run download-compiler-assets`). Unlike Next's hashed
        // /_next/static build output, plain public/ files don't get a
        // long-lived Cache-Control header by default, so without this a
        // repeat visitor would be re-fetching a meaningful slice of a
        // ~500MB asset set on every visit.
        //
        // Deliberately NOT `immutable` + a 1-year max-age: the path isn't
        // versioned (download-compiler-assets always writes to the same
        // ./public/core, regardless of the installed texlyre-busytex
        // version), so a hard immutable cache would keep serving a stale
        // engine to returning visitors after a version bump. 7 days + SWR
        // is a real friction reduction (no re-download on most repeat
        // visits) without that staleness risk lasting more than a week.
        // The correct long-term fix is a version-namespaced asset path
        // (e.g. /core/busytex/1.4.0/...); not done here — out of scope for
        // this pass, noted for whoever wires up the deploy-time download
        // step for real.
        source: "/core/busytex/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" },
        ],
      },
    ];
  },
};

export default nextConfig;
