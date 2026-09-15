import { eq } from "drizzle-orm";
import { createSession, normalizeEmail, passwordRecord, validPassword } from "../../../auth";
import { getDb } from "../../../../db";
import { authUsers } from "../../../../db/schema";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { email?: string; password?: string; name?: string };
  const email = normalizeEmail(body.email ?? "");
  const password = body.password ?? "";
  const displayName = body.name?.trim().slice(0, 100) ?? "";
  if (!/^\S+@\S+\.\S+$/.test(email) || !displayName || !validPassword(password)) return Response.json({ error: "invalid_credentials" }, { status: 400 });
  const db = getDb();
  const [existing] = await db.select({ id: authUsers.id }).from(authUsers).where(eq(authUsers.email, email)).limit(1);
  if (existing) return Response.json({ error: "email_exists" }, { status: 409 });
  const credentials = await passwordRecord(password);
  const id = crypto.randomUUID();
  await db.insert(authUsers).values({ id, email, displayName, ...credentials });
  await createSession(id);
  return Response.json({ ok: true }, { status: 201 });
}
