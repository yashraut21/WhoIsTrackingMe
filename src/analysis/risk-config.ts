/**
 * Configurable weights and saturation parameters for the Privacy Exposure Score.
 *
 * Rather than accumulating points linearly (which causes the score to hit the 10.0
 * ceiling almost immediately after visiting a few sites), the scoring engine uses
 * a multi-dimensional model with sub-linear diminishing returns (saturation curves).
 *
 * Each risk dimension has a maximum budget:
 *   1. Tracker Breadth:             Max 3.0 pts (Base trackers 2.0 + Ad networks 1.0)
 *   2. Cross-Site Surveillance:     Max 3.0 pts (Org count 1.8 + Penetration depth 1.2)
 *   3. Invasive Techniques:         Max 2.5 pts (Fingerprinting 1.3 + Session replay 1.2)
 *   4. Cookie Persistence:          Max 1.5 pts (Diminishing returns on persistent identifiers)
 *   --------------------------------------------------------------------------------------
 *   Total Theoretical Maximum:     10.0 pts
 */
export const RISK_CONFIG = {
  maxScore: 10.0,
  minScore: 0.0,

  // Category ceilings (sum = 10.0)
  ceilings: {
    trackerBreadth: 2.0,
    advertisingNetworks: 1.0,
    crossSiteBase: 1.8,
    crossSitePenetration: 1.2,
    fingerprinting: 1.3,
    sessionReplay: 1.2,
    persistentCookies: 1.5
  },

  // Saturation decay constants (higher = slower point accumulation)
  saturation: {
    trackersDecay: 8.0,
    advertisingDecay: 5.0,
    crossSiteOrgsDecay: 3.0,
    persistentCookiesDecay: 8.0
  }
} as const;

export type RiskConfig = typeof RISK_CONFIG;
