import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { actionToken, tokenDigest, consumeAccountAction } from "../lib/account-actions.mjs";

function fixture() {
  const sql = new DatabaseSync(":memory:");
  sql.exec(`PRAGMA foreign_keys=ON;
    CREATE TABLE auth_users (id TEXT PRIMARY KEY,email TEXT,password_hash TEXT,password_salt TEXT,password_iterations INTEGER,updated_at TEXT,email_verified_at TEXT);
    CREATE TABLE auth_sessions (user_id TEXT);
    CREATE TABLE auth_login_attempts (email TEXT);
    INSERT INTO auth_users(id,email,password_hash) VALUES ('a','a@example.test','old-a'),('b','b@example.test','old-b');
    INSERT INTO auth_sessions VALUES ('a'),('b');
    INSERT INTO auth_login_attempts VALUES ('a@example.test');`);
  sql.exec(readFileSync(new URL("../drizzle/0034_amazing_absorbing_man.sql", import.meta.url), "utf8"));
  const db = {
    prepare(query) { return { bind(...values) { return { query, values }; } }; },
    async batch(statements) {
      sql.exec("BEGIN");
      try {
        const results = statements.map(({ query, values }) => ({ meta: { changes: Number(sql.prepare(query).run(...values).changes) } }));
        sql.exec("COMMIT"); return results;
      } catch (error) { sql.exec("ROLLBACK"); throw error; }
    },
  };
  async function issue(purpose = "reset", expiry = "2030-01-01T00:00:00.000Z") {
    const token = actionToken();
    sql.prepare("INSERT INTO auth_action_tokens(token_hash,user_id,purpose,credential_version,expires_at) VALUES (?,?,?,?,?)")
      .run(await tokenDigest(token), "a", purpose, "old-a", expiry);
    return token;
  }
  return { sql, db, issue };
}
const now = "2026-09-23T00:00:00.000Z";
const password = { passwordHash: "new-a", passwordSalt: "salt", passwordIterations: 210000 };

test("reset atomically changes only token owner, revokes sessions and rejects replay and sibling links", async t => {
  const { sql, db, issue } = fixture(); t.after(() => sql.close());
  const token = await issue(), sibling = await issue();
  assert.equal(await consumeAccountAction(db, token, "reset", password, now), true);
  assert.equal(sql.prepare("SELECT password_hash FROM auth_users WHERE id='a'").get().password_hash, "new-a");
  assert.equal(sql.prepare("SELECT password_hash FROM auth_users WHERE id='b'").get().password_hash, "old-b");
  assert.deepEqual(sql.prepare("SELECT user_id FROM auth_sessions").all().map(x => x.user_id), ["b"]);
  assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM auth_login_attempts").get().n, 0);
  assert.equal(await consumeAccountAction(db, token, "reset", password, now), false);
  assert.equal(await consumeAccountAction(db, sibling, "reset", password, now), false);
});

test("expiry boundary, wrong purpose and malformed token cannot mutate the user", async t => {
  const { sql, db, issue } = fixture(); t.after(() => sql.close());
  assert.equal(await consumeAccountAction(db, await issue("reset", now), "reset", password, now), false);
  assert.equal(await consumeAccountAction(db, await issue("verify"), "reset", password, now), false);
  assert.equal(await consumeAccountAction(db, "invalid", "reset", password, now), false);
  assert.equal(sql.prepare("SELECT password_hash FROM auth_users WHERE id='a'").get().password_hash, "old-a");
});

test("email verification requires explicit consumption and cannot be reused", async t => {
  const { sql, db, issue } = fixture(); t.after(() => sql.close());
  const token = await issue("verify");
  assert.equal(sql.prepare("SELECT email_verified_at FROM auth_users WHERE id='a'").get().email_verified_at, null);
  assert.equal(await consumeAccountAction(db, token, "verify", null, now), true);
  assert.equal(await consumeAccountAction(db, token, "verify", null, now), false);
  assert.equal(sql.prepare("SELECT email_verified_at FROM auth_users WHERE id='a'").get().email_verified_at, now);
  assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM auth_sessions").get().n, 2);
});

test("storage failure rolls back the claim so the link can safely be retried", async t => {
  const { sql, db, issue } = fixture(); t.after(() => sql.close());
  const token = await issue();
  sql.exec("CREATE TRIGGER simulate_failure BEFORE DELETE ON auth_sessions BEGIN SELECT RAISE(ABORT,'failure'); END");
  await assert.rejects(consumeAccountAction(db, token, "reset", password, now));
  assert.equal(sql.prepare("SELECT password_hash FROM auth_users WHERE id='a'").get().password_hash, "old-a");
  sql.exec("DROP TRIGGER simulate_failure");
  assert.equal(await consumeAccountAction(db, token, "reset", password, now), true);
});
