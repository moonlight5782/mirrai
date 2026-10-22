/** Build the operator-controlled access fields for a store. Payments are not inferred. */
export function manualAccessUpdate(enabled, days = 30, now = Date.now()) {
  if (typeof enabled !== "boolean") return null;
  if (!enabled) {
    return {
      subscriptionStatus: "inactive",
      subscriptionEndsAt: null,
      trialEndsAt: null,
    };
  }
  if (!Number.isInteger(days) || days < 1 || days > 3650 || !Number.isFinite(now)) return null;
  return {
    subscriptionStatus: "active",
    subscriptionEndsAt: new Date(now + days * 86400000).toISOString(),
    trialEndsAt: null,
  };
}
