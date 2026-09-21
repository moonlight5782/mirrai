export type UploadKind = "glb" | "usdz" | "photo";

type AssetValidation =
  | { ok: true; extension: string; contentType: string }
  | { ok: false; error: "extension_mismatch" | "invalid_signature" | "invalid_asset" };

const IMAGE_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

function matches(bytes: Uint8Array, expected: number[], offset = 0) {
  return expected.every((value, index) => bytes[offset + index] === value);
}

export function validateAssetHeader(file: Pick<File, "name" | "type" | "size">, kind: string, bytes: Uint8Array): AssetValidation {
  if (!new Set<UploadKind>(["glb", "usdz", "photo"]).has(kind as UploadKind) || file.size < 100) return { ok: false, error: "invalid_asset" };
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";

  if (kind === "glb") {
    if (extension !== "glb") return { ok: false, error: "extension_mismatch" };
    if (bytes.length < 12 || !matches(bytes, [0x67, 0x6c, 0x54, 0x46])) return { ok: false, error: "invalid_signature" };
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (view.getUint32(4, true) !== 2 || view.getUint32(8, true) !== file.size) return { ok: false, error: "invalid_signature" };
    return { ok: true, extension, contentType: "model/gltf-binary" };
  }

  if (kind === "usdz") {
    if (extension !== "usdz") return { ok: false, error: "extension_mismatch" };
    if (bytes.length < 4 || !matches(bytes, [0x50, 0x4b, 0x03, 0x04])) return { ok: false, error: "invalid_signature" };
    return { ok: true, extension, contentType: "model/vnd.usdz+zip" };
  }

  const expectedType = IMAGE_TYPES[extension];
  if (!expectedType || file.type.toLowerCase() !== expectedType) return { ok: false, error: "extension_mismatch" };
  const validImage = extension === "png"
    ? matches(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    : extension === "webp"
      ? matches(bytes, [0x52, 0x49, 0x46, 0x46]) && matches(bytes, [0x57, 0x45, 0x42, 0x50], 8)
      : matches(bytes, [0xff, 0xd8, 0xff]);
  return validImage ? { ok: true, extension, contentType: expectedType } : { ok: false, error: "invalid_signature" };
}
