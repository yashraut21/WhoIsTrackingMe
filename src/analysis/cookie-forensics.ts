import type { CookieArtifact, ForensicExplanation, SameSiteStatus } from '../types';
import { getRegistrableDomain, isThirdParty, normalizeHostname } from './domain';
import { findTracker } from '../tracker/database';
import { maskValue } from '../utils/masking';

export interface CookieInput {
  name: string;
  value?: string;
  domain: string;
  path: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite?: string;
  session?: boolean;
  expirationDate?: number;
  partitionKey?: any;
}

/**
 * Normalizes a raw cookie from the browser API into a structured forensic CookieArtifact.
 */
export function buildCookieArtifact(
  raw: CookieInput,
  currentSiteContext?: string
): CookieArtifact {
  const host = normalizeHostname(raw.domain) ?? raw.domain;
  const regDomain = getRegistrableDomain(host);

  // If a source site context is known, check if it is third-party relative to it.
  // If no source site context is provided, a cookie is considered third-party if it's
  // explicitly cross-site or matched against known third-party tracking infrastructure.
  const isThirdPartyCookie = currentSiteContext
    ? isThirdParty(currentSiteContext, host)
    : Boolean(findTracker(host));

  const forensicNotes: string[] = [];

  const isSession = raw.session ?? !raw.expirationDate;
  if (!isSession && raw.expirationDate) {
    const lifespanDays = Math.round((raw.expirationDate * 1000 - Date.now()) / (1000 * 86400));
    if (lifespanDays > 365) {
      forensicNotes.push(`Long-lived identifier (expires in ~${Math.round(lifespanDays / 365)} year(s))`);
    } else if (lifespanDays > 30) {
      forensicNotes.push(`Persistent identifier (expires in ${lifespanDays} days)`);
    } else {
      forensicNotes.push(`Short-lived persistent cookie (expires in ${lifespanDays} days)`);
    }
  } else {
    forensicNotes.push('Transient session cookie (cleared when browser session ends)');
  }

  // Security posture checks
  if (!raw.secure) {
    forensicNotes.push('Missing "Secure" flag (may be transmitted over unencrypted HTTP)');
  }
  if (!raw.httpOnly) {
    forensicNotes.push('Missing "HttpOnly" flag (accessible via document.cookie by client scripts)');
  }

  // Partitioned check (CHIPS)
  let partitionString: string | undefined;
  if (raw.partitionKey) {
    partitionString = typeof raw.partitionKey === 'object' && raw.partitionKey.topLevelSite
      ? raw.partitionKey.topLevelSite
      : 'partitioned';
    forensicNotes.push('Partitioned cookie (CHIPS): isolated per top-level site');
  }

  const sameSiteNormalized: SameSiteStatus =
    raw.sameSite === 'no_restriction' ? 'no_restriction' :
    raw.sameSite === 'strict' ? 'strict' :
    raw.sameSite === 'lax' ? 'lax' : 'unspecified';

  const expiresAt = raw.expirationDate ? raw.expirationDate * 1000 : undefined;

  return {
    id: `cookie:${host}:${raw.path}:${raw.name}`,
    observedAt: Date.now(),
    name: raw.name,
    domain: host,
    rawDomain: raw.domain,
    registrableDomain: regDomain,
    path: raw.path,
    expiresAt,
    secure: Boolean(raw.secure),
    httpOnly: Boolean(raw.httpOnly),
    sameSite: sameSiteNormalized,
    session: isSession,
    maskedValue: maskValue(raw.value),
    sourceSite: currentSiteContext ? normalizeHostname(currentSiteContext) ?? undefined : undefined,
    partitionKey: partitionString,
    isThirdParty: isThirdPartyCookie,
    forensicNotes
  };
}

/**
 * Generates an objective, forensic explanation for a specific cookie artifact.
 * Strictly separates observed telemetry from inferred tracking behavior.
 */
export function explainCookieArtifact(artifact: CookieArtifact): ForensicExplanation {
  const tracker = findTracker(artifact.domain);
  const technicalDetails: string[] = [];
  let isPrivacyConcern = false;

  // Technical posture summary
  if (!artifact.session) {
    technicalDetails.push(
      `Persistent: This cookie persists on disk across browser restarts until its expiry.`
    );
  } else {
    technicalDetails.push(`Session: Cleared automatically upon browser closure.`);
  }

  if (artifact.isThirdParty) {
    technicalDetails.push(
      `Third-party context: Domain (${artifact.domain}) differs from the top-level origin visited.`
    );
  } else {
    technicalDetails.push(`First-party context: Associated directly with the visited website.`);
  }

  if (!artifact.httpOnly) {
    technicalDetails.push(`Client-Accessible: Readable by JavaScript via document.cookie.`);
  } else {
    technicalDetails.push(`HttpOnly: Shielded from client-side script inspection.`);
  }

  if (artifact.partitionKey) {
    technicalDetails.push(
      `Partitioned (CHIPS): Tied specifically to this top-level partition, mitigating cross-site tracking.`
    );
  }

  let summary = '';
  let privacyImplications = '';

  if (tracker) {
    summary = `Known ${tracker.category} infrastructure (${tracker.organization}) detected on ${artifact.domain}.`;
    if (!artifact.session && artifact.isThirdParty) {
      isPrivacyConcern = true;
      privacyImplications =
        `A persistent identifier from ${tracker.organization} was observed in a third-party context. ` +
        `This infrastructure is commonly used for ${tracker.description.toLowerCase()}. ` +
        `While persistent third-party cookies can contribute to cross-site tracking, ` +
        `observed metadata alone does not prove that your personal identity was linked or sold.`;
    } else {
      privacyImplications =
        `Artifact belongs to known ${tracker.category.toLowerCase()} infrastructure. ` +
        `Depending on website implementation, it may support service delivery, operational analytics, or site telemetry.`;
    }
  } else if (artifact.isThirdParty) {
    summary = `Unclassified third-party cookie from ${artifact.domain}.`;
    privacyImplications =
      `Third-party origin observed. Third-party infrastructure is not inherently malicious; ` +
      `it frequently powers content delivery networks, video players, single-sign-on, or embedded widgets. ` +
      `No known tracking signatures were matched.`;
  } else {
    summary = `First-party cookie from ${artifact.domain}.`;
    privacyImplications =
      `This artifact is set directly by the primary website. First-party cookies typically maintain ` +
      `session state, login authentication, user preferences, or site security.`;
  }

  return {
    title: `${artifact.name} (${artifact.domain})`,
    summary,
    technicalDetails,
    privacyImplications,
    isPrivacyConcern
  };
}
