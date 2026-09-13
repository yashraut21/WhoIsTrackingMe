import type { CookieArtifact, NetworkObservation, RiskAssessment, RiskFactor } from '../types';
import { findTracker } from '../tracker/database';
import { RISK_CONFIG } from './risk-config';

/**
 * Calculates a nuanced, explainable Privacy Exposure Score (0.0 - 10.0).
 *
 * Uses sub-linear diminishing returns (asymptotic saturation curves) across four
 * independent risk dimensions so the score reflects genuine relative exposure rather
 * than hitting a hard 10.0 ceiling after visiting a handful of standard websites:
 *
 *   1. Tracker Ecosystem Breadth (Max 3.0 pts):
 *      - Base tracker presence (Max 2.0 pts via diminishing returns)
 *      - Commercial ad network multiplier (Max 1.0 pt)
 *   2. Cross-Site Surveillance Reach (Max 3.0 pts):
 *      - Cross-site organizations bridging multiple sites (Max 1.8 pts)
 *      - Maximum visited site penetration ratio (Max 1.2 pts)
 *   3. Invasive Surveillance Techniques (Max 2.5 pts):
 *      - Device fingerprinting services (Max 1.3 pts)
 *      - Session replay recorders (Max 1.2 pts)
 *   4. Identifier Persistence & Hygiene (Max 1.5 pts):
 *      - Persistent third-party cookies (Max 1.5 pts via diminishing returns)
 *
 * Maximum theoretical score is mathematically bounded at 10.0.
 */
