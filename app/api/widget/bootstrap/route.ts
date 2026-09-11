import { getDb } from "../../../../db";
import { shops } from "../../../../db/schema";
import { subscriptionAccess } from "../../../../db/subscription.mjs";
import { widgetJson, widgetOptions } from "../cors";

export function OPTIONS(request: Request) { return widgetOptions(request); }

function hostname(value: string | null) {
  if (!value) return "";
  try { return new URL(value).hostname.toLowerCase().replace(/^www\./, ""); } catch { return ""; }
}

export async function GET(request: Request) {
  const domain = hostname(request.headers.get("origin")) || hostname(request.headers.get("referer"));
  if (!domain) return widgetJson(request, { error: "domain_required" }, { status: 400 });
  const rows = await getDb().select().from(shops);
  const matches = rows.filter(item => {
    let allowed: string[] = []; try { allowed = JSON.parse(item.allowedDomains || "[]"); } catch { allowed = []; }
    return allowed.some(value => value.toLowerCase().replace(/^www\./, "") === domain) || hostname(item.websiteUrl) === domain;
  });
  if (matches.length === 0) return widgetJson(request, { error: "store_not_connected" }, { status: 404 });
  if (matches.length > 1) return widgetJson(request, { error: "domain_ambiguous" }, { status: 409 });
  const shop = matches[0];
  const access = subscriptionAccess(shop);
  return widgetJson(request, { shopId: shop.slug, platform: shop.platform, skuPrefix: shop.slug === "hugge-md" ? "HUGGE-" : "", subscriptionActive: access.allowed, expiresAt: access.expiresAt });
}
