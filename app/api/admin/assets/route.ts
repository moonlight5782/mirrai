import { and, eq } from "drizzle-orm";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { getDb } from "../../../../db";
import { authorizedShop } from "../../../../db/authorization";
import { getUploadsBucket } from "../../../../db/storage";
import { assets, productModels, products } from "../../../../db/schema";

export async function POST(request: Request) {
  const user = await getChatGPTUser(); if (!user) return Response.json({ error: "authentication_required" }, { status: 401 });
  const form = await request.formData(); const shopSlug = String(form.get("shop") ?? ""); const productId = Number(form.get("productId")); const file = form.get("file"); const kind = String(form.get("kind") ?? "glb");
  const access = await authorizedShop(user, shopSlug); if (!access) return Response.json({ error: "shop_not_found" }, { status: 404 });
  const [product] = await getDb().select({ id: products.id }).from(products).where(and(eq(products.id, productId), eq(products.shopId, access.shop.id))).limit(1);
  if (!product || !(file instanceof File) || file.size < 100 || file.size > 50_000_000 || !new Set(["glb", "usdz"]).has(kind)) return Response.json({ error: "invalid_asset" }, { status: 400 });
  const extension = file.name.split(".").pop()?.toLowerCase(); if (extension !== kind) return Response.json({ error: "extension_mismatch" }, { status: 400 });
  const id = crypto.randomUUID(); const storageKey = `shops/${access.shop.id}/products/${product.id}/${id}.${kind}`; const contentType = kind === "glb" ? "model/gltf-binary" : "model/vnd.usdz+zip";
  await getUploadsBucket().put(storageKey, await file.arrayBuffer(), { httpMetadata: { contentType } });
  await getDb().insert(assets).values({ id, shopId: access.shop.id, productId: product.id, storageKey, fileName: file.name.slice(0, 240), contentType, sizeBytes: file.size, kind });
  const url = `/api/assets/${id}`; const existing = await getDb().select().from(productModels).where(eq(productModels.productId, product.id)).limit(1); const current = existing[0];
  const values = { status: "review", sourceType: "uploaded", validationMessage: "Файл загружен — проверьте масштаб и материалы", version: (current?.version ?? 0) + 1, updatedAt: new Date().toISOString(), ...(kind === "glb" ? { glbUrl: url } : { usdzUrl: url }) };
  await getDb().insert(productModels).values({ productId: product.id, ...values }).onConflictDoUpdate({ target: productModels.productId, set: values });
  return Response.json({ ok: true, url, kind }, { status: 201 });
}
