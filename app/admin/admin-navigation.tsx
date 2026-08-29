"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- avoids unreliable RSC prefetch transitions in the deployed vinext runtime */

import { useEffect, useState } from "react";

type AdminSection = "clients" | "catalog" | "setup" | "analytics" | "subscription";
type ShopOption = { name: string; slug: string };

function withShop(path: string, shopSlug: string) {
  return shopSlug ? `${path}?shop=${encodeURIComponent(shopSlug)}` : path;
}

export function AdminNavigation({ active, displayName, shopSlug = "" }: { active: AdminSection; displayName: string; shopSlug?: string }) {
  const [shops, setShops] = useState<ShopOption[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/clients", { cache: "no-store" })
      .then(response => response.ok ? response.json() : { items: [] })
      .then(result => { if (!cancelled) setShops((result.items ?? []).map((item: ShopOption) => ({ name: item.name, slug: item.slug }))); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  function changeShop(nextShop: string) {
    const paths: Record<Exclude<AdminSection, "clients">, string> = {
      catalog: "/admin/catalog",
      setup: "/admin/setup",
      analytics: "/admin/analytics",
      subscription: "/admin/subscription",
    };
    const section = active === "clients" ? "catalog" : active;
    window.location.assign(withShop(paths[section], nextShop));
  }

  return <aside className="admin-sidebar">
    <a href="/" className="admin-brand">MIRR<span>AI</span></a>
    {shops.length > 0 && <label className="admin-shop-switcher">
      <span>Активный магазин</span>
      <select value={shopSlug} onChange={event => changeShop(event.target.value)}>
        {!shopSlug && <option value="">Выберите магазин</option>}
        {shops.map(shop => <option value={shop.slug} key={shop.slug}>{shop.name}</option>)}
      </select>
    </label>}
    <nav aria-label="Кабинет магазина">
      <b>УПРАВЛЕНИЕ</b>
      <a className={active === "clients" ? "active" : ""} href="/admin/clients">Клиенты</a>
      <a className={active === "catalog" ? "active" : ""} href={withShop("/admin/catalog", shopSlug)}>Каталог моделей</a>
      <a className={active === "setup" ? "active" : ""} href={withShop("/admin/setup", shopSlug)}>Установка</a>
      <a className={active === "analytics" ? "active" : ""} href={withShop("/admin/analytics", shopSlug)}>Аналитика</a>
      <b>МАГАЗИН</b>
      <a className={active === "subscription" ? "active" : ""} href={withShop("/admin/subscription", shopSlug)}>Подписка</a>
      <a href="/demo-store">Демонстрация ↗</a>
    </nav>
    <div><small>Администратор</small><span>{displayName}</span><a className="admin-signout" href="/signout-with-chatgpt?return_to=%2F">Выйти</a></div>
  </aside>;
}
