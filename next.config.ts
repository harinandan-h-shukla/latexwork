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
};

export default nextConfig;
