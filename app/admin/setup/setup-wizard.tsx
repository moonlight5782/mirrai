"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminNavigation } from "../admin-navigation";
import { installationIsConnected } from "../../../lib/installation-status";

type SetupData = { shop: { slug: string; name: string; websiteUrl: string; platform: string; installationStatus: string; installationCheckedAt: string | null }; catalog: { total: number; published: number }; subscription: { allowed: boolean; expiresAt: string | null } };
const platforms = [{ id: "shopify", name: "Shopify" }, { id: "woocommerce", name: "WooCommerce" }, { id: "opencart", name: "OpenCart" }, { id: "tilda", name: "Tilda" }, { id: "custom", name: "Свой сайт" }, { id: "other", name: "Другая платформа" }];

export function SetupWizard({ displayName, shopSlug }: { displayName: string; shopSlug: string }) {
  const [data, setData] = useState<SetupData | null>(null);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [platform, setPlatform] = useState("other");
  const [origin] = useState(() => typeof window === "undefined" ? "" : window.location.origin);
  const [copied, setCopied] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
    const response = await fetch(`/api/admin/setup${shopSlug ? `?shop=${encodeURIComponent(shopSlug)}` : ""}`, { cache: "no-store" });
    if (!response.ok) { setError("Не удалось загрузить настройку."); return; }
    const next = await response.json() as SetupData; setData(next); setWebsiteUrl(next.shop.websiteUrl); setPlatform(next.shop.platform); setError("");
    } catch { setError("Нет соединения. Повторите загрузку настройки."); }
  }, [shopSlug]);
  useEffect(() => { queueMicrotask(() => void load()); }, [load]);

  const snippet = useMemo(() => data ? `<script src="${origin}/mirrai-widget-2.2.0.js" data-auto="universal" defer></script>` : "", [data, origin]);
  const connected = installationIsConnected(data?.shop.installationStatus);
  const settingsReady = Boolean(data?.shop.websiteUrl);

  async function save(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    try {
    const response = await fetch("/api/admin/setup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ shop: data?.shop.slug, websiteUrl, platform }) });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      setError(result.error === "domain_exists" ? "Этот домен уже связан с другим магазином. Обратитесь в поддержку." : "Проверьте адрес сайта и попробуйте ещё раз.");
    } else await load();
    } catch { setError("Нет соединения. Изменения не подтверждены — повторите попытку."); }
    finally { setSaving(false); }
  }
  async function copy(value: string, key: string) {
    try { await navigator.clipboard.writeText(value); setCopied(key); window.setTimeout(() => setCopied(""), 1800); }
    catch { setError("Браузер запретил копирование. Выделите код и скопируйте вручную."); }
  }

  return <main className="admin-shell setup-shell">
    <AdminNavigation active="setup" displayName={displayName} shopSlug={shopSlug}/>
    <section className="admin-main">
      <header className="admin-head"><div><p>БЫСТРЫЙ СТАРТ / 3 ШАГА</p><h1>Подключение магазина</h1></div><a href="/demo-store">Посмотреть пример ↗</a></header>
      {data && <section className="setup-intro" aria-label="Готовность магазина">
        <div><b>Что нужно для работающей кнопки</b>
          <p>Домен: {settingsReady ? "сохранён" : "укажите адрес сайта"}. Модели: {data.catalog.published ? `${data.catalog.published} доступны` : "нужно опубликовать хотя бы одну"}. Скрипт: {connected ? "обнаружен" : "ещё не обнаружен"}.</p>
          <p>Доступ: {data.subscription.allowed ? "активен" : "неактивен — кнопка не откроет модель"}{data.subscription.expiresAt ? ` до ${new Date(data.subscription.expiresAt).toLocaleString("ru-RU")}` : ""}. <a href={`/admin/subscription?shop=${encodeURIComponent(data.shop.slug)}`}>Проверить подписку →</a></p>
          <p>Последний шаг: откройте товар на сайте магазина, запустите 3D и AR, затем проверьте событие в <a href={`/admin/analytics?shop=${encodeURIComponent(data.shop.slug)}`}>статистике</a>. Сигнал скрипта не подтверждает качество модели или работу камеры.</p>
        </div>
      </section>}
      <div className="setup-intro"><div><b>Один универсальный коннектор</b><p>MIRRAI определит магазин по домену, распознает платформу, найдёт SKU и добавит кнопку только к товарам с готовой моделью. Для нестандартной темы можно явно передать SKU.</p></div><span>{connected ? "Виджет подключён" : "Обычно занимает 10 минут"}</span></div>

      <section className={`setup-step ${settingsReady ? "complete" : "active"}`}><div className="step-number">1</div><div className="step-body"><header><div><h2>Расскажите о магазине</h2><p>Адрес нужен, чтобы виджет работал только на вашем сайте.</p></div><b>{settingsReady ? "Готово ✓" : "Сейчас"}</b></header><form className="setup-form" onSubmit={save}><label>Адрес сайта<input type="url" required placeholder="https://my-store.com" value={websiteUrl} onChange={event => setWebsiteUrl(event.target.value)}/></label><fieldset><legend>На чём работает сайт?</legend><div className="platform-grid">{platforms.map(item => <label className={platform === item.id ? "selected" : ""} key={item.id}><input type="radio" name="platform" value={item.id} checked={platform === item.id} onChange={() => setPlatform(item.id)}/><span>{item.name}</span></label>)}</div></fieldset><button disabled={saving}>{saving ? "Сохраняем…" : settingsReady ? "Сохранить изменения" : "Продолжить"}</button></form></div></section>

      <section className={`setup-step ${settingsReady ? (data?.catalog.published ? "complete" : "active") : "locked"}`}><div className="step-number">2</div><div className="step-body"><header><div><h2>Проверьте каталог</h2><p>Кнопка появится только у товаров с опубликованной 3D-моделью.</p></div><b>{data?.catalog.published ? `${data.catalog.published} готовы ✓` : "Нужна модель"}</b></header><div className="catalog-check"><div><strong>{data?.catalog.published ?? 0}</strong><span>из {data?.catalog.total ?? 0} товаров доступны в AR</span></div><a href={`/admin/catalog?shop=${encodeURIComponent(data?.shop.slug ?? "")}`}>Открыть каталог моделей →</a></div></div></section>

      <section className={`setup-step ${connected ? "complete" : settingsReady ? "active" : "locked"}`}><div className="step-number">3</div><div className="step-body"><header><div><h2>Установите одну вставку</h2><p>Её достаточно для всего магазина. Новые модели появятся автоматически.</p></div><b>{connected ? "Подключено ✓" : "Финальный шаг"}</b></header>{settingsReady && <><div className="install-choice"><button className="selected">Скопировать код</button><a href={`mailto:?subject=${encodeURIComponent("Установка MIRRAI для " + data?.shop.name)}&body=${encodeURIComponent("Добавьте этот код в общий шаблон сайта:\n\n" + snippet)}`}>Отправить разработчику</a></div><div className="code-box"><code>{snippet}</code><button onClick={() => void copy(snippet, "snippet")}>{copied === "snippet" ? "Скопировано ✓" : "Копировать"}</button></div><ol className="plain-steps"><li><b>Добавьте скрипт один раз</b><span>В общий шаблон сайта перед закрывающим тегом страницы.</span></li><li><b>Проверьте автоматическое распознавание</b><span>На стандартной теме коннектор сам найдёт платформу, SKU и место рядом с покупкой.</span></li><li><b>Откройте страницу товара</b><span>После загрузки скрипта появится отметка подключения. Затем откройте 3D и AR у товара с готовой моделью.</span></li></ol><details className="setup-advanced"><summary>Если тема магазина нестандартная или SKU не найден</summary><p>Добавьте контейнер <code>&lt;div data-mirrai-sku=&quot;SKU-ТОВАРА&quot;&gt;&lt;/div&gt;</code> в шаблон карточки товара. Это самый надёжный резервный режим: кнопка появится именно рядом с этим контейнером. <code>data-allow-url-sku=&quot;true&quot;</code> используйте только когда URL каждой карточки стабильно заканчивается артикулом.</p></details><div className={`connection-result ${connected ? "success" : ""}`}><i/><div><b>{connected ? "Скрипт обнаружен" : "Ожидаем первое открытие"}</b><span>{connected && data?.shop.installationCheckedAt ? `Последний сигнал скрипта: ${new Date(data.shop.installationCheckedAt).toLocaleString("ru-RU")}` : "После установки откройте любой товар на своём сайте, затем обновите эту страницу."}</span></div><button onClick={() => void load()}>Проверить снова</button></div></>}</div></section>
      {error && <p className="admin-error">{error}</p>}
    </section>
  </main>;
}
