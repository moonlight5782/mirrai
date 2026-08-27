"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type ModelStatus = "missing" | "queued" | "processing" | "review" | "ready" | "published" | "failed";
type CatalogItem = { id: number; sku: string; name: string; category: string; price: string; material: string; widthCm: number | null; heightCm: number | null; depthCm: number | null; model: { status: ModelStatus; glbUrl: string | null; usdzUrl: string | null; validationMessage: string | null; qualityScore: number | null } };
type CatalogData = { shop: { name: string; slug: string; subscriptionStatus: string }; counts: { total: number; ready: number; processing: number; review: number; missing: number; failed: number }; items: CatalogItem[] };

const statusLabels: Record<ModelStatus, string> = { missing: "Нет модели", queued: "В очереди", processing: "Создаётся", review: "Нужна проверка", ready: "Готова", published: "Опубликована", failed: "Ошибка" };
const filterOptions = [{ value: "all", label: "Все" }, { value: "published", label: "Опубликованы" }, { value: "processing", label: "В работе" }, { value: "review", label: "На проверке" }, { value: "missing", label: "Без модели" }, { value: "failed", label: "Ошибки" }];

export function CatalogAdmin({ displayName }: { displayName: string }) {
  const [data, setData] = useState<CatalogData | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<CatalogItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [uploading, setUploading] = useState("");
  const [assetUrls, setAssetUrls] = useState<{ glb?: string; usdz?: string }>({});
  const [shopSlug] = useState(() => typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("shop") ?? "");

  const load = useCallback(async () => {
    try { const response = await fetch(`/api/admin/catalog${shopSlug ? `?shop=${encodeURIComponent(shopSlug)}` : ""}`); if (!response.ok) throw new Error(); setData(await response.json()); setError(""); }
    catch { setError("Не удалось загрузить каталог. Обновите страницу."); }
  }, [shopSlug]);
  useEffect(() => { queueMicrotask(() => void load()); }, [load]);

  const visible = useMemo(() => (data?.items ?? []).filter(item => {
    const statusMatch = filter === "all" || (filter === "processing" ? ["queued", "processing"].includes(item.model.status) : item.model.status === filter);
    const text = `${item.name} ${item.sku} ${item.category}`.toLowerCase();
    return statusMatch && text.includes(query.trim().toLowerCase());
  }), [data, filter, query]);

  async function saveModel(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!editing) return;
    const form = new FormData(event.currentTarget); setSaving(true); setError("");
    const response = await fetch("/api/admin/catalog", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ shop: data?.shop.slug, productId: editing.id, status: form.get("status"), glbUrl: form.get("glbUrl"), usdzUrl: form.get("usdzUrl"), validationMessage: form.get("validationMessage") }) });
    if (!response.ok) { const result = await response.json().catch(() => ({})); setError(result.error === "glb_required_for_publish" ? "Для публикации нужен GLB-файл." : "Изменения не сохранены."); setSaving(false); return; }
    setEditing(null); setSaving(false); await load();
  }

  async function importCatalog(file?: File) { if (!file || !data) return; setImporting(true); setError(""); const form = new FormData(); form.append("file", file); form.append("shop", data.shop.slug); const response = await fetch("/api/admin/catalog/import", { method: "POST", body: form }); const result = await response.json().catch(() => ({})); if (!response.ok) setError(result.error === "headers_required" ? "В CSV обязательны колонки SKU и name/название." : "Не удалось импортировать CSV."); else setError(result.errors?.length ? `Импортировано: ${result.imported}. ${result.errors[0]}` : ""); setImporting(false); await load(); }
  async function uploadAsset(file: File | undefined, kind: "glb" | "usdz") { if (!file || !editing || !data) return; setUploading(kind); const form = new FormData(); form.append("file", file); form.append("kind", kind); form.append("productId", String(editing.id)); form.append("shop", data.shop.slug); const response = await fetch("/api/admin/assets", { method: "POST", body: form }); const result = await response.json().catch(() => ({})); if (response.ok) setAssetUrls(current => ({ ...current, [kind]: result.url })); else setError("Файл не загружен. Допустимы GLB/USDZ до 50 МБ."); setUploading(""); }

  return <main className="admin-shell">
    <aside className="admin-sidebar"><Link href="/" className="admin-brand">MIRR<span>AI</span></Link><nav><b>Управление</b><Link href="/admin/clients">Клиенты</Link><Link href={`/admin/setup${shopSlug ? `?shop=${shopSlug}` : ""}`}>Мастер установки</Link><a className="active" href="#catalog">Каталог моделей</a><Link href={`/admin/analytics${shopSlug ? `?shop=${shopSlug}` : ""}`}>Аналитика</Link><b>Магазин</b><Link href={`/admin/setup${shopSlug ? `?shop=${shopSlug}` : ""}`}>Интеграция</Link><a href="#subscription">Подписка</a></nav><div><small>Администратор</small><span>{displayName}</span></div></aside>
    <section className="admin-main" id="catalog">
      <header className="admin-head"><div><p>КАТАЛОГ / 3D-ПОКРЫТИЕ</p><h1>Модели товаров</h1></div><div className="admin-head-actions"><a href="/mirrai-catalog-template.csv" download>Шаблон CSV</a><label className="admin-primary">{importing ? "Импортируем…" : "Импорт CSV"}<input type="file" accept=".csv,text/csv" disabled={importing} onChange={event => void importCatalog(event.target.files?.[0])}/></label><Link href="/demo-store">Открыть демо ↗</Link></div></header>
      {data ? <><div className="admin-shop"><div><i/><span><strong>{data.shop.name}</strong><small>shopId: {data.shop.slug}</small></span></div><b className={`subscription ${data.shop.subscriptionStatus}`}>{data.shop.subscriptionStatus === "active" ? "Подписка активна" : data.shop.subscriptionStatus}</b></div>
      <div className="admin-stats"><article><span>Всего SKU</span><strong>{data.counts.total}</strong></article><article><span>Готовы к AR</span><strong>{data.counts.ready}</strong></article><article><span>В обработке</span><strong>{data.counts.processing}</strong></article><article><span>Нужна проверка</span><strong>{data.counts.review}</strong></article><article><span>Без модели</span><strong>{data.counts.missing}</strong></article></div>
      <div className="coverage"><span><i style={{ width: `${data.counts.total ? data.counts.ready / data.counts.total * 100 : 0}%` }}/></span><p><strong>{data.counts.total ? Math.round(data.counts.ready / data.counts.total * 100) : 0}%</strong> каталога доступно покупателям в AR</p></div>
      <div className="admin-tools"><label><span>⌕</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Поиск по товару или SKU"/></label><div>{filterOptions.map(option => <button key={option.value} className={filter === option.value ? "active" : ""} onClick={() => setFilter(option.value)}>{option.label}</button>)}</div></div>
      <div className="catalog-table"><div className="catalog-row catalog-header"><span>Товар</span><span>SKU</span><span>Габариты</span><span>Файлы</span><span>Статус</span><span/></div>{visible.map(item => <div className="catalog-row" key={item.id}><span className="admin-product"><i/><b>{item.name}<small>{item.category} · {item.material}</small></b></span><span className="sku">{item.sku}</span><span>{item.widthCm && item.depthCm && item.heightCm ? `${item.widthCm} × ${item.depthCm} × ${item.heightCm}` : <em>Не указаны</em>}</span><span className="asset-flags"><b className={item.model.glbUrl ? "ready" : ""}>GLB</b><b className={item.model.usdzUrl ? "ready" : ""}>USDZ</b></span><span><b className={`status status-${item.model.status}`}><i/>{statusLabels[item.model.status]}</b><small className="validation">{item.model.validationMessage}</small></span><span><button className="row-action" onClick={() => { setEditing(item); setAssetUrls({}); }}>Изменить</button></span></div>)}</div></> : <div className="admin-loading">{error || "Загружаем каталог…"}</div>}
      {error && data && <p className="admin-error">{error}</p>}
    </section>
    {editing && <div className="edit-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setEditing(null); }}><form className="edit-model" onSubmit={saveModel}><header><div><p>МОДЕЛЬ ТОВАРА</p><h2>{editing.name}</h2><small>{editing.sku}</small></div><button type="button" onClick={() => setEditing(null)}>×</button></header><label>Статус<select name="status" defaultValue={editing.model.status}>{Object.entries(statusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><div className="asset-upload-grid"><label>Загрузить GLB<input type="file" accept=".glb,model/gltf-binary" onChange={event => void uploadAsset(event.target.files?.[0], "glb")}/><span>{uploading === "glb" ? "Загрузка…" : assetUrls.glb ? "Загружен ✓" : "До 50 МБ"}</span></label><label>Загрузить USDZ<input type="file" accept=".usdz,model/vnd.usdz+zip" onChange={event => void uploadAsset(event.target.files?.[0], "usdz")}/><span>{uploading === "usdz" ? "Загрузка…" : assetUrls.usdz ? "Загружен ✓" : "Для iPhone"}</span></label></div><label>GLB URL<input name="glbUrl" value={assetUrls.glb ?? editing.model.glbUrl ?? ""} onChange={event => setAssetUrls(current => ({ ...current, glb: event.target.value }))} placeholder="https://cdn…/model.glb"/></label><label>USDZ URL для iPhone<input name="usdzUrl" value={assetUrls.usdz ?? editing.model.usdzUrl ?? ""} onChange={event => setAssetUrls(current => ({ ...current, usdz: event.target.value }))} placeholder="https://cdn…/model.usdz"/></label><label>Результат проверки<textarea name="validationMessage" defaultValue={editing.model.validationMessage ?? ""}/></label><p>После загрузки модель получает статус «Нужна проверка». Публикуйте её только после проверки масштаба и материалов.</p><button className="save-model" disabled={saving || Boolean(uploading)}>{saving ? "Сохраняем…" : "Сохранить модель"}</button></form></div>}
  </main>;
}
