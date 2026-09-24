import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { createMerchantShop, normalizedWebsite } from "../lib/shop-onboarding.mjs";
import { catalogReadiness } from "../lib/catalog-readiness.mjs";

function fixture(t) {
  const sql = new DatabaseSync(":memory:"); t.after(() => sql.close());
  sql.exec(`PRAGMA foreign_keys=ON;
    CREATE TABLE shops(id INTEGER PRIMARY KEY,slug TEXT UNIQUE,name TEXT,website_url TEXT,allowed_domains TEXT,platform TEXT,owner_user_id TEXT,subscription_status TEXT,trial_ends_at TEXT,plan TEXT,catalog_source_type TEXT,catalog_sync_status TEXT,installation_status TEXT);
    CREATE TABLE shop_members(shop_id INTEGER REFERENCES shops(id),user_id TEXT,email TEXT,role TEXT,UNIQUE(shop_id,user_id));`);
  const db = { prepare(query) { return { bind(...values) { return { query, values }; } }; }, async batch(statements) {
    sql.exec("BEGIN");
    try { const result = statements.map(({ query, values }) => ({ meta: { changes: Number(sql.prepare(query).run(...values).changes) } })); sql.exec("COMMIT"); return result; }
    catch (error) { sql.exec("ROLLBACK"); throw error; }
  } };
  return { db, sql };
}
const input = { slug: "store-a", name: "Store A", websiteUrl: "https://store.example", domain: "store.example", platform: "custom", userId: "owner-a", email: "A@example.test", trialEndsAt: "2030-01-01T00:00:00.000Z" };

test("creating a store creates its owner and retry cannot create a duplicate", async t => {
  const { db, sql } = fixture(t);
  assert.equal(await createMerchantShop(db, input), true);
  assert.equal(await createMerchantShop(db, { ...input, slug: "retry" }), false);
  const owner = sql.prepare("SELECT * FROM shop_members").get();
  assert.equal(owner.user_id, "owner-a"); assert.equal(owner.role, "owner");
  assert.equal(sql.prepare("SELECT count(*) n FROM shops").get().n, 1);
});
test("failed membership creation rolls back shop and permits a clean retry", async t => {
  const { db, sql } = fixture(t);
  sql.exec("CREATE TRIGGER fail_member BEFORE INSERT ON shop_members BEGIN SELECT RAISE(ABORT,'failure'); END");
  await assert.rejects(createMerchantShop(db, input));
  assert.equal(sql.prepare("SELECT count(*) n FROM shops").get().n, 0);
  sql.exec("DROP TRIGGER fail_member");
  assert.equal(await createMerchantShop(db, input), true);
});
test("another user cannot claim the domain or become the existing store owner", async t => {
  const { db, sql } = fixture(t);
  await createMerchantShop(db, input);
  assert.equal(await createMerchantShop(db, { ...input, slug: "store-b", userId: "owner-b" }), false);
  assert.equal(sql.prepare("SELECT count(*) n FROM shop_members WHERE user_id='owner-b'").get().n, 0);
  assert.equal(await createMerchantShop(db, { ...input, slug: "store-b", userId: "owner-b", domain: "other.example", websiteUrl: "https://other.example" }), true);
});
test("overlapping submissions are gated by the transactional insert", async t => {
  const { db, sql } = fixture(t);
  const results = await Promise.all([createMerchantShop(db, input), createMerchantShop(db, { ...input, slug: "raced" })]);
  assert.deepEqual(results, [true, false]);
  assert.equal(sql.prepare("SELECT count(*) n FROM shops").get().n, 1);
});
test("store URLs reject malformed types, credentials, local and non-HTTP addresses", () => {
  for (const value of [null, 123, {}, "", "https://user:pass@store.example", "ftp://store.example", "https://127.0.0.1", "https://[::1]", "http://172.16.0.1", "https://store.local", "https://store.example:8443", "https://bad_label.example"]) assert.equal(normalizedWebsite(value), null, String(value));
  assert.deepEqual(normalizedWebsite("https://WWW.Store.Example/catalog?q=1"), { domain: "store.example", websiteUrl: "https://www.store.example" });
});
test("readiness counts active published variants and excludes inactive or missing model files", () => {
  const rows = [
    { id: 1, active: true, status: "published", glbUrl: "/one.glb" },
    { id: 2, active: true, status: "missing", glbUrl: null },
    { id: 3, active: false, status: "published", glbUrl: "/three.glb" },
    { id: 4, active: true, status: "published", glbUrl: "" },
    { id: 5, active: true, status: "review", glbUrl: "/five.glb" },
  ];
  const variants = [
    { productId: 2, active: true, status: "published", glbUrl: "/two.glb" },
    { productId: 2, active: true, status: "published", glbUrl: "/two-other.glb" },
    { productId: 4, active: false, status: "published", glbUrl: "/four.glb" },
  ];
  assert.deepEqual(catalogReadiness(rows, variants), { total: 5, active: 4, published: 2 });
});
