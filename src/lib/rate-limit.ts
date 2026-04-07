/**
 * Simple in-memory IP rate limiter for serverless API routes.
 *
 * Uses a sliding window per IP. Each instance maintains its own map,
 * so this won't coordinate across multiple serverless instances — but it
 * catches the vast majority of spam and abuse within a warm instance.
 */

interface RateLimitEntry {
  timestamps: number[];
}

const buckets = new Map<string, RateLimitEntry>();

// Clean up stale entries every 60 seconds to prevent memory leaks
const CLEANUP_INTERVAL = 60_000;
let lastCleanup = Date.now();

function cleanup(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  const cutoff = now - windowMs;
  for (const [key, entry] of buckets) {
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    if (entry.timestamps.length === 0) buckets.delete(key);
  }
}

/**
 * Check if a request from the given IP is within the rate limit.
 * Returns { allowed: true } or { allowed: false, retryAfterMs }.
 */
export function checkRateLimit(
  ip: string,
  { maxRequests, windowMs }: { maxRequests: number; windowMs: number },
): { allowed: true } | { allowed: false; retryAfterMs: number } {
  cleanup(windowMs);

  const now = Date.now();
  const cutoff = now - windowMs;
  let entry = buckets.get(ip);

  if (!entry) {
    entry = { timestamps: [] };
    buckets.set(ip, entry);
  }

  // Drop timestamps outside the window
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

  if (entry.timestamps.length >= maxRequests) {
    const oldestInWindow = entry.timestamps[0];
    const retryAfterMs = oldestInWindow + windowMs - now;
    return { allowed: false, retryAfterMs };
  }

  entry.timestamps.push(now);
  return { allowed: true };
}

/** Helper to extract client IP from a Request (works on Vercel). */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

/** Helper to build a 429 response. */
export function rateLimitResponse(retryAfterMs: number): Response {
  const retryAfterSec = Math.ceil(retryAfterMs / 1000);
  return new Response(
    JSON.stringify({ error: `Too many requests. Try again in ${retryAfterSec}s.` }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfterSec),
      },
    },
  );
}
