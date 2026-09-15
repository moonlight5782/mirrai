import { and, eq } from "drizzle-orm";
import { getDb } from ".";
import { platformOperators, shopMembers, shops } from "./schema";

export type Identity = { userId: string; email: string; emailVerified?: boolean };
export type ShopRole = "owner" | "editor" | "analyst" | "operator";
export type ShopPermission = "read" | "catalog:write" | "setup:write" | "members:write" | "generation:request";

const permissions: Record<ShopRole, ReadonlySet<ShopPermission>> = {
  owner: new Set(["read", "catalog:write", "setup:write", "members:write", "generation:request"]),
  editor: new Set(["read", "catalog:write", "generation:request"]),
  analyst: new Set(["read"]),
  operator: new Set(["read", "catalog:write", "setup:write", "members:write", "generation:request"]),
};

export function hasShopPermission(role: string, permission: ShopPermission) {
  return permissions[role as ShopRole]?.has(permission) === true;
}

async function migrateLegacyOwner(identity: Identity) {
  const db = getDb();
  const owned = await db.select().from(shops).where(eq(shops.ownerUserId, identity.userId));
  for (const shop of owned) {
    await db.insert(shopMembers).values({ shopId: shop.id, userId: identity.userId, email: identity.email, role: "owner" }).onConflictDoNothing();
  }
}

export async function authorizedShop(identity: Identity, slug?: string | null, permission: ShopPermission = "read") {
  await migrateLegacyOwner(identity);
  const db = getDb();
  const rows = await db.select({ shop: shops, role: shopMembers.role }).from(shopMembers).innerJoin(shops, eq(shopMembers.shopId, shops.id)).where(slug ? and(eq(shopMembers.userId, identity.userId), eq(shops.slug, slug)) : eq(shopMembers.userId, identity.userId)).limit(1);
  if (rows[0]) return hasShopPermission(rows[0].role, permission) ? rows[0] : null;
  if (slug && await isPlatformOperator(identity)) {
    const [shop] = await db.select().from(shops).where(eq(shops.slug, slug)).limit(1);
    if (shop) return { shop, role: "operator" as const };
  }
  return null;
}

export async function isPlatformOperator(identity: Identity) {
  const db = getDb();
  const [existing] = await db.select().from(platformOperators).where(eq(platformOperators.userId, identity.userId)).limit(1);
  if (existing) return true;
  if (!identity.emailVerified) return false;
  const normalizedEmail = identity.email.trim().toLowerCase();
  const [emailMatch] = await db.select().from(platformOperators).where(eq(platformOperators.email, normalizedEmail)).limit(1);
  if (emailMatch) {
    await db.insert(platformOperators).values({ userId: identity.userId, email: normalizedEmail }).onConflictDoNothing();
    return true;
  }
  return false;
}
