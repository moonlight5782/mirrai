# Merchant requests and pricing

## Implemented

- `/admin/billing`: authenticated merchant requests with a store URL, supplied-model count and generation count.
- Operators configure monthly subscription and two one-time per-model prices in MDL. Generation must cost more than preparation of supplied models. Unconfigured pricing displays “Требуется расчёт”, not a zero-cost offer.
- The server computes and saves an immutable price snapshot. A pricing revision check prevents submission against an outdated displayed price. Client totals are ignored.
- Merchants can read only their requests. Operators can review requests and reply to the requester.
- An operator can explicitly provision a requested store with a 14-day pilot. Store creation, owner membership and request linkage are an atomic D1 batch. Retrying does not create another store. Rejected requests cannot provision stores.
- After provisioning, the request links to that store's catalog, where existing product/model tooling is available.
- The operator's store list shows subscription expiry, readiness, owner email and widget/AR event counts for the last 30 days. These are events, not unique visitors or sales attribution.

## Commercial meaning

First period = monthly subscription + supplied count × supplied-model preparation price + generation count × generation price.
Preparation is one-time; the subscription is recurring. This is an estimate based on declared counts. Model quality, variants and the actual scope still require operator review.
Reviewing a request does not charge a customer, confirm payment or start generation. Provisioning explicitly starts a free pilot, not a paid subscription.

## Not yet complete

- No payment provider, checkout, paid invoices, recurring collection or webhook-based renewal.
- No uploads directly attached to a pre-provisioning request; uploads are currently through the provisioned store catalog.
- No automatic generation triggered by a submitted URL or request.
- No proof of domain ownership; operator must verify the applicant before provisioning.
- Existing self-onboarding and legacy operator store creation remain separate flows; this request flow is not yet the single entry point.
- Latest 100 requests are displayed; paginated history is not implemented.
- Authenticated browser acceptance testing with both merchant and operator accounts is required before calling this a production-ready checkout workflow.

## Verification

`tests/commerce.test.mjs` exercises quote calculations and validation.
`tests/commerce-api.test.mjs` executes the real API handlers with Drizzle and SQLite, verifying isolation, role restrictions, server pricing, replay handling, atomic provisioning and rollback after a failed owner-membership insert.
Apply migration `0035_faithful_wendell_rand.sql` through the normal deployment migration process before serving the new API.
