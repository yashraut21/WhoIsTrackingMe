import { useState } from 'react';
import {
  ArrowLeft,
  Info,
  X
} from 'lucide-react';
import type { CookieArtifact, ForensicExplanation, WebsiteProfile } from '../../types';
import { explainCookieArtifact } from '../../analysis/cookie-forensics';
import { formatRemainingLifespan } from '../../utils/formatting';

interface WebsiteDetailViewProps {
  profile: WebsiteProfile;
  onBack: () => void;
}

export const WebsiteDetailView: React.FC<WebsiteDetailViewProps> = ({ profile, onBack }) => {
  const [selectedCookie, setSelectedCookie] = useState<CookieArtifact | null>(null);
  const [explanation, setExplanation] = useState<ForensicExplanation | null>(null);

  const persistentCookies = profile.cookies.filter((c) => !c.session);
  const sessionCookies = profile.cookies.filter((c) => c.session);

  const categories = Array.from(
    new Set(profile.knownTrackers.map((t) => t.category))
  );

  const handleExplain = (cookie: CookieArtifact) => {
    setSelectedCookie(cookie);
    setExplanation(explainCookieArtifact(cookie));
  };

  return (
    <div className="space-y-5">
      {/* Top Header & Breadcrumb */}
      <div className="flex items-center justify-between bg-cyber-900 border border-cyber-800 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg bg-cyber-950 hover:bg-cyber-850 text-neutral-400 hover:text-white border border-cyber-800 transition-colors"
            title="Back to websites"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="text-[11px] text-neutral-500 font-medium">
              Website Profile
            </div>
            <h2 className="text-base font-semibold text-white font-mono mt-0.5">
              {profile.site}
            </h2>
          </div>
        </div>

        <div className="text-right text-xs">
          <span className="text-neutral-500 text-[11px]">Last active: </span>
          <span className="text-neutral-300 font-mono text-[11px]">
            {new Date(profile.updatedAt).toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Metrics Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-cyber-900 border border-cyber-800 rounded-xl p-3.5">
          <div className="text-xs text-neutral-400 font-normal">Cookies Stored</div>
          <div className="text-xl font-semibold font-mono text-white mt-1">
            {profile.cookies.length}
          </div>
          <div className="text-[11px] text-neutral-500 mt-0.5">
            {persistentCookies.length} persistent · {sessionCookies.length} session
          </div>
        </div>

        <div className="bg-cyber-900 border border-cyber-800 rounded-xl p-3.5">
          <div className="text-xs text-neutral-400 font-normal">Third-Party Domains</div>
          <div className="text-xl font-semibold font-mono text-neutral-200 mt-1">
            {profile.thirdPartyDomains.length}
          </div>
          <div className="text-[11px] text-neutral-500 mt-0.5">Connected origins</div>
        </div>

        <div className="bg-cyber-900 border border-cyber-800 rounded-xl p-3.5">
          <div className="text-xs text-neutral-400 font-normal">Known Trackers</div>
          <div className="text-xl font-semibold font-mono text-rose-400 mt-1">
            {profile.knownTrackers.length}
          </div>
          <div className="text-[11px] text-neutral-500 mt-0.5">Catalog matches</div>
        </div>

        <div className="bg-cyber-900 border border-cyber-800 rounded-xl p-3.5">
          <div className="text-xs text-neutral-400 font-normal">Categories</div>
          <div className="text-xl font-semibold font-mono text-neutral-200 mt-1">
            {categories.length}
          </div>
          <div className="text-[11px] text-neutral-500 mt-0.5 truncate">
            {categories.length > 0 ? categories.slice(0, 2).join(', ') : 'None'}
          </div>
        </div>
      </div>

      {/* Tracker Categories Breakdown */}
      {profile.knownTrackers.length > 0 && (
        <div className="bg-cyber-900 border border-cyber-800 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-white mb-2.5">
            Observed Tracking Infrastructure
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {profile.knownTrackers.map((t) => (
              <div
                key={t.domain}
                className="bg-cyber-950 p-2.5 rounded-lg border border-cyber-800 flex items-start justify-between"
              >
                <div>
                  <div className="font-mono font-medium text-xs text-neutral-200">
                    {t.domain}
                  </div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">
                    {t.organization ?? 'Unknown Provider'}
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  {t.category}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Forensic Fact vs Inference Callout */}
      <div className="bg-cyber-900 border border-cyber-800 rounded-xl p-3.5 text-xs text-neutral-400 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed text-[11px]">
          Presence of third-party domains or persistent cookies is an observed technical fact indicating potential for cross-site correlation. Third-party infrastructure is also commonly used for CDNs, media, fonts, and authentication.
        </p>
      </div>

      {/* Cookies Stored on this Website */}
      <div className="bg-cyber-900 border border-cyber-800 rounded-xl overflow-hidden">
        <div className="p-3.5 border-b border-cyber-800 bg-cyber-950/40">
          <h3 className="text-xs font-semibold text-white">
            Stored Cookies ({profile.cookies.length})
          </h3>
        </div>

        {profile.cookies.length === 0 ? (
          <div className="py-8 text-center text-xs text-neutral-500">
            No cookie artifacts currently stored for {profile.site}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-cyber-800 bg-cyber-950/60 text-[11px] text-neutral-400 font-medium">
                  <th className="py-2.5 px-4">Name</th>
                  <th className="py-2.5 px-4">Domain</th>
                  <th className="py-2.5 px-4">Lifespan</th>
                  <th className="py-2.5 px-4">Security Flags</th>
                  <th className="py-2.5 px-4">Masked Value</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cyber-800/60">
                {profile.cookies.map((cookie) => (
                  <tr key={cookie.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-2.5 px-4 font-mono font-medium text-neutral-200">
                      {cookie.name}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-neutral-300">
                      {cookie.domain}
                      {cookie.isThirdParty && (
                        <span className="ml-1.5 px-1.5 py-0.2 rounded text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          3rd Party
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4">
                      {cookie.session ? (
                        <span className="text-neutral-500 font-mono text-[11px]">Session</span>
                      ) : (
                        <div className="font-mono text-neutral-300 text-[11px]">
                          {formatRemainingLifespan(cookie.expiresAt)}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-1 font-mono text-[10px]">
                        <span className="px-1.5 py-0.5 rounded bg-cyber-950 text-neutral-300 border border-cyber-800">
                          Secure:{cookie.secure ? '✓' : '✗'}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-cyber-950 text-neutral-300 border border-cyber-800">
                          HttpOnly:{cookie.httpOnly ? '✓' : '✗'}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-cyber-950 text-neutral-400 border border-cyber-800">
                          {cookie.sameSite}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-neutral-400 text-[11px]">
                      {cookie.maskedValue || '<empty>'}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        onClick={() => handleExplain(cookie)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-cyber-950 hover:bg-cyber-850 text-neutral-300 border border-cyber-800 text-xs font-medium transition-colors"
                      >
                        <Info className="w-3 h-3" /> Explain
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Third-Party Domains Connected */}
      <div className="bg-cyber-900 border border-cyber-800 rounded-xl overflow-hidden">
        <div className="p-3.5 border-b border-cyber-800 bg-cyber-950/40">
          <h3 className="text-xs font-semibold text-white">
            Connected Third-Party Domains ({profile.thirdPartyDomains.length})
          </h3>
        </div>

        {profile.thirdPartyDomains.length === 0 ? (
          <div className="py-8 text-center text-xs text-neutral-500">
            No external third-party communications observed for {profile.site}.
          </div>
        ) : (
          <div className="p-3.5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {profile.thirdPartyDomains.map((d) => (
              <div
                key={d.domain}
                className="bg-cyber-950 p-2.5 rounded-lg border border-cyber-800 flex items-center justify-between"
              >
                <div>
                  <div className="font-mono font-medium text-xs text-neutral-200">
                    {d.domain}
                  </div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">
                    {d.organization ?? 'Unclassified Domain'}
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                    d.category !== 'Unknown'
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      : 'bg-white/[0.04] text-neutral-400 border-white/[0.06]'
                  }`}
                >
                  {d.category}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Explain Modal */}
      {selectedCookie && explanation && (
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
                  <X className="w-4 h-4" />
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
                {explanation.summary}
              </div>

              <div className="mb-4">
                <h4 className="text-xs font-medium text-neutral-400 mb-2">
                  Observed Attributes
                </h4>
                <ul className="space-y-1.5">
                  {explanation.technicalDetails.map((detail: string, idx: number) => (
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
                    explanation.isPrivacyConcern
                      ? 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                      : 'bg-cyber-950 border-cyber-800 text-neutral-300'
                  }`}
                >
                  {explanation.privacyImplications}
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
};
