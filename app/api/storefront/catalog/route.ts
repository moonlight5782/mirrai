import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../../db";
import { productModels, products, productVariants, shops } from "../../../../db/schema";

function safeImages(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(String).filter(url => (url.startsWith("/") && !url.startsWith("//")) || /^https:\/\//i.test(url)).slice(0, 4);
  } catch { return []; }
}

export async function GET(request: Request) {
  const shopSlug = new URL(request.url).searchParams.get("shop")?.slice(0, 80) || "hugge-md";
  const db = getDb();
  const [shop] = await db.select({ id: shops.id, slug: shops.slug, name: shops.name }).from(shops).where(eq(shops.slug, shopSlug)).limit(1);
  if (!shop) return Response.json({ error: "shop_not_found" }, { status: 404 });
  const rows = await db.select({ product: products, model: productModels }).from(products).leftJoin(productModels, eq(productModels.productId, products.id)).where(and(eq(products.shopId, shop.id), eq(products.active, true))).orderBy(products.name);
  const ids = rows.map(row => row.product.id);
  const variantRows = ids.length ? await db.select().from(productVariants).where(and(inArray(productVariants.productId, ids), eq(productVariants.active, true))).orderBy(asc(productVariants.sortOrder), asc(productVariants.id)) : [];
  const variantsByProduct = new Map<number, typeof variantRows>();
  variantRows.forEach(variant => { const list = variantsByProduct.get(variant.productId) ?? []; list.push(variant); variantsByProduct.set(variant.productId, list); });
  const items = rows.map(({ product, model }) => {
    const variants = (variantsByProduct.get(product.id) ?? []).map(variant => ({ id: String(variant.id), externalId: variant.externalId, sku: variant.sku, name: variant.name, colorName: variant.colorName, color: variant.colorHex, material: variant.material || product.material, image: variant.imageUrl, model: variant.glbUrl, iosModel: variant.usdzUrl, modelStatus: variant.modelStatus, default: variant.isDefault, available: Boolean(variant.glbUrl) && ["review", "ready", "published"].includes(variant.modelStatus), published: variant.modelStatus === "published" && Boolean(variant.glbUrl) }));
    const preferred = variants.find(variant => variant.default) ?? variants.find(variant => variant.available) ?? variants[0];
    const modelStatus = preferred?.modelStatus ?? model?.status ?? "missing";
    const glb = preferred?.model ?? model?.glbUrl ?? null;
    const usdz = preferred?.iosModel ?? model?.usdzUrl ?? null;
    return { id: product.externalId || product.sku, sku: product.sku, name: product.name, category: product.category, price: product.price, material: preferred?.material ?? product.material, color: preferred?.color ?? product.color, width: product.widthCm, height: product.heightCm, depth: product.depthCm, sourceUrl: product.sourceUrl, images: safeImages(product.imageUrls), variants, selectedVariantId: preferred?.id ?? null, modelStatus, modelMessage: model?.validationMessage ?? "3D-модель ещё не подготовлена", model: glb, iosModel: usdz, demoAvailable: Boolean(glb) && ["review", "ready", "published"].includes(modelStatus), published: modelStatus === "published" };
  });
  return Response.json({ shop, counts: { total: items.length, withModel: items.filter(item => item.demoAvailable).length, published: items.filter(item => item.published).length }, items }, { headers: { "cache-control": "public, max-age=60, stale-while-revalidate=300" } });
}
