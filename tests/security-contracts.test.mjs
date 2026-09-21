import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url);
const read = path => readFileSync(new URL(path, root), "utf8");

function routeFiles(directory) {
  return readdirSync(new URL(directory, root), { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name === "route.ts")
    .map(entry => join(entry.parentPath, entry.name));
}

test("every admin API route performs an authorization check", () => {
  const unguarded = routeFiles("app/api/admin/").filter(path => {
    const source = readFileSync(path, "utf8");
    return !/\b(?:authorizedShop|isPlatformOperator|getCurrentUser)\s*\(/.test(source);
  });
  assert.deepEqual(unguarded, []);
});

test("asset uploads validate tenant ownership and binary signatures before streaming to R2", () => {
  const route = read("app/api/admin/assets/route.ts");
  const validator = read("lib/asset-validation.ts");
  assert.match(route, /eq\(products\.shopId, access\.shop\.id\)/);
  assert.match(route, /validateAssetHeader\(file, kind, header\)/);
  assert.match(route, /put\(storageKey, file\.stream\(\)/);
  assert.doesNotMatch(route, /await file\.arrayBuffer\(\)/);
  assert.match(validator, /getUint32\(4, true\) !== 2/);
  assert.match(validator, /getUint32\(8, true\) !== file\.size/);
  assert.match(validator, /0x50, 0x4b, 0x03, 0x04/);
});

test("abuse-prone public routes are protected by durable rate limits", () => {
  for (const path of [
    "app/api/auth/register/route.ts",
    "app/api/widget/config/route.ts",
    "app/api/widget/events/route.ts",
  ]) {
    assert.match(read(path), /await rateLimit\(/, path);
  }
  const limiter = read("lib/rate-limit.ts");
  assert.match(limiter, /ON CONFLICT\(bucket_key\) DO UPDATE/);
  assert.match(limiter, /crypto\.subtle\.digest\("SHA-256"/);
});

test("widget access fails closed until the requesting store domain is allowed", () => {
  const cors = read("app/api/widget/cors.ts");
  assert.match(cors, /Boolean\(domain\)/);
  assert.doesNotMatch(cors, /!allowedDomains\.length/);
});

test("universal widget prefers explicit SKU markup and URL guessing is opt-in", () => {
  const widget = read("public/mirrai-widget.js");
  assert.match(widget, /globalConfig\.allowUrlSku === "true"/);
  assert.match(widget, /sku_not_detected/);
  assert.match(widget, /config\.auto === "universal" && !document\.querySelector\("\[data-mirrai-sku\]"\)/);
});
