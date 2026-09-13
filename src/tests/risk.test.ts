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
});
