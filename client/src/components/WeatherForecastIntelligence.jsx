import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, ReferenceArea } from 'recharts';
import { fetchOpenMeteoForecast, formatForecastTime, getCompassDirection, getUvCategory } from '../utils/intelligence';

function Skeleton() {
  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-md p-5 space-y-4">
      <div className="h-6 w-64 rounded bg-slate-700/40 animate-pulse" />
      <div className="grid md:grid-cols-2 gap-4">
        <div className="h-32 rounded-xl bg-slate-700/30 animate-pulse" />
        <div className="h-32 rounded-xl bg-slate-700/30 animate-pulse" />
      </div>
      <div className="h-44 rounded-xl bg-slate-700/30 animate-pulse" />
    </div>
  );
}

function Badge({ tone = 'slate', children }) {
  const tones = {
    blue: 'bg-blue-500/15 text-blue-300 border-blue-500/20',
    sky: 'bg-sky-500/15 text-sky-300 border-sky-500/20',
    emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
    amber: 'bg-amber-500/15 text-amber-300 border-amber-500/20',
    orange: 'bg-orange-500/15 text-orange-300 border-orange-500/20',
    red: 'bg-red-500/15 text-red-300 border-red-500/20',
    slate: 'bg-slate-500/15 text-slate-300 border-slate-500/20',
  };

  return <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${tones[tone] || tones.slate}`}>{children}</span>;
}

export default function WeatherForecastIntelligence({ lat, lon }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!lat || !lon) {
        setInsights(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const [result] = await Promise.allSettled([fetchOpenMeteoForecast(lat, lon)]);
        if (!active) return;
        setInsights(result.status === 'fulfilled' ? result.value : null);
      } catch (error) {
        console.error('Weather intelligence fetch error:', error);
        if (active) setInsights(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [lat, lon]);

  if (loading) return <Skeleton />;

  if (!insights) {
    return (
      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-md p-5">
        <h2 className="text-lg font-bold text-slate-100 mb-2">🌦️ Weather Forecast Intelligence</h2>
        <p className="text-sm text-slate-500">Data unavailable for this location right now.</p>
      </div>
    );
  }

  const rainClassMap = {
    blue: 'bg-blue-500/15 text-blue-300 border-blue-500/20',
    sky: 'bg-sky-500/15 text-sky-300 border-sky-500/20',
    emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
    slate: 'bg-slate-500/15 text-slate-300 border-slate-500/20',
  };

  const heatTone = insights.heat.color;
  const stormTone = insights.storm.color;
  const rainTone = insights.rain.color;
  const visTone = insights.visibility.color;

  const rainBars = insights.next24.map((hour, index) => ({
    hour: index + 1,
    probability: hour.precipitationProbability,
    precipitation: hour.precipitation,
    time: formatForecastTime(hour.time),
  }));

  const tempChart = insights.next72.map((hour, index) => ({
    label: index % 12 === 0 ? formatForecastTime(hour.time) : '',
    temp: hour.apparentTemperature,
    uv: hour.uvIndex,
  }));

  const rainBadgeClass = rainClassMap[rainTone] || rainClassMap.slate;

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-slate-700/50 bg-slate-900/40 backdrop-blur-md p-5 space-y-5"
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-slate-100">🌦️ Weather Forecast Intelligence</h2>
          <p className="text-sm text-slate-500">Rain, heatwave, storm, and visibility predictions for the next 72 hours.</p>
        </div>
        <Badge tone={rainTone}>{insights.rain.badge}</Badge>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-700/40 bg-slate-900/40 p-4">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500 mb-2">Will it rain today?</p>
          <div className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${rainBadgeClass}`}>{insights.rain.badge}</div>
          <p className="text-sm text-slate-400 mt-3">Max precipitation chance in the next 24 hours: <span className="font-mono text-slate-200">{Math.round(insights.rain.maxProbability)}%</span></p>
          <p className="text-sm text-slate-400 mt-1">Total expected rainfall: <span className="font-mono text-slate-200">{insights.rain.totalRain} mm</span></p>
          <p className="text-sm text-slate-400 mt-1">Heaviest rain expected at: <span className="font-mono text-slate-200">{formatForecastTime(insights.rain.heaviestRain?.time)}</span></p>
        </div>

        <div className="rounded-xl border border-slate-700/40 bg-slate-900/40 p-4">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500 mb-2">Heatwave warning</p>
          <div className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${heatTone === 'red' ? 'bg-red-500/15 text-red-300 border-red-500/20' : heatTone === 'orange' ? 'bg-orange-500/15 text-orange-300 border-orange-500/20' : heatTone === 'amber' ? 'bg-amber-500/15 text-amber-300 border-amber-500/20' : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20'}`}>
            {insights.heat.badge}
          </div>
          <p className="text-sm text-slate-400 mt-3">Peak feels-like: <span className="font-mono text-slate-200">{insights.heat.peakTemp == null ? '—' : `${Math.round(insights.heat.peakTemp)}°C`}</span></p>
          <p className="text-sm text-slate-400 mt-1">UV Index peak: <span className="font-mono text-slate-200">{insights.heat.peakUv == null ? '—' : `${insights.heat.peakUv.toFixed(1)} (${getUvCategory(insights.heat.peakUv)})`}</span></p>
          {insights.heat.cause && <p className="text-xs text-slate-500 mt-2">{insights.heat.cause}</p>}
        </div>

        <div className="rounded-xl border border-slate-700/40 bg-slate-900/40 p-4">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500 mb-2">Storm risk</p>
          <div className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${stormTone === 'red' ? 'bg-red-500/15 text-red-300 border-red-500/20' : stormTone === 'orange' ? 'bg-orange-500/15 text-orange-300 border-orange-500/20' : stormTone === 'amber' ? 'bg-amber-500/15 text-amber-300 border-amber-500/20' : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20'}`}>
            {insights.storm.badge}
          </div>
          <p className="text-sm text-slate-400 mt-3">Peak wind speed: <span className="font-mono text-slate-200">{Math.round(insights.storm.peakWind)} km/h</span></p>
          <p className="text-sm text-slate-400 mt-1">Peak time: <span className="font-mono text-slate-200">{formatForecastTime(insights.storm.peakAt?.time)}</span></p>
          <div className="mt-3 flex items-center gap-2 text-sm text-slate-300">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-lg transition-transform" style={{ transform: `rotate(${insights.storm.direction}deg)` }}>↑</span>
            <span>{getCompassDirection(insights.storm.direction)} wind direction</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-700/40 bg-slate-900/40 p-4">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500 mb-2">Visibility</p>
          <div className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${visTone === 'red' ? 'bg-red-500/15 text-red-300 border-red-500/20' : visTone === 'orange' ? 'bg-orange-500/15 text-orange-300 border-orange-500/20' : visTone === 'amber' ? 'bg-amber-500/15 text-amber-300 border-amber-500/20' : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20'}`}>
            {insights.visibility.value == null ? 'Data unavailable' : `${Math.round(insights.visibility.value)} km — ${insights.visibility.label}`}
          </div>
          <p className="text-sm text-slate-400 mt-3">Visibility status: <span className="font-mono text-slate-200">{insights.visibility.label}</span></p>
          {insights.visibility.detail && <p className="text-xs text-slate-500 mt-2">{insights.visibility.detail}</p>}
        </div>
      </div>

      <div className="grid xl:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-700/40 bg-slate-900/40 p-4">
          <h3 className="text-sm font-semibold text-slate-200 mb-3">Rain Timeline Bar</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rainBars}>
                <defs>
                  <linearGradient id="rainBarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#60A5FA" />
                    <stop offset="100%" stopColor="#1D4ED8" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                <XAxis dataKey="hour" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 10, fontSize: 12 }}
                  labelStyle={{ color: '#cbd5e1' }}
                  formatter={(value, name, props) => [`${value}${name === 'probability' ? '%' : ' mm'}`, name === 'probability' ? 'Chance' : 'Rain']}
                  labelFormatter={(label, payload) => payload?.[0]?.payload?.time || `Hour ${label}`}
                />
                <Bar dataKey="probability" radius={[8, 8, 0, 0]} fill="url(#rainBarGrad)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-slate-700/40 bg-slate-900/40 p-4">
          <h3 className="text-sm font-semibold text-slate-200 mb-3">72-Hour Feels-Like Temperature</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={tempChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                <ReferenceArea y1={35} y2={40} fill="#f59e0b" fillOpacity={0.12} />
                <ReferenceArea y1={40} y2={55} fill="#ef4444" fillOpacity={0.12} />
                <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 10, fontSize: 12 }} />
                <Line type="monotone" dataKey="temp" stroke="#fb923c" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
