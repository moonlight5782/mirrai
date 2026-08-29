import { env } from "cloudflare:workers";
import { and, desc, eq, inArray } from "drizzle-orm";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { getDb } from "../../../../db";
import { authorizedShop } from "../../../../db/authorization";
import { getUploadsBucket } from "../../../../db/storage";
import { assets, generationJobs, productModels, products } from "../../../../db/schema";

type Runtime = { RECONSTRUCTION_API_URL?: string; RECONSTRUCTION_API_TOKEN?: string; HUGGINGFACE_SPACE_URL?: string; HUGGINGFACE_TOKEN?: string };
type ServiceConfig = { kind: "gateway" | "huggingface"; url: string; token?: string };
type HfOperation = "generation_all" | "shape_generation" | "run_button";
type GenerationState = { status?: string; model_url?: string; error?: string; textured?: boolean };
const activeStatuses = ["queued", "submitting", "processing", "blocked"];

function serviceConfig(): ServiceConfig | null {
  const runtime = env as unknown as Runtime;
  const hf = runtime.HUGGINGFACE_SPACE_URL?.trim().replace(/\/$/, "");
  if (hf) {
    try {
      const url = new URL(hf);
      if (url.protocol === "https:" && url.hostname.endsWith(".hf.space")) return { kind: "huggingface", url: url.toString().replace(/\/$/, ""), token: runtime.HUGGINGFACE_TOKEN?.trim() };
    } catch { /* try the self-hosted gateway */ }
  }
  const raw = runtime.RECONSTRUCTION_API_URL?.trim().replace(/\/$/, "");
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return null;
    return { kind: "gateway", url: url.toString().replace(/\/$/, ""), token: runtime.RECONSTRUCTION_API_TOKEN?.trim() };
  } catch { return null; }
}

function headers(token?: string) { return token ? { authorization: `Bearer ${token}` } : undefined; }
function imageList(value: string) { try { return (JSON.parse(value) as unknown[]).filter((url): url is string => typeof url === "string" && url.startsWith("https://")).slice(0, 8); } catch { return []; } }
function hfOperation(config: ServiceConfig): HfOperation { return config.kind === "huggingface" && config.url.includes("stable-fast-3d") ? "run_button" : "generation_all"; }

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "authentication_required" }, { status: 401 });
  const access = await authorizedShop(user, new URL(request.url).searchParams.get("shop"));
  if (!access) return Response.json({ error: "shop_not_found" }, { status: 404 });
  const rows = await getDb().select({ job: generationJobs, sku: products.sku, name: products.name }).from(generationJobs).innerJoin(products, eq(generationJobs.productId, products.id)).where(eq(generationJobs.shopId, access.shop.id)).orderBy(desc(generationJobs.priority), desc(generationJobs.createdAt));
  return Response.json({ serviceConfigured: Boolean(serviceConfig()), items: rows });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "authentication_required" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { shop?: string; productIds?: number[]; action?: "enqueue" | "run" };
  const access = await authorizedShop(user, body.shop);
  if (!access) return Response.json({ error: "shop_not_found" }, { status: 404 });
  if (body.action === "run") return runJobs(access.shop, new URL(request.url).origin);

  const ids = [...new Set((body.productIds ?? []).map(Number).filter(Number.isInteger))].slice(0, 100);
  if (!ids.length) return Response.json({ error: "products_required" }, { status: 400 });
  const db = getDb();
  const selected = await db.select().from(products).where(and(eq(products.shopId, access.shop.id), inArray(products.id, ids)));
  const existing = await db.select({ productId: generationJobs.productId }).from(generationJobs).where(and(eq(generationJobs.shopId, access.shop.id), inArray(generationJobs.status, activeStatuses), inArray(generationJobs.productId, ids)));
  const busy = new Set(existing.map(item => item.productId));
  const configured = Boolean(serviceConfig());
  let created = 0; let skipped = 0; let blockedCount = 0;
  for (const product of selected) {
    const images = imageList(product.imageUrls);
    if (!images.length || busy.has(product.id)) { skipped += 1; continue; }
    const hasCachedSource = images.some(image => sameHost(image, new URL(request.url).origin));
    const blockedBySource = access.shop.catalogSyncStatus === "blocked" && !hasCachedSource;
    const blocked = !configured || blockedBySource;
    if (blocked) blockedCount += 1;
    const errorCode = !configured ? "service_not_configured" : blockedBySource ? "source_unavailable" : null;
    const message = !configured ? "Подключите Hugging Face ZeroGPU или собственный 3D-сервер" : blockedBySource ? "Сохраните фотографию в MIRRAI: источник магазина недоступен по HTTPS" : null;
    await db.insert(generationJobs).values({ id: crypto.randomUUID(), shopId: access.shop.id, productId: product.id, status: blocked ? "blocked" : "queued", priority: Math.max(1, 100 - ids.indexOf(product.id)), sourceImages: JSON.stringify(images), errorCode, errorMessage: message });
    await db.insert(productModels).values({ productId: product.id, status: blocked ? "missing" : "queued", sourceType: "website_photo", validationMessage: message ?? "Фотографии приняты в очередь генерации", updatedAt: new Date().toISOString() }).onConflictDoUpdate({ target: productModels.productId, set: { status: blocked ? "missing" : "queued", sourceType: "website_photo", validationMessage: message ?? "Фотографии приняты в очередь генерации", updatedAt: new Date().toISOString() } });
    created += 1;
  }
  return Response.json({ ok: true, created, skipped, blocked: blockedCount > 0, serviceConfigured: configured });
}

