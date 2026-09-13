import { useMemo, useState } from 'react';
import {
  Search,
  AlertTriangle,
  Cookie,
  Radio
} from 'lucide-react';
import type { CookieArtifact, NetworkObservation, TrackerCategory } from '../../types';
import { buildTimeline, filterTimeline } from '../../analysis/timeline';

interface TimelineViewProps {
  cookies: CookieArtifact[];
  observations: NetworkObservation[];
}

export const TimelineView: React.FC<TimelineViewProps> = ({ cookies, observations }) => {
  const [selectedWebsite, setSelectedWebsite] = useState<string>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedEventType, setSelectedEventType] = useState<string>('All');
  const [priorityOnly, setPriorityOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  // Compile raw events
  const allEvents = useMemo(() => {
    return buildTimeline(cookies, observations);
  }, [cookies, observations]);

  // Extract available websites
  const availableWebsites = useMemo(() => {
    const set = new Set<string>();
    allEvents.forEach((e) => set.add(e.firstPartySite));
    return Array.from(set).sort();
  }, [allEvents]);

  // Available categories
  const availableCategories: (TrackerCategory | 'All')[] = [
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

  // Filtered timeline stream
  const filteredEvents = useMemo(() => {
    return filterTimeline(allEvents, {
      website: selectedWebsite,
      category: selectedCategory as any,
      eventType: selectedEventType as any,
      priorityOnly,
      searchQuery
    });
  }, [allEvents, selectedWebsite, selectedCategory, selectedEventType, priorityOnly, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Overview header */}
      <div className="bg-cyber-900 border border-cyber-800 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-white">
            Chronological Timeline
          </h2>
          <p className="text-xs text-neutral-400 mt-1 max-w-2xl leading-relaxed">
            Record of network communications and stored cookie artifacts in reverse chronological order.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-cyber-950 px-3 py-1.5 rounded-lg border border-cyber-800 text-xs">
          <span className="text-neutral-500">Events:</span>
          <strong className="text-white font-mono font-medium">{filteredEvents.length}</strong>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-cyber-900 border border-cyber-800 p-3.5 rounded-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Website Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-neutral-400 font-normal">Site:</span>
            <select
              value={selectedWebsite}
              onChange={(e) => setSelectedWebsite(e.target.value)}
              className="bg-cyber-950 border border-cyber-800 rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-neutral-600 max-w-[170px] truncate"
            >
              <option value="All">All Websites</option>
              {availableWebsites.map((site) => (
                <option key={site} value={site}>
                  {site}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-neutral-400 font-normal">Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-cyber-950 border border-cyber-800 rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-neutral-600"
            >
              {availableCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Event Type Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-neutral-400 font-normal">Type:</span>
            <select
              value={selectedEventType}
              onChange={(e) => setSelectedEventType(e.target.value)}
              className="bg-cyber-950 border border-cyber-800 rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-neutral-600"
            >
              <option value="All">All Events</option>
              <option value="network_request">Network Requests</option>
              <option value="cookie_observed">Cookies</option>
            </select>
          </div>

          {/* Priority Only Toggle */}
          <button
            onClick={() => setPriorityOnly(!priorityOnly)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              priorityOnly
                ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                : 'bg-cyber-950 text-neutral-400 hover:text-neutral-200 border-cyber-800'
            }`}
          >
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            Review Priorities
          </button>
        </div>

        {/* Search Query */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search domain..."
            className="bg-cyber-950 border border-cyber-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-neutral-600 w-44"
          />
        </div>
      </div>

      {/* Timeline Stream */}
      <div className="bg-cyber-900 border border-cyber-800 rounded-xl overflow-hidden shadow-sm p-6">
        {filteredEvents.length === 0 ? (
          <div className="py-12 text-center text-neutral-500 text-xs">
            No events match your current filter settings.
          </div>
        ) : (
          <div className="relative border-l border-cyber-800 ml-3 space-y-4">
            {filteredEvents.slice(0, 150).map((event) => {
              const isHeightened = event.priorityLevel === 'heightened';
              const isExpanded = expandedEventId === event.id;

              return (
                <div key={event.id} className="relative pl-5 group">
                  {/* Subtle timeline dot */}
                  <span
                    className={`absolute -left-[5px] top-2 w-2.5 h-2.5 rounded-full ${
                      isHeightened
                        ? 'bg-rose-500'
                        : event.eventType === 'cookie_observed'
                        ? 'bg-sky-400'
                        : 'bg-neutral-600'
                    }`}
                  />

                  <div
                    onClick={() => setExpandedEventId(isExpanded ? null : event.id)}
                    className={`p-3 rounded-xl border transition-colors cursor-pointer ${
                      isHeightened
                        ? 'bg-rose-500/[0.04] border-rose-500/20 hover:border-rose-500/40'
                        : 'bg-cyber-950 border-cyber-800 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                      <div className="flex items-center gap-2">
                        {event.eventType === 'cookie_observed' ? (
                          <Cookie className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        ) : (
                          <Radio className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        )}
                        <span className="font-mono font-medium text-xs text-neutral-200">
                          {event.title}
                        </span>
                        {isHeightened && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            Priority
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] font-mono text-neutral-500 shrink-0">
                        <time>{new Date(event.timestamp).toLocaleTimeString()}</time>
                      </div>
                    </div>

                    <p className="text-xs text-neutral-400 leading-relaxed">
                      {event.summary}
                    </p>

                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-cyber-800/60 text-[10px] text-neutral-500 font-mono">
                      <span>Category: <strong className="text-neutral-400 font-normal">{event.category}</strong></span>
                      {event.organization && (
                        <>
                          <span>·</span>
                          <span>Entity: <strong className="text-neutral-400 font-normal">{event.organization}</strong></span>
                        </>
                      )}
                    </div>

                    {/* Expandable Technical Details */}
                    {isExpanded && (
                      <div className="mt-2.5 pt-2.5 border-t border-cyber-800 bg-cyber-900 p-3 rounded-lg text-xs font-mono">
                        <div className="grid grid-cols-2 gap-2 text-neutral-400 text-[11px]">
                          <div>Site: <span className="text-neutral-200">{event.firstPartySite}</span></div>
                          <div>Target: <span className="text-neutral-200">{event.targetDomain}</span></div>
                          {Object.entries(event.technicalMetadata).map(([k, v]) => (
                            <div key={k}>
                              {k}: <span className="text-neutral-200">{String(v)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
