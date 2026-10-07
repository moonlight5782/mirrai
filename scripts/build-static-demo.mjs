/** Build a self-contained Pages Direct Upload ZIP, without credentials or a backend.
 * --refresh snapshots only the public HUGGE catalog; normal builds are reproducible
 * from the checked-in snapshot and current local model files.
 */
import { readFile, writeFile, mkdir, copyFile, readdir, stat } from "node:fs/promises";
import { resolve, dirname, relative } from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { build } from "vite";
import { publicCatalog, assetPaths, widgetConfigs, neutralCatalog, neutralAssetPath } from "./static-demo-data.mjs";

const root = resolve(import.meta.dirname, "..");
const neutral = !process.argv.includes("--hugge");
const brand = neutral ? "neutral" : "hugge";
const assetDestination = neutral ? neutralAssetPath : value => value;
const source = resolve(root, "static-demo/catalog.json");
if (process.argv.includes("--refresh")) {
  const response = await fetch("https://mirrai-try-on.moonlight-5782.chatgpt.site/api/storefront/catalog?shop=hugge-md", { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Catalog: HTTP ${response.status}`);
  const catalog = publicCatalog(await response.json());
  await writeFile(source, JSON.stringify({ ...catalog, snapshotDate: new Date().toISOString().slice(0, 10) }, null, 2) + "\n");
}
const snapshot = JSON.parse(await readFile(source, "utf8"));
const original = publicCatalog(snapshot);
const catalog = neutral ? neutralCatalog(original) : original;
const assets = assetPaths(original);
const site = resolve(root, "outputs/static-demo/site");
// Preflight before Vite replaces this dedicated generated directory.
for (const asset of assets) {
  const info = await stat(resolve(root, "public", asset.slice(1)));
  if (!info.isFile() || info.size > 25 * 1024 * 1024) throw new Error(`Pages file limit: ${asset}`);
}
await build({ configFile: resolve(root, "static-demo/vite.config.ts"), define: { __DEMO_NEUTRAL__: JSON.stringify(neutral) } });
if (!neutral) {
  const index = resolve(site, "index.html");
  const html = await readFile(index, "utf8");
  await writeFile(index, html.replace("MIRRAI Demo — 3D / AR", "HUGGE × MIRRAI — 3D / AR"));
}
await mkdir(resolve(site, "demo-data"), { recursive: true });
await writeFile(resolve(site, "demo-data/catalog.json"), JSON.stringify({ ...catalog, snapshotDate: snapshot.snapshotDate }));
for (const [sku, config] of Object.entries(widgetConfigs(catalog))) {
  await writeFile(resolve(site, `demo-data/widget-${sku}.json`), JSON.stringify(config));
}
for (const asset of [...assets, "/favicon.svg", "/og-furniture.png"]) {
  const destination = resolve(site, assetDestination(asset).slice(1));
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(resolve(root, "public", asset.slice(1)), destination);
}
// Model-viewer's Draco loader is local: no Google CDN dependency for decoding.
for (const name of await readdir(resolve(root, "public/draco"))) {
  await mkdir(resolve(site, "draco"), { recursive: true });
  await copyFile(resolve(root, "public/draco", name), resolve(site, "draco", name));
}
await mkdir(resolve(site, "demo-store"), { recursive: true });
await copyFile(resolve(site, "index.html"), resolve(site, "demo-store/index.html"));
await writeFile(resolve(site, "_headers"), `/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(self), xr-spatial-tracking=(self)\n/catalog/*.glb\n  Content-Type: model/gltf-binary\n/catalog/*.usdz\n  Content-Type: model/vnd.usdz+zip\n`);

const files = [];
async function collect(folder) {
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const path = resolve(folder, entry.name);
    if (entry.isDirectory()) await collect(path);
    else {
      const bytes = await readFile(path);
      if (bytes.length > 25 * 1024 * 1024) throw new Error(`Pages file too large: ${path}`);
      files.push({ path: relative(site, path).replaceAll("\\", "/"), bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") });
    }
  }
}
await collect(site);
if (files.length > 1000) throw new Error("Dashboard upload is limited to 1000 files");
const manifest = { brand, snapshotDate: snapshot.snapshotDate, products: catalog.items.length, models: assets.filter(path => path.endsWith(".glb")).length, files };
await writeFile(resolve(root, "outputs/static-demo/manifest.json"), JSON.stringify(manifest, null, 2));
const zipName = neutral ? "mirrai-demo.zip" : "mirrai-hugge-demo.zip";
const zip = resolve(root, "outputs/static-demo", zipName);
// Only generated site files are archived: never repository, env, database or source.
const result = process.argv.includes("--no-zip") ? { status: 0 } : process.platform === "win32"
  ? spawnSync("powershell.exe", ["-NoProfile", "-Command", `Compress-Archive -Path './*' -DestinationPath '../${zipName}' -Force`], { cwd: site, stdio: "inherit" })
  : spawnSync("zip", ["-qr", zip, "."], { cwd: site, stdio: "inherit" });
if (result.status !== 0) throw new Error("ZIP creation failed");
console.log(JSON.stringify({ brand, site, zip: process.argv.includes("--no-zip") ? null : zip, products: manifest.products, models: manifest.models, files: files.length, largestMiB: Number((Math.max(...files.map(file => file.bytes)) / 1024 / 1024).toFixed(1)) }, null, 2));
