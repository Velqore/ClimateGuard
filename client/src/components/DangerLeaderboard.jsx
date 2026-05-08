import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Shield, Flame, Wind, Mountain, Waves, Thermometer, CloudLightning, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, getRiskColor, getRiskLevel } from '../utils/helpers';

const hazardIcons = {
  earthquake: Mountain,
  wildfire: Flame,
  storm: CloudLightning,
  flood: Waves,
  heat: Thermometer,
  airQuality: Wind,
};

export default function DangerLeaderboard({ preview = false }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const result = await apiFetch('/api/leaderboard');
      setData(result);
    } catch (e) {
      console.error('Leaderboard error:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return <p className="text-sm text-slate-500 text-center py-8">Leaderboard data unavailable</p>;

  const dangerous = preview ? data.mostDangerous?.slice(0, 5) : data.mostDangerous;
  const safest = preview ? data.safest?.slice(0, 5) : data.safest;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-red-400" />
          <h2 className="text-lg font-bold text-slate-200">Global Danger Leaderboard</h2>
        </div>
        <button
          onClick={loadLeaderboard}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 rounded-lg text-xs text-slate-400 transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Refresh
        </button>
      </div>

      <div>
        <h3 className="text-sm font-medium text-red-300 mb-3 flex items-center gap-2">
          <Flame className="w-4 h-4" />
          Most Dangerous
        </h3>
        <div className="space-y-1.5">
          {dangerous?.map((city, i) => (
            <LeaderboardRow
              key={city.name}
              city={city}
              rank={i + 1}
              type="danger"
              onAnalyze={() => navigate(`/dashboard?lat=${city.lat}&lon=${city.lon}`)}
            />
          ))}
        </div>
      </div>

      {!preview && (
        <div className="border-t border-slate-700/30 pt-6">
          <h3 className="text-sm font-medium text-green-300 mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Safest Cities
          </h3>
          <div className="space-y-1.5">
            {safest?.map((city, i) => (
              <LeaderboardRow
                key={city.name}
                city={city}
                rank={i + 1}
                type="safe"
                onAnalyze={() => navigate(`/dashboard?lat=${city.lat}&lon=${city.lon}`)}
              />
            ))}
          </div>
        </div>
      )}

      {!preview && data.worstAirQuality && (
        <div className="border-t border-slate-700/30 pt-6">
          <h3 className="text-sm font-medium text-slate-300 mb-3">Worst Air Quality</h3>
          <div className="space-y-1.5">
            {data.worstAirQuality?.slice(0, 5).map((city, i) => (
              <LeaderboardRow
                key={city.name}
                city={city}
                rank={i + 1}
                type="aq"
                onAnalyze={() => navigate(`/dashboard?lat=${city.lat}&lon=${city.lon}`)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LeaderboardRow({ city, rank, type, onAnalyze }) {
  const Icon = hazardIcons[city.dominant] || Flame;
  const color = getRiskColor(city.overall);
  const isTopDanger = type === 'danger' && rank === 1;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: rank * 0.05 }}
      className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${
        isTopDanger
          ? 'bg-red-500/10 border-red-500/20'
          : 'bg-slate-800/30 border-slate-700/30 hover:bg-slate-800/50'
      }`}
    >
      <span className={`font-mono text-sm font-bold w-6 text-center ${isTopDanger ? 'text-red-400' : 'text-slate-500'}`}>
        {rank}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-200 truncate">{city.name}</span>
          <span className="text-xs text-slate-500">{city.country}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Icon className="w-3.5 h-3.5" style={{ color }} />
        <div className="w-16 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${city.overall}%`, backgroundColor: color }} />
        </div>
        <span className="font-mono text-sm font-bold w-8 text-right" style={{ color }}>
          {city.overall}
        </span>
        <button
          onClick={onAnalyze}
          className="ml-2 inline-flex items-center rounded-full border border-sky-500/20 bg-sky-500/10 px-2.5 py-1 text-[11px] font-semibold text-sky-300 hover:bg-sky-500/15 transition-colors"
          title={`Analyze ${city.name}`}
        >
          Analyze {city.name}
        </button>
      </div>
    </motion.div>
  );
}
