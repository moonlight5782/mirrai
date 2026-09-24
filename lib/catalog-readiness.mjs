// Match widget availability: an active product needs a published base model
// with a URL, or at least one active published variant with a URL.
export function catalogReadiness(products, variants) {
  const variantReady = new Set(variants.filter(v => v.active && v.status === "published" && v.glbUrl).map(v => v.productId));
  const active = products.filter(p => p.active);
  return { total: products.length, active: active.length,
    published: active.filter(p => (p.status === "published" && p.glbUrl) || variantReady.has(p.id)).length };
}
