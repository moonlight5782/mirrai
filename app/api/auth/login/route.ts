import { eq } from "drizzle-orm";
import { createSession, normalizeEmail, passwordMatches } from "../../../auth";
import { getDb } from "../../../../db";
import { authLoginAttempts, authUsers } from "../../../../db/schema";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { email?: string; password?: string };
  const email = normalizeEmail(body.email ?? "");
  const password = body.password ?? "";
  const db = getDb();
  const now = Date.now();
  const [attempts] = await db.select().from(authLoginAttempts).where(eq(authLoginAttempts.email, email)).limit(1);
  if (attempts?.blockedUntil && new Date(attempts.blockedUntil).getTime() > now) return Response.json({ error: "temporarily_blocked" }, { status: 429, headers: { "Retry-After": "900" } });
  const [user] = await db.select().from(authUsers).where(eq(authUsers.email, email)).limit(1);
  if (!user || !await passwordMatches(password, user.passwordHash, user.passwordSalt, user.passwordIterations)) {
    const windowExpired = !attempts || now - new Date(attempts.windowStartedAt).getTime() > 15 * 60_000;
    const nextAttempts = windowExpired ? 1 : attempts.attempts + 1;
    await db.insert(authLoginAttempts).values({ email, attempts: nextAttempts, windowStartedAt: windowExpired ? new Date(now).toISOString() : attempts.windowStartedAt, blockedUntil: nextAttempts >= 5 ? new Date(now + 15 * 60_000).toISOString() : null }).onConflictDoUpdate({ target: authLoginAttempts.email, set: { attempts: nextAttempts, windowStartedAt: windowExpired ? new Date(now).toISOString() : attempts!.windowStartedAt, blockedUntil: nextAttempts >= 5 ? new Date(now + 15 * 60_000).toISOString() : null } });
    return Response.json({ error: "invalid_credentials" }, { status: 401 });
  }
  await db.delete(authLoginAttempts).where(eq(authLoginAttempts.email, email));
  await createSession(user.id);
  return Response.json({ ok: true });
}
