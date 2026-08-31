"use client";
/* eslint-disable @next/next/no-img-element -- merchant catalog images are data-driven */

import { useEffect, useMemo, useState } from "react";

type CatalogVariant = { id: string; sku: string; name: string; colorName: string; color: string; material: string; image: string | null; model: string | null; iosModel: string | null; default: boolean; available: boolean; published: boolean };
type CatalogItem = { id: string; sku: string; name: string; category: string; price: string; material: string; color: string; width: number | null; height: number | null; depth: number | null; sourceUrl: string | null; images: string[]; variants: CatalogVariant[]; selectedVariantId: string | null; modelStatus: string; modelMessage: string; model: string | null; iosModel: string | null; demoAvailable: boolean; published: boolean };
type CatalogData = { shop: { name: string; slug: string }; counts: { total: number; withModel: number; published: number }; items: CatalogItem[] };
type WidgetInstance = { destroy?: () => void };
declare global { interface Window { MirraiWidget?: { mount: (config: Record<string, unknown>) => WidgetInstance } } }

const statusLabels: Record<string, string> = { review: "3D на проверке", ready: "3D готова", published: "AR доступен", processing: "Создаётся", queued: "В очереди", missing: "3D готовится", failed: "Нужна повторная генерация" };
const categoryOrder = ["Все", "Кресла", "Диваны", "Стулья", "Столы", "Тумбы"];
function dimensions(item: CatalogItem) { return item.width && item.depth && item.height ? `${item.width} × ${item.depth} × ${item.height} см` : "Размеры уточняются"; }

