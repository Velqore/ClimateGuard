import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Send, ThumbsUp, Flame, Waves, Zap, Wind, Thermometer, AlertTriangle, Clock, Loader2 } from 'lucide-react';
import { apiFetch } from '../utils/helpers';

const TYPES = [
  { id: 'wildfire', label: 'Wildfire', icon: Flame, color: 'text-orange-400 border-orange-500/40 bg-orange-500/10' },
  { id: 'flood', label: 'Flood', icon: Waves, color: 'text-blue-400 border-blue-500/40 bg-blue-500/10' },
  { id: 'earthquake', label: 'Earthquake', icon: Zap, color: 'text-amber-400 border-amber-500/40 bg-amber-500/10' },
  { id: 'storm', label: 'Storm', icon: Wind, color: 'text-cyan-400 border-cyan-500/40 bg-cyan-500/10' },
  { id: 'heatwave', label: 'Heatwave', icon: Thermometer, color: 'text-red-400 border-red-500/40 bg-red-500/10' },
  { id: 'other', label: 'Other', icon: AlertTriangle, color: 'text-slate-400 border-slate-500/40 bg-slate-500/10' },
];

const SEVERITIES = [
  { id: 'low', label: 'Low', color: 'text-green-400 border-green-500/40 bg-green-500/10' },
  { id: 'medium', label: 'Medium', color: 'text-yellow-400 border-yellow-500/40 bg-yellow-500/10' },
  { id: 'high', label: 'High', color: 'text-orange-400 border-orange-500/40 bg-orange-500/10' },
  { id: 'critical', label: 'Critical', color: 'text-red-400 border-red-500/40 bg-red-500/10' },
];

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function CommunityReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ type: 'wildfire', severity: 'medium', description: '', location: '' });
  const [geoStatus, setGeoStatus] = useState(null);
  const [coords, setCoords] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [votedIds, setVotedIds] = useState(new Set());

  useEffect(() => { loadReports(); }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/community');
      setReports(Array.isArray(data) ? data : []);
    } catch { setReports([]); }
    finally { setLoading(false); }
  };

  const getLocation = () => {
    setGeoStatus('loading');
    navigator.geolocation.getCurrentPosition(
      pos => {
        setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setGeoStatus('ok');
      },
      () => setGeoStatus('error'),
      { timeout: 8000 }
    );
  };

  const submit = async () => {
    if (!form.description.trim() || !coords) return;
    setSubmitting(true);
    try {
      await apiFetch('/api/community', {
        method: 'POST',
        body: JSON.stringify({
          lat: coords.lat, lon: coords.lon,
          type: form.type, severity: form.severity,
          description: form.description.trim(),
          location: form.location.trim(),
        }),
      });
      setSubmitted(true);
      setForm({ type: 'wildfire', severity: 'medium', description: '', location: '' });
      setCoords(null);
      setGeoStatus(null);
      setTimeout(() => { setSubmitted(false); loadReports(); }, 1800);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const vote = async (id) => {
    if (votedIds.has(id)) return;
    setVotedIds(prev => new Set([...prev, id]));
    setReports(prev => prev.map(r => r.id === id ? { ...r, votes: (r.votes || 0) + 1 } : r));
    try { await apiFetch(`/api/community/${id}/vote`, { method: 'POST' }); } catch {}
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white mb-2">Community Incident Reports</h1>
        <p className="text-slate-400 text-sm">Report climate incidents you witness in real time. Help others stay informed.</p>
      </div>

      {/* Submit form */}
      <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 backdrop-blur-md p-6">
        <h2 className="text-base font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-400" /> Report an Incident
        </h2>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-2 block">Hazard Type</label>
            <div className="flex flex-wrap gap-2">
              {TYPES.map(t => {
                const Icon = t.icon;
                return (
                  <button key={t.id}
                    onClick={() => setForm(p => ({ ...p, type: t.id }))}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                      form.type === t.id ? t.color : 'text-slate-500 border-slate-700/40 bg-slate-800/40 hover:border-slate-600'
                    }`}>
                    <Icon className="w-3.5 h-3.5" />{t.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-2 block">Severity</label>
            <div className="flex gap-2">
              {SEVERITIES.map(s => (
                <button key={s.id}
                  onClick={() => setForm(p => ({ ...p, severity: s.id }))}
                  className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                    form.severity === s.id ? s.color : 'text-slate-500 border-slate-700/40 bg-slate-800/40 hover:border-slate-600'
                  }`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-2 block">What are you seeing?</label>
            <textarea
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Describe what you're witnessing — size, direction, intensity, immediate risks..."
              rows={3}
              maxLength={500}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/40 rounded-xl text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-blue-500/50 resize-none"
            />
            <div className="text-right text-[10px] text-slate-600 mt-1">{form.description.length}/500</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wider mb-2 block">Location name (optional)</label>
              <input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                placeholder="e.g. Downtown LA, near airport"
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/40 rounded-lg text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-blue-500/50" />
            </div>
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wider mb-2 block">GPS Coordinates</label>
              <button onClick={getLocation}
                className={`w-full px-3 py-2 rounded-lg border text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  geoStatus === 'ok' ? 'bg-green-900/30 border-green-500/40 text-green-300' :
                  geoStatus === 'error' ? 'bg-red-900/30 border-red-500/40 text-red-400' :
                  geoStatus === 'loading' ? 'bg-slate-800/50 border-slate-700/40 text-slate-400' :
                  'bg-slate-800/50 border-slate-700/40 text-slate-400 hover:border-slate-500'
                }`}>
                {geoStatus === 'loading' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
                {geoStatus === 'ok' ? `${coords?.lat?.toFixed(3)}, ${coords?.lon?.toFixed(3)}` :
                 geoStatus === 'error' ? 'Location denied' :
                 geoStatus === 'loading' ? 'Getting location...' : 'Use my location'}
              </button>
            </div>
          </div>

          <button onClick={submit}
            disabled={submitting || !form.description.trim() || !coords || submitted}
            className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
              submitted ? 'bg-green-600/80 text-white' :
              'bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40'
            }`}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {submitted ? '✓ Report submitted!' : !coords ? 'Use your location first' : 'Submit Report'}
          </button>
        </div>
      </div>

      {/* Reports list */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-200">Recent Reports</h2>
          <button onClick={loadReports} className="text-xs text-blue-400 hover:text-blue-300">Refresh</button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-500 gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading reports...
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-12 text-slate-600">
            No reports yet. Be the first to report an incident.
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {reports.map((r, i) => {
                const typeObj = TYPES.find(t => t.id === r.type) || TYPES[5];
                const sevObj = SEVERITIES.find(s => s.id === r.severity) || SEVERITIES[1];
                const Icon = typeObj.icon;
                return (
                  <motion.div key={r.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="rounded-xl border border-slate-700/40 bg-slate-900/50 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg border ${typeObj.color} shrink-0`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-sm font-semibold text-slate-200 capitalize">{r.type}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${sevObj.color}`}>
                            {r.severity?.toUpperCase()}
                          </span>
                          {r.location && (
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <MapPin className="w-2.5 h-2.5" />{r.location}
                            </span>
                          )}
                          <span className="text-xs text-slate-600 flex items-center gap-1 ml-auto">
                            <Clock className="w-2.5 h-2.5" />{timeAgo(r.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm text-slate-300 leading-relaxed">{r.description}</p>
                      </div>
                      <button
                        onClick={() => vote(r.id)}
                        disabled={votedIds.has(r.id)}
                        className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-all shrink-0 ${
                          votedIds.has(r.id)
                            ? 'text-blue-400 bg-blue-500/10 border border-blue-500/30'
                            : 'text-slate-500 hover:text-slate-300 border border-transparent hover:border-slate-700'
                        }`}
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-mono">{r.votes || 0}</span>
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
