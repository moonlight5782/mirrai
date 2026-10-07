# Standalone MIRRAI demo (Cloudflare Pages)

Live URLs:
- Neutral: https://mirrai-furniture-demo.pages.dev/
- Personalized: https://mirrai-hugge-demo.pages.dev/

## Automatic deployment from GitHub

`.github/workflows/ci.yml` runs lint, TypeScript, Python tests and `npm test`.
Only successful checks on `main` can deploy. Pull requests never deploy.
Two isolated matrix jobs build and verify the correct branding before publishing
to the existing Pages projects; their public URLs do not change.

One-time setup: create a Cloudflare API token with **Account → Cloudflare Pages →
Edit**, restricted to the account owning these two demos. Store it as repository
Actions secret `CLOUDFLARE_API_TOKEN`. Never commit or paste the token into chat.
The account ID in the workflow is public configuration, not a secret. Token access
is only available to the deploy step, not the site build. Pages permissions may
cover other Pages projects in that account; do not grant broader permissions.

Then push to `main`, or select Actions → MIRRAI CI → Run workflow on `main`.
The workflow is not operational until the secret exists and a complete run passes.
On failure inspect the failed job; the prior deployment remains live. To roll back,
use the project's Cloudflare deployment history. Static snapshots do not pull live
product data automatically: update the checked-in catalog/assets intentionally.

Local equivalents (run sequentially; they share an output directory):
```sh
npm run demo:build -- --no-zip
node scripts/verify-static-demo.mjs
npm run demo:build -- --hugge --no-zip
node scripts/verify-static-demo.mjs --hugge
```

This is a **public static sales demo**, not the multi-tenant SaaS. It contains a
dated snapshot of 16 furniture products, their photographs, color variants, and 16
textured GLBs. No credentials, account pages, payments, private uploads, D1/R2
bindings or production analytics are included. The existing live site is untouched.

## Build and verify

```sh
npm ci
npm run demo:build
node --test tests/static-demo.test.mjs tests/i18n.test.mjs
npm run models:audit-scale
npm run demo:preview
```

Open http://127.0.0.1:4188/. To refresh the public product snapshot intentionally:
`npm run demo:build -- --refresh`. This fetches the public catalog only, not model
files. Referenced assets must already exist under `public/`; review their geometry
and dimensions before updating the snapshot. Commit snapshot changes after review.

Outputs (ignored by Git):

- `outputs/static-demo/site/` — deployable files; index.html is at the root.
- `outputs/static-demo/mirrai-demo.zip` — **upload this**, not repository ZIP.
- `outputs/static-demo/manifest.json` — file hashes and sizes, for verification.

Build requires PowerShell Compress-Archive on Windows or `zip` on Linux/macOS.
It fails if any asset exceeds 25 MiB, if there are over 1,000 files, or if a
catalog path points outside the approved public asset directories. It never
packages `.env`, the database, server bundle, or repository source.

## Publish from a phone

1. Save `mirrai-demo.zip` in Files/Downloads. Keep it zipped.
2. Open https://dash.cloudflare.com/ in Safari/Chrome and sign in.
3. Workers & Pages → Create application → Pages → Direct Upload
   (some dashboards say Get started → Drag and drop your files).
4. Pick an available neutral name, e.g. `mirrai-furniture-demo` (availability is not guaranteed).
5. Select the ZIP via the upload control, wait for every file to finish, Deploy.
6. Open the assigned `https://<project>.pages.dev` link in a private browser tab.
   No Cloudflare Access login should be required for visitors.
7. On a real iPhone/Android, test a chair and a large table in AR. The desktop
   preview and file audits cannot verify physical camera tracking or perceived size.

If the mobile dashboard hides upload controls, request the desktop version of
the page. Do not select the source-code ZIP supplied automatically by GitHub.
Updates use Create a new deployment and a newly built ZIP; a Direct Upload project
does not automatically track GitHub changes.

Documentation: https://developers.cloudflare.com/pages/get-started/direct-upload/

## Architecture / maintenance

`static-demo/main.tsx` routes the catalog and `?widget=1` viewer. It reuses
`app/demo-store/store.tsx`, `app/page.tsx`, the language provider and existing CSS.
The two React components accept optional adapters; their default production
API/SDK behavior is unchanged. **Do not bypass production subscriptions** to
support this demo. Its separate `static-demo/widget.ts` mounts the native mobile
AR launcher or an accessible desktop dialog, with origin/source-checked messages.

`scripts/static-demo-data.mjs` validates/allowlists the public catalog and produces
static per-SKU configs. The launcher compares its model to that public snapshot;
it grants no access to the production API. `scripts/build-static-demo.mjs` bundles
React with plain Vite, copies only referenced assets and local Draco decoders,
writes Pages headers and duplicates index.html for direct `/demo-store` links.

All runtime catalog/model requests are same-origin files. There are no Google
Fonts or Sites dependencies. Native AR still depends on device/browser support
(Quick Look on supported iOS, WebXR/Scene Viewer on supported Android). In-app
browsers may require opening Safari/Chrome. The existing help/QR flow is retained.
Preview zoom changes camera distance, not model geometry. AR uses `ar-scale=fixed`
and is gated by the existing dimension check. GLBs are authored in metres.

Photos, prices and stock are a snapshot, not live inventory. The demo is explicitly
not an operating store; the cart is illustrative and does not take payments.

## Neutral branding

The static entry point passes `neutral` to `DemoStore`. Production defaults and
the original snapshot remain unchanged. `neutralCatalog` creates a separate copy:
removes outbound product URLs, replaces merchant IDs/SKUs with demo aliases, and
renames asset paths. The packager copies the original bytes to these paths; it
does not regenerate models, change textures, dimensions or numeric prices.
Per-SKU widget JSON uses the same aliases, including color variants.

All new interface text is available in Russian, Romanian and English. Product
labels/materials use `catalog-localization.mjs`; numeric prices are unchanged.
Tests check model mappings, original snapshot preservation and absence of merchant
branding in the exported catalog. Neutral branding does not confer rights to the
underlying photos/models; their public portfolio use still needs appropriate rights.

The previous personalized deployment is not automatically overwritten. Deploy
the neutral ZIP to a separate Pages project to also obtain a neutral URL. Merely
uploading to the old project keeps its existing merchant-named hostname.
