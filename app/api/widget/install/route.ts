import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { shops } from "../../../../db/schema";
import { widgetJson, widgetOptions } from "../cors";

export function OPTIONS(request: Request) { return widgetOptions(request); }

function hostname(value: string | null) {
  if (!value) return "";
  try { return new URL(value).hostname.toLowerCase().replace(/^www\./, ""); } catch { return ""; }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { shopId?: string; pageUrl?: string };
  const slug = body.shopId?.slice(0, 80) ?? "";
  if (!slug) return widgetJson(request, { error: "shop_required" }, { status: 400 });
  const db = getDb();
  const [shop] = await db.select().from(shops).where(eq(shops.slug, slug)).limit(1);
  if (!shop) return widgetJson(request, { error: "shop_not_found" }, { status: 404 });
  const domain = hostname(request.headers.get("origin")) || hostname(request.headers.get("referer")) || hostname(body.pageUrl ?? null);
  const allowed = JSON.parse(shop.allowedDomains || "[]") as string[];
  if (allowed.length && !allowed.includes(domain)) return widgetJson(request, { error: "domain_not_allowed" }, { status: 403 });
  const now = new Date().toISOString();
  await db.update(shops).set({ installationStatus: "connected", installationCheckedAt: now }).where(eq(shops.id, shop.id));
  return widgetJson(request, { ok: true, checkedAt: now }, { status: 202 });
}
