"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- viewer exit intentionally performs a full navigation */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { arPlatform } from "../lib/ar-platform.mjs";
import {
  dimensionsInMetres,
  dimensionsMatch,
  previewCameraRadius,
} from "../lib/viewer-geometry.mjs";
import { useI18n } from "./language-provider";
import { localizeCatalogItem } from "../lib/catalog-localization.mjs";
import { MarketingHome } from "./marketing-home";

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
  image?: string;
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
    id: "alba",
    name: "Кресло Alba",
    category: "Кресла",
    material: "Ткань VIC, матовый металл",
    price: "6 600 Lei",
    color: "#55565a",
    model: "/catalog/alba-chair-trellis2-q8-pbr.glb",
    image: "/catalog-sources/hugge-md/89990-1.jpg",
    textured: true,
    dimensions: { width: 62, height: 90, depth: 86 },
  },
  {
    id: "ria-sofa",
    name: "Диван Ria Actona, 150 x 84 x 78 см",
    category: "Диваны",
    material: "Тканевая обивка",
    price: "15 500 Lei",
    color: "#77736e",
    model: "/catalog/hugge-109553-trellis2-q8-pbr.glb",
    image: "/catalog-sources/hugge-md/109553-1.jpg",
    textured: true,
    dimensions: { width: 150, height: 78, depth: 84 },
  },
  {
    id: "blackburn-table",
    name: "Стол Blackburn Actona, 240 x 97 x 75 см",
    category: "Столы",
    material: "Керамика, стекло и сталь",
    price: "25 260 Lei",
    color: "#343532",
    model: "/catalog/hugge-100326-trellis2-q8-pbr.glb",
    image: "/catalog-sources/hugge-md/100326-1.jpg",
    textured: true,
    dimensions: { width: 240, height: 75, depth: 97 },
  },
  {
    id: "neptun-desk",
    name: "Стол письменный Actona Neptun, дерево",
    category: "Столы",
    material: "Дерево",
    price: "4 900 Lei",
    color: "#a88b69",
    model: "/catalog/hugge-85345-trellis2-q8-pbr.glb",
    image: "/catalog-sources/hugge-md/85345-1.jpg",
    textured: true,
    dimensions: { width: 110, height: 77, depth: 50 },
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
  return Number.isFinite(parsed) && parsed > 0 && parsed < 5000
    ? parsed
    : fallback;
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
      const model = safeAssetUrl(
        typeof variant.model === "string" ? variant.model : null,
        "",
      );
      if (!id || !/^#[0-9a-f]{6}$/i.test(String(variant.color ?? "")))
        return [];
      return [
        {
          id,
          sku: String(variant.sku ?? "").slice(0, 120),
          name: String(variant.name ?? "").slice(0, 80),
          colorName: String(variant.colorName ?? variant.name ?? "Цвет").slice(
            0,
            80,
          ),
          color: String(variant.color),
          material: String(variant.material ?? "").slice(0, 160),
          image:
            typeof variant.image === "string"
              ? safeAssetUrl(variant.image, "")
              : undefined,
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

function dimensionsLabel(value: Dimensions, locale = "ru") {
  return `${value.width} × ${value.depth} × ${value.height} ${locale === "ru" ? "см" : "cm"}`;
}

export default function Home({
  configUrl,
}: {
  configUrl?: (shop: string, sku: string) => string;
} = {}) {
  const { t, locale } = useI18n();

  const [view, setView] = useState<View>("landing");
  const [active, setActive] = useState(0);
  const [activeVariantId, setActiveVariantId] = useState("");
  const [widgetProduct, setWidgetProduct] = useState<Product | null>(null);
  const [isWidget, setIsWidget] = useState(false);
  const [subscriptionActive, setSubscriptionActive] = useState(true);
  const [targetOrigin, setTargetOrigin] = useState("*");
  const [arStatus, setArStatus] = useState(t("Подготавливаем точный масштаб…"));
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

  const catalog = useMemo(
    () => (widgetProduct ? [widgetProduct] : products).map(item => localizeCatalogItem(item, locale)) as Product[],
    [widgetProduct, locale],
  );
  const selected = catalog[Math.min(active, catalog.length - 1)] ?? products[0];
  const selectedVariants = selected.variants ?? [];
  const selectedVariant =
    selectedVariants.find(
      (variant) => variant.id === activeVariantId && variant.available,
    ) ??
    selectedVariants.find(
      (variant) =>
        variant.id === selected.selectedVariantId && variant.available,
    ) ??
    selectedVariants.find((variant) => variant.default && variant.available) ??
    selectedVariants.find((variant) => variant.available);
  const selectedDimensions = customName
    ? customDimensions
    : selected.dimensions;
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
        const productId = new URLSearchParams(window.location.search).get(
          "product",
        );
        const index = products.findIndex((item) => item.id === productId);
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
    const requestedVariantId =
      params.get("selectedVariantId")?.slice(0, 80) ?? "";
    const preferredVariant =
      variants.find(
        (variant) => variant.id === requestedVariantId && variant.available,
      ) ??
      variants.find((variant) => variant.default && variant.available) ??
      variants.find((variant) => variant.available);
    const product: Product = {
      id: params.get("productId")?.slice(0, 80) || base.id,
      name: params.get("name")?.slice(0, 120) || base.name,
      category: params.get("category")?.slice(0, 80) || base.category,
      material:
        preferredVariant?.material ||
        params.get("material")?.slice(0, 120) ||
        base.material,
      price: params.get("price")?.slice(0, 50) || base.price,
      color:
        preferredVariant?.color ??
        (/^#[0-9a-f]{6}$/i.test(params.get("color") ?? "")
          ? params.get("color")!
          : base.color),
      model:
        preferredVariant?.model ??
        safeAssetUrl(params.get("model"), base.model),
      iosModel:
        preferredVariant?.iosModel ??
        (safeAssetUrl(params.get("iosModel"), "") || undefined),
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
    shareUrl.searchParams.set("lang", locale);
    for (const key of [
      "launcher",
      "parentOrigin",
      "variants",
      "selectedVariantId",
    ])
      shareUrl.searchParams.delete(key);
    if (isWidget) {
      shareUrl.searchParams.set("model", modelSource);
      shareUrl.searchParams.set("material", selectedMaterial);
      shareUrl.searchParams.set("color", selectedColor);
    } else shareUrl.searchParams.set("product", selected.id);
    return shareUrl.href;
  }, [
    view,
    viewerLocation,
    isWidget,
    modelSource,
    selectedMaterial,
    selectedColor,
    selected.id,
    locale,
  ]);

  useEffect(() => {
    if (!phoneLink || platform.mobile) return;
    let cancelled = false;
    import("qrcode")
      .then((module) => module.toDataURL(phoneLink, { width: 220, margin: 2 }))
      .then((value) => {
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
        const response = await fetch(
          configUrl?.(shop, sku) ?? `/api/widget/config?${new URLSearchParams({ shop, sku })}`,
          {
            cache: "no-store",
          },
        );
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
  }, [launcher, modelSource, configUrl]);

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
    setArStatus(t("Загружаем выбранную модель…"));
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
    setArStatus(t("Загружаем цвет «{color}»…", { color: variant.colorName }));
  }

  useEffect(() => {
    if (view !== "viewer" || !arRef.current) return;
    const viewer = arRef.current;
    let cancelled = false;
    let verifying = false;
    setScaleState("checking");
    setArStatus(t("Проверяем размеры модели перед запуском AR…"));
    const fitPreviewCamera = () => {
      const viewportAspect =
        viewer.clientWidth / Math.max(viewer.clientHeight, 1);
      const radius = previewCameraRadius(selectedDimensions, viewportAspect);
      viewer.setAttribute("camera-orbit", `35deg 68deg ${radius}%`);
      viewer.jumpCameraToGoal?.();
    };
    const onLoad = async () => {
      if (verifying) return;
      verifying = true;
      viewer.setAttribute("scale", "1 1 1");
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      // A product change can dispose this effect while a frame is pending.
      if (cancelled) return;
      const source = viewer.getDimensions?.();
      const target = dimensionsInMetres(selectedDimensions);
      if (
        !source ||
        ![source.x, source.y, source.z, target.x, target.y, target.z].every(
          (value) => Number.isFinite(value) && value > 0,
        )
      ) {
        if (!cancelled) {
          setScaleState("error");
          setArStatus(
            t(
              "Не удалось проверить физические размеры модели. AR заблокирован.",
            ),
          );
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
      viewer.setAttribute(
        "scale",
        scale.map((value) => value.toFixed(7)).join(" "),
      );
      await viewer.updateFraming?.();
      if (cancelled) return;
      fitPreviewCamera();
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      const measured = viewer.getDimensions?.();
      const withinTolerance = dimensionsMatch(measured, target);
      if (cancelled) return;
      if (!withinTolerance) {
        setScaleState("error");
        setArStatus(
          t("Размер модели не прошёл проверку 1:1. AR заблокирован."),
        );
        return;
      }
      setScaleState("verified");
      setArStatus(
        t("{name} · {color} — проверено 1:1: {dimensions}", {
          name: customName || selected.name,
          color: selectedVariant?.colorName ?? t("основной цвет"),
          dimensions: dimensionsLabel(selectedDimensions, locale),
        }),
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
      setArStatus(t("Модель не загрузилась. Проверьте GLB товара."));
    };
    const onArStatus = (event: Event) => {
      const status = (event as CustomEvent<{ status: string }>).detail?.status;
      if (status === "object-placed") {
        setArStatus(t("Предмет размещён в вашем пространстве"));
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
        setArStatus(t("Не удалось открыть камеру в этом браузере."));
      } else
        setArStatus(
          t("Медленно направляйте камеру на свободный участок пола…"),
        );
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
    locale,
    t,
  ]);

  async function openAR() {
    if (launcher && (!accessReady || Date.now() > accessUntil.current)) {
      setAccessReady(false);
      setArStatus(
        t("Проверяем доступность товара. Попробуйте через несколько секунд."),
      );
      return;
    }
    if (scaleState !== "verified") {
      setArStatus(
        scaleState === "error"
          ? t("AR заблокирован: модель не прошла проверку размеров.")
          : t("Дождитесь проверки масштаба 1:1."),
      );
      return;
    }
    if (!arRef.current?.canActivateAR) {
      setArHelp(true);
      return;
    }
    emitWidgetEvent("ar_open");
    setArStatus(t("Запускаем камеру и поиск поверхности…"));
    try {
      await arRef.current?.activateAR?.();
    } catch {
      setArHelp(true);
      setArStatus(t("Камера не открылась. 3D-просмотр остаётся доступен."));
    }
  }

  async function copyPhoneLink() {
    try {
      await navigator.clipboard.writeText(phoneLink);
      setLinkNotice(
        t("Ссылка скопирована. Вставьте её в {browser}.", {
          browser: platform.browser,
        }),
      );
    } catch {
      setLinkNotice(t("Нажмите и удерживайте ссылку, чтобы скопировать её."));
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
      setUploadMessage(t("GLB распознан. Размер применяется из полей выше."));
      setArStatus(t("Модель готова — проверьте масштаб и откройте AR"));
      return;
    }
    setUploadState("error");
    setUploadMessage(
      t(
        "На публичной странице принимается только GLB. Фотографии загружаются в защищённом кабинете магазина.",
      ),
    );
  }

  if (isWidget && !subscriptionActive)
    return (
      <main className="widget-fallback">
        <div>
          <span>MIRRAI</span>
          <p>
            {t("Вы прекрасно выглядите в любой одежде.")} <br />
            {t("А ваша мебель — в любом интерьере.")}{" "}
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
            ? t("Не удалось загрузить модель")
            : accessChecked && !accessReady
              ? t("Примерка временно недоступна")
              : scaleState !== "verified"
                ? t("Готовим просмотр…")
                : !accessReady
                  ? t("Проверяем доступность…")
                  : t("Посмотреть у себя")}
          <span aria-hidden="true">↗</span>
        </button>
        <p className="ar-launch-note" role="status">
          {arHelp
            ? t("Этот браузер не открыл камеру.")
            : t("Наведите камеру на пол · размер 1:1")}
        </p>
        {arHelp && (
          <div className="ar-browser-help">
            <p>
              {t(
                "В меню приложения выберите «Открыть в {browser}». Если такого пункта нет, скопируйте ссылку.",
                { browser: platform.browser },
              )}
            </p>
            <button onClick={copyPhoneLink}>{t("Скопировать ссылку")}</button>
            {linkNotice && <p role="status">{linkNotice}</p>}
          </div>
        )}
        <a href={phoneLink} target="_top">
          {scaleState === "error"
            ? t("Открыть просмотр и повторить")
            : t("Посмотреть в 3D")}
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
              <a href="/#catalog">{t("Каталог")}</a>
              <a href="/#business">{t("Для магазинов")}</a>
            </div>
            <button className="nav-cta" onClick={closeViewer}>
              {t("На главную")} <span>↗</span>
            </button>
          </nav>
        )}
        <section className={`viewer ${isWidget ? "viewer-widget" : "shell"}`}>
          <header className="viewer-head">
            <div>
              {!isWidget && (
                <button className="back" onClick={closeViewer}>
                  {t("← Назад")}{" "}
                </button>
              )}
              <p>{t("AR-просмотр · реальный масштаб")}</p>
              <h1>{selected.name}</h1>
            </div>
            <div className={`ready-pill ${scaleState}`}>
              <i />{" "}
              {scaleState === "verified"
                ? t("МАСШТАБ 1:1 ПРОВЕРЕН")
                : scaleState === "error"
                  ? t("AR НЕДОСТУПЕН")
                  : t("ПРОВЕРЯЕМ МАСШТАБ")}
            </div>
          </header>
          <div className="viewer-grid">
            {!isWidget && (
              <aside className="catalog-panel">
                <div className="panel-title">
                  <span>{t("Каталог")}</span>
                  <small>
                    {catalog.length} {t("модели")}
                  </small>
                </div>
                {catalog.map((item, index) => (
                  <button
                    key={item.id}
                    className={`product ${active === index && !customName ? "active" : ""}`}
                    onClick={() => selectProduct(index)}
                  >
                    <i style={{ backgroundColor: item.color, backgroundImage: item.image ? `url("${item.image}")` : undefined }}>
                      {!item.image && <b>▰</b>}
                    </i>
                    <span>
                      <small>{item.category}</small>
                      <strong>{item.name}</strong>
                      <em>{item.price}</em>
                    </span>
                    <b className="select-mark">
                      {active === index && !customName ? "✓" : "+"}
                    </b>
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
                  alt:
                    t("3D-модель {name}", {
                      name: customName || selected.name,
                    }) +
                    (selectedVariant
                      ? ", " +
                        t("цвет {color}", { color: selectedVariant.colorName })
                      : ""),
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
                  scaleState === "verified"
                    ? t("Посмотреть у себя")
                    : t("Проверяем 1:1"),
                  React.createElement("span", null, "↗"),
                ),
              )}
              <div className="room-preview">
                <i className="preview-window" />
                <i className="preview-floor" />
                <span>{t("Вращайте одним пальцем · масштабируйте двумя")}</span>
              </div>
              <div className="viewer-badges">
                <span>
                  {customModel
                    ? "MODEL MATERIALS"
                    : selected.textured
                      ? "PBR MATERIALS"
                      : "GEOMETRY PREVIEW"}
                </span>
                <span>
                  {scaleState === "verified"
                    ? "AR SCALE 1:1 ✓"
                    : "AR SCALE CHECK"}
                </span>
                <span>ADAPTIVE LIGHT</span>
              </div>
            </div>
            <aside className="details-panel">
              <div>
                <p className="control-label">{t("Товар")}</p>
                <h2>{customName || selected.name}</h2>
                <p className="price">
                  {customName ? t("Пользовательская модель") : selected.price}
                </p>
                <div className="material-row">
                  <i style={{ background: selectedColor }} />
                  <span>{selectedMaterial}</span>
                </div>
              </div>
              {!customName && selectedVariants.length > 0 && (
                <div className="variant-selector">
                  <p className="control-label">{t("Цвет на сайте магазина")}</p>
                  <div
                    className="variant-swatches"
                    role="list"
                    aria-label={t("Доступные цвета товара")}
                  >
                    {selectedVariants.map((variant) => (
                      <button
                        key={variant.id}
                        type="button"
                        title={
                          variant.available
                            ? variant.colorName
                            : t("{color} — 3D готовится", {
                                color: variant.colorName,
                              })
                        }
                        aria-label={
                          variant.available
                            ? t("Выбрать цвет {color}", {
                                color: variant.colorName,
                              })
                            : t("{color}: 3D-модель ещё не готова", {
                                color: variant.colorName,
                              })
                        }
                        aria-pressed={selectedVariant?.id === variant.id}
                        disabled={!variant.available}
                        className={
                          selectedVariant?.id === variant.id ? "active" : ""
                        }
                        onClick={() => selectVariant(variant)}
                      >
                        <i style={{ background: variant.color }} />
                        <span>{variant.colorName}</span>
                        {!variant.available && (
                          <small>{t("3D готовится")}</small>
                        )}
                      </button>
                    ))}
                  </div>
                  <p className="variant-note">
                    {t(
                      "В AR открывается отдельная модель выбранного магазином варианта, а не приблизительная перекраска.",
                    )}{" "}
                  </p>
                </div>
              )}
              <div>
                <p className="control-label">{t("Габариты · Ш × Г × В")}</p>
                <strong className="dimensions">
                  {dimensionsLabel(selectedDimensions, locale)}
                </strong>
                <p className="hint">
                  {t(
                    "Модель зафиксирована в указанном масштабе. Покупатель не может случайно изменить размер в AR.",
                  )}{" "}
                </p>
              </div>
              <div>
                <p className="control-label">{t("Освещение превью")}</p>
                <div className="range-row">
                  <input
                    aria-label={t("Экспозиция 3D-превью")}
                    type="range"
                    min="0.65"
                    max="1.35"
                    step="0.05"
                    value={exposure}
                    onChange={(event) =>
                      setExposure(Number(event.target.value))
                    }
                  />
                  <span>{Math.round(exposure * 100)}%</span>
                </div>
                <p className="hint">
                  {t(
                    "В системном AR свет и цвет адаптируются камерой устройства автоматически.",
                  )}{" "}
                </p>
              </div>
              {!isWidget && (
                <div className="asset-upload">
                  <p className="control-label">
                    {t("Локальная проверка готовой модели")}
                  </p>
                  <div className="dimension-inputs">
                    {(["width", "depth", "height"] as const).map(
                      (key, index) => (
                        <label key={key}>
                          <span>
                            {[t("Ш"), t("Г"), t("В")][index]}
                            {t(", см")}
                          </span>
                          <input
                            type="number"
                            min="1"
                            max="5000"
                            value={customDimensions[key]}
                            onChange={(event) =>
                              setCustomDimensions((current) => ({
                                ...current,
                                [key]: positiveNumber(
                                  event.target.value,
                                  current[key],
                                ),
                              }))
                            }
                          />
                        </label>
                      ),
                    )}
                  </div>
                  <label className="upload-button">
                    <input
                      type="file"
                      accept=".glb,model/gltf-binary"
                      onChange={(event) => handleAsset(event.target.files?.[0])}
                    />
                    <span>＋</span>
                    <b>{t("Выбрать готовый GLB")}</b>
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
                    {t(
                      "Фотографии товаров загружаются в кабинете магазина, где MIRRAI безопасно отправляет их в очередь генерации.",
                    )}{" "}
                  </p>
                </div>
              )}
              <div className="ar-state" role="status">
                <i />
                <p>{arStatus}</p>
              </div>
              {platform.mobile ? (
                <button
                  className="primary"
                  onClick={openAR}
                  disabled={scaleState !== "verified"}
                >
                  {scaleState === "verified"
                    ? t("Посмотреть у себя")
                    : scaleState === "error"
                      ? t("Модель временно недоступна")
                      : t("Готовим просмотр…")}
                  <span>↗</span>
                </button>
              ) : (
                <div className="ar-phone-handoff">
                  <strong>{t("Посмотрите у себя с телефона")}</strong>
                  <p>
                    {t("Наведите камеру телефона на QR-код и откройте ссылку.")}
                  </p>
                  {qrCode && (
                    // Locally generated data URL: no network image or optimisation endpoint.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={qrCode}
                      width="220"
                      height="220"
                      alt={t("QR-код для открытия этого товара на телефоне")}
                    />
                  )}
                  <button onClick={copyPhoneLink}>
                    {t("Скопировать ссылку")}
                  </button>
                  {linkNotice && <p role="status">{linkNotice}</p>}
                </div>
              )}
              {arHelp && (
                <div className="ar-browser-help">
                  <strong>
                    {t("Откройте в")} {platform.browser}
                  </strong>
                  <p>
                    {t(
                      "В меню приложения выберите «Открыть в браузере» или скопируйте ссылку. Если телефон не поддерживает AR, вы можете продолжить вращать модель здесь.",
                    )}{" "}
                  </p>
                  <button onClick={copyPhoneLink}>
                    {t("Скопировать ссылку")}
                  </button>
                  <a href={phoneLink} target="_blank" rel="noopener noreferrer">
                    {t("Открыть отдельно")}{" "}
                  </a>
                  {linkNotice && <p role="status">{linkNotice}</p>}
                </div>
              )}
              <p className="privacy">
                {t(
                  "Разрешите доступ к камере и медленно наведите её на свободный участок пола. MIRRAI не сохраняет изображение комнаты.",
                )}{" "}
              </p>
            </aside>
          </div>
        </section>
      </main>
    );

  if (view === "landing" && !isWidget)
    return <MarketingHome onPreview={() => openViewer(0)} />;

  return (
    <main>
      <nav className="nav shell">
        <a className="brand" href="#top">
          MIRR<span>AI</span>
        </a>
        <div className="nav-links">
          <a href="#how">{t("Как работает")}</a>
          <a href="#catalog">{t("Каталог")}</a>
          <a href="#business">{t("Для магазинов")}</a>
          <a href="/admin">{t("Кабинет")}</a>
        </div>
        <a className="nav-cta" href="/onboarding">
          {t("Подключить магазин")} <span>↗</span>
        </a>
      </nav>
      <section className="hero shell" id="top">
        <div className="hero-copy">
          <p className="eyebrow">
            <i /> {t("AR ДЛЯ МЕБЕЛЬНЫХ МАГАЗИНОВ")}{" "}
          </p>
          <h1>
            {t("Мебель —")}
            <br />
            <em>{t("уже у вас.")}</em>
          </h1>
          <p className="lead">
            {t(
              "Покупатель открывает товар в реальном масштабе прямо из карточки магазина — с адаптацией света, оттенков и контактных теней.",
            )}{" "}
          </p>
          <button className="hero-cta" onClick={() => openViewer(0)}>
            {t("Посмотреть кресло у себя")} <span>↗</span>
          </button>
          <div className="hero-proof">
            <span>
              <b>1:1</b> {t("точный масштаб")}{" "}
            </span>
            <span>
              <b>0</b> {t("приложений")}{" "}
            </span>
            <span>
              <b>iOS + Android</b>
            </span>
          </div>
        </div>
        <button
          className="hero-visual"
          onClick={() => openViewer(0)}
          aria-label={t("Открыть интерактивное AR-превью кресла")}
        >
          <div className="hero-room">
            <i className="hero-window" />
            <i className="hero-rug" />
            <i className="hero-chair">
              <b />
            </i>
            <span className="measure measure-x">{t("84 см")}</span>
            <span className="measure measure-y">{t("76 см")}</span>
            <span className="placement-ring" />
          </div>
          <div className="visual-caption">
            <span>{t("Кресло Cloud · Букле")}</span>
            <b>{t("Открыть AR ↗")}</b>
          </div>
        </button>
      </section>
      <section className="how shell" id="how">
        <p className="section-label">{t("Из карточки товара — в комнату")}</p>
        <h2>
          {t("Не представляйте.")} <br />
          <em>{t("Поставьте и посмотрите.")}</em>
        </h2>
        <div className="steps">
          <article>
            <span>01</span>
            <h3>{t("Нажать в магазине")}</h3>
            <p>
              {t(
                "Кнопка MIRRAI находится рядом с добавлением товара в корзину.",
              )}
            </p>
          </article>
          <article>
            <span>02</span>
            <h3>{t("Навести на пол")}</h3>
            <p>
              {t(
                "Телефон определяет поверхность и реальный масштаб помещения.",
              )}
            </p>
          </article>
          <article>
            <span>03</span>
            <h3>{t("Принять решение")}</h3>
            <p>
              {t("Материалы, свет и тени помогают оценить товар до покупки.")}
            </p>
          </article>
        </div>
      </section>
      <section className="catalog-showcase shell" id="catalog">
        <div className="section-heading">
          <div>
            <p className="section-label">{t("Демонстрационный каталог")}</p>
            <h2>
              {t("Четыре товара.")} <br />
              <em>{t("Один клик до комнаты.")}</em>
            </h2>
          </div>
          <p>
            {t(
              "Каждая карточка хранит модель, материалы и реальные габариты. В магазине эти данные автоматически приходят из товарного каталога.",
            )}{" "}
          </p>
        </div>
        <div className="showcase-grid">
          {products.map((item, index) => (
            <button key={item.id} onClick={() => openViewer(index)}>
              <span
                className="showcase-object"
                style={{ background: item.color }}
              >
                <i>{index === 2 ? "◯" : index === 3 ? "▰" : "●"}</i>
              </span>
              <small>{item.category}</small>
              <strong>{item.name}</strong>
              <em>{dimensionsLabel(item.dimensions, locale)}</em>
              <b>{item.price}</b>
            </button>
          ))}
        </div>
      </section>
      <section className="business shell" id="business">
        <div>
          <p className="section-label">MIRRAI COMMERCE</p>
          <h2>
            {t("Сотни товаров.")} <br />
            <em>{t("Без сотен ручных интеграций.")}</em>
          </h2>
          <a className="business-demo" href="/demo-store">
            {t("Посмотреть виджет в магазине")} <span>↗</span>
          </a>
          <a className="business-start" href="/onboarding">
            {t("Подключить свой магазин →")}{" "}
          </a>
        </div>
        <div className="pipeline">
          <article>
            <b>01</b>
            <span>
              <strong>{t("Импорт каталога")}</strong>
              <small>{t("SKU, размеры, варианты и готовые 3D-файлы")}</small>
            </span>
          </article>
          <article>
            <b>02</b>
            <span>
              <strong>{t("Подготовка моделей")}</strong>
              <small>
                {t("GLB + USDZ, PBR-материалы и автоматический контроль")}
              </small>
            </span>
          </article>
          <article>
            <b>03</b>
            <span>
              <strong>{t("Виджет и аналитика")}</strong>
              <small>{t("Запуски AR, размещения и путь до корзины")}</small>
            </span>
          </article>
        </div>
      </section>
      <footer className="shell">
        <span>MIRRAI © 2026</span>
        <a href="/admin">{t("Кабинет магазина")}</a>
        <span>{t("Мебель — в вашем пространстве.")}</span>
      </footer>
    </main>
  );
}
