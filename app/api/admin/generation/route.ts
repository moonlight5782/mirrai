import { env } from "cloudflare:workers";
import { and, desc, eq, inArray } from "drizzle-orm";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { getDb } from "../../../../db";
import { authorizedShop } from "../../../../db/authorization";
import { getUploadsBucket } from "../../../../db/storage";
import { assets, generationJobs, productModels, products } from "../../../../db/schema";

type Runtime = { RECONSTRUCTION_API_URL?: string; RECONSTRUCTION_API_TOKEN?: string };
const activeStatuses = ["queued", "submitting", "processing", "blocked"];

function serviceConfig() {
  const runtime = env as unknown as Runtime;
  const raw = runtime.RECONSTRUCTION_API_URL?.trim().replace(/\/$/, "");
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return null;
    return { url: url.toString().replace(/\/$/, ""), token: runtime.RECONSTRUCTION_API_TOKEN?.trim() };
  } catch { return null; }
}

function headers(token?: string) { return token ? { authorization: `Bearer ${token}` } : undefined; }
function imageList(value: string) { try { return (JSON.parse(value) as unknown[]).filter((url): url is string => typeof url === "string" && url.startsWith("https://")).slice(0, 8); } catch { return []; } }

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
  if (body.action === "run") return runJobs(access.shop);

  const ids = [...new Set((body.productIds ?? []).map(Number).filter(Number.isInteger))].slice(0, 100);
  if (!ids.length) return Response.json({ error: "products_required" }, { status: 400 });
  const db = getDb();
  const selected = await db.select().from(products).where(and(eq(products.shopId, access.shop.id), inArray(products.id, ids)));
  const existing = await db.select({ productId: generationJobs.productId }).from(generationJobs).where(and(eq(generationJobs.shopId, access.shop.id), inArray(generationJobs.status, activeStatuses), inArray(generationJobs.productId, ids)));
  const busy = new Set(existing.map(item => item.productId));
  const configured = Boolean(serviceConfig());
  const blockedBySource = access.shop.catalogSyncStatus === "blocked";
  let created = 0; let skipped = 0;
  for (const product of selected) {
    const images = imageList(product.imageUrls);
    if (!images.length || busy.has(product.id)) { skipped += 1; continue; }
    const blocked = !configured || blockedBySource;
    const errorCode = !configured ? "service_not_configured" : blockedBySource ? "source_unavailable" : null;
    const message = !configured ? "Подключите собственный сервер генерации 3D" : blockedBySource ? "Источник фотографий недоступен по HTTPS" : null;
    await db.insert(generationJobs).values({ id: crypto.randomUUID(), shopId: access.shop.id, productId: product.id, status: blocked ? "blocked" : "queued", priority: Math.max(1, 100 - ids.indexOf(product.id)), sourceImages: JSON.stringify(images), errorCode, errorMessage: message });
    await db.insert(productModels).values({ productId: product.id, status: blocked ? "missing" : "queued", sourceType: "website_photo", validationMessage: message ?? "Фотографии приняты в очередь генерации", updatedAt: new Date().toISOString() }).onConflictDoUpdate({ target: productModels.productId, set: { status: blocked ? "missing" : "queued", sourceType: "website_photo", validationMessage: message ?? "Фотографии приняты в очередь генерации", updatedAt: new Date().toISOString() } });
    created += 1;
  }
  return Response.json({ ok: true, created, skipped, blocked: !configured || blockedBySource, serviceConfigured: configured });
}

