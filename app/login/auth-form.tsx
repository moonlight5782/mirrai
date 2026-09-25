"use client";

import { useState } from "react";

export function AuthForm({ mode, returnTo, googleEnabled = false, oauthError }: { mode: "login" | "register"; returnTo: string; googleEnabled?: boolean; oauthError?: string }) {
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [registered, setRegistered] = useState<{ verificationEmailSent: boolean } | null>(null);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
    const response = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: form.get("name"), email: form.get("email"), password: form.get("password") }) });
    const result = await response.json().catch(() => ({}));
    if (response.ok) {
      if (mode === "register") setRegistered({ verificationEmailSent: result.verificationEmailSent === true });
      else window.location.assign(returnTo);
      return;
    }
    setError(response.status >= 500 ? "Ошибка сервера. Попробуйте позже — менять пароль из-за этой ошибки не нужно." : result.error === "email_exists" ? "Аккаунт с такой почтой уже существует." : ["temporarily_blocked", "rate_limited"].includes(result.error) ? "Слишком много попыток. Повторите позже." : result.error === "invalid_password" ? "Пароль: от 10 до 128 символов, хотя бы одна буква и одна цифра." : mode === "login" ? "Неверная почта или пароль." : "Проверьте имя и адрес электронной почты.");
    } catch { setError("Нет соединения. Проверьте интернет и повторите попытку."); }
    finally { setSaving(false); }
  }
  if (registered) return <div className="merchant-auth-form">
    <p role="status">Аккаунт создан. {registered.verificationEmailSent ? "Письмо для подтверждения почты отправлено. Проверьте папку «Спам», если его нет во входящих." : "Письмо подтверждения пока не отправлено. Повторить запрос можно в разделе «Безопасность аккаунта»."}</p>
    <a href={returnTo}>Продолжить настройку магазина →</a>
  </div>;
  return <form className="merchant-auth-form" onSubmit={submit}>
    {googleEnabled && <a href={`/api/auth/google?returnTo=${encodeURIComponent(returnTo)}`}>Продолжить с Google</a>}
    {oauthError && <p role="alert">{oauthError === "email_exists" ? "С этой почтой уже есть аккаунт. Войдите по паролю. Автоматическое объединение аккаунтов отключено для безопасности." : "Не удалось войти через Google. Попробуйте ещё раз или используйте почту и пароль."}</p>}
    {mode === "register" && <label>Ваше имя<input name="name" required autoComplete="name" maxLength={100} placeholder="Артур"/></label>}
    <label>Рабочая почта<input name="email" type="email" required maxLength={254} autoComplete="email" placeholder="owner@store.md"/></label>
    <label>Пароль<input name="password" type="password" required minLength={10} maxLength={128} autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="Не менее 10 символов"/></label>
    {mode === "register" && <p>От 10 до 128 символов, хотя бы одна буква и одна цифра.</p>}
    {mode === "login" && <a href="/account-access">Забыли пароль?</a>}
    {error && <p className="auth-error" role="alert">{error}</p>}
    <button disabled={saving}>{saving ? "Подождите…" : mode === "login" ? "Войти в кабинет" : "Создать аккаунт"}<span>→</span></button>
  </form>;
}
