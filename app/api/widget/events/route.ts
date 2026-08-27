import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { products, shops, widgetEvents } from "../../../../db/schema";

const allowedEvents = new Set(["widget_open", "model_ready", "ar_open", "object_placed"]);

export async function POST(request: Request) {
  const body = await request.json() as { shopId?: string; sku?: string; event?: string };
  if (!body.shopId || !body.sku || !body.event || !allowedEvents.has(body.event)) return Response.json({ error: "invalid_event" }, { status: 400 });
  const db = getDb();
  const [row] = await db.select({ shopId: shops.id, productId: products.id }).from(products).innerJoin(shops, eq(products.shopId, shops.id)).where(and(eq(shops.slug, body.shopId.slice(0, 80)), eq(products.sku, body.sku.slice(0, 120)))).limit(1);
  if (!row) return Response.json({ error: "product_not_found" }, { status: 404 });
  await db.insert(widgetEvents).values({ shopId: row.shopId, productId: row.productId, event: body.event });
  return Response.json({ ok: true }, { status: 202 });
}
