import { readFile, writeFile, stat } from "node:fs/promises";
import { basename } from "node:path";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const catalog = JSON.parse(await readFile(new URL("public/catalog-sources/hugge-md/catalog.json", root), "utf8"));
const requested = process.argv.find(arg => arg.startsWith("--sku="))?.slice(6);
const items = catalog.filter(item => item.sku !== "HUGGE-89990" && (!requested || item.sku === requested));
const base = "https://tencent-hunyuan3d-2-1.hf.space";
const auth = process.env.HF_TOKEN ? { authorization: `Bearer ${process.env.HF_TOKEN}` } : {};

function findModel(value) {
  if (Array.isArray(value)) { for (const item of value) { const found = findModel(item); if (found) return found; } }
  if (value && typeof value === "object") {
    if (typeof value.url === "string" && value.url.includes(".glb")) return value.url;
    if (typeof value.path === "string" && value.path.includes(".glb")) return `${base}/file=${value.path}`;
    for (const nested of Object.values(value)) { const found = findModel(nested); if (found) return found; }
  }
  return null;
}

async function generate(item) {
  const source = new URL(`public${item.images[0]}`, root);
  const bytes = await readFile(source);
  const form = new FormData();
  form.append("files", new Blob([bytes], { type: "image/jpeg" }), basename(fileURLToPath(source)));
  const upload = await fetch(`${base}/upload`, { method: "POST", headers: auth, body: form });
  if (!upload.ok) throw new Error(`upload_${upload.status}`);
  const path = (await upload.json())[0];
  const image = { path, orig_name: basename(fileURLToPath(source)), mime_type: "image/jpeg", meta: { _type: "gradio.FileData" } };
  const request = await fetch(`${base}/call/generation_all`, { method: "POST", headers: { ...auth, "content-type": "application/json" }, body: JSON.stringify({ data: [image, null, null, null, null, 12, 5, Number(item.externalId) % 10000000, 256, true, 8000, false] }) });
  if (!request.ok) throw new Error(`submit_${request.status}`);
  const eventId = (await request.json()).event_id;
  if (!eventId) throw new Error("submit_invalid");
  const response = await fetch(`${base}/call/generation_all/${eventId}`, { headers: { ...auth, accept: "text/event-stream" } });
  const payload = await response.text();
  const complete = [...payload.matchAll(/event: complete\s+data: (.+)/g)].at(-1)?.[1];
  if (!complete) throw new Error(payload.includes("event: error") ? "generation_failed" : "generation_incomplete");
  const modelUrl = findModel(JSON.parse(complete));
  if (!modelUrl) throw new Error("model_missing");
  const model = await fetch(new URL(modelUrl, base), { headers: auth });
  if (!model.ok) throw new Error(`download_${model.status}`);
  const output = new URL(`public/catalog/${item.sku.toLowerCase()}-hunyuan-candidate.glb`, root);
  await writeFile(output, Buffer.from(await model.arrayBuffer()));
  process.stdout.write(`${item.sku}: candidate saved (${Math.round((await stat(output)).size / 1024)} KB)\n`);
}

for (const item of items) {
  try { await generate(item); }
  catch (error) { process.stderr.write(`${item.sku}: ${error.message}\n`); }
}
