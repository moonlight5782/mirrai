import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { publicCatalog, assetPaths, widgetConfigs, neutralCatalog, neutralAssetPath } from "../scripts/static-demo-data.mjs";

const snapshot = JSON.parse(readFileSync(new URL("../static-demo/catalog.json", import.meta.url)));

test("neutral demo removes merchant branding and outbound links without changing products", () => {
  const original = publicCatalog(snapshot);
  const neutral = neutralCatalog(original);
  assert.doesNotMatch(JSON.stringify(neutral), /hugge/i);
  assert.equal(neutral.shop.slug, "demo-md");
  const configs = widgetConfigs(neutral);
  for (const [index, item] of neutral.items.entries()) {
    const before = original.items[index];
    assert.equal(item.sourceUrl, null);
    if (/\d/.test(before.price)) assert.equal(item.price, before.price);
    assert.deepEqual([item.width, item.height, item.depth], [before.width, before.height, before.depth]);
    assert.equal(item.model, neutralAssetPath(before.model));
    assert.equal(configs[item.sku].model, item.model);
    assert.equal(configs[item.sku].shopId, "demo-md");
    for (const variant of item.variants) assert.equal(configs[variant.sku].model, variant.model);
  }
  assert.deepEqual(assetPaths(neutral), assetPaths(original).map(neutralAssetPath).sort());
  assert.equal(original.shop.slug, "hugge-md", "source remains reusable for the tailored demo");
});
test("static demo exports only public shop/catalog fields", () => {
  const data = publicCatalog({ ...snapshot, apiKey: "secret", shop: { ...snapshot.shop, ownerEmail: "private" } });
  assert.equal(data.items.length, 16);
  assert.equal(data.counts.published, 16);
  assert.ok(!JSON.stringify(data).includes("secret"));
  assert.ok(!JSON.stringify(data).includes("private"));
  assert.throws(() => publicCatalog({ ...snapshot, shop: { slug: "another-shop" } }));
});
test("all SKU and color choices resolve to their exact published model", () => {
  const catalog = publicCatalog(snapshot), configs = widgetConfigs(catalog);
  for (const item of catalog.items) {
    assert.equal(configs[item.sku].model, item.model);
    assert.equal(configs[item.sku].width, item.width);
    for (const variant of item.variants) {
      assert.equal(configs[variant.sku].model, variant.model);
      assert.equal(configs[variant.sku].color, variant.color);
      assert.equal(configs[variant.sku].available, Boolean(variant.available && variant.model));
    }
  }
  assert.equal(configs['UNKNOWN-SKU'], undefined);
});
test("asset packaging rejects external URLs and traversal", () => {
  const catalog = publicCatalog(snapshot);
  assert.equal(assetPaths(catalog).filter(path => path.endsWith('.glb')).length, 16);
  for (const unsafe of ['https://example.com/file.glb', '/catalog/../../.env', '/catalog/../file.glb', '/uploads/private.glb']) {
    const changed = structuredClone(catalog); changed.items[0].model = unsafe;
    assert.throws(() => assetPaths(changed));
  }
});
