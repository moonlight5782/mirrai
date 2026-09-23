# Account access and rollout

Implemented: email/password registration, login, one-time email verification,
password recovery, and revocation of existing sessions on password reset.
The `/account-access` page is available from login and the merchant navigation.

## Required configuration

Apply migration `0034_amazing_absorbing_man.sql` before serving the new routes.
Configure `APP_ORIGIN` (canonical HTTPS origin), `RESEND_API_KEY` (secret), and
`MAIL_FROM` (a sender authorized in Resend). Never put the mail key in a public
environment variable. Without these settings, the UI explicitly disables email
requests; ordinary registration/login remain available. Delivery has not been
verified against a real mailbox until these settings are configured and tested.

Registration attempts verification delivery after creating the account. Delivery
failure does not destroy the account. The user can retry from account security.
Email verification is informational for now; it is not an authorization role and
does not grant shop access. Google OAuth is not implemented.

## Security properties

- Random 256-bit link tokens; only SHA-256 digests stored in D1.
- Reset expiry 30 minutes; verification expiry 24 hours.
- Token travels in a URL fragment, removed after hydration, not query/access logs.
- Explicit POST confirmation; opening a link does not consume it.
- Transactional claim + password update + session deletion. Replay, expired links,
  and sibling links issued before a successful reset cannot reset again.
- Same-origin POST checks and IP/email throttling.
- Reset requests return the same response for unknown accounts and delivery failure.
- Client-side success distinguishes account creation from successful mail dispatch.

## Manual acceptance after configuring mail

1. Register a test user and confirm the delivered link once.
2. Request reset, open the link, choose a new password.
3. Verify old password and old sessions no longer work; new password does.
4. Reopen the consumed link and verify rejection.
5. Check a second user's session remains valid.
6. Verify unknown-email requests do not reveal whether an account exists.

Automated tests execute the migration and recovery SQL against SQLite and test
rollback after a simulated storage failure. They do not certify email delivery.

## Commercial launch boundary

Initial market: Moldova. The owner has not yet registered a business or selected
a payment provider. Live checkout/recurring billing must not be presented as active.
Provider eligibility, account setup, credentials, webhook verification, payment
idempotency, refunds and subscription renewal tests remain launch prerequisites.
