import { translate } from "../lib/i18n.mjs";
import { demoShop } from "./branding";

/** Demo-only adapter. It does not grant access to any paid merchant/API.
 * Public assets and per-SKU JSON are baked into the downloadable build.
 * The production SDK is deliberately not modified or shipped here.
 */
export function mountDemoWidget(config: Record<string, unknown>) {
  const target = document.querySelector(String(config.target));
  if (!target) return {};
  const locale = String(config.lang || "ru");
  const t = (message: string) => translate(locale, message);
  const url = new URL("/", location.origin);
  const keys = ["productId", "name", "price", "category", "material", "model", "iosModel", "selectedVariantId", "width", "height", "depth", "color", "lang", "sku"];
  for (const key of keys) if (config[key] != null) url.searchParams.set(key, String(config[key]));
  url.searchParams.set("variants", JSON.stringify(config.variants || []));
  url.searchParams.set("widget", "1");
  url.searchParams.set("textured", "1");
  url.searchParams.set("shop", demoShop);
  url.searchParams.set("catalogSku", new URLSearchParams(location.search).get("product") || String(config.sku));
  url.searchParams.set("parentOrigin", location.origin);

  const frame = document.createElement("iframe");
  frame.title = `${t("Посмотреть у себя")}: ${config.name}`;
  frame.allow = "camera; xr-spatial-tracking; fullscreen; clipboard-write";
  const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (/Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
  let button: HTMLButtonElement | undefined;
  let dialog: HTMLDialogElement | undefined;
  let previousOverflow = "";

  if (mobile) {
    url.searchParams.set("launcher", "1");
    frame.className = "demo-launcher-frame";
    frame.src = url.href;
    target.append(frame);
  } else {
    button = document.createElement("button");
    button.type = "button";
    button.className = "demo-view-button";
    button.textContent = `${t("Посмотреть у себя")} ↗`;
    dialog = document.createElement("dialog");
    dialog.className = "demo-viewer-dialog";
    dialog.setAttribute("aria-label", `${t("Посмотреть у себя")}: ${config.name}`);
    const close = document.createElement("button");
    close.type = "button";
    close.className = "demo-viewer-close";
    close.textContent = `${t("Закрыть")} ×`;
    close.onclick = () => dialog?.close();
    dialog.append(close, frame);
    document.body.append(dialog);
    dialog.addEventListener("click", event => { if (event.target === dialog) dialog?.close(); });
    dialog.addEventListener("close", () => {
      frame.src = "about:blank";
      document.body.style.overflow = previousOverflow;
      button?.focus();
    });
    button.onclick = () => {
      if (!dialog) return;
      previousOverflow = document.body.style.overflow;
      frame.src = url.href;
      dialog.showModal();
      document.body.style.overflow = "hidden";
      close.focus();
    };
    target.append(button);
  }
  const receive = (event: MessageEvent) => {
    if (event.origin !== location.origin || event.source !== frame.contentWindow || event.data?.source !== "mirrai-widget") return;
    if (mobile && event.data.event === "launcher_resize" && Number.isFinite(event.data.height)) {
      frame.style.height = `${Math.min(700, Math.max(130, event.data.height))}px`;
    }
    if (["model_ready", "ar_open", "object_placed"].includes(event.data.event)) {
      window.dispatchEvent(new CustomEvent("mirrai:event", { detail: { event: event.data.event } }));
    }
  };
  window.addEventListener("message", receive);
  return { destroy() {
    if (dialog?.open) { dialog.close(); document.body.style.overflow = previousOverflow; }
    window.removeEventListener("message", receive);
    dialog?.remove(); frame.remove(); button?.remove();
  } };
}
