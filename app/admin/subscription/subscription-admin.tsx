"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminNavigation } from "../admin-navigation";
import { useI18n } from "../../language-provider";

type SubscriptionData = {
  shop: { name: string; slug: string; subscriptionStatus: string };
  counts: { total: number; ready: number };
  access: { allowed: boolean; status: string; expiresAt: string | null };
};

const statusText: Record<string, string> = {
  active: "Активна",
  trial: "Пилотный период",
  inactive: "Не оплачена",
  paused: "Приостановлена",
  expired: "Срок истёк",
};

export function SubscriptionAdmin({
  displayName,
  shopSlug,
}: {
  displayName: string;
  shopSlug: string;
}) {
  const { t } = useI18n();

  const [data, setData] = useState<SubscriptionData | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/admin/subscription${shopSlug ? `?shop=${encodeURIComponent(shopSlug)}` : ""}`,
        { cache: "no-store" },
      );
      if (!response.ok) {
        setError(t("Не удалось загрузить данные подписки."));
        return;
      }
      setData(await response.json());
      setError("");
    } catch {
      setError(t("Не удалось загрузить подписку. Проверьте соединение."));
    }
  }, [shopSlug, t]);
  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  return (
    <main className="admin-shell">
      <AdminNavigation
        active="subscription"
        displayName={displayName}
        shopSlug={shopSlug}
      />
      <section className="admin-main">
        <header className="admin-head">
          <div>
            <p>{t("ТАРИФ И ДОСТУП")}</p>
            <h1>{t("Подписка")}</h1>
          </div>
        </header>
        {data ? (
          <div className="subscription-page">
            <p>
              {t("Доступ:")}{" "}
              {data.access.allowed ? t("разрешён") : t("отключён")}
              {t(". Срок:")}{" "}
              {data.access.status === "demo"
                ? t("демонстрация без срока окончания")
                : data.access.expiresAt
                  ? new Date(data.access.expiresAt).toLocaleString("ru-RU", {
                      timeZone: "UTC",
                    }) + " UTC"
                  : t("не задан")}
              .
            </p>
            <section className="subscription-hero">
              <div>
                <small>{data.shop.name}</small>
                <h2>
                  {t(
                    statusText[data.shop.subscriptionStatus] ??
                      data.shop.subscriptionStatus,
                  )}
                </h2>
                <p>
                  {t(
                    "Виджет показывает опубликованные модели, пока подписка активна. При остановке покупатель увидит нейтральное сообщение без ошибки магазина.",
                  )}
                </p>
              </div>
              <b className={`subscription ${data.shop.subscriptionStatus}`}>
                {t(
                  statusText[data.shop.subscriptionStatus] ??
                    data.shop.subscriptionStatus,
                )}
              </b>
            </section>
            <div className="subscription-grid">
              <article>
                <span>{t("Текущий формат")}</span>
                <strong>{t("Пилот для магазина")}</strong>
                <p>
                  {t(
                    "Импорт каталога, хранение моделей, AR-виджет и аналитика.",
                  )}
                </p>
              </article>
              <article>
                <span>{t("Каталог")}</span>
                <strong>
                  {data.counts.ready} {t("из")} {data.counts.total}
                </strong>
                <p>{t("Товаров сейчас подготовлено для показа в AR.")}</p>
              </article>
              <article>
                <span>{t("Управление")}</span>
                <strong>{t("Через MIRRAI")}</strong>
                <p>
                  {t(
                    "Оплата и изменение тарифа пока оформляются вручную на этапе пилота.",
                  )}
                </p>
              </article>
            </div>
            <div className="subscription-actions">
              <a href="/admin/billing">{t("Расчёт стоимости и заявки")}</a>
              <a
                href={`/admin/catalog?shop=${encodeURIComponent(data.shop.slug)}`}
              >
                {t("Перейти в каталог →")}
              </a>
            </div>
          </div>
        ) : (
          <div className="admin-loading">
            {error || t("Загружаем данные подписки…")}
          </div>
        )}
      </section>
    </main>
  );
}
