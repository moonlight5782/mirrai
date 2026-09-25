import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Miniflare } from "miniflare";
import { derivePasswordHash } from "../lib/password-hash.mjs";

test("password hashes remain compatible in actual Workers runtime above WebCrypto limit", async () => {
  const source = readFileSync(new URL("../lib/password-hash.mjs", import.meta.url), "utf8");
  const worker = new Miniflare({ modules: true, compatibilityDate: "2026-01-01", compatibilityFlags: ["nodejs_compat"], script: source + `\nexport default {fetch(){return Response.json([210000,100000].map(n=>derivePasswordHash('Тест-password42',new Uint8Array(16).fill(7),n)))}}` });
  try {
    const response = await worker.dispatchFetch("https://test.invalid");
    assert.equal(response.status, 200);
    const hashes = await response.json();
    for (const [index, iterations] of [210000, 100000].entries()) {
      const key = await crypto.subtle.importKey("raw", new TextEncoder().encode("Тест-password42"), "PBKDF2", false, ["deriveBits"]);
      const bits = await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt:new Uint8Array(16).fill(7),iterations}, key, 256);
      assert.equal(hashes[index], Buffer.from(bits).toString("base64"));
      assert.notEqual(hashes[index], derivePasswordHash("wrong-password42", new Uint8Array(16).fill(7), iterations));
    }
  } finally { await worker.dispose(); }
});
