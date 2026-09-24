import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import { drizzle } from "drizzle-orm/d1";
import * as quote from "../lib/commerce-quote.mjs";
import * as onboarding from "../lib/shop-onboarding.mjs";
import * as provisioning from "../lib/provision-request.mjs";
const require = createRequire(import.meta.url);
function moduleFrom(path, resolve) {
  const source = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const compiled = { exports: {} };
  vm.runInNewContext(source, { module: compiled, exports: compiled.exports, require: resolve, Request, Response, URL, Date, console, crypto });
  return compiled.exports;
}
function fixture(t) {
  const sqlite = new DatabaseSync(":memory:"); t.after(() => sqlite.close());
  sqlite.exec("PRAGMA foreign_keys=ON; CREATE TABLE auth_users(id TEXT PRIMARY KEY,email TEXT); CREATE TABLE shops(id INTEGER PRIMARY KEY,slug TEXT UNIQUE,name TEXT,website_url TEXT,allowed_domains TEXT,owner_user_id TEXT,subscription_status TEXT,trial_ends_at TEXT,plan TEXT,installation_status TEXT); CREATE TABLE shop_members(shop_id INTEGER REFERENCES shops(id),user_id TEXT REFERENCES auth_users(id),email TEXT,role TEXT,UNIQUE(shop_id,user_id)); INSERT INTO auth_users VALUES('a','a@example.test'),('b','b@example.test');");
  sqlite.exec(readFileSync(new URL("../drizzle/0035_faithful_wendell_rand.sql", import.meta.url), "utf8"));
  const schema = moduleFrom("../db/schema.ts", require);
  const d1 = { prepare(query) { return { bind(...params) { return {
    async raw() { const stmt = sqlite.prepare(query); stmt.setReturnArrays(true); return stmt.all(...params); },
    async all() { return { results: sqlite.prepare(query).all(...params) }; },
    async run() { return { meta: { changes: Number(sqlite.prepare(query).run(...params).changes) } }; },
  }; } }; } };
  d1.batch = async statements => {
    sqlite.exec("BEGIN");
    try { const results = []; for (const statement of statements) results.push(await statement.run()); sqlite.exec("COMMIT"); return results; }
    catch (error) { sqlite.exec("ROLLBACK"); throw error; }
  };
  const db = drizzle(d1, { schema }); let user = { userId: "a", email: "a@example.test" }, operator = false;
  const route = moduleFrom("../app/api/admin/commerce/route.ts", name => {
    if (name === "drizzle-orm") return require(name);
    if (name === "cloudflare:workers") return { env: { DB: d1 } };
    if (name.endsWith("provision-request.mjs")) return provisioning;
    if (name.endsWith("/auth")) return { getCurrentUser: async () => user };
    if (name.endsWith("/db")) return { getDb: () => db };
    if (name.endsWith("/db/schema")) return schema;
    if (name.endsWith("/db/authorization")) return { isPlatformOperator: async () => operator, authorizedShop: async () => null };
    if (name.endsWith("commerce-quote.mjs")) return quote;
    if (name.endsWith("shop-onboarding.mjs")) return onboarding;
    if (name.endsWith("/rate-limit")) return { rateLimitPolicy: async () => ({ allowed: true }) };
    throw new Error(name);
  });
  const post = body => route.POST(new Request("https://mirrai.test/api/admin/commerce", { method: "POST", headers: { origin: "https://mirrai.test", "content-type": "application/json" }, body: JSON.stringify(body) }));
  return { sqlite, route, post, identity(id, isOperator = false) { user = { userId: id, email: `${id}@example.test` }; operator = isOperator; } };
}
test("commerce API isolates requests, rejects merchant pricing edits, and snapshots server prices", async t => {
  const h = fixture(t), rates = { action: "pricing", revision: 0, monthlyMinor: 10000, suppliedModelMinor: 2000, generatedModelMinor: 12000 };
  assert.equal((await h.post(rates)).status, 403);
  h.identity("a", true); assert.equal((await h.post(rates)).status, 200); h.identity("a");
  const payload = { action: "request", id: crypto.randomUUID(), name: "A Store", websiteUrl: "https://store.example", suppliedCount: 2, generatedCount: 1, pricingRevision: 1, firstPeriodMinor: 1 };
  assert.equal((await h.post(payload)).status, 201);
  assert.equal((await h.post(payload)).status, 200);
  const own = await (await h.route.GET()).json(); assert.equal(own.items.length, 1); assert.equal(own.items[0].quote.firstPeriodMinor, 26000);
  h.identity("b"); assert.equal((await (await h.route.GET()).json()).items.length, 0);
  assert.equal((await h.post(payload)).status, 409);
  assert.equal((await h.post({ action: "review", id: payload.id, status: "reviewed", note: "test" })).status, 403);
  h.identity("a", true); assert.equal((await h.post({ ...rates, revision: 1, monthlyMinor: 20000 })).status, 200);
  assert.equal((await (await h.route.GET()).json()).items[0].quote.firstPeriodMinor, 26000);
  h.identity("b"); assert.equal((await h.post({ ...payload, id: crypto.randomUUID() })).status, 409);
  assert.equal((await h.post({ ...payload, id: crypto.randomUUID(), pricingRevision: 2, shop: "other-shop" })).status, 403);
});