export function DemoStore() {
  const [data, setData] = useState<CatalogData | null>(null);
  const [selectedSku, setSelectedSku] = useState("");
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [category, setCategory] = useState("Все");
  const [query, setQuery] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [cart, setCart] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [event, setEvent] = useState("Выберите товар с готовой 3D-моделью");

  useEffect(() => {
    fetch("/api/storefront/catalog?shop=hugge-md", { cache: "no-store" }).then(response => response.ok ? response.json() : Promise.reject()).then((catalog: CatalogData) => {
      setData(catalog);
      setSelectedSku(catalog.items.find(item => item.demoAvailable)?.sku ?? catalog.items[0]?.sku ?? "");
    }).catch(() => setEvent("Каталог временно недоступен"));
  }, []);

  const selected = useMemo(() => data?.items.find(item => item.sku === selectedSku) ?? data?.items[0], [data, selectedSku]);
  const selectedVariant = selected?.variants.find(variant => variant.id === selectedVariantId && variant.available) ?? selected?.variants.find(variant => variant.id === selected.selectedVariantId && variant.available) ?? selected?.variants.find(variant => variant.default && variant.available) ?? selected?.variants.find(variant => variant.available);
  const filtered = useMemo(() => data?.items.filter(item => (category === "Все" || item.category === category) && (!query.trim() || `${item.name} ${item.sku}`.toLowerCase().includes(query.trim().toLowerCase()))) ?? [], [data, category, query]);
  useEffect(() => { if (selected) queueMicrotask(() => setSelectedVariantId(selectedVariant?.id ?? "")); }, [selected, selectedVariant?.id]);

  useEffect(() => {
    if (!detailOpen || !selected?.demoAvailable || !selected.model) return;
    const onEvent = (message: Event) => { const detail = (message as CustomEvent<{ event?: string }>).detail; const labels: Record<string, string> = { widget_open: "Покупатель открыл виджет", model_ready: "3D-модель загружена", ar_open: "Покупатель запустил AR", object_placed: "Товар размещён в комнате" }; if (detail?.event) setEvent(labels[detail.event] || detail.event); };
    window.addEventListener("mirrai:event", onEvent);
    let instance: WidgetInstance | undefined;
    const mount = () => { instance = window.MirraiWidget?.mount({ target: "#mirrai-demo-slot", shopId: "hugge-md", sku: selected.sku, productId: selected.id, name: selected.name, category: selected.category, material: selectedVariant?.material || selected.material || "Материал уточняется", price: selected.price, color: selectedVariant?.color || selected.color, model: selectedVariant?.model || selected.model!, iosModel: selectedVariant?.iosModel || selected.iosModel || "", variants: selected.variants, selectedVariantId: selectedVariant?.id || "", width: String(selected.width || 80), height: String(selected.height || 80), depth: String(selected.depth || 80), label: "Посмотреть у себя" }); setEvent("AR-виджет готов"); };
    let script = document.querySelector<HTMLScriptElement>("script[data-mirrai-demo]");
    if (window.MirraiWidget) mount(); else if (!script) { script = document.createElement("script"); script.src = "/mirrai-widget.js"; script.dataset.auto = "false"; script.dataset.mirraiDemo = "true"; script.onload = mount; document.body.appendChild(script); } else script.addEventListener("load", mount, { once: true });
    return () => { window.removeEventListener("mirrai:event", onEvent); instance?.destroy?.(); script?.removeEventListener("load", mount); };
  }, [detailOpen, selected, selectedVariant]);

  function openProduct(item: CatalogItem) { setSelectedSku(item.sku); setSelectedVariantId(""); setDetailOpen(true); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function toggleFavorite(sku: string) { setFavorites(value => value.includes(sku) ? value.filter(item => item !== sku) : [...value, sku]); }
  function addToCart(sku: string) { setCart(value => [...value, sku]); setEvent("Товар добавлен в корзину"); }

  return <main className="store-demo hugge-demo">
    <div className="demo-ribbon">Демонстрация интеграции HUGGE × MIRRAI — не официальный сайт магазина</div>
    <nav className="store-nav">
      <button className="store-menu" aria-label="Открыть меню">☰</button><a href="/demo-store" className="store-logo">HUGGE<span>.MD</span></a>
      <div className="store-main-links">{categoryOrder.slice(1).map(name => <button key={name} onClick={() => { setCategory(name); setDetailOpen(false); }}>{name}</button>)}</div>
      <div className="store-actions"><button onClick={() => setQuery(query ? "" : " ")} aria-label="Поиск">⌕</button><button aria-label="Избранное">♡ <b>{favorites.length || ""}</b></button><button aria-label="Корзина">Корзина <b>{cart.length}</b></button></div>
    </nav>

    {!detailOpen ? <>
      <header className="hugge-hero"><div><p>НОВАЯ КОЛЛЕКЦИЯ · ACTONA</p><h1>Мебель, которую<br/>можно увидеть дома</h1><span>Выберите предмет, откройте карточку и разместите готовую 3D-модель в интерьере в реальном масштабе.</span><button onClick={() => document.querySelector(".shop-catalog")?.scrollIntoView({ behavior: "smooth" })}>Смотреть каталог</button></div><div className="hero-product">{data?.items.find(item => item.sku === "HUGGE-89990")?.images[0] && <img src={data.items.find(item => item.sku === "HUGGE-89990")!.images[0]} alt="Кресло Alba"/>}<span>AR<br/>READY</span></div></header>
      <section className="shop-benefits"><span>Доставка по Молдове</span><span>Европейские бренды</span><span>Реальный масштаб в AR</span><span>Актуальные цены</span></section>
      <section className="shop-catalog">
        <header><div><p>КАТАЛОГ HUGGE</p><h2>Мебель для дома</h2></div><span>{filtered.length} товаров</span></header>
        <div className="shop-tools"><div className="category-tabs">{categoryOrder.map(name => <button key={name} className={category === name ? "active" : ""} onClick={() => setCategory(name)}>{name}</button>)}</div><label><span>Поиск</span><input value={query.trimStart()} onChange={e => setQuery(e.target.value)} placeholder="Название или артикул"/></label></div>
        <div className="shop-grid">{filtered.map(item => <article key={item.sku}><button className="favorite-button" onClick={() => toggleFavorite(item.sku)} aria-label="Добавить в избранное">{favorites.includes(item.sku) ? "♥" : "♡"}</button><button className="product-photo" onClick={() => openProduct(item)}>{item.images[0] ? <img src={item.images[0]} alt={item.name} loading="lazy"/> : <i>H</i>}<b className={item.demoAvailable ? "ready" : ""}>{item.demoAvailable ? "AR ДОСТУПЕН" : "3D ГОТОВИТСЯ"}</b></button><small>{item.category} · {item.sku}</small><button className="product-name" onClick={() => openProduct(item)}>{item.name}</button><span>{dimensions(item)}</span><footer><strong>{item.price || "Цена по запросу"}</strong><button onClick={() => addToCart(item.sku)}>＋</button></footer></article>)}</div>
        {!filtered.length && <div className="empty-catalog">По вашему запросу товаров не найдено.</div>}
      </section>
    </> : selected ? <section className="product-page">
      <button className="back-to-catalog" onClick={() => setDetailOpen(false)}>← Вернуться в каталог</button>
      <div className="product-layout"><div className="product-gallery"><div className="main-product-image"><img src={selectedVariant?.image || selected.images[0]} alt={selected.name}/><span className={selected.demoAvailable ? "ready" : ""}>{selected.demoAvailable ? "AR ДОСТУПЕН" : statusLabels[selected.modelStatus]}</span></div>{selected.images.length > 1 && <div className="product-thumbs">{selected.images.map(image => <img src={image} alt="" key={image}/>)}</div>}</div>
      <div className="product-copy"><p>{selected.category} / {selected.sku}</p><h1>{selected.name}</h1><strong>{selected.price || "Цена по запросу"}</strong><p className="stock-line"><i/> В наличии у поставщика</p>{selected.variants.length > 0 && <div className="store-variant-picker"><small>Цвет</small><div>{selected.variants.map(variant => <button type="button" key={variant.id} className={selectedVariant?.id === variant.id ? "active" : ""} disabled={!variant.available} onClick={() => setSelectedVariantId(variant.id)}><i style={{ background: variant.color }}/><span>{variant.colorName}</span></button>)}</div></div>}<dl><div><dt>Материал</dt><dd>{selectedVariant?.material || selected.material || "Уточняется"}</dd></div><div><dt>Габариты</dt><dd>{dimensions(selected)}</dd></div><div><dt>Статус 3D</dt><dd>{statusLabels[selected.modelStatus] ?? selected.modelStatus}</dd></div></dl><button className="primary-cart" onClick={() => addToCart(selected.sku)}>Добавить в корзину <span>→</span></button>{selected.demoAvailable ? <div id="mirrai-demo-slot" className="mirrai-demo-slot" key={`${selected.sku}-${selectedVariant?.id ?? "default"}`}/> : <button className="model-pending" disabled>AR появится после создания 3D-модели</button>}<p className="product-explainer">MIRRAI показывает AR-кнопку только для проверенной модели нужного товара и варианта цвета. Масштаб фиксируется по реальным габаритам.</p><div className="store-event"><i/><span>{event}</span></div></div></div>
      <section className="product-description"><h2>О товаре</h2><p>Оригинальный товар HUGGE из коллекции Actona. Фотографии, цена и характеристики синхронизированы с карточкой магазина; 3D-модель проходит отдельную проверку геометрии, материалов и масштаба.</p>{selected.sourceUrl && <a href={selected.sourceUrl} target="_blank" rel="noreferrer">Карточка на HUGGE ↗</a>}</section>
    </section> : null}

    <section className="integration-card"><div><p>HUGGE × MIRRAI</p><h2>Один каталог.<br/>Один AR-виджет.</h2></div><div><p>Товары связываются по SKU. Магазин управляет каталогом как обычно, а MIRRAI автоматически показывает кнопку примерки только там, где готова и проверена соответствующая 3D-модель.</p><code>SKU → фото → GLB → проверка → AR</code></div></section>
    <footer className="demo-footer"><b>HUGGE.MD</b><span>Демонстрационная витрина для презентации интеграции</span><a href="/">Технология MIRRAI ↗</a></footer>
  </main>;
}