async function runJobs(shop: typeof import("../../../../db/schema").shops.$inferSelect) {
  const config = serviceConfig();
  if (!config) return Response.json({ error: "service_not_configured" }, { status: 503 });
  const db = getDb();
  const rows = await db.select({ job: generationJobs, product: products }).from(generationJobs).innerJoin(products, eq(generationJobs.productId, products.id)).where(and(eq(generationJobs.shopId, shop.id), inArray(generationJobs.status, ["queued", "processing", "blocked"]))).orderBy(desc(generationJobs.priority)).limit(3);
  let submitted = 0; let completed = 0; let failed = 0;
  for (const { job, product } of rows) {
    try {
      if (job.status === "processing" && job.externalJobId) {
        const result = await fetch(`${config.url}/v1/assets/${encodeURIComponent(job.externalJobId)}`, { headers: headers(config.token) });
        if (!result.ok) throw new Error(`status_${result.status}`);
        const state = await result.json() as { status?: string; model_url?: string; error?: string };
        if (state.status === "ready" && state.model_url) { await storeGeneratedModel(shop.id, product.id, job.id, config, state.model_url); completed += 1; }
        else if (state.status === "failed") throw new Error(state.error || "generation_failed");
        continue;
      }
      if (shop.catalogSyncStatus === "blocked") continue;
      const images = imageList(job.sourceImages); const imageUrl = images[0];
      if (!imageUrl || !sameHost(imageUrl, shop.websiteUrl)) throw new Error("invalid_source_image");
      await db.update(generationJobs).set({ status: "submitting", attempt: job.attempt + 1, startedAt: job.startedAt ?? new Date().toISOString(), updatedAt: new Date().toISOString(), errorCode: null, errorMessage: null }).where(eq(generationJobs.id, job.id));
      const source = await fetch(imageUrl);
      if (!source.ok) throw new Error(`source_${source.status}`);
      const bytes = await source.arrayBuffer(); if (bytes.byteLength < 100 || bytes.byteLength > 20_000_000) throw new Error("invalid_source_size");
      const form = new FormData(); form.append("file", new File([bytes], `${product.sku}.jpg`, { type: source.headers.get("content-type") || "image/jpeg" })); form.append("kind", "object");
      const response = await fetch(`${config.url}/v1/assets`, { method: "POST", headers: headers(config.token), body: form });
      if (!response.ok) throw new Error(`submit_${response.status}`);
      const result = await response.json() as { id?: string }; if (!result.id) throw new Error("invalid_service_response");
      await db.update(generationJobs).set({ status: "processing", externalJobId: result.id, updatedAt: new Date().toISOString() }).where(eq(generationJobs.id, job.id));
      await db.update(productModels).set({ status: "processing", validationMessage: "3D-модель создаётся", updatedAt: new Date().toISOString() }).where(eq(productModels.productId, product.id)); submitted += 1;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message.slice(0, 300) : "generation_failed";
      const retry = job.attempt + 1 < job.maxAttempts;
      await db.update(generationJobs).set({ status: retry ? "queued" : "failed", errorCode: "generation_failed", errorMessage: message, updatedAt: new Date().toISOString(), completedAt: retry ? null : new Date().toISOString() }).where(eq(generationJobs.id, job.id));
      await db.update(productModels).set({ status: retry ? "queued" : "failed", validationMessage: retry ? "Повторим попытку автоматически" : "Не удалось создать модель", updatedAt: new Date().toISOString() }).where(eq(productModels.productId, product.id)); failed += 1;
    }
  }
  return Response.json({ ok: true, submitted, completed, failed });
}

function sameHost(imageUrl: string, websiteUrl: string | null) { try { return Boolean(websiteUrl) && new URL(imageUrl).hostname === new URL(websiteUrl!).hostname; } catch { return false; } }

async function storeGeneratedModel(shopId: number, productId: number, jobId: string, config: { url: string; token?: string }, modelUrl: string) {
  const resolved = new URL(modelUrl, `${config.url}/`).toString();
  if (!resolved.startsWith(`${config.url}/`)) throw new Error("invalid_model_url");
  const response = await fetch(resolved, { headers: headers(config.token) }); if (!response.ok) throw new Error(`model_${response.status}`);
  const bytes = await response.arrayBuffer(); if (bytes.byteLength < 100 || bytes.byteLength > 50_000_000) throw new Error("invalid_model_size");
  const id = crypto.randomUUID(); const storageKey = `shops/${shopId}/products/${productId}/${id}.glb`;
  await getUploadsBucket().put(storageKey, bytes, { httpMetadata: { contentType: "model/gltf-binary" } });
  const db = getDb();
  await db.insert(assets).values({ id, shopId, productId, storageKey, fileName: `${productId}.glb`, contentType: "model/gltf-binary", sizeBytes: bytes.byteLength, kind: "glb" });
  await db.insert(productModels).values({ productId, status: "review", glbUrl: `/api/assets/${id}`, sourceType: "generated", validationMessage: "Модель создана — проверьте масштаб и материалы перед публикацией", updatedAt: new Date().toISOString() }).onConflictDoUpdate({ target: productModels.productId, set: { status: "review", glbUrl: `/api/assets/${id}`, sourceType: "generated", validationMessage: "Модель создана — проверьте масштаб и материалы перед публикацией", updatedAt: new Date().toISOString() } });
  await db.update(generationJobs).set({ status: "review", resultGlbUrl: `/api/assets/${id}`, updatedAt: new Date().toISOString(), completedAt: new Date().toISOString() }).where(eq(generationJobs.id, jobId));
}
