import { describe, expect, it } from 'vitest';
import { buildTrackingGraph, getOrganizationFootprint } from '../analysis/graph-builder';
import type { CookieArtifact, NetworkObservation } from '../types';

describe('D3 Tracking Graph & Hierarchical Flow Builder', () => {
  const mockObservations: NetworkObservation[] = [
    {
      id: 'o1',
      timestamp: 1000,
      firstPartySite: 'nytimes.com',
      requestedDomain: 'doubleclick.net',
      requestedRegistrableDomain: 'doubleclick.net',
      resourceType: 'script',
      method: 'GET',
      thirdParty: true
    },
    {
      id: 'o2',
      timestamp: 1010,
      firstPartySite: 'cnn.com',
      requestedDomain: 'doubleclick.net',
      requestedRegistrableDomain: 'doubleclick.net',
      resourceType: 'image',
      method: 'GET',
      thirdParty: true
    },
    {
      id: 'o3',
      timestamp: 1020,
      firstPartySite: 'nytimes.com',
      requestedDomain: 'cloudflare.com',
      requestedRegistrableDomain: 'cloudflare.com',
      resourceType: 'stylesheet',
      method: 'GET',
      thirdParty: true
    }
  ];

  const mockCookies: CookieArtifact[] = [
    {
      id: 'c1',
      observedAt: 1000,
      name: 'IDE',
      domain: 'doubleclick.net',
      rawDomain: '.doubleclick.net',
      registrableDomain: 'doubleclick.net',
      path: '/',
      secure: true,
      httpOnly: true,
      sameSite: 'no_restriction',
      session: false,
      maskedValue: 'val1••••••88',
      sourceSite: 'nytimes.com',
      isThirdParty: true,
      forensicNotes: []
    }
  ];

  it('builds a connected graph with website, organization, and domain nodes', () => {
    const { nodes, links, stageColumns } = buildTrackingGraph(mockCookies, mockObservations);

    // Check node types
    const websiteNodes = nodes.filter((n) => n.type === 'website');
    const orgNodes = nodes.filter((n) => n.type === 'organization');
    const domainNodes = nodes.filter((n) => n.type === 'domain');

    expect(websiteNodes.some((n) => n.label === 'nytimes.com')).toBe(true);
    expect(websiteNodes.some((n) => n.label === 'cnn.com')).toBe(true);
    expect(orgNodes.some((n) => n.label === 'Google')).toBe(true);
    expect(domainNodes.some((n) => n.label === 'doubleclick.net')).toBe(true);

    // Check relationship links
    expect(links.length).toBeGreaterThanOrEqual(3);
    expect(links.some((l) => l.relationship === 'loads resource from' || l.relationship === 'operated by')).toBe(true);

    // Check 3-stage column partitioning
    expect(stageColumns.sites.length).toBe(2);
    expect(stageColumns.organizations.some((o) => o.label === 'Google')).toBe(true);
    expect(stageColumns.endpoints.some((e) => e.label === 'doubleclick.net')).toBe(true);
  });

  it('calculates cross-site reach for tracking organizations', () => {
    const { stageColumns } = buildTrackingGraph(mockCookies, mockObservations);
    const google = stageColumns.organizations.find((o) => o.label === 'Google');

    expect(google).toBeDefined();
    expect(google?.reachCount).toBe(2); // seen across nytimes.com and cnn.com
    expect(google?.reachPercentage).toBe(100);
  });

  it('generates a detailed forensic footprint narrative for an entity', () => {
    const footprint = getOrganizationFootprint('Google', mockCookies, mockObservations);

    expect(footprint).toBeDefined();
    expect(footprint?.organization).toBe('Google');
    expect(footprint?.visitedSites).toContain('nytimes.com');
    expect(footprint?.visitedSites).toContain('cnn.com');
    expect(footprint?.totalRequests).toBe(2);
    expect(footprint?.persistentCookieCount).toBe(1);
    expect(footprint?.narrative).toContain('Google tracking infrastructure was triggered across 2 of your visited websites');
  });

  it('filters graph by category', () => {
    const { nodes } = buildTrackingGraph(mockCookies, mockObservations, {
      category: 'CDN/infrastructure'
    });

    expect(nodes.some((n) => n.label === 'cloudflare.com')).toBe(true);
    expect(nodes.some((n) => n.label === 'doubleclick.net')).toBe(false);
  });

  it('filters graph by website', () => {
    const { nodes } = buildTrackingGraph(mockCookies, mockObservations, {
      website: 'cnn.com'
    });

    expect(nodes.some((n) => n.label === 'cnn.com')).toBe(true);
    expect(nodes.some((n) => n.label === 'nytimes.com')).toBe(false);
  });

  it('filters by crossSiteOnly and computes cross-site surveillance metrics', () => {
    const fullGraph = buildTrackingGraph(mockCookies, mockObservations);
    expect(fullGraph.crossSiteHubCount).toBe(1); // Google is seen on both nytimes and cnn
    expect(fullGraph.topSurveillanceEntity).toBe('Google');

    const filteredGraph = buildTrackingGraph(mockCookies, mockObservations, {
      crossSiteOnly: true
    });

    // Cloudflare is only on nytimes.com, not cross-site.
    // doubleclick.net / Google is on both nytimes and cnn.
    expect(filteredGraph.nodes.some((n) => n.label === 'Google')).toBe(true);
    expect(filteredGraph.nodes.some((n) => n.label === 'doubleclick.net')).toBe(true);
    expect(filteredGraph.nodes.some((n) => n.label === 'cloudflare.com')).toBe(false);
  });
});
