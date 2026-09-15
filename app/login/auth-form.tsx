"use client";

import { useState } from "react";

export function AuthForm({ mode, returnTo }: { mode: "login" | "register"; returnTo: string }) {
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: form.get("name"), email: form.get("email"), password: form.get("password") }) });
    const result = await response.json().catch(() => ({}));
    if (response.ok) { window.location.assign(returnTo); return; }
    setError(result.error === "email_exists" ? "Аккаунт с такой почтой уже существует." : result.error === "temporarily_blocked" ? "Слишком много попыток. Повторите вход через 15 минут." : mode === "login" ? "Неверная почта или пароль." : "Проверьте поля. Пароль должен содержать минимум 10 символов, буквы и цифры.");
    setSaving(false);
  }
  return <form className="merchant-auth-form" onSubmit={submit}>
    {mode === "register" && <label>Ваше имя<input name="name" required autoComplete="name" maxLength={100} placeholder="Артур"/></label>}
    <label>Рабочая почта<input name="email" type="email" required autoComplete="email" placeholder="owner@store.md"/></label>
    <label>Пароль<input name="password" type="password" required minLength={10} maxLength={128} autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="Не менее 10 символов"/></label>
    {error && <p className="auth-error">{error}</p>}
    <button disabled={saving}>{saving ? "Подождите…" : mode === "login" ? "Войти в кабинет" : "Создать аккаунт"}<span>→</span></button>
  </form>;
}
