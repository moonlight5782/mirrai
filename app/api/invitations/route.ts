import { getCurrentUser } from "../../auth";
import { acceptInvitation, invitationByToken } from "../../../db/invitations";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const row = await invitationByToken(token);
  if (!row) return Response.json({ error: "invite_invalid" }, { status: 404 });
  return Response.json({ shop: { name: row.shop.name, slug: row.shop.slug }, email: row.invite.email, role: row.invite.role, expiresAt: row.invite.expiresAt }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "authentication_required" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { token?: string };
  const result = await acceptInvitation(user, body.token ?? "");
  if (!result.ok) return Response.json({ error: result.error }, { status: result.error === "invite_email_mismatch" ? 403 : 400 });
  return Response.json(result);
}
