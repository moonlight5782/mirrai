# MIRRAI

Mobile-first prototype for real-time virtual clothing try-on and AR furniture placement.

## Included

- two product flows: clothing and interior objects;
- live camera access with front/rear camera selection;
- interactive clothing, size and material controls;
- AR placement prototype for interior objects;
- responsive Russian-language interface;
- Cloudflare-compatible vinext build and OpenAI Sites configuration.

The current clothing overlay and spatial placement are an interactive product prototype. Production body tracking, garment deformation and native LiDAR support will be added as separate ML/AR engines.

## Development

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
npm run build
```

Camera access requires HTTPS or localhost.
