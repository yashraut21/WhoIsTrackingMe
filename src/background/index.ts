import { browserAPI } from '../browser';
import { dbStore } from '../database/store';
import { buildCookieArtifact } from '../analysis/cookie-forensics';
import { getRegistrableDomain, normalizeHostname } from '../analysis/domain';
import { extractCookiesFromHeaders, processNetworkRequest } from '../network/observer';
import type { CookieArtifact } from '../types';

// In-memory tab origin tracker for first-party attribution correlation
const activeTabOrigins = new Map<number, string>();

function updateTabOrigin(tabId: number, url?: string) {
  if (!url || !url.startsWith('http')) return;
  const host = normalizeHostname(url);
  if (host) {
    activeTabOrigins.set(tabId, host);
  }
}

// Track active tab URL updates
browserAPI.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url || tab.url) {
    updateTabOrigin(tabId, changeInfo.url || tab.url);
  }
});

browserAPI.tabs.onRemoved.addListener((tabId) => {
  activeTabOrigins.delete(tabId);
});

// Full Cookie Inventory
export async function inventoryCookies(): Promise<number> {
  try {
    const rawCookies = await browserAPI.cookies.getAll({});
    const artifacts: CookieArtifact[] = [];

    for (const raw of rawCookies) {
      const cookieHost = normalizeHostname(raw.domain) ?? raw.domain;
      let associatedSite: string | undefined;

      for (const origin of activeTabOrigins.values()) {
        const originReg = getRegistrableDomain(origin);
        const cookieReg = getRegistrableDomain(cookieHost);
        if (originReg && cookieReg && originReg === cookieReg) {
          associatedSite = origin;
          break;
        }
      }

      const artifact = buildCookieArtifact(
        {
          name: raw.name,
          value: raw.value,
          domain: raw.domain,
          path: raw.path,
          secure: raw.secure,
          httpOnly: raw.httpOnly,
          sameSite: raw.sameSite,
          session: raw.session,
          expirationDate: raw.expirationDate,
          partitionKey: raw.partitionKey
        },
        associatedSite
      );

      artifacts.push(artifact);
    }

    await dbStore.putCookies(artifacts);
    return artifacts.length;
  } catch (err) {
    console.error('[WhoIsTrackingMe] Failed to inventory cookies:', err);
    return 0;
  }
}

// Incremental cookie updates via the cookies API
browserAPI.cookies.onChanged.addListener((changeInfo) => {
  if (changeInfo.removed) return;
  const raw = changeInfo.cookie;

  const artifact = buildCookieArtifact({
    name: raw.name,
    value: raw.value,
    domain: raw.domain,
    path: raw.path,
    secure: raw.secure,
    httpOnly: raw.httpOnly,
    sameSite: raw.sameSite,
    session: raw.session,
    expirationDate: raw.expirationDate,
    partitionKey: raw.partitionKey
  });

  void dbStore.putCookie(artifact);
});

// Passive Network Metadata Observation: Request initiation
browserAPI.webRequest.onBeforeRequest.addListener(
  (details) => {
    const activeOrigin = activeTabOrigins.get(details.tabId);
    const observation = processNetworkRequest(
      {
        requestId: details.requestId,
        url: details.url,
        method: details.method,
        type: details.type,
        initiator: details.initiator,
        tabId: details.tabId,
        timeStamp: details.timeStamp
      },
      activeOrigin
    );

    if (observation) {
      void dbStore.putObservation(observation);
    }
  },
  { urls: ['<all_urls>'] }
);

// Passive Network Metadata Observation: Response headers (metadata only, e.g. Set-Cookie)
browserAPI.webRequest.onHeadersReceived.addListener(
  (details) => {
    if (details.tabId < 0) return;
    const activeOrigin = activeTabOrigins.get(details.tabId);
    const firstPartySite = details.initiator
      ? getRegistrableDomain(details.initiator) ?? undefined
      : activeOrigin
      ? getRegistrableDomain(activeOrigin) ?? undefined
      : undefined;

    const cookieArtifacts = extractCookiesFromHeaders(
      {
        requestId: details.requestId,
        url: details.url,
        method: details.method,
        type: details.type,
        initiator: details.initiator,
        tabId: details.tabId,
        timeStamp: details.timeStamp,
        responseHeaders: details.responseHeaders
      },
      firstPartySite
    );

    if (cookieArtifacts.length > 0) {
      void dbStore.putCookies(cookieArtifacts);
    }
  },
  { urls: ['<all_urls>'] },
  ['responseHeaders']
);

// Initial install and setup
browserAPI.runtime.onInstalled.addListener(() => {
  void inventoryCookies();
  // Set up periodic alarm for inventory refresh every 60 minutes
  browserAPI.alarms.create('periodic_cookie_inventory', { periodInMinutes: 60 });
});

browserAPI.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'periodic_cookie_inventory') {
    void inventoryCookies();
    // Prune stale records to cap storage growth
    void dbStore.pruneObservations();
    void dbStore.pruneExpiredCookies();
  }
});

// Message communication router
browserAPI.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const msg = message as { type?: string } | null;

  if (msg?.type === 'REFRESH_COOKIES') {
    inventoryCookies().then((count) => sendResponse({ ok: true, count }));
    return true; // async reply
  }

  if (msg?.type === 'CLEAR_DATA') {
    dbStore.clearAll().then(() => sendResponse({ ok: true }));
    return true;
  }
});
