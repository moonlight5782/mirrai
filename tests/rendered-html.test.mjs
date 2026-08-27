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
});
