import { env } from "cloudflare:workers";

type StoredObject = { body: BodyInit; size: number; httpEtag?: string };
type UploadBucket = {
  maxObjectSize?: number;
  put(key: string, value: BodyInit, options?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
  get(key: string): Promise<StoredObject | null>;
  delete(key: string): Promise<void>;
};

export function getUploadsBucket(): UploadBucket {
  const bindings = env as unknown as {
    UPLOADS?: UploadBucket;
    UPLOADS_KV?: {
      put(key: string, value: ArrayBuffer, options?: { metadata?: { contentType?: string } }): Promise<void>;
      get(key: string, options: { type: "arrayBuffer" }): Promise<ArrayBuffer | null>;
      delete(key: string): Promise<void>;
    };
  };
  if (bindings.UPLOADS) return bindings.UPLOADS;

  // Free Cloudflare staging uses KV instead of R2. KV objects are capped at
  // 25 MiB, so keep a slightly smaller hard limit and read uploads once.
  const kv = bindings.UPLOADS_KV;
  if (!kv) throw new Error("Neither R2 `UPLOADS` nor KV `UPLOADS_KV` is configured");
  const maxObjectSize = 24 * 1024 * 1024;
  return {
    maxObjectSize,
    async put(key: string, value: BodyInit, options?: { httpMetadata?: { contentType?: string } }) {
      const bytes = await new Response(value).arrayBuffer();
      if (bytes.byteLength > maxObjectSize) throw new RangeError("upload_exceeds_free_storage_limit");
      await kv.put(key, bytes, { metadata: options?.httpMetadata });
    },
    async get(key: string) {
      const bytes = await kv.get(key, { type: "arrayBuffer" });
      return bytes ? { body: bytes, size: bytes.byteLength } : null;
    },
    delete(key: string) {
      return kv.delete(key);
    },
  };
}
