import { and, eq } from "drizzle-orm";
import { getCurrentUser, normalizeEmail, randomToken, sha256 } from "../../../auth";
import { getDb } from "../../../../db";
import { authorizedShop, isPlatformOperator } from "../../../../db/authorization";
import { validInvitationRole } from "../../../../db/invitations";
import { shopInvites, shopMembers } from "../../../../db/schema";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "authentication_required" }, { status: 401 });
  const access = await authorizedShop(user, new URL(request.url).searchParams.get("shop"), "members:write");
  if (!access) return Response.json({ error: "forbidden" }, { status: 403 });
  const db = getDb();
  const members = await db.select({ id: shopMembers.id, email: shopMembers.email, role: shopMembers.role, createdAt: shopMembers.createdAt }).from(shopMembers).where(eq(shopMembers.shopId, access.shop.id));
  const invites = await db.select({ id: shopInvites.id, email: shopInvites.email, role: shopInvites.role, expiresAt: shopInvites.expiresAt, acceptedAt: shopInvites.acceptedAt }).from(shopInvites).where(eq(shopInvites.shopId, access.shop.id));
  return Response.json({ shop: { name: access.shop.name, slug: access.shop.slug }, role: access.role, members, invites: invites.filter(invite => !invite.acceptedAt) });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "authentication_required" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { shop?: string; email?: string; role?: string };
  const access = await authorizedShop(user, body.shop, "members:write");
  if (!access) return Response.json({ error: "forbidden" }, { status: 403 });
  const email = normalizeEmail(body.email ?? "");
  const role = body.role ?? "analyst";
  if (!/^\S+@\S+\.\S+$/.test(email) || !validInvitationRole(role)) return Response.json({ error: "invalid_payload" }, { status: 400 });
  if (role === "owner" && !await isPlatformOperator(user)) return Response.json({ error: "operator_required" }, { status: 403 });
  const db = getDb();
  const [member] = await db.select({ id: shopMembers.id }).from(shopMembers).where(and(eq(shopMembers.shopId, access.shop.id), eq(shopMembers.email, email))).limit(1);
  if (member) return Response.json({ error: "already_member" }, { status: 409 });
  const token = randomToken();
  const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();
  await db.insert(shopInvites).values({ shopId: access.shop.id, email, role, tokenHash: await sha256(token), expiresAt }).onConflictDoUpdate({ target: [shopInvites.shopId, shopInvites.email], set: { role, tokenHash: await sha256(token), expiresAt, acceptedAt: null, acceptedByUserId: null } });
  return Response.json({ ok: true, invitationUrl: `/invite?token=${encodeURIComponent(token)}`, expiresAt }, { status: 201 });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "authentication_required" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { shop?: string; memberId?: number; inviteId?: number };
  const access = await authorizedShop(user, body.shop, "members:write");
  if (!access) return Response.json({ error: "forbidden" }, { status: 403 });
  const db = getDb();
  if (Number.isInteger(body.inviteId)) await db.delete(shopInvites).where(and(eq(shopInvites.id, body.inviteId!), eq(shopInvites.shopId, access.shop.id)));
  else if (Number.isInteger(body.memberId)) {
    const [target] = await db.select().from(shopMembers).where(and(eq(shopMembers.id, body.memberId!), eq(shopMembers.shopId, access.shop.id))).limit(1);
    if (!target) return Response.json({ error: "member_not_found" }, { status: 404 });
    if (target.role === "owner") return Response.json({ error: "owner_cannot_be_removed" }, { status: 409 });
    await db.delete(shopMembers).where(eq(shopMembers.id, target.id));
  } else return Response.json({ error: "invalid_payload" }, { status: 400 });
  return Response.json({ ok: true });
}
