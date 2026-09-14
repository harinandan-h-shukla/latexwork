// Runs a real, standard MongoDB server for local development/testing.
//
// This machine has no root/Docker access, so we can't install MongoDB as a
// system service. mongodb-memory-server downloads and runs the actual,
// official `mongod` binary (not an emulation) — this is a real MongoDB
// instance, just launched by Node instead of a package manager. Data is
// persisted to disk (dbPath below) so it survives restarts of this script,
// same as a normal local MongoDB install would.
//
// In production this file is not used at all — the app connects to
// MONGODB_URI, which should point at a real managed/self-hosted MongoDB.
//
// Usage: node scripts/local-mongo.mjs

import { mkdirSync } from "node:fs";
import { MongoMemoryServer } from "mongodb-memory-server";

const DB_PATH = process.env.INKWELL_LOCAL_MONGO_DBPATH ?? "/tmp/inkwell-mongo-data";
const PORT = Number(process.env.INKWELL_LOCAL_MONGO_PORT ?? 27017);

mkdirSync(DB_PATH, { recursive: true });

const mongod = await MongoMemoryServer.create({
  instance: { dbPath: DB_PATH, port: PORT, storageEngine: "wiredTiger" },
  binary: { checkMD5: false },
});

console.log(`Local MongoDB running at ${mongod.getUri()}`);
console.log(`Data directory: ${DB_PATH}`);
console.log("Press Ctrl+C to stop.");

async function shutdown() {
  console.log("\nStopping local MongoDB…");
  await mongod.stop();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// Keep the process (and therefore the mongod child it manages) alive.
await new Promise(() => {});
