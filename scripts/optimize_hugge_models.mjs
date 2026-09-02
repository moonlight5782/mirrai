/** Optimize verified HUGGE GLBs for fast storefront and mobile AR delivery. */

import { copyFileSync, mkdirSync, readdirSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const catalog = join(root, "public", "catalog");
const output = join(root, ".tmp-hugge-model-optimization");
const npx = process.platform === "win32" ? "npx.cmd" : "npx";

mkdirSync(output, { recursive: true });
const models = readdirSync(catalog)
  .filter((name) => /^hugge-.*-trellis2-q8-pbr\.glb$/.test(name))
  .sort();

if (!models.length) throw new Error("No generated HUGGE models found");

for (const name of models) {
  const source = join(catalog, name);
  const target = join(output, basename(name));
  const result = spawnSync(npx, [
    "--yes", "@gltf-transform/cli@4.5.0", "optimize", source, target,
    "--compress", "draco", "--texture-compress", "webp", "--texture-size", "1024",
  ], { stdio: "inherit" });
  if (result.status !== 0) throw new Error(`Optimization failed: ${name}`);
}

for (const name of models) {
  const destination = join(catalog, name);
  copyFileSync(join(output, name), destination);
}

console.log(`Optimized ${models.length} HUGGE models.`);
