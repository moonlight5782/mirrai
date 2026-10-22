/** Return whether a password-based route is enabled for this deployment. */
export function passwordAuthAllowed(mode) {
  return mode !== "google";
}

/** Resolve a deployment's authentication mode from its configured providers. */
export function resolveAuthMode(environment) {
  const requested = environment.MIRRAI_AUTH_MODE || "password";
  if (requested !== "google" && requested !== "password") {
    throw new Error("MIRRAI_AUTH_MODE must be google or password.");
  }
  if (requested === "google" && (!environment.GOOGLE_CLIENT_ID || !environment.GOOGLE_CLIENT_SECRET)) {
    throw new Error("Google-only authentication requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.");
  }
  if (requested === "password" && (!environment.RESEND_API_KEY || !environment.MAIL_FROM)) {
    throw new Error("Password authentication requires RESEND_API_KEY and MAIL_FROM for verification and recovery.");
  }
  return requested;
}
