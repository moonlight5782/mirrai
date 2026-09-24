// Provisioning a requested store, ownership and request linkage are one D1 transaction.
// No invoice is marked paid and no generation is started by this operation.
export async function provisionRequest(db, item, email, slug, domain, expiresAt) {
  const results = await db.batch([
    db.prepare(`INSERT INTO shops (slug,name,website_url,allowed_domains,owner_user_id,subscription_status,trial_ends_at,plan,installation_status)
      SELECT ?,?,?,?,?,'trial',?,'pilot','waiting'
      WHERE EXISTS (SELECT 1 FROM merchant_requests WHERE id = ? AND shop_id IS NULL AND status != 'rejected')
      AND NOT EXISTS (SELECT 1 FROM shops,json_each(CASE WHEN json_valid(allowed_domains) THEN allowed_domains ELSE '[]' END) d WHERE lower(CAST(d.value AS TEXT)) IN (?,?))`)
      .bind(slug, item.shopName, item.websiteUrl, JSON.stringify([domain]), item.userId, expiresAt, item.id, domain, `www.${domain}`),
    db.prepare("INSERT INTO shop_members(shop_id,user_id,email,role) SELECT id,?,?,'owner' FROM shops WHERE slug = ? AND owner_user_id = ?")
      .bind(item.userId, email, slug, item.userId),
    db.prepare("UPDATE merchant_requests SET shop_id = (SELECT id FROM shops WHERE slug = ?), status = 'reviewed', updated_at = ? WHERE id = ? AND shop_id IS NULL AND EXISTS (SELECT 1 FROM shops WHERE slug = ? AND owner_user_id = ?)")
      .bind(slug, new Date().toISOString(), item.id, slug, item.userId),
  ]);
  return results[0].meta.changes === 1;
}
