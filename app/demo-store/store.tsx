"use client";
/* eslint-disable @next/next/no-img-element, @next/next/no-html-link-for-pages -- merchant images are dynamic and full navigation is intentional */

import { useEffect, useMemo, useState } from "react";

type CatalogItem = { id: string; sku: string; name: string; category: string; price: string; material: string; color: string; width: number | null; height: number | null; depth: number | null; sourceUrl: string | null; images: string[]; modelStatus: string; modelMessage: string; model: string | null; iosModel: string | null; demoAvailable: boolean; published: boolean };
type CatalogData = { shop: { name: string; slug: string }; counts: { total: number; withModel: number; published: number }; items: CatalogItem[] };
type WidgetInstance = { destroy?: () => void };

declare global { interface Window { MirraiWidget?: { mount: (config: Record<string, string>) => WidgetInstance } } }

const statusLabels: Record<string, string> = { review: "3D на проверке", ready: "3D готова", published: "AR доступен", processing: "Создаётся", queued: "В очереди", missing: "Нет 3D-модели", failed: "Ошибка модели" };

function dimensions(item: CatalogItem) { return item.width && item.depth && item.height ? `${item.width} × ${item.depth} × ${item.height} см` : "Уточняются"; }

export function DemoStore() {
  const [data, setData] = useState<CatalogData | null>(null);
  const [selectedSku, setSelectedSku] = useState("");
  const [event, setEvent] = useState("Выберите товар с готовой 3D-моделью");
  const [failedImageSku, setFailedImageSku] = useState("");

  useEffect(() => {
    fetch("/api/storefront/catalog?shop=hugge-md", { cache: "no-store" }).then(response => response.ok ? response.json() : Promise.reject()).then((catalog: CatalogData) => { setData(catalog); setSelectedSku(catalog.items.find(item => item.demoAvailable)?.sku ?? catalog.items[0]?.sku ?? ""); }).catch(() => setEvent("Каталог временно недоступен"));
  }, []);

  const selected = useMemo(() => data?.items.find(item => item.sku === selectedSku) ?? data?.items[0], [data, selectedSku]);
  useEffect(() => {
    if (!selected?.demoAvailable || !selected.model) return;
    const onEvent = (message: Event) => { const detail = (message as CustomEvent<{ event?: string }>).detail; const labels: Record<string, string> = { widget_open: "Покупатель открыл виджет", model_ready: "3D-модель загружена", ar_open: "Покупатель запустил AR", object_placed: "Товар размещён в комнате" }; if (detail?.event) setEvent(labels[detail.event] || detail.event); };
    window.addEventListener("mirrai:event", onEvent);
    let instance: WidgetInstance | undefined;
    const mount = () => { instance = window.MirraiWidget?.mount({ target: "#mirrai-demo-slot", shopId: "hugge-md", sku: selected.sku, productId: selected.id, name: selected.name, category: selected.category, material: selected.material || "Материал уточняется", price: selected.price || "Цена на сайте HUGGE", color: selected.color, model: selected.model!, iosModel: selected.iosModel || "", width: String(selected.width || 80), height: String(selected.height || 80), depth: String(selected.depth || 80), label: "Посмотреть у себя" }); setEvent(selected.published ? "AR-виджет готов" : "Демо-модель готова · ожидает проверки материалов"); };
    let script = document.querySelector<HTMLScriptElement>("script[data-mirrai-demo]");
    if (window.MirraiWidget) mount(); else if (!script) { script = document.createElement("script"); script.src = "/mirrai-widget.js"; script.dataset.auto = "false"; script.dataset.mirraiDemo = "true"; script.onload = mount; document.body.appendChild(script); } else script.addEventListener("load", mount, { once: true });
    return () => { window.removeEventListener("mirrai:event", onEvent); instance?.destroy?.(); script?.removeEventListener("load", mount); };
  }, [selected]);

  return <main className="store-demo hugge-demo">
    <nav className="store-nav"><a href="/demo-store" className="store-logo">HUGGE<span>.MD</span></a><div><span>Мебель</span><span>Освещение</span><span>Декор</span></div><a href="/">MIRRAI ↗</a></nav>
    <header className="demo-catalog-head"><div><p>РАБОЧАЯ ВИТРИНА</p><h1>Каталог HUGGE с AR</h1><span>Товары и статусы загружаются из той же базы, что и кабинет магазина.</span></div><dl><div><dt>Товаров</dt><dd>{data?.counts.total ?? "—"}</dd></div><div><dt>Есть 3D</dt><dd>{data?.counts.withModel ?? "—"}</dd></div><div><dt>Опубликовано</dt><dd>{data?.counts.published ?? "—"}</dd></div></dl></header>
    {selected ? <section className="store-product hugge-product"><div className="store-gallery hugge-gallery">{selected.images[0] && failedImageSku !== selected.sku ? <img src={selected.images[0]} alt={selected.name} onError={() => setFailedImageSku(selected.sku)}/> : <div className="store-photo-fallback"><span>HUGGE</span><b>Фото товара недоступно</b><small>Карточка и статус модели получены из каталога</small></div>}<span className={`demo-model-status ${selected.demoAvailable ? "available" : ""}`}>{statusLabels[selected.modelStatus] ?? selected.modelStatus}</span></div><div className="store-info"><p className="store-category">{selected.category} / {selected.sku}</p><h2>{selected.name}</h2><p className="store-description">{selected.material || "Характеристики и материалы загружены из карточки товара HUGGE."}</p><strong className="store-price">{selected.price || "Цена по запросу"}</strong><div className="store-specs"><span><small>Материал</small>{selected.material || "Уточняется"}</span><span><small>Размер</small>{dimensions(selected)}</span><span><small>3D-статус</small>{statusLabels[selected.modelStatus] ?? selected.modelStatus}</span></div><button className="store-cart">Добавить в корзину</button>{selected.demoAvailable ? <div id="mirrai-demo-slot" className="mirrai-demo-slot" key={selected.sku}/> : <button className="model-pending" disabled>AR появится после создания 3D-модели</button>}<p className="store-note">{selected.demoAvailable ? selected.modelMessage : "У товара есть реальная карточка и фотография, но для AR необходимо подготовить GLB-модель и проверить масштаб."}</p><div className="store-event"><i/><span>{event}</span></div>{selected.sourceUrl && <a className="source-product-link" href={selected.sourceUrl} target="_blank" rel="noreferrer">Оригинальная карточка HUGGE ↗</a>}</div></section> : <div className="demo-store-loading">Загружаем реальный каталог HUGGE…</div>}
    <section className="real-catalog"><header><div><p>РЕАЛЬНЫЕ ТОВАРЫ ИЗ БАЗЫ</p><h2>Выберите товар</h2></div><span>AR-кнопка включается только там, где действительно есть GLB-файл.</span></header><div className="real-catalog-grid">{data?.items.map(item => <button className={item.sku === selected?.sku ? "selected" : ""} key={item.sku} onClick={() => setSelectedSku(item.sku)}><span className="catalog-photo">{item.images[0] ? <img src={item.images[0]} alt="" loading="lazy"/> : <i>H</i>}<b className={item.demoAvailable ? "ready" : ""}>{item.demoAvailable ? "3D" : "ФОТО"}</b></span><small>{item.category}</small><strong>{item.name}</strong><em>{dimensions(item)}</em><span className="catalog-model-state">{statusLabels[item.modelStatus] ?? item.modelStatus}</span></button>)}</div></section>
    <section className="integration-card"><div><p>ДЕМОНСТРАЦИЯ ДЛЯ МАГАЗИНА</p><h2>Один каталог.<br/>Один виджет.</h2></div><div><p>Магазин передаёт товары и фотографии. MIRRAI связывает SKU с проверенной 3D-моделью, показывает AR только готовым товарам и обновляет витрину без ручной правки сайта.</p><code>shopId: hugge-md<br/>SKU → фото → GLB → проверка → AR</code></div></section>
  </main>;
}
