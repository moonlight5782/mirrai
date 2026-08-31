import { readFile, writeFile, stat } from "node:fs/promises";
import { basename } from "node:path";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const catalog = JSON.parse(await readFile(new URL("public/catalog-sources/hugge-md/catalog.json", root), "utf8"));
const requested = process.argv.find(arg => arg.startsWith("--sku="))?.slice(6);
const items = catalog.filter(item => item.sku !== "HUGGE-89990" && (!requested || item.sku === requested));
const base = "https://stabilityai-stable-fast-3d.hf.space";
const auth = process.env.HF_TOKEN ? { authorization: `Bearer ${process.env.HF_TOKEN}` } : {};

function findModel(value) {
  if (Array.isArray(value)) { for (const item of value) { const found = findModel(item); if (found) return found; } }
  if (value && typeof value === "object") {
    if (typeof value.url === "string" && value.url.includes(".glb")) return value.url;
    if (typeof value.path === "string" && value.path.includes(".glb")) return `${base}/gradio_api/file=${value.path}`;
    for (const nested of Object.values(value)) { const found = findModel(nested); if (found) return found; }
  }
  return null;
}

async function generate(item) {
  const source = new URL(`public${item.images[0]}`, root);
  const bytes = await readFile(source);
  const form = new FormData();
  form.append("files", new Blob([bytes], { type: "image/jpeg" }), basename(fileURLToPath(source)));
  let uploaded;
  for (const path of ["/gradio_api/upload", "/upload"]) {
    const response = await fetch(`${base}${path}`, { method: "POST", headers: auth, body: form });
    if (response.ok) { uploaded = (await response.json())[0]; break; }
  }
  if (!uploaded) throw new Error("upload_failed");
  const image = { path: uploaded, orig_name: basename(fileURLToPath(source)), mime_type: "image/jpeg", meta: { _type: "gradio.FileData" } };
  let eventId; let apiPrefix;
  for (const prefix of ["/gradio_api", ""]) {
    const response = await fetch(`${base}${prefix}/call/run_button`, { method: "POST", headers: { ...auth, "content-type": "application/json" }, body: JSON.stringify({ data: [image, 0.85, "Triangle", 18000, 1024] }) });
    if (response.ok) { eventId = (await response.json()).event_id; apiPrefix = prefix; break; }
  }
  if (!eventId) throw new Error("submit_failed");
  const stream = await fetch(`${base}${apiPrefix}/call/run_button/${eventId}`, { headers: { ...auth, accept: "text/event-stream" } });
  const payload = await stream.text();
  const complete = [...payload.matchAll(/event: complete\s+data: (.+)/g)].at(-1)?.[1];
  if (!complete) throw new Error(payload.includes("event: error") ? `generation_failed: ${payload.slice(-700).replaceAll("\n", " ")}` : "generation_incomplete");
  const modelUrl = findModel(JSON.parse(complete));
  if (!modelUrl) throw new Error("model_missing");
  const modelResponse = await fetch(new URL(modelUrl, base), { headers: auth });
  if (!modelResponse.ok) throw new Error(`download_${modelResponse.status}`);
  const output = new URL(`public/catalog/${item.sku.toLowerCase()}-sf3d-candidate.glb`, root);
  await writeFile(output, Buffer.from(await modelResponse.arrayBuffer()));
  const size = (await stat(output)).size;
  process.stdout.write(`${item.sku}: candidate saved (${Math.round(size / 1024)} KB)\n`);
}

for (const item of items) {
  try { await generate(item); }
  catch (error) { process.stderr.write(`${item.sku}: ${error.message}\n`); }
}
