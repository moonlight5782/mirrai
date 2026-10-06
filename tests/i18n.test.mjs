import assert from "node:assert/strict";
import test from "node:test";
import { normalizeLocale, translate } from "../lib/i18n.mjs";
import { messages } from "../lib/translations.mjs";

test("locale normalization has a safe Russian fallback", () => {
  for (const [value, expected] of [["ro-MD", "ro"], ["EN_us", "en"], [null, "ru"], ["de", "ru"], ["<script>", "ru"]]) {
    assert.equal(normalizeLocale(value), expected);
  }
});

test("translations preserve unknown catalog content and interpolate literally", () => {
  assert.equal(translate("ro", "Каталог"), "Catalog");
  assert.equal(translate("en", "Каталог"), "Catalogue");
  assert.equal(translate("ru", "Каталог"), "Каталог");
  assert.equal(translate("en", "HUGGE-89990"), "HUGGE-89990");
  assert.equal(translate("en", "{count} дн.", { count: 14 }), "14 days");
  assert.equal(translate("en", "3D-модель {name}", { name: "$& <Alba>" }), "3D model: $& <Alba>");
  assert.equal(translate("ro", "  Каталог\n"), "Catalog");
});

test("every translation has both languages and preserves its placeholders", () => {
  const params = text => [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
  assert.ok(Object.keys(messages).length > 400);
  for (const [key, translations] of Object.entries(messages)) {
    for (const locale of ["ro", "en"]) {
      assert.ok(translations[locale]?.trim(), `${locale}: ${key}`);
      assert.deepEqual(params(translations[locale]), params(key), `${locale}: ${key}`);
    }
  }
});
