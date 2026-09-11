"use client";
/* eslint-disable @next/next/no-img-element -- catalog images are supplied by the merchant */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { MultiObjectAR, type ARSceneItem } from "./multi-object-ar";

type Variant = { id: string; sku: string; colorName: string; image: string | null; model: string | null; available: boolean; default: boolean };
type CatalogItem = { sku: string; name: string; category: string; images: string[]; model: string | null; demoAvailable: boolean; width: number | null; height: number | null; depth: number | null; variants: Variant[]; selectedVariantId: string | null };
type CatalogData = { shop: { name: string; slug: string }; items: CatalogItem[] };
type PlacedItem = { key: string; sku: string; variantId: string; x: number; z: number; rotation: number };
type ModelViewerElement = HTMLElement & { activateAR?: () => Promise<void> };

function safeShopSlug(value: string | null) { return /^[a-z0-9-]{3,64}$/i.test(value || "") ? value! : "hugge-md"; }
function storageKey(shop: string) { return `mirrai-room-${shop}`; }

function resolveProduct(data: CatalogData | null, placed: PlacedItem) {
  const product = data?.items.find(item => item.sku === placed.sku);
  const variant = product?.variants.find(item => item.id === placed.variantId && item.available) ?? product?.variants.find(item => item.default && item.available);
  return { product, variant, model: variant?.model || product?.model || null, image: variant?.image || product?.images[0] || "", name: variant && product && product.variants.length > 1 ? `${product.name} — ${variant.colorName}` : product?.name || placed.sku };
}

function initialKeys(shop: string) {
  const params = new URLSearchParams(window.location.search);
  const requested = (params.get("items") || "").split(",").map(value => value.trim()).filter(Boolean);
  if (requested.length) return requested.slice(0, 5);
  try { return (JSON.parse(localStorage.getItem(storageKey(shop)) || "[]") as string[]).slice(0, 5); } catch { return []; }
}

