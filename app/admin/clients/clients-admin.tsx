"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminNavigation } from "../admin-navigation";
import { useI18n } from "../../language-provider";

type Client = {
  id: number;
  name: string;
  slug: string;
  subscriptionStatus: string;
  accessAllowed: boolean;
  websiteUrl: string | null;
  installationStatus: string;
  plan: string;
  total: number;
  published: number;
  ownerEmail: string;
  expiresAt: string | null;
  events30d: Record<string, number>;
};

export function ClientsAdmin({ displayName }: { displayName: string }) {
  const { t } = useI18n();

  const [items, setItems] = useState<Client[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [invitationUrl, setInvitationUrl] = useState("");
  const [accessBusy, setAccessBusy] = useState("");
  const load = useCallback(async () => {
    const response = await fetch("/api/admin/clients", { cache: "no-store" });
    if (response.ok) setItems((await response.json()).items);
    else setError(t("Доступ к управлению клиентами не найден."));
  }, [t]);
  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);
  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/clients", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form)),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(t("Проверьте данные: идентификатор должен быть уникальным."));
      return;
    }
    setCreating(false);
    setError("");
    setInvitationUrl(
      new URL(result.invitationUrl, window.location.origin).toString(),
    );
    await load();
  }
  async function setAccess(client: Client, enabled: boolean) {
    setAccessBusy(client.slug);
    setError("");
    try {
      const response = await fetch("/api/admin/clients", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "access", shop: client.slug, enabled, days: 30 }),
      });
      if (!response.ok) throw new Error();
      await load();
    } catch {
      setError(t("Не удалось изменить доступ магазина. Обновите страницу и попробуйте ещё раз."));
    } finally {
      setAccessBusy("");
    }
  }
  return (
    <main className="admin-shell">
      <AdminNavigation active="clients" displayName={displayName} />
      <section className="admin-main">
        <header className="admin-head">
          <div>
            <p>{t("ОПЕРАЦИОННЫЙ ЦЕНТР")}</p>
            <h1>{t("Магазины")}</h1>
          </div>
          <div className="client-header-actions">
            <a href="/admin/billing">{t("Заявки и расчёты →")}</a>
            <button
              className="admin-primary"
              onClick={() => {
                setInvitationUrl("");
                setCreating(true);
              }}
            >
              {t("＋ Добавить клиента")}
            </button>
          </div>
        </header>
        {invitationUrl && (
          <section className="invite-result">
            <div>
              <b>{t("Магазин создан")}</b>
              <span>
                {t(
                  "Отправьте владельцу одноразовую ссылку. Она действует 7 дней.",
                )}
              </span>
            </div>
            <input readOnly value={invitationUrl} />
            <button
              type="button"
              onClick={() => void navigator.clipboard.writeText(invitationUrl)}
            >
              {t("Копировать")}
            </button>
          </section>
        )}
        <div className="client-summary">
          <article>
            <span>{t("Клиентов")}</span>
            <strong>{items.length}</strong>
          </article>
          <article>
            <span>{t("Установили виджет")}</span>
            <strong>
              {
                items.filter((item) => item.installationStatus === "connected")
                  .length
              }
            </strong>
          </article>
          <article>
            <span>{t("Моделей опубликовано")}</span>
            <strong>
              {items.reduce((sum, item) => sum + item.published, 0)}
            </strong>
          </article>
        </div>
        <div className="clients-grid">
          {items.map((item) => (
            <article key={item.id}>
              <header>
                <div>
                  <b>{item.name}</b>
                  <span>{item.slug}</span>
                </div>
                <i
                  className={
                    item.installationStatus === "connected" ? "online" : ""
                  }
                />
              </header>
              <dl>
                <div>
                  <dt>{t("Доступ виджета")}</dt>
                  <dd>{item.accessAllowed ? t("Включён") : t("Отключён")}</dd>
                </div>
                <div>
                  <dt>{t("Владелец")}</dt>
                  <dd>{item.ownerEmail || t("Не назначен")}</dd>
                </div>
                <div>
                  <dt>{t("Каталог")}</dt>
                  <dd>
                    {item.published} {t("из")} {item.total} {t("в AR")}
                  </dd>
                </div>
                <div>
                  <dt>{t("Срок подписки")}</dt>
                  <dd>
                    {item.expiresAt
                      ? new Date(item.expiresAt).toLocaleDateString("ru-RU")
                      : t("Не задан")}
                  </dd>
                </div>
                <div>
                  <dt>{t("Открытия виджета / 30 дней")}</dt>
                  <dd>{item.events30d.widget_open ?? 0}</dd>
                </div>
                <div>
                  <dt>{t("Запуски AR / 30 дней")}</dt>
                  <dd>{item.events30d.ar_open ?? 0}</dd>
                </div>
                <div>
                  <dt>{t("Тариф")}</dt>
                  <dd>
                    {item.plan} · {item.subscriptionStatus}
                  </dd>
                </div>
              </dl>
              <div className="client-access-actions">
                <span>{item.accessAllowed ? t("Доступ виджета включён") : t("Виджет отключён; кабинет магазина доступен")}</span>
                {item.accessAllowed ? (
                  <button type="button" disabled={accessBusy === item.slug} onClick={() => void setAccess(item, false)}>
                    {accessBusy === item.slug ? t("Сохраняем…") : t("Отключить доступ")}
                  </button>
                ) : (
                  <button type="button" disabled={accessBusy === item.slug} onClick={() => void setAccess(item, true)}>
                    {accessBusy === item.slug ? t("Сохраняем…") : t("Разрешить на 30 дней")}
                  </button>
                )}
              </div>
              <footer>
                <a href={`/admin?shop=${encodeURIComponent(item.slug)}`}>
                  {t("Обзор")}
                </a>
                <a
                  href={`/admin/subscription?shop=${encodeURIComponent(item.slug)}`}
                >
                  {t("Подписка")}
                </a>
                <a
                  href={`/admin/analytics?shop=${encodeURIComponent(item.slug)}`}
                >
                  {t("Статистика")}
                </a>
                <a
                  href={`/admin/catalog?shop=${encodeURIComponent(item.slug)}`}
                >
                  {t("Каталог")}
                </a>
                <a href={`/admin/setup?shop=${encodeURIComponent(item.slug)}`}>
                  {t("Подключение →")}
                </a>
              </footer>
            </article>
          ))}
        </div>
        {error && <p className="admin-error">{error}</p>}
      </section>
      {creating && (
        <div className="edit-backdrop" role="presentation">
          <form className="edit-model" onSubmit={create}>
            <header>
              <div>
                <p>{t("НОВЫЙ КЛИЕНТ")}</p>
                <h2>{t("Добавить магазин")}</h2>
              </div>
              <button type="button" onClick={() => setCreating(false)}>
                ×
              </button>
            </header>
            <label>
              {t("Название")}
              <input name="name" required placeholder="NORDform" />
            </label>
            <label>
              {t("Идентификатор")}
              <input
                name="slug"
                required
                pattern="[a-z0-9-]{3,60}"
                placeholder="nordform"
              />
            </label>
            <label>
              {t("Email владельца")}
              <input
                name="ownerEmail"
                type="email"
                required
                placeholder="owner@store.com"
              />
            </label>
            <label>
              {t("Сайт")}
              <input
                name="websiteUrl"
                type="url"
                placeholder="https://store.com"
              />
            </label>
            <p>
              {t(
                "После создания вы получите безопасную одноразовую ссылку для владельца.",
              )}
            </p>
            <button className="save-model">{t("Создать магазин")}</button>
          </form>
        </div>
      )}
    </main>
  );
}
