import { describe, expect, it } from 'vitest';
import { buildTimeline, filterTimeline } from '../analysis/timeline';
import type { CookieArtifact, NetworkObservation } from '../types';

describe('Forensic Chronological Timeline Engine', () => {
  const mockObservations: NetworkObservation[] = [
    {
      id: 'o1',
      timestamp: 1000,
      firstPartySite: 'news.com',
      requestedDomain: 'doubleclick.net',
      requestedRegistrableDomain: 'doubleclick.net',
      resourceType: 'script',
      thirdParty: true
    },
    {
      id: 'o2',
      timestamp: 2000,
      firstPartySite: 'news.com',
      requestedDomain: 'cdn.news.com',
      requestedRegistrableDomain: 'news.com',
      resourceType: 'stylesheet',
      thirdParty: false
    }
  ];

  const mockCookies: CookieArtifact[] = [
    {
      id: 'c1',
      observedAt: 1500,
      name: '_ga',
      domain: 'google-analytics.com',
      rawDomain: '.google-analytics.com',
      registrableDomain: 'google-analytics.com',
      path: '/',
      secure: true,
      httpOnly: false,
      sameSite: 'lax',
      session: false,
      maskedValue: 'GA1.••••••22',
      sourceSite: 'news.com',
      isThirdParty: true,
      forensicNotes: []
    }
  ];

  it('merges cookies and network requests in descending chronological order', () => {
    const timeline = buildTimeline(mockCookies, mockObservations);

    expect(timeline.length).toBe(3);
    // Newest first: timestamp 2000 (o2), then 1500 (c1), then 1000 (o1)
    expect(timeline[0].timestamp).toBe(2000);
    expect(timeline[1].timestamp).toBe(1500);
    expect(timeline[2].timestamp).toBe(1000);
  });

  it('marks advertising infrastructure as heightened review priority', () => {
    const timeline = buildTimeline(mockCookies, mockObservations);
    const doubleclickEvent = timeline.find((e) => e.targetDomain === 'doubleclick.net');

    expect(doubleclickEvent).toBeDefined();
    expect(doubleclickEvent?.priorityLevel).toBe('heightened');
  });

  it('filters timeline by criteria', () => {
    const timeline = buildTimeline(mockCookies, mockObservations);

    // Filter by priority only
    const priorityOnly = filterTimeline(timeline, { priorityOnly: true });
    expect(priorityOnly.every((e) => e.priorityLevel === 'heightened')).toBe(true);

    // Filter by eventType
    const cookiesOnly = filterTimeline(timeline, { eventType: 'cookie_observed' });
    expect(cookiesOnly.length).toBe(1);
    expect(cookiesOnly[0].eventType).toBe('cookie_observed');

    // Filter by search query
    const searchMatch = filterTimeline(timeline, { searchQuery: 'doubleclick' });
    expect(searchMatch.length).toBe(1);
    expect(searchMatch[0].targetDomain).toBe('doubleclick.net');
  });
});
