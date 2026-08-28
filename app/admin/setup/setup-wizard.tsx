"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type SetupData = { shop: { slug: string; name: string; websiteUrl: string; platform: string; installationStatus: string; installationCheckedAt: string | null }; catalog: { total: number; published: number } };
const platforms = [{ id: "shopify", name: "Shopify" }, { id: "woocommerce", name: "WooCommerce" }, { id: "opencart", name: "OpenCart" }, { id: "tilda", name: "Tilda" }, { id: "custom", name: "Свой сайт" }, { id: "other", name: "Другая платформа" }];

export function SetupWizard({ displayName }: { displayName: string }) {
  const [data, setData] = useState<SetupData | null>(null);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [platform, setPlatform] = useState("other");
  const [origin] = useState(() => typeof window === "undefined" ? "" : window.location.origin);
  const [copied, setCopied] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [shopSlug] = useState(() => typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("shop") ?? "");

  const load = useCallback(async () => {
    const response = await fetch(`/api/admin/setup${shopSlug ? `?shop=${encodeURIComponent(shopSlug)}` : ""}`, { cache: "no-store" });
    if (!response.ok) { setError("Не удалось загрузить настройку."); return; }
    const next = await response.json() as SetupData; setData(next); setWebsiteUrl(next.shop.websiteUrl); setPlatform(next.shop.platform);
  }, [shopSlug]);
  useEffect(() => { queueMicrotask(() => void load()); }, [load]);

  const skuTemplate = platform === "shopify" ? "{{ product.selected_or_first_available_variant.sku }}" : platform === "woocommerce" ? "SKU-ТОВАРА" : "SKU-ТОВАРА";
  const skuPrefix = data?.shop.slug === "hugge-md" ? "HUGGE-" : "";
  const snippet = useMemo(() => data ? platform === "opencart" ? `<script src="${origin}/mirrai-widget.js" data-shop-id="${data.shop.slug}" data-auto="product" data-sku-prefix="${skuPrefix}" defer></script>` : `<script src="${origin}/mirrai-widget.js" data-shop-id="${data.shop.slug}" data-auto="scan" defer></script>\n<div data-mirrai-sku="${skuTemplate}"></div>` : "", [data, origin, platform, skuPrefix, skuTemplate]);
  const connected = data?.shop.installationStatus === "connected";
  const settingsReady = Boolean(data?.shop.websiteUrl);

  async function save(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    const response = await fetch("/api/admin/setup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ shop: data?.shop.slug, websiteUrl, platform }) });
    if (!response.ok) setError("Проверьте адрес сайта и попробуйте ещё раз."); else await load();
    setSaving(false);
  }
  async function copy(value: string, key: string) { await navigator.clipboard.writeText(value); setCopied(key); window.setTimeout(() => setCopied(""), 1800); }

  return <main className="admin-shell setup-shell">
    <aside className="admin-sidebar"><Link href="/" className="admin-brand">MIRR<span>AI</span></Link><nav><b>ПОДКЛЮЧЕНИЕ</b><Link href="/admin/clients">Клиенты</Link><Link className="active" href={`/admin/setup${shopSlug ? `?shop=${shopSlug}` : ""}`}>Мастер установки</Link><Link href={`/admin/catalog${shopSlug ? `?shop=${shopSlug}` : ""}`}>Каталог моделей</Link><b>ПОМОЩЬ</b><a href="mailto:hello@mirrai.app">Написать нам</a></nav><div><small>Администратор</small><span>{displayName}</span></div></aside>
    <section className="admin-main">
      <header className="admin-head"><div><p>БЫСТРЫЙ СТАРТ / 3 ШАГА</p><h1>Подключение магазина</h1></div><Link href="/demo-store">Посмотреть пример ↗</Link></header>
      <div className="setup-intro"><div><b>Вам не нужно разбираться в AR</b><p>Заполните адрес, передайте готовый код разработчику или вставьте его в шаблон. MIRRAI сама определит товар по SKU.</p></div><span>{connected ? "Виджет подключён" : "Обычно занимает 10 минут"}</span></div>

      <section className={`setup-step ${settingsReady ? "complete" : "active"}`}><div className="step-number">1</div><div className="step-body"><header><div><h2>Расскажите о магазине</h2><p>Адрес нужен, чтобы виджет работал только на вашем сайте.</p></div><b>{settingsReady ? "Готово ✓" : "Сейчас"}</b></header><form className="setup-form" onSubmit={save}><label>Адрес сайта<input type="url" required placeholder="https://my-store.com" value={websiteUrl} onChange={event => setWebsiteUrl(event.target.value)}/></label><fieldset><legend>На чём работает сайт?</legend><div className="platform-grid">{platforms.map(item => <label className={platform === item.id ? "selected" : ""} key={item.id}><input type="radio" name="platform" value={item.id} checked={platform === item.id} onChange={() => setPlatform(item.id)}/><span>{item.name}</span></label>)}</div></fieldset><button disabled={saving}>{saving ? "Сохраняем…" : settingsReady ? "Сохранить изменения" : "Продолжить"}</button></form></div></section>

      <section className={`setup-step ${settingsReady ? (data?.catalog.published ? "complete" : "active") : "locked"}`}><div className="step-number">2</div><div className="step-body"><header><div><h2>Проверьте каталог</h2><p>Кнопка появится только у товаров с опубликованной 3D-моделью.</p></div><b>{data?.catalog.published ? `${data.catalog.published} готовы ✓` : "Нужна модель"}</b></header><div className="catalog-check"><div><strong>{data?.catalog.published ?? 0}</strong><span>из {data?.catalog.total ?? 0} товаров доступны в AR</span></div><Link href={`/admin/catalog?shop=${data?.shop.slug ?? ""}`}>Открыть каталог моделей →</Link></div></div></section>

      <section className={`setup-step ${connected ? "complete" : settingsReady ? "active" : "locked"}`}><div className="step-number">3</div><div className="step-body"><header><div><h2>Установите одну вставку</h2><p>Её достаточно для всего магазина. Новые модели появятся автоматически.</p></div><b>{connected ? "Подключено ✓" : "Финальный шаг"}</b></header>{settingsReady && <><div className="install-choice"><button className="selected">Скопировать код</button><a href={`mailto:?subject=${encodeURIComponent("Установка MIRRAI для " + data?.shop.name)}&body=${encodeURIComponent("Добавьте этот код в шаблон карточки товара:\n\n" + snippet)}`}>Отправить разработчику</a></div><div className="code-box"><code>{snippet}</code><button onClick={() => void copy(snippet, "snippet")}>{copied === "snippet" ? "Скопировано ✓" : "Копировать"}</button></div><ol className="plain-steps"><li><b>Добавьте скрипт</b><span>Один раз перед закрывающим тегом страницы.</span></li><li><b>Укажите место кнопки</b><span>В карточке товара вставьте строку с data-mirrai-sku.</span></li><li><b>Откройте страницу товара</b><span>Мы автоматически увидим подключение.</span></li></ol><div className={`connection-result ${connected ? "success" : ""}`}><i/><div><b>{connected ? "Всё работает" : "Ожидаем первое открытие"}</b><span>{connected && data?.shop.installationCheckedAt ? `Последняя проверка: ${new Date(data.shop.installationCheckedAt).toLocaleString("ru-RU")}` : "После установки откройте любой товар на своём сайте, затем обновите эту страницу."}</span></div><button onClick={() => void load()}>Проверить снова</button></div></>}</div></section>
      {error && <p className="admin-error">{error}</p>}
    </section>
  </main>;
}
