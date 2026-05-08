import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Thermometer, Droplets, Wind } from 'lucide-react';
import { apiFetch } from '../utils/helpers';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function HeatwaveAlert({ lat, lon }) {
  const [heatwaveData, setHeatwaveData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!lat || !lon) return;
    loadHeatwave();
  }, [lat, lon]);

  const loadHeatwave = async () => {
    setLoading(false);
    try {
      const data = await apiFetch(`/api/heatwave?lat=${lat}&lon=${lon}`);
      if (data) setHeatwaveData(data);
    } catch (err) {
      console.error('Heatwave fetch error:', err);
    }
  };

  if (loading || !heatwaveData) return null;

  const { isHeatwave, severity, currentTemp, feelsLike, heatIndex, wetBulbTemp, wetBulbStatus, healthRisks, recommendations, hourlyForecast } = heatwaveData;

  if (!isHeatwave) return null;

  const severityColors = {
    EXTREME: { bg: 'bg-red-900/20', border: 'border-red-500', text: 'text-red-400', badge: '🔥' },
    SEVERE: { bg: 'bg-red-800/15', border: 'border-red-500', text: 'text-red-400', badge: '🌡️' },
    HIGH: { bg: 'bg-orange-800/15', border: 'border-orange-500', text: 'text-orange-400', badge: '⚠️' },
    MODERATE: { bg: 'bg-amber-800/15', border: 'border-amber-500', text: 'text-amber-400', badge: '🌤️' }
  };

  const severityConfig = severityColors[severity] || severityColors.MODERATE;

  const chartData = (hourlyForecast || []).slice(0, 24).map((item, i) => ({
    time: `${i}h`,
    temp: item.temp,
    dangerous: item.dangerous ? 1 : 0
  }));

  const isUnsurvivable = wetBulbTemp >= 35;
  const isCritical = wetBulbTemp >= 32;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Banner */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={`rounded-xl border-2 ${severityConfig.border} ${severityConfig.bg} backdrop-blur-md p-4 overflow-hidden relative`}
      >
        <div className="absolute inset-0 opacity-30 animate-pulse" style={{ background: severityConfig.border }} />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{severityConfig.badge}</span>
            <div>
              <h3 className={`font-bold ${severityConfig.text}`}>HEATWAVE DETECTED</h3>
              <p className="text-sm text-slate-400">{severity} intensity alert</p>
            </div>
          </div>
          <div className={`px-4 py-2 rounded-full font-bold text-sm ${severityConfig.text} border border-current`}>
            {severity}
          </div>
        </div>
      </motion.div>

      {/* Temperature Metrics */}
      <div className="grid md:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-md p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <Thermometer className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-slate-500">Feels Like Temperature</span>
          </div>
          <div className="text-3xl font-bold text-amber-300">{feelsLike}°C</div>
          <p className="text-xs text-slate-500 mt-1">Heat Index: {heatIndex}°C</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className={`rounded-xl border-2 ${isCritical ? 'border-red-500 bg-red-900/10' : 'border-slate-700/50 bg-slate-800/30'} backdrop-blur-md p-4 relative overflow-hidden`}
        >
          {isCritical && <div className="absolute inset-0 opacity-20 animate-pulse bg-red-500" />}
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <Droplets className="w-4 h-4 text-cyan-400" />
              <span className="text-xs text-slate-500">Wet Bulb Temperature</span>
            </div>
            <div className="text-3xl font-bold text-cyan-300">{wetBulbTemp}°C</div>
            <p className={`text-xs mt-1 font-medium ${isUnsurvivable ? 'text-red-400 animate-pulse' : 'text-slate-400'}`}>
              {wetBulbStatus}
            </p>
            {wetBulbTemp >= 32 && (
              <p className="text-xs text-red-300 mt-2 font-mono">
                ⚠️ Above 35°C = unsurvivable for humans
              </p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Peak Temperature */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-md p-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 mb-1">Peak Heat Expected</p>
            <p className="text-lg font-bold text-orange-400">Max: {heatwaveData?.maxForecastTemp}°C</p>
          </div>
          <Wind className="w-8 h-8 text-slate-600" />
        </div>
      </motion.div>

      {/* 72hr Temperature Timeline */}
      {chartData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-md p-4"
        >
          <h4 className="text-sm font-bold text-slate-200 mb-4">72-Hour Temperature Forecast</h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F97316" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                <XAxis dataKey="time" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <Area type="monotone" dataKey="temp" stroke="#F97316" fill="url(#tempGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* Health Risks */}
      <AnimatePresence>
        {healthRisks && healthRisks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="space-y-2"
          >
            <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              Health Risks
            </h4>
            {healthRisks.map((risk, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + i * 0.1 }}
                className="rounded-lg border-l-4 border-red-500 bg-red-900/10 p-3"
              >
                <p className="text-sm text-slate-300">{risk}</p>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recommendations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="rounded-xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-md p-4"
      >
        <h4 className="text-sm font-bold text-slate-200 mb-3">Safety Recommendations</h4>
        <ol className="space-y-2">
          {(recommendations || []).map((rec, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-400">
              <span className="font-bold text-blue-400 mt-0.5 flex-shrink-0">{i + 1}.</span>
              <span>{rec}</span>
            </li>
          ))}
        </ol>
      </motion.div>
    </motion.div>
  );
}
