import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is not set');
}

// Cache the connection across serverless function invocations (Vercel cold-start optimisation)
declare global {
  // eslint-disable-next-line no-var
  var __mongoCache: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
}

const cache = global.__mongoCache ?? { conn: null, promise: null };
global.__mongoCache = cache;

export async function connectDB(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;

  if (!cache.promise) {
    cache.promise = mongoose.connect(MONGODB_URI, { bufferCommands: false });
  }

  cache.conn = await cache.promise;
  return cache.conn;
}
