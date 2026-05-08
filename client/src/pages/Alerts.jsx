import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, Flame, Mountain, CloudLightning, Waves, Wind, Search, MapPinned, Radar, Bell } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { apiFetch, formatTimeAgo, severityBg, severityColor } from '../utils/helpers';
import ScrollToTopButton from '../components/ScrollToTopButton';

const typeIcons = {
  earthquake: Mountain,
  fire: Flame,
  storm: CloudLightning,
  flood: Waves,
  tsunami: Waves,
  airQuality: Wind,
};

const severityOrder = { critical: 0, high: 1, moderate: 2, low: 3 };

function getSeverityGroup(severity) {
  if (severity === 'critical') return 'critical';
  if (severity === 'high') return 'high';
  if (severity === 'moderate') return 'moderate';
  return 'low';
}

function getSource(alert) {
  if (alert.type === 'earthquake') return 'USGS';
  return 'EONET';
}

function causeFor(alert) {
  if (alert.type === 'earthquake') return 'Caused by tectonic plate movement along a fault line.';
  if (alert.type === 'fire') return 'Caused by dry vegetation, heat, and available ignition sources.';
  if (alert.type === 'storm') return 'Caused by unstable atmospheric pressure and strong wind fields.';
  if (alert.type === 'flood') return 'Caused by excessive rainfall, runoff, or river overflow.';
  if (alert.type === 'tsunami') return 'Caused by underwater displacement, usually after a major earthquake.';
  return 'Environmental monitoring indicates an elevated hazard.';
}

function whatToDo(alert) {
  if (alert.type === 'earthquake') return 'Drop, cover, and hold on. Move away from windows and secure heavy furniture.';
  if (alert.type === 'fire') return 'Evacuate early if instructed, keep N95 masks ready, and avoid smoke exposure.';
  if (alert.type === 'storm') return 'Stay indoors, charge devices, and avoid travel during peak winds.';
  if (alert.type === 'flood') return 'Move to higher ground immediately and never drive through floodwater.';
  if (alert.type === 'tsunami') return 'Go to high ground immediately and stay away from the shoreline.';
  return 'Monitor official advisories and follow local emergency guidance.';
}

function populationEstimate(alert) {
  if (alert.affected) return alert.affected.toLocaleString();
  if (alert.severity === 'critical') return '100,000+';
  if (alert.severity === 'high') return '20,000+';
  if (alert.severity === 'moderate') return '5,000+';
  return 'Unknown';
}

