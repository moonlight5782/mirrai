function clientAddress(request) {
  return request.headers.get("cf-connecting-ip")?.trim()
    || request.headers.get("x-real-ip")?.trim()
    || "unknown";
}

async function digest(value) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

async function hit(store, material, limit, windowSeconds, now) {
  const windowStartedAt = Math.floor(now / windowSeconds) * windowSeconds;
  const expiresAt = windowStartedAt + windowSeconds * 2;
  const count = await store.increment(await digest(material), windowStartedAt, expiresAt);
  return { allowed: count <= limit, retryAfter: Math.max(1, windowStartedAt + windowSeconds - now) };
}

/**
 * Applies an IP-wide bucket before the optional subject bucket. This order keeps
 * attacker-controlled shop IDs from creating an unbounded number of counters.
 */
export async function applyRateLimitPolicy(request, policy, store, now = Math.floor(Date.now() / 1000)) {
  await store.cleanup(now);
  const address = clientAddress(request);
  const ipResult = await hit(store, `${policy.scope}|ip|${address}`, policy.ipLimit, policy.windowSeconds, now);
  if (!ipResult.allowed || !policy.subject || !policy.subjectLimit) return ipResult;
  const subjectMaterial = policy.subjectMode === "subject"
    ? `${policy.scope}|subject|${policy.subject}`
    : `${policy.scope}|ip-subject|${address}|${policy.subject}`;
  return hit(store, subjectMaterial, policy.subjectLimit, policy.windowSeconds, now);
}
