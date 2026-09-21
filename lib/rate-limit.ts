import { eq, sql } from "drizzle-orm";
import { getDb } from "../db";
import { apiRateLimits } from "../db/schema";

function clientAddress(request: Request) {
  return request.headers.get("cf-connecting-ip")?.trim()
    || request.headers.get("x-real-ip")?.trim()
    || "unknown";
}

async function digest(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

export async function rateLimit(request: Request, scope: string, limit: number, windowSeconds: number, subject = "") {
  const now = Math.floor(Date.now() / 1000);
  const windowStartedAt = Math.floor(now / windowSeconds) * windowSeconds;
  const bucketKey = await digest(`${scope}|${clientAddress(request)}|${subject}`);
  const expiresAt = windowStartedAt + windowSeconds * 2;
  const db = getDb();
  await db.run(sql`
    INSERT INTO api_rate_limits (bucket_key, window_started_at, count, expires_at)
    VALUES (${bucketKey}, ${windowStartedAt}, 1, ${expiresAt})
    ON CONFLICT(bucket_key) DO UPDATE SET
      count = CASE WHEN api_rate_limits.window_started_at = excluded.window_started_at THEN api_rate_limits.count + 1 ELSE 1 END,
      window_started_at = excluded.window_started_at,
      expires_at = excluded.expires_at
  `);
  const [bucket] = await db.select({ count: apiRateLimits.count }).from(apiRateLimits).where(eq(apiRateLimits.bucketKey, bucketKey)).limit(1);
  if (now % 97 === 0) await db.run(sql`DELETE FROM api_rate_limits WHERE expires_at < ${now}`);
  return { allowed: (bucket?.count ?? limit + 1) <= limit, retryAfter: Math.max(1, windowStartedAt + windowSeconds - now) };
}

export function rateLimitHeaders(retryAfter: number) {
  return { "Retry-After": String(retryAfter), "Cache-Control": "no-store" };
}
