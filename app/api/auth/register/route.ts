import { eq } from "drizzle-orm";
import { createSession, normalizeEmail, passwordRecord, validPassword } from "../../../auth";
import { getDb } from "../../../../db";
import { authUsers } from "../../../../db/schema";
import { rateLimit, rateLimitHeaders } from "../../../../lib/rate-limit";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { email?: string; password?: string; name?: string };
  const email = normalizeEmail(body.email ?? "");
  const password = body.password ?? "";
  const displayName = body.name?.trim().slice(0, 100) ?? "";
  if (!/^\S+@\S+\.\S+$/.test(email) || !displayName || !validPassword(password)) return Response.json({ error: "invalid_credentials" }, { status: 400 });
  const ipLimit = await rateLimit(request, "register-ip", 8, 60 * 60);
  const emailLimit = await rateLimit(request, "register-email", 4, 60 * 60, email);
  if (!ipLimit.allowed || !emailLimit.allowed) {
    const retryAfter = Math.max(ipLimit.retryAfter, emailLimit.retryAfter);
    return Response.json({ error: "rate_limited" }, { status: 429, headers: rateLimitHeaders(retryAfter) });
  }
  const db = getDb();
  const [existing] = await db.select({ id: authUsers.id }).from(authUsers).where(eq(authUsers.email, email)).limit(1);
  if (existing) return Response.json({ error: "email_exists" }, { status: 409 });
  const credentials = await passwordRecord(password);
  const id = crypto.randomUUID();
  await db.insert(authUsers).values({ id, email, displayName, ...credentials });
  await createSession(id);
  return Response.json({ ok: true }, { status: 201 });
}