test("only operator provisions a requested store; ownership is atomic and retries do not duplicate", async t => {
  const h = fixture(t);
  const request = { action: "request", id: crypto.randomUUID(), name: "Store", websiteUrl: "https://store.example", suppliedCount: 1, generatedCount: 0, pricingRevision: 0 };
  assert.equal((await h.post(request)).status, 201);
  assert.equal((await h.post({ action: "provision", id: request.id })).status, 403);
  h.identity("b", true);
  assert.equal((await h.post({ action: "provision", id: request.id })).status, 201);
  assert.equal((await h.post({ action: "provision", id: request.id })).status, 200);
  assert.equal(h.sqlite.prepare("SELECT count(*) n FROM shops").get().n, 1);
  const member = h.sqlite.prepare("SELECT * FROM shop_members").get();
  assert.equal(member.user_id, "a"); assert.equal(member.role, "owner");
  assert.equal(h.sqlite.prepare("SELECT shop_id FROM merchant_requests WHERE id=?").get(request.id).shop_id, member.shop_id);
  h.identity("a");
  const duplicate = { ...request, id: crypto.randomUUID() };
  assert.equal((await h.post(duplicate)).status, 201);
  h.identity("b", true);
  assert.equal((await h.post({ action: "provision", id: duplicate.id })).status, 409);
  assert.equal(h.sqlite.prepare("SELECT count(*) n FROM shops").get().n, 1);
  h.identity("a");
  const rejected = { ...request, id: crypto.randomUUID(), websiteUrl: "https://another.example" };
  await h.post(rejected); h.identity("b", true);
  await h.post({ action: "review", id: rejected.id, status: "rejected", note: "Not approved" });
  assert.equal((await h.post({ action: "provision", id: rejected.id })).status, 409);
});

test("failed membership creation rolls back both store and request linkage", async t => {
  const h = fixture(t), id = crypto.randomUUID();
  await h.post({ action: "request", id, name: "Store", websiteUrl: "https://store.example", suppliedCount: 1, generatedCount: 0, pricingRevision: 0 });
  h.sqlite.exec("CREATE TRIGGER fail_member BEFORE INSERT ON shop_members BEGIN SELECT RAISE(ABORT,'simulated failure'); END;");
  h.identity("b", true);
  await assert.rejects(h.post({ action: "provision", id }), /simulated failure/);
  assert.equal(h.sqlite.prepare("SELECT count(*) n FROM shops").get().n, 0);
  assert.equal(h.sqlite.prepare("SELECT shop_id FROM merchant_requests WHERE id=?").get(id).shop_id, null);
});
