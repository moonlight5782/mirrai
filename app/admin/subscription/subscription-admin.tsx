"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminNavigation } from "../admin-navigation";

type SubscriptionData = { shop: { name: string; slug: string; subscriptionStatus: string }; counts: { total: number; ready: number }; access: { allowed: boolean; status: string; expiresAt: string | null } };

const statusText: Record<string, string> = { active: "Активна", trial: "Пилотный период", inactive: "Не оплачена", paused: "Приостановлена", expired: "Срок истёк" };

export function SubscriptionAdmin({ displayName, shopSlug }: { displayName: string; shopSlug: string }) {
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
    const response = await fetch(`/api/admin/subscription${shopSlug ? `?shop=${encodeURIComponent(shopSlug)}` : ""}`, { cache: "no-store" });
    if (!response.ok) { setError("Не удалось загрузить данные подписки."); return; }
    setData(await response.json());
    setError("");
    } catch { setError("Не удалось загрузить подписку. Проверьте соединение."); }
  }, [shopSlug]);
  useEffect(() => { queueMicrotask(() => void load()); }, [load]);

  return <main className="admin-shell">
    <AdminNavigation active="subscription" displayName={displayName} shopSlug={shopSlug}/>
    <section className="admin-main">
      <header className="admin-head"><div><p>ТАРИФ И ДОСТУП</p><h1>Подписка</h1></div></header>
      {data ? <div className="subscription-page">
        <p>Доступ: {data.access.allowed ? "разрешён" : "отключён"}. Срок: {data.access.expiresAt ? new Date(data.access.expiresAt).toLocaleString("ru-RU", { timeZone: "UTC" }) + " UTC" : "не задан"}.</p>
        <section className="subscription-hero"><div><small>{data.shop.name}</small><h2>{statusText[data.shop.subscriptionStatus] ?? data.shop.subscriptionStatus}</h2><p>Виджет показывает опубликованные модели, пока подписка активна. При остановке покупатель увидит нейтральное сообщение без ошибки магазина.</p></div><b className={`subscription ${data.shop.subscriptionStatus}`}>{statusText[data.shop.subscriptionStatus] ?? data.shop.subscriptionStatus}</b></section>
        <div className="subscription-grid"><article><span>Текущий формат</span><strong>Пилот для магазина</strong><p>Импорт каталога, хранение моделей, AR-виджет и аналитика.</p></article><article><span>Каталог</span><strong>{data.counts.ready} из {data.counts.total}</strong><p>Товаров сейчас подготовлено для показа в AR.</p></article><article><span>Управление</span><strong>Через MIRRAI</strong><p>Оплата и изменение тарифа пока оформляются вручную на этапе пилота.</p></article></div>
        <div className="subscription-actions"><a href="mailto:hello@mirrai.app?subject=MIRRAI%20—%20подписка">Обсудить тариф</a><a href={`/admin/catalog?shop=${encodeURIComponent(data.shop.slug)}`}>Перейти в каталог →</a></div>
      </div> : <div className="admin-loading">{error || "Загружаем данные подписки…"}</div>}
    </section>
  </main>;
}
