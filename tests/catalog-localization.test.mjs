import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { localizeCatalogItem } from "../lib/catalog-localization.mjs";
import { productNameForVariant } from "../lib/product-label.mjs";
const snapshot = JSON.parse(readFileSync(new URL("../static-demo/catalog.json", import.meta.url)));
test("every public HUGGE name, material and variant is translated without changing assets or scale", () => {
  for (const locale of ["ro", "en"]) for (const item of snapshot.items) {
    const translated = localizeCatalogItem(item, locale);
    for (const text of [translated.name, translated.material, ...translated.variants.flatMap(v => [v.name, v.colorName, v.material])]) assert.doesNotMatch(text, /[а-яё]/iu, `${locale}: ${text}`);
    for (const key of ["sku", "model", "iosModel", "width", "depth", "height", "color"]) assert.equal(translated[key], item[key]);
    translated.variants.forEach((v, index) => assert.equal(v.model, item.variants[index].model));
    assert.deepEqual(localizeCatalogItem(translated, "ru"), localizeCatalogItem(item, "ru"));
  }
});
test("Ria screenshot regression and switching language on a shared viewer link", () => {
  const item = snapshot.items.find(p => p.sku === "HUGGE-109553");
  const ro = localizeCatalogItem(item, "ro");
  assert.equal(ro.name, "Canapea Ria Actona, 150 × 84 × 78 cm");
  assert.equal(localizeCatalogItem(ro, "en").name, "Ria Actona sofa, 150 × 84 × 78 cm");
});
test("variant names replace the existing translated color, not duplicate it", () => {
  assert.equal(productNameForVariant("Scaun Brooke Actona, catifea, gri", "Verde"), "Scaun Brooke Actona, catifea, verde");
  assert.equal(productNameForVariant("Polo Actona bedside table, white, 40 × 51 cm", "Black"), "Polo Actona bedside table, black, 40 × 51 cm");
});
