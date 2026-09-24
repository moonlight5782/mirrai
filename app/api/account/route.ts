import { eq } from "drizzle-orm";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { authorizedShop, isPlatformOperator } from "../../../db/authorization";
import { shopMembers, shops } from "../../../db/schema";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "authentication_required" }, { status: 401 });
  await authorizedShop(user);
  const db = getDb();
  const memberships = await db.select({ name: shops.name, slug: shops.slug, role: shopMembers.role })
    .from(shopMembers).innerJoin(shops, eq(shopMembers.shopId, shops.id))
    .where(eq(shopMembers.userId, user.userId)).orderBy(shops.createdAt);
  const operator = await isPlatformOperator(user);
  const visible = operator ? (await db.select({ name: shops.name, slug: shops.slug }).from(shops).orderBy(shops.createdAt)).map(shop => ({ ...shop, role: "operator" })) : memberships;
  return Response.json({ user: { displayName: user.displayName, email: user.email }, operator, shops: visible }, { headers: { "Cache-Control": "no-store" } });
}
