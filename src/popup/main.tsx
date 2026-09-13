import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ExternalLink, RefreshCw, Cookie, Lock } from 'lucide-react';
import { browserAPI } from '../browser';
import { dbStore } from '../database/store';
import { getRegistrableDomain, normalizeHostname } from '../analysis/domain';
import type { CookieArtifact } from '../types';
import '../index.css';

function Popup() {
  const [activeDomain, setActiveDomain] = useState<string>('Detecting...');
  const [totalCookies, setTotalCookies] = useState<number>(0);
  const [siteCookies, setSiteCookies] = useState<CookieArtifact[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Get active tab
      const [tab] = await browserAPI.tabs.query({ active: true, currentWindow: true });
      let currentHost = 'Unknown Site';
      if (tab?.url && tab.url.startsWith('http')) {
        const host = normalizeHostname(tab.url);
        if (host) currentHost = host;
      }
      setActiveDomain(currentHost);

      // 2. Fetch all cookies
      const allCookies = await dbStore.getAllCookies();
      setTotalCookies(allCookies.length);

      // 3. Filter cookies matching active domain
      const activeReg = getRegistrableDomain(currentHost);
      if (activeReg) {
        const matching = allCookies.filter(
          (c) => c.registrableDomain === activeReg || c.domain.includes(activeReg)
        );
        setSiteCookies(matching);
      }
    } catch (err) {
      console.error('Error loading popup data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const refreshInventory = () => {
    setLoading(true);
    browserAPI.runtime.sendMessage({ type: 'REFRESH_COOKIES' }).then(() => {
      setTimeout(loadData, 400);
    }).catch(() => setTimeout(loadData, 400));
  };

  const openDashboard = () => {
    void browserAPI.runtime.openOptionsPage();
  };

  const thirdPartyCount = siteCookies.filter((c) => c.isThirdParty).length;
  const persistentCount = siteCookies.filter((c) => !c.session).length;

  return (
    <div className="w-[340px] bg-[#0c0e14] text-neutral-200 border border-cyber-800 p-4 font-sans text-xs flex flex-col gap-3">
      {/* Brand Header */}
      <div className="flex items-center justify-between border-b border-cyber-800 pb-2.5">
        <div className="flex items-center gap-2">
          <img
            src="/icons/icon-48.png"
            alt="WhoIsTrackingMe Logo"
            className="w-6 h-6 rounded-md object-contain border border-cyber-800 shadow-sm"
          />
          <div>
            <div className="font-semibold text-xs text-white tracking-tight">
              WhoIsTrackingMe
            </div>
            <div className="text-[10px] text-neutral-500">
              Privacy Inspector
            </div>
          </div>
        </div>
        <button
          onClick={refreshInventory}
          disabled={loading}
          title="Refresh cookie inventory"
          className="p-1 rounded hover:bg-white/[0.06] text-neutral-400 hover:text-white transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Active Tab Site Context */}
      <div className="bg-cyber-900 border border-cyber-800 rounded-lg p-2.5">
        <div className="flex items-center justify-between mb-0.5 text-[11px] text-neutral-500">
          <span>Active Origin</span>
          <span className="text-[10px] text-emerald-400 font-medium">
            Passive audit
          </span>
        </div>
        <div className="font-mono text-xs text-white truncate font-medium">
          {activeDomain}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-cyber-900 border border-cyber-800 rounded-md p-2 text-center">
          <div className="text-[10px] text-neutral-400">Cookies</div>
          <div className="text-sm font-semibold text-white font-mono mt-0.5">
            {siteCookies.length}
          </div>
        </div>
        <div className="bg-cyber-900 border border-cyber-800 rounded-md p-2 text-center">
          <div className="text-[10px] text-neutral-400">Third-Party</div>
          <div className="text-sm font-semibold text-neutral-300 font-mono mt-0.5">
            {thirdPartyCount}
          </div>
        </div>
        <div className="bg-cyber-900 border border-cyber-800 rounded-md p-2 text-center">
          <div className="text-[10px] text-neutral-400">Persistent</div>
          <div className="text-sm font-semibold text-neutral-300 font-mono mt-0.5">
            {persistentCount}
          </div>
        </div>
      </div>

      {/* Global telemetry note */}
      <div className="bg-cyber-950 border border-cyber-800 rounded-md px-2.5 py-1.5 flex items-center justify-between text-[11px] text-neutral-400">
        <span className="flex items-center gap-1.5">
          <Cookie className="w-3.5 h-3.5 text-neutral-500" /> Total browser cookies:
        </span>
        <span className="font-mono font-medium text-neutral-200">{totalCookies}</span>
      </div>

      {/* Privacy guarantee info */}
      <div className="flex items-center gap-1.5 text-[10px] text-neutral-500 px-0.5">
        <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
        <span>Local-only audit. Cookie values securely masked.</span>
      </div>

      {/* Action CTA */}
      <button
        onClick={openDashboard}
        className="w-full flex items-center justify-center gap-2 bg-cyber-850 hover:bg-cyber-800 text-white font-medium py-2 rounded-lg text-xs border border-cyber-700 transition-colors shadow-sm"
      >
        <span>Open Forensics Dashboard</span>
        <ExternalLink className="w-3 h-3" />
      </button>
    </div>
  );
}

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(<Popup />);
}
