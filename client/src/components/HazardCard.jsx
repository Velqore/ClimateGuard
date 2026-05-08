import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mountain, Flame, CloudLightning, Waves, Thermometer, Wind,
  ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus,
} from 'lucide-react';
import { getRiskColor, getRiskLevel } from '../utils/helpers';
import { hazardCardReveal } from '../utils/animations';
import CauseAnalysis from './CauseAnalysis';

const iconMap = {
  earthquake: Mountain,
  wildfire: Flame,
  storm: CloudLightning,
  flood: Waves,
  heat: Thermometer,
  airQuality: Wind,
};

const labelMap = {
  earthquake: 'Earthquake',
  wildfire: 'Wildfire',
  storm: 'Storm',
  flood: 'Flood',
  heat: 'Extreme Heat',
  airQuality: 'Air Quality',
};

export default function HazardCard({ type, score, cause, index = 0 }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = iconMap[type] || Mountain;
  const color = getRiskColor(score);
  const level = getRiskLevel(score);
  const isCritical = score > 80;

  return (
    <motion.div
      variants={hazardCardReveal}
      initial="initial"
      animate="animate"
      transition={{ ...hazardCardReveal.transition, delay: index * 0.08 }}
      className={`relative overflow-hidden rounded-xl border backdrop-blur-md transition-all ${
        isCritical ? 'border-red-500/30' : 'border-slate-700/50'
      }`}
      style={{
        background: 'rgba(30, 41, 59, 0.7)',
        boxShadow: isCritical ? `0 0 20px rgba(239, 68, 68, 0.15)` : 'none',
      }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${color}40, transparent)` }}
      />

      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 text-left"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-lg"
              style={{ backgroundColor: `${color}15` }}
            >
              <Icon className="w-5 h-5" style={{ color }} />
            </div>
            <div>
              <h3 className="text-sm font-medium text-slate-200">{labelMap[type]}</h3>
              <p className="text-xs text-slate-500">{level}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-24 h-2 bg-slate-700/50 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: color }}
                initial={{ width: 0 }}
                animate={{ width: `${score}%` }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: index * 0.08 }}
              />
            </div>
            <span className="font-mono text-lg font-bold w-10 text-right" style={{ color }}>
              {score}
            </span>
            {cause && (
              expanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />
            )}
          </div>
        </div>
      </button>

      <AnimatePresence>
        {expanded && cause && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <CauseAnalysis type={type} cause={cause} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
