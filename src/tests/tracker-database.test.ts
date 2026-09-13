import { describe, expect, it } from 'vitest';
import { findTracker, TRACKER_CATALOG } from '../tracker/database';

describe('Curated Tracker Knowledge Base', () => {
  it('contains entries covering major tracking categories', () => {
    const categories = new Set(TRACKER_CATALOG.map((t) => t.category));
    expect(categories.has('Advertising')).toBe(true);
    expect(categories.has('Analytics')).toBe(true);
    expect(categories.has('Session replay')).toBe(true);
    expect(categories.has('Fingerprinting')).toBe(true);
    expect(categories.has('Social tracking')).toBe(true);
  });

  it('matches exact tracker domains and subdomains', () => {
    const direct = findTracker('google-analytics.com');
    expect(direct?.organization).toBe('Google');

    const sub = findTracker('region1.google-analytics.com');
    expect(sub?.organization).toBe('Google');

    const meta = findTracker('connect.facebook.net');
    expect(meta?.organization).toBe('Meta');
  });

  it('prevents spoofed or prefix-matching false positives', () => {
    expect(findTracker('notgoogle-analytics.com')).toBeUndefined();
    expect(findTracker('evil-google-analytics.com')).toBeUndefined();
    expect(findTracker('fakefacebook.net')).toBeUndefined();
    expect(findTracker('example.com')).toBeUndefined();
  });
});
