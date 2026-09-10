import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { products, productVariants, shops, widgetEvents } from "../../../../db/schema";
import { subscriptionAccess } from "../../../../db/subscription.mjs";
import { widgetDomainAllowed, widgetJson, widgetOptions } from "../cors";

const allowedEvents = new Set(["widget_open", "model_ready", "ar_open", "object_placed"]);
export function OPTIONS(request: Request) { return widgetOptions(request); }

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { shopId?: string; sku?: string; event?: string } | null;
  if (!body || typeof body.shopId !== "string" || typeof body.sku !== "string" || typeof body.event !== "string" || !body.shopId || !body.sku || !allowedEvents.has(body.event)) return widgetJson(request, { error: "invalid_event" }, { status: 400 });
  const db = getDb();
  const selection = { shop: shops, shopId: shops.id, productId: products.id, allowedDomains: shops.allowedDomains };
  let [row] = await db.select(selection).from(products).innerJoin(shops, eq(products.shopId, shops.id)).where(and(eq(shops.slug, body.shopId.slice(0, 80)), eq(products.sku, body.sku.slice(0, 120)), eq(products.active, true))).limit(1);
  if (!row) {
    [row] = await db.select(selection).from(productVariants).innerJoin(products, eq(productVariants.productId, products.id)).innerJoin(shops, eq(products.shopId, shops.id)).where(and(eq(shops.slug, body.shopId.slice(0, 80)), eq(productVariants.sku, body.sku.slice(0, 120)), eq(productVariants.active, true), eq(products.active, true))).limit(1);
  }
  if (!row) return widgetJson(request, { error: "product_not_found" }, { status: 404 });
  if (!subscriptionAccess(row.shop).allowed) return widgetJson(request, { error: "subscription_inactive" }, { status: 403 });
  const allowed = JSON.parse(row.allowedDomains || "[]") as string[];
  if (!widgetDomainAllowed(request, allowed)) return widgetJson(request, { error: "domain_not_allowed" }, { status: 403 });
  await db.insert(widgetEvents).values({ shopId: row.shopId, productId: row.productId, event: body.event });
  return widgetJson(request, { ok: true }, { status: 202 });
}
