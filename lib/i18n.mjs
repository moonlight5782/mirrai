import { messages } from "./translations.mjs";

export const supportedLocales = ["ru", "ro", "en"];
export const localeCookie = "mirrai_locale";

export function normalizeLocale(value) {
  const language = String(value ?? "").toLowerCase().split(/[-_]/)[0];
  return supportedLocales.includes(language) ? language : "ru";
}

/** Source-language keys stay readable in JSX. Product data is not machine-translated. */
export function translate(locale, message, values = {}) {
  const key = String(message).replace(/\s+/g, " ").trim();
  const language = normalizeLocale(locale);
  const translated = language === "ru" ? key : messages[key]?.[language] ?? key;
  return translated.replace(/\{(\w+)\}/g, (placeholder, name) =>
    Object.hasOwn(values, name) ? String(values[name]) : placeholder,
  );
}
