import { and, desc, eq } from "drizzle-orm";
import { getCurrentUser } from "../../../auth";
import { getDb } from "../../../../db";
import { authUsers, commercePricing, merchantRequests, shops } from "../../../../db/schema";
import { env } from "cloudflare:workers";
import { provisionRequest } from "../../../../lib/provision-request.mjs";
import { authorizedShop, isPlatformOperator } from "../../../../db/authorization";
import { commerceQuote, validCounts, validPricing } from "../../../../lib/commerce-quote.mjs";
import { normalizedWebsite } from "../../../../lib/shop-onboarding.mjs";
import { rateLimitPolicy, rateLimitHeaders } from "../../../../lib/rate-limit";

const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function GET() {
  const user = await getCurrentUser(); if (!user) return reply({ error: "authentication_required" }, 401);
  const operator = await isPlatformOperator(user), db = getDb();
  const [pricing] = await db.select().from(commercePricing).where(eq(commercePricing.id, 1));
  const rows = await db.select({ request: merchantRequests, email: authUsers.email, shopSlug: shops.slug }).from(merchantRequests)
    .innerJoin(authUsers, eq(merchantRequests.userId, authUsers.id))
    .leftJoin(shops, eq(merchantRequests.shopId, shops.id))
    .where(operator ? undefined : eq(merchantRequests.userId, user.userId)).orderBy(desc(merchantRequests.createdAt)).limit(100);
  return reply({ operator, pricing: pricing ?? null, items: rows.map(({ request, email, shopSlug }) => ({ ...request, shopSlug, quote: JSON.parse(request.quoteJson), email: operator ? email : undefined })), paymentAvailable: false });
}

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return reply({ error: "invalid_origin" }, 403);
  const user = await getCurrentUser(); if (!user) return reply({ error: "authentication_required" }, 401);
  const limit = await rateLimitPolicy(request, { scope: "commerce", ipLimit: 30, subject: user.userId, subjectMode: "subject", subjectLimit: 15, windowSeconds: 3600 });
  if (!limit.allowed) return Response.json({ error: "rate_limited" }, { status: 429, headers: rateLimitHeaders(limit.retryAfter) });
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) return reply({ error: "invalid_payload" }, 400);
  const db = getDb();
  if (body.action === "provision") {
    if (!await isPlatformOperator(user)) return reply({ error: "forbidden" }, 403);
    if (typeof body.id !== "string") return reply({ error: "invalid_payload" }, 400);
    const [row] = await db.select({ item: merchantRequests, email: authUsers.email }).from(merchantRequests).innerJoin(authUsers, eq(merchantRequests.userId, authUsers.id)).where(eq(merchantRequests.id, body.id));
    if (!row) return reply({ error: "not_found" }, 404);
    if (row.item.shopId) return reply({ ok: true });
    const website = normalizedWebsite(row.item.websiteUrl);
    if (!website) return reply({ error: "invalid_website" }, 400);
    const slug = `store-${crypto.randomUUID().slice(0, 12)}`;
    const created = await provisionRequest(env.DB!, row.item, row.email, slug, website.domain, new Date(Date.now() + 14 * 86400000).toISOString());
    return reply(created ? { ok: true } : { error: "domain_or_status_conflict" }, created ? 201 : 409);
  }
  if (body.action === "pricing") {
    if (!await isPlatformOperator(user)) return reply({ error: "forbidden" }, 403);
    if (!validPricing(body) || !Number.isSafeInteger(body.revision) || body.revision < 0) return reply({ error: "invalid_pricing" }, 400);
    const values = { monthlyMinor: body.monthlyMinor, suppliedModelMinor: body.suppliedModelMinor, generatedModelMinor: body.generatedModelMinor, revision: body.revision + 1, updatedBy: user.userId, updatedAt: new Date().toISOString() };
    const rows = body.revision === 0
      ? await db.insert(commercePricing).values({ id: 1, ...values }).onConflictDoNothing().returning()
      : await db.update(commercePricing).set(values).where(and(eq(commercePricing.id, 1), eq(commercePricing.revision, body.revision))).returning();
    return reply(rows.length ? { ok: true } : { error: "pricing_changed" }, rows.length ? 200 : 409);
  }
  if (body.action === "review") {
    if (!await isPlatformOperator(user)) return reply({ error: "forbidden" }, 403);
    if (typeof body.id !== "string" || !["pending", "reviewed", "rejected"].includes(body.status) || typeof body.note !== "string" || body.note.length > 2000) return reply({ error: "invalid_payload" }, 400);
    const rows = await db.update(merchantRequests).set({ status: body.status, operatorNote: body.note, updatedBy: user.userId, updatedAt: new Date().toISOString() }).where(eq(merchantRequests.id, body.id)).returning({ id: merchantRequests.id });
    return reply(rows.length ? { ok: true } : { error: "not_found" }, rows.length ? 200 : 404);
  }
  if (body.action !== "request" || typeof body.id !== "string" || !/^[a-f0-9-]{36}$/i.test(body.id) || typeof body.name !== "string" || !body.name.trim() || body.name.length > 100 || !validCounts(body.suppliedCount, body.generatedCount)) return reply({ error: "invalid_payload" }, 400);
  const website = normalizedWebsite(body.websiteUrl); if (!website) return reply({ error: "invalid_website" }, 400);
  let shopId: number | null = null;
  if (body.shop) {
    if (typeof body.shop !== "string") return reply({ error: "invalid_payload" }, 400);
    const access = await authorizedShop(user, body.shop, "setup:write");
    if (!access) return reply({ error: "forbidden" }, 403);
    shopId = access.shop.id;
  }
  // Retry the same request without repricing it or creating a second record.
  const [existing] = await db.select({ userId: merchantRequests.userId }).from(merchantRequests).where(eq(merchantRequests.id, body.id));
  if (existing) return reply(existing.userId === user.userId ? { ok: true, id: body.id } : { error: "conflict" }, existing.userId === user.userId ? 200 : 409);
  const [pricing] = await db.select().from(commercePricing).where(eq(commercePricing.id, 1));
  if ((pricing?.revision ?? 0) !== body.pricingRevision) return reply({ error: "pricing_changed" }, 409);
  const quote = commerceQuote(pricing, body.suppliedCount, body.generatedCount);
  const inserted = await db.insert(merchantRequests).values({ id: body.id, userId: user.userId, shopId, shopName: body.name.trim(), websiteUrl: website.websiteUrl, suppliedCount: body.suppliedCount, generatedCount: body.generatedCount, quoteJson: JSON.stringify(quote) }).onConflictDoNothing().returning({ userId: merchantRequests.userId });
  if (!inserted.length) return reply({ error: "conflict" }, 409);
  return reply({ ok: true, id: body.id }, 201);
}
