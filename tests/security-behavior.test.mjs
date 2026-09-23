import assert from "node:assert/strict";
import test from "node:test";
import { validateAssetHeader } from "../lib/asset-validation.ts";
import { applyRateLimitPolicy } from "../lib/rate-limit-core.mjs";
import { membershipAllowsShop } from "../db/authorization-policy.mjs";
import { widgetDomainAllowed } from "../app/api/widget/cors.ts";
import { installationIsConnected } from "../lib/installation-status.ts";

function glbHeader(size, version = 2) {
  const bytes = new Uint8Array(16);
  bytes.set([0x67, 0x6c, 0x54, 0x46]);
  const view = new DataView(bytes.buffer);
  view.setUint32(4, version, true);
  view.setUint32(8, size, true);
  return bytes;
}

test("asset validator accepts real signatures and rejects spoofed or inconsistent files", () => {
  assert.deepEqual(validateAssetHeader({ name: "chair.glb", type: "model/gltf-binary", size: 256 }, "glb", glbHeader(256)), { ok: true, extension: "glb", contentType: "model/gltf-binary" });
  assert.equal(validateAssetHeader({ name: "chair.glb", type: "model/gltf-binary", size: 512 }, "glb", glbHeader(256)).ok, false);
  assert.equal(validateAssetHeader({ name: "chair.glb", type: "model/gltf-binary", size: 256 }, "glb", glbHeader(256, 1)).ok, false);
  assert.deepEqual(validateAssetHeader({ name: "room.png", type: "image/png", size: 128 }, "photo", Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), { ok: true, extension: "png", contentType: "image/png" });
  assert.equal(validateAssetHeader({ name: "room.png", type: "image/png", size: 128 }, "photo", Uint8Array.from([0xff, 0xd8, 0xff])).ok, false);
  assert.equal(validateAssetHeader({ name: "chair.usdz", type: "model/vnd.usdz+zip", size: 128 }, "usdz", Uint8Array.from([0x50, 0x4b, 0x03, 0x04])).ok, true);
});

class MemoryRateStore {
  buckets = new Map();
  cleanupCalls = 0;
  async increment(key, windowStartedAt, expiresAt) {
    const current = this.buckets.get(key);
    const count = current?.windowStartedAt === windowStartedAt ? current.count + 1 : 1;
    this.buckets.set(key, { count, windowStartedAt, expiresAt });
    return count;
  }
  async cleanup(now) {
    this.cleanupCalls += 1;
    for (const [key, bucket] of this.buckets) if (bucket.expiresAt < now) this.buckets.delete(key);
  }
}

test("changing shopId cannot bypass the IP-wide limiter or grow a subject bucket after denial", async () => {
  const store = new MemoryRateStore();
  const request = new Request("https://mirrai.example/api/widget/config", { headers: { "cf-connecting-ip": "203.0.113.7" } });
  const policy = subject => ({ scope: "widget-config", ipLimit: 2, subjectLimit: 2, windowSeconds: 60, subject });
  assert.equal((await applyRateLimitPolicy(request, policy("shop-a"), store, 120)).allowed, true);
  assert.equal((await applyRateLimitPolicy(request, policy("shop-b"), store, 120)).allowed, true);
  assert.equal((await applyRateLimitPolicy(request, policy("shop-c"), store, 120)).allowed, false);
  assert.equal(store.buckets.size, 3);
  assert.equal(store.cleanupCalls, 3);
});

test("tenant policy rejects a valid role when the membership belongs to another shop", () => {
  const membership = { shopId: "shop-a", role: "owner" };
  assert.equal(membershipAllowsShop(membership, "shop-a", "catalog:write"), true);
  assert.equal(membershipAllowsShop(membership, "shop-b", "catalog:write"), false);
  assert.equal(membershipAllowsShop({ shopId: "shop-a", role: "analyst" }, "shop-a", "catalog:write"), false);
});

test("widget domain policy fails closed and allows only the API origin or configured store", () => {
  const api = "https://mirrai.example/api/widget/config";
  assert.equal(widgetDomainAllowed(new Request(api), []), false);
  assert.equal(widgetDomainAllowed(new Request(api, { headers: { origin: "https://shop.example" } }), ["shop.example"]), true);
  assert.equal(widgetDomainAllowed(new Request(api, { headers: { origin: "https://attacker.example" } }), ["shop.example"]), false);
  assert.equal(widgetDomainAllowed(new Request(api, { headers: { origin: "https://mirrai.example" } }), []), true);
});

test("dashboard and setup share the server installation status", () => {
  assert.equal(installationIsConnected("connected"), true);
  assert.equal(installationIsConnected("active"), false);
  assert.equal(installationIsConnected("waiting"), false);
  assert.equal(installationIsConnected(undefined), false);
});
