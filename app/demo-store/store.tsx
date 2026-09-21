"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- full navigation avoids a Vinext dev-runtime duplicate React bundle */
/* eslint-disable @next/next/no-img-element -- merchant catalog images are data-driven */

import { useEffect, useMemo, useRef, useState } from "react";

type CatalogVariant = { id: string; sku: string; name: string; colorName: string; color: string; material: string; image: string | null; model: string | null; iosModel: string | null; default: boolean; available: boolean; published: boolean };
type CatalogItem = { id: string; sku: string; name: string; category: string; price: string; material: string; color: string; width: number | null; height: number | null; depth: number | null; sourceUrl: string | null; images: string[]; variants: CatalogVariant[]; selectedVariantId: string | null; modelStatus: string; modelMessage: string; model: string | null; iosModel: string | null; demoAvailable: boolean; published: boolean };
type CatalogData = { shop: { name: string; slug: string }; counts: { total: number; withModel: number; published: number }; items: CatalogItem[] };
type WidgetInstance = { destroy?: () => void };
declare global { interface Window { MirraiWidget?: { mount: (config: Record<string, unknown>) => WidgetInstance } } }

const statusLabels: Record<string, string> = { review: "3D на проверке", ready: "3D готова", published: "AR доступен", processing: "Создаётся", queued: "В очереди", missing: "3D готовится", failed: "Нужна повторная генерация" };
const categoryOrder = ["Все", "Кресла", "Диваны", "Стулья", "Столы", "Тумбы"];
function dimensions(item: CatalogItem) { return item.width && item.depth && item.height ? `${item.width} × ${item.depth} × ${item.height} см` : "Размеры уточняются"; }
function productName(item: CatalogItem, variant?: CatalogVariant) {
  if (!variant || item.variants.length < 2) return item.name;
  const withVariantColor = item.name.replace(/(серый|зел[её]ный|белый|ч[её]рный)\s+цвет/iu, `${variant.colorName} цвет`);
  return withVariantColor === item.name ? `${item.name} — ${variant.colorName}` : withVariantColor;
}
function scrollPageTop() {
  const root = document.documentElement;
  const previous = root.style.scrollBehavior;
  root.style.scrollBehavior = "auto";
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  requestAnimationFrame(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    root.style.scrollBehavior = previous;
  });
}

