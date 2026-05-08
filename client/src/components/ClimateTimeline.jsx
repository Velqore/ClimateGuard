import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function ClimateTimeline({ historical }) {
  if (!historical?.years?.length) {
    return (
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-md p-4">
        <p className="text-sm text-slate-500">Historical data temporarily unavailable</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-md p-4">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
      <h3 className="text-sm font-medium text-slate-300 mb-1">Historical Climate Trends</h3>
      <p className="text-xs text-slate-500 mb-4">{historical.summary}</p>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={historical.years}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
            <XAxis dataKey="year" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={{ stroke: 'rgba(148,163,184,0.1)' }} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={{ stroke: 'rgba(148,163,184,0.1)' }} />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: '#94a3b8' }}
            />
            <Line type="monotone" dataKey="avgTemp" stroke="#f59e0b" strokeWidth={2} dot={false} name="Avg Temp (°C)" />
            <Line type="monotone" dataKey="disasters" stroke="#ef4444" strokeWidth={2} dot={false} name="Disasters" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
