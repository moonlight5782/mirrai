import { Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { DemoStore } from "../app/demo-store/store";
import { LanguageProvider } from "../app/language-provider";
import { normalizeLocale, translate } from "../lib/i18n.mjs";
import { mountDemoWidget } from "./widget";
import { demoShop, neutralDemo } from "./branding";
import "../app/globals.css";
import "./style.css";

const Viewer = lazy(() => import("./viewer"));
const params = new URLSearchParams(location.search);
const cookieLocale = document.cookie.split("; ").find(value => value.startsWith("mirrai_locale="))?.split("=")[1];
const locale = normalizeLocale(params.get("lang") || cookieLocale) as "ru" | "ro" | "en";
const isViewer = params.get("widget") === "1";
const t = (message: string) => translate(locale, message);

function configUrl(shop: string, sku: string) {
  if (shop !== demoShop) throw new Error("Unknown demo shop");
  return `/demo-data/widget-${encodeURIComponent(sku)}.json`;
}

createRoot(document.getElementById("root")!).render(
  <LanguageProvider initialLocale={locale}>
    {isViewer ? <>
      {params.get("launcher") !== "1" && window.parent === window && (
        <a className="demo-viewer-back" href={`/demo-store?lang=${locale}&product=${encodeURIComponent(params.get("catalogSku") || params.get("sku") || "")}`}>
          {t("← Назад")}
        </a>
      )}
      <Suspense fallback={<p role="status">{t("Готовим просмотр…")}</p>}>
        <Viewer configUrl={configUrl} />
      </Suspense>
    </> : <DemoStore neutral={neutralDemo} catalogUrl="/demo-data/catalog.json" mountWidget={mountDemoWidget} />}
  </LanguageProvider>,
);
