import { env } from "cloudflare:workers";

type StoredObject = { body: BodyInit; size: number; httpEtag?: string };
type UploadBucket = {
  put(key: string, value: ArrayBuffer, options?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
  get(key: string): Promise<StoredObject | null>;
  delete(key: string): Promise<void>;
};

export function getUploadsBucket() {
  const bucket = (env as unknown as { UPLOADS?: UploadBucket }).UPLOADS;
  if (!bucket) throw new Error("R2 binding `UPLOADS` is unavailable");
  return bucket;
}
