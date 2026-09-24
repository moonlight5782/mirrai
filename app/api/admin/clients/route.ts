import { eq, sql } from "drizzle-orm";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { getDb } from "../../../../db";
import { isPlatformOperator } from "../../../../db/authorization";
import { productModels, productVariants, products, shopInvites, shopMembers, shops, widgetEvents } from "../../../../db/schema";
import { randomToken, sha256 } from "../../../auth";
import { subscriptionAccess } from "../../../../db/subscription.mjs";
import { catalogReadiness } from "../../../../lib/catalog-readiness.mjs";

function safeSlug(value: string) { return value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60); }

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "authentication_required" }, { status: 401 });
  if (!await isPlatformOperator(user)) return Response.json({ error: "forbidden" }, { status: 403 });
  const db = getDb();
  const allShops = await db.select().from(shops).orderBy(shops.createdAt);
  const rows = await db.select({ id: products.id, shopId: products.shopId, active: products.active, status: productModels.status, glbUrl: productModels.glbUrl }).from(products).leftJoin(productModels, eq(productModels.productId, products.id));
  const variants = await db.select({ productId: productVariants.productId, active: productVariants.active, status: productVariants.modelStatus, glbUrl: productVariants.glbUrl }).from(productVariants);
  const members = await db.select().from(shopMembers).where(eq(shopMembers.role, "owner"));
  const events = await db.select({ shopId: widgetEvents.shopId, event: widgetEvents.event, count: sql<number>`count(*)` }).from(widgetEvents).where(sql`julianday(${widgetEvents.createdAt}) >= julianday(${new Date(Date.now() - 30 * 86400000).toISOString()})`).groupBy(widgetEvents.shopId, widgetEvents.event);
  const invites = await db.select().from(shopInvites);
  return Response.json({ items: allShops.map(shop => {
    const catalog = rows.filter(row => row.shopId === shop.id), access = subscriptionAccess(shop);
    return { ...shop, ...catalogReadiness(catalog, variants), subscriptionStatus: access.status, expiresAt: access.expiresAt,
      ownerEmail: members.find(member => member.shopId === shop.id)?.email || invites.find(invite => invite.shopId === shop.id && invite.role === "owner")?.email || "",
      events30d: Object.fromEntries(events.filter(event => event.shopId === shop.id).map(event => [event.event, event.count])) };
  }) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "authentication_required" }, { status: 401 });
  if (!await isPlatformOperator(user)) return Response.json({ error: "forbidden" }, { status: 403 });
  const body = await request.json() as { name?: string; slug?: string; ownerEmail?: string; websiteUrl?: string };
  const name = body.name?.trim().slice(0, 100) ?? "";
  const slug = safeSlug(body.slug || name);
  const ownerEmail = body.ownerEmail?.trim().toLowerCase().slice(0, 160) ?? "";
  if (!name || slug.length < 3 || !/^\S+@\S+\.\S+$/.test(ownerEmail)) return Response.json({ error: "invalid_payload" }, { status: 400 });
  const db = getDb();
  try {
    const [created] = await db.insert(shops).values({ name, slug, subscriptionStatus: "trial", trialEndsAt: new Date(Date.now() + 14 * 86400000).toISOString(), websiteUrl: body.websiteUrl?.trim().slice(0, 300) || null, plan: "pilot" }).returning();
    const token = randomToken();
    await db.insert(shopInvites).values({ shopId: created.id, email: ownerEmail, role: "owner", tokenHash: await sha256(token), expiresAt: new Date(Date.now() + 7 * 86400000).toISOString() });
    return Response.json({ ok: true, shop: created, invitationUrl: `/invite?token=${encodeURIComponent(token)}` }, { status: 201 });
  } catch { return Response.json({ error: "slug_exists" }, { status: 409 }); }
}
