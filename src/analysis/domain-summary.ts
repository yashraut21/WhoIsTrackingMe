import type { CookieArtifact, DomainSummary, NetworkObservation, WebsiteProfile } from '../types';
import { findTracker } from '../tracker/database';
import { getRegistrableDomain } from './domain';

/**
 * Aggregates raw cookie records and network observations into consolidated domain summaries.
 * Correctly distinguishes First-Party from Third-Party and Known Trackers from Unknown Third-Parties.
 */
export function aggregateDomainSummaries(
  cookies: CookieArtifact[],
  observations: NetworkObservation[] = []
): DomainSummary[] {
  const domainMap = new Map<
    string,
    {
      cookies: CookieArtifact[];
      observations: NetworkObservation[];
      isFirstParty: boolean;
      isThirdParty: boolean;
    }
  >();

  // 1. Process cookies
  for (const cookie of cookies) {
    const key = cookie.registrableDomain ?? cookie.domain;
    if (!domainMap.has(key)) {
      domainMap.set(key, { cookies: [], observations: [], isFirstParty: false, isThirdParty: false });
    }
    const entry = domainMap.get(key)!;
    entry.cookies.push(cookie);
    if (cookie.isThirdParty) {
      entry.isThirdParty = true;
    } else {
      entry.isFirstParty = true;
    }
  }

  // 2. Process network observations
  for (const obs of observations) {
    const key = obs.requestedRegistrableDomain ?? obs.requestedDomain;
    if (!domainMap.has(key)) {
      domainMap.set(key, { cookies: [], observations: [], isFirstParty: false, isThirdParty: false });
    }
    const entry = domainMap.get(key)!;
    entry.observations.push(obs);
    if (obs.thirdParty) {
      entry.isThirdParty = true;
    } else {
      entry.isFirstParty = true;
    }
  }

  // 3. Transform to DomainSummary array
  const summaries: DomainSummary[] = [];

  for (const [domain, data] of domainMap.entries()) {
    const tracker = findTracker(domain);

    let party: 'First-party' | 'Third-party' | 'Mixed';
    if (data.isFirstParty && data.isThirdParty) {
      party = 'Mixed';
    } else if (data.isThirdParty) {
      party = 'Third-party';
    } else {
      party = 'First-party';
    }

    const cookieCount = data.cookies.length;
    const networkCount = data.observations.length;
    const totalArtifacts = cookieCount + networkCount;
    const hasPersistentCookies = data.cookies.some((c) => !c.session);

    summaries.push({
      domain,
      organization: tracker?.organization ?? (party === 'First-party' ? 'First-Party Site' : 'Unclassified'),
      category: tracker?.category ?? 'Unknown',
      party,
      cookieCount,
      networkCount,
      totalArtifacts,
      confidence: tracker?.confidence ?? (data.isThirdParty ? 'Medium' : 'Low'),
      hasPersistentCookies,
      isKnownTracker: Boolean(tracker)
    });
  }

  // Sort by total artifacts descending
  return summaries.sort((a, b) => b.totalArtifacts - a.totalArtifacts);
}

/**
 * Builds website profiles grouping all observed data by top-level visited site.
 */
export function buildWebsiteProfiles(
  cookies: CookieArtifact[],
  observations: NetworkObservation[]
): WebsiteProfile[] {
  const profileMap = new Map<string, { cookies: CookieArtifact[]; observations: NetworkObservation[] }>();

  // Group network requests by firstPartySite
  for (const obs of observations) {
    const site = obs.firstPartySite;
    if (!site) continue;
    if (!profileMap.has(site)) {
      profileMap.set(site, { cookies: [], observations: [] });
    }
    profileMap.get(site)!.observations.push(obs);
  }

  // Group cookies by sourceSite or registrableDomain
  for (const cookie of cookies) {
    const site = cookie.sourceSite ?? cookie.registrableDomain ?? cookie.domain;
    if (!profileMap.has(site)) {
      profileMap.set(site, { cookies: [], observations: [] });
    }
    profileMap.get(site)!.cookies.push(cookie);
  }

  const profiles: WebsiteProfile[] = [];

  for (const [site, data] of profileMap.entries()) {
    const thirdPartyDomainMap = new Map<string, { domain: string; organization?: string; category: any; confidence: any; observedAt: number }>();
    const knownTrackerMap = new Map<string, { domain: string; organization?: string; category: any; confidence: any; observedAt: number }>();

    for (const obs of data.observations) {
      if (obs.thirdParty) {
        const tracker = findTracker(obs.requestedDomain);
        const entry = {
          domain: obs.requestedDomain,
          organization: tracker?.organization,
          category: tracker?.category ?? 'Unknown',
          confidence: tracker?.confidence ?? 'Low',
          observedAt: obs.timestamp
        };
        thirdPartyDomainMap.set(obs.requestedDomain, entry);
        if (tracker) {
          knownTrackerMap.set(obs.requestedDomain, entry);
        }
      }
    }

    // Also include third-party cookies in third-party domains
    for (const cookie of data.cookies) {
      const reg = getRegistrableDomain(site);
      if (cookie.registrableDomain !== reg) {
        const tracker = findTracker(cookie.domain);
        const entry = {
          domain: cookie.domain,
          organization: tracker?.organization,
          category: tracker?.category ?? 'Unknown',
          confidence: tracker?.confidence ?? 'Low',
          observedAt: cookie.observedAt
        };
        thirdPartyDomainMap.set(cookie.domain, entry);
        if (tracker) {
          knownTrackerMap.set(cookie.domain, entry);
        }
      }
    }

    profiles.push({
      site,
      cookies: data.cookies,
      thirdPartyDomains: Array.from(thirdPartyDomainMap.values()),
      knownTrackers: Array.from(knownTrackerMap.values()),
      updatedAt: Date.now()
    });
  }

  return profiles.sort((a, b) => (b.cookies.length + b.thirdPartyDomains.length) - (a.cookies.length + a.thirdPartyDomains.length));
}
