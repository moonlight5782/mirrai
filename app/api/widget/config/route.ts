import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../../db";
import { productModels, products, productVariants, shops } from "../../../../db/schema";
import { requestDomain, widgetJson, widgetOptions } from "../cors";

export function OPTIONS(request: Request) { return widgetOptions(request); }

type ProductRow = typeof products.$inferSelect;
type VariantRow = typeof productVariants.$inferSelect;

function publicVariants(product: ProductRow, rows: VariantRow[]) {
  return rows.map(variant => ({
    id: String(variant.id), externalId: variant.externalId, sku: variant.sku, name: variant.name,
    colorName: variant.colorName, color: variant.colorHex, material: variant.material || product.material,
    image: variant.imageUrl, model: variant.glbUrl, iosModel: variant.usdzUrl,
    default: variant.isDefault, available: variant.modelStatus === "published" && Boolean(variant.glbUrl),
  }));
}

function widgetProduct(shop: typeof shops.$inferSelect, product: ProductRow, model: typeof productModels.$inferSelect | null, variants: ReturnType<typeof publicVariants>, requestedVariantId?: string) {
  const preferred = variants.find(variant => variant.id === requestedVariantId && variant.available) ?? variants.find(variant => variant.default && variant.available) ?? variants.find(variant => variant.available);
  const fallbackAvailable = model?.status === "published" && Boolean(model.glbUrl);
  if (!preferred && !fallbackAvailable) return { available: false, reason: "model_not_published", status: model?.status ?? "missing" };
  return {
    available: true, shopId: shop.slug, productId: product.externalId || product.sku, sku: product.sku,
    name: product.name, category: product.category, price: product.price,
    material: preferred?.material ?? product.material, color: preferred?.color ?? product.color,
    model: preferred?.model ?? model?.glbUrl, iosModel: preferred?.iosModel ?? model?.usdzUrl,
    width: product.widthCm, height: product.heightCm, depth: product.depthCm,
    variants, selectedVariantId: preferred?.id ?? null,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const shopSlug = url.searchParams.get("shop")?.slice(0, 80) ?? "";
  const sku = url.searchParams.get("sku")?.slice(0, 120) ?? "";
  if (!shopSlug || !sku) return widgetJson(request, { available: false, reason: "missing_identifiers" }, { status: 400 });
  const db = getDb();
  let [row] = await db.select({ shop: shops, product: products, model: productModels }).from(products).innerJoin(shops, eq(products.shopId, shops.id)).leftJoin(productModels, eq(productModels.productId, products.id)).where(and(eq(shops.slug, shopSlug), eq(products.sku, sku), eq(products.active, true))).limit(1);
  let requestedVariantId: string | undefined;
  if (!row) {
    const [variantMatch] = await db.select({ shop: shops, product: products, model: productModels, variant: productVariants }).from(productVariants).innerJoin(products, eq(productVariants.productId, products.id)).innerJoin(shops, eq(products.shopId, shops.id)).leftJoin(productModels, eq(productModels.productId, products.id)).where(and(eq(shops.slug, shopSlug), eq(productVariants.sku, sku), eq(productVariants.active, true), eq(products.active, true))).limit(1);
    if (variantMatch) { row = { shop: variantMatch.shop, product: variantMatch.product, model: variantMatch.model }; requestedVariantId = String(variantMatch.variant.id); }
  }
  if (!row) return widgetJson(request, { available: false, reason: "product_not_found" }, { status: 404 });
  const allowed = JSON.parse(row.shop.allowedDomains || "[]") as string[];
  const domain = requestDomain(request);
  if (allowed.length && !allowed.includes(domain)) return widgetJson(request, { available: false, reason: "domain_not_allowed" }, { status: 403 });
  if (!new Set(["active", "trial"]).has(row.shop.subscriptionStatus)) return widgetJson(request, { available: false, reason: "subscription_inactive" });
  const variantRows = await db.select().from(productVariants).where(and(eq(productVariants.productId, row.product.id), eq(productVariants.active, true))).orderBy(asc(productVariants.sortOrder), asc(productVariants.id));
  return widgetJson(request, widgetProduct(row.shop, row.product, row.model, publicVariants(row.product, variantRows), requestedVariantId));
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
  const variantMatches = await db.select({ requestedSku: productVariants.sku, product: products, model: productModels, requestedVariantId: productVariants.id }).from(productVariants).innerJoin(products, eq(productVariants.productId, products.id)).leftJoin(productModels, eq(productModels.productId, products.id)).where(and(eq(products.shopId, shop.id), eq(products.active, true), eq(productVariants.active, true), inArray(productVariants.sku, skus)));
  const productIds = [...new Set([...rows.map(row => row.product.id), ...variantMatches.map(row => row.product.id)])];
  const variantRows = productIds.length ? await db.select().from(productVariants).where(and(inArray(productVariants.productId, productIds), eq(productVariants.active, true))).orderBy(asc(productVariants.sortOrder), asc(productVariants.id)) : [];
  const grouped = new Map<number, VariantRow[]>();
  variantRows.forEach(variant => { const list = grouped.get(variant.productId) ?? []; list.push(variant); grouped.set(variant.productId, list); });
  const direct = new Map(rows.map(row => [row.product.sku, row]));
  const matched = new Map(variantMatches.map(row => [row.requestedSku, row]));
  const items = Object.fromEntries(skus.map(requestedSku => {
    const directRow = direct.get(requestedSku); const variantRow = matched.get(requestedSku);
    const source = directRow ?? variantRow;
    if (!source) return [requestedSku, { available: false, reason: "product_not_found" }];
    return [requestedSku, widgetProduct(shop, source.product, source.model, publicVariants(source.product, grouped.get(source.product.id) ?? []), variantRow ? String(variantRow.requestedVariantId) : undefined)];
  }));
  return widgetJson(request, { subscriptionActive: true, items }, { headers: { "cache-control": "public, max-age=60, stale-while-revalidate=300" } });
}
