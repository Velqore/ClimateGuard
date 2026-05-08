import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { formatTimeAgo } from '../utils/helpers';

export default function TimelineChart({ forecast = [] }) {
  if (!forecast || forecast.length === 0) {
    return (
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-md p-4">
        <p className="text-sm text-slate-500">Forecast data temporarily unavailable</p>
      </div>
    );
  }

  const data = forecast.filter((_, i) => i % 3 === 0).map(f => ({
    time: new Date(f.dt * 1000).toLocaleDateString('en', { weekday: 'short', hour: 'numeric' }),
    temp: Math.round(f.temp),
    humidity: f.humidity,
    wind: Math.round(f.windSpeed),
    rain: Math.round((f.rain3h || 0) * 10) / 10,
  }));

  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-md p-4 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
      <h3 className="text-sm font-medium text-slate-300 mb-4">72-Hour Forecast</h3>
      <div className="h-48 w-full overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="rainGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
            <XAxis dataKey="time" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={{ stroke: 'rgba(148,163,184,0.1)' }} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={{ stroke: 'rgba(148,163,184,0.1)' }} />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: '#94a3b8' }}
            />
            <Area type="monotone" dataKey="temp" stroke="#f59e0b" fill="url(#tempGrad)" strokeWidth={2} name="Temp (°C)" />
            <Area type="monotone" dataKey="rain" stroke="#06b6d4" fill="url(#rainGrad)" strokeWidth={2} name="Rain (mm)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
