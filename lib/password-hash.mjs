import { pbkdf2Sync } from "node:crypto";

// Workers WebCrypto caps PBKDF2 at 100,000 iterations. The nodejs_compat
// implementation supports existing records without lowering their work factor.
export function derivePasswordHash(password, salt, iterations) {
  if (!Number.isSafeInteger(iterations) || iterations < 1 || iterations > 2_000_000) throw new Error("Invalid password iteration count");
  return pbkdf2Sync(password, salt, iterations, 32, "sha256").toString("base64");
}
