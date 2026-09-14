import mongoose from "mongoose";

function requireMongoUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Add it to .env.local (see .env.local for the local dev value).");
  }
  return uri;
}

// Next.js dev-mode HMR re-evaluates this module on every edit; cache the
// connection promise on `global` so we don't open a new connection per
// reload (the standard pattern for Mongoose + Next.js App Router).
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var __inkwellMongoose: MongooseCache | undefined;
}

const cache: MongooseCache = global.__inkwellMongoose ?? { conn: null, promise: null };
global.__inkwellMongoose = cache;

export async function getDb(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;
  if (!cache.promise) {
    cache.promise = mongoose.connect(requireMongoUri(), { bufferCommands: false }).catch((error) => {
      // Don't leave a rejected promise cached — otherwise a single failed
      // connection attempt (e.g. a transient network blip to Atlas) would
      // permanently break every request for the lifetime of this process
      // (or, on Vercel, this warm serverless instance), since every future
      // call would just re-await the same rejection instead of retrying.
      cache.promise = null;
      throw error;
    });
  }
  cache.conn = await cache.promise;
  return cache.conn;
}
