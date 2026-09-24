import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { authorizedShop } from "../../../db/authorization";
import { shops } from "../../../db/schema";
import { env } from "cloudflare:workers";
import { createMerchantShop, normalizedWebsite } from "../../../lib/shop-onboarding.mjs";
import { rateLimitPolicy, rateLimitHeaders } from "../../../lib/rate-limit";

const platforms = new Set(["shopify", "woocommerce", "opencart", "tilda", "custom", "other"]);

function slugify(value: string) {
  const slug = value.trim().toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
  return slug.length >= 3 ? slug : `store-${crypto.randomUUID().slice(0, 8)}`;
}

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "invalid_origin" }, { status: 403 });
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "authentication_required" }, { status: 401 });
  const current = await authorizedShop(user);
  if (current) return Response.json({ error: "shop_exists", shop: { slug: current.shop.slug } }, { status: 409 });
  const throttle = await rateLimitPolicy(request, { scope: "onboarding", ipLimit: 20, windowSeconds: 3600 });
  if (!throttle.allowed) return Response.json({ error: "rate_limited" }, { status: 429, headers: rateLimitHeaders(throttle.retryAfter) });
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) return Response.json({ error: "invalid_payload" }, { status: 400 });
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const website = normalizedWebsite(body.websiteUrl ?? "");
  const platform = body.platform ?? "other";
  if (!name || name.length > 100 || !website || !platforms.has(platform)) return Response.json({ error: "invalid_payload" }, { status: 400 });
  const db = getDb();
  const existingShops = await db.select({ allowedDomains: shops.allowedDomains, websiteUrl: shops.websiteUrl }).from(shops);
  const domainTaken = existingShops.some(item => {
    let allowed: string[] = [];
    try { const parsed = JSON.parse(item.allowedDomains || "[]"); allowed = Array.isArray(parsed) ? parsed.filter(value => typeof value === "string") : []; } catch { allowed = []; }
    const websiteDomain = normalizedWebsite(item.websiteUrl ?? "")?.domain;
    return websiteDomain === website.domain || allowed.some(value => value.toLowerCase().replace(/^www\./, "") === website.domain);
  });
  if (domainTaken) return Response.json({ error: "domain_exists" }, { status: 409 });
  const slug = `${slugify(name)}-${crypto.randomUUID().slice(0, 8)}`;
  try {
    const created = await createMerchantShop(env.DB!, { slug, name, ...website, platform, userId: user.userId, email: user.email, trialEndsAt: new Date(Date.now() + 14 * 86400000).toISOString() });
    if (!created) {
      const existing = await authorizedShop(user);
      return Response.json(existing ? { error: "shop_exists", shop: { slug: existing.shop.slug } } : { error: "domain_exists" }, { status: 409 });
    }
    return Response.json({ ok: true, shop: { slug } }, { status: 201 });
  } catch {
    console.error("Atomic shop creation failed");
    return Response.json({ error: "temporarily_unavailable" }, { status: 503 });
  }
}
