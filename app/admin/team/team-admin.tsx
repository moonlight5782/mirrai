"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminNavigation } from "../admin-navigation";
import { useI18n } from "../../language-provider";

type Entry = {
  id: number;
  email: string;
  role: string;
  expiresAt?: string | null;
};
const roleNames: Record<string, string> = {
  owner: "Владелец",
  editor: "Редактор",
  analyst: "Аналитик",
  operator: "Администратор MIRRAI",
};

export function TeamAdmin({
  displayName,
  shopSlug,
}: {
  displayName: string;
  shopSlug: string;
}) {
  const { t } = useI18n();

  const [members, setMembers] = useState<Entry[]>([]);
  const [invites, setInvites] = useState<Entry[]>([]);
  const [shopName, setShopName] = useState("");
  const [error, setError] = useState("");
  const [link, setLink] = useState("");
  const load = useCallback(async () => {
    if (!shopSlug) return;
    const response = await fetch(
      `/api/admin/members?shop=${encodeURIComponent(shopSlug)}`,
      { cache: "no-store" },
    );
    if (!response.ok) {
      setError(
        response.status === 403
          ? t("У вас нет права управлять командой этого магазина.")
          : t("Не удалось загрузить команду."),
      );
      return;
    }
    const data = await response.json();
    setMembers(data.members);
    setInvites(data.invites);
    setShopName(data.shop.name);
  }, [shopSlug, t]);
  useEffect(() => {
    const pending = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(pending);
  }, [load]);
  async function invite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/members", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        shop: shopSlug,
        email: form.get("email"),
        role: form.get("role"),
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(
        result.error === "already_member"
          ? t("Этот пользователь уже в команде.")
          : t("Не удалось создать приглашение."),
      );
      return;
    }
    setLink(new URL(result.invitationUrl, window.location.origin).toString());
    event.currentTarget.reset();
    await load();
  }
  async function remove(kind: "member" | "invite", id: number) {
    const response = await fetch("/api/admin/members", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        shop: shopSlug,
        [kind === "member" ? "memberId" : "inviteId"]: id,
      }),
    });
    if (response.ok) await load();
    else setError(t("Не удалось удалить доступ."));
  }
  return (
    <main className="admin-shell">
      <AdminNavigation
        active="team"
        displayName={displayName}
        shopSlug={shopSlug}
      />
      <section className="admin-main">
        <header className="admin-head">
          <div>
            <p>{t("БЕЗОПАСНОСТЬ")}</p>
            <h1>{t("Команда и доступ")}</h1>
            <span>{shopName || t("Выберите магазин")}</span>
          </div>
        </header>
        {shopSlug && (
          <>
            <section className="team-layout">
              <form className="team-invite" onSubmit={invite}>
                <h2>{t("Пригласить сотрудника")}</h2>
                <label>
                  {t("Рабочая почта")}
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="manager@store.md"
                  />
                </label>
                <label>
                  {t("Уровень доступа")}
                  <select name="role" defaultValue="editor">
                    <option value="editor">
                      {t("Редактор — каталог и модели")}
                    </option>
                    <option value="analyst">
                      {t("Аналитик — только просмотр")}
                    </option>
                  </select>
                </label>
                <button className="admin-primary">{t("Создать ссылку")}</button>
                <p>{t("Ссылка одноразовая и действует 7 дней.")}</p>
              </form>
              <section className="team-list">
                <h2>{t("Текущая команда")}</h2>
                {members.map((member) => (
                  <article key={member.id}>
                    <div>
                      <b>{member.email}</b>
                      <span>{t(roleNames[member.role] ?? member.role)}</span>
                    </div>
                    {member.role !== "owner" && (
                      <button
                        type="button"
                        onClick={() => void remove("member", member.id)}
                      >
                        {t("Отозвать")}
                      </button>
                    )}
                  </article>
                ))}
                {invites.map((invite) => (
                  <article className="pending" key={`invite-${invite.id}`}>
                    <div>
                      <b>{invite.email}</b>
                      <span>
                        {t("Ожидает ·")}{" "}
                        {t(roleNames[invite.role] ?? invite.role)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => void remove("invite", invite.id)}
                    >
                      {t("Отменить")}
                    </button>
                  </article>
                ))}
              </section>
            </section>
            {link && (
              <section className="invite-result">
                <div>
                  <b>{t("Приглашение готово")}</b>
                  <span>{t("Скопируйте и отправьте ссылку сотруднику.")}</span>
                </div>
                <input readOnly value={link} />
                <button
                  type="button"
                  onClick={() => void navigator.clipboard.writeText(link)}
                >
                  {t("Копировать")}
                </button>
              </section>
            )}
          </>
        )}
        {error && <p className="admin-error">{error}</p>}
      </section>
    </main>
  );
}
