/**
 * Feature-detection helpers for cross-browser compatibility.
 *
 * Use these instead of user-agent sniffing wherever possible.
 * All functions are safe to call in both background (service worker)
 * and content (popup / dashboard) contexts.
 */

/** Returns true when the extension is running under Firefox (Gecko engine). */
export function isFirefox(): boolean {
  // `browser` is defined natively in Firefox; in Chrome it is either absent
  // or a thin alias added by the webextension-polyfill.
  // Firefox also exposes a unique runtime.getBrowserInfo API.
  return (
    typeof globalThis !== 'undefined' &&
    typeof (globalThis as any).browser !== 'undefined' &&
    typeof (globalThis as any).browser.runtime?.getBrowserInfo === 'function'
  );
}

/** Returns true when the extension is running on a Chromium-based engine. */
export function isChromium(): boolean {
  return !isFirefox();
}

/**
 * Best-effort browser name detection. Returns one of the known target browsers
 * or 'unknown'. Do not use this for security-critical decisions; prefer
 * feature detection via supportsAlarms() etc.
 */
export type KnownBrowser =
  | 'Chrome'
  | 'Brave'
  | 'Edge'
  | 'Vivaldi'
  | 'Firefox'
  | 'unknown';

export function getBrowserName(): KnownBrowser {
  if (isFirefox()) return 'Firefox';

  // navigator is available in popup/dashboard but not in service workers.
  if (typeof navigator === 'undefined') return 'unknown';

  const ua = navigator.userAgent;
  if (ua.includes('Edg/')) return 'Edge';

  // Brave exposes a dedicated API (brave.isBrave).
  if (typeof (globalThis as any).brave !== 'undefined') return 'Brave';

  // Vivaldi injects a "Vivaldi/" token into the UA.
  if (ua.includes('Vivaldi/')) return 'Vivaldi';

  if (ua.includes('Chrome/')) return 'Chrome';

  return 'unknown';
}

/**
 * Returns true when the alarms API is available.
 * All MV3 targets support alarms, but the check future-proofs against
 * minimal extension environments.
 */
export function supportsAlarms(): boolean {
  try {
    const api = (globalThis as any).browser ?? (globalThis as any).chrome;
    return typeof api?.alarms?.create === 'function';
  } catch {
    return false;
  }
}

/**
 * Returns true when the webRequest API is available.
 * Should always be true for all target browsers when the `webRequest`
 * permission is declared in the manifest.
 */
export function supportsWebRequest(): boolean {
  try {
    const api = (globalThis as any).browser ?? (globalThis as any).chrome;
    return typeof api?.webRequest?.onBeforeRequest?.addListener === 'function';
  } catch {
    return false;
  }
}

/**
 * Returns the manifest_version declared by this extension at runtime.
 * Useful for adapting behavior when supporting both MV2 and MV3.
 */
export function getManifestVersion(): number {
  try {
    const api = (globalThis as any).browser ?? (globalThis as any).chrome;
    return api?.runtime?.getManifest?.()?.manifest_version ?? 3;
  } catch {
    return 3;
  }
}
