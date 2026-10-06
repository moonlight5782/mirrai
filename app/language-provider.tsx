"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { localeCookie, normalizeLocale, translate } from "../lib/i18n.mjs";

type Locale = "ru" | "ro" | "en";
type Translator = (
  message: string,
  values?: Record<string, string | number>,
) => string;
const LanguageContext = createContext<{ locale: Locale; t: Translator }>({
  locale: "ru",
  t: (message) => message,
});

export function useI18n() {
  return useContext(LanguageContext);
}

export function LanguageProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: React.ReactNode;
}) {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [embedded, setEmbedded] = useState(false);
  const t = useCallback<Translator>(
    (message, values) => translate(locale, message, values),
    [locale],
  );

  useEffect(() => {
    // Explicit iframe/share-link language wins over this browser's saved choice.
    // Do not read browser storage during SSR: hydration must start identically.
    const requested = new URLSearchParams(location.search).get("lang");
    const next = requested
      ? (normalizeLocale(requested) as Locale)
      : initialLocale;
    queueMicrotask(() => {
      setLocale(next);
      setEmbedded(window.parent !== window);
    });
    document.documentElement.lang = next;
  }, [initialLocale]);

  function changeLanguage(value: string) {
    const next = normalizeLocale(value);
    document.cookie = `${localeCookie}=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    // Reload keeps server-rendered auth/admin text in the same language as React.
    // Preserve product, shop, variant and returnTo query parameters.
    const url = new URL(location.href);
    url.searchParams.set("lang", next);
    location.assign(url.href);
  }

  return (
    <LanguageContext.Provider value={{ locale, t }}>
      {!embedded && (
        <div className="language-switcher">
          <label htmlFor="mirrai-language">{t("Язык")}</label>
          <select
            id="mirrai-language"
            value={locale}
            onChange={(event) => changeLanguage(event.target.value)}
            aria-label={t("Язык интерфейса")}
          >
            <option value="ru" lang="ru">
              Русский
            </option>
            <option value="ro" lang="ro">
              Română
            </option>
            <option value="en" lang="en">
              English
            </option>
          </select>
        </div>
      )}
      {children}
    </LanguageContext.Provider>
  );
}
