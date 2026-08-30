"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- viewer exit intentionally performs a full navigation */

import React, { useEffect, useMemo, useRef, useState } from "react";

type View = "landing" | "viewer";
type UploadState = "idle" | "uploading" | "generating" | "ready" | "error";
type Dimensions = { width: number; height: number; depth: number };
type ProductVariant = { id: string; sku: string; name: string; colorName: string; color: string; material: string; image?: string; model?: string; iosModel?: string; default?: boolean; available: boolean };
type Product = { id: string; name: string; category: string; material: string; price: string; color: string; model: string; iosModel?: string; textured: boolean; dimensions: Dimensions; variants?: ProductVariant[]; selectedVariantId?: string };
type ModelViewerElement = HTMLElement & { activateAR?: () => Promise<void>; getDimensions?: () => { x: number; y: number; z: number } };

const products: Product[] = [
  { id: "cloud", name: "Кресло Cloud", category: "Кресла", material: "Букле, светлый беж", price: "67 000 ₽", color: "#d2bda8", model: "/chair.glb", textured: true, dimensions: { width: 84, height: 76, depth: 82 } },
  { id: "arc", name: "Стул Arc", category: "Стулья", material: "Дуб и ткань", price: "29 000 ₽", color: "#92765c", model: "/catalog/arc-chair.glb", textured: true, dimensions: { width: 52, height: 81, depth: 55 } },
  { id: "halo", name: "Торшер Halo", category: "Освещение", material: "Латунь, матовый металл", price: "18 400 ₽", color: "#d0be85", model: "/catalog/halo-lamp.glb", textured: true, dimensions: { width: 48, height: 158, depth: 48 } },
  { id: "plane", name: "Стол Plane", category: "Столы", material: "Натуральный дуб", price: "74 000 ₽", color: "#aa8763", model: "/catalog/plane-table.glb", textured: true, dimensions: { width: 160, height: 75, depth: 86 } },
];

const reconstructionApi = process.env.NEXT_PUBLIC_RECONSTRUCTION_API_URL ?? "";

function safeAssetUrl(value: string | null, fallback: string) {
  if (!value) return fallback;
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  try { const url = new URL(value); return url.protocol === "https:" ? url.toString() : fallback; } catch { return fallback; }
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
      return [{ id, sku: String(variant.sku ?? "").slice(0, 120), name: String(variant.name ?? "").slice(0, 80), colorName: String(variant.colorName ?? variant.name ?? "Цвет").slice(0, 80), color: String(variant.color), material: String(variant.material ?? "").slice(0, 160), image: typeof variant.image === "string" ? safeAssetUrl(variant.image, "") : undefined, model: model || undefined, iosModel: typeof variant.iosModel === "string" ? safeAssetUrl(variant.iosModel, "") || undefined : undefined, default: variant.default === true, available: variant.available === true && Boolean(model) }];
    });
  } catch { return []; }
}

