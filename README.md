# MIRRAI

MIRRAI is a furniture-first AR commerce prototype. A shopper opens a product from an online-store card and places it in their room at real scale without installing an app.

## Included

- furniture-focused landing page and interactive catalog;
- GLB preview plus WebXR, Android Scene Viewer, and iOS AR Quick Look launch;
- per-product width, height, and depth with automatic 1:1 model scaling;
- PBR preview lighting, exposure control, contact shadows, and native AR lighting adaptation;
- direct-site upload of a product photo or GLB for testing;
- embeddable widget mode that receives the selected store product through URL parameters;
- widget events for `model_ready`, `ar_open`, and `object_placed`;
- subscription fallback state;
- persistent merchant catalog with model coverage and lifecycle statuses;
- protected `/admin/catalog` dashboard for GLB/USDZ assignment and publication;
- nontechnical `/admin/setup` wizard with domain protection, platform-specific copy, installation detection, and developer handoff;
- public widget configuration by `shopId + SKU` instead of exposing asset details in store code;
- server-side widget event collection;
- multi-store memberships, operator client management and email-based owner invitations;
- CSV catalog import with a downloadable template;
- first-party GLB/USDZ uploads stored in R2;
- 30-day AR funnel analytics per store and product;
- SDK 1.0 batch configuration, one shared modal and dynamic-page observation;
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

The production-style SDK is available at `/mirrai-widget.js`. It can auto-mount from `data-*` attributes or be mounted on dynamic product pages:

```html
<div id="mirrai-slot"></div>
<script src="https://mirrai-try-on.moonlight-5782.chatgpt.site/mirrai-widget.js" data-auto="false"></script>
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

The SDK requests `/api/widget/config`, and the button appears only when the subscription is active and the model status is `published`. Administrators manage coverage, GLB/USDZ URLs and validation notes at `/admin/catalog`. The public product demo stays open, while every dashboard section uses a dedicated sign-in gate and server-side shop authorization.

For a full-store installation, add the script once and mark each product-card slot with its SKU. The SDK scans all matching slots automatically:

```html
<script src="https://mirrai-try-on.moonlight-5782.chatgpt.site/mirrai-widget.js" data-shop-id="nordform" data-auto="scan" defer></script>
<div data-mirrai-sku="CLOUD-001"></div>
```

The SDK reports its first valid load to the setup wizard, so a store owner can verify installation without inspecting code.

## Commercial pilot operations

- `/admin/clients` creates merchant accounts and assigns the owner email.
- `/admin/catalog?shop=SHOP_ID` imports CSV, uploads GLB/USDZ, validates and publishes models.
- `/admin/setup?shop=SHOP_ID` configures the allowed domain and produces the integration snippet.
- `/admin/analytics?shop=SHOP_ID` shows the 30-day funnel from widget open to AR placement.

Uploaded binaries are stored in the `UPLOADS` R2 binding and served through immutable asset URLs. The public SDK batches up to 100 SKU configurations per request and watches dynamically rendered product cards.

## HUGGE.md pilot

The first merchant pilot is provisioned as `hugge-md`. MIRRAI imports furniture names, source URLs, dimensions and product photography from the store's OpenCart sitemap in batches of 100. The initial migration includes 16 priority furniture products; the current sitemap exposes 355 furniture candidates.

For OpenCart product pages, the SDK can locate the UltraStore product code and insert its AR launcher without per-product markup:

```html
<script src="https://mirrai-try-on.moonlight-5782.chatgpt.site/mirrai-widget.js" data-shop-id="hugge-md" data-auto="product" data-sku-prefix="HUGGE-" defer></script>
```

As of 28 August 2026, `hugge.md` serves an expired TLS certificate. The pilot remains marked `blocked` for automatic sync and installation until the merchant renews HTTPS; the already imported catalog is preserved.

## Self-hosted 3D generation

The direct-site flow detects product images and GLB files automatically. GLB opens locally. A photo is submitted to a self-hosted Hunyuan3D 2.1 service and returns as a textured model.

Deployment files and GPU requirements are in [`services/reconstruction`](services/reconstruction/README.md). Configure `NEXT_PUBLIC_RECONSTRUCTION_API_URL` for direct uploads on the public demo, and the server-only `RECONSTRUCTION_API_URL` plus `RECONSTRUCTION_API_TOKEN` for merchant batch jobs.

The admin catalog now has a durable batch queue. An operator selects products with source photos, queues them by priority and starts or polls processing. The Hugging Face adapter supports both Hunyuan3D's `generation_all` endpoint and Stable Fast 3D's lighter `run_button` endpoint. Generated GLB files are copied into the merchant's R2 storage and always enter `review`; they never become available in the widget until an operator checks scale and materials and explicitly publishes them. Failed jobs retry up to three times. Geometry-only output is rejected: a model can enter review only when the service returns a textured GLB.

Four HUGGE products are preloaded as the first batch: Alba HUGGE-89990, Ria HUGGE-109553, Ria HUGGE-107376 and Blackburn HUGGE-100326. They remain visibly blocked—not falsely complete—until both the HUGGE HTTPS source and the reconstruction service are available.

For a no-cost pilot, MIRRAI can also submit jobs to a duplicated Hugging Face ZeroGPU Gradio Space through `HUGGINGFACE_SPACE_URL`. The exact nontechnical setup is documented in [`integrations/huggingface-space`](integrations/huggingface-space/README.md).

AI reconstruction from one photo estimates hidden geometry. Store-published assets should use manufacturer CAD/3D files or multi-view capture and must pass dimension and visual QA.

## Verified devices

- iPhone / Safari: AR Quick Look launches, detects the floor, and places the chair. Manually verified on 26 August 2026.
