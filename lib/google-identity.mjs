import { jwtVerify } from "jose";

export async function verifyGoogleToken(token, keys, clientId, nonce) {
  const { payload } = await jwtVerify(token, keys, { issuer: ["https://accounts.google.com", "accounts.google.com"], audience: clientId, algorithms: ["RS256"], requiredClaims: ["exp", "iat", "sub", "nonce"] });
  if (payload.nonce !== nonce || (payload.azp && payload.azp !== clientId) || payload.email_verified !== true || typeof payload.email !== "string" || payload.email.length > 254 || !/^\S+@\S+\.\S+$/.test(payload.email) || !payload.sub) throw new Error("invalid_identity");
  return { subject: payload.sub, email: payload.email.toLowerCase(), name: typeof payload.name === "string" ? payload.name.slice(0,100) : "" };
}
