import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { authorizedShop } from "../../../db/authorization";
import { shopMembers, shops } from "../../../db/schema";

const platforms = new Set(["shopify", "woocommerce", "opencart", "tilda", "custom", "other"]);

function normalizedWebsite(value: string) {
  try {
    const url = new URL(/^https?:\/\//i.test(value.trim()) ? value.trim() : `https://${value.trim()}`);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (!url.hostname || /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.)/i.test(url.hostname)) return null;
    return { websiteUrl: `${url.protocol}//${url.host}`, domain: url.hostname.toLowerCase().replace(/^www\./, "") };
  } catch { return null; }
}

function slugify(value: string) {
  const slug = value.trim().toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
  return slug.length >= 3 ? slug : `store-${crypto.randomUUID().slice(0, 8)}`;
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "authentication_required" }, { status: 401 });
  const current = await authorizedShop(user);
  if (current) return Response.json({ error: "shop_exists", shop: { slug: current.shop.slug } }, { status: 409 });
  const body = await request.json().catch(() => ({})) as { name?: string; websiteUrl?: string; platform?: string };
  const name = body.name?.trim().slice(0, 100) ?? "";
  const website = normalizedWebsite(body.websiteUrl ?? "");
  const platform = body.platform ?? "other";
  if (!name || !website || !platforms.has(platform)) return Response.json({ error: "invalid_payload" }, { status: 400 });
  const db = getDb();
  const baseSlug = slugify(name);
  let created: typeof shops.$inferSelect | undefined;
  for (let attempt = 0; attempt < 3 && !created; attempt++) {
    const slug = attempt === 0 ? baseSlug : `${baseSlug}-${crypto.randomUUID().slice(0, 5)}`;
    try {
      [created] = await db.insert(shops).values({
        name, slug, websiteUrl: website.websiteUrl, allowedDomains: JSON.stringify([website.domain]), platform,
        subscriptionStatus: "trial", trialEndsAt: new Date(Date.now() + 14 * 86400000).toISOString(), plan: "pilot",
        catalogSourceType: "manual", catalogSyncStatus: "not_configured", installationStatus: "waiting",
      }).returning();
    } catch { /* retry a generated slug collision */ }
  }
  if (!created) return Response.json({ error: "shop_creation_failed" }, { status: 409 });
  await db.insert(shopMembers).values({ shopId: created.id, userId: user.userId, email: user.email.toLowerCase(), role: "owner" });
  return Response.json({ ok: true, shop: { slug: created.slug } }, { status: 201 });
}
