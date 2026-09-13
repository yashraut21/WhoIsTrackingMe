export type TrackerCategory =
  | 'Advertising'
  | 'Analytics'
  | 'Fingerprinting'
  | 'Session replay'
  | 'Social tracking'
  | 'Identity/authentication'
  | 'CDN/infrastructure'
  | 'Payment'
  | 'Unknown';

export type Confidence = 'High' | 'Medium' | 'Low';

export type ArtifactType = 'cookie' | 'network' | 'storage';

export type SameSiteStatus = 'no_restriction' | 'lax' | 'strict' | 'unspecified';

export interface CookieArtifact {
  id: string;
  observedAt: number;
  name: string;
  domain: string;
  rawDomain: string;
  registrableDomain: string | null;
  path: string;
  expiresAt?: number;
  secure: boolean;
  httpOnly: boolean;
  sameSite: SameSiteStatus;
  session: boolean;
  maskedValue: string;
  sourceSite?: string;
  partitionKey?: string;
  isThirdParty: boolean;
  forensicNotes: string[];
}

export interface StorageArtifact {
  id: string;
  observedAt: number;
  site: string;
  storageType: 'localStorage' | 'sessionStorage' | 'indexedDB';
  key?: string;
}

export interface NetworkObservation {
  id: string;
  timestamp: number;
  firstPartySite: string;
  requestedDomain: string;
  requestedRegistrableDomain: string | null;
  resourceType: string;
  method?: string;
  thirdParty: boolean;
}

export interface ThirdPartyDomain {
  domain: string;
  organization?: string;
  category: TrackerCategory;
  confidence: Confidence;
  observedAt: number;
}

export interface TrackerDefinition {
  domain: string;
  organization: string;
  category: TrackerCategory;
  trackingType: string;
  confidence: Confidence;
  description: string;
}

export interface TrackingEvent {
  id: string;
  timestamp: number;
  firstPartySite: string;
  thirdPartyDomain: string;
  artifactType: ArtifactType;
  artifactId: string;
  classification: 'known-tracker' | 'unknown-third-party' | 'first-party';
  confidence: Confidence;
}

export interface WebsiteProfile {
  site: string;
  cookies: CookieArtifact[];
  thirdPartyDomains: ThirdPartyDomain[];
  knownTrackers: ThirdPartyDomain[];
  updatedAt: number;
}

export interface DomainSummary {
  domain: string;
  organization: string;
  category: TrackerCategory;
  party: 'First-party' | 'Third-party' | 'Mixed';
  cookieCount: number;
  networkCount: number;
  totalArtifacts: number;
  confidence: Confidence;
  hasPersistentCookies: boolean;
  isKnownTracker: boolean;
}

export interface RiskFactor {
  label: string;
  points: number;
  detail: string;
}

export interface RiskAssessment {
  score: number;
  factors: RiskFactor[];
  calculatedAt: number;
}

export interface ForensicExplanation {
  title: string;
  summary: string;
  technicalDetails: string[];
  privacyImplications: string;
  isPrivacyConcern: boolean;
}