export default function RoomPage() {
  const [data, setData] = useState<CatalogData | null>(null);
  const [shopSlug, setShopSlug] = useState("hugge-md");
  const [items, setItems] = useState<PlacedItem[]>([]);
  const [compositeUrl, setCompositeUrl] = useState("");
  const [status, setStatus] = useState("Выберите мебель для комнаты");
  const [selectedKey, setSelectedKey] = useState("");
  const viewerRef = useRef<ModelViewerElement>(null);

  useEffect(() => {
    import("@google/model-viewer");
    const shop = safeShopSlug(new URLSearchParams(window.location.search).get("shop"));
    fetch(`/api/storefront/catalog?shop=${encodeURIComponent(shop)}`, { cache: "no-store" }).then(response => response.ok ? response.json() : Promise.reject()).then((catalog: CatalogData) => {
      setShopSlug(shop); setData(catalog);
      const requested = initialKeys(shop);
      const fallback = catalog.items.filter(item => item.demoAvailable && item.model).slice(0, 3).map(item => item.sku);
      const keys = requested.length ? requested : fallback;
      const placed = keys.flatMap((key, index): PlacedItem[] => {
        const [sku, variantId = ""] = key.split("::");
        return catalog.items.some(item => item.sku === sku) ? [{ key, sku, variantId, x: (index - (keys.length - 1) / 2) * 1.25, z: index % 2 ? .45 : 0, rotation: 0 }] : [];
      });
      setItems(placed); setSelectedKey(placed[0]?.key || "");
    }).catch(() => setStatus("Каталог временно недоступен"));
  }, []);

  useEffect(() => {
    if (!data || !items.length) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setStatus("Собираем композицию…");
      try {
        const [THREE, loaderModule, exporterModule, dracoModule] = await Promise.all([import("three"), import("three/examples/jsm/loaders/GLTFLoader.js"), import("three/examples/jsm/exporters/GLTFExporter.js"), import("three/examples/jsm/loaders/DRACOLoader.js")]);
        const loader = new loaderModule.GLTFLoader();
        const draco = new dracoModule.DRACOLoader(); draco.setDecoderPath("/draco/"); loader.setDRACOLoader(draco);
        const group = new THREE.Group();
        const skipped: string[] = [];
        for (const placed of items) {
          const resolved = resolveProduct(data, placed);
          if (!resolved.model || !resolved.product) continue;
          let gltf;
          try { gltf = await loader.loadAsync(new URL(resolved.model, window.location.origin).toString()); }
          catch { skipped.push(resolved.name); continue; }
          const object = gltf.scene.clone(true);
          const sourceBox = new THREE.Box3().setFromObject(object);
          const sourceSize = sourceBox.getSize(new THREE.Vector3());
          const width = (resolved.product.width || 80) / 100;
          const height = (resolved.product.height || 80) / 100;
          const depth = (resolved.product.depth || resolved.product.width || 80) / 100;
          object.scale.set(width / Math.max(sourceSize.x, .001), height / Math.max(sourceSize.y, .001), depth / Math.max(sourceSize.z, .001));
          object.rotation.y = THREE.MathUtils.degToRad(placed.rotation);
          const scaledBox = new THREE.Box3().setFromObject(object);
          const center = scaledBox.getCenter(new THREE.Vector3());
          object.position.set(placed.x - center.x, -scaledBox.min.y, placed.z - center.z);
          object.name = resolved.name;
          group.add(object);
        }
        draco.dispose();
        if (!group.children.length) throw new Error("no_models_loaded");
        const exporter = new exporterModule.GLTFExporter();
        const buffer = await exporter.parseAsync(group, { binary: true, onlyVisible: true, maxTextureSize: 2048 });
        if (cancelled || !(buffer instanceof ArrayBuffer)) return;
        const nextUrl = URL.createObjectURL(new Blob([buffer], { type: "model/gltf-binary" }));
        setCompositeUrl(previous => { if (previous.startsWith("blob:")) URL.revokeObjectURL(previous); return nextUrl; });
        const readyCount = group.children.length;
        setStatus(skipped.length ? `${readyCount} готовы · ${skipped.length} пропущено` : `${readyCount} ${readyCount === 1 ? "предмет" : readyCount < 5 ? "предмета" : "предметов"} готовы к размещению`);
      } catch { if (!cancelled) setStatus("Не удалось собрать сцену. Удалите проблемный товар и повторите."); }
    }, 180);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [data, items]);

  useEffect(() => () => { if (compositeUrl.startsWith("blob:")) URL.revokeObjectURL(compositeUrl); }, [compositeUrl]);

  const selected = items.find(item => item.key === selectedKey) ?? items[0];
  const selectedProduct = selected ? resolveProduct(data, selected) : null;
  const arItems = useMemo(() => items.flatMap((item): ARSceneItem[] => { const resolved = resolveProduct(data, item); return resolved.product && resolved.model ? [{ key: item.key, name: resolved.name, model: resolved.model, width: (resolved.product.width || 80) / 100, height: (resolved.product.height || 80) / 100, depth: (resolved.product.depth || resolved.product.width || 80) / 100, x: item.x, z: item.z, rotation: item.rotation }] : []; }), [data, items]);
  const available = useMemo(() => data?.items.filter(item => item.demoAvailable && item.model && !items.some(placed => placed.sku === item.sku)).slice(0, 12) ?? [], [data, items]);

  function persist(next: PlacedItem[]) {
    setItems(next);
    if (!next.length) setCompositeUrl(previous => { if (previous.startsWith("blob:")) URL.revokeObjectURL(previous); return ""; });
    localStorage.setItem(storageKey(shopSlug), JSON.stringify(next.map(item => item.key)));
  }
  function addProduct(product: CatalogItem) {
    if (items.length >= 5) { setStatus("Для мобильного AR можно разместить до пяти предметов"); return; }
    const variant = product.variants.find(item => item.default && item.available) ?? product.variants.find(item => item.available);
    const key = variant ? `${product.sku}::${variant.id}` : product.sku;
    const next = [...items, { key, sku: product.sku, variantId: variant?.id || "", x: (items.length - 1) * .8, z: items.length % 2 ? .65 : 0, rotation: 0 }];
    persist(next); setSelectedKey(key);
  }
  function updateSelected(change: Partial<PlacedItem>) { if (selected) persist(items.map(item => item.key === selected.key ? { ...item, ...change } : item)); }
  function removeSelected() { if (!selected) return; const next = items.filter(item => item.key !== selected.key); persist(next); setSelectedKey(next[0]?.key || ""); }
  function applyLayout() {
    persist(items.map((item, index) => ({ ...item, x: (index - (items.length - 1) / 2) * 1.15, z: index % 2 ? .65 : 0, rotation: index % 2 ? -12 : 8 })));
  }
  async function openAR() {
    if (!compositeUrl) return;
    setStatus("Наведите камеру на свободный участок пола…");
    try { await viewerRef.current?.activateAR?.(); } catch { setStatus("Откройте страницу в Safari на iPhone или Chrome на Android"); }
  }

  return <main className="room-builder">
    <nav className="room-nav"><a href={`/demo-store?shop=${encodeURIComponent(shopSlug)}`}>← В магазин</a><b>MIRR<span>AI</span> / КОМНАТА</b><span>{items.length}/5 предметов</span></nav>
    <section className="room-workspace">
      <aside className="room-catalog"><header><p>КАТАЛОГ {data?.shop.name || "МАГАЗИНА"}</p><h1>Соберите интерьер</h1><span>Доступны только опубликованные модели этого магазина. Добавьте до пяти предметов.</span></header><div>{available.map(product => <button type="button" key={product.sku} onClick={() => addProduct(product)}>{product.images[0] && <img src={product.images[0]} alt=""/>}<span><b>{product.name}</b><small>{product.category}</small></span><i>＋</i></button>)}</div></aside>
      <section className="room-stage">
        {compositeUrl ? React.createElement("model-viewer", { key: compositeUrl, ref: viewerRef, src: compositeUrl, alt: "Композиция мебели HUGGE в реальном масштабе", ar: true, "ar-modes": "webxr scene-viewer quick-look", "ar-placement": "floor", "ar-scale": "fixed", "camera-controls": true, "shadow-intensity": ".9", "shadow-softness": ".85", exposure: "1", "environment-image": "neutral", "tone-mapping": "neutral", "camera-orbit": "35deg 67deg auto", "field-of-view": "28deg" }) : <div className="room-empty"><b>Комната пуста</b><span>Добавьте мебель из каталога слева</span></div>}
        <div className="room-stage-label"><span>КОМПОЗИЦИЯ · МАСШТАБ 1:1</span><b>{status}</b></div>
      </section>
      <aside className="room-controls"><header><p>ПРЕДМЕТЫ В КОМНАТЕ</p><button type="button" onClick={applyLayout} disabled={items.length < 2}>Расставить автоматически</button></header><div className="room-items">{items.map(item => { const resolved = resolveProduct(data, item); return <button type="button" key={item.key} className={item.key === selected?.key ? "active" : ""} onClick={() => setSelectedKey(item.key)}>{resolved.image && <img src={resolved.image} alt=""/>}<span><b>{resolved.name}</b><small>{item.x.toFixed(1)} м · {item.z.toFixed(1)} м · {item.rotation}°</small></span></button>; })}</div>{selected && <div className="transform-controls"><p>{selectedProduct?.name}</p><span>Перемещение по полу</span><div><button type="button" onClick={() => updateSelected({ z: selected.z - .2 })}>↑</button><button type="button" onClick={() => updateSelected({ x: selected.x - .2 })}>←</button><button type="button" onClick={() => updateSelected({ z: selected.z + .2 })}>↓</button><button type="button" onClick={() => updateSelected({ x: selected.x + .2 })}>→</button></div><span>Поворот</span><div className="rotate-controls"><button type="button" onClick={() => updateSelected({ rotation: selected.rotation - 15 })}>↶ 15°</button><button type="button" onClick={() => updateSelected({ rotation: selected.rotation + 15 })}>15° ↷</button></div><button type="button" className="remove-room-item" onClick={removeSelected}>Убрать из комнаты</button></div>}<MultiObjectAR items={arItems} onFallback={openAR} onStatus={setStatus}/><small className="room-privacy">В многoобъектном AR каждый предмет двигается отдельно. Сцена и камера остаются на устройстве.</small></aside>
    </section>
  </main>;
}
