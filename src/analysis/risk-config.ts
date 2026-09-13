/**
 * Configurable weights for heuristic privacy exposure risk scoring.
 * Strictly separates empirical telemetry from subjective scoring.
 */
export const RISK_CONFIG = {
  // Weights applied per unique occurrence
  weights: {
    knownTrackers: 0.7,
    advertisingInfrastructure: 0.5,
    sessionReplayInfrastructure: 0.9,
    fingerprintingInfrastructure: 1.0,
    persistentThirdPartyCookie: 0.4,
    crossSiteOrganization: 0.6,
    unclassifiedThirdParty: 0.15
  },
  // Caps and normalization
  maxScore: 10.0,
  minScore: 0.0
} as const;

export type RiskWeights = typeof RISK_CONFIG.weights;
