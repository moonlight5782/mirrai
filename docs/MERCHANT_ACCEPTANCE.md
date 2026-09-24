# Merchant journey acceptance

Release checks must exercise the whole journey, not just individual pages.
Passing unit tests does not mean payment, mail delivery or device AR has been verified.

## Hardened in this release

- Atomic store + owner creation, transactional duplicate guards, rollback on failure.
- Invalid website types, credential-bearing URLs and local/IP endpoints rejected.
- Onboarding and setup share website normalization.
- Save/retry UI recovers after network failures and explains domain conflicts.
- Readiness uses active products and published base/variant GLB URLs, as the widget does.
- Installation signal, subscription access and published models shown separately.
- A changed website clears the old installation timestamp.

## Required end-to-end acceptance before selling self-service

1. New merchant registers; receives and confirms a real verification email.
2. Creates a shop, retries after a simulated timeout, gets the same shop and owner access.
3. Imports products with stable SKU, URLs, photos and real dimensions.
4. Uploads a valid GLB and publishes it; invalid files produce actionable errors.
5. Creates a second merchant and verifies neither can read/write the other's catalogue,
   assets, generation jobs, analytics or membership.
6. Installs the supplied snippet on a real supported store theme. Checks product and
   variant SKU, missing models, dynamic navigation, CSP and script-blocking behavior.
7. Opens 3D on desktop; checks AR and physical dimensions on iPhone and Android.
8. Verifies widget impressions/opens and supported viewer events in the merchant's
   analytics, including the separate mobile tab path.
9. Completes a real-provider sandbox checkout, duplicate webhook delivery, renewal,
   expiry, failed renewal and refund. Expired access must not open a stale model.
10. Confirms restore from a backup and operational alerts before offering an SLA.

## Still not certified

Real mail delivery and payments await provider configuration. Domain registration
in the current flow is not proof of ownership; automated domain verification and
indexed unique domain storage remain follow-up work. Mobile-tab analytics are not
yet equivalent to iframe analytics. Generation quality still requires human review.
The setup checklist is diagnostics, not a guarantee that every CMS theme works.

The SQLite behavior tests verify transaction logic and rollback. Their in-memory
batch adapter serializes writes; it is not a Cloudflare multi-region load test.
