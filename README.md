# MIRRAI

Подробная схема компонентов, потоков данных, установки виджета и границ готовности к production описана в [`docs/ARCHITECTURE_RU.md`](docs/ARCHITECTURE_RU.md).

MIRRAI is a furniture-first AR commerce prototype. A shopper opens a product from an online-store card and places it in their room at real scale without installing an app.

## Included

- furniture-focused landing page and interactive catalog;
- GLB preview plus WebXR, Android Scene Viewer, and iOS AR Quick Look launch;
- per-product width, height, and depth with automatic 1:1 model scaling;
- PBR preview lighting, exposure control, contact shadows, and native AR lighting adaptation;
- local preview of a merchant-provided GLB; product photos are uploaded only through the protected merchant dashboard;
- embeddable widget mode that receives the selected store product through URL parameters;
- widget events for `model_ready`, `ar_open`, and `object_placed`;
- subscription fallback state;
- persistent merchant catalog with model coverage and lifecycle statuses;
- protected `/admin/catalog` dashboard for GLB/USDZ assignment and publication;
- nontechnical `/admin/setup` wizard with domain protection, platform-specific copy, installation detection, and developer handoff;
- public widget configuration by `shopId + SKU` instead of exposing asset details in store code;
- server-side widget event collection;
- multi-store memberships, operator client management and expiring one-time invitation links;
- CSV catalog import with a downloadable template;
- first-party GLB/USDZ uploads stored in R2;
- 30-day AR funnel analytics per store and product;
- versioned SDK 2.2.0 batch configuration, one shared modal and dynamic-page observation;
- responsive Russian-language interface and Cloudflare-compatible Sites build.

## Development

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
npm run build
```

Camera-based AR requires HTTPS or localhost.

## Store widget

Open the deployed MIRRAI page in an iframe or a new mobile tab and pass product data:

```text
?widget=1
&productId=chair-42
&name=Кресло%20Cloud
&price=67000%20₽
&category=Кресла
&material=Букле
&model=https://cdn.store.example/chair.glb
&iosModel=https://cdn.store.example/chair.usdz
&width=84
&height=76
&depth=82
&color=%23d2bda8
&parentOrigin=https://store.example
```

Dimensions are centimeters. Remote assets must use HTTPS and allow cross-origin access. The widget reports non-sensitive events to `window.parent` with `source: "mirrai-widget"`.

`subscription=inactive` demonstrates the inactive-subscription fallback. Production entitlement must be issued and verified by the merchant backend; a URL parameter is not a security mechanism.

The versioned pilot SDK is available at `/mirrai-widget-2.2.0.js`; `/mirrai-widget.js` remains a compatibility alias for existing installations. It can auto-mount from `data-*` attributes or be mounted on dynamic product pages:

```html
<div id="mirrai-slot"></div>
<script src="https://mirrai-try-on.moonlight-5782.chatgpt.site/mirrai-widget-2.2.0.js" data-auto="false"></script>
<script>
  MirraiWidget.mount({
    target: "#mirrai-slot",
    productId: "chair-42",
    name: "Кресло Cloud",
    model: "https://cdn.store.example/chair.glb",
    iosModel: "https://cdn.store.example/chair.usdz",
    width: "84", height: "76", depth: "82"
  });
