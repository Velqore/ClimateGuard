import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Shield, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AlertTakeover({ riskData, cityName }) {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!riskData || dismissed) return;
    const score = riskData.overall ?? 0;
    if (score >= 70) {
      const t = setTimeout(() => setShow(true), 400);
      return () => clearTimeout(t);
    } else {
      setShow(false);
    }
  }, [riskData, dismissed]);

  const dismiss = () => { setShow(false); setDismissed(true); };

  const score = riskData?.overall ?? 0;
  const dominant = riskData?.dominant || 'hazard';
  const level = score >= 85 ? 'CRITICAL' : 'HIGH';
  const color = score >= 85 ? '#ef4444' : '#f97316';
  const glow = score >= 85 ? 'rgba(239,68,68,0.3)' : 'rgba(249,115,22,0.25)';

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ backdropFilter: 'blur(8px)', background: 'rgba(3,7,18,0.85)' }}
        >
          <motion.div
            initial={{ scale: 0.7, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: -40 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            className="relative max-w-lg w-full mx-4 rounded-2xl border overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #0f0a0a 0%, #1a0a0a 100%)',
              borderColor: color,
              boxShadow: `0 0 60px ${glow}, 0 0 120px ${glow}, inset 0 1px 0 rgba(255,255,255,0.05)`,
            }}
          >
            <motion.div
              className="absolute top-0 left-0 right-0 h-1"
              style={{ background: color }}
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            />

            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute rounded-full"
                  style={{
                    width: 6, height: 6,
                    background: color,
                    left: `${15 + i * 14}%`,
                    top: `${20 + (i % 2) * 50}%`,
                    opacity: 0.3,
                  }}
                  animate={{ opacity: [0.1, 0.5, 0.1], scale: [1, 2, 1] }}
                  transition={{ duration: 1.5 + i * 0.3, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </div>

            <div className="p-8">
              <div className="flex items-start justify-between mb-6">
                <motion.div
                  animate={{ rotate: [0, -5, 5, -5, 5, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 2 }}
                  className="p-3 rounded-xl"
                  style={{ background: `${color}22`, border: `1px solid ${color}44` }}
                >
                  <AlertTriangle className="w-8 h-8" style={{ color }} />
                </motion.div>
                <button onClick={dismiss} className="text-slate-500 hover:text-slate-300 transition-colors p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-2">
                <span className="text-xs font-mono font-bold tracking-widest" style={{ color }}>
                  ⚠ RISK LEVEL: {level}
                </span>
              </div>

              <h2 className="text-2xl font-bold text-white mb-2">
                {cityName || 'This location'} is at elevated risk
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed mb-6">
                Our sensors show a <span className="font-bold" style={{ color }}>{score}/100</span> overall risk score
                with <span className="font-semibold text-white">{dominant}</span> as the dominant hazard.
                Immediate awareness and preparedness steps are strongly recommended.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => { dismiss(); navigate('/assistant'); }}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white transition-all"
                  style={{ background: color, boxShadow: `0 4px 20px ${glow}` }}
                >
                  <Shield className="w-4 h-4" /> Get Safety Plan
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={dismiss}
                  className="px-4 py-3 rounded-xl text-sm font-medium text-slate-400 border border-slate-700/50 bg-slate-800/50 hover:bg-slate-700/50 transition-colors"
                >
                  Acknowledge
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
