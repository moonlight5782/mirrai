import { and, eq, isNull } from "drizzle-orm";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { getDb } from "../../../../db";
import { productModels, products, shops } from "../../../../db/schema";

const platforms = new Set(["shopify", "woocommerce", "tilda", "custom", "other"]);

function normalizeDomain(value: string) {
  const input = value.trim();
  if (!input) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
    return { websiteUrl: `${url.protocol}//${url.host}`, domain: url.hostname.toLowerCase().replace(/^www\./, "") };
  } catch { return null; }
}

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
  const rows = await db.select({ status: productModels.status }).from(products).leftJoin(productModels, eq(productModels.productId, products.id)).where(eq(products.shopId, shop.id));
  const published = rows.filter(row => row.status === "published").length;
  return Response.json({ shop: { slug: shop.slug, name: shop.name, websiteUrl: shop.websiteUrl ?? "", allowedDomains: JSON.parse(shop.allowedDomains || "[]"), platform: shop.platform, installationStatus: shop.installationStatus, installationCheckedAt: shop.installationCheckedAt }, catalog: { total: rows.length, published } });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "authentication_required" }, { status: 401 });
  const shop = await ownedShop(user.userId);
  if (!shop) return Response.json({ error: "shop_not_found" }, { status: 404 });
  const body = await request.json() as { websiteUrl?: string; platform?: string };
  const normalized = normalizeDomain(body.websiteUrl ?? "");
  if (!normalized || !platforms.has(body.platform ?? "")) return Response.json({ error: "invalid_setup" }, { status: 400 });
  await getDb().update(shops).set({ websiteUrl: normalized.websiteUrl, allowedDomains: JSON.stringify([normalized.domain]), platform: body.platform!, installationStatus: shop.websiteUrl === normalized.websiteUrl ? shop.installationStatus : "waiting" }).where(eq(shops.id, shop.id));
  return Response.json({ ok: true });
}
