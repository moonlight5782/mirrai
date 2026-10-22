"use client";

import { useState } from "react";
import { useI18n } from "../language-provider";

export function AuthForm({
  mode,
  returnTo,
  googleEnabled = false,
  googleOnly = false,
  oauthError,
}: {
  mode: "login" | "register";
  returnTo: string;
  googleEnabled?: boolean;
  googleOnly?: boolean;
  oauthError?: string;
}) {
  const { t } = useI18n();

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [registered, setRegistered] = useState<{
    verificationEmailSent: boolean;
  } | null>(null);
  if (googleOnly) {
    return (
      <div className="merchant-auth-form">
        {oauthError && (
          <p role="alert">
            {oauthError === "email_exists"
              ? t("Этот адрес уже связан с другим способом входа. Обратитесь в поддержку.")
              : t("Не удалось войти через Google. Попробуйте ещё раз.")}
          </p>
        )}
        {googleEnabled ? (
          <a href={`/api/auth/google?returnTo=${encodeURIComponent(returnTo)}`}>
            {t("Продолжить с Google")} →
          </a>
        ) : (
          <p role="status">{t("Вход через Google пока не настроен.")}</p>
        )}
        <p>{t("Вход и восстановление доступа защищены аккаунтом Google.")}</p>
      </div>
    );
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (response.ok) {
        if (mode === "register")
          setRegistered({
            verificationEmailSent: result.verificationEmailSent === true,
          });
        else window.location.assign(returnTo);
        return;
      }
      setError(
        response.status >= 500
          ? t(
              "Ошибка сервера. Попробуйте позже — менять пароль из-за этой ошибки не нужно.",
            )
          : result.error === "email_exists"
            ? t("Аккаунт с такой почтой уже существует.")
            : ["temporarily_blocked", "rate_limited"].includes(result.error)
              ? t("Слишком много попыток. Повторите позже.")
              : result.error === "invalid_password"
                ? t(
                    "Пароль: от 10 до 128 символов, хотя бы одна буква и одна цифра.",
                  )
                : mode === "login"
                  ? t("Неверная почта или пароль.")
                  : t("Проверьте имя и адрес электронной почты."),
      );
    } catch {
      setError(t("Нет соединения. Проверьте интернет и повторите попытку."));
    } finally {
      setSaving(false);
    }
  }
  if (registered)
    return (
      <div className="merchant-auth-form">
        <p role="status">
          {t("Аккаунт создан.")}{" "}
          {registered.verificationEmailSent
            ? t(
                "Письмо для подтверждения почты отправлено. Проверьте папку «Спам», если его нет во входящих.",
              )
            : t(
                "Письмо подтверждения пока не отправлено. Повторить запрос можно в разделе «Безопасность аккаунта».",
              )}
        </p>
        <a href={returnTo}>{t("Продолжить настройку магазина →")}</a>
      </div>
    );
  return (
    <form className="merchant-auth-form" onSubmit={submit}>
      {googleEnabled && (
        <a href={`/api/auth/google?returnTo=${encodeURIComponent(returnTo)}`}>
          {t("Продолжить с Google")}
        </a>
      )}
      {oauthError && (
        <p role="alert">
          {oauthError === "email_exists"
            ? t(
                "С этой почтой уже есть аккаунт. Войдите по паролю. Автоматическое объединение аккаунтов отключено для безопасности.",
              )
            : t(
                "Не удалось войти через Google. Попробуйте ещё раз или используйте почту и пароль.",
              )}
        </p>
      )}
      {mode === "register" && (
        <label>
          {t("Ваше имя")}
          <input
            name="name"
            required
            autoComplete="name"
            maxLength={100}
            placeholder={t("Артур")}
          />
        </label>
      )}
      <label>
        {t("Рабочая почта")}
        <input
          name="email"
          type="email"
          required
          maxLength={254}
          autoComplete="email"
          placeholder="owner@store.md"
        />
      </label>
      <label>
        {t("Пароль")}
        <input
          name="password"
          type="password"
          required
          minLength={10}
          maxLength={128}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          placeholder={t("Не менее 10 символов")}
        />
      </label>
      {mode === "register" && (
        <p>{t("От 10 до 128 символов, хотя бы одна буква и одна цифра.")}</p>
      )}
      {mode === "login" && <a href="/account-access">{t("Забыли пароль?")}</a>}
      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}
      <button disabled={saving}>
        {saving
          ? t("Подождите…")
          : mode === "login"
            ? t("Войти в кабинет")
            : t("Создать аккаунт")}
        <span>→</span>
      </button>
    </form>
  );
}
