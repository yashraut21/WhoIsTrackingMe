import { parse } from 'tldts';

/**
 * Normalizes an arbitrary input (URL, host with port, cookie domain with leading dots)
 * into a clean lowercase hostname without port or leading/trailing dots.
 */
export function normalizeHostname(input: string): string | null {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('blob:') ||
    lower.startsWith('about:') ||
    lower.startsWith('mailto:') ||
    lower.startsWith('file:')
  ) {
    return null;
  }

  try {
    // If it has protocol, parse via URL directly
    if (trimmed.includes('://')) {
      const url = new URL(trimmed);
      return url.hostname.toLowerCase().replace(/^\.+|\.+$/g, '') || null;
    }

    // Strip out potential path, query, or hash if present without protocol
    const cleanHost = trimmed.split('/')[0].split('?')[0].split('#')[0];

    // Strip leading dot (.example.com is standard RFC 6265 cookie format)
    const withoutLeadingDot = cleanHost.replace(/^\.+|\.+$/g, '');

    // Check if host contains port
    if (withoutLeadingDot.includes(':')) {
      const parts = withoutLeadingDot.split(':');
      // For IPv6 bracketed hosts
      if (withoutLeadingDot.startsWith('[')) {
        const closingBracket = withoutLeadingDot.indexOf(']');
        if (closingBracket !== -1) {
          return withoutLeadingDot.slice(1, closingBracket).toLowerCase();
        }
      }
      return parts[0].toLowerCase() || null;
    }

    return withoutLeadingDot.toLowerCase() || null;
  } catch {
    return null;
  }
}

/**
 * Extracts the registrable domain (eTLD+1) using the Public Suffix List (via tldts).
 * For example:
 * - 'www.example.com' -> 'example.com'
 * - 'sub.example.co.uk' -> 'example.co.uk'
 * - 'example.com.au' -> 'example.com.au'
 * - 'localhost' -> 'localhost'
 */
export function getRegistrableDomain(input: string): string | null {
  const host = normalizeHostname(input);
  if (!host) return null;

  const parsed = parse(host, { allowPrivateDomains: true });
  return parsed.domain ?? host;
}

/**
 * Returns the effective public suffix (eTLD) of a hostname, e.g. 'co.uk' or 'com'.
 */
export function getPublicSuffix(input: string): string | null {
  const host = normalizeHostname(input);
  if (!host) return null;

  const parsed = parse(host, { allowPrivateDomains: true });
  return parsed.publicSuffix ?? null;
}

/**
 * Checks if two hostnames share the exact same registrable domain (eTLD+1).
 * Returns true if both belong to the same first-party boundary.
 */
export function isSameRegistrableDomain(a: string, b: string): boolean {
  const domA = getRegistrableDomain(a);
  const domB = getRegistrableDomain(b);
  if (!domA || !domB) return false;
  return domA.toLowerCase() === domB.toLowerCase();
}

/**
 * Evaluates whether candidate is considered third-party relative to the first-party site.
 */
export function isThirdParty(firstPartySite: string, candidateSite: string): boolean {
  return !isSameRegistrableDomain(firstPartySite, candidateSite);
}
