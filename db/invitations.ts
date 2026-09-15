import { and, eq, gt, isNull } from "drizzle-orm";
import { sha256 } from "../app/auth";
import { getDb } from ".";
import { authUsers, shopInvites, shopMembers, shops } from "./schema";
import type { Identity, ShopRole } from "./authorization";

const invitationRoles = new Set<ShopRole>(["owner", "editor", "analyst"]);

export function validInvitationRole(value: string): value is Exclude<ShopRole, "operator"> {
  return invitationRoles.has(value as ShopRole);
}

export async function invitationByToken(token: string) {
  if (token.length < 32 || token.length > 200) return null;
  const now = new Date().toISOString();
  const [row] = await getDb().select({ invite: shopInvites, shop: shops }).from(shopInvites)
    .innerJoin(shops, eq(shopInvites.shopId, shops.id))
    .where(and(eq(shopInvites.tokenHash, await sha256(token)), isNull(shopInvites.acceptedAt), gt(shopInvites.expiresAt, now))).limit(1);
  return row ?? null;
}

export async function acceptInvitation(identity: Identity, token: string) {
  const row = await invitationByToken(token);
  if (!row) return { ok: false as const, error: "invite_invalid" };
  if (row.invite.email.trim().toLowerCase() !== identity.email.trim().toLowerCase()) return { ok: false as const, error: "invite_email_mismatch" };
  if (!validInvitationRole(row.invite.role)) return { ok: false as const, error: "invite_role_invalid" };
  const db = getDb();
  await db.insert(shopMembers).values({ shopId: row.shop.id, userId: identity.userId, email: identity.email.trim().toLowerCase(), role: row.invite.role }).onConflictDoUpdate({ target: [shopMembers.shopId, shopMembers.userId], set: { email: identity.email.trim().toLowerCase(), role: row.invite.role } });
  const now = new Date().toISOString();
  await db.update(shopInvites).set({ acceptedAt: now, acceptedByUserId: identity.userId }).where(eq(shopInvites.id, row.invite.id));
  await db.update(authUsers).set({ emailVerifiedAt: now, updatedAt: now }).where(eq(authUsers.id, identity.userId));
  return { ok: true as const, shop: { name: row.shop.name, slug: row.shop.slug }, role: row.invite.role };
}
