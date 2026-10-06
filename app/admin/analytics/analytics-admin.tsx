"use client";
import { useCallback, useEffect, useState } from "react";
import { AdminNavigation } from "../admin-navigation";
import { useI18n } from "../../language-provider";

type Data = {
  shop: { name: string; slug: string };
  totals: {
    widget_open: number;
    model_ready: number;
    ar_open: number;
    object_placed: number;
  };
  rates: { openToAr: number; arToPlaced: number };
  products: {
    sku: string;
    name: string;
    opens: number;
    ar: number;
    placed: number;
  }[];
};
export function AnalyticsAdmin({
  displayName,
  shopSlug,
}: {
  displayName: string;
  shopSlug: string;
}) {
  const { t } = useI18n();
  const [data, setData] = useState<Data | null>(null);
  const load = useCallback(async () => {
    const response = await fetch(
      `/api/admin/analytics${shopSlug ? `?shop=${encodeURIComponent(shopSlug)}` : ""}`,
    );
    if (response.ok) setData(await response.json());
  }, [shopSlug]);
  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);
  return (
    <main className="admin-shell">
      <AdminNavigation
        active="analytics"
        displayName={displayName}
        shopSlug={shopSlug}
      />
      <section className="admin-main">
        <header className="admin-head">
          <div>
            <p>{t("ПОСЛЕДНИЕ 30 ДНЕЙ")}</p>
            <h1>{data?.shop.name ?? t("Аналитика AR")}</h1>
          </div>
        </header>
        {data ? (
          <>
            <div className="analytics-funnel">
              <article>
                <span>{t("Открыли виджет")}</span>
                <strong>{data.totals.widget_open}</strong>
              </article>
              <article>
                <span>{t("Запустили AR")}</span>
                <strong>{data.totals.ar_open}</strong>
                <small>
                  {data.rates.openToAr}
                  {t("% от открытий")}
                </small>
              </article>
              <article>
                <span>{t("Разместили товар")}</span>
                <strong>{data.totals.object_placed}</strong>
                <small>
                  {data.rates.arToPlaced}
                  {t("% от запусков AR")}
                </small>
              </article>
            </div>
            <div className="catalog-table analytics-table">
              <div className="analytics-row header">
                <span>{t("Товар")}</span>
                <span>SKU</span>
                <span>{t("Открытия")}</span>
                <span>AR</span>
                <span>{t("Размещения")}</span>
              </div>
              {data.products.map((item) => (
                <div className="analytics-row" key={item.sku}>
                  <b>{item.name}</b>
                  <span className="sku">{item.sku}</span>
                  <span>{item.opens}</span>
                  <span>{item.ar}</span>
                  <span>{item.placed}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="admin-loading">{t("Загружаем статистику…")}</div>
        )}
      </section>
    </main>
  );
}
