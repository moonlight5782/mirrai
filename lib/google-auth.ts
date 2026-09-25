import { env } from "cloudflare:workers";
import { createRemoteJWKSet } from "jose";
import { verifyGoogleToken } from "./google-identity.mjs";

export function googleConfiguration() {
  const clientId = String(env.GOOGLE_CLIENT_ID || ""), secret = String(env.GOOGLE_CLIENT_SECRET || "");
  try {
    const url = new URL(String(env.APP_ORIGIN || ""));
    if (clientId && secret && url.protocol === "https:" && !url.username && !url.password && url.pathname === "/" && !url.search && !url.hash) return { clientId, secret, origin: url.origin, redirectUri: `${url.origin}/api/auth/google/callback` };
  } catch { /* not configured */ }
  return null;
}

const keys = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
export async function verifiedGoogleIdentity(token: string, clientId: string, nonce: string) {
  return verifyGoogleToken(token, keys, clientId, nonce);
}

export const GOOGLE_COOKIE = "__Host-mirrai_google";
