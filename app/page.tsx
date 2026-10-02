"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- viewer exit intentionally performs a full navigation */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { arPlatform } from "../lib/ar-platform.mjs";
import {
  dimensionsInMetres,
  dimensionsMatch,
  previewCameraRadius,
} from "../lib/viewer-geometry.mjs";

type View = "landing" | "viewer";
type UploadState = "idle" | "ready" | "error";
type ScaleState = "checking" | "verified" | "error";
/** Catalogue dimensions in centimetres, not glTF metres. */
type Dimensions = { width: number; height: number; depth: number };
type ProductVariant = {
  id: string;
  sku: string;
  name: string;
  colorName: string;
  color: string;
  material: string;
  image?: string;
  model?: string;
  iosModel?: string;
  default?: boolean;
  available: boolean;
};
type Product = {
  id: string;
  name: string;
  category: string;
  material: string;
  price: string;
  color: string;
  model: string;
  iosModel?: string;
  textured: boolean;
  dimensions: Dimensions;
  variants?: ProductVariant[];
  selectedVariantId?: string;
};
type ModelViewerElement = HTMLElement & {
  activateAR?: () => Promise<void>;
  getDimensions?: () => { x: number; y: number; z: number };
  updateFraming?: () => Promise<void>;
  jumpCameraToGoal?: () => void;
  loaded?: boolean;
  canActivateAR?: boolean;
};

const products: Product[] = [
  {
    id: "cloud",
    name: "Кресло Cloud",
    category: "Кресла",
    material: "Букле, светлый беж",
    price: "67 000 ₽",
    color: "#d2bda8",
    model: "/chair.glb",
    textured: true,
    dimensions: { width: 84, height: 76, depth: 82 },
  },
  {
    id: "arc",
    name: "Стул Arc",
    category: "Стулья",
    material: "Дуб и ткань",
    price: "29 000 ₽",
    color: "#92765c",
    model: "/catalog/arc-chair.glb",
    textured: true,
    dimensions: { width: 52, height: 81, depth: 55 },
  },
  {
    id: "halo",
    name: "Торшер Halo",
    category: "Освещение",
    material: "Латунь, матовый металл",
    price: "18 400 ₽",
    color: "#d0be85",
    model: "/catalog/halo-lamp.glb",
    textured: true,
    dimensions: { width: 48, height: 158, depth: 48 },
  },
  {
    id: "plane",
    name: "Стол Plane",
    category: "Столы",
    material: "Натуральный дуб",
    price: "74 000 ₽",
    color: "#aa8763",
    model: "/catalog/plane-table.glb",
    textured: true,
    dimensions: { width: 160, height: 75, depth: 86 },
  },
];

function safeAssetUrl(value: string | null, fallback: string) {
  if (!value) return fallback;
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : fallback;
  } catch {
    return fallback;
  }
}

function positiveNumber(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 && parsed < 5000 ? parsed : fallback;
}

function safeVariants(value: string | null): ProductVariant[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item): ProductVariant[] => {
      if (!item || typeof item !== "object") return [];
      const variant = item as Record<string, unknown>;
      const id = String(variant.id ?? "").slice(0, 80);
      const model = safeAssetUrl(typeof variant.model === "string" ? variant.model : null, "");
      if (!id || !/^#[0-9a-f]{6}$/i.test(String(variant.color ?? ""))) return [];
      return [
        {
          id,
          sku: String(variant.sku ?? "").slice(0, 120),
          name: String(variant.name ?? "").slice(0, 80),
          colorName: String(variant.colorName ?? variant.name ?? "Цвет").slice(0, 80),
          color: String(variant.color),
          material: String(variant.material ?? "").slice(0, 160),
          image: typeof variant.image === "string" ? safeAssetUrl(variant.image, "") : undefined,
          model: model || undefined,
          iosModel:
            typeof variant.iosModel === "string"
              ? safeAssetUrl(variant.iosModel, "") || undefined
              : undefined,
          default: variant.default === true,
          available: variant.available === true && Boolean(model),
        },
      ];
    });
  } catch {
    return [];
  }
}

function dimensionsLabel(value: Dimensions) {
  return `${value.width} × ${value.depth} × ${value.height} см`;
}

