import type { CookieArtifact, NetworkObservation, RiskAssessment, RiskFactor } from '../types';
import { findTracker } from '../tracker/database';
import { RISK_CONFIG } from './risk-config';

/**
 * Calculates a transparent, explainable Privacy Exposure Score (0 - 10).
 * Does not present itself as an objective probability of harm.
 * Strictly itemizes every point factor so users understand why the score was given.
 */
export function calculatePrivacyScore(
  cookies: CookieArtifact[],
  observations: NetworkObservation[]
): RiskAssessment {
  const w = RISK_CONFIG.weights;
  const factors: RiskFactor[] = [];

  // Gather unique third-party domains
  const thirdPartyDomains = new Set<string>();
  const visitedSites = new Set<string>();
  const orgToSitesMap = new Map<string, Set<string>>();

  // Process network
  for (const obs of observations) {
    visitedSites.add(obs.firstPartySite);
    if (obs.thirdParty) {
      const target = obs.requestedRegistrableDomain ?? obs.requestedDomain;
      thirdPartyDomains.add(target);

      const tracker = findTracker(target);
      if (tracker?.organization) {
        if (!orgToSitesMap.has(tracker.organization)) {
          orgToSitesMap.set(tracker.organization, new Set());
        }
        orgToSitesMap.get(tracker.organization)!.add(obs.firstPartySite);
      }
    }
  }

  // Process cookies
  for (const c of cookies) {
    if (c.sourceSite) visitedSites.add(c.sourceSite);
    if (c.isThirdParty) {
      thirdPartyDomains.add(c.domain);
      const tracker = findTracker(c.domain);
      if (tracker?.organization && c.sourceSite) {
        if (!orgToSitesMap.has(tracker.organization)) {
          orgToSitesMap.set(tracker.organization, new Set());
        }
        orgToSitesMap.get(tracker.organization)!.add(c.sourceSite);
      }
    }
  }

  // Factor 1: Known Trackers
  const knownTrackers = Array.from(thirdPartyDomains)
    .map((d) => findTracker(d))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));

  if (knownTrackers.length > 0) {
    const pts = Number((knownTrackers.length * w.knownTrackers).toFixed(1));
    factors.push({
      label: 'Known tracking infrastructure',
      points: pts,
      detail: `${knownTrackers.length} verified tracker domain(s) identified in local traffic.`
    });
  }

  // Factor 2: Advertising Infrastructure
  const adTrackers = knownTrackers.filter((t) => t.category === 'Advertising');
  if (adTrackers.length > 0) {
    const pts = Number((adTrackers.length * w.advertisingInfrastructure).toFixed(1));
    factors.push({
      label: 'Commercial advertising networks',
      points: pts,
      detail: `${adTrackers.length} ad exchange or conversion attribution provider(s) observed.`
    });
  }

  // Factor 3: Session Replay Infrastructure
  const replayTrackers = knownTrackers.filter((t) => t.category === 'Session replay');
  if (replayTrackers.length > 0) {
    const pts = Number((replayTrackers.length * w.sessionReplayInfrastructure).toFixed(1));
    factors.push({
      label: 'Session replay behavioral recorders',
      points: pts,
      detail: `${replayTrackers.length} service(s) capable of recording DOM inputs, mouse movement, and clicks.`
    });
  }

  // Factor 4: Device Fingerprinting
  const fingerprintTrackers = knownTrackers.filter((t) => t.category === 'Fingerprinting');
  if (fingerprintTrackers.length > 0) {
    const pts = Number((fingerprintTrackers.length * w.fingerprintingInfrastructure).toFixed(1));
    factors.push({
      label: 'Browser fingerprinting telemetry',
      points: pts,
      detail: `${fingerprintTrackers.length} service(s) specialized in cross-session device identification.`
    });
  }

  // Factor 5: Persistent Third-Party Cookies
  const persistentThirdParty = cookies.filter((c) => c.isThirdParty && !c.session);
  if (persistentThirdParty.length > 0) {
    const pts = Number((persistentThirdParty.length * w.persistentThirdPartyCookie).toFixed(1));
    factors.push({
      label: 'Persistent third-party identifiers',
      points: pts,
      detail: `${persistentThirdParty.length} cross-site cookie(s) remaining active after browser restarts.`
    });
  }

  // Factor 6: Cross-Site Organizations (Entities tracking across 2+ distinct visited websites)
  const crossSiteOrgs = Array.from(orgToSitesMap.entries()).filter(([_, sites]) => sites.size >= 2);
  if (crossSiteOrgs.length > 0) {
    const pts = Number((crossSiteOrgs.length * w.crossSiteOrganization).toFixed(1));
    factors.push({
      label: 'Cross-site tracking reach',
      points: pts,
      detail: `${crossSiteOrgs.length} organization(s) (e.g., ${crossSiteOrgs.map(([o]) => o).slice(0, 2).join(', ')}) observed spanning multiple visited sites.`
    });
  }

  // Calculate sum and cap between minScore and maxScore
  const rawSum = factors.reduce((sum, f) => sum + f.points, 0);
  const finalScore = Math.min(
    RISK_CONFIG.maxScore,
    Math.max(RISK_CONFIG.minScore, Number(rawSum.toFixed(1)))
  );

  return {
    score: finalScore,
    factors: factors.sort((a, b) => b.points - a.points),
    calculatedAt: Date.now()
  };
}
