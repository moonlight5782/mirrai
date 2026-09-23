// Validate untrusted JSON before it reaches normalization or password hashing.
export function credentialsInput(value, registration = false) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (typeof value.email !== "string" || typeof value.password !== "string") return null;
  const email = value.email.trim().toLowerCase(), password = value.password;
  if (email.length > 254 || !/^\S+@\S+\.\S+$/.test(email) || !password.length || password.length > 128) return null;
  if (registration && (typeof value.name !== "string" || !value.name.trim() || value.name.trim().length > 100)) return null;
  return { email, password, displayName: registration ? value.name.trim() : "" };
}