export default function Home() {
  const [view, setView] = useState<View>("landing");
  const [active, setActive] = useState(0);
  const [activeVariantId, setActiveVariantId] = useState("");
  const [widgetProduct, setWidgetProduct] = useState<Product | null>(null);
  const [isWidget, setIsWidget] = useState(false);
  const [subscriptionActive, setSubscriptionActive] = useState(true);
  const [targetOrigin, setTargetOrigin] = useState("*");
  const [arStatus, setArStatus] = useState("Подготавливаем точный масштаб…");
  const [customName, setCustomName] = useState("");
  const [customModel, setCustomModel] = useState("");
  const [customDimensions, setCustomDimensions] = useState<Dimensions>({
    width: 80,
    height: 80,
    depth: 80,
  });
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [uploadMessage, setUploadMessage] = useState("");
  const [exposure, setExposure] = useState(1);
  const [scaleState, setScaleState] = useState<ScaleState>("checking");
  const [launcher, setLauncher] = useState(false);
  const [arHelp, setArHelp] = useState(false);
  const [accessReady, setAccessReady] = useState(false);
  const [accessChecked, setAccessChecked] = useState(false);
  const [platform, setPlatform] = useState(() => arPlatform());
  const [viewerLocation, setViewerLocation] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [linkNotice, setLinkNotice] = useState("");
  const accessUntil = useRef(0);
  const arRef = useRef<ModelViewerElement>(null);

  const catalog = useMemo(() => (widgetProduct ? [widgetProduct] : products), [widgetProduct]);
  const selected = catalog[Math.min(active, catalog.length - 1)] ?? products[0];
  const selectedVariants = selected.variants ?? [];
  const selectedVariant =
    selectedVariants.find(variant => variant.id === activeVariantId && variant.available) ??
    selectedVariants.find(
      variant => variant.id === selected.selectedVariantId && variant.available,
    ) ??
    selectedVariants.find(variant => variant.default && variant.available) ??
    selectedVariants.find(variant => variant.available);
  const selectedDimensions = customName ? customDimensions : selected.dimensions;
  const modelSource = customModel || selectedVariant?.model || selected.model;
  const selectedColor = selectedVariant?.color || selected.color;
  const selectedMaterial = selectedVariant?.material || selected.material;

  useEffect(() => {
    import("@google/model-viewer");
    const params = new URLSearchParams(window.location.search);
    queueMicrotask(() => {
      setPlatform(arPlatform(navigator.userAgent, navigator.maxTouchPoints));
      setLauncher(params.get("launcher") === "1");
      setViewerLocation(window.location.href);
    });
    if (params.get("widget") !== "1") {
      const openFromUrl = () => {
        const productId = new URLSearchParams(window.location.search).get("product");
        const index = products.findIndex(item => item.id === productId);
        if (index >= 0) {
          setActive(index);
          setView("viewer");
        } else setView("landing");
      };
      openFromUrl();
      window.addEventListener("popstate", openFromUrl);
      return () => window.removeEventListener("popstate", openFromUrl);
    }
    const base = products[0];
    const variants = safeVariants(params.get("variants"));
    const requestedVariantId = params.get("selectedVariantId")?.slice(0, 80) ?? "";
    const preferredVariant =
      variants.find(variant => variant.id === requestedVariantId && variant.available) ??
      variants.find(variant => variant.default && variant.available) ??
      variants.find(variant => variant.available);
    const product: Product = {
      id: params.get("productId")?.slice(0, 80) || base.id,
      name: params.get("name")?.slice(0, 120) || base.name,
      category: params.get("category")?.slice(0, 80) || base.category,
      material:
        preferredVariant?.material || params.get("material")?.slice(0, 120) || base.material,
      price: params.get("price")?.slice(0, 50) || base.price,
      color:
        preferredVariant?.color ??
        (/^#[0-9a-f]{6}$/i.test(params.get("color") ?? "") ? params.get("color")! : base.color),
      model: preferredVariant?.model ?? safeAssetUrl(params.get("model"), base.model),
      iosModel:
        preferredVariant?.iosModel ?? (safeAssetUrl(params.get("iosModel"), "") || undefined),
      textured: params.get("textured") === "1",
      dimensions: {
        width: positiveNumber(params.get("width"), base.dimensions.width),
        height: positiveNumber(params.get("height"), base.dimensions.height),
        depth: positiveNumber(params.get("depth"), base.dimensions.depth),
      },
      variants,
      selectedVariantId: preferredVariant?.id,
    };
    const requestedOrigin = params.get("parentOrigin");
    let verifiedOrigin = "*";
    if (requestedOrigin)
      try {
        const origin = new URL(requestedOrigin).origin;
        if (origin.startsWith("https://")) verifiedOrigin = origin;
      } catch {
        /* demo event contains no private data */
      }
    queueMicrotask(() => {
      setTargetOrigin(verifiedOrigin);
      setWidgetProduct(product);
      setActiveVariantId(preferredVariant?.id ?? "");
      setIsWidget(true);
      setSubscriptionActive(params.get("subscription") !== "inactive");
      setView("viewer");
    });
  }, []);

  const phoneLink = useMemo(() => {
    if (view !== "viewer" || !viewerLocation) return "";
    const shareUrl = new URL(viewerLocation);
    for (const key of ["launcher", "parentOrigin", "variants", "selectedVariantId"])
      shareUrl.searchParams.delete(key);
    if (isWidget) {
      shareUrl.searchParams.set("model", modelSource);
      shareUrl.searchParams.set("material", selectedMaterial);
      shareUrl.searchParams.set("color", selectedColor);
    } else shareUrl.searchParams.set("product", selected.id);
    return shareUrl.href;
  }, [view, viewerLocation, isWidget, modelSource, selectedMaterial, selectedColor, selected.id]);

  useEffect(() => {
    if (!phoneLink || platform.mobile) return;
    let cancelled = false;
    import("qrcode")
      .then(module => module.toDataURL(phoneLink, { width: 220, margin: 2 }))
      .then(value => {
        if (!cancelled) setQrCode(value);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [phoneLink, platform.mobile]);

  useEffect(() => {
    if (!launcher) return;
    // URL parameters describe the product, but are not entitlement proof.
    // Fail closed and periodically revalidate against the published SKU/model.
    const params = new URLSearchParams(window.location.search);
    const shop = params.get("shop"),
      sku = params.get("sku");
    let cancelled = false;
    const check = async () => {
      try {
        if (!shop || !sku) throw new Error("missing_shop");
        const response = await fetch(`/api/widget/config?${new URLSearchParams({ shop, sku })}`, {
          cache: "no-store",
        });
        const result = await response.json();
        if (cancelled) return;
        const sameModel =
          result.available === true &&
          new URL(result.model, location.origin).href ===
            new URL(modelSource, location.origin).href;
        accessUntil.current = sameModel && response.ok ? Date.now() + 35000 : 0;
        setAccessReady(accessUntil.current > 0);
        setAccessChecked(true);
      } catch {
        if (!cancelled) {
          accessUntil.current = 0;
          setAccessReady(false);
          setAccessChecked(true);
        }
      }
    };
    void check();
    const timer = setInterval(check, 30000);
    window.addEventListener("focus", check);
    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener("focus", check);
    };
  }, [launcher, modelSource]);

  useEffect(() => {
    if (!launcher || view !== "viewer") return;
    const root = document.querySelector(".ar-launcher");
    if (!root) return;
    const observer = new ResizeObserver(() =>
      window.parent.postMessage(
        {
          source: "mirrai-widget",
          event: "launcher_resize",
          height: Math.ceil(root.getBoundingClientRect().height) + 8,
        },
        targetOrigin,
      ),
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, [launcher, view, targetOrigin]);

  function emitWidgetEvent(event: string) {
    if (!isWidget || window.parent === window) return;
    window.parent.postMessage(
      {
        source: "mirrai-widget",
        event,
        productId: selected.id,
        variantId: selectedVariant?.id ?? null,
        variantSku: selectedVariant?.sku ?? null,
        at: new Date().toISOString(),
      },
      targetOrigin,
    );
  }

  function resetCustomAsset() {
    if (customModel.startsWith("blob:")) URL.revokeObjectURL(customModel);
    setCustomName("");
    setCustomModel("");
    setUploadState("idle");
    setUploadMessage("");
  }

  function openViewer(index = 0) {
    resetCustomAsset();
    setActive(index);
    setView("viewer");
    window.history.pushState(
      { mirraiViewer: true },
      "",
      `/?product=${encodeURIComponent(products[index]?.id ?? products[0].id)}`,
    );
  }

  function closeViewer() {
    resetCustomAsset();
    setView("landing");
    if (window.history.state?.mirraiViewer) window.history.back();
    else window.history.replaceState(null, "", "/");
  }

  function selectProduct(index: number) {
    resetCustomAsset();
    setActive(index);
    setActiveVariantId(products[index]?.selectedVariantId ?? "");
    setArStatus("Загружаем выбранную модель…");
    window.history.replaceState(
      { mirraiViewer: true },
      "",
      `/?product=${encodeURIComponent(products[index]?.id ?? products[0].id)}`,
    );
  }

  function selectVariant(variant: ProductVariant) {
    if (!variant.available || !variant.model) return;
    resetCustomAsset();
    setActiveVariantId(variant.id);
    setArStatus(`Загружаем цвет «${variant.colorName}»…`);
  }

  useEffect(() => {
    if (view !== "viewer" || !arRef.current) return;
    const viewer = arRef.current;
    let cancelled = false;
    let verifying = false;
    setScaleState("checking");
    setArStatus("Проверяем размеры модели перед запуском AR…");
    const fitPreviewCamera = () => {
      const viewportAspect = viewer.clientWidth / Math.max(viewer.clientHeight, 1);
      const radius = previewCameraRadius(selectedDimensions, viewportAspect);
      viewer.setAttribute("camera-orbit", `35deg 68deg ${radius}%`);
      viewer.jumpCameraToGoal?.();
    };
    const onLoad = async () => {
      if (verifying) return;
      verifying = true;
      viewer.setAttribute("scale", "1 1 1");
      await new Promise<void>(resolve =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      // A product change can dispose this effect while a frame is pending.
      if (cancelled) return;
      const source = viewer.getDimensions?.();
      const target = dimensionsInMetres(selectedDimensions);
      if (
        !source ||
        ![source.x, source.y, source.z, target.x, target.y, target.z].every(
          value => Number.isFinite(value) && value > 0,
        )
      ) {
        if (!cancelled) {
          setScaleState("error");
          setArStatus("Не удалось проверить физические размеры модели. AR заблокирован.");
        }
        return;
      }
      const clamp = (value: number) => Math.max(0.01, Math.min(100, value));
      const scale = [
        clamp(target.x / source.x),
        clamp(target.y / source.y),
        clamp(target.z / source.z),
      ];
      // Scene Viewer re-fetches the source GLB and ignores runtime scale.
      const bakedSize = dimensionsMatch(source, target);
      viewer.setAttribute(
        "ar-modes",
        bakedSize ? "webxr scene-viewer quick-look" : "webxr quick-look",
      );
      viewer.setAttribute("scale", scale.map(value => value.toFixed(7)).join(" "));
      await viewer.updateFraming?.();
      if (cancelled) return;
      fitPreviewCamera();
      await new Promise<void>(resolve =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      const measured = viewer.getDimensions?.();
      const withinTolerance = dimensionsMatch(measured, target);
      if (cancelled) return;
      if (!withinTolerance) {
        setScaleState("error");
        setArStatus("Размер модели не прошёл проверку 1:1. AR заблокирован.");
        return;
      }
      setScaleState("verified");
      setArStatus(
        `${customName || selected.name} · ${selectedVariant?.colorName ?? "основной цвет"} — проверено 1:1: ${selectedDimensions.width} × ${selectedDimensions.depth} × ${selectedDimensions.height} см`,
      );
      if (isWidget && window.parent !== window)
        window.parent.postMessage(
          {
            source: "mirrai-widget",
            event: "model_ready",
            productId: selected.id,
            variantId: selectedVariant?.id ?? null,
            variantSku: selectedVariant?.sku ?? null,
            dimensionsCm: selectedDimensions,
            scaleVerified: true,
            at: new Date().toISOString(),
          },
          targetOrigin,
        );
    };
    const onError = () => {
      setScaleState("error");
      setArStatus("Модель не загрузилась. Проверьте GLB товара.");
    };
    const onArStatus = (event: Event) => {
      const status = (event as CustomEvent<{ status: string }>).detail?.status;
      if (status === "object-placed") {
        setArStatus("Предмет размещён в вашем пространстве");
        if (isWidget && window.parent !== window)
          window.parent.postMessage(
            {
              source: "mirrai-widget",
              event: "object_placed",
              productId: selected.id,
              at: new Date().toISOString(),
            },
            targetOrigin,
          );
      } else if (status === "failed") {
        setArHelp(true);
        setArStatus("Не удалось открыть камеру в этом браузере.");
      } else setArStatus("Медленно направляйте камеру на свободный участок пола…");
    };
    viewer.addEventListener("load", onLoad);
    viewer.addEventListener("error", onError);
    viewer.addEventListener("ar-status", onArStatus);
    const resizeObserver = new ResizeObserver(() => {
      if (viewer.loaded) fitPreviewCamera();
    });
    resizeObserver.observe(viewer);
    if (viewer.loaded) void onLoad();
    return () => {
      cancelled = true;
      resizeObserver.disconnect();
      viewer.removeEventListener("load", onLoad);
      viewer.removeEventListener("error", onError);
      viewer.removeEventListener("ar-status", onArStatus);
    };
  }, [
    view,
    modelSource,
    selected.id,
    selected.name,
    selectedVariant?.id,
    selectedVariant?.colorName,
    selectedVariant?.sku,
    selectedDimensions,
    customName,
    isWidget,
    targetOrigin,
  ]);

  async function openAR() {
    if (launcher && (!accessReady || Date.now() > accessUntil.current)) {
      setAccessReady(false);
      setArStatus("Проверяем доступность товара. Попробуйте через несколько секунд.");
      return;
    }
    if (scaleState !== "verified") {
      setArStatus(
        scaleState === "error"
          ? "AR заблокирован: модель не прошла проверку размеров."
          : "Дождитесь проверки масштаба 1:1.",
      );
      return;
    }
    if (!arRef.current?.canActivateAR) {
      setArHelp(true);
      return;
    }
    emitWidgetEvent("ar_open");
    setArStatus("Запускаем камеру и поиск поверхности…");
    try {
      await arRef.current?.activateAR?.();
    } catch {
      setArHelp(true);
      setArStatus("Камера не открылась. 3D-просмотр остаётся доступен.");
    }
  }

  async function copyPhoneLink() {
    try {
      await navigator.clipboard.writeText(phoneLink);
      setLinkNotice(`Ссылка скопирована. Вставьте её в ${platform.browser}.`);
    } catch {
      setLinkNotice("Нажмите и удерживайте ссылку, чтобы скопировать её.");
    }
  }

  async function handleAsset(file?: File) {
    if (!file) return;
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    const isModel = extension === "glb" || file.type === "model/gltf-binary";
    resetCustomAsset();
    setCustomName(file.name);
    if (isModel) {
      setCustomModel(URL.createObjectURL(file));
      setUploadState("ready");
      setUploadMessage("GLB распознан. Размер применяется из полей выше.");
      setArStatus("Модель готова — проверьте масштаб и откройте AR");
      return;
    }
    setUploadState("error");
    setUploadMessage(
      "На публичной странице принимается только GLB. Фотографии загружаются в защищённом кабинете магазина.",
    );
  }

  if (isWidget && !subscriptionActive)
    return (
      <main className="widget-fallback">
        <div>
          <span>MIRRAI</span>
          <p>
            Вы прекрасно выглядите в любой одежде.
            <br />А ваша мебель — в любом интерьере.
          </p>
        </div>
      </main>
    );

  if (view === "viewer" && launcher)
    return (
      <main className="ar-launcher">
        {React.createElement(
          "model-viewer",
          {
            key: modelSource,
            ref: arRef,
            src: modelSource,
            alt: selected.name,
            ar: true,
            loading: "eager",
            reveal: "auto",
            "ar-modes": "webxr scene-viewer quick-look",
            "ar-scale": "fixed",
            "ar-placement": "floor",
            "ar-usdz-max-texture-size": "2048",
            className: "ar-preload-model",
            "aria-hidden": "true",
          },
          React.createElement("span", { slot: "ar-button" }),
        )}
        <button
          className="ar-launch-button"
          onClick={openAR}
          disabled={scaleState !== "verified" || !accessReady}
        >
          {scaleState === "error"
            ? "Не удалось загрузить модель"
            : accessChecked && !accessReady
              ? "Примерка временно недоступна"
              : scaleState !== "verified"
                ? "Готовим просмотр…"
                : !accessReady
                  ? "Проверяем доступность…"
                  : "Посмотреть у себя"}
          <span aria-hidden="true">↗</span>
        </button>
        <p className="ar-launch-note" role="status">
          {arHelp ? "Этот браузер не открыл камеру." : "Наведите камеру на пол · размер 1:1"}
        </p>
        {arHelp && (
          <div className="ar-browser-help">
            <p>
              В меню приложения выберите «Открыть в {platform.browser}». Если такого пункта нет,
              скопируйте ссылку.
            </p>
            <button onClick={copyPhoneLink}>Скопировать ссылку</button>
            {linkNotice && <p role="status">{linkNotice}</p>}
          </div>
        )}
        <a href={phoneLink} target="_top">
          {scaleState === "error" ? "Открыть просмотр и повторить" : "Посмотреть в 3D"}
        </a>
      </main>
    );

  if (view === "viewer")
    return (
      <main className={isWidget ? "widget-shell" : ""}>
        {!isWidget && (
          <nav className="nav shell">
            <a className="brand" href="/">
              MIRR<span>AI</span>
            </a>
            <div className="nav-links">
              <a href="/#catalog">Каталог</a>
              <a href="/#business">Для магазинов</a>
            </div>
            <button className="nav-cta" onClick={closeViewer}>
              На главную <span>↗</span>
            </button>
          </nav>
        )}
        <section className={`viewer ${isWidget ? "viewer-widget" : "shell"}`}>
          <header className="viewer-head">
            <div>
              {!isWidget && (
                <button className="back" onClick={closeViewer}>
                  ← Назад
                </button>
              )}
              <p>AR-просмотр · реальный масштаб</p>
              <h1>{selected.name}</h1>
            </div>
            <div className={`ready-pill ${scaleState}`}>
              <i />{" "}
              {scaleState === "verified"
                ? "МАСШТАБ 1:1 ПРОВЕРЕН"
                : scaleState === "error"
                  ? "AR НЕДОСТУПЕН"
                  : "ПРОВЕРЯЕМ МАСШТАБ"}
            </div>
          </header>
          <div className="viewer-grid">
            {!isWidget && (
              <aside className="catalog-panel">
                <div className="panel-title">
                  <span>Каталог</span>
                  <small>{catalog.length} модели</small>
                </div>
                {catalog.map((item, index) => (
                  <button
                    key={item.id}
                    className={`product ${active === index && !customName ? "active" : ""}`}
                    onClick={() => selectProduct(index)}
                  >
                    <i style={{ background: item.color }}>
                      <b>▰</b>
                    </i>
                    <span>
                      <small>{item.category}</small>
                      <strong>{item.name}</strong>
                      <em>{item.price}</em>
                    </span>
                    <b className="select-mark">{active === index && !customName ? "✓" : "+"}</b>
                  </button>
                ))}
              </aside>
            )}
            <div className="ar-stage">
              {React.createElement(
                "model-viewer",
                {
                  key: modelSource,
                  ref: arRef,
                  src: modelSource,
                  alt: `3D-модель ${customName || selected.name}${selectedVariant ? `, цвет ${selectedVariant.colorName}` : ""}`,
                  ar: true,
                  "ar-modes": "webxr scene-viewer quick-look",
                  "ar-placement": "floor",
                  "ar-scale": "fixed",
                  "ar-usdz-max-texture-size": "2048",
                  "camera-controls": true,
                  "touch-action": "pan-y",
                  "shadow-intensity": ".92",
                  "shadow-softness": ".88",
                  exposure,
                  "environment-image": "neutral",
                  "tone-mapping": "neutral",
                  "xr-environment": true,
                  "camera-orbit": "35deg 68deg 120%",
                  "field-of-view": "45deg",
                },
                React.createElement(
                  "button",
                  {
                    slot: "ar-button",
                    className: "native-ar-button",
                    disabled: scaleState !== "verified",
                    "aria-disabled": scaleState !== "verified",
                  },
                  scaleState === "verified" ? "Посмотреть у себя" : "Проверяем 1:1",
                  React.createElement("span", null, "↗"),
                ),
              )}
              <div className="room-preview">
                <i className="preview-window" />
                <i className="preview-floor" />
                <span>Вращайте одним пальцем · масштабируйте двумя</span>
              </div>
              <div className="viewer-badges">
                <span>
                  {customModel
                    ? "MODEL MATERIALS"
                    : selected.textured
                      ? "PBR MATERIALS"
                      : "GEOMETRY PREVIEW"}
                </span>
                <span>{scaleState === "verified" ? "AR SCALE 1:1 ✓" : "AR SCALE CHECK"}</span>
                <span>ADAPTIVE LIGHT</span>
              </div>
            </div>
            <aside className="details-panel">
              <div>
                <p className="control-label">Товар</p>
                <h2>{customName || selected.name}</h2>
                <p className="price">{customName ? "Пользовательская модель" : selected.price}</p>
                <div className="material-row">
                  <i style={{ background: selectedColor }} />
                  <span>{selectedMaterial}</span>
                </div>
              </div>
              {!customName && selectedVariants.length > 0 && (
                <div className="variant-selector">
                  <p className="control-label">Цвет на сайте магазина</p>
                  <div className="variant-swatches" role="list" aria-label="Доступные цвета товара">
                    {selectedVariants.map(variant => (
                      <button
                        key={variant.id}
                        type="button"
                        title={
                          variant.available
                            ? variant.colorName
                            : `${variant.colorName} — 3D готовится`
                        }
                        aria-label={
                          variant.available
                            ? `Выбрать цвет ${variant.colorName}`
                            : `${variant.colorName}: 3D-модель ещё не готова`
                        }
                        aria-pressed={selectedVariant?.id === variant.id}
                        disabled={!variant.available}
                        className={selectedVariant?.id === variant.id ? "active" : ""}
                        onClick={() => selectVariant(variant)}
                      >
                        <i style={{ background: variant.color }} />
                        <span>{variant.colorName}</span>
                        {!variant.available && <small>3D готовится</small>}
                      </button>
                    ))}
                  </div>
                  <p className="variant-note">
                    В AR открывается отдельная модель выбранного магазином варианта, а не
                    приблизительная перекраска.
                  </p>
                </div>
              )}
              <div>
                <p className="control-label">Габариты · Ш × Г × В</p>
                <strong className="dimensions">{dimensionsLabel(selectedDimensions)}</strong>
                <p className="hint">
                  Модель зафиксирована в указанном масштабе. Покупатель не может случайно изменить
                  размер в AR.
                </p>
              </div>
              <div>
                <p className="control-label">Освещение превью</p>
                <div className="range-row">
                  <input
                    aria-label="Экспозиция 3D-превью"
                    type="range"
                    min="0.65"
                    max="1.35"
                    step="0.05"
                    value={exposure}
                    onChange={event => setExposure(Number(event.target.value))}
                  />
                  <span>{Math.round(exposure * 100)}%</span>
                </div>
                <p className="hint">
                  В системном AR свет и цвет адаптируются камерой устройства автоматически.
                </p>
              </div>
              {!isWidget && (
                <div className="asset-upload">
                  <p className="control-label">Локальная проверка готовой модели</p>
                  <div className="dimension-inputs">
                    {(["width", "depth", "height"] as const).map((key, index) => (
                      <label key={key}>
                        <span>{["Ш", "Г", "В"][index]}, см</span>
                        <input
                          type="number"
                          min="1"
                          max="5000"
                          value={customDimensions[key]}
                          onChange={event =>
                            setCustomDimensions(current => ({
                              ...current,
                              [key]: positiveNumber(event.target.value, current[key]),
                            }))
                          }
                        />
                      </label>
                    ))}
                  </div>
                  <label className="upload-button">
                    <input
                      type="file"
                      accept=".glb,model/gltf-binary"
                      onChange={event => handleAsset(event.target.files?.[0])}
                    />
                    <span>＋</span>
                    <b>Выбрать готовый GLB</b>
                  </label>
                  {uploadState !== "idle" && (
                    <div className={`asset-result ${uploadState}`}>
                      <span>{uploadState === "ready" ? "✓" : "!"}</span>
                      <div>
                        <strong>{customName}</strong>
                        <small>{uploadMessage}</small>
                      </div>
                    </div>
                  )}
                  <p className="hint">
                    Фотографии товаров загружаются в кабинете магазина, где MIRRAI безопасно
                    отправляет их в очередь генерации.
                  </p>
                </div>
              )}
              <div className="ar-state" role="status">
                <i />
                <p>{arStatus}</p>
              </div>
              {platform.mobile ? (
                <button className="primary" onClick={openAR} disabled={scaleState !== "verified"}>
                  {scaleState === "verified"
                    ? "Посмотреть у себя"
                    : scaleState === "error"
                      ? "Модель временно недоступна"
                      : "Готовим просмотр…"}
                  <span>↗</span>
                </button>
              ) : (
                <div className="ar-phone-handoff">
                  <strong>Посмотрите у себя с телефона</strong>
                  <p>Наведите камеру телефона на QR-код и откройте ссылку.</p>
                  {qrCode && (
                    // Locally generated data URL: no network image or optimisation endpoint.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={qrCode}
                      width="220"
                      height="220"
                      alt="QR-код для открытия этого товара на телефоне"
                    />
                  )}
                  <button onClick={copyPhoneLink}>Скопировать ссылку</button>
                  {linkNotice && <p role="status">{linkNotice}</p>}
                </div>
              )}
              {arHelp && (
                <div className="ar-browser-help">
                  <strong>Откройте в {platform.browser}</strong>
                  <p>
                    В меню приложения выберите «Открыть в браузере» или скопируйте ссылку. Если
                    телефон не поддерживает AR, вы можете продолжить вращать модель здесь.
                  </p>
                  <button onClick={copyPhoneLink}>Скопировать ссылку</button>
                  <a href={phoneLink} target="_blank" rel="noopener noreferrer">
                    Открыть отдельно
                  </a>
                  {linkNotice && <p role="status">{linkNotice}</p>}
                </div>
              )}
              <p className="privacy">
                Разрешите доступ к камере и медленно наведите её на свободный участок пола. MIRRAI
                не сохраняет изображение комнаты.
              </p>
            </aside>
          </div>
        </section>
      </main>
    );

  return (
    <main>
      <nav className="nav shell">
        <a className="brand" href="#top">
          MIRR<span>AI</span>
        </a>
        <div className="nav-links">
          <a href="#how">Как работает</a>
          <a href="#catalog">Каталог</a>
          <a href="#business">Для магазинов</a>
          <a href="/admin">Кабинет</a>
        </div>
        <a className="nav-cta" href="/onboarding">
          Подключить магазин <span>↗</span>
        </a>
      </nav>
      <section className="hero shell" id="top">
        <div className="hero-copy">
          <p className="eyebrow">
            <i /> AR ДЛЯ МЕБЕЛЬНЫХ МАГАЗИНОВ
          </p>
          <h1>
            Мебель —<br />
            <em>уже у вас.</em>
          </h1>
          <p className="lead">
            Покупатель открывает товар в реальном масштабе прямо из карточки магазина — с адаптацией
            света, оттенков и контактных теней.
          </p>
          <button className="hero-cta" onClick={() => openViewer(0)}>
            Посмотреть кресло у себя <span>↗</span>
          </button>
          <div className="hero-proof">
            <span>
              <b>1:1</b> точный масштаб
            </span>
            <span>
              <b>0</b> приложений
            </span>
            <span>
              <b>iOS + Android</b>
            </span>
          </div>
        </div>
        <button
          className="hero-visual"
          onClick={() => openViewer(0)}
          aria-label="Открыть интерактивное AR-превью кресла"
        >
          <div className="hero-room">
            <i className="hero-window" />
            <i className="hero-rug" />
            <i className="hero-chair">
              <b />
            </i>
            <span className="measure measure-x">84 см</span>
            <span className="measure measure-y">76 см</span>
            <span className="placement-ring" />
          </div>
          <div className="visual-caption">
            <span>Кресло Cloud · Букле</span>
            <b>Открыть AR ↗</b>
          </div>
        </button>
      </section>
      <section className="how shell" id="how">
        <p className="section-label">Из карточки товара — в комнату</p>
        <h2>
          Не представляйте.
          <br />
          <em>Поставьте и посмотрите.</em>
        </h2>
        <div className="steps">
          <article>
            <span>01</span>
            <h3>Нажать в магазине</h3>
            <p>Кнопка MIRRAI находится рядом с добавлением товара в корзину.</p>
          </article>
          <article>
            <span>02</span>
            <h3>Навести на пол</h3>
            <p>Телефон определяет поверхность и реальный масштаб помещения.</p>
          </article>
          <article>
            <span>03</span>
            <h3>Принять решение</h3>
            <p>Материалы, свет и тени помогают оценить товар до покупки.</p>
          </article>
        </div>
      </section>
      <section className="catalog-showcase shell" id="catalog">
        <div className="section-heading">
          <div>
            <p className="section-label">Демонстрационный каталог</p>
            <h2>
              Четыре товара.
              <br />
              <em>Один клик до комнаты.</em>
            </h2>
          </div>
          <p>
            Каждая карточка хранит модель, материалы и реальные габариты. В магазине эти данные
            автоматически приходят из товарного каталога.
          </p>
        </div>
        <div className="showcase-grid">
          {products.map((item, index) => (
            <button key={item.id} onClick={() => openViewer(index)}>
              <span className="showcase-object" style={{ background: item.color }}>
                <i>{index === 2 ? "◯" : index === 3 ? "▰" : "●"}</i>
              </span>
              <small>{item.category}</small>
              <strong>{item.name}</strong>
              <em>{dimensionsLabel(item.dimensions)}</em>
              <b>{item.price}</b>
            </button>
          ))}
        </div>
      </section>
      <section className="business shell" id="business">
        <div>
          <p className="section-label">MIRRAI COMMERCE</p>
          <h2>
            Сотни товаров.
            <br />
            <em>Без сотен ручных интеграций.</em>
          </h2>
          <a className="business-demo" href="/demo-store">
            Посмотреть виджет в магазине <span>↗</span>
          </a>
          <a className="business-start" href="/onboarding">
            Подключить свой магазин →
          </a>
        </div>
        <div className="pipeline">
          <article>
            <b>01</b>
            <span>
              <strong>Импорт каталога</strong>
              <small>SKU, размеры, варианты и готовые 3D-файлы</small>
            </span>
          </article>
          <article>
            <b>02</b>
            <span>
              <strong>Подготовка моделей</strong>
              <small>GLB + USDZ, PBR-материалы и автоматический контроль</small>
            </span>
          </article>
          <article>
            <b>03</b>
            <span>
              <strong>Виджет и аналитика</strong>
              <small>Запуски AR, размещения и путь до корзины</small>
            </span>
          </article>
        </div>
      </section>
      <footer className="shell">
        <span>MIRRAI © 2026</span>
        <a href="/admin">Кабинет магазина</a>
        <span>Мебель — в вашем пространстве.</span>
      </footer>
    </main>
  );
}
