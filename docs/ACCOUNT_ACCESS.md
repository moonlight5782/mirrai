# Account access and rollout

Implemented: email/password registration and recovery, plus Google OAuth with
email verification by Google. Deployments can select Google-only authentication;
in that mode password registration/login are rejected and `/account-access`
directs the user to recover their Google account with Google.

## Required configuration

Apply migration `0034_amazing_absorbing_man.sql` before serving the new routes.
Configure `APP_ORIGIN` (canonical HTTPS origin). Google-only deployments need
`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `AUTH_MODE=google`; they do not
need an email provider. Password deployments need `RESEND_API_KEY` and
`MAIL_FROM`. Never place secret keys in public environment variables.

Password registration attempts verification delivery after creating the account.
Google identity and verified email are checked by the OAuth callback. Neither
authentication method grants shop access by itself; membership and operator
permissions remain enforced by the authorization layer.

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

## Manual acceptance

For Google-only mode: test a new Google account, returning account, cancelled
consent, unapproved test account, and redirect back to the requested page. Verify
password login and registration APIs return `403`.

For password mode: register a test user and confirm the delivered link; request a
reset; verify the old password and sessions no longer work; replay the used link;
and confirm unknown-email requests do not reveal whether an account exists.

Automated tests execute the migration and recovery SQL against SQLite and test
rollback after a simulated storage failure. They do not certify email delivery.

## Commercial launch boundary

Initial market: Moldova. The owner has not yet registered a business or selected
a payment provider. Live checkout/recurring billing must not be presented as active.
Provider eligibility, account setup, credentials, webhook verification, payment
idempotency, refunds and subscription renewal tests remain launch prerequisites.
