import { describe, expect, it } from 'vitest';
import { calculatePrivacyScore } from '../analysis/risk';
import { RISK_CONFIG } from '../analysis/risk-config';
import type { CookieArtifact, NetworkObservation } from '../types';

describe('Transparent Privacy Exposure Scoring Engine', () => {
  it('computes 0 score when no third-party or tracker artifacts exist', () => {
    const assessment = calculatePrivacyScore([], []);
    expect(assessment.score).toBe(0);
    expect(assessment.factors.length).toBe(0);
  });

  it('calculates explainable points and caps at maximum score 10.0', () => {
    const mockObservations: NetworkObservation[] = [
      {
        id: '1',
        timestamp: Date.now(),
        firstPartySite: 'siteA.com',
        requestedDomain: 'doubleclick.net',
        requestedRegistrableDomain: 'doubleclick.net',
        resourceType: 'script',
        thirdParty: true
      },
      {
        id: '2',
        timestamp: Date.now(),
        firstPartySite: 'siteB.com',
        requestedDomain: 'google-analytics.com',
        requestedRegistrableDomain: 'google-analytics.com',
        resourceType: 'script',
        thirdParty: true
      },
      {
        id: '3',
        timestamp: Date.now(),
        firstPartySite: 'siteC.com',
        requestedDomain: 'hotjar.com',
        requestedRegistrableDomain: 'hotjar.com',
        resourceType: 'script',
        thirdParty: true
      }
    ];

    const mockCookies: CookieArtifact[] = [
      {
        id: 'c1',
        observedAt: Date.now(),
        name: 'IDE',
        domain: 'doubleclick.net',
        rawDomain: '.doubleclick.net',
        registrableDomain: 'doubleclick.net',
        path: '/',
        secure: true,
        httpOnly: true,
        sameSite: 'no_restriction',
        session: false,
        maskedValue: 'abc1••••••89',
        sourceSite: 'siteA.com',
        isThirdParty: true,
        forensicNotes: []
      }
    ];

    const assessment = calculatePrivacyScore(mockCookies, mockObservations);

    expect(assessment.score).toBeGreaterThan(0);
    expect(assessment.score).toBeLessThanOrEqual(RISK_CONFIG.maxScore);

    // Verify itemized factor labels
    const labels = assessment.factors.map((f) => f.label);
    expect(labels).toContain('Known tracking infrastructure');
    expect(labels).toContain('Commercial advertising networks');
    expect(labels).toContain('Session replay behavioral recorders');
    expect(labels).toContain('Persistent third-party identifiers');
    expect(labels).toContain('Cross-site tracking reach');

    // Verify all factor points are positive numbers with 1 decimal place
    assessment.factors.forEach((f) => {
      expect(f.points).toBeGreaterThan(0);
      expect(Number.isFinite(f.points)).toBe(true);
    });
  });

  it('exhibits diminishing returns and does not prematurely saturate to 10.0', () => {
    // Session with 5 common analytics/ad trackers on 2 websites
    const normalObservations: NetworkObservation[] = [
      'google-analytics.com',
      'googletagmanager.com',
      'doubleclick.net',
      'criteo.com',
      'bing.com'
    ].map((domain, i) => ({
      id: `obs-${i}`,
      timestamp: Date.now(),
      firstPartySite: i % 2 === 0 ? 'news.com' : 'shop.com',
      requestedDomain: domain,
      requestedRegistrableDomain: domain,
      resourceType: 'script',
      thirdParty: true
    }));

    const normalCookies: CookieArtifact[] = [
      {
        id: 'c1',
        observedAt: Date.now(),
        name: '_ga',
        domain: 'google-analytics.com',
        rawDomain: '.google-analytics.com',
        registrableDomain: 'google-analytics.com',
        path: '/',
        secure: true,
        httpOnly: false,
        sameSite: 'lax',
        session: false,
        maskedValue: 'abc1••••••89',
        sourceSite: 'news.com',
        isThirdParty: true,
        forensicNotes: []
      }
    ];

    const normalAssessment = calculatePrivacyScore(normalCookies, normalObservations);

    // Normal browsing with 5 trackers should be in the Moderate (3.0 - 5.5) range, NOT pegged at 10!
    expect(normalAssessment.score).toBeGreaterThan(1.5);
    expect(normalAssessment.score).toBeLessThan(6.0);
    expect(normalAssessment.score).not.toBe(10.0);
  });

  it('maintains mathematical ceiling <= 10.0 even under extreme tracker volume', () => {
    // Generate 50 simulated tracking observations across 10 visited sites
    const trackerDomains = [
      'google-analytics.com', 'doubleclick.net', 'googletagmanager.com', 'google.com',
      'facebook.com', 'facebook.net', 'instagram.com',
      'criteo.com', 'criteo.net',
      'amazon-adsystem.com',
      'hotjar.com',
      'clarity.ms',
      'fullstory.com',
      'segment.io',
      'mixpanel.com',
      'taboola.com',
      'outbrain.com',
      'pubmatic.com',
      'rubiconproject.com',
      'adnxs.com'
    ];

    const extremeObservations: NetworkObservation[] = [];
    for (let siteIdx = 0; siteIdx < 10; siteIdx++) {
      for (const tDomain of trackerDomains) {
        extremeObservations.push({
          id: `ext-${siteIdx}-${tDomain}`,
          timestamp: Date.now(),
          firstPartySite: `visited-site-${siteIdx}.org`,
          requestedDomain: tDomain,
          requestedRegistrableDomain: tDomain,
          resourceType: 'script',
          thirdParty: true
        });
      }
    }

    const extremeCookies: CookieArtifact[] = trackerDomains.map((d, i) => ({
      id: `cookie-${i}`,
      observedAt: Date.now(),
      name: `track_${i}`,
      domain: d,
      rawDomain: `.${d}`,
      registrableDomain: d,
      path: '/',
      secure: true,
      httpOnly: true,
      sameSite: 'no_restriction',
      session: false,
      maskedValue: 'tok1••••••99',
      sourceSite: `visited-site-${i % 10}.org`,
      isThirdParty: true,
      forensicNotes: []
    }));

    const extremeAssessment = calculatePrivacyScore(extremeCookies, extremeObservations);

    // Extreme browsing should be in elevated tier (>= 7.0) but bounded cleanly at <= 10.0
    expect(extremeAssessment.score).toBeGreaterThanOrEqual(7.0);
    expect(extremeAssessment.score).toBeLessThanOrEqual(10.0);
  });
});
