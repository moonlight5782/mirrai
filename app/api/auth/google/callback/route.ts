import { cookies } from "next/headers";
import { env } from "cloudflare:workers";
import { googleConfiguration, GOOGLE_COOKIE, verifiedGoogleIdentity } from "../../../../../lib/google-auth";
import { createSession, passwordRecord, randomToken, safeReturnTo } from "../../../../auth";

export async function GET(request: Request) {
  const config = googleConfiguration();
  if (!config) return Response.json({error:"google_unavailable"},{status:503});
  const redirect = (path:string) => new Response(null,{status:303,headers:{Location:new URL(path,config.origin).toString(),"Cache-Control":"no-store","Referrer-Policy":"no-referrer"}});
  const jar = await cookies(), raw = jar.get(GOOGLE_COOKIE)?.value;
  jar.set(GOOGLE_COOKIE,"",{httpOnly:true,secure:true,sameSite:"lax",path:"/",maxAge:0});
  try {
    const saved = JSON.parse(raw || "null"), url = new URL(request.url);
    if (url.origin !== config.origin || !saved || typeof saved.state !== "string" || saved.state !== url.searchParams.get("state") || !Number.isFinite(saved.expires) || saved.expires < Date.now() || typeof saved.nonce !== "string" || typeof saved.verifier !== "string" || !url.searchParams.get("code")) return redirect("/login?oauth=failed");
    const response = await fetch("https://oauth2.googleapis.com/token", {method:"POST",signal:AbortSignal.timeout(10000),headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({client_id:config.clientId,client_secret:config.secret,code:url.searchParams.get("code")!,code_verifier:saved.verifier,grant_type:"authorization_code",redirect_uri:config.redirectUri})});
    if (!response.ok) return redirect("/login?oauth=failed");
    const tokens = await response.json() as {id_token?:string};
    if (typeof tokens.id_token !== "string") return redirect("/login?oauth=failed");
    const identity = await verifiedGoogleIdentity(tokens.id_token,config.clientId,saved.nonce);
    const db = env.DB!;
    let account = await db.prepare("SELECT user_id FROM auth_google_accounts WHERE subject=?").bind(identity.subject).first<{user_id:string}>();
    if (!account) {
      // Never merge password accounts based only on a matching email address.
      if (await db.prepare("SELECT id FROM auth_users WHERE email=?").bind(identity.email).first()) return redirect("/login?oauth=email_exists");
      const id = crypto.randomUUID(), credentials = await passwordRecord(randomToken(48));
      await db.batch([
        db.prepare("INSERT INTO auth_users(id,email,display_name,password_hash,password_salt,password_iterations,email_verified_at) VALUES(?,?,?,?,?,?,?)").bind(id,identity.email,identity.name,credentials.passwordHash,credentials.passwordSalt,credentials.passwordIterations,new Date().toISOString()),
        db.prepare("INSERT INTO auth_google_accounts(subject,user_id) VALUES(?,?)").bind(identity.subject,id),
      ]);
      account = {user_id:id};
    }
    await createSession(account.user_id);
    return redirect(safeReturnTo(saved.returnTo,"/admin"));
  } catch {
    // Do not log authorization codes, tokens or provider responses.
    console.error("Google authentication failed");
    return redirect("/login?oauth=failed");
  }
}
