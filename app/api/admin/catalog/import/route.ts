import { and, eq } from "drizzle-orm";
import { getChatGPTUser } from "../../../../chatgpt-auth";
import { getDb } from "../../../../../db";
import { authorizedShop } from "../../../../../db/authorization";
import { productModels, products } from "../../../../../db/schema";

function parseCsv(text: string) {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? ""; const delimiter = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = []; let row: string[] = []; let value = ""; let quoted = false;
  for (let i = 0; i < text.length; i++) { const char = text[i]; if (char === '"') { if (quoted && text[i + 1] === '"') { value += '"'; i++; } else quoted = !quoted; } else if (char === delimiter && !quoted) { row.push(value.trim()); value = ""; } else if ((char === "\n" || char === "\r") && !quoted) { if (char === "\r" && text[i + 1] === "\n") i++; row.push(value.trim()); if (row.some(Boolean)) rows.push(row); row = []; value = ""; } else value += char; }
  row.push(value.trim()); if (row.some(Boolean)) rows.push(row); return rows;
}
function number(value?: string) { const parsed = Number((value ?? "").replace(",", ".")); return Number.isFinite(parsed) && parsed > 0 ? parsed : null; }

export async function POST(request: Request) {
  const user = await getChatGPTUser(); if (!user) return Response.json({ error: "authentication_required" }, { status: 401 });
  const form = await request.formData(); const shopSlug = String(form.get("shop") ?? ""); const file = form.get("file");
  const access = await authorizedShop(user, shopSlug); if (!access) return Response.json({ error: "shop_not_found" }, { status: 404 });
  if (!(file instanceof File) || file.size > 5_000_000) return Response.json({ error: "invalid_file" }, { status: 400 });
  const rows = parseCsv((await file.text()).replace(/^\uFEFF/, "")); if (rows.length < 2 || rows.length > 2001) return Response.json({ error: "invalid_rows" }, { status: 400 });
  const aliases: Record<string, string> = { "артикул": "sku", "sku": "sku", "название": "name", "name": "name", "категория": "category", "category": "category", "цена": "price", "price": "price", "материал": "material", "material": "material", "ширина": "width", "width": "width", "высота": "height", "height": "height", "глубина": "depth", "depth": "depth", "glb": "glb", "usdz": "usdz" };
  const headers = rows[0].map(value => aliases[value.trim().toLowerCase()] ?? value.trim().toLowerCase());
  if (!headers.includes("sku") || !headers.includes("name")) return Response.json({ error: "headers_required" }, { status: 400 });
  const db = getDb(); let imported = 0; const errors: string[] = [];
  for (const [index, values] of rows.slice(1).entries()) { const record = Object.fromEntries(headers.map((header, i) => [header, values[i] ?? ""])); const sku = record.sku?.slice(0, 120); const name = record.name?.slice(0, 160); if (!sku || !name) { errors.push(`Строка ${index + 2}: нет SKU или названия`); continue; }
    await db.insert(products).values({ shopId: access.shop.id, sku, name, category: record.category?.slice(0, 100) || "Мебель", price: record.price?.slice(0, 50) || "", material: record.material?.slice(0, 160) || "", widthCm: number(record.width), heightCm: number(record.height), depthCm: number(record.depth), updatedAt: new Date().toISOString() }).onConflictDoUpdate({ target: [products.shopId, products.sku], set: { name, category: record.category?.slice(0, 100) || "Мебель", price: record.price?.slice(0, 50) || "", material: record.material?.slice(0, 160) || "", widthCm: number(record.width), heightCm: number(record.height), depthCm: number(record.depth), updatedAt: new Date().toISOString() } });
    const [product] = await db.select({ id: products.id }).from(products).where(and(eq(products.shopId, access.shop.id), eq(products.sku, sku))).limit(1);
    if (record.glb && /^https:\/\//i.test(record.glb)) await db.insert(productModels).values({ productId: product.id, glbUrl: record.glb.slice(0, 1000), usdzUrl: /^https:\/\//i.test(record.usdz) ? record.usdz.slice(0, 1000) : null, status: "review", sourceType: "imported", validationMessage: "Импортировано — требуется проверка" }).onConflictDoUpdate({ target: productModels.productId, set: { glbUrl: record.glb.slice(0, 1000), usdzUrl: /^https:\/\//i.test(record.usdz) ? record.usdz.slice(0, 1000) : null, status: "review", sourceType: "imported", updatedAt: new Date().toISOString() } });
    imported++;
  }
  return Response.json({ ok: true, imported, errors: errors.slice(0, 20) });
}
