import { loadConfig } from "./config";
import { createServer } from "./server";
import { getCachedCompilers } from "./discovery";

async function main() {
  const config = loadConfig();
  const { app, buildManager } = await createServer(config);

  const server = app.listen(config.port, () => {
    const compilers = getCachedCompilers() ?? [];
    const available = compilers.filter((c) => c.available).map((c) => c.name);
    console.log(`inkwell-cloud-compiler listening on :${config.port}`);
    console.log(`  workdir:  ${config.workDir}`);
    console.log(`  compilers available: ${available.join(", ") || "(none found)"}`);
    console.log(`  max concurrent builds: ${config.maxConcurrentBuilds}`);
  });

  function shutdown() {
    buildManager.killAll();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 2000).unref();
  }
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error(err?.stack ?? err);
  process.exit(1);
});
