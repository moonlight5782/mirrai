import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { authUsers } from "../../../../db/schema";
import { getCurrentUser, passwordRecord, validPassword } from "../../../auth";
import { consumeAccountAction } from "../../../../lib/account-actions.mjs";
import { mailConfiguration, sendAccountAction } from "../../../../lib/account-mail";
import { rateLimitPolicy, rateLimitHeaders } from "../../../../lib/rate-limit";

const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function GET() { return reply({ mailAvailable: Boolean(mailConfiguration()) }); }

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return reply({ error: "invalid_origin" }, 403);
  const throttle = await rateLimitPolicy(request, { scope: "account-recovery", ipLimit: 15, windowSeconds: 3600 });
  if (!throttle.allowed) return Response.json({ error: "rate_limited" }, { status: 429, headers: rateLimitHeaders(throttle.retryAfter) });
  const raw = await request.json().catch(() => null);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return reply({ error: "invalid_payload" }, 400);
  const { action, token, password } = raw;
  if (action === "reset" || action === "verify") {
    if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) return reply({ error: "invalid_token" }, 400);
    if (action === "reset" && (typeof password !== "string" || !validPassword(password))) return reply({ error: "invalid_password" }, 400);
    const credentials = action === "reset" ? await passwordRecord(password) : null;
    const ok = await consumeAccountAction(env.DB!, token, action, credentials);
    return reply(ok ? { ok: true } : { error: "invalid_token" }, ok ? 200 : 400);
  }
  if (action !== "request-reset" && action !== "request-verify") return reply({ error: "invalid_payload" }, 400);
  if (!mailConfiguration()) return reply({ error: "mail_unavailable" }, 503);
  const identity = action === "request-verify" ? await getCurrentUser() : null;
  if (action === "request-verify" && !identity) return reply({ error: "authentication_required" }, 401);
  const email = identity?.email ?? (typeof raw.email === "string" ? raw.email.trim().toLowerCase() : "");
  if (email.length > 254 || !/^\S+@\S+\.\S+$/.test(email)) return reply({ error: "invalid_email" }, 400);
  const limit = await rateLimitPolicy(request, { scope: "account-mail", ipLimit: 10, subject: email, subjectMode: "subject", subjectLimit: 3, windowSeconds: 3600 });
  if (!limit.allowed) return reply({ ok: true }, 202);
  const [user] = await getDb().select().from(authUsers).where(eq(authUsers.email, email)).limit(1);
  if (user && !(action === "request-verify" && user.emailVerifiedAt)) {
    try { await sendAccountAction(user, action === "request-reset" ? "reset" : "verify"); }
    catch { console.error("Account email delivery failed"); }
  }
  // Same response for unknown users and failed delivery avoids account enumeration.
  return reply({ ok: true }, 202);
}
