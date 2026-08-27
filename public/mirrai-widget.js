(function () {
  "use strict";

  var script = document.currentScript;
  var scriptOrigin = script && script.src ? new URL(script.src).origin : window.location.origin;
  var allowedEvents = ["model_ready", "ar_open", "object_placed"];

  function readData(node) {
    var data = node && node.dataset ? node.dataset : {};
    return {
      target: data.target || "",
      shopId: data.shopId || "",
      sku: data.sku || "",
      productId: data.productId || "product",
      name: data.name || "Посмотреть товар у себя",
      price: data.price || "",
      category: data.category || "Мебель",
      material: data.material || "",
      model: data.model || "",
      iosModel: data.iosModel || "",
      width: data.width || "80",
      height: data.height || "80",
      depth: data.depth || "80",
      color: data.color || "#d2bda8",
      subscription: data.subscription || "active",
      label: data.label || "Посмотреть у себя",
      mode: data.mode || "auto"
    };
  }

  function viewerUrl(config) {
    var url = new URL("/", scriptOrigin);
    var params = {
      widget: "1", productId: config.productId, name: config.name,
      price: config.price, category: config.category, material: config.material,
      model: config.model, iosModel: config.iosModel, width: config.width,
      height: config.height, depth: config.depth, color: config.color,
      subscription: config.subscription, parentOrigin: window.location.origin
    };
    Object.keys(params).forEach(function (key) { if (params[key]) url.searchParams.set(key, params[key]); });
    return url.toString();
  }

  function style(element, values) { Object.keys(values).forEach(function (key) { element.style[key] = values[key]; }); }

  function mount(input) {
    var config = Object.assign(readData(script), input || {});
    var target = typeof config.target === "string" ? document.querySelector(config.target) : config.target;
    if (!target) target = script && script.parentElement ? script.parentElement : document.body;

    var button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", config.label + ": " + config.name);
    button.textContent = config.label + "  ↗";
    style(button, { width: "100%", minHeight: "50px", border: "0", background: "#181814", color: "#fff", padding: "14px 18px", font: "600 14px/1.2 Arial,sans-serif", letterSpacing: ".01em", cursor: "pointer" });
    target.appendChild(button);
    if (config.shopId && config.sku && !config.model) button.style.display = "none";

    var overlay = document.createElement("div");
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "AR-просмотр товара " + config.name);
    style(overlay, { position: "fixed", inset: "0", zIndex: "2147483647", display: "none", alignItems: "center", justifyContent: "center", padding: "24px", background: "rgba(18,18,15,.72)", backdropFilter: "blur(8px)" });

    var frameWrap = document.createElement("div");
    style(frameWrap, { position: "relative", width: "min(1180px,100%)", height: "min(780px,calc(100vh - 48px))", background: "#f7f5ef", boxShadow: "0 30px 90px rgba(0,0,0,.35)" });
    var close = document.createElement("button");
    close.type = "button"; close.textContent = "Закрыть ×"; close.setAttribute("aria-label", "Закрыть AR-просмотр");
    style(close, { position: "absolute", right: "12px", top: "12px", zIndex: "2", border: "0", background: "#181814", color: "#fff", padding: "10px 13px", font: "12px Arial,sans-serif", cursor: "pointer" });
    var iframe = document.createElement("iframe");
    iframe.title = "MIRRAI — " + config.name;
    iframe.allow = "camera; xr-spatial-tracking; fullscreen";
    iframe.setAttribute("allowfullscreen", "");
    style(iframe, { width: "100%", height: "100%", border: "0" });
    frameWrap.appendChild(close); frameWrap.appendChild(iframe); overlay.appendChild(frameWrap); document.body.appendChild(overlay);

    function closeModal() { overlay.style.display = "none"; iframe.src = "about:blank"; document.body.style.overflow = ""; button.focus(); }
    function recordEvent(name) {
      if (!config.shopId || !config.sku) return;
      fetch(new URL("/api/widget/events", scriptOrigin), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ shopId: config.shopId, sku: config.sku, event: name }), keepalive: true }).catch(function () {});
    }
    function resolveCatalogProduct() {
      if (!config.shopId || !config.sku || config.model) return Promise.resolve(true);
      var endpoint = new URL("/api/widget/config", scriptOrigin);
      endpoint.searchParams.set("shop", config.shopId); endpoint.searchParams.set("sku", config.sku);
      return fetch(endpoint).then(function (response) { return response.json(); }).then(function (result) {
        if (!result.available) {
          if (result.reason === "subscription_inactive") { button.textContent = "Вы прекрасно выглядите в любой одежде"; button.disabled = true; button.style.display = "block"; }
          return false;
        }
        config = Object.assign(config, result); button.setAttribute("aria-label", config.label + ": " + config.name); button.style.display = "block"; return true;
      }).catch(function () { return false; });
    }
    function open() {
      var url = viewerUrl(config);
      var mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      window.dispatchEvent(new CustomEvent("mirrai:event", { detail: { event: "widget_open", productId: config.productId } }));
      recordEvent("widget_open");
      if (config.mode === "link" || (config.mode === "auto" && mobile)) { window.open(url, "_blank", "noopener,noreferrer"); return; }
      iframe.src = url; overlay.style.display = "flex"; document.body.style.overflow = "hidden"; close.focus();
    }

    button.addEventListener("click", open);
    close.addEventListener("click", closeModal);
    overlay.addEventListener("click", function (event) { if (event.target === overlay) closeModal(); });
    document.addEventListener("keydown", function (event) { if (event.key === "Escape" && overlay.style.display !== "none") closeModal(); });
    window.addEventListener("message", function (event) {
      if (event.origin !== scriptOrigin || !event.data || event.data.source !== "mirrai-widget") return;
      if (allowedEvents.indexOf(event.data.event) === -1) return;
      recordEvent(event.data.event);
      window.dispatchEvent(new CustomEvent("mirrai:event", { detail: event.data }));
    });
    resolveCatalogProduct();
    return { open: open, close: closeModal, button: button, update: function (next) { config = Object.assign(config, next || {}); resolveCatalogProduct(); } };
  }

  function reportInstallation(shopId) {
    if (!shopId) return;
    fetch(new URL("/api/widget/install", scriptOrigin), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ shopId: shopId, pageUrl: window.location.href }), keepalive: true }).catch(function () {});
  }

  function scan() {
    var globalConfig = readData(script);
    var nodes = document.querySelectorAll("[data-mirrai-sku]");
    nodes.forEach(function (node) {
      if (node.getAttribute("data-mirrai-mounted") === "true") return;
      node.setAttribute("data-mirrai-mounted", "true");
      var local = readData(node);
      mount(Object.assign(globalConfig, local, { target: node, shopId: local.shopId || globalConfig.shopId }));
    });
    reportInstallation(globalConfig.shopId);
  }

  window.MirraiWidget = { version: "0.3.0", mount: mount, scan: scan };
  if (script && script.dataset.auto !== "false") {
    var start = function () { if (script.dataset.auto === "scan" || document.querySelector("[data-mirrai-sku]")) scan(); else { mount(); reportInstallation(readData(script).shopId); } };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
    else start();
  }
})();
