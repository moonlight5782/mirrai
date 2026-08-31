import { readFile, mkdir, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import https from "node:https";

const root = new URL("../", import.meta.url);
const seed = await readFile(new URL("drizzle/0003_colossal_the_fallen.sql", root), "utf8");
const outputDir = new URL("public/catalog-sources/hugge-md/", root);
const products = [...seed.matchAll(/'([^']+)','(HUGGE-[^']+)','([^']+)','([^']+)','(https:\/\/hugge\.md\/[^']+)','\["([^"]+)/g)]
  .map(([, externalId, sku, name, category, sourceUrl, image]) => ({ externalId, sku, name, category, sourceUrl, seedImage: image }));

const agent = new https.Agent({ rejectUnauthorized: false });
const get = url => new Promise((resolve, reject) => {
  https.get(url, { agent, headers: { "user-agent": "MIRRAI catalog demo/1.0" } }, response => {
    if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
      response.resume();
      return get(new URL(response.headers.location, url).href).then(resolve, reject);
    }
    if (response.statusCode !== 200) return reject(new Error(`${response.statusCode} ${url}`));
    const chunks = [];
    response.on("data", chunk => chunks.push(chunk));
    response.on("end", () => resolve(Buffer.concat(chunks)));
  }).on("error", reject);
});

const clean = value => value.replaceAll("&amp;", "&").replaceAll("\\/", "/");
const records = [];
await mkdir(outputDir, { recursive: true });

for (const product of products) {
  const html = (await get(product.sourceUrl)).toString("utf8");
  const title = html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim() || product.name;
  const price = html.match(/"price"\s*:\s*"([\d.]+)"/i)?.[1] || html.match(/price-actual[^>]*>\s*([\d ]+)\s*Lei/i)?.[1]?.replaceAll(" ", "") || "";
  const candidates = [...html.matchAll(/https:\/\/hugge\.md\/image\/(?:cache\/)?catalog\/[^"'<> ]+?\.(?:jpe?g|png|webp)/gi)].map(match => clean(match[0]));
  const skuNumber = product.sku.replace("HUGGE-", "");
  const gallery = [...new Set(candidates.filter(url => url.includes(skuNumber) && !url.includes("100x100")))];
  if (!gallery.length) gallery.push(product.seedImage);
  const localImages = [];
  for (const [index, imageUrl] of gallery.slice(0, 4).entries()) {
    const extension = (basename(new URL(imageUrl).pathname).match(/\.(jpe?g|png|webp)$/i)?.[0] || ".jpg").toLowerCase();
    const filename = `${skuNumber}-${index + 1}${extension}`;
    await writeFile(join(fileURLToPath(outputDir), filename), await get(imageUrl));
    localImages.push(`/catalog-sources/hugge-md/${filename}`);
  }
  records.push({ ...product, title, price: price ? `${Number(price).toLocaleString("ru-RU")} Lei` : "Цена по запросу", images: localImages });
  process.stdout.write(`${product.sku}: ${localImages.length} фото, ${price || "без цены"}\n`);
}

await writeFile(new URL("catalog.json", outputDir), `${JSON.stringify(records, null, 2)}\n`);
