import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { productModels, products, shops } from "../../../../db/schema";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const shopSlug = url.searchParams.get("shop")?.slice(0, 80) ?? "";
  const sku = url.searchParams.get("sku")?.slice(0, 120) ?? "";
  if (!shopSlug || !sku) return Response.json({ available: false, reason: "missing_identifiers" }, { status: 400 });
  const db = getDb();
  const [row] = await db.select({ shop: shops, product: products, model: productModels }).from(products).innerJoin(shops, eq(products.shopId, shops.id)).leftJoin(productModels, eq(productModels.productId, products.id)).where(and(eq(shops.slug, shopSlug), eq(products.sku, sku), eq(products.active, true))).limit(1);
  if (!row) return Response.json({ available: false, reason: "product_not_found" }, { status: 404 });
  if (!new Set(["active", "trial"]).has(row.shop.subscriptionStatus)) return Response.json({ available: false, reason: "subscription_inactive" });
  if (!row.model || row.model.status !== "published" || !row.model.glbUrl) return Response.json({ available: false, reason: "model_not_published", status: row.model?.status ?? "missing" });
  return Response.json({ available: true, shopId: row.shop.slug, productId: row.product.externalId || row.product.sku, sku: row.product.sku, name: row.product.name, category: row.product.category, price: row.product.price, material: row.product.material, color: row.product.color, model: row.model.glbUrl, iosModel: row.model.usdzUrl, width: row.product.widthCm, height: row.product.heightCm, depth: row.product.depthCm });
}
