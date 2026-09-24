import test from "node:test";
import assert from "node:assert/strict";
import { commerceQuote, validPricing, validCounts } from "../lib/commerce-quote.mjs";
const pricing = { monthlyMinor: 10000, suppliedModelMinor: 2000, generatedModelMinor: 12000, revision: 1 };
test("quote separates recurring subscription from one-time work and prices supplied models lower", () => {
  assert.equal(commerceQuote(pricing, 10, 0).firstPeriodMinor, 30000);
  assert.equal(commerceQuote(pricing, 0, 10).firstPeriodMinor, 130000);
  assert.equal(commerceQuote(pricing, 2, 3).preparationMinor, 40000);
  assert.equal(commerceQuote(pricing, 2, 3).monthlyMinor, 10000);
});
test("unconfigured rates are not represented as a free service", () => {
  assert.deepEqual(commerceQuote(null, 1, 0), { configured: false, currency: "MDL", suppliedCount: 1, generatedCount: 0 });
  assert.equal(validPricing({ ...pricing, generatedModelMinor: 1000 }), false);
  assert.equal(validPricing({ ...pricing, monthlyMinor: NaN }), false);
});
test("fractional, negative, excessive and coerced counts cannot affect billing", () => {
  for (const pair of [[0, 0], [-1, 2], [1.5, 2], ["1", 2], [10000, 1], [Infinity, 1]]) {
    assert.equal(validCounts(...pair), false); assert.throws(() => commerceQuote(pricing, ...pair));
  }
});
