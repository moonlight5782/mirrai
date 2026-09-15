"use client";

import { useEffect, useState } from "react";
import { AdminNavigation } from "./admin-navigation";

type Overview = {
  catalog: { shop: { name: string; subscriptionStatus: string }; counts: { total: number; ready: number; processing: number; missing: number; withPhotos: number } };
  analytics: { totals: { widget_open: number; ar_open: number; object_placed: number }; rates: { openToAr: number; arToPlaced: number } };
  setup: { shop: { installationStatus: string; platform: string; allowedDomains: string[] } };
  subscription: { shop: { trialEndsAt: string | null; subscriptionEndsAt: string | null; subscriptionStatus: string }; access: { remainingDays: number | null } };
};

export function OverviewAdmin({ displayName, shopSlug }: { displayName: string; shopSlug: string }) {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const query = `?shop=${encodeURIComponent(shopSlug)}`;
    Promise.all(["catalog", "analytics", "setup", "subscription"].map(section => fetch(`/api/admin/${section}${query}`, { cache: "no-store" }).then(async response => { if (!response.ok) throw new Error(section); return response.json(); })))
      .then(([catalog, analytics, setup, subscription]) => setData({ catalog, analytics, setup, subscription }))
      .catch(() => setError("Не удалось загрузить обзор магазина."));
  }, [shopSlug]);
  const daysLeft = data?.subscription.access.remainingDays ?? null;
  return <main className="admin-shell"><AdminNavigation active="overview" displayName={displayName} shopSlug={shopSlug}/><section className="admin-main dashboard-overview">
    <header className="admin-head"><div><p>СОСТОЯНИЕ МАГАЗИНА</p><h1>{data?.catalog.shop.name ?? "Обзор"}</h1></div><div className="admin-head-actions"><a className="admin-primary" href={`/admin/catalog?shop=${encodeURIComponent(shopSlug)}`}>Добавить товары</a><a href={`/admin/setup?shop=${encodeURIComponent(shopSlug)}`}>Установить виджет</a></div></header>
    {data ? <><section className="overview-status"><article><span>Каталог</span><strong>{data.catalog.counts.ready} из {data.catalog.counts.total}</strong><small>товаров доступны покупателям в AR</small><a href={`/admin/catalog?shop=${encodeURIComponent(shopSlug)}`}>Открыть каталог →</a></article><article><span>Установка</span><strong>{data.setup.shop.installationStatus === "active" ? "Работает" : "Требует настройки"}</strong><small>{data.setup.shop.allowedDomains.length ? data.setup.shop.allowedDomains.join(", ") : "Домен ещё не указан"}</small><a href={`/admin/setup?shop=${encodeURIComponent(shopSlug)}`}>Проверить установку →</a></article><article><span>Подписка</span><strong>{daysLeft === null ? "Не настроена" : `${daysLeft} дн.`}</strong><small>{data.subscription.shop.subscriptionStatus === "active" ? "активная подписка" : "осталось в текущем периоде"}</small><a href={`/admin/subscription?shop=${encodeURIComponent(shopSlug)}`}>Условия и срок →</a></article></section>
    <section className="overview-columns"><div><header><p>КАТАЛОГ</p><h2>Что требует внимания</h2></header><dl><div><dt>Есть фотографии</dt><dd>{data.catalog.counts.withPhotos}</dd></div><div><dt>Модели создаются</dt><dd>{data.catalog.counts.processing}</dd></div><div><dt>Нет 3D-модели</dt><dd>{data.catalog.counts.missing}</dd></div></dl><a href={`/admin/catalog?shop=${encodeURIComponent(shopSlug)}`}>Загрузить фотографии или GLB →</a></div><div><header><p>ПОСЛЕДНИЕ 30 ДНЕЙ</p><h2>Покупатели</h2></header><dl><div><dt>Открыли виджет</dt><dd>{data.analytics.totals.widget_open}</dd></div><div><dt>Запустили AR</dt><dd>{data.analytics.totals.ar_open}</dd></div><div><dt>Разместили товар</dt><dd>{data.analytics.totals.object_placed}</dd></div></dl><a href={`/admin/analytics?shop=${encodeURIComponent(shopSlug)}`}>Подробная статистика →</a></div></section></> : <div className="admin-loading">{error || "Собираем данные магазина…"}</div>}
  </section></main>;
}
