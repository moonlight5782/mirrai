// UTC timestamps are shared with SQLite; never use the server's local timezone.
export function timestamp(value) {
  if (typeof value !== "string" || !value.trim()) return NaN;
  const normalized = value.trim().replace(" ", "T");
  return Date.parse(/(?:Z|[+-]\d{2}:\d{2})$/i.test(normalized) ? normalized : `${normalized}Z`);
}

export function subscriptionAccess(shop, now = Date.now()) {
  const status = shop.subscriptionStatus;
  if (status !== "active" && status !== "trial") return { allowed: false, status, expiresAt: null, reason: "subscription_inactive" };
  let expiry = status === "trial" ? shop.trialEndsAt : shop.subscriptionEndsAt;
  // Existing pilot accounts get a bounded transition based on creation, not deploy time.
  if (!expiry && shop.plan === "pilot") {
    const created = timestamp(shop.createdAt);
    if (Number.isFinite(created)) expiry = new Date(created + 30 * 86400000).toISOString();
  }
  const end = timestamp(expiry);
  if (!Number.isFinite(end)) return { allowed: false, status: "inactive", expiresAt: null, reason: "subscription_period_missing" };
  const expiresAt = new Date(end).toISOString();
  return end > now
    ? { allowed: true, status, expiresAt, reason: null }
    : { allowed: false, status: "expired", expiresAt, reason: "subscription_expired" };
}
