import { and, eq } from "drizzle-orm";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { getDb } from "../../../../db";
import { authorizedShop } from "../../../../db/authorization";
import { products } from "../../../../db/schema";

function positive(value: unknown) { const number = Number(value); return Number.isFinite(number) && number > 0 ? number : null; }

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "authentication_required" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const access = await authorizedShop(user, typeof body.shop === "string" ? body.shop : "", "catalog:write");
  if (!access) return Response.json({ error: "shop_not_found" }, { status: 404 });
  const sku = typeof body.sku === "string" ? body.sku.trim().slice(0, 120) : "";
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 160) : "";
  if (!sku || !name) return Response.json({ error: "sku_and_name_required" }, { status: 400 });
  try {
    const [product] = await getDb().insert(products).values({
      shopId: access.shop.id, sku, name,
      category: typeof body.category === "string" ? body.category.trim().slice(0, 100) || "Мебель" : "Мебель",
      price: typeof body.price === "string" ? body.price.trim().slice(0, 50) : "",
      material: typeof body.material === "string" ? body.material.trim().slice(0, 160) : "",
      sourceUrl: typeof body.sourceUrl === "string" && /^https?:\/\//i.test(body.sourceUrl) ? body.sourceUrl.slice(0, 1000) : null,
      widthCm: positive(body.widthCm), heightCm: positive(body.heightCm), depthCm: positive(body.depthCm),
      updatedAt: new Date().toISOString(),
    }).returning();
    return Response.json({ ok: true, product }, { status: 201 });
  } catch { return Response.json({ error: "sku_exists" }, { status: 409 }); }
}

export async function PATCH(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "authentication_required" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const access = await authorizedShop(user, typeof body.shop === "string" ? body.shop : "", "catalog:write");
  if (!access) return Response.json({ error: "shop_not_found" }, { status: 404 });
  const productId = Number(body.productId);
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 160) : "";
  if (!Number.isInteger(productId) || !name) return Response.json({ error: "invalid_payload" }, { status: 400 });
  const [product] = await getDb().select({ id: products.id }).from(products).where(and(eq(products.id, productId), eq(products.shopId, access.shop.id))).limit(1);
  if (!product) return Response.json({ error: "product_not_found" }, { status: 404 });
  await getDb().update(products).set({ name, category: typeof body.category === "string" ? body.category.trim().slice(0, 100) || "Мебель" : "Мебель", price: typeof body.price === "string" ? body.price.trim().slice(0, 50) : "", material: typeof body.material === "string" ? body.material.trim().slice(0, 160) : "", widthCm: positive(body.widthCm), heightCm: positive(body.heightCm), depthCm: positive(body.depthCm), updatedAt: new Date().toISOString() }).where(eq(products.id, productId));
  return Response.json({ ok: true });
}
