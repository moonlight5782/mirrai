import { eq, sql } from "drizzle-orm";
import { getDb } from "../db";
import { apiRateLimits } from "../db/schema";
import { applyRateLimitPolicy } from "./rate-limit-core.mjs";

export type RateLimitPolicy = { scope: string; ipLimit: number; subjectLimit?: number; windowSeconds: number; subject?: string; subjectMode?: "subject" | "ip+subject" };

function durableStore() {
  const db = getDb();
  return {
    async increment(bucketKey: string, windowStartedAt: number, expiresAt: number) {
      await db.run(sql`
        INSERT INTO api_rate_limits (bucket_key, window_started_at, count, expires_at)
        VALUES (${bucketKey}, ${windowStartedAt}, 1, ${expiresAt})
        ON CONFLICT(bucket_key) DO UPDATE SET
          count = CASE WHEN api_rate_limits.window_started_at = excluded.window_started_at THEN api_rate_limits.count + 1 ELSE 1 END,
          window_started_at = excluded.window_started_at,
          expires_at = excluded.expires_at
      `);
      const [bucket] = await db.select({ count: apiRateLimits.count }).from(apiRateLimits).where(eq(apiRateLimits.bucketKey, bucketKey)).limit(1);
      return bucket?.count ?? Number.MAX_SAFE_INTEGER;
    },
    async cleanup(now: number) { await db.run(sql`DELETE FROM api_rate_limits WHERE expires_at < ${now}`); },
  };
}

export async function rateLimitPolicy(request: Request, policy: RateLimitPolicy) {
  return applyRateLimitPolicy(request, policy, durableStore()) as Promise<{ allowed: boolean; retryAfter: number }>;
}

export function rateLimitHeaders(retryAfter: number) {
  return { "Retry-After": String(retryAfter), "Cache-Control": "no-store" };
}
