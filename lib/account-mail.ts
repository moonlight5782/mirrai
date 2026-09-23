import { env } from "cloudflare:workers";
import { actionToken, tokenDigest } from "./account-actions.mjs";

export function mailConfiguration() {
  const token = typeof env.RESEND_API_KEY === "string" ? env.RESEND_API_KEY : "";
  const from = typeof env.MAIL_FROM === "string" ? env.MAIL_FROM : "";
  try {
    const origin = new URL(String(env.APP_ORIGIN || ""));
    if (token && from && origin.protocol === "https:" && !origin.username && !origin.password) return { token, from, origin: origin.origin };
  } catch { /* incomplete configuration */ }
  return null;
}

export async function sendAccountAction(user: { id: string; email: string; passwordHash: string }, purpose: "reset" | "verify") {
  const config = mailConfiguration();
  if (!config || !env.DB) throw new Error("mail_unavailable");
  const token = actionToken(), hash = await tokenDigest(token);
  const expires = new Date(Date.now() + (purpose === "reset" ? 30 * 60_000 : 24 * 60 * 60_000)).toISOString();
  await env.DB.prepare("DELETE FROM auth_action_tokens WHERE expires_at < ?").bind(new Date().toISOString()).run();
  await env.DB.prepare("INSERT INTO auth_action_tokens (token_hash,user_id,purpose,credential_version,expires_at) VALUES (?,?,?,?,?)")
    .bind(hash, user.id, purpose, user.passwordHash, expires).run();
  // Fragment keeps the secret out of HTTP access logs and Referer headers.
  const link = `${config.origin}/account-access#${new URLSearchParams({ token, action: purpose })}`;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST", signal: AbortSignal.timeout(10_000),
      headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json", "Idempotency-Key": hash },
      body: JSON.stringify({ from: config.from, to: [user.email], subject: purpose === "reset" ? "MIRRAI — восстановление пароля" : "MIRRAI — подтвердите почту",
        text: `${purpose === "reset" ? "Для создания нового пароля откройте ссылку. Она действует 30 минут." : "Подтвердите почту по ссылке. Она действует 24 часа."}\n\n${link}\n\nЕсли вы не запрашивали это действие, проигнорируйте письмо.` }),
    });
    if (!response.ok) throw new Error("mail_unavailable");
  } catch {
    await env.DB.prepare("DELETE FROM auth_action_tokens WHERE token_hash = ?").bind(hash).run();
    throw new Error("mail_unavailable");
  }
}
