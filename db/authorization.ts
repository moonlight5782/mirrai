import { and, eq, isNull } from "drizzle-orm";
import { getDb } from ".";
import { platformOperators, shopInvites, shopMembers, shops } from "./schema";

export type Identity = { userId: string; email: string };

async function migrateLegacyOwner(identity: Identity) {
  const db = getDb();
  const owned = await db.select().from(shops).where(eq(shops.ownerUserId, identity.userId));
  for (const shop of owned) {
    await db.insert(shopMembers).values({ shopId: shop.id, userId: identity.userId, email: identity.email, role: "owner" }).onConflictDoNothing();
  }
}

async function acceptInvites(identity: Identity) {
  const db = getDb();
  const email = identity.email.trim().toLowerCase();
  const invites = await db.select().from(shopInvites).where(and(eq(shopInvites.email, email), isNull(shopInvites.acceptedAt)));
  for (const invite of invites) {
    await db.insert(shopMembers).values({ shopId: invite.shopId, userId: identity.userId, email, role: invite.role }).onConflictDoNothing();
    await db.update(shopInvites).set({ acceptedAt: new Date().toISOString() }).where(eq(shopInvites.id, invite.id));
  }
}

export async function authorizedShop(identity: Identity, slug?: string | null) {
  await migrateLegacyOwner(identity);
  await acceptInvites(identity);
  const db = getDb();
  const rows = await db.select({ shop: shops, role: shopMembers.role }).from(shopMembers).innerJoin(shops, eq(shopMembers.shopId, shops.id)).where(slug ? and(eq(shopMembers.userId, identity.userId), eq(shops.slug, slug)) : eq(shopMembers.userId, identity.userId)).limit(1);
  if (rows[0]) return rows[0];
  if (slug && await isPlatformOperator(identity)) {
    const [shop] = await db.select().from(shops).where(eq(shops.slug, slug)).limit(1);
    if (shop) return { shop, role: "operator" };
  }
  return null;
}

export async function isPlatformOperator(identity: Identity) {
  const db = getDb();
  const [existing] = await db.select().from(platformOperators).where(eq(platformOperators.userId, identity.userId)).limit(1);
  if (existing) return true;
  const [legacyOwner] = await db.select({ id: shops.id }).from(shops).where(eq(shops.ownerUserId, identity.userId)).limit(1);
  if (!legacyOwner) return false;
  await db.insert(platformOperators).values({ userId: identity.userId, email: identity.email }).onConflictDoNothing();
  return true;
}
