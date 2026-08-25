# MIRRAI

Mobile-first prototype for real-time virtual clothing try-on and AR furniture placement.

## Included

- two product flows: clothing and interior objects;
- live camera access with front/rear camera selection;
- interactive clothing, size and material controls;
- real 3D furniture preview with fixed-scale placement through WebXR, Android Scene Viewer, and iOS AR Quick Look;
- responsive Russian-language interface;
- Cloudflare-compatible vinext build and OpenAI Sites configuration.

The furniture flow uses a real GLB asset and delegates plane detection, tracking, shadows, and placement to the device AR runtime. Clothing remains an interactive overlay prototype; production body tracking and garment deformation will be added as a separate ML engine.

## Development

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
npm run build
```

Camera access requires HTTPS or localhost.
