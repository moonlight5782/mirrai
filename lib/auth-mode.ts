/** A Google-only deployment must never expose password registration or login. */
export async function isGoogleOnlyAuth() {
  try {
    const { env } = await import("cloudflare:workers");
    return String(env.AUTH_MODE ?? "") === "google";
  } catch {
    // The fallback keeps server-rendered route tests runnable outside Workers.
    return process.env.AUTH_MODE === "google";
  }
}