export function calculatePrivacyScore(
  cookies: CookieArtifact[],
  observations: NetworkObservation[]
): RiskAssessment {
  const cfg = RISK_CONFIG;
  const factors: RiskFactor[] = [];

  // 1. Collect visited first-party sites and unique third-party targets
  const visitedSites = new Set<string>();
  const thirdPartyDomains = new Set<string>();
  const orgToSitesMap = new Map<string, Set<string>>();

  // Process network observations
  for (const obs of observations) {
    if (obs.firstPartySite) {
      visitedSites.add(obs.firstPartySite);
    }
    if (obs.thirdParty) {
      const target = obs.requestedRegistrableDomain ?? obs.requestedDomain;
      thirdPartyDomains.add(target);

      const tracker = findTracker(target);
      if (tracker?.organization && obs.firstPartySite) {
        if (!orgToSitesMap.has(tracker.organization)) {
          orgToSitesMap.set(tracker.organization, new Set());
        }
        orgToSitesMap.get(tracker.organization)!.add(obs.firstPartySite);
      }
    }
  }

  // Process cookies
  for (const c of cookies) {
    if (c.sourceSite) {
      visitedSites.add(c.sourceSite);
    }
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

  // If no tracking artifacts exist whatsoever, return a clean 0.0
  if (thirdPartyDomains.size === 0 && cookies.filter((c) => c.isThirdParty).length === 0) {
    return {
      score: 0.0,
      factors: [],
      calculatedAt: Date.now()
    };
  }

  // Identify known trackers from unique third-party domains
  const knownTrackers = Array.from(thirdPartyDomains)
    .map((d) => findTracker(d))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));

  // -------------------------------------------------------------------------
  // Factor 1: Known Tracking Infrastructure (Max: 2.0 pts)
  // Sub-linear saturation: 1 tracker ~0.2, 5 trackers ~0.9, 15 trackers ~1.7, 30+ ~2.0
  // -------------------------------------------------------------------------
  if (knownTrackers.length > 0) {
    const rawRatio = 1 - Math.exp(-knownTrackers.length / cfg.saturation.trackersDecay);
    const pts = Math.min(cfg.ceilings.trackerBreadth, Number((cfg.ceilings.trackerBreadth * rawRatio).toFixed(1)));
    if (pts > 0) {
      factors.push({
        label: 'Known tracking infrastructure',
        points: pts,
        detail: `${knownTrackers.length} verified tracker domain(s) identified (scaled via diminishing returns to prevent runaway totals).`
      });
    }
  }

  // -------------------------------------------------------------------------
  // Factor 2: Commercial Advertising Networks (Max: 1.0 pt)
  // Sub-linear saturation: 1 ad network ~0.2, 3 ad networks ~0.5, 8+ ~1.0
  // -------------------------------------------------------------------------
  const adTrackers = knownTrackers.filter((t) => t.category === 'Advertising');
  if (adTrackers.length > 0) {
    const rawRatio = 1 - Math.exp(-adTrackers.length / cfg.saturation.advertisingDecay);
    const pts = Math.min(cfg.ceilings.advertisingNetworks, Number((cfg.ceilings.advertisingNetworks * rawRatio).toFixed(1)));
    if (pts > 0) {
      factors.push({
        label: 'Commercial advertising networks',
        points: pts,
        detail: `${adTrackers.length} ad exchange or conversion attribution provider(s) observed participating in commercial profiling.`
      });
    }
  }

  // -------------------------------------------------------------------------
  // Factor 3: Session Replay Behavioral Recorders (Max: 1.2 pts)
  // 1st service = 0.8 pts, subsequent +0.2 each (capped at 1.2 pts)
  // -------------------------------------------------------------------------
  const replayTrackers = knownTrackers.filter((t) => t.category === 'Session replay');
  if (replayTrackers.length > 0) {
    const pts = Math.min(
      cfg.ceilings.sessionReplay,
      Number((0.8 + (replayTrackers.length - 1) * 0.2).toFixed(1))
    );
    factors.push({
      label: 'Session replay behavioral recorders',
      points: pts,
      detail: `${replayTrackers.length} service(s) capable of recording DOM inputs, mouse movement, and clicks.`
    });
  }

  // -------------------------------------------------------------------------
  // Factor 4: Browser Fingerprinting Telemetry (Max: 1.3 pts)
  // 1st service = 1.0 pt, subsequent +0.3 each (capped at 1.3 pts)
  // -------------------------------------------------------------------------
  const fingerprintTrackers = knownTrackers.filter((t) => t.category === 'Fingerprinting');
  if (fingerprintTrackers.length > 0) {
    const pts = Math.min(
      cfg.ceilings.fingerprinting,
      Number((1.0 + (fingerprintTrackers.length - 1) * 0.3).toFixed(1))
    );
    factors.push({
      label: 'Browser fingerprinting telemetry',
      points: pts,
      detail: `${fingerprintTrackers.length} service(s) specialized in cross-session device identification without cookies.`
    });
  }

  // -------------------------------------------------------------------------
  // Factor 5: Persistent Third-Party Identifiers (Max: 1.5 pts)
  // Sub-linear saturation: 1 cookie ~0.2, 5 cookies ~0.7, 15 cookies ~1.3, 30+ ~1.5
  // -------------------------------------------------------------------------
  const persistentThirdParty = cookies.filter((c) => c.isThirdParty && !c.session);
  if (persistentThirdParty.length > 0) {
    const rawRatio = 1 - Math.exp(-persistentThirdParty.length / cfg.saturation.persistentCookiesDecay);
    const pts = Math.min(cfg.ceilings.persistentCookies, Number((cfg.ceilings.persistentCookies * rawRatio).toFixed(1)));
    if (pts > 0) {
      factors.push({
        label: 'Persistent third-party identifiers',
        points: pts,
        detail: `${persistentThirdParty.length} cross-site cookie(s) configured to survive browser restarts.`
      });
    }
  }

  // -------------------------------------------------------------------------
  // Factor 6: Cross-Site Tracking Reach (Max: 3.0 pts)
  // Combines multi-site hub count (up to 1.8 pts) + visited site penetration (up to 1.2 pts)
  // -------------------------------------------------------------------------
  const crossSiteOrgs = Array.from(orgToSitesMap.entries()).filter(([_, sites]) => sites.size >= 2);
  if (crossSiteOrgs.length > 0 && visitedSites.size > 0) {
    // Component A: Number of distinct cross-site organizations (asymptotic up to 1.8 pts)
    const orgCountRatio = 1 - Math.exp(-crossSiteOrgs.length / cfg.saturation.crossSiteOrgsDecay);
    const orgBasePts = cfg.ceilings.crossSiteBase * orgCountRatio;

    // Component B: Maximum penetration depth across visited sites (up to 1.2 pts)
    const maxSitesCovered = Math.max(...crossSiteOrgs.map(([_, sites]) => sites.size));
    const penetrationRatio = Math.min(1.0, maxSitesCovered / Math.max(1, visitedSites.size));
    const penetrationPts = cfg.ceilings.crossSitePenetration * penetrationRatio;

    const totalReachPts = Math.min(
      cfg.ceilings.crossSiteBase + cfg.ceilings.crossSitePenetration,
      Number((orgBasePts + penetrationPts).toFixed(1))
    );

    if (totalReachPts > 0) {
      const topOrgName = crossSiteOrgs[0][0];
      const percentStr = Math.round(penetrationRatio * 100);
      factors.push({
        label: 'Cross-site tracking reach',
        points: totalReachPts,
        detail: `${crossSiteOrgs.length} organization(s) (e.g., ${topOrgName}) bridge multiple visited sites, monitoring up to ${percentStr}% of your visited properties.`
      });
    }
  }

  // -------------------------------------------------------------------------
  // Final Score Aggregation
  // Sum individual factors and clamp cleanly between minScore (0.0) and maxScore (10.0)
  // -------------------------------------------------------------------------
  const rawSum = factors.reduce((sum, f) => sum + f.points, 0);
  const finalScore = Math.min(
    cfg.maxScore,
    Math.max(cfg.minScore, Number(rawSum.toFixed(1)))
  );

  return {
    score: finalScore,
    factors: factors.sort((a, b) => b.points - a.points),
    calculatedAt: Date.now()
  };
}
