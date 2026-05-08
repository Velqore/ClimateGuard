import {
  TrendingUp, TrendingDown, Minus, AlertCircle, BookOpen, History, Users,
} from 'lucide-react';
import { getRiskColor } from '../utils/helpers';

const trendConfig = {
  WORSENING: { icon: TrendingUp, color: 'text-red-400', bg: 'bg-red-500/10', label: 'Worsening' },
  STABLE: { icon: Minus, color: 'text-amber-400', bg: 'bg-amber-500/10', label: 'Stable' },
  IMPROVING: { icon: TrendingDown, color: 'text-green-400', bg: 'bg-green-500/10', label: 'Improving' },
};

export default function CauseAnalysis({ type, cause }) {
  if (!cause) return null;

  const trend = trendConfig[cause.trend] || trendConfig.STABLE;
  const TrendIcon = trend.icon;

  return (
    <div className="px-4 pb-4 border-t border-slate-700/30 pt-3 space-y-3">
      <div className="flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
        <p className="text-sm text-slate-300 leading-relaxed">{cause.primaryCause}</p>
      </div>

      {cause.contributingFactors?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {cause.contributingFactors.map((f, i) => (
            <span
              key={i}
              className="px-2 py-0.5 bg-slate-700/40 border border-slate-600/30 rounded-full text-xs text-slate-400"
            >
              {f}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-start gap-2">
        <BookOpen className="w-4 h-4 text-slate-600 mt-0.5 shrink-0" />
        <p className="text-xs text-slate-500 italic">{cause.scientificContext}</p>
      </div>

      {cause.historicalContext && (
        <div className="flex items-start gap-2">
          <History className="w-4 h-4 text-slate-600 mt-0.5 shrink-0" />
          <p className="text-xs text-slate-500">{cause.historicalContext}</p>
        </div>
      )}

      {cause.humanImpact && (
        <div className="flex items-start gap-2">
          <Users className="w-4 h-4 text-slate-600 mt-0.5 shrink-0" />
          <p className="text-xs text-slate-500">{cause.humanImpact}</p>
        </div>
      )}

      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${trend.bg} ${trend.color}`}>
        <TrendIcon className="w-3.5 h-3.5" />
        {trend.label}
        {cause.trendReason && <span className="text-slate-500 ml-1">— {cause.trendReason}</span>}
      </div>
    </div>
  );
}
