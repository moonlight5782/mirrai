/**
 * Pure geometry policy shared by the viewer and its tests.
 * Catalogue dimensions are centimetres; glTF/model-viewer dimensions are metres.
 * Camera framing changes the preview only, never the physical AR scale.
 */

/** @param {{width: number, height: number, depth: number}} dimensionsCm */
export function dimensionsInMetres(dimensionsCm) {
  return {
    x: dimensionsCm.width / 100,
    y: dimensionsCm.height / 100,
    z: dimensionsCm.depth / 100,
  };
}

/**
 * Allow 5 mm or 0.5% per axis for exporter/float rounding, whichever is larger.
 * Missing, zero, negative and non-finite bounds must never unlock AR.
 * @param {{x: number, y: number, z: number} | undefined} measured
 * @param {{x: number, y: number, z: number}} target
 */
export function dimensionsMatch(measured, target) {
  return Boolean(
    measured &&
      ["x", "y", "z"].every(
        axis =>
          Number.isFinite(measured[axis]) &&
          measured[axis] > 0 &&
          Number.isFinite(target[axis]) &&
          target[axis] > 0 &&
          Math.abs(measured[axis] - target[axis]) <= Math.max(0.005, target[axis] * 0.005),
      ),
  );
}

/**
 * Percentage camera distance, deliberately bounded for narrow mobile viewports.
 * Long tables/low sofas need more horizontal space than the default framing.
 * @param {{width: number, height: number, depth: number}} dimensionsCm
 * @param {number} viewportAspect
 */
export function previewCameraRadius(dimensionsCm, viewportAspect) {
  const safeAspect = Math.max(0.55, Math.min(1.8, viewportAspect || 1));
  const furnitureRatio =
    Math.max(dimensionsCm.width, dimensionsCm.depth) / Math.max(dimensionsCm.height, 1);
  const portraitFactor = safeAspect < 1 ? Math.min(1.55, 1 / safeAspect) : 1;
  const wideFurnitureFactor = Math.min(1.75, 1 + Math.max(0, furnitureRatio - 1.4) * 0.25);
  return Math.round(Math.max(120, Math.min(260, 120 * portraitFactor * wideFurnitureFactor)));
}
