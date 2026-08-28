import { eq } from "drizzle-orm";
import { getChatGPTUser } from "../../../../chatgpt-auth";
import { getDb } from "../../../../../db";
import { authorizedShop } from "../../../../../db/authorization";
import { products, shops } from "../../../../../db/schema";
import { parseFurnitureSitemap, validatedCatalogSource } from "../../../../../lib/catalog-sitemap";

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "authentication_required" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { shop?: string; offset?: number };
  const access = await authorizedShop(user, body.shop);
  if (!access) return Response.json({ error: "shop_not_found" }, { status: 404 });
  const source = validatedCatalogSource(access.shop.websiteUrl, access.shop.catalogSourceUrl);
  if (!source) return Response.json({ error: "catalog_source_not_configured" }, { status: 400 });
  const db = getDb();
  let response: Response;
  try { response = await fetch(source, { headers: { accept: "application/xml,text/xml;q=0.9", "user-agent": "MIRRAI Catalog Sync/1.0" }, signal: AbortSignal.timeout(20_000) }); }
  catch {
    await db.update(shops).set({ catalogSyncStatus: "blocked", catalogSyncMessage: "Не удалось безопасно открыть sitemap. Проверьте HTTPS-сертификат магазина." }).where(eq(shops.id, access.shop.id));
    return Response.json({ error: "source_unreachable", message: "Проверьте HTTPS-сертификат магазина." }, { status: 502 });
  }
  if (!response.ok) {
    await db.update(shops).set({ catalogSyncStatus: "failed", catalogSyncMessage: `Sitemap вернул HTTP ${response.status}` }).where(eq(shops.id, access.shop.id));
    return Response.json({ error: "source_http_error", status: response.status }, { status: 502 });
  }
  const xml = await response.text();
  if (xml.length > 8_000_000) return Response.json({ error: "source_too_large" }, { status: 413 });
  const catalog = parseFurnitureSitemap(xml);
  const offset = Math.max(0, Math.floor(Number(body.offset) || 0));
  const page = catalog.slice(offset, offset + 100);
  const now = new Date().toISOString();
  for (const item of page) {
    await db.insert(products).values({ shopId: access.shop.id, externalId: item.externalId, sku: item.sku, name: item.name, category: item.category, sourceUrl: item.sourceUrl, imageUrls: JSON.stringify(item.imageUrls), sourceUpdatedAt: item.sourceUpdatedAt, widthCm: item.widthCm, depthCm: item.depthCm, heightCm: item.heightCm, updatedAt: now }).onConflictDoUpdate({ target: [products.shopId, products.sku], set: { externalId: item.externalId, name: item.name, category: item.category, sourceUrl: item.sourceUrl, imageUrls: JSON.stringify(item.imageUrls), sourceUpdatedAt: item.sourceUpdatedAt, widthCm: item.widthCm, depthCm: item.depthCm, heightCm: item.heightCm, active: true, updatedAt: now } });
  }
  const nextOffset = offset + page.length < catalog.length ? offset + page.length : null;
  await db.update(shops).set({ catalogSyncStatus: nextOffset === null ? "ready" : "syncing", catalogSyncedAt: nextOffset === null ? now : access.shop.catalogSyncedAt, catalogSyncMessage: nextOffset === null ? `Найдено ${catalog.length} предметов мебели` : `Импортировано ${nextOffset} из ${catalog.length}` }).where(eq(shops.id, access.shop.id));
  return Response.json({ ok: true, imported: page.length, total: catalog.length, nextOffset });
}
