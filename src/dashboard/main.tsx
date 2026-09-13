import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  RefreshCw,
  Search,
  Cookie,
  Lock,
  Globe,
  Clock,
  ChevronRight,
  Database,
  Network,
  Layers,
  Info,
  ArrowUpDown,
  Filter
} from 'lucide-react';
import { browserAPI } from '../browser';
import { dbStore } from '../database/store';
import { TRACKER_CATALOG, findTracker } from '../tracker/database';
import { aggregateDomainSummaries, buildWebsiteProfiles } from '../analysis/domain-summary';
import { explainCookieArtifact } from '../analysis/cookie-forensics';
import { calculatePrivacyScore } from '../analysis/risk';
import { formatRemainingLifespan } from '../utils/formatting';
import { WebsiteDetailView } from './components/WebsiteDetailView';
import { TrackingGraph } from './components/TrackingGraph';
import { TimelineView } from './components/TimelineView';
import { PrivacyScoreCard } from './components/PrivacyScoreCard';
import type { CookieArtifact, DomainSummary, ForensicExplanation, NetworkObservation, WebsiteProfile } from '../types';
import '../index.css';

function DashboardApp() {
  const [cookies, setCookies] = useState<CookieArtifact[]>([]);
  const [observations, setObservations] = useState<NetworkObservation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFilter, setSelectedFilter] = useState<
    'all' | 'known-trackers' | 'unknown-third-party' | 'first-party'
  >('all');
  const [activeNav, setActiveNav] = useState<
    'overview' | 'websites' | 'cookies' | 'graph' | 'timeline' | 'trackers' | 'privacy'
  >('overview');

  // Website profiles search, sort & view state
  const [websiteSearch, setWebsiteSearch] = useState<string>('');
  const [websiteSort, setWebsiteSort] = useState<'trackers' | 'cookies' | 'thirdParty' | 'recent' | 'alphabetical'>('trackers');
  const [websiteFilterTrackersOnly, setWebsiteFilterTrackersOnly] = useState<boolean>(false);

  const [selectedWebsiteProfile, setSelectedWebsiteProfile] = useState<WebsiteProfile | null>(null);
  const [selectedCookie, setSelectedCookie] = useState<CookieArtifact | null>(null);
  const [cookieExplanation, setCookieExplanation] = useState<ForensicExplanation | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cookieData, obsData] = await Promise.all([
        dbStore.getAllCookies(),
        dbStore.getAllObservations()
      ]);
      setCookies(cookieData);
      setObservations(obsData);
    } catch (err) {
      console.error('Failed to load forensics data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleRefresh = () => {
    setLoading(true);
    browserAPI.runtime.sendMessage({ type: 'REFRESH_COOKIES' }).then(() => {
      setTimeout(loadData, 500);
    }).catch(() => setTimeout(loadData, 500));
  };

  // Domain Summaries and Website Profiles
  const domainSummaries = useMemo(
    () => aggregateDomainSummaries(cookies, observations),
    [cookies, observations]
  );

  const websiteProfiles = useMemo(
    () => buildWebsiteProfiles(cookies, observations),
    [cookies, observations]
  );

  const filteredAndSortedWebsites = useMemo(() => {
    let list = websiteProfiles.filter((p) => {
      if (websiteSearch.trim() !== '') {
        const q = websiteSearch.toLowerCase();
        const matchSite = p.site.toLowerCase().includes(q);
        const matchTracker = p.knownTrackers.some(
          (t) => t.domain.toLowerCase().includes(q) || (t.organization && t.organization.toLowerCase().includes(q))
        );
        if (!matchSite && !matchTracker) return false;
      }
      if (websiteFilterTrackersOnly && p.knownTrackers.length === 0) {
        return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (websiteSort === 'trackers') {
        if (b.knownTrackers.length !== a.knownTrackers.length) {
          return b.knownTrackers.length - a.knownTrackers.length;
        }
        return b.cookies.length - a.cookies.length;
      }
      if (websiteSort === 'cookies') {
        return b.cookies.length - a.cookies.length;
      }
      if (websiteSort === 'thirdParty') {
        return b.thirdPartyDomains.length - a.thirdPartyDomains.length;
      }
      if (websiteSort === 'recent') {
        return b.updatedAt - a.updatedAt;
      }
      return a.site.localeCompare(b.site);
    });
  }, [websiteProfiles, websiteSearch, websiteFilterTrackersOnly, websiteSort]);

  const privacyAssessment = useMemo(
    () => calculatePrivacyScore(cookies, observations),
    [cookies, observations]
  );

  // 6 Primary Metrics
  const totalCookies = cookies.length;
  const firstPartyCookies = useMemo(() => cookies.filter((c) => !c.isThirdParty).length, [cookies]);
  const thirdPartyCookies = useMemo(() => cookies.filter((c) => c.isThirdParty).length, [cookies]);
  const persistentCookies = useMemo(() => cookies.filter((c) => !c.session).length, [cookies]);
  const knownTrackingDomains = useMemo(
    () => domainSummaries.filter((d) => d.isKnownTracker).length,
    [domainSummaries]
  );
  const unknownThirdPartyDomains = useMemo(
    () => domainSummaries.filter((d) => !d.isKnownTracker && (d.party === 'Third-party' || d.party === 'Mixed')).length,
    [domainSummaries]
  );

  // Filtered Domain Table
  const filteredDomains = useMemo(() => {
    return domainSummaries.filter((row) => {
      const matchesSearch =
        searchQuery === '' ||
        row.domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.organization.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.category.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (selectedFilter === 'known-trackers') return row.isKnownTracker;
      if (selectedFilter === 'unknown-third-party') return !row.isKnownTracker && (row.party === 'Third-party' || row.party === 'Mixed');
      if (selectedFilter === 'first-party') return row.party === 'First-party';
      return true;
    });
  }, [domainSummaries, searchQuery, selectedFilter]);

  const openWebsiteDetail = (domain: string) => {
    const profile = websiteProfiles.find((p) => p.site === domain) ?? {
      site: domain,
      cookies: cookies.filter((c) => c.registrableDomain === domain || c.domain.includes(domain)),
      thirdPartyDomains: [],
      knownTrackers: [],
      updatedAt: Date.now()
    };
    setSelectedWebsiteProfile(profile);
    setActiveNav('websites');
  };

  const handleExplainCookie = (cookie: CookieArtifact) => {
    setSelectedCookie(cookie);
    setCookieExplanation(explainCookieArtifact(cookie));
  };

  return (
    <div className="flex h-screen bg-[#090a0f] text-neutral-200 font-sans overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-60 bg-[#0c0e14] border-r border-cyber-800 flex flex-col justify-between shrink-0">
        <div>
          {/* Brand Header */}
          <div className="p-5 border-b border-cyber-800 flex items-center gap-2.5">
            <img
              src="/icons/icon-48.png"
              alt="WhoIsTrackingMe Logo"
              className="w-8 h-8 rounded-lg object-contain border border-cyber-800 shadow-sm"
            />
            <div>
              <div className="font-semibold text-sm text-white tracking-tight">
                WhoIsTrackingMe
              </div>
              <div className="text-[11px] text-neutral-500 font-normal">
                Privacy Forensics
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            <button
              onClick={() => {
                setActiveNav('overview');
                setSelectedWebsiteProfile(null);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                activeNav === 'overview'
                  ? 'bg-white/[0.08] text-white'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.03]'
              }`}
            >
              <Database className="w-4 h-4 text-neutral-400" />
              Overview
            </button>

            <button
              onClick={() => {
                setActiveNav('websites');
                setSelectedWebsiteProfile(null);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                activeNav === 'websites'
                  ? 'bg-white/[0.08] text-white'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.03]'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Globe className="w-4 h-4 text-neutral-400" />
                Websites
              </span>
              <span className="text-[11px] text-neutral-500 font-mono">{websiteProfiles.length}</span>
            </button>

            <button
              onClick={() => {
                setActiveNav('cookies');
                setSelectedWebsiteProfile(null);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                activeNav === 'cookies'
                  ? 'bg-white/[0.08] text-white'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.03]'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Cookie className="w-4 h-4 text-neutral-400" />
                Cookie Inventory
              </span>
              <span className="text-[11px] text-neutral-500 font-mono">{totalCookies}</span>
            </button>

            <button
              onClick={() => {
                setActiveNav('graph');
                setSelectedWebsiteProfile(null);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                activeNav === 'graph'
                  ? 'bg-white/[0.08] text-white'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.03]'
              }`}
            >
              <Network className="w-4 h-4 text-neutral-400" />
              Tracking Map
            </button>

            <button
              onClick={() => {
                setActiveNav('timeline');
                setSelectedWebsiteProfile(null);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                activeNav === 'timeline'
                  ? 'bg-white/[0.08] text-white'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.03]'
              }`}
            >
              <Clock className="w-4 h-4 text-neutral-400" />
              Timeline
            </button>

            <button
              onClick={() => {
                setActiveNav('trackers');
                setSelectedWebsiteProfile(null);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                activeNav === 'trackers'
                  ? 'bg-white/[0.08] text-white'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.03]'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Layers className="w-4 h-4 text-neutral-400" />
                Tracker Catalog
              </span>
              <span className="text-[11px] text-neutral-500 font-mono">{TRACKER_CATALOG.length}</span>
            </button>

            <button
              onClick={() => {
                setActiveNav('privacy');
                setSelectedWebsiteProfile(null);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                activeNav === 'privacy'
                  ? 'bg-white/[0.08] text-white'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.03]'
              }`}
            >
              <Lock className="w-4 h-4 text-neutral-400" />
              Privacy & Guarantees
            </button>
          </nav>
        </div>

        {/* Minimalist Local telemetry badge */}
        <div className="p-3 m-3 rounded-lg bg-cyber-950 border border-cyber-800 text-[11px] text-neutral-400 space-y-1">
          <div className="flex items-center gap-1.5 text-emerald-400 font-medium text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Local inspection
          </div>
          <p className="text-[10px] text-neutral-500 leading-relaxed">
            Zero network calls. Cookies and tokens remain on device.
          </p>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header Bar */}
        <header className="h-14 border-b border-cyber-800 bg-[#0c0e14] px-7 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold text-white">
              {activeNav === 'overview' && 'Domain Overview'}
              {activeNav === 'websites' && (selectedWebsiteProfile ? selectedWebsiteProfile.site : 'Visited Websites')}
              {activeNav === 'cookies' && 'Cookie Inventory'}
              {activeNav === 'graph' && 'Tracking Provenance Map'}
              {activeNav === 'timeline' && 'Chronological Timeline'}
              {activeNav === 'trackers' && 'Tracker Catalog'}
              {activeNav === 'privacy' && 'Privacy Architecture & Guarantees'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-cyber-900 hover:bg-cyber-850 text-neutral-300 border border-cyber-800 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-neutral-400' : ''}`} />
              Refresh
            </button>
          </div>
        </header>

        {/* View Content */}
        <div className="flex-1 overflow-y-auto p-7 space-y-5">
          {/* OVERVIEW VIEW */}
          {activeNav === 'overview' && (
            <>
              {/* Privacy Exposure Risk Score Card */}
              <PrivacyScoreCard assessment={privacyAssessment} />

              {/* 6 Minimalist Core Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-cyber-900 border border-cyber-800 rounded-xl p-3.5">
                  <div className="text-xs text-neutral-400 font-normal">Total Cookies</div>
                  <div className="text-xl font-semibold font-mono text-white mt-1">{totalCookies}</div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">In browser storage</div>
                </div>

                <div className="bg-cyber-900 border border-cyber-800 rounded-xl p-3.5">
                  <div className="text-xs text-neutral-400 font-normal">First-Party</div>
                  <div className="text-xl font-semibold font-mono text-emerald-400 mt-1">{firstPartyCookies}</div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">
                    {totalCookies > 0 ? `${Math.round((firstPartyCookies / totalCookies) * 100)}% of cookies` : '0%'}
                  </div>
                </div>

                <div className="bg-cyber-900 border border-cyber-800 rounded-xl p-3.5">
                  <div className="text-xs text-neutral-400 font-normal">Third-Party</div>
                  <div className="text-xl font-semibold font-mono text-neutral-200 mt-1">{thirdPartyCookies}</div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">Cross-origin context</div>
                </div>

                <div className="bg-cyber-900 border border-cyber-800 rounded-xl p-3.5">
                  <div className="text-xs text-neutral-400 font-normal">Persistent</div>
                  <div className="text-xl font-semibold font-mono text-neutral-200 mt-1">{persistentCookies}</div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">Survives restart</div>
                </div>

                <div className="bg-cyber-900 border border-cyber-800 rounded-xl p-3.5">
                  <div className="text-xs text-neutral-400 font-normal">Known Trackers</div>
                  <div className="text-xl font-semibold font-mono text-rose-400 mt-1">{knownTrackingDomains}</div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">Identified domains</div>
                </div>

                <div className="bg-cyber-900 border border-cyber-800 rounded-xl p-3.5">
                  <div className="text-xs text-neutral-400 font-normal">Other Third Party</div>
                  <div className="text-xl font-semibold font-mono text-neutral-300 mt-1">{unknownThirdPartyDomains}</div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">Unclassified origins</div>
                </div>
              </div>

              {/* Table Controls (Search + Segmented Filter) */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-cyber-900 p-3 rounded-xl border border-cyber-800">
                <div className="relative flex-1 w-full">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search domain, entity, or category..."
                    className="w-full bg-cyber-950 border border-cyber-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
                  />
                </div>

                <div className="flex items-center gap-1 bg-cyber-950 p-1 rounded-lg border border-cyber-800 self-start sm:self-auto shrink-0">
                  {(['all', 'known-trackers', 'unknown-third-party', 'first-party'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setSelectedFilter(filter)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors capitalize ${
                        selectedFilter === filter
                          ? 'bg-cyber-850 text-white font-medium shadow-sm'
                          : 'text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      {filter === 'all'
                        ? 'All'
                        : filter === 'known-trackers'
                        ? 'Trackers'
                        : filter === 'unknown-third-party'
                        ? 'Third-party'
                        : 'First-party'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Aggregated Domains Forensics Table */}
              <div className="bg-cyber-900 border border-cyber-800 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-cyber-800 bg-cyber-950/60 text-[11px] text-neutral-400 font-medium">
                        <th className="py-2.5 px-4">Domain</th>
                        <th className="py-2.5 px-4">Organization</th>
                        <th className="py-2.5 px-4">Category</th>
                        <th className="py-2.5 px-4">Party</th>
                        <th className="py-2.5 px-4">Artifacts</th>
                        <th className="py-2.5 px-4">Confidence</th>
                        <th className="py-2.5 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-cyber-800/60">
                      {filteredDomains.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-neutral-500 text-xs">
                            No domains observed matching your active filter.
                          </td>
                        </tr>
                      ) : (
                        filteredDomains.map((row: DomainSummary) => (
                          <tr
                            key={row.domain}
                            onClick={() => openWebsiteDetail(row.domain)}
                            className="hover:bg-white/[0.02] transition-colors cursor-pointer group"
                          >
                            {/* Domain */}
                            <td className="py-3 px-4 font-mono font-medium text-neutral-200 group-hover:text-white">
                              {row.domain}
                            </td>

                            {/* Organization */}
                            <td className="py-3 px-4 text-neutral-300">
                              {row.organization}
                            </td>

                            {/* Category */}
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                                  row.isKnownTracker
                                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                    : 'bg-white/[0.04] text-neutral-400 border-white/[0.06]'
                                }`}
                              >
                                {row.category}
                              </span>
                            </td>

                            {/* First/Third Party */}
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                                  row.party === 'First-party'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : row.party === 'Third-party'
                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                    : 'bg-white/[0.05] text-neutral-300 border border-white/[0.08]'
                                }`}
                              >
                                {row.party}
                              </span>
                            </td>

                            {/* Artifacts Count */}
                            <td className="py-3 px-4 font-mono text-neutral-300">
                              <span className="font-semibold">{row.totalArtifacts}</span>{' '}
                              <span className="text-[10px] text-neutral-500">
                                ({row.cookieCount} cookies, {row.networkCount} reqs)
                              </span>
                            </td>

                            {/* Confidence */}
                            <td className="py-3 px-4 text-xs font-mono">
                              <span
                                className={
                                  row.confidence === 'High'
                                    ? 'text-emerald-400 font-medium'
                                    : row.confidence === 'Medium'
                                    ? 'text-amber-400'
                                    : 'text-neutral-500'
                                }
                              >
                                {row.confidence}
                              </span>
                            </td>

                            {/* Action */}
                            <td className="py-3 px-4 text-right">
                              <span className="inline-flex items-center gap-1 text-neutral-400 group-hover:text-white text-xs transition-colors">
                                View <ChevronRight className="w-3 h-3" />
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* WEBSITES VIEW */}
          {activeNav === 'websites' && (
            <div>
              {selectedWebsiteProfile ? (
                <WebsiteDetailView
                  profile={selectedWebsiteProfile}
                  onBack={() => setSelectedWebsiteProfile(null)}
                />
              ) : (
                <div className="space-y-4">
                  {/* Toolbar & Filters */}
                  <div className="bg-cyber-900 border border-cyber-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-semibold text-white">
                          Visited Websites
                        </h2>
                        <span className="px-2 py-0.5 rounded-full bg-cyber-800 text-xs font-mono text-neutral-300">
                          {filteredAndSortedWebsites.length}{filteredAndSortedWebsites.length !== websiteProfiles.length ? ` of ${websiteProfiles.length}` : ''}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        Third-party tracking surface, embedded trackers, and cookies recorded per visited site.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      {/* Search */}
                      <div className="relative min-w-[240px]">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                        <input
                          type="text"
                          value={websiteSearch}
                          onChange={(e) => setWebsiteSearch(e.target.value)}
                          placeholder="Search domain or tracker..."
                          className="w-full bg-cyber-950 border border-cyber-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600 font-mono"
                        />
                      </div>

                      {/* Sort Dropdown */}
                      <div className="relative flex items-center">
                        <ArrowUpDown className="w-3.5 h-3.5 absolute left-2.5 text-neutral-400 pointer-events-none" />
                        <select
                          value={websiteSort}
                          onChange={(e) => setWebsiteSort(e.target.value as any)}
                          className="bg-cyber-950 border border-cyber-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-neutral-600 appearance-none cursor-pointer"
                        >
                          <option value="trackers">Sort: Most Trackers</option>
                          <option value="thirdParty">Sort: Most 3rd Party</option>
                          <option value="cookies">Sort: Most Cookies</option>
                          <option value="recent">Sort: Recently Active</option>
                          <option value="alphabetical">Sort: Alphabetical (A-Z)</option>
                        </select>
                      </div>

                      {/* Trackers Only Filter */}
                      <button
                        onClick={() => setWebsiteFilterTrackersOnly((prev) => !prev)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          websiteFilterTrackersOnly
                            ? 'bg-rose-950/60 border-rose-800/80 text-rose-300'
                            : 'bg-cyber-950 border-cyber-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
                        }`}
                      >
                        <Filter className="w-3 h-3" />
                        Trackers Only
                      </button>
                    </div>
                  </div>

                  {/* Empty state */}
                  {filteredAndSortedWebsites.length === 0 ? (
                    <div className="bg-cyber-900 border border-cyber-800 rounded-xl py-14 text-center text-neutral-400 text-xs">
                      {websiteProfiles.length === 0
                        ? 'No visited websites recorded yet. Browse some sites in Chrome to map activity.'
                        : 'No visited sites match the current filter or search criteria.'}
                    </div>
                  ) : (
                    /* DEDICATED STREAMLINED LIST VIEW */
                    <div className="bg-cyber-900 border border-cyber-800 rounded-xl overflow-hidden shadow-sm">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-cyber-950 border-b border-cyber-800 text-[11px] uppercase tracking-wider text-neutral-400 font-mono">
                          <tr>
                            <th className="py-3 px-4">Website</th>
                            <th className="py-3 px-4">Known Trackers</th>
                            <th className="py-3 px-4 text-center">3rd-Party Domains</th>
                            <th className="py-3 px-4 text-center">Cookies</th>
                            <th className="py-3 px-4 text-right">Last Active</th>
                            <th className="py-3 px-4 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-cyber-800/60 font-mono">
                          {filteredAndSortedWebsites.map((p) => {
                            const hasTrackers = p.knownTrackers.length > 0;
                            return (
                              <tr
                                key={p.site}
                                onClick={() => setSelectedWebsiteProfile(p)}
                                className="hover:bg-cyber-800/40 cursor-pointer transition-colors group"
                              >
                                <td className="py-3 px-4 font-sans font-medium text-sm text-white group-hover:text-cyan-300 transition-colors">
                                  {p.site}
                                </td>
                                <td className="py-3 px-4">
                                  {hasTrackers ? (
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="px-2 py-0.5 rounded bg-rose-950/70 border border-rose-800/50 text-rose-300 text-xs font-sans font-medium flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                                        {p.knownTrackers.length} {p.knownTrackers.length === 1 ? 'tracker' : 'trackers'}
                                      </span>
                                      {p.knownTrackers.slice(0, 3).map((t) => (
                                        <span
                                          key={t.domain}
                                          className="text-[11px] text-neutral-400 bg-cyber-950 px-1.5 py-0.5 rounded border border-cyber-800"
                                        >
                                          {t.organization || t.domain}
                                        </span>
                                      ))}
                                      {p.knownTrackers.length > 3 && (
                                        <span className="text-[10px] text-neutral-500">
                                          +{p.knownTrackers.length - 3} more
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-neutral-500 font-sans text-xs">None</span>
                                  )}
                                </td>
                                <td className="py-3 px-4 text-center text-neutral-300 font-medium">
                                  {p.thirdPartyDomains.length}
                                </td>
                                <td className="py-3 px-4 text-center text-neutral-300 font-medium">
                                  {p.cookies.length}
                                </td>
                                <td className="py-3 px-4 text-right text-neutral-400 text-[11px]">
                                  {new Date(p.updatedAt).toLocaleTimeString()}
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <span className="text-xs font-sans font-medium text-neutral-400 group-hover:text-white inline-flex items-center gap-1 transition-colors">
                                    Inspect <ChevronRight className="w-3 h-3" />
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* COOKIES INVENTORY VIEW */}
          {activeNav === 'cookies' && (
            <div className="space-y-4">
              <div className="bg-cyber-900 border border-cyber-800 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-cyber-800 bg-cyber-950/60 text-[11px] text-neutral-400 font-medium">
                        <th className="py-2.5 px-4">Name</th>
                        <th className="py-2.5 px-4">Domain Context</th>
                        <th className="py-2.5 px-4">Persistence / Expiry</th>
                        <th className="py-2.5 px-4">Security Flags</th>
                        <th className="py-2.5 px-4">Masked Value</th>
                        <th className="py-2.5 px-4 text-right">Reasoning</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-cyber-800/60">
                      {cookies.map((cookie) => {
                        const tracker = findTracker(cookie.domain);
                        return (
                          <tr key={cookie.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-3 px-4 font-mono font-medium text-neutral-200">
                              {cookie.name}
                            </td>
                            <td className="py-3 px-4 font-mono text-neutral-300">
                              {cookie.domain}
                              {tracker && (
                                <span className="ml-1.5 px-1.5 py-0.2 rounded text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                  {tracker.category}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              {cookie.session ? (
                                <span className="text-neutral-500 font-mono text-[11px]">Session</span>
                              ) : (
                                <div className="font-mono text-neutral-300 text-[11px]">
                                  {formatRemainingLifespan(cookie.expiresAt)}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4 font-mono text-[10px]">
                              <span className="mr-1 px-1.5 py-0.5 rounded bg-cyber-950 text-neutral-300 border border-cyber-800">
                                Secure:{cookie.secure ? '✓' : '✗'}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-cyber-950 text-neutral-300 border border-cyber-800">
                                HttpOnly:{cookie.httpOnly ? '✓' : '✗'}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-neutral-400 text-[11px]">
                              {cookie.maskedValue || '<empty>'}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => handleExplainCookie(cookie)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-cyber-950 hover:bg-cyber-850 text-neutral-300 border border-cyber-800 text-xs font-medium transition-colors"
                              >
                                <Info className="w-3 h-3" /> Explain
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TRACKING GRAPH VIEW */}
          {activeNav === 'graph' && (
            <TrackingGraph cookies={cookies} observations={observations} />
          )}

          {/* TIMELINE VIEW */}
          {activeNav === 'timeline' && (
            <TimelineView cookies={cookies} observations={observations} />
          )}

          {/* TRACKERS CATALOG VIEW */}
          {activeNav === 'trackers' && (
            <div className="space-y-4">
              <div className="bg-cyber-900 border border-cyber-800 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-1">
                  Tracker Intelligence Catalog ({TRACKER_CATALOG.length} entries)
                </h2>
                <p className="text-xs text-neutral-400 leading-relaxed max-w-2xl">
                  WhoIsTrackingMe maintains a local curated catalog of known advertising, analytics, session replay, and fingerprinting domains.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {TRACKER_CATALOG.map((tracker) => (
                  <div
                    key={tracker.domain}
                    className="bg-cyber-900 border border-cyber-800 rounded-xl p-4 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono font-medium text-sm text-neutral-200">
                          {tracker.domain}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          {tracker.category}
                        </span>
                      </div>
                      <div className="text-xs text-neutral-400 mb-2">
                        Provider: <strong className="text-neutral-200">{tracker.organization}</strong>
                      </div>
                      <p className="text-xs text-neutral-400 leading-relaxed">
                        {tracker.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PRIVACY BOUNDARIES VIEW */}
          {activeNav === 'privacy' && (
            <div className="space-y-4 max-w-3xl">
              <div className="bg-cyber-900 border border-cyber-800 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
                  Privacy Architecture & Operating Guarantees
                </h2>
                <div className="space-y-4 text-xs text-neutral-300 leading-relaxed">
                  <div>
                    <h3 className="font-medium text-white mb-1">
                      1. Local-Only Execution
                    </h3>
                    <p className="text-neutral-400">
                      WhoIsTrackingMe has zero external servers, telemetries, or remote endpoints. All cookie audits, domain aggregation, and graph generation happen exclusively inside this browser instance via IndexedDB.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-medium text-white mb-1">
                      2. Sensitive Value Masking
                    </h3>
                    <p className="text-neutral-400">
                      Session tokens and cookie values are masked automatically (e.g. <code>abc1••••••89</code>). Plaintext values are never written to disk or shown in the UI.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-medium text-white mb-1">
                      3. Objective Forensic Observations
                    </h3>
                    <p className="text-neutral-400">
                      Third-party infrastructure is used for valid functionality (CDNs, fonts, video players). We distinguish observed network and storage facts from analytical inferences.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Minimalist Cookie Explain Drawer */}
      {selectedCookie && cookieExplanation && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-end">
          <div className="w-full max-w-md h-full bg-[#0c0e14] border-l border-cyber-800 p-6 flex flex-col justify-between overflow-y-auto shadow-2xl">
            <div>
              <div className="flex items-center justify-between border-b border-cyber-800 pb-3 mb-4">
                <span className="text-xs font-semibold text-white">
                  Artifact Analysis
                </span>
                <button
                  onClick={() => setSelectedCookie(null)}
                  className="p-1 rounded hover:bg-white/[0.06] text-neutral-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="mb-4">
                <h3 className="text-sm font-mono font-semibold text-white break-all">
                  {selectedCookie.name}
                </h3>
                <div className="text-xs text-neutral-400 font-mono mt-1">
                  {selectedCookie.domain}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-cyber-950 border border-cyber-800 mb-4 text-xs text-neutral-300 leading-relaxed">
                {cookieExplanation.summary}
              </div>

              <div className="mb-4">
                <h4 className="text-xs font-medium text-neutral-400 mb-2">
                  Observed Attributes
                </h4>
                <ul className="space-y-1.5">
                  {cookieExplanation.technicalDetails.map((detail, idx) => (
                    <li
                      key={idx}
                      className="text-xs text-neutral-300 bg-cyber-950 p-2.5 rounded border border-cyber-800 flex items-start gap-2"
                    >
                      <span className="text-neutral-400">•</span>
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-medium text-neutral-400 mb-2">
                  Privacy Implication
                </h4>
                <div
                  className={`p-3 rounded-lg border text-xs leading-relaxed ${
                    cookieExplanation.isPrivacyConcern
                      ? 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                      : 'bg-cyber-950 border-cyber-800 text-neutral-300'
                  }`}
                >
                  {cookieExplanation.privacyImplications}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-cyber-800">
              <button
                onClick={() => setSelectedCookie(null)}
                className="w-full py-2 bg-cyber-850 hover:bg-cyber-800 text-white rounded-lg text-xs font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(<DashboardApp />);
}
