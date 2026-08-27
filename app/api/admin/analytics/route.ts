import { and, eq, gte } from "drizzle-orm";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { getDb } from "../../../../db";
import { authorizedShop } from "../../../../db/authorization";
import { products, widgetEvents } from "../../../../db/schema";

export async function GET(request: Request) {
  const user = await getChatGPTUser(); if (!user) return Response.json({ error: "authentication_required" }, { status: 401 });
  const access = await authorizedShop(user, new URL(request.url).searchParams.get("shop")); if (!access) return Response.json({ error: "shop_not_found" }, { status: 404 });
  const since = new Date(Date.now() - 30 * 86400000).toISOString(); const rows = await getDb().select({ event: widgetEvents.event, createdAt: widgetEvents.createdAt, productId: products.id, sku: products.sku, name: products.name }).from(widgetEvents).innerJoin(products, eq(widgetEvents.productId, products.id)).where(and(eq(widgetEvents.shopId, access.shop.id), gte(widgetEvents.createdAt, since)));
  const totals = { widget_open: 0, model_ready: 0, ar_open: 0, object_placed: 0 }; const byProduct = new Map<number, { sku: string; name: string; opens: number; ar: number; placed: number }>();
  rows.forEach(row => { if (row.event in totals) totals[row.event as keyof typeof totals]++; const item = byProduct.get(row.productId) ?? { sku: row.sku, name: row.name, opens: 0, ar: 0, placed: 0 }; if (row.event === "widget_open") item.opens++; if (row.event === "ar_open") item.ar++; if (row.event === "object_placed") item.placed++; byProduct.set(row.productId, item); });
  return Response.json({ shop: { name: access.shop.name, slug: access.shop.slug }, periodDays: 30, totals, rates: { openToAr: totals.widget_open ? Math.round(totals.ar_open / totals.widget_open * 100) : 0, arToPlaced: totals.ar_open ? Math.round(totals.object_placed / totals.ar_open * 100) : 0 }, products: [...byProduct.values()].sort((a, b) => b.ar - a.ar).slice(0, 20) });
}
