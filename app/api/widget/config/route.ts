import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../../db";
import { productModels, products, shops } from "../../../../db/schema";
import { requestDomain, widgetJson, widgetOptions } from "../cors";

export function OPTIONS(request: Request) { return widgetOptions(request); }

export async function GET(request: Request) {
  const url = new URL(request.url);
  const shopSlug = url.searchParams.get("shop")?.slice(0, 80) ?? "";
  const sku = url.searchParams.get("sku")?.slice(0, 120) ?? "";
  if (!shopSlug || !sku) return widgetJson(request, { available: false, reason: "missing_identifiers" }, { status: 400 });
  const db = getDb();
  const [row] = await db.select({ shop: shops, product: products, model: productModels }).from(products).innerJoin(shops, eq(products.shopId, shops.id)).leftJoin(productModels, eq(productModels.productId, products.id)).where(and(eq(shops.slug, shopSlug), eq(products.sku, sku), eq(products.active, true))).limit(1);
  if (!row) return widgetJson(request, { available: false, reason: "product_not_found" }, { status: 404 });
  const allowed = JSON.parse(row.shop.allowedDomains || "[]") as string[];
  const domain = requestDomain(request);
  if (allowed.length && !allowed.includes(domain)) return widgetJson(request, { available: false, reason: "domain_not_allowed" }, { status: 403 });
  if (!new Set(["active", "trial"]).has(row.shop.subscriptionStatus)) return widgetJson(request, { available: false, reason: "subscription_inactive" });
  if (!row.model || row.model.status !== "published" || !row.model.glbUrl) return widgetJson(request, { available: false, reason: "model_not_published", status: row.model?.status ?? "missing" });
  return widgetJson(request, { available: true, shopId: row.shop.slug, productId: row.product.externalId || row.product.sku, sku: row.product.sku, name: row.product.name, category: row.product.category, price: row.product.price, material: row.product.material, color: row.product.color, model: row.model.glbUrl, iosModel: row.model.usdzUrl, width: row.product.widthCm, height: row.product.heightCm, depth: row.product.depthCm });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { shop?: string; skus?: string[] };
  const shopSlug = body.shop?.slice(0, 80) ?? ""; const skus = [...new Set((body.skus ?? []).map(value => String(value).slice(0, 120)).filter(Boolean))].slice(0, 100);
  if (!shopSlug || !skus.length) return widgetJson(request, { error: "missing_identifiers" }, { status: 400 });
  const db = getDb(); const [shop] = await db.select().from(shops).where(eq(shops.slug, shopSlug)).limit(1);
  if (!shop) return widgetJson(request, { error: "shop_not_found" }, { status: 404 });
  const allowed = JSON.parse(shop.allowedDomains || "[]") as string[]; const domain = requestDomain(request);
  if (allowed.length && !allowed.includes(domain)) return widgetJson(request, { error: "domain_not_allowed" }, { status: 403 });
  if (!new Set(["active", "trial"]).has(shop.subscriptionStatus)) return widgetJson(request, { subscriptionActive: false, items: {} });
  const rows = await db.select({ product: products, model: productModels }).from(products).leftJoin(productModels, eq(productModels.productId, products.id)).where(and(eq(products.shopId, shop.id), eq(products.active, true), inArray(products.sku, skus)));
  const items = Object.fromEntries(rows.map(({ product, model }) => [product.sku, model?.status === "published" && model.glbUrl ? { available: true, shopId: shop.slug, productId: product.externalId || product.sku, sku: product.sku, name: product.name, category: product.category, price: product.price, material: product.material, color: product.color, model: model.glbUrl, iosModel: model.usdzUrl, width: product.widthCm, height: product.heightCm, depth: product.depthCm } : { available: false, reason: "model_not_published", status: model?.status ?? "missing" }]));
  return widgetJson(request, { subscriptionActive: true, items }, { headers: { "cache-control": "public, max-age=60, stale-while-revalidate=300" } });
}
