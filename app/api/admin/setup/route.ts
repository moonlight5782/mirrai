import { eq } from "drizzle-orm";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { getDb } from "../../../../db";
import { productModels, products, shops } from "../../../../db/schema";
import { authorizedShop } from "../../../../db/authorization";

const platforms = new Set(["shopify", "woocommerce", "opencart", "tilda", "custom", "other"]);

function normalizeDomain(value: string) {
  const input = value.trim();
  if (!input) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
    return { websiteUrl: `${url.protocol}//${url.host}`, domain: url.hostname.toLowerCase().replace(/^www\./, "") };
  } catch { return null; }
}

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "authentication_required" }, { status: 401 });
  const access = await authorizedShop(user, new URL(request.url).searchParams.get("shop"));
  if (!access) return Response.json({ error: "shop_not_found" }, { status: 404 });
  const shop = access.shop;
  const db = getDb();
  const rows = await db.select({ status: productModels.status }).from(products).leftJoin(productModels, eq(productModels.productId, products.id)).where(eq(products.shopId, shop.id));
  const published = rows.filter(row => row.status === "published").length;
  return Response.json({ shop: { slug: shop.slug, name: shop.name, websiteUrl: shop.websiteUrl ?? "", allowedDomains: JSON.parse(shop.allowedDomains || "[]"), platform: shop.platform, installationStatus: shop.installationStatus, installationCheckedAt: shop.installationCheckedAt }, catalog: { total: rows.length, published } });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "authentication_required" }, { status: 401 });
  const body = await request.json() as { shop?: string; websiteUrl?: string; platform?: string };
  const access = await authorizedShop(user, body.shop);
  if (!access) return Response.json({ error: "shop_not_found" }, { status: 404 });
  const shop = access.shop;
  const normalized = normalizeDomain(body.websiteUrl ?? "");
  if (!normalized || !platforms.has(body.platform ?? "")) return Response.json({ error: "invalid_setup" }, { status: 400 });
  await getDb().update(shops).set({ websiteUrl: normalized.websiteUrl, allowedDomains: JSON.stringify([normalized.domain]), platform: body.platform!, installationStatus: shop.websiteUrl === normalized.websiteUrl ? shop.installationStatus : "waiting" }).where(eq(shops.id, shop.id));
  return Response.json({ ok: true });
}
