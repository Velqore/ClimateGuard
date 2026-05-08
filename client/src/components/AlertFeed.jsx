import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Flame, Mountain, CloudLightning, Waves, Wind } from 'lucide-react';
import { apiFetch, formatTimeAgo, severityColor, severityBg } from '../utils/helpers';

const typeIcons = {
  earthquake: Mountain,
  fire: Flame,
  storm: CloudLightning,
  flood: Waves,
  tsunami: Waves,
  airQuality: Wind,
};

export default function AlertFeed({ limit = 10 }) {
  const [alerts, setAlerts] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlerts();
    const iv = setInterval(loadAlerts, 300000);
    return () => clearInterval(iv);
  }, [filter]);

  const loadAlerts = async () => {
    try {
      const data = await apiFetch(`/api/alerts?type=${filter}&limit=${limit}`);
      setAlerts(data);
    } catch (e) {
      console.error('Alerts fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  const filters = ['all', 'earthquake', 'fire', 'storm', 'flood', 'tsunami'];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {filters.map(f => (
          <button
            key={f}
            onClick={() => { setFilter(f); setLoading(true); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors capitalize ${
              filter === f
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:bg-slate-700/50'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : alerts.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-8">No active alerts for this filter</p>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert, i) => {
            const Icon = typeIcons[alert.type] || AlertTriangle;
            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`rounded-lg border p-3 ${severityBg(alert.severity)}`}
              >
                <div className="flex items-start gap-3">
                  <Icon className={`w-4 h-4 mt-0.5 ${severityColor(alert.severity)}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-medium text-slate-200 truncate">{alert.title}</h4>
                      <span className="text-xs text-slate-500 shrink-0">{formatTimeAgo(alert.time)}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{alert.location}</p>
                    {alert.magnitude && (
                      <span className="text-xs font-mono text-amber-400">M{alert.magnitude.toFixed(1)}</span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
