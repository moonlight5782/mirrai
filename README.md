# MIRRAI

Mobile-first prototype for real-time virtual clothing try-on and AR furniture placement.

## Included

- two product flows: clothing and interior objects;
- live camera access with front/rear camera selection;
- interactive clothing, size and material controls;
- expanded clothing and interior catalog plus direct-site upload of a product photo or GLB/GLTF model;
- on-device MediaPipe pose tracking that anchors the garment to shoulders, elbows, and hips in live video;
- real 3D furniture preview with fixed-scale placement through WebXR, Android Scene Viewer, and iOS AR Quick Look;
- responsive Russian-language interface;
- Cloudflare-compatible vinext build and OpenAI Sites configuration.

The furniture flow uses a real GLB asset and delegates plane detection, tracking, shadows, and placement to the device AR runtime. Clothing pose tracking runs locally on the device; physically accurate fabric deformation remains a later ML stage.

## Development

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
npm run build
```

Camera access requires HTTPS or localhost.

## Self-hosted 3D generation

The direct-site flow detects images and 3D files automatically. GLB/GLTF files open immediately; product photos are submitted to a self-hosted Hunyuan3D 2.1 service and return as textured GLB assets. The store widget hides manual upload and receives its product from the store page.

Deployment files and GPU requirements are in [`services/reconstruction`](services/reconstruction/README.md). Configure the web build with `NEXT_PUBLIC_RECONSTRUCTION_API_URL` pointing to the service's public HTTPS origin.

## Verified devices

- iPhone / Safari: native AR Quick Look launches successfully, detects a real floor surface, and places the chair at real-world scale. Manually verified on 26 August 2026.
