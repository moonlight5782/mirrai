"use client";
import { useEffect, useState } from "react";
import { useI18n } from "../language-provider";

export function RecoveryForm({
  email,
  verified,
}: {
  email: string;
  verified: boolean;
}) {
  const { t } = useI18n();

  const [link, setLink] = useState<{ token: string; action: string } | null>(
    null,
  );
  const [mailAvailable, setMailAvailable] = useState<boolean | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const token = params.get("token"),
      action = params.get("action");
    if (token && (action === "reset" || action === "verify")) {
      // The URL fragment is browser-only external state; read after hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLink({ token, action });
      window.history.replaceState(null, "", window.location.pathname);
    }
    fetch("/api/auth/recovery")
      .then((r) => (r.ok ? r.json() : null))
      .then((r) => setMailAvailable(r?.mailAvailable === true))
      .catch(() => setMailAvailable(false));
  }, []);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setMessage("");
    const form = new FormData(event.currentTarget);
    const action = link?.action ?? String(form.get("action"));
    try {
      const response = await fetch("/api/auth/recovery", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action,
          token: link?.token,
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        const errors: Record<string, string> = {
          invalid_token: t(
            "Ссылка истекла или уже использована. Запросите новое письмо.",
          ),
          invalid_password: t("Пароль: 10–128 символов, буквы и цифры."),
          mail_unavailable: t("Отправка писем пока недоступна."),
          rate_limited: t("Слишком много попыток. Попробуйте позже."),
          authentication_required: t(
            "Войдите в аккаунт для подтверждения почты.",
          ),
        };
        setError(
          errors[result.error] ??
            t("Не удалось выполнить действие. Повторите попытку."),
        );
        return;
      }
      if (link) {
        setDone(true);
        setMessage(
          action === "reset"
            ? t(
                "Пароль изменён. Все предыдущие сеансы завершены. Войдите с новым паролем.",
              )
            : t("Почта подтверждена."),
        );
      } else
        setMessage(
          t(
            "Если запрос можно выполнить, письмо поступит на указанную почту. Проверьте также папку «Спам».",
          ),
        );
    } catch {
      setError(t("Нет соединения. Повторите попытку."));
    } finally {
      setPending(false);
    }
  }
  return (
    <div>
      {!done && (
        <form className="merchant-auth-form" onSubmit={submit}>
          {link ? (
            <>
              <p>
                {link.action === "reset"
                  ? t(
                      "Установите новый пароль. После сохранения все старые сеансы будут завершены.",
                    )
                  : t("Подтвердите, что эта почта принадлежит вам.")}
              </p>
              {link.action === "reset" && (
                <label>
                  {t("Новый пароль")}
                  <input
                    name="password"
                    type="password"
                    required
                    minLength={10}
                    maxLength={128}
                    autoComplete="new-password"
                  />
                </label>
              )}
              <button disabled={pending}>
                {pending
                  ? t("Сохраняем…")
                  : link.action === "reset"
                    ? t("Сохранить пароль")
                    : t("Подтвердить почту")}
              </button>
            </>
          ) : (
            <>
              <label>
                {t("Рабочая почта")}
                <input
                  name="email"
                  type="email"
                  defaultValue={email}
                  required
                  maxLength={254}
                  autoComplete="email"
                />
              </label>
              {mailAvailable === false && (
                <p role="status">
                  {t(
                    "Отправка писем пока не подключена. Самостоятельное восстановление временно недоступно.",
                  )}
                </p>
              )}
              <input name="action" type="hidden" value="request-reset" />
              <button disabled={pending || mailAvailable !== true}>
                {t("Получить ссылку для нового пароля")}
              </button>
            </>
          )}
        </form>
      )}
      {!link && email && !verified && (
        <form className="merchant-auth-form" onSubmit={submit}>
          <input type="hidden" name="action" value="request-verify" />
          <p>
            {t("Почта аккаунта:")} {email}
            {t(". Подтверждение ещё не выполнено.")}
          </p>
          <button disabled={pending || mailAvailable !== true}>
            {t("Отправить подтверждение почты")}
          </button>
        </form>
      )}
      {message && <p role="status">{message}</p>}
      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}
      {link && !done && (
        <a href="/account-access">{t("Запросить новую ссылку")}</a>
      )}
    </div>
  );
}
