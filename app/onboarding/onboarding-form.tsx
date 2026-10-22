"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- full navigation is intentional in the hosted runtime */

import { useState } from "react";
import { useI18n } from "../language-provider";

const platforms = [
  { id: "shopify", name: "Shopify" },
  { id: "woocommerce", name: "WooCommerce" },
  { id: "opencart", name: "OpenCart" },
  { id: "tilda", name: "Tilda" },
  { id: "custom", name: "Свой сайт" },
  { id: "other", name: "Другая платформа" },
];

export function OnboardingForm({
  displayName,
  email,
}: {
  displayName: string;
  email: string;
}) {
  const { t } = useI18n();

  const [name, setName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [platform, setPlatform] = useState("other");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, websiteUrl, platform }),
      });
      const result = await response.json().catch(() => ({}));
      if (response.ok || result.shop?.slug)
        window.location.assign(
          `/admin/catalog?shop=${encodeURIComponent(result.shop.slug)}`,
        );
      else {
        const errors: Record<string, string> = {
          domain_exists: t(
            "Этот сайт уже подключён к другому магазину. Обратитесь в поддержку.",
          ),
          rate_limited: t("Слишком много попыток. Повторите позже."),
          temporarily_unavailable: t(
            "Сервис временно недоступен. Повторите попытку — дубликат магазина не появится.",
          ),
          authentication_required: t(
            "Сеанс завершён. Войдите в аккаунт заново.",
          ),
        };
        setError(
          errors[result.error] ??
            t("Проверьте название и публичный адрес сайта магазина."),
        );
      }
    } catch {
      setError(t("Нет соединения. Проверьте интернет и повторите попытку."));
    } finally {
      setSaving(false);
    }
  }
  return (
    <main className="onboarding-page">
      <header>
        <a className="brand" href="/">
          MIRR<span>AI</span>
        </a>
        <span>
          {displayName} · {email}
        </span>
      </header>
      <section className="onboarding-layout">
        <div className="onboarding-copy">
          <p>{t("ШАГ 1 ИЗ 3")}</p>
          <h1>{t("Создайте пространство магазина")}</h1>
          <span>
            {t(
              "Мы сохраним магазин отдельно от других клиентов, проверим каталог и покажем, какие товары уже готовы к AR.",
            )}
          </span>
          <ol>
            <li className="active">
              <b>01</b> {t("Данные магазина")}
            </li>
            <li>
              <b>02</b> {t("Товары и фотографии")}
            </li>
            <li>
              <b>03</b> {t("Установка виджета")}
            </li>
          </ol>
        </div>
        <form className="onboarding-form" onSubmit={submit}>
          <label>
            {t("Название магазина")}
            <input
              required
              maxLength={100}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("Например, NORD Home")}
            />
          </label>
          <label>
            {t("Адрес сайта")}
            <input
              required
              type="url"
              value={websiteUrl}
              onChange={(event) => setWebsiteUrl(event.target.value)}
              placeholder="https://my-store.com"
            />
          </label>
          <fieldset>
            <legend>{t("На чём работает сайт?")}</legend>
            <div>
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
          <aside>
            <b>{t("Что произойдёт дальше")}</b>
            <span>
              {t(
                "Откроется кабинет: добавьте товары и модели. Оператор проверит запрос и включит виджет отдельно; оплата сейчас не требуется.",
              )}
            </span>
          </aside>
          {error && <p className="admin-error">{error}</p>}
          <button disabled={saving}>
            {saving ? t("Создаём кабинет…") : t("Отправить запрос и открыть кабинет")}
            <span>→</span>
          </button>
        </form>
      </section>
    </main>
  );
}
