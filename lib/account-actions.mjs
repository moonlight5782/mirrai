export async function tokenDigest(token) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, "0")).join("");
}

export function actionToken() {
  return [...crypto.getRandomValues(new Uint8Array(32))].map(value => value.toString(16).padStart(2, "0")).join("");
}

// D1 batch is transactional. The claim gates every following write, including
// session revocation. An expired/replayed token cannot mutate another account.
export async function consumeAccountAction(db, token, purpose, credentials, now = new Date().toISOString()) {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token) || !["reset", "verify"].includes(purpose)) return false;
  const hash = await tokenDigest(token), claim = crypto.randomUUID();
  const owner = "SELECT user_id FROM auth_action_tokens WHERE token_hash = ? AND consumed_by = ?";
  const statements = [db.prepare(`UPDATE auth_action_tokens SET consumed_by = ?
    WHERE token_hash = ? AND purpose = ? AND consumed_by IS NULL AND expires_at > ?
    AND credential_version = (SELECT password_hash FROM auth_users WHERE id = user_id)`)
    .bind(claim, hash, purpose, now)];
  if (purpose === "reset") {
    statements.push(db.prepare(`UPDATE auth_users SET password_hash = ?, password_salt = ?, password_iterations = ?, updated_at = ? WHERE id IN (${owner})`)
      .bind(credentials.passwordHash, credentials.passwordSalt, credentials.passwordIterations, now, hash, claim));
    statements.push(db.prepare(`DELETE FROM auth_sessions WHERE user_id IN (${owner})`).bind(hash, claim));
    statements.push(db.prepare(`DELETE FROM auth_login_attempts WHERE email IN (SELECT email FROM auth_users WHERE id IN (${owner}))`).bind(hash, claim));
  } else {
    statements.push(db.prepare(`UPDATE auth_users SET email_verified_at = ?, updated_at = ? WHERE id IN (${owner})`).bind(now, now, hash, claim));
  }
  const results = await db.batch(statements);
  return results[0].meta.changes === 1;
}