async function runJobs(shop: typeof import("../../../../db/schema").shops.$inferSelect, appOrigin: string) {
  const config = serviceConfig();
  if (!config) return Response.json({ error: "service_not_configured" }, { status: 503 });
  const db = getDb();
  const rows = await db.select({ job: generationJobs, product: products }).from(generationJobs).innerJoin(products, eq(generationJobs.productId, products.id)).where(and(eq(generationJobs.shopId, shop.id), inArray(generationJobs.status, ["queued", "processing", "blocked"]))).orderBy(desc(generationJobs.priority)).limit(config.kind === "huggingface" ? 1 : 3);
  let submitted = 0; let completed = 0; let failed = 0;
  for (const { job, product } of rows) {
    try {
      if (["processing", "queued"].includes(job.status) && job.externalJobId) {
        const state = await pollGeneration(config, job.externalJobId);
        if (state.status === "ready" && state.model_url) { await storeGeneratedModel(shop.id, product.id, job.id, config, state.model_url, state.textured !== false); completed += 1; }
        else if (state.status === "failed") throw new Error(state.error || "textured_generation_failed");
        continue;
      }
      await db.update(generationJobs).set({ status: "submitting", attempt: job.attempt + 1, startedAt: job.startedAt ?? new Date().toISOString(), updatedAt: new Date().toISOString(), errorCode: null, errorMessage: null }).where(eq(generationJobs.id, job.id));
      const operation = hfOperation(config);
      const externalJobId = await submitProductImage(config, shop, product, job.sourceImages, appOrigin, operation);
      await db.update(generationJobs).set({ status: "processing", externalJobId, updatedAt: new Date().toISOString() }).where(eq(generationJobs.id, job.id));
      await db.update(productModels).set({ status: "processing", validationMessage: "3D-модель создаётся", updatedAt: new Date().toISOString() }).where(eq(productModels.productId, product.id)); submitted += 1;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message.slice(0, 300) : "generation_failed";
      const retry = job.attempt + 1 < job.maxAttempts;
      await db.update(generationJobs).set({ status: retry ? "queued" : "failed", externalJobId: retry ? null : job.externalJobId, errorCode: "textured_generation_failed", errorMessage: message, updatedAt: new Date().toISOString(), completedAt: retry ? null : new Date().toISOString() }).where(eq(generationJobs.id, job.id));
      await db.update(productModels).set({ status: retry ? "queued" : "failed", validationMessage: retry ? "Текстура не создана — повторим попытку автоматически" : "Не удалось создать текстурированную модель", updatedAt: new Date().toISOString() }).where(eq(productModels.productId, product.id)); failed += 1;
    }
  }
  return Response.json({ ok: true, submitted, completed, failed });
}

