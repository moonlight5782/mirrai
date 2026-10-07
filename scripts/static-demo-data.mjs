/** Pure transformations shared by the packager and behavioral tests. */
export function publicCatalog(input) {
  if (input?.shop?.slug !== "hugge-md" || !Array.isArray(input.items) || !input.items.length) throw new Error("Invalid HUGGE catalog");
  const productKeys = ["id", "sku", "name", "category", "price", "material", "color", "width", "height", "depth", "sourceUrl", "images", "selectedVariantId", "modelStatus", "model", "iosModel", "demoAvailable", "published"];
  const variantKeys = ["id", "sku", "name", "colorName", "color", "material", "image", "model", "iosModel", "default", "available", "published"];
  const pick = (value, keys) => Object.fromEntries(keys.map(key => [key, value[key] ?? null]));
  const items = input.items.map(item => ({ ...pick(item, productKeys), variants: (item.variants || []).map(value => pick(value, variantKeys)), modelMessage: "" }));
  const skus = new Set();
  for (const item of items) {
    if (!/^HUGGE-[\w-]+$/.test(item.sku) || skus.has(item.sku)) throw new Error("Invalid or duplicate SKU");
    skus.add(item.sku);
    if (!Array.isArray(item.images) || !item.images.length) throw new Error(`No photos: ${item.sku}`);
    for (const dimension of [item.width, item.height, item.depth]) if (!(dimension > 0 && dimension < 5000)) throw new Error(`Invalid dimensions: ${item.sku}`);
    if (item.demoAvailable && (!item.published || !item.model)) throw new Error(`Unpublished model: ${item.sku}`);
  }
  return { shop: { name: "HUGGE.md", slug: "hugge-md" }, counts: { total: items.length, withModel: items.filter(item => item.demoAvailable).length, published: items.filter(item => item.published).length }, items };
}

export function assetPaths(catalog) {
  const paths = new Set();
  const add = value => {
    if (!value) return;
    // Reject arbitrary remote URLs, traversal, query strings and private uploads.
    if (!/^\/(?:catalog|catalog-sources)\/[a-zA-Z0-9_./-]+\.(?:glb|usdz|jpg|jpeg|png|webp)$/.test(value) || value.split("/").includes("..")) throw new Error(`Unsafe asset: ${value}`);
    paths.add(value);
  };
  for (const item of catalog.items) {
    item.images.forEach(add); add(item.model); add(item.iosModel);
    for (const variant of item.variants) { add(variant.image); add(variant.model); add(variant.iosModel); }
  }
  return [...paths].sort();
}

export function widgetConfigs(catalog) {
  const configs = {};
  for (const item of catalog.items) {
    const make = variant => ({
      available: Boolean(variant ? variant.available && variant.model : item.demoAvailable),
      shopId: catalog.shop.slug, productId: item.id, sku: variant?.sku || item.sku,
      name: item.name, category: item.category, price: item.price,
      material: variant?.material || item.material, color: variant?.color || item.color,
      model: variant?.model || item.model, iosModel: variant?.iosModel || item.iosModel,
      width: item.width, height: item.height, depth: item.depth,
      variants: item.variants, selectedVariantId: variant?.id || item.selectedVariantId,
    });
    configs[item.sku] = make();
    for (const variant of item.variants) {
      if (!/^(?:HUGGE|DEMO)-[\w-]+$/.test(variant.sku)) throw new Error("Invalid variant SKU");
      configs[variant.sku] = make(variant);
    }
  }
  return configs;
}

/** Presentation-only copy: source snapshot remains intact for the tailored demo.
 * Asset aliases change filenames, never GLB bytes, textures or real-world sizes.
 */
export function neutralAssetPath(path) {
  return path.replaceAll("hugge", "demo").replaceAll("HUGGE", "DEMO");
}

export function neutralCatalog(catalog) {
  const copy = JSON.parse(JSON.stringify(catalog), (_key, value) =>
    typeof value === "string" ? neutralAssetPath(value) : value);
  copy.shop = { name: "MIRRAI Demo", slug: "demo-md" };
  for (const item of copy.items) {
    item.sourceUrl = null;
    if (/DEMO/i.test(item.price)) item.price = "Цена по запросу";
  }
  return copy;
}
