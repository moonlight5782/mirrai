"use client";

import { useEffect, useState } from "react";

type Invite = { shop: { name: string; slug: string }; email: string; role: string; expiresAt: string };
const roles: Record<string, string> = { owner: "Владелец", editor: "Редактор каталога", analyst: "Аналитик" };

export function InviteClient({ token, signedIn, currentEmail }: { token: string; signedIn: boolean; currentEmail?: string }) {
  const [invite, setInvite] = useState<Invite | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "accepting" | "invalid" | "mismatch">("loading");
  useEffect(() => { fetch(`/api/invitations?token=${encodeURIComponent(token)}`, { cache: "no-store" }).then(async response => { if (!response.ok) throw new Error(); const data = await response.json(); setInvite(data); setState("ready"); }).catch(() => setState("invalid")); }, [token]);
  async function accept() {
    setState("accepting");
    const response = await fetch("/api/invitations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) });
    const result = await response.json().catch(() => ({}));
    if (response.ok) { window.location.assign(`/admin?shop=${encodeURIComponent(result.shop.slug)}`); return; }
    setState(result.error === "invite_email_mismatch" ? "mismatch" : "invalid");
  }
  if (state === "loading") return <p>Проверяем приглашение…</p>;
  if (state === "invalid") return <><h1>Ссылка недействительна</h1><p>Она уже использована или истёк срок действия. Попросите администратора MIRRAI выпустить новую.</p></>;
  if (!invite) return null;
  const returnTo = `/invite?token=${encodeURIComponent(token)}`;
  return <><p>ПРИГЛАШЕНИЕ В КОМАНДУ</p><h1>{invite.shop.name}</h1><span>Роль: {roles[invite.role] ?? invite.role}<br/>Аккаунт: {invite.email}</span>{state === "mismatch" && <b className="auth-error">Вы вошли как {currentEmail}. Войдите с адресом {invite.email}.</b>}{signedIn ? <button type="button" onClick={() => void accept()} disabled={state === "accepting"}>{state === "accepting" ? "Подключаем…" : "Принять приглашение →"}</button> : <><a href={`/register?invite=${encodeURIComponent(token)}&returnTo=${encodeURIComponent(returnTo)}`}>Создать аккаунт →</a><a className="secondary-auth-link" href={`/login?returnTo=${encodeURIComponent(returnTo)}`}>Уже есть аккаунт — войти</a></>}</>;
}
