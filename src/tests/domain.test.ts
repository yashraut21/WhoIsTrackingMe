import { describe, expect, it } from 'vitest';
import {
  getPublicSuffix,
  getRegistrableDomain,
  isSameRegistrableDomain,
  isThirdParty,
  normalizeHostname
} from '../analysis/domain';

describe('PSL-Aware Domain Analysis', () => {
  describe('normalizeHostname', () => {
    it('strips protocols, paths, query strings, and hashes', () => {
      expect(normalizeHostname('https://www.example.com/path?query=1#hash')).toBe('www.example.com');
      expect(normalizeHostname('http://sub.domain.org/test')).toBe('sub.domain.org');
    });

    it('strips leading and trailing dots commonly found in RFC 6265 cookie domains', () => {
      expect(normalizeHostname('.example.com')).toBe('example.com');
      expect(normalizeHostname('..example.com..')).toBe('example.com');
    });

    it('handles hostnames with ports', () => {
      expect(normalizeHostname('localhost:8080')).toBe('localhost');
      expect(normalizeHostname('example.com:443')).toBe('example.com');
    });

    it('normalizes to lowercase', () => {
      expect(normalizeHostname('EXAMPLE.COM')).toBe('example.com');
      expect(normalizeHostname('Sub.Example.Co.Uk')).toBe('sub.example.co.uk');
    });

    it('gracefully handles invalid inputs', () => {
      expect(normalizeHostname('')).toBeNull();
      expect(normalizeHostname('   ')).toBeNull();
    });
  });

  describe('getRegistrableDomain & getPublicSuffix', () => {
    it('resolves multi-level country code TLDs (ccTLDs)', () => {
      expect(getRegistrableDomain('sub.example.co.uk')).toBe('example.co.uk');
      expect(getPublicSuffix('sub.example.co.uk')).toBe('co.uk');

      expect(getRegistrableDomain('store.example.com.au')).toBe('example.com.au');
      expect(getPublicSuffix('store.example.com.au')).toBe('com.au');
    });

    it('distinguishes similar-looking spoofing domains (evil-example vs example)', () => {
      expect(getRegistrableDomain('evil-example.com')).toBe('evil-example.com');
      expect(getRegistrableDomain('notexample.com')).toBe('notexample.com');
      expect(getRegistrableDomain('example.com')).toBe('example.com');
    });

    it('handles standard gTLDs', () => {
      expect(getRegistrableDomain('www.example.com')).toBe('example.com');
      expect(getRegistrableDomain('analytics.cloud.google.com')).toBe('google.com');
    });

    it('handles localhost and IP addresses safely', () => {
      expect(getRegistrableDomain('localhost')).toBe('localhost');
      expect(getRegistrableDomain('127.0.0.1')).toBe('127.0.0.1');
    });
  });

  describe('First-Party vs Third-Party Boundary Detection', () => {
    it('treats subdomains of the same registrable domain as first-party', () => {
      expect(isSameRegistrableDomain('https://www.example.co.uk', 'https://api.example.co.uk')).toBe(true);
      expect(isThirdParty('https://www.example.co.uk', 'https://api.example.co.uk')).toBe(false);
    });

    it('identifies distinct third-party domains correctly', () => {
      expect(isThirdParty('https://news.com', 'https://google-analytics.com')).toBe(true);
      expect(isThirdParty('https://example.com', 'https://evil-example.com')).toBe(true);
      expect(isThirdParty('https://example.com', 'https://notexample.com')).toBe(true);
    });
  });
});
