import { motion } from 'framer-motion';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';
import { getRiskColor } from '../utils/helpers';

export default function CityComparison({ comparison }) {
  if (!comparison) return null;

  const { cityA, cityB, hazardComparison, winnerName, loserName, percentSafer, narrative } = comparison;

  const chartData = Object.entries(hazardComparison).map(([key, val]) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    cityA: val.cityA,
    cityB: val.cityB,
  }));

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center p-6 rounded-xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-md"
      >
        <div className="flex items-center justify-center gap-4 mb-4">
          <div className="text-right">
            <h3 className="text-lg font-bold text-slate-200">{cityA.name?.split(',')[0]}</h3>
            <span className="font-mono text-2xl font-bold" style={{ color: getRiskColor(cityA.overall) }}>{cityA.overall}</span>
          </div>
          <div className="px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded-full">
            <span className="text-sm font-bold text-blue-300">VS</span>
          </div>
          <div className="text-left">
            <h3 className="text-lg font-bold text-slate-200">{cityB.name?.split(',')[0]}</h3>
            <span className="font-mono text-2xl font-bold" style={{ color: getRiskColor(cityB.overall) }}>{cityB.overall}</span>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20">
          <span className="text-sm font-medium text-green-300">
            {winnerName?.split(',')[0]} is {percentSafer}% safer
          </span>
        </div>
      </motion.div>

      <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-md p-4 overflow-hidden">
        <h3 className="text-sm font-medium text-slate-300 mb-4">Hazard Comparison</h3>
        <div className="h-64 w-full overflow-hidden">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: 'rgba(148,163,184,0.1)' }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: 'rgba(148,163,184,0.1)' }} domain={[0, 100]} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Bar dataKey="cityA" name={cityA.name?.split(',')[0]} radius={[4, 4, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={getRiskColor(entry.cityA)} fillOpacity={0.8} />
                ))}
              </Bar>
              <Bar dataKey="cityB" name={cityB.name?.split(',')[0]} radius={[4, 4, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={getRiskColor(entry.cityB)} fillOpacity={0.5} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {narrative && (
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-md p-4">
          <p className="text-sm text-slate-300 leading-relaxed">{narrative}</p>
        </div>
      )}

      <div className="space-y-2">
        {Object.entries(hazardComparison).map(([hazard, data]) => (
          <div key={hazard} className="flex items-center gap-3 rounded-lg border border-slate-700/30 bg-slate-800/20 p-3">
            <span className="text-xs text-slate-400 w-24 capitalize">{hazard}</span>
            <div className="flex-1 flex items-center gap-2">
              <div className="flex-1 flex justify-end">
                <div className="w-full max-w-32 h-2 bg-slate-700/50 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${data.cityA}%`, backgroundColor: getRiskColor(data.cityA) }} />
                </div>
              </div>
              <span className="text-xs font-mono text-slate-400 w-6 text-center">{data.cityA}</span>
              <span className="text-xs text-slate-600">vs</span>
              <span className="text-xs font-mono text-slate-400 w-6 text-center">{data.cityB}</span>
              <div className="flex-1">
                <div className="w-full max-w-32 h-2 bg-slate-700/50 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${data.cityB}%`, backgroundColor: getRiskColor(data.cityB) }} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