</script>
```

See `/demo-store` for the complete store-card experience. Mobile shoppers open the AR viewer in a new tab for reliable native handoff; desktop shoppers get an accessible modal preview.

For catalog-backed installation, the store only supplies merchant and SKU identifiers:

```js
MirraiWidget.mount({ target: "#mirrai-slot", shopId: "nordform", sku: "CLOUD-001" });
```

The SDK requests `/api/widget/config`, and the button appears only when the subscription is active and the model status is `published`. Administrators manage coverage, photos, GLB/USDZ uploads and validation notes at `/admin/catalog`. The public product demo stays open, while every dashboard section uses MIRRAI email/password sessions and server-side shop authorization. Merchant passwords are stored as salted PBKDF2 hashes; session tokens are kept only in secure HttpOnly cookies and hashed in D1.

For a full-store installation, add the script once and mark each product-card slot with its SKU. The SDK scans all matching slots automatically:

```html
<script src="https://mirrai-try-on.moonlight-5782.chatgpt.site/mirrai-widget-2.2.0.js" data-shop-id="nordform" data-auto="scan" defer></script>
<div data-mirrai-sku="CLOUD-001"></div>
```

`data-mirrai-sku` is the preferred source of truth. If a product page has no SKU in structured data or HTML, but its URL reliably ends with the SKU, add `data-allow-url-sku="true"` to the script. URL guessing is disabled by default so the wrong model cannot be attached to a product.

The SDK reports its first valid load to the setup wizard, so a store owner can verify installation without inspecting code.

## Commercial pilot operations

- `/register` and `/login` provide merchant-owned accounts without a ChatGPT login.
- `/admin` shows the current store state, catalogue coverage, installation, subscription and 30-day funnel.
- `/admin/clients` creates merchant accounts and assigns the owner email.
- `/admin/team?shop=SHOP_ID` manages staff access: owners control the team, editors change the catalogue, and analysts have read-only access.
- `/admin/catalog?shop=SHOP_ID` imports CSV, uploads GLB/USDZ, validates and publishes models.
- `/admin/setup?shop=SHOP_ID` configures the allowed domain and produces the integration snippet.
- `/admin/analytics?shop=SHOP_ID` shows the 30-day funnel from widget open to AR placement.

Uploaded binaries are stored in the `UPLOADS` R2 binding and served through immutable asset URLs. The public SDK batches up to 100 SKU configurations per request and watches dynamically rendered product cards.

Invitations are not accepted from an email match alone. MIRRAI creates a random single-use link that expires after seven days; accepting it verifies the invited account and binds its role to one store. API routes enforce the same permissions independently of the visible navigation. Only a platform operator can list all clients, publish reviewed models or operate another store.

## HUGGE.md pilot

The first merchant pilot is provisioned as `hugge-md`. MIRRAI imports furniture names, source URLs, dimensions and product photography from the store's OpenCart sitemap in batches of 100. The initial migration includes 16 priority furniture products; the current sitemap exposes 355 furniture candidates.

For OpenCart product pages, the SDK can locate the UltraStore product code and insert its AR launcher without per-product markup:

```html
<script src="https://mirrai-try-on.moonlight-5782.chatgpt.site/mirrai-widget-2.2.0.js" data-shop-id="hugge-md" data-auto="product" data-sku-prefix="HUGGE-" defer></script>
```

As of 28 August 2026, `hugge.md` serves an expired TLS certificate. The pilot remains marked `blocked` for automatic sync and installation until the merchant renews HTTPS; the already imported catalog is preserved.

## Self-hosted 3D generation

The public demo opens a ready GLB locally and never calls the GPU gateway from the browser. Merchant product photos are uploaded in `/admin/catalog`; MIRRAI then submits approved jobs from its server-side generation queue.

Deployment files and GPU requirements are in [`services/reconstruction`](services/reconstruction/README.md). Configure only the server-side `RECONSTRUCTION_API_URL` and `RECONSTRUCTION_API_TOKEN`; the token and gateway URL must never be exposed through a `NEXT_PUBLIC_*` variable.

The admin catalog now has a durable batch queue. An operator selects products with source photos, queues them by priority and starts or polls processing. The Hugging Face adapter supports both Hunyuan3D's `generation_all` endpoint and Stable Fast 3D's lighter `run_button` endpoint. Generated GLB files are copied into the merchant's R2 storage and always enter `review`; they never become available in the widget until an operator checks scale and materials and explicitly publishes them. Failed jobs retry up to three times. Geometry-only output is rejected: a model can enter review only when the service returns a textured GLB.

All 16 priority HUGGE products now have published textured GLBs. The catalogue audit validates their real dimensions in metres and floor grounding before deployment. The three models previously hidden by visual QA—Blackburn HUGGE-100326, Ria HUGGE-107376 and Writex HUGGE-35348—were regenerated with TRELLIS.2 Q8 PBR, compared against their source photographs from multiple angles, and republished on 15 September 2026. Alba HUGGE-89990 retains its separately repaired VIC velvet and matte-black crossed sled base.

The Russian operations and troubleshooting guide is in [`docs/PROJECT_RUNBOOK_RU.md`](docs/PROJECT_RUNBOOK_RU.md).

The reproducible Alba repair pipeline is in `scripts/texture_only_alba.py`. It preserves the successful reconstructed upholstery, adds the VIC velvet PBR maps, removes only the disconnected leg fragments below the seat, and rebuilds the product's crossed sled base as two continuous steel runners. Create a Python 3.12 environment, install `scripts/requirements-mesh.txt`, then pass the original GLB and an output path. The script refuses a cut that reaches the upholstered shell.

The current multiview candidate is prepared by `scripts/materialize_alba.py`. It does not regenerate the accepted mesh: it bakes the exact dimensions, separates upholstery from the metal base using the straight catalog photo, computes normals and vertex-level velvet variation, and exports the web-ready PBR GLB. `scripts/render_alba_qa.py` creates four deterministic orthographic QA views without a browser.

For a no-cost pilot, MIRRAI can also submit jobs to a duplicated Hugging Face ZeroGPU Gradio Space through `HUGGINGFACE_SPACE_URL`. The exact nontechnical setup is documented in [`integrations/huggingface-space`](integrations/huggingface-space/README.md).

AI reconstruction from one photo estimates hidden geometry. Store-published assets should use manufacturer CAD/3D files or multi-view capture and must pass dimension and visual QA.

## Verified devices

- iPhone / Safari: AR Quick Look launches, detects the floor, and places the chair. Manually verified on 26 August 2026.
