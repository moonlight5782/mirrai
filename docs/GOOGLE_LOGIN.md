# Google login activation

Google OAuth callback and account creation are implemented. For the current
Google-only staging mode, configure `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
and `MIRRAI_APP_ORIGIN` in the `mirrai-staging` environment. Never use
`NEXT_PUBLIC` for the secret. No email delivery provider is needed in this mode.

1. Open https://console.cloud.google.com/auth/overview and select or create a project.
2. Configure Google Auth Platform branding, support email and audience (External for merchant accounts). During testing, add the exact test Google accounts.
3. Create an OAuth client of type Web application.
4. Add the authorized redirect URI exactly:
   `<MIRRAI_APP_ORIGIN>/api/auth/google/callback` (for staging, use the exact
   Worker origin configured in the `mirrai-staging` GitHub Environment).
5. Configure server environment `GOOGLE_CLIENT_ID` and secret
   `GOOGLE_CLIENT_SECRET`; `MIRRAI_APP_ORIGIN` must match the deployed origin.
6. Deploy and test Google login with a new account, returning account and cancellation. Publish the consent configuration for real customers according to Google's requirements.

Flow: authorization code + PKCE, random state and nonce in a 10-minute HttpOnly Secure SameSite=Lax host cookie, server token exchange, RS256 signature/issuer/audience/expiry/nonce/email verification. Account identity is Google's stable subject, not email. Access/refresh tokens are not persisted. Application sessions use the same existing session mechanism as password login. No store or operator role is granted by Google login.

In Google-only mode, password login and registration are disabled. Existing
password accounts are NOT automatically linked by email; they require a separate
authenticated linking flow before switching modes. Google credentials and a real
consent flow are required for end-to-end acceptance testing.

Reference: https://developers.google.com/identity/openid-connect/openid-connect