function sameHost(imageUrl: string, websiteUrl: string | null) { try { return Boolean(websiteUrl) && new URL(imageUrl).hostname === new URL(websiteUrl!).hostname; } catch { return false; } }

async function submitProductImage(config: ServiceConfig, shop: typeof import("../../../../db/schema").shops.$inferSelect, product: typeof products.$inferSelect, sourceImages: string, appOrigin: string, operation: HfOperation = "generation_all") {
  const imageUrl = imageList(sourceImages)[0];
  if (!imageUrl || (!sameHost(imageUrl, shop.websiteUrl) && !sameHost(imageUrl, appOrigin))) throw new Error("invalid_source_image");
  const source = await fetch(imageUrl);
  if (!source.ok) throw new Error(`source_${source.status}`);
  const bytes = await source.arrayBuffer();
  if (bytes.byteLength < 100 || bytes.byteLength > 20_000_000) throw new Error("invalid_source_size");
  return submitGeneration(config, new File([bytes], `${product.sku}.jpg`, { type: source.headers.get("content-type") || "image/jpeg" }), operation);
}

async function submitGeneration(config: ServiceConfig, file: File, operation: HfOperation = "generation_all") {
  if (config.kind === "gateway") {
    const form = new FormData(); form.append("file", file); form.append("kind", "object");
    const response = await fetch(`${config.url}/v1/assets`, { method: "POST", headers: headers(config.token), body: form });
    if (!response.ok) throw new Error(`submit_${response.status}`);
    const result = await response.json() as { id?: string }; if (!result.id) throw new Error("invalid_service_response"); return result.id;
  }
  const upload = new FormData(); upload.append("files", file);
  const uploaded = await fetch(`${config.url}/upload`, { method: "POST", headers: headers(config.token), body: upload });
  if (!uploaded.ok) throw new Error(`hf_upload_${uploaded.status}`);
  const paths = await uploaded.json() as string[]; if (!paths[0]) throw new Error("hf_upload_invalid");
  const image = { path: paths[0], orig_name: file.name, mime_type: file.type, meta: { _type: "gradio.FileData" } };
  const auth = headers(config.token) ?? {};
  const data = operation === "run_button"
    ? [null, image, null, 0.85, "None", -1, 1024]
    : ["", image, null, null, null, null, 30, 5, 1234, 256, true, 8000, true];
  const response = await fetch(`${config.url}/call/${operation}`, { method: "POST", headers: { ...auth, "content-type": "application/json" }, body: JSON.stringify({ data }) });
  if (!response.ok) throw new Error(`hf_submit_${response.status}`);
  const result = await response.json() as { event_id?: string }; if (!result.event_id) throw new Error("hf_submit_invalid"); return `${operation}:${result.event_id}`;
}

function hfJob(externalJobId: string): { operation: HfOperation; eventId: string } {
  const separator = externalJobId.indexOf(":");
  if (separator < 0) return { operation: "generation_all", eventId: externalJobId };
  const candidate = externalJobId.slice(0, separator);
  return { operation: candidate === "shape_generation" || candidate === "run_button" ? candidate : "generation_all", eventId: externalJobId.slice(separator + 1) };
}

