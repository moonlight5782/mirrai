import assert from "node:assert/strict";
import test from "node:test";
import { subscriptionAccess } from "../db/subscription.mjs";

const now = Date.parse("2026-09-09T12:00:00Z");
test("trial expires at its exact UTC boundary without a scheduler", () => {
  const shop = { subscriptionStatus: "trial", trialEndsAt: "2026-09-09 12:00:00" };
  assert.equal(subscriptionAccess(shop, now - 1).allowed, true);
  assert.equal(subscriptionAccess(shop, now).reason, "subscription_expired");
});
test("paid period, suspended state and missing dates fail closed", () => {
  const shop = { subscriptionStatus: "active", subscriptionEndsAt: "2026-09-10T12:00:00Z" };
  assert.equal(subscriptionAccess(shop, now).allowed, true);
  assert.equal(subscriptionAccess({ ...shop, subscriptionStatus: "paused" }, now).allowed, false);
  assert.equal(subscriptionAccess({ ...shop, subscriptionEndsAt: null }, now).allowed, false);
  assert.equal(subscriptionAccess({ ...shop, subscriptionEndsAt: "invalid" }, now).allowed, false);
});
test("legacy pilots have a finite period anchored to creation", () => {
  const shop = { plan: "pilot", subscriptionStatus: "trial", createdAt: "2026-08-25 00:00:00" };
  assert.equal(subscriptionAccess(shop, now).expiresAt, "2026-09-24T00:00:00.000Z");
  assert.equal(subscriptionAccess(shop, Date.parse("2026-09-25T00:00:00Z")).allowed, false);
});
test("an explicit expiry is never extended by the pilot transition", () => {
  assert.equal(subscriptionAccess({ plan: "pilot", subscriptionStatus: "trial", createdAt: "2026-09-08", trialEndsAt: "2026-09-09T11:00:00Z" }, now).allowed, false);
});
