export function validCounts(supplied, generated) {
  return Number.isSafeInteger(supplied) && Number.isSafeInteger(generated)
    && supplied >= 0 && generated >= 0 && supplied + generated > 0 && supplied + generated <= 10000;
}

export function validPricing(value) {
  if (!value || typeof value !== "object") return false;
  return [value.monthlyMinor, value.suppliedModelMinor, value.generatedModelMinor].every(n => Number.isSafeInteger(n) && n >= 0 && n <= 100000000)
    && value.generatedModelMinor > value.suppliedModelMinor;
}

export function commerceQuote(pricing, supplied, generated) {
  if (!validCounts(supplied, generated)) throw new Error("invalid_counts");
  if (!validPricing(pricing)) return { configured: false, currency: "MDL", suppliedCount: supplied, generatedCount: generated };
  const preparationMinor = supplied * pricing.suppliedModelMinor + generated * pricing.generatedModelMinor;
  return { configured: true, currency: "MDL", revision: pricing.revision,
    monthlyMinor: pricing.monthlyMinor, suppliedModelMinor: pricing.suppliedModelMinor,
    generatedModelMinor: pricing.generatedModelMinor, suppliedCount: supplied, generatedCount: generated,
    preparationMinor, firstPeriodMinor: preparationMinor + pricing.monthlyMinor };
}
