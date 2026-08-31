import { and, eq } from "drizzle-orm";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { getDb } from "../../../../db";
import { productModels, products } from "../../../../db/schema";
import { authorizedShop } from "../../../../db/authorization";

const statuses = new Set(["missing", "queued", "processing", "review", "ready", "published", "failed"]);

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "authentication_required" }, { status: 401 });
  const access = await authorizedShop(user, new URL(request.url).searchParams.get("shop"));
  if (!access) return Response.json({ error: "shop_not_found" }, { status: 404 });
  const shop = access.shop;
  const db = getDb();
  const rows = await db.select({ product: products, model: productModels }).from(products).leftJoin(productModels, eq(productModels.productId, products.id)).where(eq(products.shopId, shop.id)).orderBy(products.name);
  const items = rows.map(({ product, model }) => { let imageUrls: string[] = []; try { imageUrls = JSON.parse(product.imageUrls); } catch { /* malformed legacy value becomes empty */ } return { ...product, imageUrls: imageUrls.filter(value => typeof value === "string" && (/^https:\/\//i.test(value) || (value.startsWith("/") && !value.startsWith("//")))).slice(0, 12), model: model ?? { status: "missing", glbUrl: null, usdzUrl: null, sourceType: product.sourceUrl ? "website_photo" : "none", validationMessage: product.sourceUrl ? "Фото с сайта найдено — 3D-модель ещё не создана" : "3D-модель не загружена", qualityScore: null } }; });
  const counts = items.reduce<Record<string, number>>((result, item) => { const key = item.model.status; result[key] = (result[key] ?? 0) + 1; return result; }, {});
  return Response.json({ shop: { slug: shop.slug, name: shop.name, subscriptionStatus: shop.subscriptionStatus, catalogSourceType: shop.catalogSourceType, catalogSyncStatus: shop.catalogSyncStatus, catalogSyncedAt: shop.catalogSyncedAt, catalogSyncMessage: shop.catalogSyncMessage }, counts: { total: items.length, ready: (counts.ready ?? 0) + (counts.published ?? 0), processing: (counts.queued ?? 0) + (counts.processing ?? 0), review: counts.review ?? 0, missing: counts.missing ?? 0, failed: counts.failed ?? 0, withPhotos: items.filter(item => item.imageUrls.length > 0).length }, items });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "authentication_required" }, { status: 401 });
  const body = await request.json() as { shop?: string; productId?: number; status?: string; glbUrl?: string; usdzUrl?: string; validationMessage?: string };
  const access = await authorizedShop(user, body.shop);
  if (!access) return Response.json({ error: "shop_not_found" }, { status: 404 });
  const shop = access.shop;
  const productId = Number(body.productId);
  const status = body.status ?? "missing";
  if (!Number.isInteger(productId) || !statuses.has(status)) return Response.json({ error: "invalid_payload" }, { status: 400 });
  const safeUrl = (value?: string) => !value || value.startsWith("/") || /^https:\/\//i.test(value);
  if (!safeUrl(body.glbUrl) || !safeUrl(body.usdzUrl)) return Response.json({ error: "https_assets_required" }, { status: 400 });
  if (status === "published" && !body.glbUrl) return Response.json({ error: "glb_required_for_publish" }, { status: 400 });
  const db = getDb();
  const [product] = await db.select({ id: products.id }).from(products).where(and(eq(products.id, productId), eq(products.shopId, shop.id))).limit(1);
  if (!product) return Response.json({ error: "product_not_found" }, { status: 404 });
  await db.insert(productModels).values({ productId, status, glbUrl: body.glbUrl || null, usdzUrl: body.usdzUrl || null, sourceType: body.glbUrl ? "uploaded" : "none", validationMessage: body.validationMessage?.slice(0, 300) || null, updatedAt: new Date().toISOString() }).onConflictDoUpdate({ target: productModels.productId, set: { status, glbUrl: body.glbUrl || null, usdzUrl: body.usdzUrl || null, sourceType: body.glbUrl ? "uploaded" : "none", validationMessage: body.validationMessage?.slice(0, 300) || null, updatedAt: new Date().toISOString() } });
  return Response.json({ ok: true });
}