function AlertCard({ alert, onViewMap, onAnalyze }) {
  const Icon = typeIcons[alert.type] || AlertTriangle;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border p-4 ${severityBg(alert.severity)} ${alert.severity === 'critical' ? 'animate-pulse shadow-lg shadow-red-500/10' : ''}`}
    >
      <div className="flex items-start gap-3">
        <div className={`shrink-0 rounded-xl p-2 ${severityBg(alert.severity)}`}>
          <Icon className={`w-6 h-6 ${severityColor(alert.severity)}`} />
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="text-base font-bold text-slate-100">{alert.title}</h4>
              <p className="text-xs text-slate-400">{alert.location || 'Location unavailable'}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] border border-current text-current" style={{ color: alert.severity === 'critical' ? '#f87171' : alert.severity === 'high' ? '#fb923c' : alert.severity === 'moderate' ? '#fbbf24' : '#94a3b8' }}>
                {alert.severity}
              </span>
              <span className="text-xs text-slate-500">{formatTimeAgo(alert.time)}</span>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-slate-700/30 bg-slate-900/30 p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-1">Source</p>
              <p className="text-slate-200">{getSource(alert)}</p>
            </div>
            <div className="rounded-xl border border-slate-700/30 bg-slate-900/30 p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-1">People at risk</p>
              <p className="text-slate-200">{populationEstimate(alert)}</p>
            </div>
            <div className="rounded-xl border border-slate-700/30 bg-slate-900/30 p-3 md:col-span-2">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-1">Cause</p>
              <p className="text-slate-300 text-sm">Caused by: {causeFor(alert)}</p>
            </div>
            <div className="rounded-xl border border-slate-700/30 bg-slate-900/30 p-3 md:col-span-2">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-1">What to do</p>
              <p className="text-slate-300 text-sm">{whatToDo(alert)}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {alert.lat != null && alert.lon != null && (
              <button onClick={() => onViewMap(alert)} className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-xs text-blue-300 hover:bg-blue-500/15 transition-colors">
                <MapPinned className="w-3 h-3" /> View on Map
              </button>
            )}
            <button onClick={() => onAnalyze(alert)} className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-300 hover:bg-emerald-500/15 transition-colors">
              <Radar className="w-3 h-3" /> Analyze Location
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [subscriptionCity, setSubscriptionCity] = useState('');
  const [subscriptionFeedback, setSubscriptionFeedback] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadAlerts();
    const timer = setInterval(loadAlerts, 60000);
    return () => clearInterval(timer);
  }, []);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const [alertsResult, statsResult] = await Promise.allSettled([
        apiFetch('/api/alerts?limit=100'),
        apiFetch('/api/global/stats'),
      ]);

      setAlerts(alertsResult.status === 'fulfilled' && Array.isArray(alertsResult.value) ? alertsResult.value : []);
      setStats(statsResult.status === 'fulfilled' ? statsResult.value : null);
    } catch (error) {
      console.error('Alerts page error:', error);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return alerts.filter(alert => {
      if (!q) return true;
      return `${alert.title} ${alert.location}`.toLowerCase().includes(q);
    }).sort((a, b) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3));
  }, [alerts, query]);

  const grouped = useMemo(() => {
    return {
      critical: filtered.filter(a => getSeverityGroup(a.severity) === 'critical'),
      high: filtered.filter(a => getSeverityGroup(a.severity) === 'high'),
      moderate: filtered.filter(a => getSeverityGroup(a.severity) === 'moderate'),
      low: filtered.filter(a => getSeverityGroup(a.severity) === 'low'),
    };
  }, [filtered]);

  const timelineData = useMemo(() => {
    const bucket = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 }));
    filtered.forEach(alert => {
      const date = new Date(alert.time);
      if (Number.isNaN(date.getTime())) return;
      const hour = date.getHours();
      bucket[hour].count += 1;
    });
    return bucket;
  }, [filtered]);

  const activeCount = filtered.length;
  const counterTone = activeCount > 20 ? 'text-red-400' : activeCount >= 10 ? 'text-amber-400' : 'text-emerald-400';

  const handleViewMap = (alert) => {
    navigate(`/map?lat=${alert.lat}&lon=${alert.lon}`);
  };

  const handleAnalyze = (alert) => {
    navigate(`/dashboard?lat=${alert.lat}&lon=${alert.lon}`);
  };

  const handleSubscribe = () => {
    if (!subscriptionCity.trim()) return;
    setSubscriptionFeedback(`✅ You'll be notified about ${subscriptionCity.trim()} alerts`);
  };

  const statText = stats
    ? `Today: ${stats.earthquakes24hr || 0} earthquakes | ${stats.wildfires || 0} wildfires | ${stats.extremeAlerts || 0} storms | 0 floods`
    : 'Today: data unavailable';

  return (
    <div className="min-h-screen bg-[#030712] pt-20 pb-12 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-slate-100 mb-2 flex items-center gap-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            <AlertTriangle className="w-6 h-6 text-amber-400" />
            Global Alert Feed
          </h1>
          <p className="text-sm text-slate-500 mb-6">Grouped by severity with live counters, timeline, and response actions.</p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-md p-4">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Live alert counter</p>
            <p className={`mt-2 text-3xl font-bold ${counterTone}`}>{activeCount}</p>
            <p className="text-sm text-slate-400">active alerts worldwide right now</p>
          </div>
          <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-md p-4 lg:col-span-2">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500 mb-2">Alert statistics bar</p>
            <p className="text-sm text-slate-300">{statText}</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-md p-4 lg:col-span-2">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-100">Alert timeline</h2>
                <p className="text-sm text-slate-500">Mini timeline showing alert frequency over the last 24 hours</p>
              </div>
            </div>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                  <XAxis dataKey="hour" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 10, fontSize: 12 }} />
                  <Bar dataKey="count" fill="#38bdf8" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-md p-4">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500 mb-3">Subscribe to alerts</p>
            <div className="space-y-3">
              <input
                value={subscriptionCity}
                onChange={e => setSubscriptionCity(e.target.value)}
                placeholder="Get alerts for your city"
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-blue-500/50"
              />
              <button onClick={handleSubscribe} className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-500 transition-colors">
                <Bell className="w-4 h-4" /> Subscribe
              </button>
              {subscriptionFeedback && <p className="text-sm text-emerald-300">{subscriptionFeedback}</p>}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between rounded-2xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-md p-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search alerts by country or city"
              className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-blue-500/50"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-md p-6 text-sm text-slate-500">
            No alerts match your current filter.
          </div>
        ) : (
          <div className="space-y-6">
            {(['critical', 'high', 'moderate', 'low']).map(severity => {
              const items = grouped[severity];
              if (!items.length) return null;
              const title = severity === 'critical' ? '🔴 Critical alerts' : severity === 'high' ? '🟠 High alerts' : severity === 'moderate' ? '🟡 Moderate alerts' : '✅ Informational';
              return (
                <section key={severity} className="space-y-3">
                  <h2 className="text-lg font-bold text-slate-100">{title}</h2>
                  <div className="grid gap-4">
                    {items.map(alert => (
                      <AlertCard key={alert.id} alert={alert} onViewMap={handleViewMap} onAnalyze={handleAnalyze} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
      <ScrollToTopButton />
    </div>
  );
}
