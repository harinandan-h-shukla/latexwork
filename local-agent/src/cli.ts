#!/usr/bin/env node
import { parseConfig } from "./config";
import { createServer } from "./server";
import { getCachedCompilers } from "./discovery";
import { CompilerInfo } from "./types";

function formatCompilerLine(info: CompilerInfo): string {
  const name = info.name.padEnd(10);
  if (!info.available) {
    return `  ${name} ✗ not found`;
  }
  const version = info.version ? ` (${info.version})` : "";
  return `  ${name} ✓${version}`;
}

async function main() {
  const config = parseConfig();
  const { server, buildManager } = await createServer(config);

  server.listen(config.port, () => {
    console.log(`Inkwell local agent listening on http://localhost:${config.port}`);
    const compilers = getCachedCompilers() ?? [];
    for (const info of compilers) {
      console.log(formatCompilerLine(info));
    }
    console.log(`  workdir:  ${config.workDir}`);
    console.log(`  origins:  ${config.allowedOrigins.join(", ")}`);
  });

  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\nReceived ${signal}, shutting down and terminating any active compiles...`);
    buildManager.killAll();
    server.close(() => process.exit(0));
    // Force-exit if close() hangs (e.g. open WS connections).
    setTimeout(() => process.exit(0), 2000).unref();
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error("Failed to start Inkwell local agent:", err);
  process.exit(1);
});
