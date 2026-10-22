import test from "node:test";
import assert from "node:assert/strict";
import { manualAccessUpdate } from "../lib/manual-access.mjs";

test("operator grants explicit time-limited access without implying payment", () => {
  const now = Date.parse("2026-10-22T10:00:00.000Z");
  assert.deepEqual(manualAccessUpdate(true, 30, now), {
    subscriptionStatus: "active",
    subscriptionEndsAt: "2026-11-21T10:00:00.000Z",
    trialEndsAt: null,
  });
});

test("operator suspension immediately removes widget access", () => {
  assert.deepEqual(manualAccessUpdate(false), {
    subscriptionStatus: "inactive",
    subscriptionEndsAt: null,
    trialEndsAt: null,
  });
});

test("access duration is bounded and invalid updates cannot mutate access", () => {
  for (const days of [0, -1, 3651, 1.5, "30", NaN]) assert.equal(manualAccessUpdate(true, days), null);
  assert.equal(manualAccessUpdate("yes"), null);
});
