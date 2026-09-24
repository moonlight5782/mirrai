import { and, eq, sql } from "drizzle-orm";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { getDb } from "../../../../db";
import { productModels, productVariants, products, shops } from "../../../../db/schema";
import { authorizedShop } from "../../../../db/authorization";
import { normalizedWebsite as normalizeDomain } from "../../../../lib/shop-onboarding.mjs";
import { catalogReadiness } from "../../../../lib/catalog-readiness.mjs";
import { subscriptionAccess } from "../../../../db/subscription.mjs";

const platforms = new Set(["shopify", "woocommerce", "opencart", "tilda", "custom", "other"]);

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "authentication_required" }, { status: 401 });
  const access = await authorizedShop(user, new URL(request.url).searchParams.get("shop"));
  if (!access) return Response.json({ error: "shop_not_found" }, { status: 404 });
  const shop = access.shop;
  const db = getDb();
  const rows = await db.select({ id: products.id, active: products.active, status: productModels.status, glbUrl: productModels.glbUrl }).from(products).leftJoin(productModels, eq(productModels.productId, products.id)).where(eq(products.shopId, shop.id));
  const variants = await db.select({ productId: productVariants.productId, active: productVariants.active, status: productVariants.modelStatus, glbUrl: productVariants.glbUrl }).from(productVariants).innerJoin(products, eq(productVariants.productId, products.id)).where(eq(products.shopId, shop.id));
  let allowedDomains: string[] = [];
  try { const parsed = JSON.parse(shop.allowedDomains || "[]"); if (Array.isArray(parsed)) allowedDomains = parsed.filter(value => typeof value === "string"); } catch { /* legacy malformed value */ }
  return Response.json({ shop: { slug: shop.slug, name: shop.name, websiteUrl: shop.websiteUrl ?? "", allowedDomains, platform: shop.platform, installationStatus: shop.installationStatus, installationCheckedAt: shop.installationCheckedAt }, catalog: catalogReadiness(rows, variants), subscription: subscriptionAccess(shop) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "invalid_origin" }, { status: 403 });
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "authentication_required" }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body) || (body.shop !== undefined && typeof body.shop !== "string")) return Response.json({ error: "invalid_setup" }, { status: 400 });
  const access = await authorizedShop(user, body.shop, "setup:write");
  if (!access) return Response.json({ error: "shop_not_found" }, { status: 404 });
  const shop = access.shop;
  const normalized = normalizeDomain(body.websiteUrl ?? "");
  if (!normalized || !platforms.has(body.platform ?? "")) return Response.json({ error: "invalid_setup" }, { status: 400 });
  const db = getDb();
  const allShops = await db.select({ id: shops.id, allowedDomains: shops.allowedDomains, websiteUrl: shops.websiteUrl }).from(shops);
  const domainTaken = allShops.some(item => {
    if (item.id === shop.id) return false;
    let allowed: string[] = [];
    try { const parsed = JSON.parse(item.allowedDomains || "[]"); allowed = Array.isArray(parsed) ? parsed.filter(value => typeof value === "string") : []; } catch { allowed = []; }
    return normalizeDomain(item.websiteUrl ?? "")?.domain === normalized.domain || allowed.some(value => value.toLowerCase().replace(/^www\./, "") === normalized.domain);
  });
  if (domainTaken) return Response.json({ error: "domain_exists" }, { status: 409 });
  const updated = await db.update(shops).set({ websiteUrl: normalized.websiteUrl, allowedDomains: JSON.stringify([normalized.domain]), platform: body.platform!, installationStatus: shop.websiteUrl === normalized.websiteUrl ? shop.installationStatus : "waiting", installationCheckedAt: shop.websiteUrl === normalized.websiteUrl ? shop.installationCheckedAt : null }).where(and(eq(shops.id, shop.id), sql`NOT EXISTS (
    SELECT 1 FROM shops AS other, json_each(CASE WHEN json_valid(other.allowed_domains) THEN other.allowed_domains ELSE '[]' END) AS d
    WHERE other.id != ${shop.id} AND lower(CAST(d.value AS TEXT)) IN (${normalized.domain}, ${`www.${normalized.domain}`})
  )`)).returning({ id: shops.id });
  if (!updated.length) return Response.json({ error: "domain_exists" }, { status: 409 });
  return Response.json({ ok: true });
}
