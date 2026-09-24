"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- full navigation is intentional in the hosted runtime */

import { useState } from "react";

const platforms = [
  { id: "shopify", name: "Shopify" }, { id: "woocommerce", name: "WooCommerce" },
  { id: "opencart", name: "OpenCart" }, { id: "tilda", name: "Tilda" },
  { id: "custom", name: "Свой сайт" }, { id: "other", name: "Другая платформа" },
];

export function OnboardingForm({ displayName, email }: { displayName: string; email: string }) {
  const [name, setName] = useState(""); const [websiteUrl, setWebsiteUrl] = useState(""); const [platform, setPlatform] = useState("other");
  const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    try {
    const response = await fetch("/api/onboarding", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, websiteUrl, platform }) });
    const result = await response.json().catch(() => ({}));
    if (response.ok || result.shop?.slug) window.location.assign(`/admin/catalog?shop=${encodeURIComponent(result.shop.slug)}`);
    else {
      const errors: Record<string, string> = { domain_exists: "Этот сайт уже подключён к другому магазину. Обратитесь в поддержку.", rate_limited: "Слишком много попыток. Повторите позже.", temporarily_unavailable: "Сервис временно недоступен. Повторите попытку — дубликат магазина не появится.", authentication_required: "Сеанс завершён. Войдите в аккаунт заново." };
      setError(errors[result.error] ?? "Проверьте название и публичный адрес сайта магазина.");
    }
    } catch { setError("Нет соединения. Проверьте интернет и повторите попытку."); }
    finally { setSaving(false); }
  }
  return <main className="onboarding-page"><header><a className="brand" href="/">MIRR<span>AI</span></a><span>{displayName} · {email}</span></header><section className="onboarding-layout"><div className="onboarding-copy"><p>ШАГ 1 ИЗ 3</p><h1>Создайте пространство магазина</h1><span>Мы сохраним магазин отдельно от других клиентов, проверим каталог и покажем, какие товары уже готовы к AR.</span><ol><li className="active"><b>01</b> Данные магазина</li><li><b>02</b> Товары и фотографии</li><li><b>03</b> Установка виджета</li></ol></div><form className="onboarding-form" onSubmit={submit}><label>Название магазина<input required maxLength={100} value={name} onChange={event => setName(event.target.value)} placeholder="Например, NORD Home"/></label><label>Адрес сайта<input required type="url" value={websiteUrl} onChange={event => setWebsiteUrl(event.target.value)} placeholder="https://my-store.com"/></label><fieldset><legend>На чём работает сайт?</legend><div>{platforms.map(item => <label className={platform === item.id ? "selected" : ""} key={item.id}><input type="radio" name="platform" value={item.id} checked={platform === item.id} onChange={() => setPlatform(item.id)}/><span>{item.name}</span></label>)}</div></fieldset><aside><b>Что произойдёт дальше</b><span>Откроется каталог. Вы сможете импортировать CSV, добавить товары вручную, загрузить фотографии или готовые 3D-файлы.</span></aside>{error && <p className="admin-error">{error}</p>}<button disabled={saving}>{saving ? "Создаём кабинет…" : "Создать магазин"}<span>→</span></button></form></section></main>;
}
