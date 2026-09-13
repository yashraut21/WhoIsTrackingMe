import { describe, expect, it } from 'vitest';
import { getRegistrableDomain, isSameRegistrableDomain, normalizeHostname } from '../analysis/domain';
import { findTracker } from '../tracker/database';
import { buildCookieArtifact } from '../analysis/cookie-forensics';
import { maskValue } from '../utils/masking';

describe('Security Hardening & Edge Case Robustness', () => {
  describe('Domain Spoofing & Edge Cases', () => {
    it('handles tricky domain edge cases and spoof attempts', () => {
      // Confusable prefixes and suffixes
      expect(isSameRegistrableDomain('example.com', 'evil-example.com')).toBe(false);
      expect(isSameRegistrableDomain('example.com', 'notexample.com')).toBe(false);
      expect(isSameRegistrableDomain('google.com', 'google.com.evil.com')).toBe(false);
      expect(isSameRegistrableDomain('sub.example.co.uk', 'evil.co.uk')).toBe(false);

      // Suffix lookups for tracker catalog
      expect(findTracker('notgoogle-analytics.com')).toBeUndefined();
      expect(findTracker('google-analytics.com.evil.com')).toBeUndefined();
      expect(findTracker('facebook.net.attacker.org')).toBeUndefined();
    });

    it('safely handles prototype pollution vectors', () => {
      expect(normalizeHostname('__proto__')).toBe('__proto__');
      expect(normalizeHostname('constructor')).toBe('constructor');
      expect(findTracker('__proto__')).toBeUndefined();
      expect(findTracker('constructor')).toBeUndefined();

      const artifact = buildCookieArtifact({
        name: '__proto__',
        value: 'exploit_payload',
        domain: 'example.com',
        path: '/',
        secure: true,
        httpOnly: true
      });

      expect(artifact.name).toBe('__proto__');
      expect(artifact.maskedValue).toBe('expl••••••ad');
      expect(Object.prototype.hasOwnProperty.call(artifact, 'name')).toBe(true);
    });

    it('handles malformed inputs without crashing', () => {
      expect(normalizeHostname(':::bad_url:::')).toBeNull();
      expect(normalizeHostname('javascript:alert(1)')).toBeNull();
      expect(getRegistrableDomain('')).toBeNull();
      expect(maskValue('')).toBe('');
      expect(maskValue(undefined)).toBe('');
      expect(maskValue(null)).toBe('');
    });
  });

  describe('Cookie Attributes and Expired Identifiers', () => {
    it('correctly handles expired timestamps', () => {
      const pastTimeSec = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      const artifact = buildCookieArtifact({
        name: 'expired_cookie',
        value: 'old_value',
        domain: 'example.com',
        path: '/',
        secure: true,
        httpOnly: true,
        session: false,
        expirationDate: pastTimeSec
      });

      expect(artifact.session).toBe(false);
      expect(artifact.expiresAt).toBeDefined();
    });

    it('identifies unclassified third-party domains without false tracker labels', () => {
      const tracker = findTracker('custom-third-party-service.org');
      expect(tracker).toBeUndefined();

      const artifact = buildCookieArtifact({
        name: 'custom_cookie',
        value: 'val12345',
        domain: 'custom-third-party-service.org',
        path: '/',
        secure: true,
        httpOnly: true
      }, 'mainwebsite.com');

      expect(artifact.isThirdParty).toBe(true);
      // Ensure we don't accuse unclassified third parties of malicious tracking
      expect(artifact.forensicNotes.some((n) => n.includes('Known'))).toBe(false);
    });
  });
});
