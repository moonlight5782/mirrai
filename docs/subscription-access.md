# Subscription access

Widget config and event ingestion share the UTC period check in
`db/subscription.mjs`. New operator-created trials last 14 days. An active paid
shop requires `subscription_ends_at`; a trial requires `trial_ends_at`.
Expired or missing periods fail closed. Legacy pilot accounts without an
explicit period receive only 30 days from their original creation timestamp.
No scheduler is needed for expiry enforcement.

Apply migration 0027 before deploying the new server. Its generated snapshot
also reconciles the product_variants table introduced by SQL migration 0018;
0027 intentionally does not create that existing table a second time.

The SDK checks access even when supplied with a model URL, and rechecks on
opening. Network failure does not authorize use of the previous response.
The authenticated subscription page shows the effective status and UTC expiry.
Event ingestion accepts active variant SKUs and attributes them to the parent
product.

## Not yet production billing

- Checkout, payment webhooks, self-service registration and API-key lifecycle
  are not implemented by this change. Renewal remains operator-managed.
- Public model files and direct viewer URLs are not protected by these checks.
  Already downloaded files cannot be revoked. Signed viewer sessions and
  controlled asset delivery are needed for stronger access control.
- Standalone mobile viewer events still need an authenticated reporting path;
  iframe postMessage tracking alone does not cover that flow.
- Automated tests cover period boundaries and SDK failure/retry behavior, not
  payment settlement or real-device AR quality.
