import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import {
  GitBranch,
  Target,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Info,
  Layers,
  Globe,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  ShieldAlert,
  AlertTriangle,
  ListTree,
  Filter,
  X,
  Crosshair
} from 'lucide-react';
import type { CookieArtifact, NetworkObservation, TrackerCategory } from '../../types';
import {
  buildTrackingGraph,
  getOrganizationFootprint,
  type GraphNode,
  type GraphLink,
  type OrganizationFootprint
} from '../../analysis/graph-builder';

interface TrackingGraphProps {
  cookies: CookieArtifact[];
  observations: NetworkObservation[];
}

export const TrackingGraph: React.FC<TrackingGraphProps> = ({ cookies, observations }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const currentTransformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity);

  // View mode: 'flow' (Visual Canvas), 'pathway' (Step-by-step Explorer), 'footprint' (Entity Deep Dive), 'cluster' (Physics)
  const [viewMode, setViewMode] = useState<'flow' | 'pathway' | 'footprint' | 'cluster'>('flow');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedWebsite, setSelectedWebsite] = useState<string>('All');
  const [crossSiteOnly, setCrossSiteOnly] = useState<boolean>(false);
  const [selectedOrgForFootprint, setSelectedOrgForFootprint] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [inspectedNode, setInspectedNode] = useState<GraphNode | null>(null);
  const [pathwaySite, setPathwaySite] = useState<string>('');

  // Fullscreen & Potential Concerns Highlighting
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [highlightConcerns, setHighlightConcerns] = useState<boolean>(false);
  const [concernsDrawerOpen, setConcernsDrawerOpen] = useState<boolean>(false);

  // Available websites
  const websiteOptions = useMemo(() => {
    const sites = new Set<string>();
    observations.forEach((o) => sites.add(o.firstPartySite));
    cookies.forEach((c) => {
      if (c.sourceSite) sites.add(c.sourceSite);
      if (!c.isThirdParty) sites.add(c.registrableDomain ?? c.domain);
    });
    return Array.from(sites).sort();
  }, [cookies, observations]);

  // Set default pathway site
  useEffect(() => {
    if (websiteOptions.length > 0 && !pathwaySite) {
      setPathwaySite(websiteOptions[0]);
    }
  }, [websiteOptions, pathwaySite]);

  // Available categories
  const categoryOptions: (TrackerCategory | 'All')[] = [
    'All',
    'Advertising',
    'Analytics',
    'Session replay',
    'Social tracking',
    'Fingerprinting',
    'Identity/authentication',
    'CDN/infrastructure',
    'Payment'
  ];

  // Graph Data
  const graphData = useMemo(() => {
    return buildTrackingGraph(cookies, observations, {
      category: selectedCategory as any,
      website: selectedWebsite,
      searchQuery,
      crossSiteOnly
    });
  }, [cookies, observations, selectedCategory, selectedWebsite, searchQuery, crossSiteOnly]);

  // Potential Concerns derivation & shortlisting
  const potentialConcerns = useMemo(() => {
    const concerns: {
      node: GraphNode;
      title: string;
      reason: string;
      category?: string;
      severity: 'high' | 'medium';
    }[] = [];

    graphData.nodes.forEach((node) => {
      if (node.isHighConcern) {
        let reason = 'High-risk intrusive tracker';
        if (node.category === 'Session replay') {
          reason = 'Records full mouse movements, clicks, and form keystrokes';
        } else if (node.category === 'Fingerprinting') {
          reason = 'Gathers hardware, canvas, and audio device fingerprints';
        } else if (node.category === 'Advertising') {
          reason = 'Behavioral profiling and targeted ad delivery network';
        } else if (node.category === 'Social tracking') {
          reason = 'Correlates browsing session with social media identity';
        }

        concerns.push({
          node,
          title: node.label,
          reason,
          category: node.category,
          severity: 'high'
        });
      } else if (node.stage === 'organization' && (node.reachCount || 0) >= 2) {
        concerns.push({
          node,
          title: node.label,
          reason: `Cross-site surveillance hub bridging ${node.reachCount} visited websites (${node.reachPercentage}% reach)`,
          category: node.category,
          severity: (node.reachCount || 0) >= 3 ? 'high' : 'medium'
        });
      } else if (node.hasPersistentCookies && node.stage !== 'site') {
        concerns.push({
          node,
          title: node.label,
          reason: 'Deposits persistent cross-session identifiers across visits',
          category: node.category,
          severity: 'medium'
        });
      }
    });

    return concerns.sort((a, b) => {
      if (a.severity !== b.severity) {
        return a.severity === 'high' ? -1 : 1;
      }
      return (b.node.reachCount || 0) - (a.node.reachCount || 0);
    });
  }, [graphData.nodes]);

  const concernNodeIds = useMemo(() => {
    return new Set(potentialConcerns.map((c) => c.node.id));
  }, [potentialConcerns]);

  // Keyboard shortcut: ESC to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // List of discovered tracking organizations
  const organizationList = useMemo(() => {
    return graphData.stageColumns.organizations.map((o) => o.label);
  }, [graphData]);

  // Set default organization for footprint if not selected
  useEffect(() => {
    if (organizationList.length > 0 && !selectedOrgForFootprint) {
      setSelectedOrgForFootprint(organizationList[0]);
    }
  }, [organizationList, selectedOrgForFootprint]);

  // Organization Footprint Data (for Footprint Mode)
  const footprintData: OrganizationFootprint | null = useMemo(() => {
    if (!selectedOrgForFootprint) return null;
    return getOrganizationFootprint(selectedOrgForFootprint, cookies, observations);
  }, [selectedOrgForFootprint, cookies, observations]);

  // ==========================================
  // D3 RENDERING (FLOW & CLUSTER MODES)
  // ==========================================
  useEffect(() => {
    if (viewMode !== 'flow' && viewMode !== 'cluster') return;
    if (!svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth || 940;
    const height = Math.max(containerRef.current.clientHeight || 620, 620);

    const svg = d3.select(svgRef.current);
    // Clear previous elements
    svg.selectAll('*').remove();

    const g = svg.append('g').attr('class', 'main-container');

    // Zoom setup with transform persistence
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.15, 3.5])
      .on('zoom', (event) => {
        currentTransformRef.current = event.transform;
        g.attr('transform', event.transform);
      });

    zoomBehaviorRef.current = zoom;
    svg.call(zoom);

    // Apply saved transform so the view never snaps away on filter/data changes
    if (currentTransformRef.current) {
      svg.call(zoom.transform, currentTransformRef.current);
    }

    // ==========================================
    // MODE 1: 3-STAGE HIERARCHICAL FLOW (DEFAULT)
    // ==========================================
    if (viewMode === 'flow') {
      const col1X = Math.max(160, Math.min(240, width * 0.18));
      const col2X = width / 2;
      const col3X = width - Math.max(180, Math.min(260, width * 0.2));

      const { sites, organizations, endpoints } = graphData.stageColumns;

      // Assign vertical Y positions with dynamic spacing
      const assignY = (list: GraphNode[], startY = 80, minGap = 48) => {
        const total = list.length;
        const availableHeight = height - 140;
        const gap = total > 1 ? Math.max(minGap, Math.min(85, availableHeight / (total - 1))) : 60;
        list.forEach((node, i) => {
          node.x = node.stage === 'site' ? col1X : node.stage === 'organization' ? col2X : col3X;
          node.y = startY + i * gap;
        });
      };

      assignY(sites, 80, 52);
      assignY(organizations, 80, 58);
      assignY(endpoints, 80, 44);

      // Column Header Labels
      const headers = [
        { label: '1. Visited Websites', x: col1X, sub: 'Sites you navigated to directly' },
        { label: '2. Surveillance Entities', x: col2X, sub: 'Cross-site correlation hubs' },
        { label: '3. Tracking Endpoints', x: col3X, sub: 'Domains receiving telemetry & cookies' }
      ];

      g.selectAll('.column-header')
        .data(headers)
        .enter()
        .append('g')
        .attr('class', 'column-header')
        .attr('transform', (d) => `translate(${d.x}, 35)`)
        .each(function (d) {
          const sel = d3.select(this);
          sel
            .append('text')
            .text(d.label)
            .attr('text-anchor', 'middle')
            .attr('fill', '#e2e8f0')
            .attr('font-size', '12px')
            .attr('font-weight', '600')
            .attr('font-family', 'Inter, system-ui, sans-serif');

          sel
            .append('text')
            .text(d.sub)
            .attr('y', 16)
            .attr('text-anchor', 'middle')
            .attr('fill', '#71717a')
            .attr('font-size', '11px');
        });

      // Node lookup map
      const nodeLookup = new Map<string, GraphNode>();
      graphData.nodes.forEach((n) => nodeLookup.set(n.id, n));

      // Draw Smooth Bezier Curved Ribbons for Links
      const linkGroup = g.append('g').attr('class', 'flow-links');

      const links = linkGroup
        .selectAll('path')
        .data(graphData.links)
        .enter()
        .append('path')
        .attr('class', 'graph-link')
        .attr('d', (l) => {
          const sId = typeof l.source === 'string' ? l.source : (l.source as any).id;
          const tId = typeof l.target === 'string' ? l.target : (l.target as any).id;
          const s = nodeLookup.get(sId);
          const t = nodeLookup.get(tId);
          if (!s || !t || s.x === undefined || s.y === undefined || t.x === undefined || t.y === undefined) {
            return '';
          }

          const midX = (s.x + t.x) / 2;
          return `M ${s.x + 20} ${s.y} C ${midX} ${s.y}, ${midX} ${t.y}, ${t.x - 20} ${t.y}`;
        })
        .attr('fill', 'none')
        .attr('stroke', (l) => {
          if (!highlightConcerns) return '#334155';
          const sId = typeof l.source === 'string' ? l.source : (l.source as any).id;
          const tId = typeof l.target === 'string' ? l.target : (l.target as any).id;
          return concernNodeIds.has(sId) || concernNodeIds.has(tId) ? '#f43f5e' : '#1e293b';
        })
        .attr('stroke-width', (l) => {
          const sId = typeof l.source === 'string' ? l.source : (l.source as any).id;
          const tId = typeof l.target === 'string' ? l.target : (l.target as any).id;
          if (highlightConcerns && (concernNodeIds.has(sId) || concernNodeIds.has(tId))) {
            return 2.5;
          }
          return Math.min(Math.max(l.count * 0.8, 1.2), 4);
        })
        .attr('stroke-opacity', (l) => {
          if (!highlightConcerns) return 0.45;
          const sId = typeof l.source === 'string' ? l.source : (l.source as any).id;
          const tId = typeof l.target === 'string' ? l.target : (l.target as any).id;
          return concernNodeIds.has(sId) || concernNodeIds.has(tId) ? 0.75 : 0.05;
        });

      // Draw Node Glyphs
      const nodeGroup = g.append('g').attr('class', 'flow-nodes');

      const nodeEnter = nodeGroup
        .selectAll('g')
        .data(graphData.nodes)
        .enter()
        .append('g')
        .attr('class', 'graph-node')
        .attr('transform', (d) => `translate(${d.x || 0}, ${d.y || 0})`)
        .attr('cursor', 'pointer')
        .attr('opacity', (d) => {
          if (!highlightConcerns) return 1;
          const isConcern = concernNodeIds.has(d.id);
          const isConnectedSite =
            d.stage === 'site' &&
            graphData.links.some((l) => {
              const sId = typeof l.source === 'string' ? l.source : (l.source as any).id;
              const tId = typeof l.target === 'string' ? l.target : (l.target as any).id;
              return sId === d.id && concernNodeIds.has(tId);
            });
          return isConcern || isConnectedSite ? 1 : 0.18;
        });

      // Direct D3 Hover and Click Handlers (NO REACT STATE UPDATES ON HOVER TO PREVENT ZOOM RESETS!)
      nodeEnter
        .on('mouseenter', function (_event, d) {
          const connectedIds = new Set<string>([d.id]);
          graphData.links.forEach((l) => {
            const s = typeof l.source === 'string' ? l.source : (l.source as any).id;
            const t = typeof l.target === 'string' ? l.target : (l.target as any).id;
            if (s === d.id) connectedIds.add(t);
            if (t === d.id) connectedIds.add(s);
          });

          // Highlight links
          links
            .attr('stroke', (l: any) => {
              const s = typeof l.source === 'string' ? l.source : l.source.id;
              const t = typeof l.target === 'string' ? l.target : l.target.id;
              return s === d.id || t === d.id ? '#00f0ff' : '#1e293b';
            })
            .attr('stroke-opacity', (l: any) => {
              const s = typeof l.source === 'string' ? l.source : l.source.id;
              const t = typeof l.target === 'string' ? l.target : l.target.id;
              return s === d.id || t === d.id ? 1 : 0.08;
            })
            .attr('stroke-width', (l: any) => {
              const s = typeof l.source === 'string' ? l.source : l.source.id;
              const t = typeof l.target === 'string' ? l.target : l.target.id;
              return s === d.id || t === d.id ? 3 : 1.2;
            });

          // Dim unconnected nodes
          nodeGroup.selectAll('g.graph-node').attr('opacity', (n: any) => (connectedIds.has(n.id) ? 1 : 0.22));

          // Highlight current circle
          d3.select(this).select('circle').attr('stroke', '#00f0ff').attr('stroke-width', 3);
        })
        .on('mouseleave', function () {
          // Restore links
          links
            .attr('stroke', (l: any) => {
              if (!highlightConcerns) return '#334155';
              const sId = typeof l.source === 'string' ? l.source : l.source.id;
              const tId = typeof l.target === 'string' ? l.target : l.target.id;
              return concernNodeIds.has(sId) || concernNodeIds.has(tId) ? '#f43f5e' : '#1e293b';
            })
            .attr('stroke-opacity', (l: any) => {
              if (!highlightConcerns) return 0.45;
              const sId = typeof l.source === 'string' ? l.source : l.source.id;
              const tId = typeof l.target === 'string' ? l.target : l.target.id;
              return concernNodeIds.has(sId) || concernNodeIds.has(tId) ? 0.75 : 0.05;
            })
            .attr('stroke-width', (l: any) => {
              const sId = typeof l.source === 'string' ? l.source : l.source.id;
              const tId = typeof l.target === 'string' ? l.target : l.target.id;
              if (highlightConcerns && (concernNodeIds.has(sId) || concernNodeIds.has(tId))) {
                return 2.5;
              }
              return Math.min(Math.max(l.count * 0.8, 1.2), 4);
            });

          // Restore nodes
          nodeGroup.selectAll('g.graph-node').attr('opacity', (d: any) => {
            if (!highlightConcerns) return 1;
            const isConcern = concernNodeIds.has(d.id);
            const isConnectedSite =
              d.stage === 'site' &&
              graphData.links.some((l: any) => {
                const sId = typeof l.source === 'string' ? l.source : l.source.id;
                const tId = typeof l.target === 'string' ? l.target : l.target.id;
                return sId === d.id && concernNodeIds.has(tId);
              });
            return isConcern || isConnectedSite ? 1 : 0.18;
          });

          // Restore circle stroke
          d3.select(this)
            .select('circle')
            .attr('stroke', (d: any) => (highlightConcerns && concernNodeIds.has(d.id) ? '#f43f5e' : '#070d18'))
            .attr('stroke-width', (d: any) => (highlightConcerns && concernNodeIds.has(d.id) ? 3 : 2.5));
        })
        .on('click', (_event, d) => {
          setInspectedNode(d);
        });

      // Node Circles
      nodeEnter
        .append('circle')
        .attr('r', (d) => (d.stage === 'organization' ? 15 : d.stage === 'site' ? 12 : 10))
        .attr('fill', (d) => {
          if (d.stage === 'site') return '#00f0ff';
          if (d.stage === 'organization') return '#a855f7';
          if (d.isHighConcern) return '#ff3366';
          return '#38bdf8';
        })
        .attr('stroke', (d) => (highlightConcerns && concernNodeIds.has(d.id) ? '#f43f5e' : '#070d18'))
        .attr('stroke-width', (d) => (highlightConcerns && concernNodeIds.has(d.id) ? 3 : 2.5));

      // Node Text Labels
      nodeEnter
        .append('text')
        .text((d) => (d.label.length > 24 ? `${d.label.slice(0, 22)}…` : d.label))
        .attr('x', (d) => (d.stage === 'site' ? -20 : d.stage === 'organization' ? 0 : 20))
        .attr('y', (d) => (d.stage === 'organization' ? -22 : 4))
        .attr('text-anchor', (d) => (d.stage === 'site' ? 'end' : d.stage === 'organization' ? 'middle' : 'start'))
        .attr('fill', '#e2e8f0')
        .attr('font-size', '11px')
        .attr('font-family', 'JetBrains Mono, monospace')
        .attr('font-weight', (d) => (d.stage === 'organization' ? '700' : '500'));

      // Reach Badges on Organization Nodes
      nodeEnter
        .filter((d) => d.stage === 'organization' && Boolean(d.reachCount))
        .append('text')
        .text((d) => `${d.reachCount} site(s) (${d.reachPercentage}%)`)
        .attr('y', 26)
        .attr('text-anchor', 'middle')
        .attr('fill', '#c084fc')
        .attr('font-size', '9px')
        .attr('font-family', 'JetBrains Mono, monospace');
    }

    // ==========================================
    // MODE 2: CLUSTERED FORCE NETWORK (PHYSICS)
    // ==========================================
    if (viewMode === 'cluster') {
      const nodes: GraphNode[] = graphData.nodes.map((d) => ({ ...d }));
      const links: GraphLink[] = graphData.links.map((d) => ({ ...d }));

      const simulation = d3
        .forceSimulation<GraphNode>(nodes)
        .force(
          'link',
          d3
            .forceLink<GraphNode, GraphLink>(links)
            .id((d) => d.id)
            .distance(110)
        )
        .force('charge', d3.forceManyBody().strength(-360))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collide', d3.forceCollide().radius(38));

      const link = g
        .append('g')
        .selectAll('line')
        .data(links)
        .enter()
        .append('line')
        .attr('stroke', (d: any) => {
          if (!highlightConcerns) return '#334155';
          const s = typeof d.source === 'string' ? d.source : d.source.id;
          const t = typeof d.target === 'string' ? d.target : d.target.id;
          return concernNodeIds.has(s) || concernNodeIds.has(t) ? '#f43f5e' : '#1e293b';
        })
        .attr('stroke-width', (d) => Math.min(Math.max(d.count * 1.2, 1.2), 5))
        .attr('stroke-opacity', (d: any) => {
          if (!highlightConcerns) return 0.5;
          const s = typeof d.source === 'string' ? d.source : d.source.id;
          const t = typeof d.target === 'string' ? d.target : d.target.id;
          return concernNodeIds.has(s) || concernNodeIds.has(t) ? 0.75 : 0.05;
        });

      const node = g
        .append('g')
        .selectAll('g')
        .data(nodes)
        .enter()
        .append('g')
        .attr('class', 'graph-node')
        .attr('cursor', 'pointer')
        .attr('opacity', (d) => {
          if (!highlightConcerns) return 1;
          return concernNodeIds.has(d.id) ? 1 : 0.18;
        })
        .call(
          d3
            .drag<SVGGElement, GraphNode>()
            .on('start', (event, d) => {
              if (!event.active) simulation.alphaTarget(0.3).restart();
              d.fx = d.x;
              d.fy = d.y;
            })
            .on('drag', (event, d) => {
              d.fx = event.x;
              d.fy = event.y;
            })
            .on('end', (event, d) => {
              if (!event.active) simulation.alphaTarget(0);
              d.fx = null;
              d.fy = null;
            })
        )
        .on('click', (_event, d) => setInspectedNode(d));

      node
        .append('circle')
        .attr('r', (d) => (d.type === 'organization' ? 18 : d.type === 'website' ? 15 : 12))
        .attr('fill', (d) => {
          if (d.type === 'website') return '#00f0ff';
          if (d.type === 'organization') return '#a855f7';
          if (d.isHighConcern) return '#ff3366';
          return '#38bdf8';
        })
        .attr('stroke', (d) => (highlightConcerns && concernNodeIds.has(d.id) ? '#f43f5e' : '#070d18'))
        .attr('stroke-width', (d) => (highlightConcerns && concernNodeIds.has(d.id) ? 3 : 2.5));

      node
        .append('text')
        .text((d) => (d.label.length > 18 ? `${d.label.slice(0, 16)}…` : d.label))
        .attr('x', 0)
        .attr('y', 28)
        .attr('text-anchor', 'middle')
        .attr('fill', '#e2e8f0')
        .attr('font-size', '10px')
        .attr('font-family', 'JetBrains Mono, monospace');

      simulation.on('tick', () => {
        link
          .attr('x1', (d: any) => d.source.x)
          .attr('y1', (d: any) => d.source.y)
          .attr('x2', (d: any) => d.target.x)
          .attr('y2', (d: any) => d.target.y);

        node.attr('transform', (d) => `translate(${d.x || 0},${d.y || 0})`);
      });

      return () => {
        simulation.stop();
      };
    }
  }, [graphData, viewMode, isFullscreen, highlightConcerns, concernNodeIds]); // NOTE: hoveredNodeId is intentionally NOT here, so zoom NEVER resets on hover!

  // ==========================================
  // ON-CANVAS NAVIGATION CONTROLS
  // ==========================================
  const handleZoomIn = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current).transition().duration(250).call(zoomBehaviorRef.current.scaleBy, 1.35);
  };

  const handleZoomOut = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current).transition().duration(250).call(zoomBehaviorRef.current.scaleBy, 0.75);
  };

  const handleResetZoom = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    currentTransformRef.current = d3.zoomIdentity;
    d3.select(svgRef.current).transition().duration(350).call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
  };

  const handleFitToView = () => {
    if (!svgRef.current || !containerRef.current || !zoomBehaviorRef.current) return;
    const svg = d3.select(svgRef.current);
    const g = svg.select<SVGGElement>('g.main-container');
    if (g.empty()) return;

    const bounds = (g.node() as SVGGElement).getBBox();
    const parent = containerRef.current;
    const fullWidth = parent.clientWidth || 940;
    const fullHeight = parent.clientHeight || 620;

    if (bounds.width === 0 || bounds.height === 0) return;

    const midX = bounds.x + bounds.width / 2;
    const midY = bounds.y + bounds.height / 2;
    const scale = 0.85 / Math.max(bounds.width / fullWidth, bounds.height / fullHeight);
    const translate = [fullWidth / 2 - scale * midX, fullHeight / 2 - scale * midY];

    const transform = d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale);
    currentTransformRef.current = transform;
    svg.transition().duration(400).call(zoomBehaviorRef.current.transform, transform);
  };

  // Auto-fit graph view when toggling fullscreen
  useEffect(() => {
    const timer = setTimeout(() => {
      handleFitToView();
    }, 180);
    return () => clearTimeout(timer);
  }, [isFullscreen]);

  // Center on inspected node
  const centerOnNode = (node: GraphNode) => {
    if (!svgRef.current || !containerRef.current || !zoomBehaviorRef.current) return;
    if (node.x === undefined || node.y === undefined) return;
    const parent = containerRef.current;
    const fullWidth = parent.clientWidth || 940;
    const fullHeight = parent.clientHeight || 620;
    const scale = currentTransformRef.current.k || 1.1;
    const x = fullWidth / 2 - node.x * scale;
    const y = fullHeight / 2 - node.y * scale;

    const transform = d3.zoomIdentity.translate(x, y).scale(scale);
    currentTransformRef.current = transform;
    d3.select(svgRef.current).transition().duration(400).call(zoomBehaviorRef.current.transform, transform);
  };

  // ==========================================
  // PATHWAY EXPLORER HELPERS
  // ==========================================
  const pathwayDetails = useMemo(() => {
    if (!pathwaySite) return null;

    const siteObservations = observations.filter((o) => o.firstPartySite === pathwaySite);
    const siteCookies = cookies.filter(
      (c) => c.sourceSite === pathwaySite || (!c.isThirdParty && (c.registrableDomain === pathwaySite || c.domain === pathwaySite))
    );

    // Group by organization
    const orgMap = new Map<
      string,
      {
        orgName: string;
        category: string;
        endpoints: Set<string>;
        requestCount: number;
        cookies: CookieArtifact[];
        isCrossSite: boolean;
        reachSites: Set<string>;
      }
    >();

    // Scan observations
    for (const obs of siteObservations) {
      const d = obs.requestedRegistrableDomain ?? obs.requestedDomain;
      const orgNode = graphData.nodes.find((n) => n.stage === 'organization' && n.connectedEndpoints?.includes(d));
      const orgName = orgNode ? orgNode.label : obs.thirdParty ? 'Independent / Unaffiliated' : 'First Party';
      const category = orgNode?.category ?? 'Unknown';

      if (!orgMap.has(orgName)) {
        orgMap.set(orgName, {
          orgName,
          category,
          endpoints: new Set(),
          requestCount: 0,
          cookies: [],
          isCrossSite: (orgNode?.reachCount ?? 0) >= 2,
          reachSites: new Set(orgNode?.connectedSites ?? [])
        });
      }
      const entry = orgMap.get(orgName)!;
      entry.endpoints.add(d);
      entry.requestCount += 1;
    }

    // Scan cookies
    for (const cookie of siteCookies) {
      const d = cookie.registrableDomain ?? cookie.domain;
      const orgNode = graphData.nodes.find((n) => n.stage === 'organization' && n.connectedEndpoints?.includes(d));
      const orgName = orgNode ? orgNode.label : cookie.isThirdParty ? 'Independent / Unaffiliated' : 'First Party';
      const category = orgNode?.category ?? 'Unknown';

      if (!orgMap.has(orgName)) {
        orgMap.set(orgName, {
          orgName,
          category,
          endpoints: new Set(),
          requestCount: 0,
          cookies: [],
          isCrossSite: (orgNode?.reachCount ?? 0) >= 2,
          reachSites: new Set(orgNode?.connectedSites ?? [])
        });
      }
      const entry = orgMap.get(orgName)!;
      entry.endpoints.add(d);
      entry.cookies.push(cookie);
    }

    return {
      site: pathwaySite,
      totalRequests: siteObservations.length,
      totalCookies: siteCookies.length,
      organizations: Array.from(orgMap.values()).sort((a, b) => {
        // Put cross-site hubs first
        if (a.isCrossSite !== b.isCrossSite) return a.isCrossSite ? -1 : 1;
        return b.requestCount - a.requestCount;
      })
    };
  }, [pathwaySite, observations, cookies, graphData.nodes]);

  return (
    <div className="space-y-4">
      {/* MINIMALIST FORENSIC HEADER BANNER */}
      <div className="bg-cyber-900 border border-cyber-800 rounded-xl p-5">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <h2 className="text-sm font-semibold text-white">
              Tracking Provenance & Cross-Site Reach
            </h2>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Traces which third-party entities bridge separate websites you visit to correlate browsing identity and deposit persistent cookies.
            </p>
          </div>

          {/* Minimalist Metrics */}
          <div className="grid grid-cols-3 gap-2.5 shrink-0 text-xs w-full lg:w-auto">
            <div className="bg-cyber-950 border border-cyber-800 px-3 py-2 rounded-lg text-center">
              <div className="text-[10px] text-neutral-500">Cross-site hubs</div>
              <div className="text-sm font-semibold font-mono text-white mt-0.5">
                {graphData.crossSiteHubCount}
              </div>
            </div>
            <div className="bg-cyber-950 border border-cyber-800 px-3 py-2 rounded-lg text-center">
              <div className="text-[10px] text-neutral-500">Top network</div>
              <div className="text-sm font-semibold font-mono text-neutral-200 mt-0.5 truncate max-w-[100px]" title={graphData.topSurveillanceEntity ?? 'None'}>
                {graphData.topSurveillanceEntity ?? 'None'}
              </div>
            </div>
            <div className="bg-cyber-950 border border-cyber-800 px-3 py-2 rounded-lg text-center">
              <div className="text-[10px] text-neutral-500">Active links</div>
              <div className="text-sm font-semibold font-mono text-white mt-0.5">
                {graphData.links.length}
              </div>
            </div>
          </div>
        </div>

        {/* Minimalist Segmented Mode Selector */}
        <div className="mt-4 pt-3 border-t border-cyber-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 bg-cyber-950 p-1 rounded-lg border border-cyber-800">
            <button
              onClick={() => setViewMode('flow')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'flow'
                  ? 'bg-cyber-850 text-white font-medium shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <GitBranch className="w-3.5 h-3.5" />
              Flow Map
            </button>
            <button
              onClick={() => setViewMode('pathway')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'pathway'
                  ? 'bg-cyber-850 text-white font-medium shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <ListTree className="w-3.5 h-3.5" />
              Pathway Explorer
            </button>
            <button
              onClick={() => setViewMode('footprint')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'footprint'
                  ? 'bg-cyber-850 text-white font-medium shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              Entity Footprint
            </button>
            <button
              onClick={() => setViewMode('cluster')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'cluster'
                  ? 'bg-cyber-850 text-white font-medium shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Cluster Physics
            </button>
          </div>

          <div className="text-xs text-neutral-500">
            {graphData.totalVisitedSites} visited site(s) analyzed
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: PATHWAY EXPLORER (STRUCTURED, ZERO-CONFUSION MASTER-DETAIL TREE) */}
      {/* ========================================================================= */}
      {viewMode === 'pathway' && (
        <div className="space-y-4">
          {/* Site Selector Bar */}
          <div className="bg-cyber-900 border border-slate-800 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="w-4 h-4" /> Select Visited Site:
              </span>
              <select
                value={pathwaySite}
                onChange={(e) => setPathwaySite(e.target.value)}
                className="bg-cyber-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
              >
                {websiteOptions.map((site) => (
                  <option key={site} value={site}>
                    {site}
                  </option>
                ))}
              </select>
            </div>
            {pathwayDetails && (
              <div className="text-xs font-mono text-slate-400 flex items-center gap-3">
                <span>{pathwayDetails.organizations.length} tracking entities reached</span>
                <span>·</span>
                <span>{pathwayDetails.totalRequests} network events</span>
                <span>·</span>
                <span>{pathwayDetails.totalCookies} cookies</span>
              </div>
            )}
          </div>

          {pathwayDetails ? (
            <div className="space-y-3">
              <div className="bg-cyber-900/50 border border-slate-800/80 rounded-lg p-3 text-xs text-slate-300">
                When you navigated to <strong className="text-cyan-400 font-mono">{pathwayDetails.site}</strong>, your
                browser communicated with the following third parties. Entities marked{' '}
                <span className="px-1.5 py-0.5 rounded bg-purple-950 border border-purple-500/40 text-purple-300 font-mono text-[10px] font-bold">
                  CROSS-SITE HUB
                </span>{' '}
                can correlate your identity with other websites you visit.
              </div>

              <div className="grid grid-cols-1 gap-3">
                {pathwayDetails.organizations.map((org) => {
                  const hasPersistentCookie = org.cookies.some((c) => !c.session);
                  return (
                    <div
                      key={org.orgName}
                      className={`bg-cyber-900 border rounded-xl p-4 transition-all ${
                        org.isCrossSite ? 'border-purple-500/40 shadow-lg shadow-purple-950/20' : 'border-slate-800'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-3 h-3 rounded-full ${
                              org.isCrossSite ? 'bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.8)]' : 'bg-slate-400'
                            }`}
                          />
                          <h3 className="font-mono font-bold text-slate-100 text-sm">{org.orgName}</h3>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyber-950 border border-slate-800 text-teal-300">
                            {org.category}
                          </span>
                          {org.isCrossSite && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-950 border border-purple-500/40 text-purple-300 flex items-center gap-1">
                              <Target className="w-2.5 h-2.5" /> CROSS-SITE HUB ({org.reachSites.size} sites)
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
                          <span>{org.requestCount} request(s)</span>
                          <span>{org.cookies.length} cookie(s)</span>
                          {hasPersistentCookie && (
                            <span className="text-rose-400 font-semibold flex items-center gap-1">
                              <ShieldAlert className="w-3 h-3" /> Persistent Cookie
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Forensic Chain Details */}
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                        {/* Endpoints */}
                        <div className="bg-cyber-950 p-3 rounded-lg border border-slate-800/80 space-y-1.5">
                          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold flex items-center gap-1">
                            <Layers className="w-3 h-3 text-cyan-400" /> Endpoints Called:
                          </div>
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {Array.from(org.endpoints).map((ep) => (
                              <span
                                key={ep}
                                className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700/80 text-cyan-300 text-[11px]"
                              >
                                {ep}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Cross-site correlation scope */}
                        <div className="bg-cyber-950 p-3 rounded-lg border border-slate-800/80 space-y-1.5">
                          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold flex items-center gap-1">
                            <GitBranch className="w-3 h-3 text-purple-400" /> Correlation Reach:
                          </div>
                          {org.isCrossSite ? (
                            <div className="text-slate-300 text-[11px] leading-relaxed">
                              Observed linking <strong className="text-cyan-300">{pathwayDetails.site}</strong> with:{' '}
                              {Array.from(org.reachSites)
                                .filter((s) => s !== pathwayDetails.site)
                                .map((s) => (
                                  <span key={s} className="underline decoration-purple-500/60 mr-1.5">
                                    {s}
                                  </span>
                                ))}
                            </div>
                          ) : (
                            <div className="text-slate-400 text-[11px]">
                              Only observed on this website so far. No cross-site bridge detected.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-cyber-900 border border-slate-800 rounded-xl p-12 text-center text-slate-400 text-xs">
              Select a visited website to explore its surveillance chain of custody.
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: VISUAL FLOW MAP (3-STAGE CANVAS) & CLUSTER PHYSICS */}
      {/* ========================================================================= */}
      {(viewMode === 'flow' || viewMode === 'cluster') && (
        <div
          className={
            isFullscreen
              ? 'fixed inset-0 z-50 bg-[#090a0f] p-4 flex flex-col w-screen h-screen overflow-hidden'
              : 'space-y-3'
          }
        >
          {/* Controls & Noise Filter Bar */}
          <div className="bg-cyber-900 border border-cyber-800 p-3 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-sm">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* If fullscreen, show mini title */}
              {isFullscreen && (
                <div className="flex items-center gap-2 mr-1">
                  <span className="text-xs font-semibold text-white">WhoIsTrackingMe</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-cyber-800 text-neutral-300 font-mono">
                    Fullscreen
                  </span>
                </div>
              )}

              {/* Cross-Site Hubs Only Clutter Reduction Toggle */}
              <label
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                  crossSiteOnly
                    ? 'bg-purple-950/80 border-purple-500/70 text-purple-200 shadow-sm'
                    : 'bg-cyber-950 border-cyber-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
                }`}
                title="Filter out single-site assets to view only multi-site surveillance bridges"
              >
                <input
                  type="checkbox"
                  checked={crossSiteOnly}
                  onChange={(e) => setCrossSiteOnly(e.target.checked)}
                  className="rounded border-neutral-700 bg-cyber-900 text-purple-500 focus:ring-purple-400 h-3.5 w-3.5"
                />
                <Filter className="w-3 h-3 text-purple-400" />
                Cross-Site Hubs (2+)
              </label>

              {/* Category Filter */}
              <div className="flex items-center gap-1 text-xs">
                <span className="text-neutral-400 font-medium flex items-center gap-1">
                  <SlidersHorizontal className="w-3 h-3 text-neutral-500" /> Cat:
                </span>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-cyber-950 border border-cyber-800 rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-neutral-600 font-mono"
                >
                  {categoryOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Website Filter */}
              <div className="flex items-center gap-1 text-xs">
                <span className="text-neutral-400 font-medium">Site:</span>
                <select
                  value={selectedWebsite}
                  onChange={(e) => setSelectedWebsite(e.target.value)}
                  className="bg-cyber-950 border border-cyber-800 rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-neutral-600 font-mono max-w-[170px] truncate"
                >
                  <option value="All">All Visited Sites</option>
                  {websiteOptions.map((site) => (
                    <option key={site} value={site}>
                      {site}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter domain or entity..."
                  className="bg-cyber-950 border border-cyber-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600 font-mono w-44"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Highlight Concerns Toggle Button */}
              <button
                onClick={() => setHighlightConcerns((prev) => !prev)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  highlightConcerns
                    ? 'bg-rose-950/80 border-rose-700 text-rose-200 shadow-sm'
                    : 'bg-cyber-950 border-cyber-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
                }`}
                title="Highlight potential concerns, cross-site hubs, and persistent cookies"
              >
                <AlertTriangle className={`w-3.5 h-3.5 ${highlightConcerns ? 'text-rose-400' : 'text-neutral-400'}`} />
                Highlight Concerns
                {potentialConcerns.length > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-semibold ${
                      highlightConcerns ? 'bg-rose-800 text-white' : 'bg-cyber-800 text-neutral-300'
                    }`}
                  >
                    {potentialConcerns.length}
                  </span>
                )}
              </button>

              {/* Shortlist Concerns Drawer Toggle */}
              <button
                onClick={() => setConcernsDrawerOpen((prev) => !prev)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  concernsDrawerOpen
                    ? 'bg-white/[0.1] border-neutral-600 text-white'
                    : 'bg-cyber-950 border-cyber-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
                }`}
                title="Open shortlisted high-risk issues panel"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-neutral-400" />
                Shortlist ({potentialConcerns.length})
              </button>

              {/* Fullscreen Button */}
              <button
                onClick={() => setIsFullscreen((prev) => !prev)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border bg-cyber-950 border-cyber-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700 transition-colors"
                title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Open Fullscreen Graph View'}
              >
                {isFullscreen ? (
                  <>
                    <Minimize2 className="w-3.5 h-3.5 text-cyan-400" />
                    Exit (Esc)
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3.5 h-3.5 text-neutral-400" />
                    Fullscreen
                  </>
                )}
              </button>

              <span className="text-xs text-neutral-500 font-mono hidden xl:inline ml-1">
                {graphData.nodes.length} nodes · {graphData.links.length} pathways
              </span>
            </div>
          </div>

          {/* SVG Canvas Container */}
          <div
            ref={containerRef}
            className={`relative w-full ${
              isFullscreen ? 'flex-1 min-h-0' : 'h-[640px]'
            } bg-[#0c0e14] border border-cyber-800 rounded-xl overflow-hidden shadow-sm`}
          >
            <svg
              ref={svgRef}
              className="w-full h-full block cursor-grab active:cursor-grabbing"
              style={{ background: '#0a0c12' }}
            />

            {/* FLOATING ON-CANVAS NAVIGATION CONTROLS */}
            <div className="absolute top-4 left-4 flex flex-col gap-1 bg-cyber-900 p-1 rounded-lg border border-cyber-800 shadow-md z-10">
              <button
                onClick={handleZoomIn}
                className="p-2 rounded-md bg-cyber-950 hover:bg-cyber-850 text-neutral-300 hover:text-white transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={handleZoomOut}
                className="p-2 rounded-md bg-cyber-950 hover:bg-cyber-850 text-neutral-300 hover:text-white transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={handleFitToView}
                className="p-2 rounded-md bg-cyber-950 hover:bg-cyber-850 text-neutral-300 hover:text-white transition-colors"
                title="Fit all nodes to view"
              >
                <Crosshair className="w-4 h-4" />
              </button>
              <button
                onClick={handleResetZoom}
                className="p-2 rounded-md bg-cyber-950 hover:bg-cyber-850 text-neutral-300 hover:text-white transition-colors"
                title="Reset zoom & position (1:1)"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsFullscreen((prev) => !prev)}
                className="p-2 rounded-md bg-cyber-950 hover:bg-cyber-850 text-neutral-300 hover:text-white transition-colors"
                title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Expand to Fullscreen'}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4 text-cyan-400" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* CANVAS FOOTER LEGEND */}
            <div className="absolute bottom-4 left-4 bg-cyber-900/90 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-cyber-800 shadow-sm flex items-center gap-3 text-[11px] text-neutral-400 pointer-events-none">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400" /> Visited Site
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-400" /> Surveillance Org
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-400" /> Endpoint
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500" /> High-Concern
              </span>
            </div>

            {/* INTERACTION HINT */}
            <div className="absolute bottom-4 right-4 bg-cyber-900/80 backdrop-blur-sm px-2.5 py-1 rounded-md text-[10px] text-neutral-500 border border-cyber-800 pointer-events-none">
              Drag to pan · Scroll to zoom · Click node to inspect {isFullscreen && '· Press Esc to exit'}
            </div>

            {/* Empty state */}
            {graphData.nodes.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-neutral-400 text-xs">
                <Info className="w-8 h-8 text-neutral-500 opacity-40 mb-2" />
                No tracking relationships match your active filters.
                {crossSiteOnly && (
                  <span className="mt-1 text-purple-400">
                    Try disabling &quot;Cross-Site Hubs Only&quot; to see single-site endpoints.
                  </span>
                )}
              </div>
            )}

            {/* SHORTLIST CONCERNS DRAWER */}
            {concernsDrawerOpen && (
              <div className="absolute top-4 right-4 w-84 max-w-[calc(100vw-2rem)] max-h-[85%] bg-cyber-900/95 backdrop-blur-md border border-cyber-700 p-4 rounded-xl shadow-2xl pointer-events-auto text-xs flex flex-col z-30">
                <div className="flex items-center justify-between pb-2.5 border-b border-cyber-800">
                  <div className="flex items-center gap-1.5 font-semibold text-white text-sm">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    Shortlisted Concerns ({potentialConcerns.length})
                  </div>
                  <button
                    onClick={() => setConcernsDrawerOpen(false)}
                    className="p-1 rounded hover:bg-cyber-800 text-neutral-400 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-[11px] text-neutral-400 mt-1.5 mb-2.5 leading-snug">
                  Identified tracking entities with high cross-site reach, behavioral recording, or persistent cookies. Click any item to center on canvas.
                </p>

                <div className="overflow-y-auto space-y-2 pr-1 flex-1">
                  {potentialConcerns.length === 0 ? (
                    <div className="py-8 text-center text-neutral-500 text-xs">
                      No high-concern trackers or multi-site hubs detected under active filters.
                    </div>
                  ) : (
                    potentialConcerns.map((concern) => (
                      <div
                        key={concern.node.id}
                        onClick={() => {
                          centerOnNode(concern.node);
                          setInspectedNode(concern.node);
                        }}
                        className="p-2.5 rounded-lg bg-cyber-950 border border-cyber-800/80 hover:border-neutral-600 cursor-pointer transition-all hover:bg-cyber-850 group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-mono font-medium text-xs text-white group-hover:text-cyan-300 truncate">
                            {concern.title}
                          </span>
                          <span
                            className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${
                              concern.severity === 'high'
                                ? 'bg-rose-950/70 border border-rose-800/60 text-rose-300'
                                : 'bg-amber-950/70 border border-amber-800/60 text-amber-300'
                            }`}
                          >
                            {concern.severity === 'high' ? 'High Risk' : 'Medium'}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-400 mt-1 leading-snug">
                          {concern.reason}
                        </p>
                        <div className="mt-1.5 flex items-center justify-between text-[10px] text-neutral-500 font-mono">
                          <span className="text-neutral-400 capitalize">{concern.category || concern.node.stage}</span>
                          <span className="text-cyan-400 group-hover:underline flex items-center gap-0.5">
                            Focus on graph →
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* INSPECTED NODE EVIDENCE DRAWER */}
            {inspectedNode && (
              <div
                className={`absolute top-4 ${
                  concernsDrawerOpen ? 'right-92' : 'right-4'
                } max-w-sm w-full bg-cyber-900/95 backdrop-blur-md border border-cyber-700 p-4 rounded-xl shadow-2xl pointer-events-auto text-xs space-y-3 z-20`}
              >
                <div className="flex items-center justify-between border-b border-cyber-800 pb-2">
                  <span className="font-mono font-bold text-white truncate text-sm">
                    {inspectedNode.label}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => centerOnNode(inspectedNode)}
                      className="px-2 py-0.5 rounded bg-cyber-800 hover:bg-cyber-700 text-cyan-400 text-[10px] font-mono font-semibold"
                      title="Center node in canvas"
                    >
                      Center
                    </button>
                    <button
                      onClick={() => setInspectedNode(null)}
                      className="p-1 rounded hover:bg-cyber-800 text-neutral-400 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 text-neutral-300">
                  <div>
                    Type: <strong className="text-cyan-400 capitalize">{inspectedNode.type}</strong>
                  </div>
                  {inspectedNode.organization && (
                    <div>
                      Parent Entity: <strong className="text-purple-400">{inspectedNode.organization}</strong>
                    </div>
                  )}
                  {inspectedNode.category && (
                    <div>
                      Category: <strong className="text-teal-400">{inspectedNode.category}</strong>
                    </div>
                  )}
                  {inspectedNode.reachCount !== undefined && inspectedNode.reachCount > 0 && (
                    <div>
                      Cross-Site Penetration:{' '}
                      <strong className="text-amber-400">
                        {inspectedNode.reachCount} site(s) ({inspectedNode.reachPercentage}%)
                      </strong>
                    </div>
                  )}
                  <div>
                    Total Telemetry Events:{' '}
                    <strong className="text-white font-mono">{inspectedNode.artifactCount}</strong>
                  </div>
                  {inspectedNode.hasPersistentCookies && (
                    <div className="text-rose-400 font-semibold flex items-center gap-1 pt-1">
                      <ShieldAlert className="w-3.5 h-3.5" /> Drops persistent cross-session identifiers
                    </div>
                  )}
                </div>

                {inspectedNode.connectedSites && inspectedNode.connectedSites.length > 0 && (
                  <div className="pt-2 border-t border-cyber-800">
                    <div className="font-mono text-[10px] text-neutral-400 uppercase tracking-wider mb-1">
                      Connected Visited Sites:
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {inspectedNode.connectedSites.map((s) => (
                        <span
                          key={s}
                          className="px-1.5 py-0.5 rounded bg-cyber-950 border border-cyber-800 text-neutral-300 font-mono text-[10px]"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: ENTITY FOOTPRINT (RADIAL HUB & SPOKE DEEP DIVE) */}
      {/* ========================================================================= */}
      {viewMode === 'footprint' && (
        <div className="space-y-4">
          {/* Entity Selector */}
          <div className="bg-cyber-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-medium">Select Surveillance Entity:</span>
              <select
                value={selectedOrgForFootprint}
                onChange={(e) => setSelectedOrgForFootprint(e.target.value)}
                className="bg-cyber-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
              >
                {organizationList.map((org) => (
                  <option key={org} value={org}>
                    {org}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {footprintData ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Left Wing: Visited Websites that report to this entity */}
              <div className="bg-cyber-900 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                  <h3 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Globe className="w-4 h-4" /> Visited Sites Reporting to {footprintData.organization}
                  </h3>
                  <span className="text-xs font-mono font-bold text-slate-100">
                    {footprintData.visitedSites.length} site(s)
                  </span>
                </div>
                <div className="space-y-2">
                  {footprintData.visitedSites.map((site) => (
                    <div
                      key={site}
                      className="bg-cyber-950 p-2.5 rounded-lg border border-slate-800/80 font-mono text-xs text-slate-200 flex items-center justify-between"
                    >
                      <span>{site}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Center: Entity Hub & Cross-Site Forensic Narrative */}
              <div className="bg-cyber-900 border border-purple-500/30 rounded-xl p-5 flex flex-col justify-between shadow-xl">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      CROSS-SITE TRACKING HUB
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-400">
                      {footprintData.crossSiteReachPercentage}% of visited web
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold font-mono text-slate-100 mt-1">
                    {footprintData.organization}
                  </h2>
                  <div className="text-xs text-slate-400 mt-1">
                    Primary Category: <strong className="text-teal-400">{footprintData.category}</strong>
                  </div>

                  <div className="p-3 rounded-lg bg-cyber-950 border border-slate-800/80 my-4 text-xs text-slate-300 leading-relaxed">
                    {footprintData.narrative}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center pt-3 border-t border-slate-800 font-mono">
                  <div className="bg-cyber-950 p-2 rounded-lg border border-slate-800">
                    <div className="text-[10px] text-slate-400">Sites</div>
                    <div className="text-base font-bold text-cyan-400">
                      {footprintData.visitedSites.length}
                    </div>
                  </div>
                  <div className="bg-cyber-950 p-2 rounded-lg border border-slate-800">
                    <div className="text-[10px] text-slate-400">Requests</div>
                    <div className="text-base font-bold text-slate-200">
                      {footprintData.totalRequests}
                    </div>
                  </div>
                  <div className="bg-cyber-950 p-2 rounded-lg border border-slate-800">
                    <div className="text-[10px] text-slate-400">Persistent</div>
                    <div className="text-base font-bold text-rose-400">
                      {footprintData.persistentCookieCount}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Wing: Concrete Endpoints Operated */}
              <div className="bg-cyber-900 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                  <h3 className="text-xs font-mono font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-4 h-4" /> Endpoints & Artifacts Operated
                  </h3>
                  <span className="text-xs font-mono font-bold text-slate-100">
                    {footprintData.endpoints.length} domain(s)
                  </span>
                </div>
                <div className="space-y-2">
                  {footprintData.endpoints.map((e) => (
                    <div
                      key={e.domain}
                      className="bg-cyber-950 p-2.5 rounded-lg border border-slate-800/80 text-xs"
                    >
                      <div className="flex items-center justify-between font-mono text-slate-200 font-semibold">
                        <span>{e.domain}</span>
                        <span className="text-[10px] text-slate-400">
                          {e.requestCount} reqs
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400">
                        <span>{e.category}</span>
                        {e.hasPersistentCookie && (
                          <span className="text-rose-400 font-semibold">
                            Persistent Cookie
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-cyber-900 border border-slate-800 rounded-xl p-12 text-center text-slate-400 text-xs">
              Select an organization above to inspect its cross-site footprint.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
