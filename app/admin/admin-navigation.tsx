"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- avoids unreliable RSC prefetch transitions in the deployed vinext runtime */

import { useEffect, useState } from "react";
import { useI18n } from "../language-provider";

type AdminSection =
  | "overview"
  | "clients"
  | "catalog"
  | "setup"
  | "analytics"
  | "team"
  | "subscription"
  | "billing";
type ShopOption = { name: string; slug: string; role: string };

function withShop(path: string, shopSlug: string) {
  return shopSlug ? `${path}?shop=${encodeURIComponent(shopSlug)}` : path;
}

export function AdminNavigation({
  active,
  displayName,
  shopSlug = "",
}: {
  active: AdminSection;
  displayName: string;
  shopSlug?: string;
}) {
  const { t } = useI18n();

  const [shops, setShops] = useState<ShopOption[]>([]);
  const [operator, setOperator] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/account", { cache: "no-store" })
      .then((response) =>
        response.ok ? response.json() : { shops: [], operator: false },
      )
      .then((result) => {
        if (!cancelled) {
          setShops(
            (result.shops ?? []).map((item: ShopOption) => ({
              name: item.name,
              slug: item.slug,
              role: item.role,
            })),
          );
          setOperator(result.operator === true);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  function changeShop(nextShop: string) {
    const paths: Record<Exclude<AdminSection, "clients">, string> = {
      overview: "/admin",
      catalog: "/admin/catalog",
      setup: "/admin/setup",
      analytics: "/admin/analytics",
      team: "/admin/team",
      subscription: "/admin/subscription",
      billing: "/admin/billing",
    };
    const section = active === "clients" ? "catalog" : active;
    window.location.assign(withShop(paths[section], nextShop));
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/");
  }

  return (
    <aside className="admin-sidebar">
      <a href="/" className="admin-brand">
        MIRR<span>AI</span>
      </a>
      {shops.length > 0 && (
        <label className="admin-shop-switcher">
          <span>{t("Активный магазин")}</span>
          <select
            value={shopSlug}
            onChange={(event) => changeShop(event.target.value)}
          >
            {!shopSlug && <option value="">{t("Выберите магазин")}</option>}
            {shops.map((shop) => (
              <option value={shop.slug} key={shop.slug}>
                {shop.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <nav aria-label={t("Кабинет магазина")}>
        <b>{t("УПРАВЛЕНИЕ")}</b>
        <a
          className={active === "overview" ? "active" : ""}
          href={withShop("/admin", shopSlug)}
        >
          {t("Обзор")}
        </a>
        {operator && (
          <a
            className={active === "clients" ? "active" : ""}
            href="/admin/clients"
          >
            {t("Клиенты")}
          </a>
        )}
        <a
          className={active === "catalog" ? "active" : ""}
          href={withShop("/admin/catalog", shopSlug)}
        >
          {t("Каталог моделей")}
        </a>
        <a
          className={active === "setup" ? "active" : ""}
          href={withShop("/admin/setup", shopSlug)}
        >
          {t("Установка")}
        </a>
        <a
          className={active === "analytics" ? "active" : ""}
          href={withShop("/admin/analytics", shopSlug)}
        >
          {t("Аналитика")}
        </a>
        {(operator ||
          shops.find((shop) => shop.slug === shopSlug)?.role === "owner") && (
          <a
            className={active === "team" ? "active" : ""}
            href={withShop("/admin/team", shopSlug)}
          >
            {t("Команда и доступ")}
          </a>
        )}
        <b>{t("МАГАЗИН")}</b>
        <a
          className={active === "subscription" ? "active" : ""}
          href={withShop("/admin/subscription", shopSlug)}
        >
          {t("Подписка")}
        </a>
        <a
          className={active === "billing" ? "active" : ""}
          href={withShop("/admin/billing", shopSlug)}
        >
          {operator ? t("Тарифы и заявки") : t("Заявки и расчёт")}
        </a>
        <a href="/demo-store">{t("Демонстрация ↗")}</a>
        <a href="/account-access">{t("Безопасность аккаунта")}</a>
        <button
          type="button"
          className="admin-signout"
          onClick={() => void signOut()}
        >
          {t("Выйти")}
        </button>
      </nav>
      <div>
        <small>
          {operator ? t("Оператор MIRRAI") : t("Владелец магазина")}
        </small>
        <span>{displayName}</span>
        <button
          type="button"
          className="admin-signout"
          onClick={() => void signOut()}
        >
          {t("Выйти")}
        </button>
      </div>
    </aside>
  );
}
