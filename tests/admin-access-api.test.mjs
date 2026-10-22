import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import { drizzle } from "drizzle-orm/d1";

const require = createRequire(import.meta.url);
function moduleFrom(path, resolve) {
  const source = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const compiled = { exports: {} };
  vm.runInNewContext(source, { module: compiled, exports: compiled.exports, require: resolve, Request, Response, URL, Date, console, crypto });
  return compiled.exports;
}

function fixture(t) {
  const sqlite = new DatabaseSync(":memory:"); t.after(() => sqlite.close());
  sqlite.exec(`CREATE TABLE shops (
    id INTEGER PRIMARY KEY, slug TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
    subscription_status TEXT NOT NULL DEFAULT 'trial', website_url TEXT,
    allowed_domains TEXT NOT NULL DEFAULT '[]', platform TEXT NOT NULL DEFAULT 'other',
    catalog_source_type TEXT NOT NULL DEFAULT 'manual', catalog_source_url TEXT,
    catalog_sync_status TEXT NOT NULL DEFAULT 'not_configured', catalog_synced_at TEXT,
    catalog_sync_message TEXT, installation_status TEXT NOT NULL DEFAULT 'not_started',
    installation_checked_at TEXT, plan TEXT NOT NULL DEFAULT 'pilot', trial_ends_at TEXT,
    subscription_ends_at TEXT, owner_user_id TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  INSERT INTO shops (slug,name,subscription_status) VALUES ('store-one','Store One','inactive');`);
  const d1 = { prepare(query) { return { bind(...params) { return {
    async raw() { const stmt = sqlite.prepare(query); stmt.setReturnArrays(true); return stmt.all(...params); },
    async all() { return { results: sqlite.prepare(query).all(...params) }; },
    async run() { return { meta: { changes: Number(sqlite.prepare(query).run(...params).changes) } }; },
  }; } }; } };
  const schema = moduleFrom("../db/schema.ts", require), db = drizzle(d1, { schema });
  let operator = false, user = { userId: "operator", email: "operator@example.test" };
  const route = moduleFrom("../app/api/admin/clients/route.ts", name => {
    if (name === "drizzle-orm") return require(name);
    if (name === "cloudflare:workers") return { env: {} };
    if (name.endsWith("/chatgpt-auth")) return { getChatGPTUser: async () => user };
    if (name.endsWith("/db")) return { getDb: () => db };
    if (name.endsWith("/db/authorization")) return { isPlatformOperator: async () => operator };
    if (name.endsWith("/db/schema")) return schema;
    if (name.endsWith("/auth")) return { randomToken: () => "token", sha256: async () => "hash" };
    if (name.endsWith("/db/subscription.mjs")) return { subscriptionAccess: () => ({ allowed: false, status: "inactive", expiresAt: null }) };
    if (name.endsWith("/lib/catalog-readiness.mjs")) return { catalogReadiness: () => ({ total: 0, published: 0 }) };
    if (name.endsWith("/lib/manual-access.mjs")) return require("../lib/manual-access.mjs");
    throw new Error(name);
  });
  const patch = body => route.PATCH(new Request("https://mirrai.test/api/admin/clients", { method: "PATCH", headers: { origin: "https://mirrai.test", "content-type": "application/json" }, body: JSON.stringify(body) }));
  return { sqlite, route, patch, setOperator(value) { operator = value; } };
}

test("only the platform operator can enable or revoke a shop widget", async t => {
  const h = fixture(t);
  assert.equal((await h.patch({ action: "access", shop: "store-one", enabled: true, days: 30 })).status, 403);
  h.setOperator(true);
  const enabled = await h.patch({ action: "access", shop: "store-one", enabled: true, days: 30 });
  assert.equal(enabled.status, 200);
  assert.equal(h.sqlite.prepare("SELECT subscription_status FROM shops WHERE slug='store-one'").get().subscription_status, "active");
  const disabled = await h.patch({ action: "access", shop: "store-one", enabled: false });
  assert.equal(disabled.status, 200);
  assert.equal(h.sqlite.prepare("SELECT subscription_status,subscription_ends_at FROM shops WHERE slug='store-one'").get().subscription_status, "inactive");
});

test("store access changes reject invalid origins, identities and periods", async t => {
  const h = fixture(t); h.setOperator(true);
  const crossSite = await h.route.PATCH(new Request("https://mirrai.test/api/admin/clients", { method: "PATCH", headers: { origin: "https://attacker.test", "content-type": "application/json" }, body: JSON.stringify({ action: "access", shop: "store-one", enabled: true, days: 30 }) }));
  assert.equal(crossSite.status, 403);
  assert.equal((await h.patch({ action: "access", shop: "store-one", enabled: true, days: 0 })).status, 400);
  assert.equal((await h.patch({ action: "access", shop: "missing-store", enabled: true, days: 30 })).status, 404);
  assert.equal(h.sqlite.prepare("SELECT subscription_status FROM shops WHERE slug='store-one'").get().subscription_status, "inactive");
});
