import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { getUploadsBucket } from "../../../../db/storage";
import { assets } from "../../../../db/schema";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params; if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });
  const [asset] = await getDb().select().from(assets).where(eq(assets.id, id)).limit(1); if (!asset) return new Response("Not found", { status: 404 });
  const object = await getUploadsBucket().get(asset.storageKey); if (!object) return new Response("Not found", { status: 404 });
  return new Response(object.body, { headers: { "content-type": asset.contentType, "content-length": String(object.size), "cache-control": "public, max-age=31536000, immutable", "etag": object.httpEtag ?? id, "access-control-allow-origin": "*", "content-disposition": `inline; filename="${asset.fileName.replace(/["\\]/g, "")}"` } });
}