export function DemoStore() {
  const [data, setData] = useState<CatalogData | null>(null);
  const [selectedSku, setSelectedSku] = useState("");
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [category, setCategory] = useState("Все");
  const [query, setQuery] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [cart, setCart] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutMessage, setCheckoutMessage] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [event, setEvent] = useState("Выберите товар с готовой 3D-моделью");
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const searchInput = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";
  }, []);

  useEffect(() => {
    fetch("/api/storefront/catalog?shop=hugge-md", { cache: "no-store" }).then(response => response.ok ? response.json() : Promise.reject()).then((catalog: CatalogData) => {
      setData(catalog);
      const requestedSku = new URLSearchParams(window.location.search).get("product");
      const requestedProduct = catalog.items.find(item => item.sku === requestedSku);
      setSelectedSku(requestedProduct?.sku ?? catalog.items.find(item => item.demoAvailable)?.sku ?? catalog.items[0]?.sku ?? "");
      setDetailOpen(Boolean(requestedProduct));
      if (requestedProduct) requestAnimationFrame(scrollPageTop);
    }).catch(() => setEvent("Каталог временно недоступен"));
  }, []);

  const selected = useMemo(() => data?.items.find(item => item.sku === selectedSku) ?? data?.items[0], [data, selectedSku]);
  const selectedVariant = selected?.variants.find(variant => variant.id === selectedVariantId && variant.available) ?? selected?.variants.find(variant => variant.id === selected.selectedVariantId && variant.available) ?? selected?.variants.find(variant => variant.default && variant.available) ?? selected?.variants.find(variant => variant.available);
  const galleryImages = (() => {
    if (!selected) return [];
    if (selectedVariant?.image && selectedVariant.image !== selected.images[0]) return [selectedVariant.image];
    return Array.from(new Set([selectedVariant?.image, ...selected.images].filter((image): image is string => Boolean(image))));
  })();
  const activeImage = galleryImages[Math.min(activeImageIndex, Math.max(0, galleryImages.length - 1))];
  const activeProductName = selected ? productName(selected, selectedVariant) : "";
  const filtered = useMemo(() => data?.items.filter(item => (!favoritesOnly || favorites.includes(item.sku)) && (category === "Все" || item.category === category) && (!query.trim() || `${item.name} ${item.sku}`.toLowerCase().includes(query.trim().toLowerCase()))) ?? [], [category, data, favorites, favoritesOnly, query]);
  const cartLines = useMemo(() => {
    if (!data) return [];
    const quantities = new Map<string, number>();
    cart.forEach(sku => quantities.set(sku, (quantities.get(sku) ?? 0) + 1));
    return Array.from(quantities, ([key, quantity]) => {
      const [sku, variantId] = key.split("::");
      const item = data.items.find(product => product.sku === sku);
      const variant = item?.variants.find(option => option.id === variantId);
      return { key, item, variant, quantity };
    }).filter((line): line is { key: string; item: CatalogItem; variant: CatalogVariant | undefined; quantity: number } => Boolean(line.item));
  }, [cart, data]);
  const cartTotal = useMemo(() => cartLines.reduce((sum, line) => sum + (Number(line.item.price.replace(/[^\d]/g, "")) || 0) * line.quantity, 0), [cartLines]);
  useEffect(() => { if (selected) queueMicrotask(() => setSelectedVariantId(selectedVariant?.id ?? "")); }, [selected, selectedVariant?.id]);
  useEffect(() => {
    const onPopState = () => {
      const sku = new URLSearchParams(window.location.search).get("product");
      setDetailOpen(Boolean(sku));
      if (sku) setSelectedSku(sku);
      setLightboxOpen(false);
      setCartOpen(false);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
  useEffect(() => {
    if (!lightboxOpen) return;
    const onKeyDown = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === "Escape") setLightboxOpen(false);
      if (galleryImages.length > 1 && keyboardEvent.key === "ArrowLeft") setActiveImageIndex(index => (index - 1 + galleryImages.length) % galleryImages.length);
      if (galleryImages.length > 1 && keyboardEvent.key === "ArrowRight") setActiveImageIndex(index => (index + 1) % galleryImages.length);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", onKeyDown); };
  }, [galleryImages.length, lightboxOpen]);
  useEffect(() => {
    if (!cartOpen) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (keyboardEvent: KeyboardEvent) => { if (keyboardEvent.key === "Escape") setCartOpen(false); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", closeOnEscape); };
  }, [cartOpen]);
  useEffect(() => {
    if (!detailOpen) return;
    scrollPageTop();
  }, [detailOpen, selectedSku]);

  useEffect(() => {
    if (!detailOpen || !selected?.demoAvailable || !selected.model) return;
    const onEvent = (message: Event) => { const detail = (message as CustomEvent<{ event?: string }>).detail; const labels: Record<string, string> = { widget_open: "Покупатель открыл виджет", model_ready: "3D-модель загружена", ar_open: "Покупатель запустил AR", object_placed: "Товар размещён в комнате" }; if (detail?.event) setEvent(labels[detail.event] || detail.event); };
    window.addEventListener("mirrai:event", onEvent);
    let instance: WidgetInstance | undefined;
    const mount = () => { instance = window.MirraiWidget?.mount({ target: "#mirrai-demo-slot", shopId: "hugge-md", sku: selectedVariant?.sku || selected.sku, productId: selected.id, name: productName(selected, selectedVariant), category: selected.category, material: selectedVariant?.material || selected.material || "Материал уточняется", price: selected.price, color: selectedVariant?.color || selected.color, model: selectedVariant?.model || selected.model!, iosModel: selectedVariant?.iosModel || selected.iosModel || "", variants: selected.variants, selectedVariantId: selectedVariant?.id || "", width: String(selected.width || 80), height: String(selected.height || 80), depth: String(selected.depth || selected.width || 80), label: "Посмотреть у себя" }); setEvent("AR-виджет готов"); };
    let script = document.querySelector<HTMLScriptElement>("script[data-mirrai-demo]");
    if (window.MirraiWidget) mount(); else if (!script) { script = document.createElement("script"); script.src = "/mirrai-widget-2.1.0.js"; script.dataset.auto = "false"; script.dataset.mirraiDemo = "true"; script.onload = mount; document.body.appendChild(script); } else script.addEventListener("load", mount, { once: true });
    return () => { window.removeEventListener("mirrai:event", onEvent); instance?.destroy?.(); script?.removeEventListener("load", mount); };
  }, [detailOpen, selected, selectedVariant]);

  function setProductUrl(sku?: string) {
    const url = new URL(window.location.href);
    if (sku) url.searchParams.set("product", sku);
    else url.searchParams.delete("product");
    window.history.pushState({ product: sku ?? null }, "", `${url.pathname}${url.search}`);
  }
  function openProduct(item: CatalogItem) { scrollPageTop(); setSelectedSku(item.sku); setSelectedVariantId(""); setActiveImageIndex(0); setLightboxOpen(false); setCartOpen(false); setDetailOpen(true); setProductUrl(item.sku); }
  function closeProduct() { setDetailOpen(false); setProductUrl(); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function showCategory(name: string) { setCategory(name); setFavoritesOnly(false); setDetailOpen(false); setMobileMenuOpen(false); setProductUrl(); queueMicrotask(() => document.querySelector(".shop-catalog")?.scrollIntoView({ behavior: "smooth" })); }
  function openSearch() { setDetailOpen(false); setFavoritesOnly(false); setMobileMenuOpen(false); setProductUrl(); queueMicrotask(() => { document.querySelector(".shop-catalog")?.scrollIntoView({ behavior: "smooth" }); searchInput.current?.focus(); }); }
  function openFavorites() { setDetailOpen(false); setCategory("Все"); setQuery(""); setFavoritesOnly(true); setMobileMenuOpen(false); setProductUrl(); queueMicrotask(() => document.querySelector(".shop-catalog")?.scrollIntoView({ behavior: "smooth" })); }
  function toggleFavorite(sku: string) { setFavorites(value => value.includes(sku) ? value.filter(item => item !== sku) : [...value, sku]); }
  function addToCart(sku: string, variantId?: string | null) { const key = variantId ? `${sku}::${variantId}` : sku; setCart(value => [...value, key]); setCheckoutMessage(""); setEvent("Товар добавлен в корзину"); }
  function removeFromCart(key: string) { setCart(value => { const index = value.lastIndexOf(key); return index < 0 ? value : value.filter((_, itemIndex) => itemIndex !== index); }); }
  function removeCartLine(key: string) { setCart(value => value.filter(item => item !== key)); }
  function showPreviousImage() { if (galleryImages.length > 1) setActiveImageIndex(index => (index - 1 + galleryImages.length) % galleryImages.length); }
  function showNextImage() { if (galleryImages.length > 1) setActiveImageIndex(index => (index + 1) % galleryImages.length); }
  function launchProductViewer() {
    const trigger = document.querySelector<HTMLButtonElement>("#mirrai-demo-slot button");
    if (trigger) trigger.click();
    else document.querySelector(".product-ar-card")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  function finishSwipe(clientX: number) {
    if (touchStartX.current === null) return;
    const distance = clientX - touchStartX.current;
    if (Math.abs(distance) > 45) {
      if (distance > 0) showPreviousImage();
      else showNextImage();
    }
    touchStartX.current = null;
  }

  return <main className="store-demo hugge-demo">
    <div className="demo-ribbon"><span>●</span> Рабочая демонстрация HUGGE × MIRRAI</div>
    <nav className="store-nav">
      <button className="store-menu" onClick={() => setMobileMenuOpen(value => !value)} aria-expanded={mobileMenuOpen} aria-label={mobileMenuOpen ? "Закрыть меню" : "Открыть меню"}>{mobileMenuOpen ? "×" : "☰"}</button><a href="/demo-store?shop=hugge-md" className="store-logo">HUGGE<span>.MD</span></a>
      <div className="store-main-links">{categoryOrder.slice(1).map(name => <button key={name} onClick={() => showCategory(name)}>{name}</button>)}</div>
      <div className="store-actions"><button onClick={openSearch} aria-label="Открыть поиск">⌕</button><button onClick={openFavorites} className={favoritesOnly ? "active" : ""} aria-label="Открыть избранное">♡ <b>{favorites.length || ""}</b></button><button onClick={() => setCartOpen(true)} aria-label="Открыть корзину">Корзина <b>{cart.length}</b></button></div>
    </nav>
    {mobileMenuOpen && <div className="mobile-store-menu"><p>Каталог</p>{categoryOrder.map(name => <button type="button" key={name} onClick={() => showCategory(name)}>{name}</button>)}<button type="button" onClick={openFavorites}>Избранное ({favorites.length})</button><button type="button" onClick={() => { setMobileMenuOpen(false); setCartOpen(true); }}>Корзина ({cart.length})</button></div>}

    {!detailOpen ? <>
      <header className="hugge-hero"><div><p>КАТАЛОГ HUGGE · В ДОПОЛНЕННОЙ РЕАЛЬНОСТИ</p><h1>Мебель, которую<br/>можно увидеть дома</h1><span>Рассмотрите текстурированную 3D-модель со всех сторон и поставьте её в свой интерьер в реальном масштабе.</span><div className="hero-actions"><button className="hero-primary" onClick={() => { const item = data?.items.find(product => product.sku === "HUGGE-89990") ?? data?.items.find(product => product.demoAvailable); if (item) openProduct(item); }}>Попробовать 3D <b>→</b></button><button className="hero-secondary" onClick={() => document.querySelector(".shop-catalog")?.scrollIntoView({ behavior: "smooth" })}>Смотреть каталог</button></div><small className="hero-proof"><i/> {data?.counts.withModel ?? 16} из {data?.counts.total ?? 16} товаров готовы к просмотру</small></div><div className="hero-product">{data?.items.find(item => item.sku === "HUGGE-89990")?.images[0] && <img src={data.items.find(item => item.sku === "HUGGE-89990")!.images[0]} alt="Кресло Alba"/>}<span>3D<br/>+ AR</span><em>Кресло Alba · HUGGE-89990</em></div></header>
      <section className="shop-benefits"><span>{data?.counts.withModel ?? 16} товаров готовы в AR</span><span>Текстурированные 3D-модели</span><span>Реальный масштаб</span><span>iPhone и Android</span></section>
      <section className="demo-steps" aria-label="Как работает дополненная реальность"><header><p>КАК ЭТО РАБОТАЕТ</p><h2>От карточки товара — в вашу комнату</h2></header><ol><li><b>01</b><div><strong>Выберите товар</strong><span>Каталог и варианты цвета синхронизированы с магазином.</span></div></li><li><b>02</b><div><strong>Откройте 3D</strong><span>Вращайте модель и рассмотрите материалы со всех сторон.</span></div></li><li><b>03</b><div><strong>Поставьте дома</strong><span>Камера покажет мебель в интерьере в масштабе 1:1.</span></div></li></ol></section>
      <section className="shop-catalog">
        <header><div><p>{favoritesOnly ? "ВАШ ВЫБОР" : "КАТАЛОГ HUGGE"}</p><h2>{favoritesOnly ? "Избранное" : "Мебель для дома"}</h2></div><span>{filtered.length} товаров</span></header>
        <div className="shop-tools"><div className="category-tabs">{categoryOrder.map(name => <button key={name} className={!favoritesOnly && category === name ? "active" : ""} onClick={() => showCategory(name)}>{name}</button>)}</div><label><span>Поиск</span><input ref={searchInput} value={query} onChange={e => setQuery(e.target.value)} placeholder="Название или артикул"/></label></div>
        <div className="shop-grid">{filtered.map(item => <article key={item.sku}><button className="favorite-button" onClick={() => toggleFavorite(item.sku)} aria-label={favorites.includes(item.sku) ? `Удалить ${item.name} из избранного` : `Добавить ${item.name} в избранное`}>{favorites.includes(item.sku) ? "♥" : "♡"}</button><button className="product-photo" onClick={() => openProduct(item)}>{item.images[0] ? <img src={item.images[0]} alt={item.name} loading="lazy"/> : <i>H</i>}<b className={item.demoAvailable ? "ready" : ""}>{item.demoAvailable ? "AR ДОСТУПЕН" : "3D ГОТОВИТСЯ"}</b></button><small>{item.category} · {item.sku}</small><button className="product-name" onClick={() => openProduct(item)}>{item.name}</button><span>{dimensions(item)}</span><footer><strong>{item.price || "Цена по запросу"}</strong><button onClick={() => addToCart(item.sku, item.selectedVariantId)} aria-label={`Добавить ${item.name} в корзину`}>＋</button></footer></article>)}</div>
        {!filtered.length && <div className="empty-catalog">{favoritesOnly ? "Добавляйте товары сердечком — они появятся здесь." : "По вашему запросу товаров не найдено."}</div>}
      </section>
    </> : selected ? <section className="product-page">
      <button className="back-to-catalog" onClick={closeProduct}>← Вернуться в каталог</button>
      <div className="product-layout"><div className="product-gallery">
        <div className="main-product-image">
          {activeImage ? <button type="button" className="main-product-image-button" onClick={() => setLightboxOpen(true)} aria-label={`Открыть фотографию ${activeImageIndex + 1} товара ${activeProductName}`}><img src={activeImage} alt={`${activeProductName}, фото ${activeImageIndex + 1}`}/></button> : <div className="missing-product-image">Фотография готовится</div>}
          <span className={selected.demoAvailable ? "ready" : ""}>{selected.demoAvailable ? "AR ДОСТУПЕН" : statusLabels[selected.modelStatus]}</span>
          {galleryImages.length > 1 && <div className="gallery-arrows"><button type="button" onClick={showPreviousImage} aria-label="Предыдущая фотография">←</button><span>{activeImageIndex + 1} / {galleryImages.length}</span><button type="button" onClick={showNextImage} aria-label="Следующая фотография">→</button></div>}
        </div>
        {galleryImages.length > 1 && <div className="product-thumbs" aria-label="Фотографии товара">{galleryImages.map((image, index) => <button type="button" className={index === activeImageIndex ? "active" : ""} onClick={() => index === activeImageIndex ? setLightboxOpen(true) : setActiveImageIndex(index)} aria-label={`Показать фотографию ${index + 1}`} aria-current={index === activeImageIndex ? "true" : undefined} key={image}><img src={image} alt={`${activeProductName}, миниатюра ${index + 1}`}/></button>)}</div>}
      </div>
      <div className="product-copy"><p>{selected.category} / {selectedVariant?.sku || selected.sku}</p><h1>{activeProductName}</h1><strong>{selected.price || "Цена по запросу"}</strong><p className="stock-line"><i/> В наличии у поставщика</p>{selected.variants.length > 0 && <div className="store-variant-picker"><small>Цвет</small><div>{selected.variants.map(variant => <button type="button" key={variant.id} className={selectedVariant?.id === variant.id ? "active" : ""} disabled={!variant.available} onClick={() => { setSelectedVariantId(variant.id); setActiveImageIndex(0); setLightboxOpen(false); }}><i style={{ background: variant.color }}/><span>{variant.colorName}</span></button>)}</div></div>}<dl><div><dt>Материал</dt><dd>{selectedVariant?.material || selected.material || "Уточняется"}</dd></div><div><dt>Габариты</dt><dd>{dimensions(selected)}</dd></div><div><dt>3D-модель</dt><dd>{selected.demoAvailable ? "Геометрия, текстуры и масштаб проверены" : statusLabels[selected.modelStatus] ?? selected.modelStatus}</dd></div></dl>{selected.demoAvailable ? <div className="product-ar-card"><div><small>ПРИМЕРКА В ИНТЕРЬЕРЕ</small><b>Посмотрите товар у себя</b><span>Сначала откроется 3D-модель — её можно вращать и приближать. Затем нажмите «Посмотреть у себя».</span></div><div id="mirrai-demo-slot" className="mirrai-demo-slot" key={`${selected.sku}-${selectedVariant?.id ?? "default"}`}/></div> : <button className="model-pending" disabled>AR появится после повторной проверки 3D-модели</button>}<button className="primary-cart" onClick={() => addToCart(selected.sku, selectedVariant?.id)}>Добавить в корзину <span>→</span></button><p className="product-explainer">{selected.demoAvailable ? "Модель соответствует выбранному товару и цвету. В AR размер фиксируется по габаритам из каталога." : "Эта модель не показывается покупателю, пока геометрия и текстуры не пройдут визуальную проверку."}</p><div className="store-event"><i/><span>{event}</span></div></div></div>
      <section className="product-description"><h2>О товаре</h2><p>Оригинальный товар HUGGE из коллекции Actona. Фотографии, цена и характеристики синхронизированы с карточкой магазина; 3D-модель проходит отдельную проверку геометрии, материалов и масштаба.</p>{selected.sourceUrl && <a href={selected.sourceUrl} target="_blank" rel="noreferrer">Карточка на HUGGE ↗</a>}</section>
      {selected.demoAvailable && <button type="button" className="mobile-ar-cta" onClick={launchProductViewer}><span><small>3D + AR · масштаб 1:1</small>Посмотреть у себя</span><b>→</b></button>}
    </section> : null}

    {lightboxOpen && activeImage && <dialog open className="photo-lightbox" aria-label={`Фотографии товара ${activeProductName}`} onTouchStart={touchEvent => { touchStartX.current = touchEvent.touches[0]?.clientX ?? null; }} onTouchEnd={touchEvent => finishSwipe(touchEvent.changedTouches[0]?.clientX ?? 0)}><div className="photo-lightbox-content"><button type="button" className="lightbox-close" onClick={() => setLightboxOpen(false)} aria-label="Закрыть фотографию">Закрыть ×</button>{galleryImages.length > 1 && <button type="button" className="lightbox-previous" onClick={showPreviousImage} aria-label="Предыдущая фотография">←</button>}<img src={activeImage} alt={`${activeProductName || "Товар"}, увеличенное фото ${activeImageIndex + 1}`}/>{galleryImages.length > 1 && <button type="button" className="lightbox-next" onClick={showNextImage} aria-label="Следующая фотография">→</button>}<span>{activeImageIndex + 1} / {galleryImages.length}</span></div></dialog>}

    {cartOpen && <><button type="button" className="cart-backdrop" onClick={() => setCartOpen(false)} aria-label="Закрыть корзину"/><aside className="store-cart" aria-label="Корзина"><header><div><p>ВАШ ЗАКАЗ</p><h2>Корзина</h2></div><button type="button" onClick={() => setCartOpen(false)} aria-label="Закрыть корзину">×</button></header>{cartLines.length ? <><div className="cart-lines">{cartLines.map(({ key, item, variant, quantity }) => { const lineName = productName(item, variant); return <article key={key}>{(variant?.image || item.images[0]) && <img src={variant?.image || item.images[0]} alt=""/>}<div><button type="button" onClick={() => { setCartOpen(false); openProduct(item); setSelectedVariantId(variant?.id ?? ""); }}>{lineName}</button><span>{item.price}</span><div><button type="button" onClick={() => removeFromCart(key)} aria-label={`Уменьшить количество ${lineName}`}>−</button><b>{quantity}</b><button type="button" onClick={() => addToCart(item.sku, variant?.id)} aria-label={`Увеличить количество ${lineName}`}>＋</button><button type="button" onClick={() => removeCartLine(key)}>Удалить</button></div></div></article>; })}</div><footer><span>Итого</span><strong>{cartTotal.toLocaleString("ru-RU")} Lei</strong><button type="button" onClick={() => setCheckoutMessage("В рабочей интеграции покупатель перейдёт в обычное оформление заказа HUGGE.")}>Перейти к оформлению <span>→</span></button>{checkoutMessage && <em>{checkoutMessage}</em>}<small>Демонстрационная корзина. На сайте HUGGE используется штатное оформление заказа.</small></footer></> : <div className="empty-cart"><b>Корзина пуста</b><span>Добавьте мебель из каталога, чтобы продолжить.</span><button type="button" onClick={() => { setCartOpen(false); showCategory("Все"); }}>Смотреть каталог</button></div>}</aside></>}

    <section className="integration-card"><div><p>HUGGE × MIRRAI</p><h2>Один каталог.<br/>Один AR-виджет.</h2></div><div><p>Товары связываются по SKU. Магазин управляет каталогом как обычно, а MIRRAI автоматически показывает кнопку примерки только там, где готова и проверена соответствующая 3D-модель.</p><code>SKU → фото → GLB → проверка → AR</code></div></section>
    <footer className="demo-footer"><b>HUGGE.MD</b><span>Концепт демонстрирует интеграцию MIRRAI и не является официальным сайтом магазина.</span><a href="/">Технология MIRRAI ↗</a></footer>
  </main>;
}
