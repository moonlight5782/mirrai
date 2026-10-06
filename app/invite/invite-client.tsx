"use client";

import { useEffect, useState } from "react";
import { useI18n } from "../language-provider";

type Invite = {
  shop: { name: string; slug: string };
  email: string;
  role: string;
  expiresAt: string;
};
const roles: Record<string, string> = {
  owner: "Владелец",
  editor: "Редактор каталога",
  analyst: "Аналитик",
};

export function InviteClient({
  token,
  signedIn,
  currentEmail,
}: {
  token: string;
  signedIn: boolean;
  currentEmail?: string;
}) {
  const { t } = useI18n();

  const [invite, setInvite] = useState<Invite | null>(null);
  const [state, setState] = useState<
    "loading" | "ready" | "accepting" | "invalid" | "mismatch"
  >("loading");
  useEffect(() => {
    fetch(`/api/invitations?token=${encodeURIComponent(token)}`, {
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const data = await response.json();
        setInvite(data);
        setState("ready");
      })
      .catch(() => setState("invalid"));
  }, [token]);
  async function accept() {
    setState("accepting");
    const response = await fetch("/api/invitations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const result = await response.json().catch(() => ({}));
    if (response.ok) {
      window.location.assign(
        `/admin?shop=${encodeURIComponent(result.shop.slug)}`,
      );
      return;
    }
    setState(result.error === "invite_email_mismatch" ? "mismatch" : "invalid");
  }
  if (state === "loading") return <p>{t("Проверяем приглашение…")}</p>;
  if (state === "invalid")
    return (
      <>
        <h1>{t("Ссылка недействительна")}</h1>
        <p>
          {t(
            "Она уже использована или истёк срок действия. Попросите администратора MIRRAI выпустить новую.",
          )}
        </p>
      </>
    );
  if (!invite) return null;
  const returnTo = `/invite?token=${encodeURIComponent(token)}`;
  return (
    <>
      <p>{t("ПРИГЛАШЕНИЕ В КОМАНДУ")}</p>
      <h1>{invite.shop.name}</h1>
      <span>
        {t("Роль:")} {t(roles[invite.role] ?? invite.role)}
        <br />
        {t("Аккаунт:")} {invite.email}
      </span>
      {state === "mismatch" && (
        <b className="auth-error">
          {t("Вы вошли как")} {currentEmail}
          {t(". Войдите с адресом")} {invite.email}.
        </b>
      )}
      {signedIn ? (
        <button
          type="button"
          onClick={() => void accept()}
          disabled={state === "accepting"}
        >
          {state === "accepting"
            ? t("Подключаем…")
            : t("Принять приглашение →")}
        </button>
      ) : (
        <>
          <a
            href={`/register?invite=${encodeURIComponent(token)}&returnTo=${encodeURIComponent(returnTo)}`}
          >
            {t("Создать аккаунт →")}
          </a>
          <a
            className="secondary-auth-link"
            href={`/login?returnTo=${encodeURIComponent(returnTo)}`}
          >
            {t("Уже есть аккаунт — войти")}
          </a>
        </>
      )}
    </>
  );
}
