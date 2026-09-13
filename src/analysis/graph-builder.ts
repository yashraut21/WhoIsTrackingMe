import type { CookieArtifact, NetworkObservation, TrackerCategory } from '../types';
import { findTracker } from '../tracker/database';

export type GraphNodeType = 'website' | 'organization' | 'domain';
export type GraphLinkType = 'loads resource from' | 'sets cookie' | 'operated by' | 'communicates with';

export interface GraphNode {
  id: string;
  label: string;
  type: GraphNodeType;
  stage: 'site' | 'organization' | 'endpoint';
  category?: TrackerCategory;
  organization?: string;
  artifactCount: number;
  confidence?: 'High' | 'Medium' | 'Low';
  isHighConcern?: boolean;
  // Cross-site reach telemetry for organizations and endpoints
  reachCount?: number;
  reachPercentage?: number;
  connectedSites?: string[];
  connectedEndpoints?: string[];
  hasPersistentCookies?: boolean;
  resourceTypes?: string[];
  // D3 layout properties
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphLink {
  id: string;
  source: string | GraphNode;
  target: string | GraphNode;
  relationship: GraphLinkType;
  count: number;
  resourceTypes?: string[];
  hasCookies?: boolean;
}

export interface GraphFilters {
  category?: TrackerCategory | 'All';
  website?: string | 'All';
  organization?: string | 'All';
  searchQuery?: string;
  crossSiteOnly?: boolean;
}

export interface OrganizationFootprint {
  organization: string;
  category: TrackerCategory;
  visitedSites: string[];
  endpoints: Array<{
    domain: string;
    category: TrackerCategory;
    requestCount: number;
    cookieCount: number;
    hasPersistentCookie: boolean;
  }>;
  totalRequests: number;
  totalCookies: number;
  persistentCookieCount: number;
  crossSiteReachPercentage: number;
  narrative: string;
}

const PRIVACY_INTENSIVE_CATEGORIES = new Set<TrackerCategory>([
  'Advertising',
  'Fingerprinting',
  'Session replay',
  'Social tracking'
]);

/**
 * Builds a structured, explainable 3-stage graph:
 * Stage 1 (Site) -> Stage 2 (Organization) -> Stage 3 (Endpoint)
 */
export function buildTrackingGraph(
  cookies: CookieArtifact[],
  observations: NetworkObservation[],
  filters: GraphFilters = {}
): {
  nodes: GraphNode[];
  links: GraphLink[];
  stageColumns: {
    sites: GraphNode[];
    organizations: GraphNode[];
    endpoints: GraphNode[];
  };
  totalVisitedSites: number;
  crossSiteHubCount: number;
  topSurveillanceEntity: string | null;
} {
  const nodeMap = new Map<string, GraphNode>();
  const linkMap = new Map<string, GraphLink>();

  // Track all unique top-level visited sites
  const allVisitedSites = new Set<string>();
  observations.forEach((o) => allVisitedSites.add(o.firstPartySite));
  cookies.forEach((c) => {
    if (c.sourceSite) allVisitedSites.add(c.sourceSite);
    if (!c.isThirdParty) allVisitedSites.add(c.registrableDomain ?? c.domain);
  });
  const totalVisitedSitesCount = Math.max(allVisitedSites.size, 1);

  // Helper to get or create a node
  const addNode = (
    id: string,
    label: string,
    type: GraphNodeType,
    stage: 'site' | 'organization' | 'endpoint',
    category?: TrackerCategory,
    org?: string,
    confidence?: 'High' | 'Medium' | 'Low'
  ): GraphNode => {
    if (!nodeMap.has(id)) {
      const isHighConcern = category ? PRIVACY_INTENSIVE_CATEGORIES.has(category) : false;
      nodeMap.set(id, {
        id,
        label,
        type,
        stage,
        category: category ?? 'Unknown',
        organization: org,
        artifactCount: 0,
        confidence: confidence ?? 'Low',
        isHighConcern,
        connectedSites: [],
        connectedEndpoints: [],
        resourceTypes: []
      });
    }
    const node = nodeMap.get(id)!;
    node.artifactCount += 1;
    return node;
  };

  const addLink = (
    sourceId: string,
    targetId: string,
    relationship: GraphLinkType,
    resourceType?: string,
    isCookie?: boolean
  ) => {
    const linkId = `${sourceId}->${targetId}:${relationship}`;
    if (!linkMap.has(linkId)) {
      linkMap.set(linkId, {
        id: linkId,
        source: sourceId,
        target: targetId,
        relationship,
        count: 0,
        resourceTypes: [],
        hasCookies: false
      });
    }
    const link = linkMap.get(linkId)!;
    link.count += 1;
    if (resourceType && !link.resourceTypes?.includes(resourceType)) {
      link.resourceTypes?.push(resourceType);
    }
    if (isCookie) {
      link.hasCookies = true;
    }
  };

  // 1. Process Network Observations
  for (const obs of observations) {
    const site = obs.firstPartySite;
    const reqDomain = obs.requestedRegistrableDomain ?? obs.requestedDomain;
    if (!site || !reqDomain) continue;

    if (filters.website && filters.website !== 'All' && site !== filters.website) {
      continue;
    }

    const tracker = findTracker(reqDomain);
    const category = tracker?.category ?? (obs.thirdParty ? 'Unknown' : 'CDN/infrastructure');
    const org = tracker?.organization;

    if (filters.category && filters.category !== 'All' && category !== filters.category) {
      continue;
    }

    if (filters.organization && filters.organization !== 'All' && org !== filters.organization) {
      continue;
    }

    // Site Node (Stage 1)
    const siteNodeId = `site:${site}`;
    addNode(siteNodeId, site, 'website', 'site');

    // Endpoint Node (Stage 3)
    const domainNodeId = `domain:${reqDomain}`;
    const domainNode = addNode(domainNodeId, reqDomain, 'domain', 'endpoint', category, org, tracker?.confidence);
    if (!domainNode.connectedSites?.includes(site)) {
      domainNode.connectedSites?.push(site);
    }
    if (obs.resourceType && !domainNode.resourceTypes?.includes(obs.resourceType)) {
      domainNode.resourceTypes?.push(obs.resourceType);
    }

    // If Organization is known, add Organization Node (Stage 2)
    if (org) {
      const orgNodeId = `org:${org}`;
      const orgNode = addNode(orgNodeId, org, 'organization', 'organization', category, org, 'High');

      if (!orgNode.connectedSites?.includes(site)) {
        orgNode.connectedSites?.push(site);
      }
      if (!orgNode.connectedEndpoints?.includes(reqDomain)) {
        orgNode.connectedEndpoints?.push(reqDomain);
      }

      // Link: Site -> Org
      addLink(siteNodeId, orgNodeId, 'loads resource from', obs.resourceType);
      // Link: Org -> Endpoint
      addLink(orgNodeId, domainNodeId, 'operated by', obs.resourceType);
    } else {
      // Direct Link: Site -> Endpoint
      addLink(siteNodeId, domainNodeId, obs.thirdParty ? 'loads resource from' : 'communicates with', obs.resourceType);
    }
  }

  // 2. Process Cookies
  for (const cookie of cookies) {
    const cookieHost = cookie.registrableDomain ?? cookie.domain;
    const site = cookie.sourceSite ?? (cookie.isThirdParty ? null : cookieHost);

    if (site && filters.website && filters.website !== 'All' && site !== filters.website) {
      continue;
    }

    const tracker = findTracker(cookieHost);
    const category = tracker?.category ?? 'Unknown';
    const org = tracker?.organization;

    if (filters.category && filters.category !== 'All' && category !== filters.category) {
      continue;
    }

    if (filters.organization && filters.organization !== 'All' && org !== filters.organization) {
      continue;
    }

    const domainNodeId = `domain:${cookieHost}`;
    const domainNode = addNode(domainNodeId, cookieHost, 'domain', 'endpoint', category, org, tracker?.confidence);
    if (!cookie.session) {
      domainNode.hasPersistentCookies = true;
    }

    if (site) {
      const siteNodeId = `site:${site}`;
      addNode(siteNodeId, site, 'website', 'site');
      if (!domainNode.connectedSites?.includes(site)) {
        domainNode.connectedSites?.push(site);
      }

      if (org) {
        const orgNodeId = `org:${org}`;
        const orgNode = addNode(orgNodeId, org, 'organization', 'organization', category, org, 'High');
        if (!orgNode.connectedSites?.includes(site)) {
          orgNode.connectedSites?.push(site);
        }
        if (!orgNode.connectedEndpoints?.includes(cookieHost)) {
          orgNode.connectedEndpoints?.push(cookieHost);
        }
        if (!cookie.session) {
          orgNode.hasPersistentCookies = true;
        }
        addLink(siteNodeId, orgNodeId, 'sets cookie', undefined, true);
        addLink(orgNodeId, domainNodeId, 'operated by', undefined, true);
      } else {
        addLink(siteNodeId, domainNodeId, 'sets cookie', undefined, true);
      }
    }
  }

  // Calculate Reach Counts and Percentages
  for (const node of nodeMap.values()) {
    if (node.type === 'organization' || node.type === 'domain') {
      const uniqueSites = node.connectedSites?.length ?? 0;
      node.reachCount = uniqueSites;
      node.reachPercentage = Math.round((uniqueSites / totalVisitedSitesCount) * 100);
    }
  }

  const allOrganizations = Array.from(nodeMap.values()).filter((n) => n.stage === 'organization');
  const crossSiteHubCount = allOrganizations.filter((o) => (o.reachCount ?? 0) >= 2).length;
  const sortedOrgs = [...allOrganizations].sort((a, b) => (b.reachCount ?? 0) - (a.reachCount ?? 0));
  const topSurveillanceEntity = sortedOrgs.length > 0 ? sortedOrgs[0].label : null;

  let nodes = Array.from(nodeMap.values());
  let links = Array.from(linkMap.values());

  // Cross-Site Hubs Only filter (only include entities seen on 2+ websites to eliminate single-site noise)
  if (filters.crossSiteOnly) {
    const crossSiteOrgIds = new Set(
      allOrganizations.filter((o) => (o.reachCount ?? 0) >= 2).map((o) => o.id)
    );

    // Keep links that connect directly to cross-site organizations
    const validLinks = links.filter((l) => {
      const s = typeof l.source === 'string' ? l.source : (l.source as any).id;
      const t = typeof l.target === 'string' ? l.target : (l.target as any).id;
      return crossSiteOrgIds.has(s) || crossSiteOrgIds.has(t);
    });

    const activeNodeIds = new Set<string>();
    for (const l of validLinks) {
      const s = typeof l.source === 'string' ? l.source : (l.source as any).id;
      const t = typeof l.target === 'string' ? l.target : (l.target as any).id;
      activeNodeIds.add(s);
      activeNodeIds.add(t);
    }

    nodes = nodes.filter((n) => activeNodeIds.has(n.id));
    links = validLinks.filter((l) => {
      const s = typeof l.source === 'string' ? l.source : (l.source as any).id;
      const t = typeof l.target === 'string' ? l.target : (l.target as any).id;
      return activeNodeIds.has(s) && activeNodeIds.has(t);
    });
  }

  // Search Query filter
  if (filters.searchQuery && filters.searchQuery.trim() !== '') {
    const q = filters.searchQuery.toLowerCase();
    const matchingNodeIds = new Set(
      nodes
        .filter((n) => n.label.toLowerCase().includes(q) || (n.organization && n.organization.toLowerCase().includes(q)))
        .map((n) => n.id)
    );

    const connectedNodeIds = new Set<string>(matchingNodeIds);
    for (const link of links) {
      const s = typeof link.source === 'string' ? link.source : (link.source as any).id;
      const t = typeof link.target === 'string' ? link.target : (link.target as any).id;
      if (matchingNodeIds.has(s)) connectedNodeIds.add(t);
      if (matchingNodeIds.has(t)) connectedNodeIds.add(s);
    }

    nodes = nodes.filter((n) => connectedNodeIds.has(n.id));
    links = links.filter((l) => {
      const s = typeof l.source === 'string' ? l.source : (l.source as any).id;
      const t = typeof l.target === 'string' ? l.target : (l.target as any).id;
      return connectedNodeIds.has(s) && connectedNodeIds.has(t);
    });
  }

  // Sort nodes into distinct columns for the 3-Stage Flow layout
  const stageColumns = {
    sites: nodes.filter((n) => n.stage === 'site').sort((a, b) => b.artifactCount - a.artifactCount),
    organizations: nodes.filter((n) => n.stage === 'organization').sort((a, b) => (b.reachCount ?? 0) - (a.reachCount ?? 0)),
    endpoints: nodes.filter((n) => n.stage === 'endpoint').sort((a, b) => b.artifactCount - a.artifactCount)
  };

  return {
    nodes,
    links,
    stageColumns,
    totalVisitedSites: totalVisitedSitesCount,
    crossSiteHubCount,
    topSurveillanceEntity
  };
}

/**
 * Extracts the complete cross-site footprint for a specific parent tracking entity.
 */
export function getOrganizationFootprint(
  orgName: string,
  cookies: CookieArtifact[],
  observations: NetworkObservation[]
): OrganizationFootprint | null {
  const matchingObservations = observations.filter((o) => {
    const tracker = findTracker(o.requestedRegistrableDomain ?? o.requestedDomain);
    return tracker?.organization?.toLowerCase() === orgName.toLowerCase();
  });

  const matchingCookies = cookies.filter((c) => {
    const tracker = findTracker(c.domain);
    return tracker?.organization?.toLowerCase() === orgName.toLowerCase();
  });

  if (matchingObservations.length === 0 && matchingCookies.length === 0) {
    return null;
  }

  const visitedSitesSet = new Set<string>();
  matchingObservations.forEach((o) => visitedSitesSet.add(o.firstPartySite));
  matchingCookies.forEach((c) => {
    if (c.sourceSite) visitedSitesSet.add(c.sourceSite);
  });
  const visitedSites = Array.from(visitedSitesSet);

  const endpointMap = new Map<
    string,
    { domain: string; category: TrackerCategory; requestCount: number; cookies: CookieArtifact[] }
  >();

  for (const obs of matchingObservations) {
    const d = obs.requestedRegistrableDomain ?? obs.requestedDomain;
    const tracker = findTracker(d);
    if (!endpointMap.has(d)) {
      endpointMap.set(d, {
        domain: d,
        category: tracker?.category ?? 'Unknown',
        requestCount: 0,
        cookies: []
      });
    }
    endpointMap.get(d)!.requestCount += 1;
  }

  for (const c of matchingCookies) {
    const d = c.domain;
    const tracker = findTracker(d);
    if (!endpointMap.has(d)) {
      endpointMap.set(d, {
        domain: d,
        category: tracker?.category ?? 'Unknown',
        requestCount: 0,
        cookies: []
      });
    }
    endpointMap.get(d)!.cookies.push(c);
  }

  const endpoints = Array.from(endpointMap.values()).map((e) => ({
    domain: e.domain,
    category: e.category,
    requestCount: e.requestCount,
    cookieCount: e.cookies.length,
    hasPersistentCookie: e.cookies.some((c) => !c.session)
  }));

  const allSitesCount = new Set(observations.map((o) => o.firstPartySite)).size || 1;
  const reachPercentage = Math.round((visitedSites.length / allSitesCount) * 100);
  const persistentCookiesCount = matchingCookies.filter((c) => !c.session).length;
  const primaryCategory = endpoints[0]?.category ?? 'Analytics';

  const narrative =
    `${orgName} tracking infrastructure was triggered across ${visitedSites.length} of your visited websites ` +
    `(${reachPercentage}% cross-site penetration). A total of ${matchingObservations.length} network requests were routed to its endpoints, ` +
    `and ${persistentCookiesCount} persistent identifier(s) were stored. ` +
    `This infrastructure enables ${orgName} to correlate browsing events across these separate websites.`;

  return {
    organization: orgName,
    category: primaryCategory,
    visitedSites,
    endpoints,
    totalRequests: matchingObservations.length,
    totalCookies: matchingCookies.length,
    persistentCookieCount: persistentCookiesCount,
    crossSiteReachPercentage: reachPercentage,
    narrative
  };
}