function dimensionsLabel(value: Dimensions) { return `${value.width} × ${value.depth} × ${value.height} см`; }

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
  const [customPreview, setCustomPreview] = useState("");
  const [customModel, setCustomModel] = useState("");
  const [customDimensions, setCustomDimensions] = useState<Dimensions>({ width: 80, height: 80, depth: 80 });
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [uploadMessage, setUploadMessage] = useState("");
  const [photoPending, setPhotoPending] = useState(false);
  const [exposure, setExposure] = useState(1);
  const arRef = useRef<ModelViewerElement>(null);

  useEffect(() => {
    import("@google/model-viewer");
    const params = new URLSearchParams(window.location.search);
    if (params.get("widget") !== "1") {
      const openFromUrl = () => {
        const productId = new URLSearchParams(window.location.search).get("product");
        const index = products.findIndex(item => item.id === productId);
        if (index >= 0) { setActive(index); setView("viewer"); }
        else setView("landing");
      };
      openFromUrl();
      window.addEventListener("popstate", openFromUrl);
      return () => window.removeEventListener("popstate", openFromUrl);
    }
    const base = products[0];
    const variants = safeVariants(params.get("variants"));
    const requestedVariantId = params.get("selectedVariantId")?.slice(0, 80) ?? "";
    const preferredVariant = variants.find(variant => variant.id === requestedVariantId && variant.available) ?? variants.find(variant => variant.default && variant.available) ?? variants.find(variant => variant.available);
    const product: Product = {
      id: params.get("productId")?.slice(0, 80) || base.id,
      name: params.get("name")?.slice(0, 120) || base.name,
      category: params.get("category")?.slice(0, 80) || base.category,
      material: preferredVariant?.material || params.get("material")?.slice(0, 120) || base.material,
      price: params.get("price")?.slice(0, 50) || base.price,
      color: preferredVariant?.color ?? (/^#[0-9a-f]{6}$/i.test(params.get("color") ?? "") ? params.get("color")! : base.color),
      model: preferredVariant?.model ?? safeAssetUrl(params.get("model"), base.model),
      iosModel: preferredVariant?.iosModel ?? (safeAssetUrl(params.get("iosModel"), "") || undefined),
      textured: params.get("textured") === "1",
      dimensions: { width: positiveNumber(params.get("width"), base.dimensions.width), height: positiveNumber(params.get("height"), base.dimensions.height), depth: positiveNumber(params.get("depth"), base.dimensions.depth) },
      variants,
      selectedVariantId: preferredVariant?.id,
    };
    const requestedOrigin = params.get("parentOrigin");
    let verifiedOrigin = "*";
    if (requestedOrigin) try { const origin = new URL(requestedOrigin).origin; if (origin.startsWith("https://")) verifiedOrigin = origin; } catch { /* demo event contains no private data */ }
    queueMicrotask(() => {
      setTargetOrigin(verifiedOrigin);
      setWidgetProduct(product);
      setActiveVariantId(preferredVariant?.id ?? "");
      setIsWidget(true);
      setSubscriptionActive(params.get("subscription") !== "inactive");
      setView("viewer");
    });
  }, []);

  const catalog = useMemo(() => widgetProduct ? [widgetProduct] : products, [widgetProduct]);
  const selected = catalog[Math.min(active, catalog.length - 1)] ?? products[0];
  const selectedVariants = selected.variants ?? [];
  const selectedVariant = selectedVariants.find(variant => variant.id === activeVariantId && variant.available) ?? selectedVariants.find(variant => variant.id === selected.selectedVariantId && variant.available) ?? selectedVariants.find(variant => variant.default && variant.available) ?? selectedVariants.find(variant => variant.available);
  const selectedDimensions = customName ? customDimensions : selected.dimensions;
  const modelSource = customModel || selectedVariant?.model || selected.model;
  const iosModelSource = customModel ? undefined : selectedVariant?.iosModel || selected.iosModel;
  const selectedColor = selectedVariant?.color || selected.color;
  const selectedMaterial = selectedVariant?.material || selected.material;

  function emitWidgetEvent(event: string) {
    if (!isWidget || window.parent === window) return;
    window.parent.postMessage({ source: "mirrai-widget", event, productId: selected.id, variantId: selectedVariant?.id ?? null, variantSku: selectedVariant?.sku ?? null, at: new Date().toISOString() }, targetOrigin);
  }

  function resetCustomAsset() {
    if (customModel.startsWith("blob:")) URL.revokeObjectURL(customModel);
    if (customPreview.startsWith("blob:")) URL.revokeObjectURL(customPreview);
    setCustomName(""); setCustomModel(""); setCustomPreview(""); setUploadState("idle"); setUploadMessage(""); setPhotoPending(false);
  }

  function openViewer(index = 0) {
    resetCustomAsset(); setActive(index); setView("viewer");
    window.history.pushState({ mirraiViewer: true }, "", `/?product=${encodeURIComponent(products[index]?.id ?? products[0].id)}`);
  }

  function closeViewer() {
    resetCustomAsset(); setView("landing");
    if (window.history.state?.mirraiViewer) window.history.back();
    else window.history.replaceState(null, "", "/");
  }

  function selectProduct(index: number) {
    resetCustomAsset(); setActive(index); setActiveVariantId(products[index]?.selectedVariantId ?? ""); setArStatus("Загружаем выбранную модель…");
    window.history.replaceState({ mirraiViewer: true }, "", `/?product=${encodeURIComponent(products[index]?.id ?? products[0].id)}`);
  }

  function selectVariant(variant: ProductVariant) {
    if (!variant.available || !variant.model) return;
    resetCustomAsset(); setActiveVariantId(variant.id); setArStatus(`Загружаем цвет «${variant.colorName}»…`);
  }

  useEffect(() => {
    if (view !== "viewer" || !arRef.current) return;
    const viewer = arRef.current;
    const onLoad = () => { const source = viewer.getDimensions?.(); if (source?.x && source.y && source.z) { const clamp = (value: number) => Math.max(.01, Math.min(100, value)); const scale = [clamp((selectedDimensions.width / 100) / source.x), clamp((selectedDimensions.height / 100) / source.y), clamp((selectedDimensions.depth / 100) / source.z)]; viewer.setAttribute("scale", scale.map(value => value.toFixed(5)).join(" ")); } setArStatus(`${customName || selected.name} · ${selectedVariant?.colorName ?? "основной цвет"} — масштаб ${selectedDimensions.width} × ${selectedDimensions.depth} × ${selectedDimensions.height} см`); if (isWidget && window.parent !== window) window.parent.postMessage({ source: "mirrai-widget", event: "model_ready", productId: selected.id, variantId: selectedVariant?.id ?? null, variantSku: selectedVariant?.sku ?? null, at: new Date().toISOString() }, targetOrigin); };
    const onError = () => setArStatus("Модель не загрузилась. Проверьте GLB/USDZ товара.");
    const onArStatus = (event: Event) => {
      const status = (event as CustomEvent<{ status: string }>).detail?.status;
      if (status === "object-placed") { setArStatus("Предмет размещён в вашем пространстве"); if (isWidget && window.parent !== window) window.parent.postMessage({ source: "mirrai-widget", event: "object_placed", productId: selected.id, at: new Date().toISOString() }, targetOrigin); }
      else if (status === "failed") setArStatus("AR не запустился — откройте страницу в Safari на iPhone или Chrome на Android");
      else setArStatus("Медленно направляйте камеру на свободный участок пола…");
    };
    viewer.addEventListener("load", onLoad); viewer.addEventListener("error", onError); viewer.addEventListener("ar-status", onArStatus);
    return () => { viewer.removeEventListener("load", onLoad); viewer.removeEventListener("error", onError); viewer.removeEventListener("ar-status", onArStatus); };
  }, [view, modelSource, selected.id, selected.name, selectedVariant?.id, selectedVariant?.colorName, selectedVariant?.sku, selectedDimensions.width, selectedDimensions.height, selectedDimensions.depth, customName, isWidget, targetOrigin]);

  async function openAR() {
    if (photoPending) { setArStatus("Сначала дождитесь готовой 3D-модели"); return; }
    emitWidgetEvent("ar_open"); setArStatus("Запускаем камеру и поиск поверхности…");
    try { await arRef.current?.activateAR?.(); } catch { setArStatus("AR недоступен в этом браузере. Используйте Safari на iPhone или Chrome на Android."); }
  }

  async function handleAsset(file?: File) {
    if (!file) return;
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    const isImage = file.type.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "heic"].includes(extension);
    const isModel = extension === "glb" || file.type === "model/gltf-binary";
    resetCustomAsset(); setCustomName(file.name);
    if (isModel) { setCustomModel(URL.createObjectURL(file)); setUploadState("ready"); setUploadMessage("GLB распознан. Размер применяется из полей выше."); setArStatus("Модель готова — проверьте масштаб и откройте AR"); return; }
    if (!isImage) { setUploadState("error"); setUploadMessage("Поддерживаются JPG, PNG, WEBP, HEIC и GLB"); return; }
    setCustomPreview(URL.createObjectURL(file)); setPhotoPending(true);
    if (!reconstructionApi) { setUploadState("error"); setUploadMessage("Фото принято. Для создания 3D подключите GPU-сервис или загрузите готовый GLB."); return; }
    try {
      setUploadState("uploading"); setUploadMessage("Загружаем фотографию товара…");
      const body = new FormData(); body.append("file", file); body.append("kind", "furniture");
      const response = await fetch(`${reconstructionApi}/v1/assets`, { method: "POST", body });
      if (!response.ok) throw new Error("upload");
      const { id } = await response.json() as { id: string };
      setUploadState("generating"); setUploadMessage("Создаём геометрию и PBR-текстуры…");
      for (let attempt = 0; attempt < 120; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 2500));
        const statusResponse = await fetch(`${reconstructionApi}/v1/assets/${id}`);
        if (!statusResponse.ok) throw new Error("status");
        const job = await statusResponse.json() as { status: string; model_url?: string; error?: string };
        if (job.status === "ready" && job.model_url) { setCustomModel(new URL(job.model_url, reconstructionApi).toString()); setPhotoPending(false); setUploadState("ready"); setUploadMessage("3D-модель готова. Проверьте геометрию перед публикацией."); return; }
        if (job.status === "failed") throw new Error(job.error || "generation");
      }
      throw new Error("timeout");
    } catch { setUploadState("error"); setUploadMessage("Генерация не завершилась. Проверьте GPU-сервис и повторите."); }
  }

  if (isWidget && !subscriptionActive) return <main className="widget-fallback"><div><span>MIRRAI</span><p>Вы прекрасно выглядите в любой одежде.<br/>А ваша мебель — в любом интерьере.</p></div></main>;

  if (view === "viewer") return <main className={isWidget ? "widget-shell" : ""}>
    {!isWidget && <nav className="nav shell"><a className="brand" href="/">MIRR<span>AI</span></a><div className="nav-links"><a href="/#catalog">Каталог</a><a href="/#business">Для магазинов</a></div><button className="nav-cta" onClick={closeViewer}>На главную <span>↗</span></button></nav>}
    <section className={`viewer ${isWidget ? "viewer-widget" : "shell"}`}>
      <header className="viewer-head"><div>{!isWidget && <button className="back" onClick={closeViewer}>← Назад</button>}<p>AR-просмотр · реальный масштаб</p><h1>{selected.name}</h1></div><div className="ready-pill"><i/> ГОТОВО К РАЗМЕЩЕНИЮ</div></header>
      <div className="viewer-grid">
        {!isWidget && <aside className="catalog-panel"><div className="panel-title"><span>Каталог</span><small>{catalog.length} модели</small></div>{catalog.map((item, index) => <button key={item.id} className={`product ${active === index && !customName ? "active" : ""}`} onClick={() => selectProduct(index)}><i style={{ background: item.color }}><b>▰</b></i><span><small>{item.category}</small><strong>{item.name}</strong><em>{item.price}</em></span><b className="select-mark">{active === index && !customName ? "✓" : "+"}</b></button>)}</aside>}
        <div className="ar-stage">
          {React.createElement("model-viewer", { key: modelSource, ref: arRef, src: modelSource, "ios-src": iosModelSource, alt: `3D-модель ${customName || selected.name}${selectedVariant ? `, цвет ${selectedVariant.colorName}` : ""}`, ar: true, "ar-modes": "webxr scene-viewer quick-look", "ar-placement": "floor", "ar-scale": "fixed", "camera-controls": true, "touch-action": "pan-y", "shadow-intensity": "1.45", "shadow-softness": ".75", exposure, "environment-image": "neutral", "camera-orbit": "35deg 68deg auto", "field-of-view": "30deg" }, React.createElement("button", { slot: "ar-button", className: "native-ar-button" }, "Посмотреть у себя", React.createElement("span", null, "↗")))}
          <div className="room-preview"><i className="preview-window"/><i className="preview-floor"/><span>Вращайте модель пальцем</span></div>
          {photoPending && <div className="reconstruction-screen">{customPreview && <img src={customPreview} alt="Исходная фотография предмета"/>}<p>Создаём AR-модель</p><div className="generation-steps"><span className="done">Фото</span><span className={uploadState === "generating" ? "active" : ""}>Геометрия</span><span>PBR</span><span>GLB</span></div><small>{uploadMessage}</small></div>}
          <div className="viewer-badges"><span>{customModel ? "MODEL MATERIALS" : selected.textured ? "PBR MATERIALS" : "GEOMETRY PREVIEW"}</span><span>AR SCALE 1:1</span><span>ADAPTIVE LIGHT</span></div>
        </div>
        <aside className="details-panel">
          <div><p className="control-label">Товар</p><h2>{customName || selected.name}</h2><p className="price">{customName ? "Пользовательская модель" : selected.price}</p><div className="material-row"><i style={{ background: selectedColor }}/><span>{selectedMaterial}</span></div></div>
          {!customName && selectedVariants.length > 0 && <div className="variant-selector"><p className="control-label">Цвет на сайте магазина</p><div className="variant-swatches" role="list" aria-label="Доступные цвета товара">{selectedVariants.map(variant => <button key={variant.id} type="button" title={variant.available ? variant.colorName : `${variant.colorName} — 3D готовится`} aria-label={variant.available ? `Выбрать цвет ${variant.colorName}` : `${variant.colorName}: 3D-модель ещё не готова`} aria-pressed={selectedVariant?.id === variant.id} disabled={!variant.available} className={selectedVariant?.id === variant.id ? "active" : ""} onClick={() => selectVariant(variant)}><i style={{ background: variant.color }}/><span>{variant.colorName}</span>{!variant.available && <small>3D готовится</small>}</button>)}</div><p className="variant-note">В AR открывается отдельная модель выбранного магазином варианта, а не приблизительная перекраска.</p></div>}
          <div><p className="control-label">Габариты · Ш × Г × В</p><strong className="dimensions">{dimensionsLabel(selectedDimensions)}</strong><p className="hint">Модель зафиксирована в указанном масштабе. Покупатель не может случайно изменить размер в AR.</p></div>
          <div><p className="control-label">Освещение превью</p><div className="range-row"><input aria-label="Экспозиция 3D-превью" type="range" min="0.65" max="1.35" step="0.05" value={exposure} onChange={event => setExposure(Number(event.target.value))}/><span>{Math.round(exposure * 100)}%</span></div><p className="hint">В системном AR свет и цвет адаптируются камерой устройства автоматически.</p></div>
          {!isWidget && <div className="asset-upload"><p className="control-label">Тест своего товара</p><div className="dimension-inputs">{(["width", "depth", "height"] as const).map((key, index) => <label key={key}><span>{["Ш", "Г", "В"][index]}, см</span><input type="number" min="1" max="5000" value={customDimensions[key]} onChange={event => setCustomDimensions(current => ({ ...current, [key]: positiveNumber(event.target.value, current[key]) }))}/></label>)}</div><label className="upload-button"><input type="file" accept="image/jpeg,image/png,image/webp,image/heic,.glb" onChange={event => handleAsset(event.target.files?.[0])}/><span>＋</span><b>Фото товара или готовый GLB</b></label>{customPreview && <img className="upload-preview" src={customPreview} alt="Загруженный товар"/>}{uploadState !== "idle" && <div className={`asset-result ${uploadState}`}><span>{uploadState === "ready" ? "✓" : uploadState === "error" ? "!" : "•••"}</span><div><strong>{customName}</strong><small>{uploadMessage}</small></div></div>}</div>}
          <div className="ar-state"><i/><p>{arStatus}</p></div><button className="primary" onClick={openAR} disabled={photoPending}>{photoPending ? "Ожидаем 3D-модель" : "Посмотреть у себя"}<span>↗</span></button><p className="privacy">Камера открывается системным AR вашего устройства. MIRRAI не сохраняет изображение комнаты.</p>
        </aside>
      </div>
    </section>
  </main>;

  return <main>
    <nav className="nav shell"><a className="brand" href="#top">MIRR<span>AI</span></a><div className="nav-links"><a href="#how">Как работает</a><a href="#catalog">Каталог</a><a href="#business">Для магазинов</a><a href="/admin">Администратор</a></div><button className="nav-cta" onClick={() => openViewer(0)}>Открыть демо <span>↗</span></button></nav>
    <section className="hero shell" id="top"><div className="hero-copy"><p className="eyebrow"><i/> AR ДЛЯ МЕБЕЛЬНЫХ МАГАЗИНОВ</p><h1>Мебель —<br/><em>уже у вас.</em></h1><p className="lead">Покупатель открывает товар в реальном масштабе прямо из карточки магазина — с адаптацией света, оттенков и контактных теней.</p><button className="hero-cta" onClick={() => openViewer(0)}>Посмотреть кресло у себя <span>↗</span></button><div className="hero-proof"><span><b>1:1</b> точный масштаб</span><span><b>0</b> приложений</span><span><b>iOS + Android</b></span></div></div><button className="hero-visual" onClick={() => openViewer(0)} aria-label="Открыть интерактивное AR-превью кресла"><div className="hero-room"><i className="hero-window"/><i className="hero-rug"/><i className="hero-chair"><b/></i><span className="measure measure-x">84 см</span><span className="measure measure-y">76 см</span><span className="placement-ring"/></div><div className="visual-caption"><span>Кресло Cloud · Букле</span><b>Открыть AR ↗</b></div></button></section>
    <section className="how shell" id="how"><p className="section-label">Из карточки товара — в комнату</p><h2>Не представляйте.<br/><em>Поставьте и посмотрите.</em></h2><div className="steps"><article><span>01</span><h3>Нажать в магазине</h3><p>Кнопка MIRRAI находится рядом с добавлением товара в корзину.</p></article><article><span>02</span><h3>Навести на пол</h3><p>Телефон определяет поверхность и реальный масштаб помещения.</p></article><article><span>03</span><h3>Принять решение</h3><p>Материалы, свет и тени помогают оценить товар до покупки.</p></article></div></section>
    <section className="catalog-showcase shell" id="catalog"><div className="section-heading"><div><p className="section-label">Демонстрационный каталог</p><h2>Четыре товара.<br/><em>Один клик до комнаты.</em></h2></div><p>Каждая карточка хранит модель, материалы и реальные габариты. В магазине эти данные автоматически приходят из товарного каталога.</p></div><div className="showcase-grid">{products.map((item, index) => <button key={item.id} onClick={() => openViewer(index)}><span className="showcase-object" style={{ background: item.color }}><i>{index === 2 ? "◯" : index === 3 ? "▰" : "●"}</i></span><small>{item.category}</small><strong>{item.name}</strong><em>{dimensionsLabel(item.dimensions)}</em><b>{item.price}</b></button>)}</div></section>
    <section className="business shell" id="business"><div><p className="section-label">MIRRAI COMMERCE</p><h2>Сотни товаров.<br/><em>Без сотен ручных интеграций.</em></h2><a className="business-demo" href="/demo-store">Посмотреть виджет в магазине <span>↗</span></a></div><div className="pipeline"><article><b>01</b><span><strong>Импорт каталога</strong><small>SKU, размеры, варианты и готовые 3D-файлы</small></span></article><article><b>02</b><span><strong>Подготовка моделей</strong><small>GLB + USDZ, PBR-материалы и автоматический контроль</small></span></article><article><b>03</b><span><strong>Виджет и аналитика</strong><small>Запуски AR, размещения и путь до корзины</small></span></article></div></section>
    <footer className="shell"><span>MIRRAI © 2026</span><a href="/admin">Кабинет магазина</a><span>Мебель — в вашем пространстве.</span></footer>
  </main>;
}