function findGlb(value: unknown): { url?: string; path?: string } | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) { try { return findGlb(JSON.parse(trimmed)); } catch { /* inspect it as plain text */ } }
    const absolute = trimmed.match(/https?:\/\/[^"'\\\s]+\.glb(?:\?[^"'\\\s]*)?/i)?.[0];
    if (absolute) return { url: absolute };
    const path = trimmed.match(/\/tmp\/[^"'\\\s]+\.glb/i)?.[0];
    return path ? { path } : null;
  }
  if (Array.isArray(value)) { for (const item of value) { const found = findGlb(item); if (found) return found; } return null; }
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  for (const key of ["url", "path"] as const) if (typeof record[key] === "string" && /\.glb(?:$|[?#])/i.test(record[key])) return { [key]: record[key] };
  for (const nested of Object.values(record)) { const found = findGlb(nested); if (found) return found; }
  return null;
}

async function pollGeneration(config: ServiceConfig, externalJobId: string): Promise<GenerationState> {
  if (config.kind === "gateway") {
    const result = await fetch(`${config.url}/v1/assets/${encodeURIComponent(externalJobId)}`, { headers: headers(config.token) });
    if (!result.ok) throw new Error(`status_${result.status}`);
    return result.json();
  }
  const job = hfJob(externalJobId);
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 12_000); let payload = "";
  try {
    const response = await fetch(`${config.url}/call/${job.operation}/${encodeURIComponent(job.eventId)}`, { headers: { ...(headers(config.token) ?? {}), accept: "text/event-stream" }, signal: controller.signal });
    if (!response.ok) throw new Error(`hf_status_${response.status}`);
    const reader = response.body?.getReader(); const decoder = new TextDecoder();
    while (reader) { const next = await reader.read(); if (next.done) break; payload += decoder.decode(next.value, { stream: true }); if (payload.includes("event: complete") || payload.includes("event: error")) break; }
  } catch (cause) { if (!(cause instanceof DOMException && cause.name === "AbortError")) throw cause; }
  finally { clearTimeout(timeout); }
  if (payload.includes("event: error")) return { status: "failed", error: `Hugging Face ${job.operation} failed` };
  const complete = [...payload.matchAll(/event: complete\s+data: (.+)/g)].at(-1)?.[1];
  if (!complete) return { status: "processing" };
  const data = JSON.parse(complete) as unknown[];
  const model = job.operation === "generation_all" ? (findGlb(data[1]) ?? findGlb(data)) : (findGlb(data[0]) ?? findGlb(data));
  return model?.url || model?.path ? { status: "ready", model_url: model.url ?? model.path, textured: job.operation !== "shape_generation" } : { status: "failed", error: "Space did not return a GLB file" };
}

async function storeGeneratedModel(shopId: number, productId: number, jobId: string, config: ServiceConfig, modelUrl: string, textured: boolean) {
  if (!textured) throw new Error("untextured_model_rejected");
  let decoded = modelUrl; try { decoded = decodeURIComponent(modelUrl); } catch { /* keep original */ }
  const filePath = decoded.match(/\/tmp\/[^"'\\\s]+\.glb/i)?.[0];
  const candidates = [new URL(modelUrl, `${config.url}/`).toString()];
  if (filePath) candidates.push(`${config.url}/file=${filePath}`, `${config.url}/gradio_api/file=${filePath}`, `${config.url}/call/${textured ? "all" : "shape"}/file=${filePath}`);
  let bytes: ArrayBuffer | null = null; const statuses: number[] = [];
  for (const resolved of [...new Set(candidates)]) {
    if (!resolved.startsWith(`${config.url}/`)) continue;
    const response = await fetch(resolved, { headers: headers(config.token) }); statuses.push(response.status);
    if (response.ok) { bytes = await response.arrayBuffer(); break; }
  }
  if (!bytes) throw new Error(`model_${statuses.join("_") || "unavailable"}`);
  if (bytes.byteLength < 100 || bytes.byteLength > 50_000_000) throw new Error("invalid_model_size");
  const id = crypto.randomUUID(); const storageKey = `shops/${shopId}/products/${productId}/${id}.glb`;
  await getUploadsBucket().put(storageKey, bytes, { httpMetadata: { contentType: "model/gltf-binary" } });
  const db = getDb();
  await db.insert(assets).values({ id, shopId, productId, storageKey, fileName: `${productId}.glb`, contentType: "model/gltf-binary", sizeBytes: bytes.byteLength, kind: "glb" });
  const validationMessage = "Текстурированная модель создана — проверьте масштаб и материалы перед публикацией";
  await db.insert(productModels).values({ productId, status: "review", glbUrl: `/api/assets/${id}`, sourceType: "generated", validationMessage, updatedAt: new Date().toISOString() }).onConflictDoUpdate({ target: productModels.productId, set: { status: "review", glbUrl: `/api/assets/${id}`, sourceType: "generated", validationMessage, updatedAt: new Date().toISOString() } });
  await db.update(generationJobs).set({ status: "review", resultGlbUrl: `/api/assets/${id}`, updatedAt: new Date().toISOString(), completedAt: new Date().toISOString() }).where(eq(generationJobs.id, jobId));
}
