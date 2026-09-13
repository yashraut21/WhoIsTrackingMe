import type { CookieArtifact, NetworkObservation, TrackerCategory } from '../types';
import { findTracker } from '../tracker/database';

export type TimelineEventType = 'site_visit' | 'network_request' | 'cookie_observed';

export interface TimelineEvent {
  id: string;
  timestamp: number;
  eventType: TimelineEventType;
  firstPartySite: string;
  targetDomain: string;
  organization?: string;
  category: TrackerCategory;
  priorityLevel: 'heightened' | 'standard';
  title: string;
  summary: string;
  technicalMetadata: Record<string, any>;
}

export interface TimelineFilters {
  website?: string | 'All';
  organization?: string | 'All';
  category?: TrackerCategory | 'All';
  eventType?: TimelineEventType | 'All';
  priorityOnly?: boolean;
  searchQuery?: string;
}

const PRIVACY_INTENSIVE_CATEGORIES = new Set<TrackerCategory>([
  'Advertising',
  'Fingerprinting',
  'Session replay',
  'Social tracking'
]);

/**
 * Transforms and aggregates cookies and network observations into a chronological timeline.
 */
export function buildTimeline(
  cookies: CookieArtifact[],
  observations: NetworkObservation[]
): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  // 1. Process network observations
  for (const obs of observations) {
    const tracker = findTracker(obs.requestedDomain);
    const category: TrackerCategory = tracker?.category ?? (obs.thirdParty ? 'Unknown' : 'CDN/infrastructure');
    const isSensitive = tracker && PRIVACY_INTENSIVE_CATEGORIES.has(tracker.category);
    const priorityLevel = (obs.thirdParty && isSensitive) ? 'heightened' : 'standard';

    events.push({
      id: `net:${obs.id}`,
      timestamp: obs.timestamp,
      eventType: 'network_request',
      firstPartySite: obs.firstPartySite,
      targetDomain: obs.requestedDomain,
      organization: tracker?.organization,
      category,
      priorityLevel,
      title: `${obs.firstPartySite} → ${obs.requestedDomain}`,
      summary: obs.thirdParty
        ? (tracker
            ? `Third-party request to known ${tracker.category.toLowerCase()} service (${tracker.organization}).`
            : `Third-party network request to unclassified infrastructure.`)
        : 'First-party network communication.',
      technicalMetadata: {
        resourceType: obs.resourceType,
        method: obs.method || 'GET',
        thirdParty: obs.thirdParty
      }
    });
  }

  // 2. Process cookies
  for (const cookie of cookies) {
    const tracker = findTracker(cookie.domain);
    const category: TrackerCategory = tracker?.category ?? 'Unknown';
    const isSensitive = tracker && PRIVACY_INTENSIVE_CATEGORIES.has(tracker.category);
    const isPersistentThirdParty = cookie.isThirdParty && !cookie.session;

    const priorityLevel = (isPersistentThirdParty && isSensitive) ? 'heightened' : 'standard';

    events.push({
      id: `cookie:${cookie.id}`,
      timestamp: cookie.observedAt,
      eventType: 'cookie_observed',
      firstPartySite: cookie.sourceSite || cookie.registrableDomain || cookie.domain,
      targetDomain: cookie.domain,
      organization: tracker?.organization,
      category,
      priorityLevel,
      title: `Cookie: ${cookie.name} (${cookie.domain})`,
      summary: cookie.session
        ? 'Transient session cookie stored in browser.'
        : `Persistent cookie identifier (expires ${cookie.expiresAt ? new Date(cookie.expiresAt).toLocaleDateString() : 'on restart'}).`,
      technicalMetadata: {
        path: cookie.path,
        secure: cookie.secure,
        httpOnly: cookie.httpOnly,
        sameSite: cookie.sameSite,
        session: cookie.session,
        maskedValue: cookie.maskedValue
      }
    });
  }

  // Sort descending by timestamp (newest first)
  return events.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Filters the timeline according to user selections.
 */
export function filterTimeline(
  events: TimelineEvent[],
  filters: TimelineFilters
): TimelineEvent[] {
  return events.filter((ev) => {
    if (filters.website && filters.website !== 'All' && ev.firstPartySite !== filters.website) {
      return false;
    }
    if (filters.category && filters.category !== 'All' && ev.category !== filters.category) {
      return false;
    }
    if (filters.organization && filters.organization !== 'All' && ev.organization !== filters.organization) {
      return false;
    }
    if (filters.eventType && filters.eventType !== 'All' && ev.eventType !== filters.eventType) {
      return false;
    }
    if (filters.priorityOnly && ev.priorityLevel !== 'heightened') {
      return false;
    }
    if (filters.searchQuery && filters.searchQuery.trim() !== '') {
      const q = filters.searchQuery.toLowerCase();
      const match =
        ev.title.toLowerCase().includes(q) ||
        ev.targetDomain.toLowerCase().includes(q) ||
        ev.firstPartySite.toLowerCase().includes(q) ||
        (ev.organization && ev.organization.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });
}
