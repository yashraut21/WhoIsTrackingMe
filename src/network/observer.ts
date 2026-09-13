import type { CookieArtifact, NetworkObservation } from '../types';
import { getRegistrableDomain, isThirdParty, normalizeHostname } from '../analysis/domain';
import { buildCookieArtifact } from '../analysis/cookie-forensics';
import type { BrowserHttpHeader } from '../browser';

export interface RequestDetails {
  requestId: string;
  url: string;
  method?: string;
  type: string;
  initiator?: string;
  tabId: number;
  timeStamp: number;
}

export interface HeaderDetails extends RequestDetails {
  responseHeaders?: BrowserHttpHeader[];
}

/**
 * Normalizes a web request event into a forensic NetworkObservation.
 * Strictly adheres to privacy principles: does not capture query strings, payloads, or auth headers.
 */
export function processNetworkRequest(
  details: RequestDetails,
  activeTabOrigin?: string
): NetworkObservation | null {
  if (details.tabId < 0) return null;

  // Determine top-level first party site
  let firstPartySite: string | null = null;
  if (details.initiator) {
    firstPartySite = getRegistrableDomain(details.initiator);
  } else if (activeTabOrigin) {
    firstPartySite = getRegistrableDomain(activeTabOrigin);
  }

  if (!firstPartySite) return null;

  try {
    const targetUrl = new URL(details.url);
    const requestedDomain = targetUrl.hostname;
    const requestedRegistrableDomain = getRegistrableDomain(requestedDomain);
    const thirdParty = isThirdParty(firstPartySite, requestedDomain);
    // Deterministic ID: deduplicates same-origin requests within the same second.
    // Using second-level granularity collapses retries and HTTP redirects.
    const secondBucket = Math.floor((details.timeStamp || Date.now()) / 1000);
    const id = `obs:${firstPartySite}:${requestedRegistrableDomain ?? requestedDomain}:${details.type}:${secondBucket}`;

    return {
      id,
      timestamp: Math.round(details.timeStamp || Date.now()),
      firstPartySite,
      requestedDomain,
      requestedRegistrableDomain,
      resourceType: details.type,
      method: details.method || 'GET',
      thirdParty
    };
  } catch {
    return null;
  }
}

/**
 * Parses Set-Cookie response headers from network traffic to correlate
 * cookies with the requesting origin in real-time.
 * Only extracts metadata flags (Domain, Path, Secure, HttpOnly, SameSite, Expiry).
 */
export function extractCookiesFromHeaders(
  details: HeaderDetails,
  firstPartySite?: string
): CookieArtifact[] {
  if (!details.responseHeaders || details.responseHeaders.length === 0) return [];

  const artifacts: CookieArtifact[] = [];
  const requestHost = normalizeHostname(details.url);
  if (!requestHost) return [];

  const siteContext = firstPartySite || getRegistrableDomain(requestHost) || requestHost;

  for (const header of details.responseHeaders) {
    if (header.name.toLowerCase() === 'set-cookie' && header.value) {
      try {
        const parts = header.value.split(';').map((p) => p.trim());
        if (parts.length === 0) continue;

        const [nameValue, ...attrParts] = parts;
        const eqIdx = nameValue.indexOf('=');
        if (eqIdx === -1) continue;

        const name = nameValue.slice(0, eqIdx).trim();
        const value = nameValue.slice(eqIdx + 1).trim();

        let domain = requestHost;
        let path = '/';
        let secure = false;
        let httpOnly = false;
        let sameSite = 'unspecified';
        let expirationDate: number | undefined;

        for (const attr of attrParts) {
          const lower = attr.toLowerCase();
          if (lower === 'secure') {
            secure = true;
          } else if (lower === 'httponly') {
            httpOnly = true;
          } else if (lower.startsWith('samesite=')) {
            const ssVal = lower.split('=')[1];
            if (ssVal === 'none' || ssVal === 'no_restriction') sameSite = 'no_restriction';
            else if (ssVal === 'strict') sameSite = 'strict';
            else if (ssVal === 'lax') sameSite = 'lax';
          } else if (lower.startsWith('domain=')) {
            const rawDomain = attr.slice(7).trim();
            const normalized = normalizeHostname(rawDomain);
            if (normalized) domain = normalized;
          } else if (lower.startsWith('path=')) {
            path = attr.slice(5).trim();
          } else if (lower.startsWith('max-age=')) {
            const maxAgeSec = parseInt(lower.split('=')[1], 10);
            if (!isNaN(maxAgeSec)) {
              expirationDate = Math.floor(Date.now() / 1000) + maxAgeSec;
            }
          } else if (lower.startsWith('expires=')) {
            const expiresStr = attr.slice(8).trim();
            const parsedMs = Date.parse(expiresStr);
            if (!isNaN(parsedMs)) {
              expirationDate = Math.floor(parsedMs / 1000);
            }
          }
        }

        const artifact = buildCookieArtifact(
          {
            name,
            value,
            domain,
            path,
            secure,
            httpOnly,
            sameSite,
            session: !expirationDate,
            expirationDate
          },
          siteContext
        );

        artifacts.push(artifact);
      } catch {
        // Skip malformed header value
      }
    }
  }

  return artifacts;
}
