import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { productModels, products, shops } from "../../../../db/schema";

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
  const items = rows.map(({ product, model }) => ({ id: product.externalId || product.sku, sku: product.sku, name: product.name, category: product.category, price: product.price, material: product.material, color: product.color, width: product.widthCm, height: product.heightCm, depth: product.depthCm, sourceUrl: product.sourceUrl, images: safeImages(product.imageUrls), modelStatus: model?.status ?? "missing", modelMessage: model?.validationMessage ?? "3D-модель ещё не подготовлена", model: model?.glbUrl ?? null, iosModel: model?.usdzUrl ?? null, demoAvailable: Boolean(model?.glbUrl) && ["review", "ready", "published"].includes(model?.status ?? ""), published: model?.status === "published" }));
  return Response.json({ shop, counts: { total: items.length, withModel: items.filter(item => item.demoAvailable).length, published: items.filter(item => item.published).length }, items }, { headers: { "cache-control": "public, max-age=60, stale-while-revalidate=300" } });
}
