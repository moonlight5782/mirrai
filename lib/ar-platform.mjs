/** Hints only: model-viewer remains the authority for AR capability. */
export function arPlatform(userAgent = "", maxTouchPoints = 0) {
  const ios = /iPhone|iPad|iPod/i.test(userAgent) || (/Macintosh/i.test(userAgent) && maxTouchPoints > 1);
  const android = /Android/i.test(userAgent);
  const embedded = /Telegram|Instagram|FBAN|FBAV|FB_IAB|Twitter|Line\/|\bwv\b/i.test(userAgent);
  return { ios, android, mobile: ios || android, embedded, browser: ios ? "Safari" : "Chrome" };
}
