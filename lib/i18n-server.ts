import { cookies, headers } from "next/headers";
import { localeCookie, normalizeLocale, translate } from "./i18n.mjs";

/** Request-scoped: never store the selected language in a server-global variable. */
export async function getI18n() {
  const jar = await cookies();
  const requestHeaders = await headers();
  const locale = normalizeLocale(
    requestHeaders.get("x-mirrai-locale") ?? jar.get(localeCookie)?.value,
  ) as "ru" | "ro" | "en";
  return {
    locale,
    t: (message: string, values?: Record<string, string | number>) =>
      translate(locale, message, values),
  };
}
