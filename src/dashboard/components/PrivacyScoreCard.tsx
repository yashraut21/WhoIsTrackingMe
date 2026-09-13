import React, { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle2, Info } from 'lucide-react';
import type { RiskAssessment } from '../../types';

interface PrivacyScoreCardProps {
  assessment: RiskAssessment;
}

export const PrivacyScoreCard: React.FC<PrivacyScoreCardProps> = ({ assessment }) => {
  const [expanded, setExpanded] = useState<boolean>(false);
  const { score, factors } = assessment;

  // Understated severity colors
  const severity =
    score >= 6.5
      ? {
          badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
          bar: 'bg-rose-500',
          text: 'text-rose-400',
          label: 'Elevated exposure'
        }
      : score >= 3.0
      ? {
          badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          bar: 'bg-amber-400',
          text: 'text-amber-400',
          label: 'Moderate exposure'
        }
      : {
          badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          bar: 'bg-emerald-400',
          text: 'text-emerald-400',
          label: 'Low exposure'
        };

  return (
    <div className="bg-cyber-900 border border-cyber-800 rounded-xl p-5 transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          {/* Minimalist Score Display */}
          <div className="flex flex-col items-center justify-center w-16 h-16 rounded-xl bg-cyber-950 border border-cyber-800 shrink-0">
            <span className="text-2xl font-bold font-mono text-white tracking-tight">
              {score.toFixed(1)}
            </span>
            <span className="text-[10px] text-neutral-500">out of 10</span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-white">
                Privacy Exposure Index
              </h2>
              <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium border ${severity.badge}`}>
                {severity.label}
              </span>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed max-w-xl">
              Calculated deterministically from active third-party trackers, cross-site surveillance reach, and persistent identifier cookies.
            </p>

            {/* Subtle Progress Bar */}
            <div className="w-48 h-1.5 bg-cyber-950 rounded-full overflow-hidden mt-2 border border-cyber-800">
              <div
                className={`h-full rounded-full transition-all duration-500 ${severity.bar}`}
                style={{ width: `${Math.min(Math.max((score / 10) * 100, 4), 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Toggle Factor Breakdown */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-cyber-950 hover:bg-cyber-850 text-neutral-300 border border-cyber-800 rounded-lg text-xs font-medium transition-colors self-start sm:self-center shrink-0"
        >
          <span>{expanded ? 'Hide factors' : 'View scoring factors'}</span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Itemized Contributing Factors */}
      {expanded && (
        <div className="mt-5 pt-4 border-t border-cyber-800/80 space-y-2.5">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Observed factor</span>
            <span>Impact</span>
          </div>

          {factors.length === 0 ? (
            <div className="p-4 rounded-lg bg-cyber-950 border border-cyber-800 text-xs text-neutral-400 text-center flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              No tracking infrastructure or persistent cross-site identifiers detected yet.
            </div>
          ) : (
            <div className="space-y-1.5">
              {factors.map((f, idx) => (
                <div
                  key={idx}
                  className="bg-cyber-950 border border-cyber-800/70 px-3.5 py-2.5 rounded-lg flex items-start justify-between gap-4 text-xs"
                >
                  <div>
                    <div className="font-medium text-neutral-200">
                      {f.label}
                    </div>
                    <div className="text-[11px] text-neutral-400 mt-0.5 leading-relaxed">
                      {f.detail}
                    </div>
                  </div>
                  <span className="font-mono text-xs font-medium text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20 shrink-0">
                    +{f.points.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-1.5 pt-1 text-[11px] text-neutral-500">
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>
              Deterministic observation of exposure surface; not a legal compliance determination.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
