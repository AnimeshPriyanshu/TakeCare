import { tooManyRequests } from "../utils/http-error.js";

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 30; // 30 requests per minute per user per endpoint

const buckets = new Map();

function getBucket(key) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket) return null;
  // Remove timestamps older than window
  const recent = bucket.filter((ts) => now - ts < WINDOW_MS);
  if (recent.length === 0) {
    buckets.delete(key);
    return null;
  }
  return recent;
}

export function rateLimit({ max = MAX_REQUESTS, windowMs = WINDOW_MS } = {}) {
  return (req, res, next) => {
    if (!req.user) {
      return next(); // should not happen on authenticated routes
    }
    const userId = req.user.id;
    const endpoint = `${req.method}:${req.path}`;
    const key = `${userId}:${endpoint}`;
    const now = Date.now();

    let bucket = getBucket(key);
    if (!bucket) {
      bucket = [];
      buckets.set(key, bucket);
    }

    // Add current request
    bucket.push(now);

    // Remove expired timestamps
    const recent = bucket.filter((ts) => now - ts < windowMs);
    buckets.set(key, recent);

    if (recent.length > max) {
      const oldest = recent[0];
      const retryAfter = Math.ceil((oldest + windowMs - Date.now()) / 1000);
      return next(tooManyRequests(`Rate limit exceeded. Try again in ${retryAfter} seconds.`));
    }

    // Set rate limit headers
    res.set({
      "X-RateLimit-Limit": max,
      "X-RateLimit-Remaining": Math.max(0, max - recent.length),
      "X-RateLimit-Reset": Math.ceil((now + windowMs) / 1000),
    });

    next();
  };
}

// Periodic cleanup to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets.entries()) {
    const recent = bucket.filter((ts) => now - ts < WINDOW_MS);
    if (recent.length === 0) {
      buckets.delete(key);
    } else {
      buckets.set(key, recent);
    }
  }
}, WINDOW_MS);