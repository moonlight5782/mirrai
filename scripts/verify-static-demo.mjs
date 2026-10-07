/** Deployment gate: catch wrong branding, missing models and changed asset bytes. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { assetPaths, neutralAssetPath, publicCatalog, widgetConfigs } from "./static-demo-data.mjs";

const neutral = !process.argv.includes("--hugge");
const root = new URL("../", import.meta.url);
const read = path => readFileSync(new URL(path, root));
const catalog = JSON.parse(read("outputs/static-demo/site/demo-data/catalog.json"));
const original = publicCatalog(JSON.parse(read("static-demo/catalog.json")));
assert.equal(catalog.shop.slug, neutral ? "demo-md" : "hugge-md");
if (neutral) assert.doesNotMatch(JSON.stringify(catalog), /hugge/i);
assert.equal(catalog.items.length, original.items.length);
for (const asset of assetPaths(original)) {
  const target = neutral ? neutralAssetPath(asset) : asset;
  assert.ok(read(`public${asset}`).equals(read(`outputs/static-demo/site${target}`)), target);
}
for (const [sku, config] of Object.entries(widgetConfigs(catalog))) {
  assert.deepEqual(JSON.parse(read(`outputs/static-demo/site/demo-data/widget-${sku}.json`)), config);
}
console.log(`Verified ${catalog.items.length} products, all assets and variant configs (${neutral ? "neutral" : "hugge"})`);
