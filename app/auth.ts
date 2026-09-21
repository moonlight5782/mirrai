import { cookies, headers } from "next/headers";
import { and, eq, gt } from "drizzle-orm";

const SESSION_COOKIE = "mirrai_session";
const SESSION_DAYS = 30;
const PASSWORD_ITERATIONS = 210_000;

async function secureCookieSetting() {
  const host = (await headers()).get("host")?.split(":")[0]?.toLowerCase();
  return host !== "localhost" && host !== "127.0.0.1";
}

export type AppUser = {
  userId: string;
  email: string;
  displayName: string;
  fullName: string | null;
  emailVerified: boolean;
};

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach(value => { binary += String.fromCharCode(value); });
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

export function randomToken(size = 32) {
  const bytes = crypto.getRandomValues(new Uint8Array(size));
  return bytesToBase64(bytes).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

async function derivePassword(password: string, salt: Uint8Array, iterations = PASSWORD_ITERATIONS) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: new Uint8Array(salt), iterations }, key, 256);
  return bytesToBase64(new Uint8Array(bits));
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index++) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase().slice(0, 254);
}

export function validPassword(value: string) {
  return value.length >= 10 && value.length <= 128 && /[A-Za-zА-Яа-я]/.test(value) && /\d/.test(value);
}

export async function passwordRecord(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { passwordHash: await derivePassword(password, salt), passwordSalt: bytesToBase64(salt), passwordIterations: PASSWORD_ITERATIONS };
}

export async function passwordMatches(password: string, hash: string, salt: string, iterations: number) {
  try { return constantTimeEqual(await derivePassword(password, base64ToBytes(salt), iterations), hash); }
  catch { return false; }
}

export async function createSession(userId: string) {
  const [{ getDb }, { authSessions }] = await Promise.all([import("../db"), import("../db/schema")]);
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000);
  await getDb().insert(authSessions).values({ id: crypto.randomUUID(), userId, tokenHash: await sha256(token), expiresAt: expiresAt.toISOString() });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, { httpOnly: true, secure: await secureCookieSetting(), sameSite: "lax", path: "/", expires: expiresAt });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    const [{ getDb }, { authSessions }] = await Promise.all([import("../db"), import("../db/schema")]);
    await getDb().delete(authSessions).where(eq(authSessions.tokenHash, await sha256(token)));
  }
  jar.set(SESSION_COOKIE, "", { httpOnly: true, secure: await secureCookieSetting(), sameSite: "lax", path: "/", expires: new Date(0) });
}

export async function getCurrentUser(): Promise<AppUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const [{ getDb }, { authSessions, authUsers }] = await Promise.all([import("../db"), import("../db/schema")]);
  const now = new Date().toISOString();
  const [row] = await getDb().select({ session: authSessions, user: authUsers }).from(authSessions).innerJoin(authUsers, eq(authUsers.id, authSessions.userId)).where(and(eq(authSessions.tokenHash, await sha256(token)), gt(authSessions.expiresAt, now))).limit(1);
  if (!row) return null;
  return { userId: row.user.id, email: row.user.email, displayName: row.user.displayName || row.user.email, fullName: row.user.displayName || null, emailVerified: Boolean(row.user.emailVerifiedAt) };
}

export function safeReturnTo(value: string | null | undefined, fallback = "/admin") {
  if (!value?.startsWith("/") || value.startsWith("//")) return fallback;
  try { const url = new URL(value, "https://mirrai.local"); return url.origin === "https://mirrai.local" ? `${url.pathname}${url.search}${url.hash}` : fallback; }
  catch { return fallback; }
}
