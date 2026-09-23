"use client";
import { useEffect, useState } from "react";

export function RecoveryForm({ email, verified }: { email: string; verified: boolean }) {
  const [link, setLink] = useState<{ token: string; action: string } | null>(null);
  const [mailAvailable, setMailAvailable] = useState<boolean | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const token = params.get("token"), action = params.get("action");
    if (token && (action === "reset" || action === "verify")) {
      // The URL fragment is browser-only external state; read after hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLink({ token, action });
      window.history.replaceState(null, "", window.location.pathname);
    }
    fetch("/api/auth/recovery").then(r => r.ok ? r.json() : null).then(r => setMailAvailable(r?.mailAvailable === true)).catch(() => setMailAvailable(false));
  }, []);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError(""); setMessage("");
    const form = new FormData(event.currentTarget);
    const action = link?.action ?? String(form.get("action"));
    try {
      const response = await fetch("/api/auth/recovery", { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, token: link?.token, email: form.get("email"), password: form.get("password") }) });
      const result = await response.json();
      if (!response.ok) {
        const errors: Record<string, string> = { invalid_token: "Ссылка истекла или уже использована. Запросите новое письмо.", invalid_password: "Пароль: 10–128 символов, буквы и цифры.", mail_unavailable: "Отправка писем пока недоступна.", rate_limited: "Слишком много попыток. Попробуйте позже.", authentication_required: "Войдите в аккаунт для подтверждения почты." };
        setError(errors[result.error] ?? "Не удалось выполнить действие. Повторите попытку."); return;
      }
      if (link) { setDone(true); setMessage(action === "reset" ? "Пароль изменён. Все предыдущие сеансы завершены. Войдите с новым паролем." : "Почта подтверждена."); }
      else setMessage("Если запрос можно выполнить, письмо поступит на указанную почту. Проверьте также папку «Спам».");
    } catch { setError("Нет соединения. Повторите попытку."); }
    finally { setPending(false); }
  }
  return <div>
    {!done && <form className="merchant-auth-form" onSubmit={submit}>
      {link ? <>
        <p>{link.action === "reset" ? "Установите новый пароль. После сохранения все старые сеансы будут завершены." : "Подтвердите, что эта почта принадлежит вам."}</p>
        {link.action === "reset" && <label>Новый пароль<input name="password" type="password" required minLength={10} maxLength={128} autoComplete="new-password"/></label>}
        <button disabled={pending}>{pending ? "Сохраняем…" : link.action === "reset" ? "Сохранить пароль" : "Подтвердить почту"}</button>
      </> : <>
        <label>Рабочая почта<input name="email" type="email" defaultValue={email} required maxLength={254} autoComplete="email"/></label>
        {mailAvailable === false && <p role="status">Отправка писем пока не подключена. Самостоятельное восстановление временно недоступно.</p>}
        <input name="action" type="hidden" value="request-reset"/>
        <button disabled={pending || mailAvailable !== true}>Получить ссылку для нового пароля</button>
      </>}
    </form>}
    {!link && email && !verified && <form className="merchant-auth-form" onSubmit={submit}>
      <input type="hidden" name="action" value="request-verify"/>
      <p>Почта аккаунта: {email}. Подтверждение ещё не выполнено.</p>
      <button disabled={pending || mailAvailable !== true}>Отправить подтверждение почты</button>
    </form>}
    {message && <p role="status">{message}</p>}
    {error && <p className="auth-error" role="alert">{error}</p>}
    {link && !done && <a href="/account-access">Запросить новую ссылку</a>}
  </div>;
}
