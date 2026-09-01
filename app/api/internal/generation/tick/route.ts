import { eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { shops } from "../../../../../db/schema";
import { runJobs } from "../../../admin/generation/route";

const issuer = "https://token.actions.githubusercontent.com";
const audience = "mirrai-generation";
const repository = "moonlight5782/mirrai";
const workflowRef = "moonlight5782/mirrai/.github/workflows/generation-queue.yml@refs/heads/main";

type JwtHeader = { alg?: string; kid?: string };
type JwtClaims = { iss?: string; aud?: string | string[]; exp?: number; nbf?: number; repository?: string; workflow_ref?: string };
type GithubJwk = JsonWebKey & { kid?: string; alg?: string; use?: string };

function decodeBase64Url(value: string) {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(base64), character => character.charCodeAt(0));
}

function decodeJson<T>(value: string): T { return JSON.parse(new TextDecoder().decode(decodeBase64Url(value))) as T; }

async function authorized(request: Request) {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  let header: JwtHeader; let claims: JwtClaims;
  try { header = decodeJson<JwtHeader>(parts[0]); claims = decodeJson<JwtClaims>(parts[1]); } catch { return false; }
  if (header.alg !== "RS256" || !header.kid) return false;
  const now = Math.floor(Date.now() / 1000);
  const validAudience = claims.aud === audience || (Array.isArray(claims.aud) && claims.aud.includes(audience));
  if (claims.iss !== issuer || !validAudience || claims.repository !== repository || claims.workflow_ref !== workflowRef || !claims.exp || claims.exp < now || (claims.nbf ?? 0) > now + 30) return false;
  const jwksResponse = await fetch(`${issuer}/.well-known/jwks`);
  if (!jwksResponse.ok) return false;
  const jwks = await jwksResponse.json() as { keys?: GithubJwk[] };
  const jwk = jwks.keys?.find(key => key.kid === header.kid && (!key.alg || key.alg === "RS256"));
  if (!jwk) return false;
  try {
    const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    return crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, decodeBase64Url(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
  } catch { return false; }
}

export async function POST(request: Request) {
  if (!await authorized(request)) return Response.json({ error: "invalid_scheduler_identity" }, { status: 401 });
  const [shop] = await getDb().select().from(shops).where(eq(shops.slug, "hugge-md")).limit(1);
  if (!shop) return Response.json({ error: "shop_not_found" }, { status: 404 });
  return runJobs(shop, new URL(request.url).origin);
}
