"use client";

import { useEffect, useState } from "react";
import { AdminNavigation } from "./admin-navigation";
import { installationIsConnected } from "../../lib/installation-status";
import { useI18n } from "../language-provider";

type Overview = {
  catalog: {
    shop: { name: string; subscriptionStatus: string };
    counts: {
      total: number;
      ready: number;
      processing: number;
      missing: number;
      withPhotos: number;
    };
  };
  analytics: {
    totals: { widget_open: number; ar_open: number; object_placed: number };
    rates: { openToAr: number; arToPlaced: number };
  };
  setup: {
    shop: {
      installationStatus: string;
      platform: string;
      allowedDomains: string[];
    };
  };
  subscription: {
    shop: {
      trialEndsAt: string | null;
      subscriptionEndsAt: string | null;
      subscriptionStatus: string;
    };
    access: { remainingDays: number | null };
  };
};

export function OverviewAdmin({
  displayName,
  shopSlug,
}: {
  displayName: string;
  shopSlug: string;
}) {
  const { t } = useI18n();

  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const query = `?shop=${encodeURIComponent(shopSlug)}`;
    Promise.all(
      ["catalog", "analytics", "setup", "subscription"].map((section) =>
        fetch(`/api/admin/${section}${query}`, { cache: "no-store" }).then(
          async (response) => {
            if (!response.ok) throw new Error(section);
            return response.json();
          },
        ),
      ),
    )
      .then(([catalog, analytics, setup, subscription]) =>
        setData({ catalog, analytics, setup, subscription }),
      )
      .catch(() => setError(t("Не удалось загрузить обзор магазина.")));
  }, [shopSlug, t]);
  const daysLeft = data?.subscription.access.remainingDays ?? null;
  return (
    <main className="admin-shell">
      <AdminNavigation
        active="overview"
        displayName={displayName}
        shopSlug={shopSlug}
      />
      <section className="admin-main dashboard-overview">
        <header className="admin-head">
          <div>
            <p>{t("СОСТОЯНИЕ МАГАЗИНА")}</p>
            <h1>{data?.catalog.shop.name ?? t("Обзор")}</h1>
          </div>
          <div className="admin-head-actions">
            <a
              className="admin-primary"
              href={`/admin/catalog?shop=${encodeURIComponent(shopSlug)}`}
            >
              {t("Добавить товары")}
            </a>
            <a href={`/admin/setup?shop=${encodeURIComponent(shopSlug)}`}>
              {t("Установить виджет")}
            </a>
          </div>
        </header>
        {data ? (
          <>
            <section className="overview-status">
              <article>
                <span>{t("Каталог")}</span>
                <strong>
                  {data.catalog.counts.ready} {t("из")}{" "}
                  {data.catalog.counts.total}
                </strong>
                <small>{t("товаров доступны покупателям в AR")}</small>
                <a href={`/admin/catalog?shop=${encodeURIComponent(shopSlug)}`}>
                  {t("Открыть каталог →")}
                </a>
              </article>
              <article>
                <span>{t("Установка")}</span>
                <strong>
                  {installationIsConnected(data.setup.shop.installationStatus)
                    ? t("Работает")
                    : t("Требует настройки")}
                </strong>
                <small>
                  {data.setup.shop.allowedDomains.length
                    ? data.setup.shop.allowedDomains.join(", ")
                    : t("Домен ещё не указан")}
                </small>
                <a href={`/admin/setup?shop=${encodeURIComponent(shopSlug)}`}>
                  {t("Проверить установку →")}
                </a>
              </article>
              <article>
                <span>{t("Подписка")}</span>
                <strong>
                  {daysLeft === null
                    ? t("Не настроена")
                    : t("{count} дн.", { count: daysLeft })}
                </strong>
                <small>
                  {data.subscription.shop.subscriptionStatus === "active"
                    ? t("активная подписка")
                    : t("осталось в текущем периоде")}
                </small>
                <a
                  href={`/admin/subscription?shop=${encodeURIComponent(shopSlug)}`}
                >
                  {t("Условия и срок →")}
                </a>
              </article>
            </section>
            <section className="overview-columns">
              <div>
                <header>
                  <p>{t("КАТАЛОГ")}</p>
                  <h2>{t("Что требует внимания")}</h2>
                </header>
                <dl>
                  <div>
                    <dt>{t("Есть фотографии")}</dt>
                    <dd>{data.catalog.counts.withPhotos}</dd>
                  </div>
                  <div>
                    <dt>{t("Модели создаются")}</dt>
                    <dd>{data.catalog.counts.processing}</dd>
                  </div>
                  <div>
                    <dt>{t("Нет 3D-модели")}</dt>
                    <dd>{data.catalog.counts.missing}</dd>
                  </div>
                </dl>
                <a href={`/admin/catalog?shop=${encodeURIComponent(shopSlug)}`}>
                  {t("Загрузить фотографии или GLB →")}
                </a>
              </div>
              <div>
                <header>
                  <p>{t("ПОСЛЕДНИЕ 30 ДНЕЙ")}</p>
                  <h2>{t("Покупатели")}</h2>
                </header>
                <dl>
                  <div>
                    <dt>{t("Открыли виджет")}</dt>
                    <dd>{data.analytics.totals.widget_open}</dd>
                  </div>
                  <div>
                    <dt>{t("Запустили AR")}</dt>
                    <dd>{data.analytics.totals.ar_open}</dd>
                  </div>
                  <div>
                    <dt>{t("Разместили товар")}</dt>
                    <dd>{data.analytics.totals.object_placed}</dd>
                  </div>
                </dl>
                <a
                  href={`/admin/analytics?shop=${encodeURIComponent(shopSlug)}`}
                >
                  {t("Подробная статистика →")}
                </a>
              </div>
            </section>
          </>
        ) : (
          <div className="admin-loading">
            {error || t("Собираем данные магазина…")}
          </div>
        )}
      </section>
    </main>
  );
}
