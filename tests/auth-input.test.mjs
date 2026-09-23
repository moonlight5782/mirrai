import test from "node:test";
import assert from "node:assert/strict";
import { credentialsInput } from "../lib/auth-input.mjs";

test("credentials reject malformed JSON values without throwing or coercing types", () => {
  for (const value of [null, [], 12, "text", {}, { email: 42, password: "123" }, { email: "a@b.test", password: [] }, { email: "a@b.test", password: "" }]) {
    assert.equal(credentialsInput(value), null);
  }
});
test("credentials normalize only email, bound lengths and preserve the exact password", () => {
  assert.deepEqual(credentialsInput({ email: " A@B.test ", password: " Pass12345 " }), { email: "a@b.test", password: " Pass12345 ", displayName: "" });
  assert.equal(credentialsInput({ email: "a".repeat(250) + "@b.test", password: "x" }), null);
  assert.equal(credentialsInput({ email: "a@b.test", password: "x".repeat(129) }), null);
});
test("registration requires a bounded nonblank name; login ignores optional name", () => {
  const valid = { email: "a@b.test", password: "Password123" };
  for (const name of [null, [], {}, 42, "  ", "x".repeat(101)]) assert.equal(credentialsInput({ ...valid, name }, true), null);
  assert.equal(credentialsInput({ ...valid, name: " Alice " }, true).displayName, "Alice");
  assert.notEqual(credentialsInput(valid), null);
});
