import { cookies } from "next/headers";
import { googleConfiguration, GOOGLE_COOKIE } from "../../../../lib/google-auth";
import { randomToken, safeReturnTo } from "../../../auth";
import { rateLimitPolicy, rateLimitHeaders } from "../../../../lib/rate-limit";

export async function GET(request: Request) {
  const config = googleConfiguration();
  if (!config) return Response.json({ error: "google_unavailable" }, { status: 503 });
  if (new URL(request.url).origin !== config.origin) return new Response("Invalid origin", {status:403});
  const limit = await rateLimitPolicy(request, { scope: "google-start", ipLimit: 20, windowSeconds: 600 });
  if (!limit.allowed) return new Response("Too many attempts", {status:429,headers:rateLimitHeaders(limit.retryAfter)});
  const state = randomToken(), nonce = randomToken(), verifier = randomToken(48);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
  const challenge = btoa(String.fromCharCode(...digest)).replaceAll("+","-").replaceAll("/","_").replaceAll("=","");
  const returnTo = safeReturnTo(new URL(request.url).searchParams.get("returnTo"), "/admin");
  (await cookies()).set(GOOGLE_COOKIE, JSON.stringify({state,nonce,verifier,returnTo,expires:Date.now()+600_000}), {httpOnly:true,secure:true,sameSite:"lax",path:"/",maxAge:600});
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({ client_id:config.clientId,redirect_uri:config.redirectUri,response_type:"code",scope:"openid email profile",state,nonce,code_challenge:challenge,code_challenge_method:"S256" }).toString();
  return new Response(null,{status:302,headers:{Location:url.toString(),"Cache-Control":"no-store","Referrer-Policy":"no-referrer"}});
}
