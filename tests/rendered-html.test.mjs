import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
}

test("server renders the furniture-first MIRRAI experience", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /MIRRAI — мебель в вашем пространстве/i);
  assert.match(html, /AR ДЛЯ МЕБЕЛЬНЫХ МАГАЗИНОВ/i);
  assert.match(html, /Мебель —/i);
  assert.doesNotMatch(html, /Your site is taking shape|codex-preview/i);
});

test("widget contract includes product data, scale and store events", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /params\.get\("widget"\)/);
  assert.match(page, /params\.get\("productId"\)/);
  assert.match(page, /params\.get\("iosModel"\)/);
  assert.match(page, /getDimensions/);
  assert.match(page, /"ar-scale": "fixed"/);
  assert.match(page, /mirrai-widget/);
  assert.match(page, /object_placed/);
  assert.match(page, /subscription.*inactive/);
});

test("renders a real store-card integration demo", async () => {
  const response = await render("/demo-store");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /HUGGE × MIRRAI/i);
  assert.match(html, /рабочая AR-витрина/i);
});

test("HUGGE demo reads real products and model states from the shared catalogue", async () => {
  const [store, route] = await Promise.all([
    readFile(new URL("../app/demo-store/store.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/storefront/catalog/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(store, /api\/storefront\/catalog\?shop=hugge-md/);
  assert.match(store, /catalog\.items\.find\(item => item\.demoAvailable\)/);
  assert.match(store, /AR появится после создания 3D-модели/);
  assert.match(store, /selected\.model/);
  assert.match(route, /leftJoin\(productModels/);
  assert.match(route, /demoAvailable/);
  assert.match(route, /published/);
});

test("embeddable SDK creates a product-aware accessible AR launcher", async () => {
  const sdk = await readFile(new URL("../public/mirrai-widget.js", import.meta.url), "utf8");
  assert.match(sdk, /window\.MirraiWidget/);
  assert.match(sdk, /xr-spatial-tracking/);
  assert.match(sdk, /aria-modal/);
  assert.match(sdk, /productId/);
  assert.match(sdk, /object_placed/);
  assert.match(sdk, /mirrai:event/);
  assert.match(sdk, /api\/widget\/config/);
  assert.match(sdk, /shopId/);
  assert.match(sdk, /textured: "1"/);
  assert.match(sdk, /textured: config\.textured/);
});

test("admin catalog is backed by durable model lifecycle data", async () => {
  const [schema, admin, configRoute, migration] = await Promise.all([
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/catalog/catalog-admin.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/widget/config/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0000_special_lethal_legion.sql", import.meta.url), "utf8"),
  ]);
  assert.match(schema, /productModels/);
  assert.match(schema, /widgetEvents/);
  assert.match(admin, /Без модели/);
  assert.match(admin, /Опубликована/);
  assert.match(configRoute, /subscriptionStatus/);
  assert.match(configRoute, /status !== "published"/);
  assert.match(migration, /CLOUD-001/);
});

test("anonymous visitors get a working admin entry instead of an auth redirect", async () => {
  for (const path of ["/admin/clients", "/admin/catalog?shop=nordform", "/admin/analytics?shop=nordform", "/admin/setup?shop=nordform", "/admin/subscription?shop=nordform"]) {
    const response = await render(path);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /Войти в кабинет/i);
    assert.match(html, /signin-with-chatgpt/i);
    assert.match(html, /Клиенты/i);
    assert.match(html, /Каталог/i);
    assert.match(html, /Аналитика/i);
    assert.match(html, /Установка/i);
  }
});

test("navigation preserves shop context and furniture viewer URLs", async () => {
  const [home, navigation, adminRoot, subscription] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/admin-navigation.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/subscription/subscription-admin.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(home, /history\.pushState/);
  assert.match(home, /\.get\("product"\)/);
  assert.match(home, /popstate/);
  assert.match(navigation, /Активный магазин/);
  assert.match(navigation, /admin\/subscription/);
  assert.match(navigation, /encodeURIComponent\(shopSlug\)/);
  assert.match(adminRoot, /redirect\("\/admin\/clients"\)/);
  assert.match(subscription, /ТАРИФ И ДОСТУП/);
});

test("nontechnical setup wizard provides auto-scan installation and domain checks", async () => {
  const [wizard, sdk, installRoute, cors, migration] = await Promise.all([
    readFile(new URL("../app/admin/setup/setup-wizard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../public/mirrai-widget.js", import.meta.url), "utf8"),
    readFile(new URL("../app/api/widget/install/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/widget/cors.ts", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0001_sad_roughhouse.sql", import.meta.url), "utf8"),
  ]);
  assert.match(wizard, /Подключение магазина/);
  assert.match(wizard, /Отправить разработчику/);
  assert.match(wizard, /data-mirrai-sku/);
  assert.match(sdk, /querySelectorAll\("\[data-mirrai-sku\]"\)/);
  assert.match(sdk, /api\/widget\/install/);
  assert.match(installRoute, /domain_not_allowed/);
  assert.match(cors, /Access-Control-Allow-Origin/);
  assert.match(migration, /installation_status/);
});

test("commercial pilot architecture supports tenants, imports, R2 assets and scalable SDK", async () => {
  const [schema, auth, clients, importer, upload, config, sdk, hosting, migration] = await Promise.all([
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/authorization.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/clients/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/catalog/import/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/assets/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/widget/config/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../public/mirrai-widget.js", import.meta.url), "utf8"),
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0002_complex_tigra.sql", import.meta.url), "utf8"),
  ]);
  assert.match(schema, /shopMembers/); assert.match(schema, /shopInvites/); assert.match(schema, /platformOperators/); assert.match(schema, /export const assets/);
  assert.match(auth, /acceptInvites/); assert.match(clients, /ownerEmail/); assert.match(importer, /parseCsv/); assert.match(upload, /getUploadsBucket/);
  assert.match(config, /export async function POST/); assert.match(config, /skus/); assert.match(sdk, /MutationObserver/); assert.match(sdk, /version: "1\.1\.0"/); assert.match(sdk, /mountProductPage/); assert.match(sdk, /destroy/);
  assert.match(hosting, /"r2": "UPLOADS"/); assert.match(migration, /CREATE TABLE `assets`/);
});

test("store owners receive installable WooCommerce and Shopify integrations", async () => {
  const [woo, shopify] = await Promise.all([
    readFile(new URL("../integrations/woocommerce/mirrai-ar/mirrai-ar.php", import.meta.url), "utf8"),
    readFile(new URL("../integrations/shopify/blocks/mirrai-ar.liquid", import.meta.url), "utf8"),
  ]);
  assert.match(woo, /Plugin Name: MIRRAI AR/); assert.match(woo, /woocommerce_after_add_to_cart_form/); assert.match(woo, /variation\.sku/);
  assert.match(shopify, /selected_or_first_available_variant/); assert.match(shopify, /variant:change/); assert.match(shopify, /MIRRAI Shop ID/);
});

test("HUGGE pilot imports website photos and installs automatically on OpenCart", async () => {
  const [schema, migration, syncRoute, parser, catalog, setup, sdk] = await Promise.all([
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0003_colossal_the_fallen.sql", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/catalog/sync/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/catalog-sitemap.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/catalog/catalog-admin.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/setup/setup-wizard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../public/mirrai-widget.js", import.meta.url), "utf8"),
  ]);
  assert.match(schema, /catalogSourceUrl/); assert.match(schema, /imageUrls/); assert.match(migration, /'hugge-md','HUGGE\.md'/); assert.match(migration, /HUGGE-89990/);
  assert.match(syncRoute, /validatedCatalogSource/); assert.match(syncRoute, /slice\(offset, offset \+ 100\)/); assert.match(parser, /parseFurnitureSitemap/); assert.match(parser, /source\.protocol !== "https:"/);
  assert.match(catalog, /Обновить с сайта/); assert.match(catalog, /Фото найдено/); assert.match(setup, /data-auto="product"/); assert.match(sdk, /\.us-product-info-code/); assert.match(sdk, /data-mirrai-auto-product/);
});

test("batch 3D generation requires texture and never publishes unreviewed models", async () => {
  const [schema, migration, cachedSource, restoredJob, shapeRetry, downloadRetry, retexture, sf3dRetry, geometryRestore, repairedAlba, albaCacheBust, originalTexturedAlba, crossedBaseAlba, route, catalog, home] = await Promise.all([
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0004_early_legion.sql", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0005_cached_hugge_alba.sql", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0006_restore_hugge_alba_job.sql", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0007_retry_hugge_alba_shape.sql", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0008_retry_hugge_alba_download.sql", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0009_retexture_hugge_alba.sql", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0010_retry_alba_sf3d_session.sql", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0011_restore_alba_geometry.sql", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0012_publish_alba_repaired_pbr.sql", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0013_alba_shell_cache_bust.sql", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0014_alba_original_geometry_textures.sql", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0015_alba_crossed_sled_base.sql", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/generation/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/catalog/catalog-admin.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(schema, /generationJobs/); assert.match(migration, /hugge-alba-89990/); assert.match(route, /RECONSTRUCTION_API_URL/); assert.match(route, /HUGGINGFACE_SPACE_URL/); assert.match(route, /generation_all/); assert.match(route, /shape_generation/); assert.match(route, /run_button/); assert.match(route, /stable-fast-3d/); assert.match(route, /Remove Background/); assert.match(route, /queue\/join/); assert.match(route, /queue\/data/); assert.match(route, /untextured_model_rejected/);
  assert.match(cachedSource, /catalog-sources\/hugge-md\/alba-89990-1\.jpg/); assert.match(cachedSource, /`status`='queued'/); assert.match(route, /config\.kind === "huggingface" \? 1 : 3/); assert.match(route, /sameHost\(imageUrl, appOrigin\)/);
  assert.match(restoredJob, /INSERT OR IGNORE INTO `generation_jobs`/); assert.match(restoredJob, /hugge-alba-89990/);
  assert.match(shapeRetry, /`error_code`='texture_fallback'/); assert.match(route, /function findGlb/); assert.match(route, /findGlb\(data\[1\]\)/);
  assert.match(downloadRetry, /Gradio file proxy/); assert.match(route, /gradio_api\/file=/); assert.match(route, /call\/\$\{textured \? "all" : "shape"\}\/file=/);
  assert.match(retexture, /hugge-alba-89990-textured/); assert.match(retexture, /обязательны геометрия и текстура/); assert.match(route, /Текстурированная модель создана/);
  assert.match(sf3dRetry, /сессионную очередь Stable Fast 3D/); assert.match(sf3dRetry, /`attempt`=0/);
  assert.match(geometryRestore, /fbb61c25-5942-4deb-a892-9e241f436279/); assert.match(geometryRestore, /texture-only/); assert.match(route, /currentModel\?\.glbUrl/); assert.match(route, /texture-only обработка/); assert.match(home, /GEOMETRY PREVIEW/);
  assert.match(repairedAlba, /alba-chair-repaired-pbr\.glb/); assert.match(repairedAlba, /`status`='published'/); assert.match(repairedAlba, /PBR-велюр/);
  assert.match(albaCacheBust, /alba-chair-repaired-pbr-v2\.glb/); assert.match(albaCacheBust, /Цельная оболочка/);
  assert.match(originalTexturedAlba, /alba-chair-original-textured-v3\.glb/); assert.match(originalTexturedAlba, /402264 грани/);
  assert.match(crossedBaseAlba, /alba-chair-cross-base-v4\.glb/); assert.match(crossedBaseAlba, /двух непрерывных стальных полозьев/);
  const albaTextureOnly = await readFile(new URL("../scripts/texture_only_alba.py", import.meta.url), "utf8");
  assert.match(albaTextureOnly, /crossed_sled_base/); assert.match(albaTextureOnly, /damaged_frame_mask/); assert.doesNotMatch(albaTextureOnly, /clean_steel_frame/);
  assert.match(route, /status: "review"/); assert.doesNotMatch(route, /status: "published"/); assert.match(catalog, /ПАКЕТНАЯ ГЕНЕРАЦИЯ 3D/); assert.match(catalog, /Добавить выбранные/);
});
