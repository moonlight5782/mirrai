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

## Self-hosted 3D generation

The direct-site flow detects product images and GLB files automatically. GLB opens locally. A photo is submitted to a self-hosted Hunyuan3D 2.1 service and returns as a textured model.

Deployment files and GPU requirements are in [`services/reconstruction`](services/reconstruction/README.md). Configure `NEXT_PUBLIC_RECONSTRUCTION_API_URL` with the service's public HTTPS origin.

AI reconstruction from one photo estimates hidden geometry. Store-published assets should use manufacturer CAD/3D files or multi-view capture and must pass dimension and visual QA.

## Verified devices

- iPhone / Safari: AR Quick Look launches, detects the floor, and places the chair. Manually verified on 26 August 2026.
