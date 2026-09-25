# Google login activation

The implementation remains disabled until GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and APP_ORIGIN are configured on the server. Never use NEXT_PUBLIC for the secret.

1. Open https://console.cloud.google.com/auth/overview and select or create a project.
2. Configure Google Auth Platform branding, support email and audience (External for merchant accounts). During testing, add the exact test Google accounts.
3. Create an OAuth client of type Web application.
4. Add the authorized redirect URI exactly:
   `https://mirrai-try-on.moonlight-5782.chatgpt.site/api/auth/google/callback`
5. Configure server environment GOOGLE_CLIENT_ID and secret GOOGLE_CLIENT_SECRET; APP_ORIGIN must be `https://mirrai-try-on.moonlight-5782.chatgpt.site`.
6. Deploy and test Google login with a new account, returning account, cancellation and a password account with the same email. Publish the consent configuration for real customers according to Google's requirements.

Flow: authorization code + PKCE, random state and nonce in a 10-minute HttpOnly Secure SameSite=Lax host cookie, server token exchange, RS256 signature/issuer/audience/expiry/nonce/email verification. Account identity is Google's stable subject, not email. Access/refresh tokens are not persisted. Application sessions use the same existing session mechanism as password login. No store or operator role is granted by Google login.

Existing password accounts are NOT automatically linked by email. They continue to use their password; an explicit authenticated linking flow is not implemented yet. Google credentials and a real consent flow are required for end-to-end acceptance testing.

Reference: https://developers.google.com/identity/openid-connect/openid-connect
