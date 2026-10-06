"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminNavigation } from "../admin-navigation";
import { installationIsConnected } from "../../../lib/installation-status";
import { useI18n } from "../../language-provider";

type SetupData = {
  shop: {
    slug: string;
    name: string;
    websiteUrl: string;
    platform: string;
    installationStatus: string;
    installationCheckedAt: string | null;
  };
  catalog: { total: number; published: number };
  subscription: { allowed: boolean; expiresAt: string | null };
};
const platforms = [
  { id: "shopify", name: "Shopify" },
  { id: "woocommerce", name: "WooCommerce" },
  { id: "opencart", name: "OpenCart" },
  { id: "tilda", name: "Tilda" },
  { id: "custom", name: "Свой сайт" },
  { id: "other", name: "Другая платформа" },
];

export function SetupWizard({
  displayName,
  shopSlug,
}: {
  displayName: string;
  shopSlug: string;
}) {
  const { t, locale } = useI18n();

  const [data, setData] = useState<SetupData | null>(null);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [platform, setPlatform] = useState("other");
  const [origin] = useState(() =>
    typeof window === "undefined" ? "" : window.location.origin,
  );
  const [copied, setCopied] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/admin/setup${shopSlug ? `?shop=${encodeURIComponent(shopSlug)}` : ""}`,
        { cache: "no-store" },
      );
      if (!response.ok) {
        setError(t("Не удалось загрузить настройку."));
        return;
      }
      const next = (await response.json()) as SetupData;
      setData(next);
      setWebsiteUrl(next.shop.websiteUrl);
      setPlatform(next.shop.platform);
      setError("");
    } catch {
      setError(t("Нет соединения. Повторите загрузку настройки."));
    }
  }, [shopSlug, t]);
  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  const snippet = useMemo(
    () =>
      data
        ? `<script src="${origin}/mirrai-widget-2.4.0.js" data-auto="universal" defer></script>`
        : "",
    [data, origin],
  );
  const connected = installationIsConnected(data?.shop.installationStatus);
  const settingsReady = Boolean(data?.shop.websiteUrl);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin/setup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ shop: data?.shop.slug, websiteUrl, platform }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        setError(
          result.error === "domain_exists"
            ? t(
                "Этот домен уже связан с другим магазином. Обратитесь в поддержку.",
              )
            : t("Проверьте адрес сайта и попробуйте ещё раз."),
        );
      } else await load();
    } catch {
      setError(
        t("Нет соединения. Изменения не подтверждены — повторите попытку."),
      );
    } finally {
      setSaving(false);
    }
  }
  async function copy(value: string, key: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      window.setTimeout(() => setCopied(""), 1800);
    } catch {
      setError(
        t("Браузер запретил копирование. Выделите код и скопируйте вручную."),
      );
    }
  }

  return (
    <main className="admin-shell setup-shell">
      <AdminNavigation
        active="setup"
        displayName={displayName}
        shopSlug={shopSlug}
      />
      <section className="admin-main">
        <header className="admin-head">
          <div>
            <p>{t("БЫСТРЫЙ СТАРТ / 3 ШАГА")}</p>
            <h1>{t("Подключение магазина")}</h1>
          </div>
          <a href="/demo-store">{t("Посмотреть пример ↗")}</a>
        </header>
        {data && (
          <section
            className="setup-intro"
            aria-label={t("Готовность магазина")}
          >
            <div>
              <b>{t("Что нужно для работающей кнопки")}</b>
              <p>
                {t("Домен:")}{" "}
                {settingsReady ? t("сохранён") : t("укажите адрес сайта")}
                {t(". Модели:")}{" "}
                {data.catalog.published
                  ? t("{count} доступны", { count: data.catalog.published })
                  : t("нужно опубликовать хотя бы одну")}
                {t(". Скрипт:")}{" "}
                {connected ? t("обнаружен") : t("ещё не обнаружен")}.
              </p>
              <p>
                {t("Доступ:")}{" "}
                {data.subscription.allowed
                  ? t("активен")
                  : t("неактивен — кнопка не откроет модель")}
                {data.subscription.expiresAt
                  ? " " +
                    t("до {date}", {
                      date: new Date(
                        data.subscription.expiresAt,
                      ).toLocaleString(locale),
                    })
                  : ""}
                .{" "}
                <a
                  href={`/admin/subscription?shop=${encodeURIComponent(data.shop.slug)}`}
                >
                  {t("Проверить подписку →")}
                </a>
              </p>
              <p>
                {t(
                  "Последний шаг: откройте товар на сайте магазина, запустите 3D и AR, затем проверьте событие в",
                )}{" "}
                <a
                  href={`/admin/analytics?shop=${encodeURIComponent(data.shop.slug)}`}
                >
                  {t("статистике")}
                </a>
                {t(
                  ". Сигнал скрипта не подтверждает качество модели или работу камеры.",
                )}
              </p>
            </div>
          </section>
        )}
        <div className="setup-intro">
          <div>
            <b>{t("Один универсальный коннектор")}</b>
            <p>
              {t(
                "MIRRAI определит магазин по домену, распознает платформу, найдёт SKU и добавит кнопку только к товарам с готовой моделью. Для нестандартной темы можно явно передать SKU.",
              )}
            </p>
          </div>
          <span>
            {connected ? t("Виджет подключён") : t("Обычно занимает 10 минут")}
          </span>
        </div>

        <section
          className={`setup-step ${settingsReady ? "complete" : "active"}`}
        >
          <div className="step-number">1</div>
          <div className="step-body">
            <header>
              <div>
                <h2>{t("Расскажите о магазине")}</h2>
                <p>
                  {t(
                    "Адрес нужен, чтобы виджет работал только на вашем сайте.",
                  )}
                </p>
              </div>
              <b>{settingsReady ? t("Готово ✓") : t("Сейчас")}</b>
            </header>
            <form className="setup-form" onSubmit={save}>
              <label>
                {t("Адрес сайта")}
                <input
                  type="url"
                  required
                  placeholder="https://my-store.com"
                  value={websiteUrl}
                  onChange={(event) => setWebsiteUrl(event.target.value)}
                />
              </label>
              <fieldset>
                <legend>{t("На чём работает сайт?")}</legend>
                <div className="platform-grid">
                  {platforms.map((item) => (
                    <label
                      className={platform === item.id ? "selected" : ""}
                      key={item.id}
                    >
                      <input
                        type="radio"
                        name="platform"
                        value={item.id}
                        checked={platform === item.id}
                        onChange={() => setPlatform(item.id)}
                      />
                      <span>{t(item.name)}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <button disabled={saving}>
                {saving
                  ? t("Сохраняем…")
                  : settingsReady
                    ? t("Сохранить изменения")
                    : t("Продолжить")}
              </button>
            </form>
          </div>
        </section>

        <section
          className={`setup-step ${settingsReady ? (data?.catalog.published ? "complete" : "active") : "locked"}`}
        >
          <div className="step-number">2</div>
          <div className="step-body">
            <header>
              <div>
                <h2>{t("Проверьте каталог")}</h2>
                <p>
                  {t(
                    "Кнопка появится только у товаров с опубликованной 3D-моделью.",
                  )}
                </p>
              </div>
              <b>
                {data?.catalog.published
                  ? t("{count} готовы ✓", { count: data.catalog.published })
                  : t("Нужна модель")}
              </b>
            </header>
            <div className="catalog-check">
              <div>
                <strong>{data?.catalog.published ?? 0}</strong>
                <span>
                  {t("из")} {data?.catalog.total ?? 0}{" "}
                  {t("товаров доступны в AR")}
                </span>
              </div>
              <a
                href={`/admin/catalog?shop=${encodeURIComponent(data?.shop.slug ?? "")}`}
              >
                {t("Открыть каталог моделей →")}
              </a>
            </div>
          </div>
        </section>

        <section
          className={`setup-step ${connected ? "complete" : settingsReady ? "active" : "locked"}`}
        >
          <div className="step-number">3</div>
          <div className="step-body">
            <header>
              <div>
                <h2>{t("Установите одну вставку")}</h2>
                <p>
                  {t(
                    "Её достаточно для всего магазина. Новые модели появятся автоматически.",
                  )}
                </p>
              </div>
              <b>{connected ? t("Подключено ✓") : t("Финальный шаг")}</b>
            </header>
            {settingsReady && (
              <>
                <div className="install-choice">
                  <button className="selected">{t("Скопировать код")}</button>
                  <a
                    href={`mailto:?subject=${encodeURIComponent(t("Установка MIRRAI для") + " " + data?.shop.name)}&body=${encodeURIComponent(t("Добавьте этот код в общий шаблон сайта:") + "\n\n" + snippet)}`}
                  >
                    {t("Отправить разработчику")}
                  </a>
                </div>
                <div className="code-box">
                  <code>{snippet}</code>
                  <button onClick={() => void copy(snippet, "snippet")}>
                    {copied === "snippet"
                      ? t("Скопировано ✓")
                      : t("Копировать")}
                  </button>
                </div>
                <ol className="plain-steps">
                  <li>
                    <b>{t("Добавьте скрипт один раз")}</b>
                    <span>
                      {t(
                        "В общий шаблон сайта перед закрывающим тегом страницы.",
                      )}
                    </span>
                  </li>
                  <li>
                    <b>{t("Проверьте автоматическое распознавание")}</b>
                    <span>
                      {t(
                        "На стандартной теме коннектор сам найдёт платформу, SKU и место рядом с покупкой.",
                      )}
                    </span>
                  </li>
                  <li>
                    <b>{t("Откройте страницу товара")}</b>
                    <span>
                      {t(
                        "После загрузки скрипта появится отметка подключения. Затем откройте 3D и AR у товара с готовой моделью.",
                      )}
                    </span>
                  </li>
                </ol>
                <details className="setup-advanced">
                  <summary>
                    {t("Если тема магазина нестандартная или SKU не найден")}
                  </summary>
                  <p>
                    {t("Добавьте контейнер")}{" "}
                    <code>
                      &lt;div
                      data-mirrai-sku=&quot;SKU-ТОВАРА&quot;&gt;&lt;/div&gt;
                    </code>{" "}
                    {t(
                      "в шаблон карточки товара. Это самый надёжный резервный режим: кнопка появится именно рядом с этим контейнером.",
                    )}{" "}
                    <code>data-allow-url-sku=&quot;true&quot;</code>{" "}
                    {t(
                      "используйте только когда URL каждой карточки стабильно заканчивается артикулом.",
                    )}
                  </p>
                </details>
                <div
                  className={`connection-result ${connected ? "success" : ""}`}
                >
                  <i />
                  <div>
                    <b>
                      {connected
                        ? t("Скрипт обнаружен")
                        : t("Ожидаем первое открытие")}
                    </b>
                    <span>
                      {connected && data?.shop.installationCheckedAt
                        ? t("Последний сигнал скрипта: {date}", {
                            date: new Date(
                              data.shop.installationCheckedAt,
                            ).toLocaleString(locale),
                          })
                        : t(
                            "После установки откройте любой товар на своём сайте, затем обновите эту страницу.",
                          )}
                    </span>
                  </div>
                  <button onClick={() => void load()}>
                    {t("Проверить снова")}
                  </button>
                </div>
              </>
            )}
          </div>
        </section>
        {error && <p className="admin-error">{error}</p>}
      </section>
    </main>
  );
}
