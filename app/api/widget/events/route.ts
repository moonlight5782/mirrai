import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { products, shops, widgetEvents } from "../../../../db/schema";
import { requestDomain, widgetJson, widgetOptions } from "../cors";

const allowedEvents = new Set(["widget_open", "model_ready", "ar_open", "object_placed"]);
export function OPTIONS(request: Request) { return widgetOptions(request); }

export async function POST(request: Request) {
  const body = await request.json() as { shopId?: string; sku?: string; event?: string };
  if (!body.shopId || !body.sku || !body.event || !allowedEvents.has(body.event)) return widgetJson(request, { error: "invalid_event" }, { status: 400 });
  const db = getDb();
  const [row] = await db.select({ shopId: shops.id, productId: products.id, allowedDomains: shops.allowedDomains }).from(products).innerJoin(shops, eq(products.shopId, shops.id)).where(and(eq(shops.slug, body.shopId.slice(0, 80)), eq(products.sku, body.sku.slice(0, 120)))).limit(1);
  if (!row) return widgetJson(request, { error: "product_not_found" }, { status: 404 });
  const allowed = JSON.parse(row.allowedDomains || "[]") as string[];
  const domain = requestDomain(request);
  if (allowed.length && !allowed.includes(domain)) return widgetJson(request, { error: "domain_not_allowed" }, { status: 403 });
  await db.insert(widgetEvents).values({ shopId: row.shopId, productId: row.productId, event: body.event });
  return widgetJson(request, { ok: true }, { status: 202 });
}
