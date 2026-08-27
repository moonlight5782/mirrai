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
  assert.match(html, /Демонстрация виджета MIRRAI/i);
  assert.match(html, /Кресло Cloud/i);
  assert.match(html, /mirrai-demo-slot/i);
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
