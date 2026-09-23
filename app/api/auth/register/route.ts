import { eq } from "drizzle-orm";
import { createSession, passwordRecord, validPassword } from "../../../auth";
import { getDb } from "../../../../db";
import { authUsers } from "../../../../db/schema";
import { rateLimitPolicy, rateLimitHeaders } from "../../../../lib/rate-limit";
import { credentialsInput } from "../../../../lib/auth-input.mjs";
import { mailConfiguration, sendAccountAction } from "../../../../lib/account-mail";

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "invalid_origin" }, { status: 403 });
  const input = credentialsInput(await request.json().catch(() => null), true);
  if (!input || !validPassword(input.password)) return Response.json({ error: "invalid_credentials" }, { status: 400 });
  const { email, password, displayName } = input;
  const throttle = await rateLimitPolicy(request, { scope: "register", ipLimit: 8, subjectLimit: 4, windowSeconds: 60 * 60, subject: email, subjectMode: "subject" });
  if (!throttle.allowed) return Response.json({ error: "rate_limited" }, { status: 429, headers: rateLimitHeaders(throttle.retryAfter) });
  const db = getDb();
  const [existing] = await db.select({ id: authUsers.id }).from(authUsers).where(eq(authUsers.email, email)).limit(1);
  if (existing) return Response.json({ error: "email_exists" }, { status: 409 });
  const credentials = await passwordRecord(password);
  const id = crypto.randomUUID();
  await db.insert(authUsers).values({ id, email, displayName, ...credentials });
  await createSession(id);
  let verificationEmailSent = false;
  if (mailConfiguration()) {
    try { await sendAccountAction({ id, email, passwordHash: credentials.passwordHash }, "verify"); verificationEmailSent = true; }
    catch { console.error("Registration verification email delivery failed"); }
  }
  return Response.json({ ok: true, verificationEmailSent }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
