import { getChatGPTUser } from "../../../chatgpt-auth";
import { authorizedShop } from "../../../../db/authorization";
import { subscriptionAccess } from "../../../../db/subscription.mjs";
import { getDb } from "../../../../db";
import { products, productModels } from "../../../../db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "authentication_required" }, { status: 401 });
  const access = await authorizedShop(user, new URL(request.url).searchParams.get("shop"));
  if (!access) return Response.json({ error: "shop_not_found" }, { status: 404 });
  const rows = await getDb().select({ status: productModels.status }).from(products).leftJoin(productModels, eq(productModels.productId, products.id)).where(eq(products.shopId, access.shop.id));
  const period = subscriptionAccess(access.shop);
  const remainingDays = period.expiresAt ? Math.max(0, Math.ceil((new Date(period.expiresAt).getTime() - Date.now()) / 86400000)) : null;
  return Response.json({ shop: { name: access.shop.name, slug: access.shop.slug, plan: access.shop.plan, subscriptionStatus: period.status, trialEndsAt: access.shop.trialEndsAt, subscriptionEndsAt: access.shop.subscriptionEndsAt }, counts: { total: rows.length, ready: rows.filter(row => row.status === "published").length }, access: { ...period, remainingDays }, billingConfigured: false }, { headers: { "Cache-Control": "no-store" } });
}
