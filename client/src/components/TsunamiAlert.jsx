import { motion } from 'framer-motion';
import { Waves, AlertTriangle, Clock, ArrowUp } from 'lucide-react';

export default function TsunamiAlert({ tsunami }) {
  if (!tsunami || !tsunami.risk) return null;

  const isCritical = tsunami.level === 'CRITICAL';

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border-2 overflow-hidden ${
        isCritical ? 'border-red-500/60 bg-red-500/10' : 'border-orange-500/40 bg-orange-500/10'
      }`}
    >
      <motion.div
        animate={{
          backgroundColor: isCritical
            ? ['rgba(239,68,68,0.15)', 'rgba(239,68,68,0.05)', 'rgba(239,68,68,0.15)']
            : ['rgba(249,115,22,0.1)', 'rgba(249,115,22,0.03)', 'rgba(249,115,22,0.1)'],
        }}
        transition={{ duration: 2, repeat: Infinity }}
        className="p-4"
      >
        <div className="flex items-center gap-3 mb-3">
          <motion.div animate={{ x: [0, 8, 0, -8, 0] }} transition={{ duration: 2, repeat: Infinity }}>
            <Waves className={`w-6 h-6 ${isCritical ? 'text-red-400' : 'text-orange-400'}`} />
          </motion.div>
          <div>
            <h2 className={`text-lg font-bold ${isCritical ? 'text-red-300' : 'text-orange-300'}`}>
              TSUNAMI {tsunami.level}
            </h2>
            <p className="text-xs text-slate-400">{tsunami.cause}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="bg-slate-900/50 rounded-lg p-2">
            <p className="text-xs text-slate-500">Magnitude</p>
            <p className="font-mono text-lg font-bold text-red-300">M{tsunami.earthquakeMagnitude}</p>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-2">
            <p className="text-xs text-slate-500">Depth</p>
            <p className="font-mono text-lg font-bold text-amber-300">{tsunami.earthquakeDepth}km</p>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-2">
            <p className="text-xs text-slate-500">Coast Distance</p>
            <p className="font-mono text-lg font-bold text-cyan-300">{tsunami.distanceToCoast}km</p>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-2">
            <p className="text-xs text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" /> Est. Arrival</p>
            <p className="font-mono text-lg font-bold text-red-300">{tsunami.estimatedArrivalMinutes}min</p>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
            <ArrowUp className="w-4 h-4 text-red-400" />
            Immediate Actions
          </h3>
          {tsunami.immediateActions?.map((action, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-xs font-mono text-red-400 mt-0.5">{i + 1}.</span>
              <p className="text-sm text-slate-300">{action}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
