export function normalizedWebsite(value) {
  if (typeof value !== "string" || !value.trim() || value.length > 2048) return null;
  try {
    const input = value.trim();
    const url = new URL(input.includes("://") ? input : `https://${input}`);
    const host = url.hostname.toLowerCase().replace(/\.$/, "");
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.port) return null;
    // Store domains, not IP addresses or local development endpoints.
    if (!host.includes(".") || host.includes(":") || host.includes("[") || host.includes("]") || /^[\d.]+$/.test(host) || /\.(localhost|local|internal)$/.test(host)) return null;
    if (!host.split(".").every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) return null;
    return { websiteUrl: `${url.protocol}//${host}`, domain: host.replace(/^www\./, "") };
  } catch { return null; }
}

// D1 executes batch atomically: the shop cannot survive a failed owner insert.
// The guard is inside the write, so two concurrent submissions cannot create
// separate shops for one account or claim the same canonical domain.
export async function createMerchantShop(db, input) {
  const { slug, name, websiteUrl, domain, platform, userId, email, trialEndsAt } = input;
  const results = await db.batch([
    db.prepare(`INSERT INTO shops (slug,name,website_url,allowed_domains,platform,owner_user_id,subscription_status,trial_ends_at,plan,catalog_source_type,catalog_sync_status,installation_status)
      SELECT ?,?,?,?,?,?,'trial',?,'pilot','manual','not_configured','waiting'
      WHERE NOT EXISTS (SELECT 1 FROM shop_members WHERE user_id = ?)
        AND NOT EXISTS (SELECT 1 FROM shops WHERE owner_user_id = ?)
        AND NOT EXISTS (SELECT 1 FROM shops, json_each(CASE WHEN json_valid(allowed_domains) THEN allowed_domains ELSE '[]' END) AS d
          WHERE lower(CAST(d.value AS TEXT)) IN (?,?))`)
      .bind(slug, name, websiteUrl, JSON.stringify([domain]), platform, userId, trialEndsAt, userId, userId, domain, `www.${domain}`),
    db.prepare(`INSERT INTO shop_members (shop_id,user_id,email,role)
      SELECT id,?,?, 'owner' FROM shops WHERE slug = ? AND owner_user_id = ?
      AND NOT EXISTS (SELECT 1 FROM shop_members WHERE shop_id = shops.id AND user_id = ?)`)
      .bind(userId, email.toLowerCase(), slug, userId, userId),
  ]);
  return results[0].meta.changes === 1;
}
