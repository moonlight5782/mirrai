import assert from "node:assert/strict";
import test from "node:test";
import { productNameForVariant } from "../lib/product-label.mjs";

test("variant labels replace existing colours, including an unchanged colour", () => {
  assert.equal(productNameForVariant("Brooke, Серый цвет", "Серый"), "Brooke, Серый цвет");
  assert.equal(productNameForVariant("Brooke, Серый цвет", "Зелёный"), "Brooke, Зелёный цвет");
  assert.equal(productNameForVariant("Polo, Черный цвет", "Белый"), "Polo, Белый цвет");
  assert.equal(productNameForVariant("Alba", "VIC 28"), "Alba — VIC 28");
  assert.equal(productNameForVariant("Brooke, Серый цвет", "$&"), "Brooke, $& цвет");
});
