import { describe, expect, it } from 'vitest';
import { buildCookieArtifact, explainCookieArtifact } from '../analysis/cookie-forensics';

describe('Cookie Forensics & Attribution Analysis', () => {
  it('correctly classifies a session cookie with no expiration', () => {
    const artifact = buildCookieArtifact({
      name: 'session_token',
      value: 'secret12345678',
      domain: 'auth.example.com',
      path: '/',
      secure: true,
      httpOnly: true,
      sameSite: 'strict',
      session: true
    }, 'example.com');

    expect(artifact.session).toBe(true);
    expect(artifact.isThirdParty).toBe(false);
    expect(artifact.maskedValue).toBe('secr••••••78');
    expect(artifact.forensicNotes.some((n) => n.includes('Transient session cookie'))).toBe(true);
  });

  it('detects missing security flags (Insecure, No HttpOnly)', () => {
    const artifact = buildCookieArtifact({
      name: 'legacy_cookie',
      value: 'data123',
      domain: 'example.com',
      path: '/',
      secure: false,
      httpOnly: false,
      sameSite: 'lax',
      session: true
    });

    expect(artifact.forensicNotes.some((n) => n.includes('Missing "Secure" flag'))).toBe(true);
    expect(artifact.forensicNotes.some((n) => n.includes('Missing "HttpOnly" flag'))).toBe(true);
  });

  it('identifies persistent third-party cookies and generates privacy explanations', () => {
    const twoYearsFromNow = Math.floor(Date.now() / 1000) + 2 * 365 * 86400;

    const artifact = buildCookieArtifact({
      name: 'IDE',
      value: 'AHWqTUlyabcdefghijk123456',
      domain: '.doubleclick.net',
      path: '/',
      secure: true,
      httpOnly: true,
      sameSite: 'no_restriction',
      session: false,
      expirationDate: twoYearsFromNow
    }, 'nytimes.com');

    expect(artifact.isThirdParty).toBe(true);
    expect(artifact.session).toBe(false);
    expect(artifact.domain).toBe('doubleclick.net');
    expect(artifact.forensicNotes.some((n) => n.includes('Long-lived identifier'))).toBe(true);

    const explanation = explainCookieArtifact(artifact);
    expect(explanation.isPrivacyConcern).toBe(true);
    expect(explanation.summary).toContain('Google');
    expect(explanation.privacyImplications).toContain('persistent third-party cookie');
  });

  it('identifies partitioned cookies (CHIPS)', () => {
    const artifact = buildCookieArtifact({
      name: '__Host-partitioned',
      value: 'val12345678',
      domain: 'service.com',
      path: '/',
      secure: true,
      httpOnly: true,
      sameSite: 'no_restriction',
      partitionKey: { topLevelSite: 'https://mysite.com' }
    });

    expect(artifact.partitionKey).toBe('https://mysite.com');
    expect(artifact.forensicNotes.some((n) => n.includes('CHIPS'))).toBe(true);
  });
});
