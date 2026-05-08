import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, TrendingUp } from 'lucide-react';
import { apiFetch } from '../utils/helpers';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function AQIWidget({ lat, lon }) {
  const [aqiData, setAqiData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!lat || !lon) return;
    loadAQI();
  }, [lat, lon]);

  const loadAQI = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch(`/api/aqi?lat=${lat}&lon=${lon}`);
      setAqiData(data);
    } catch (err) {
      console.error('AQI fetch error:', err);
      setError('Failed to fetch air quality data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-md p-6">
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-md p-6">
        <p className="text-sm text-slate-500">{error}</p>
      </div>
    );
  }

  if (!aqiData) return null;

  const { overallAQI, category, color, pollutants, recommendation, dominantPollutant } = aqiData;

  const AnimatedCircle = ({ value, max = 500 }) => {
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (value / max) * circumference;
    
    return (
      <motion.svg width="120" height="120" viewBox="0 0 120 120" initial="initial" animate="animate">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(148,163,184,0.1)" strokeWidth="4" />
        <motion.circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeInOut' }}
          strokeLinecap="round"
        />
        <text x="60" y="65" textAnchor="middle" fontSize="24" fill={color} fontWeight="bold" className="font-mono">
          {value}
        </text>
        <text x="60" y="80" textAnchor="middle" fontSize="11" fill="#94a3b8">
          {category}
        </text>
      </motion.svg>
    );
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-md p-6"
      >
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
        <h3 className="text-lg font-bold text-slate-200 mb-6 flex items-center gap-2">
          <span className="text-2xl">😷</span> Air Quality Index
        </h3>

        {/* AQI Gauge */}
        <div className="flex items-center justify-center mb-8">
          <AnimatedCircle value={overallAQI} />
        </div>

        {/* Recommendation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="rounded-lg border-l-4 p-4 bg-slate-900/40"
          style={{ borderColor: color }}
        >
          <p className="text-sm text-slate-300 leading-relaxed">{recommendation}</p>
        </motion.div>
      </motion.div>

      {/* Pollutant Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-md p-6"
      >
        <h4 className="text-sm font-bold text-slate-200 mb-4">Pollutant Levels</h4>
        <div className="space-y-4">
          {Object.entries(pollutants).map(([key, data], index) => {
            const safeFraction = Math.min((data.value / data.safe_limit), 1);
            const percentageOverSafe = Math.max(((data.value - data.safe_limit) / data.safe_limit) * 100, 0);
            const barColor = data.value > data.safe_limit ? '#EF4444' : '#22C55E';
            const pollutantLabels = {
              pm25: 'PM2.5 (Fine Particles)',
              pm10: 'PM10 (Coarse Particles)',
              co: 'CO (Carbon Monoxide)',
              no2: 'NO₂ (Nitrogen Dioxide)',
              o3: 'O₃ (Ozone)'
            };

            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-slate-400">{pollutantLabels[key]}</span>
                  <span className="text-xs font-mono text-slate-300">
                    {data.value} {data.unit}
                    <span className="text-slate-600 mx-1">•</span>
                    <span className={data.value > data.safe_limit ? 'text-red-400' : 'text-green-400'}>
                      Safe: {data.safe_limit} {data.unit}
                    </span>
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-700/40 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: barColor }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(safeFraction * 100, 100)}%` }}
                    transition={{ duration: 0.8, delay: 0.3 + index * 0.1 }}
                  />
                </div>
                {percentageOverSafe > 0 && (
                  <p className="text-xs text-red-400 mt-1">
                    ⚠️ {Math.round(percentageOverSafe)}% above safe limit
                  </p>
                )}
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Health Risks */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-md p-6"
      >
        <h4 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          Health Recommendations
        </h4>
        <ul className="space-y-2">
          {[
            'Stay hydrated throughout the day',
            'Avoid strenuous outdoor activities during peak pollution hours (7-9am, 4-6pm)',
            'Wear an N95 mask if outdoor activity is necessary',
            'Keep indoor air clean with air purifiers if available',
            'Monitor air quality regularly'
          ].map((rec, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
              <span className="text-blue-400 mt-1">✓</span>
              <span>{rec}</span>
            </li>
          ))}
        </ul>
      </motion.div>
    </div>
  );
}
