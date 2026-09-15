#!/usr/bin/env node
import { loadConfig } from "./config";
import { createServer } from "./server";

async function main() {
  const config = loadConfig();
  const { server } = createServer(config);

  server.listen(config.port, () => {
    console.log(`inkwell-realtime-hub listening on :${config.port}`);
    console.log(`  websocket path: /events`);
  });

  let shuttingDown = false;
  function shutdown(signal: string) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\nReceived ${signal}, shutting down...`);
    server.close(() => process.exit(0));
    // Force-exit if close() hangs (e.g. open WS connections that never close cleanly).
    setTimeout(() => process.exit(0), 2000).unref();
  }
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error(err?.stack ?? err);
  process.exit(1);
});
