import { eq } from "drizzle-orm";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { getDb } from "../../../../db";
import { isPlatformOperator } from "../../../../db/authorization";
import { productModels, products, shopInvites, shops } from "../../../../db/schema";

function safeSlug(value: string) { return value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60); }

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "authentication_required" }, { status: 401 });
  if (!await isPlatformOperator(user)) return Response.json({ error: "forbidden" }, { status: 403 });
  const db = getDb();
  const allShops = await db.select().from(shops).orderBy(shops.createdAt);
  const rows = await db.select({ shopId: products.shopId, status: productModels.status }).from(products).leftJoin(productModels, eq(productModels.productId, products.id));
  const invites = await db.select().from(shopInvites);
  return Response.json({ items: allShops.map(shop => { const catalog = rows.filter(row => row.shopId === shop.id); return { ...shop, total: catalog.length, published: catalog.filter(row => row.status === "published").length, ownerEmail: invites.find(invite => invite.shopId === shop.id && invite.role === "owner")?.email ?? "" }; }) });
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
    const [created] = await db.insert(shops).values({ name, slug, subscriptionStatus: "trial", websiteUrl: body.websiteUrl?.trim().slice(0, 300) || null, plan: "pilot" }).returning();
    await db.insert(shopInvites).values({ shopId: created.id, email: ownerEmail, role: "owner" });
    return Response.json({ ok: true, shop: created }, { status: 201 });
  } catch { return Response.json({ error: "slug_exists" }, { status: 409 }); }
}
