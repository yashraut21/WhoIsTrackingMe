import { describe, expect, it } from 'vitest';
import { aggregateDomainSummaries, buildWebsiteProfiles } from '../analysis/domain-summary';
import type { CookieArtifact, NetworkObservation } from '../types';

describe('Domain Forensics Aggregation', () => {
  const mockCookies: CookieArtifact[] = [
    {
      id: 'c1',
      observedAt: 1000,
      name: 'sid',
      domain: 'nytimes.com',
      rawDomain: 'nytimes.com',
      registrableDomain: 'nytimes.com',
      path: '/',
      secure: true,
      httpOnly: true,
      sameSite: 'lax',
      session: false,
      maskedValue: 'val1••••••99',
      isThirdParty: false,
      forensicNotes: []
    },
    {
      id: 'c2',
      observedAt: 1050,
      name: 'IDE',
      domain: 'doubleclick.net',
      rawDomain: '.doubleclick.net',
      registrableDomain: 'doubleclick.net',
      path: '/',
      secure: true,
      httpOnly: true,
      sameSite: 'no_restriction',
      session: false,
      maskedValue: 'xyz1••••••22',
      isThirdParty: true,
      forensicNotes: []
    }
  ];

  const mockObservations: NetworkObservation[] = [
    {
      id: 'n1',
      timestamp: 1000,
      firstPartySite: 'nytimes.com',
      requestedDomain: 'google-analytics.com',
      requestedRegistrableDomain: 'google-analytics.com',
      resourceType: 'script',
      method: 'GET',
      thirdParty: true
    },
    {
      id: 'n2',
      timestamp: 1010,
      firstPartySite: 'nytimes.com',
      requestedDomain: 'doubleclick.net',
      requestedRegistrableDomain: 'doubleclick.net',
      resourceType: 'image',
      method: 'GET',
      thirdParty: true
    }
  ];

  it('aggregates cookies and network observations into domain summaries', () => {
    const summaries = aggregateDomainSummaries(mockCookies, mockObservations);

    expect(summaries.length).toBe(3); // nytimes.com, doubleclick.net, google-analytics.com

    const doubleclick = summaries.find((s) => s.domain === 'doubleclick.net');
    expect(doubleclick).toBeDefined();
    expect(doubleclick?.organization).toBe('Google');
    expect(doubleclick?.category).toBe('Advertising');
    expect(doubleclick?.party).toBe('Third-party');
    expect(doubleclick?.isKnownTracker).toBe(true);
    expect(doubleclick?.cookieCount).toBe(1);
    expect(doubleclick?.networkCount).toBe(1);
    expect(doubleclick?.totalArtifacts).toBe(2);

    const nytimes = summaries.find((s) => s.domain === 'nytimes.com');
    expect(nytimes?.party).toBe('First-party');
  });

  it('builds website profiles grouped by visited site', () => {
    const profiles = buildWebsiteProfiles(mockCookies, mockObservations);

    const nytProfile = profiles.find((p) => p.site === 'nytimes.com');
    expect(nytProfile).toBeDefined();
    expect(nytProfile?.cookies.length).toBeGreaterThanOrEqual(1);
    expect(nytProfile?.thirdPartyDomains.length).toBeGreaterThanOrEqual(1);
    expect(nytProfile?.knownTrackers.some((t) => t.domain === 'google-analytics.com')).toBe(true);
  });
});
