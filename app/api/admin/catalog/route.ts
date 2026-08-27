import { and, eq, isNull } from "drizzle-orm";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { getDb } from "../../../../db";
import { productModels, products, shops } from "../../../../db/schema";

const statuses = new Set(["missing", "queued", "processing", "review", "ready", "published", "failed"]);

async function ownedShop(userId: string) {
  const db = getDb();
  let [shop] = await db.select().from(shops).where(eq(shops.ownerUserId, userId)).limit(1);
  if (shop) return shop;
  const [unclaimed] = await db.select().from(shops).where(isNull(shops.ownerUserId)).limit(1);
  if (!unclaimed) return null;
  await db.update(shops).set({ ownerUserId: userId }).where(and(eq(shops.id, unclaimed.id), isNull(shops.ownerUserId)));
  [shop] = await db.select().from(shops).where(eq(shops.ownerUserId, userId)).limit(1);
  return shop ?? null;
}

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "authentication_required" }, { status: 401 });
  const shop = await ownedShop(user.userId);
  if (!shop) return Response.json({ error: "shop_not_found" }, { status: 404 });
  const db = getDb();
  const rows = await db.select({ product: products, model: productModels }).from(products).leftJoin(productModels, eq(productModels.productId, products.id)).where(eq(products.shopId, shop.id)).orderBy(products.name);
  const items = rows.map(({ product, model }) => ({ ...product, model: model ?? { status: "missing", glbUrl: null, usdzUrl: null, sourceType: "none", validationMessage: "3D-модель не загружена", qualityScore: null } }));
  const counts = items.reduce<Record<string, number>>((result, item) => { const key = item.model.status; result[key] = (result[key] ?? 0) + 1; return result; }, {});
  return Response.json({ shop: { slug: shop.slug, name: shop.name, subscriptionStatus: shop.subscriptionStatus }, counts: { total: items.length, ready: (counts.ready ?? 0) + (counts.published ?? 0), processing: (counts.queued ?? 0) + (counts.processing ?? 0), review: counts.review ?? 0, missing: counts.missing ?? 0, failed: counts.failed ?? 0 }, items });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "authentication_required" }, { status: 401 });
  const shop = await ownedShop(user.userId);
  if (!shop) return Response.json({ error: "shop_not_found" }, { status: 404 });
  const body = await request.json() as { productId?: number; status?: string; glbUrl?: string; usdzUrl?: string; validationMessage?: string };
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
