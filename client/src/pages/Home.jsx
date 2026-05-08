import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Flame, Activity, AlertTriangle, Globe, Wind, Droplets, Thermometer, Waves, Zap } from 'lucide-react';
import SearchBar from '../components/SearchBar';
import DangerLeaderboard from '../components/DangerLeaderboard';
import ScrollToTopButton from '../components/ScrollToTopButton';
import { FlowingMark } from '../components/AnimatedLogo';
import { apiFetch } from '../utils/helpers';
import ParticleBackground from '../components/ParticleBackground';

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
};

const HAZARDS = [
  { icon: Flame,       label: 'Wildfire',    color: 'text-orange-400',  bg: 'bg-orange-500/10 border-orange-500/20' },
  { icon: Activity,    label: 'Earthquake',  color: 'text-amber-400',   bg: 'bg-amber-500/10  border-amber-500/20'  },
  { icon: Droplets,    label: 'Flood',       color: 'text-blue-400',    bg: 'bg-blue-500/10   border-blue-500/20'   },
  { icon: Wind,        label: 'Storm',       color: 'text-cyan-400',    bg: 'bg-cyan-500/10   border-cyan-500/20'   },
  { icon: Thermometer, label: 'Heat',        color: 'text-red-400',     bg: 'bg-red-500/10    border-red-500/20'    },
  { icon: Waves,       label: 'Tsunami',     color: 'text-teal-400',    bg: 'bg-teal-500/10   border-teal-500/20'   },
];

const TICKER = [
  'LIVE: Monitoring 50 major cities worldwide',
  'ALERT: Active seismic events in Pacific Ring of Fire',
  'UPDATE: Wildfire conditions elevated in Western US',
  'DATA: Air quality stations active globally',
  'INFO: Risk scores updated every 15 minutes',
  'LIVE: Monitoring 50 major cities worldwide',
  'ALERT: Active seismic events in Pacific Ring of Fire',
  'UPDATE: Wildfire conditions elevated in Western US',
];

export default function Home() {
  const [stats, setStats] = useState({ wildfires: 0, earthquakes24hr: 0, extremeAlerts: 0, citiesMonitored: 50 });

  useEffect(() => {
    apiFetch('/api/global/stats').then(setStats).catch(() => {});
    const iv = setInterval(() => apiFetch('/api/global/stats').then(setStats).catch(() => {}), 60000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="min-h-screen bg-[#030712] relative overflow-hidden">
      <ParticleBackground riskScore={0} />

      {/* ── Background atmosphere ── */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Aurora blobs */}
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(ellipse, rgba(56,189,248,0.07) 0%, rgba(129,140,248,0.05) 40%, transparent 70%)' }} />
        <div className="absolute top-[5%] left-[10%] w-[500px] h-[400px] rounded-full"
          style={{ background: 'radial-gradient(ellipse, rgba(192,132,252,0.06) 0%, transparent 65%)' }} />
        <div className="absolute top-[10%] right-[5%] w-[400px] h-[400px] rounded-full"
          style={{ background: 'radial-gradient(ellipse, rgba(96,165,250,0.07) 0%, transparent 65%)' }} />

        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: 'linear-gradient(rgba(148,163,184,1) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,1) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }} />

        {/* Floating dots */}
        {Array.from({ length: 16 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: i % 3 === 0 ? 3 : 2,
              height: i % 3 === 0 ? 3 : 2,
              backgroundColor: ['#f97316', '#ef4444', '#f59e0b', '#06b6d4', '#818cf8'][i % 5],
              left: `${8 + (i * 41) % 84}%`,
              top: `${8 + (i * 57) % 75}%`,
            }}
            animate={{ opacity: [0.15, 0.7, 0.15], scale: [1, 1.8, 1] }}
            transition={{ duration: 2.5 + (i % 4) * 0.7, repeat: Infinity, delay: (i * 0.3) % 3 }}
          />
        ))}
      </div>

      <div className="relative z-10">

        {/* ── HERO ── */}
        <div className="pt-28 pb-10 px-4">
          <div className="max-w-4xl mx-auto text-center">

            {/* Live badge */}
            <motion.div
              variants={fadeUp} initial="initial" animate="animate"
              transition={{ duration: 0.5, delay: 0.05 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-500/25 bg-blue-500/8 mb-8"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400" />
              </span>
              <span className="text-xs font-medium text-blue-300 tracking-wide">Live Global Monitoring</span>
            </motion.div>

            {/* Logo mark + brand name */}
            <motion.div
              variants={fadeUp} initial="initial" animate="animate"
              transition={{ duration: 0.6, delay: 0.1 }}
              className="flex flex-col items-center gap-3 mb-6"
            >
              <FlowingMark size={80} />
              <div className="flex flex-col items-center gap-0.5">
                <h2 className="text-2xl font-black text-white tracking-tight" style={{ letterSpacing: '-0.03em' }}>
                  ClimateGuard
                </h2>
                <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500 font-semibold">
                  climate intelligence
                </p>
              </div>
            </motion.div>

            {/* Main headline */}
            <motion.h1
              variants={fadeUp} initial="initial" animate="animate"
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-5xl sm:text-6xl md:text-7xl font-black text-slate-100 leading-[1.05] mb-5"
              style={{ letterSpacing: '-0.04em' }}
            >
              Know Your{' '}
              <span style={{
                background: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 50%, #c084fc 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                Climate Risk.
              </span>
              <br />
              <span className="text-slate-300 text-4xl sm:text-5xl md:text-6xl font-bold">
                Anywhere. Right Now.
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              variants={fadeUp} initial="initial" animate="animate"
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-base sm:text-lg text-slate-400 mb-8 max-w-2xl mx-auto leading-relaxed"
            >
              Real-time intelligence across wildfire, earthquake, flood, storm, heat &amp; air quality —
              <span className="text-slate-300"> all from live data, for any city on Earth.</span>
            </motion.p>

            {/* Search */}
            <motion.div
              variants={fadeUp} initial="initial" animate="animate"
              transition={{ duration: 0.6, delay: 0.38 }}
              className="max-w-2xl mx-auto mb-10"
            >
              <SearchBar large />
            </motion.div>

            {/* Hazard pills */}
            <motion.div
              variants={fadeUp} initial="initial" animate="animate"
              transition={{ duration: 0.6, delay: 0.46 }}
              className="flex flex-wrap justify-center gap-2 mb-10"
            >
              {HAZARDS.map(({ icon: Icon, label, color, bg }) => (
                <div key={label} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium ${bg} ${color}`}>
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* ── Live stats bar ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.5 }}
          className="max-w-3xl mx-auto px-4 mb-10"
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: Flame,         label: 'Active Wildfires',  value: stats.wildfires,      color: 'text-orange-400', bg: 'bg-orange-500/8  border-orange-500/20' },
              { icon: Activity,      label: 'Earthquakes 24hr',  value: stats.earthquakes24hr, color: 'text-amber-400',  bg: 'bg-amber-500/8   border-amber-500/20'  },
              { icon: AlertTriangle, label: 'Extreme Alerts',    value: stats.extremeAlerts,   color: 'text-red-400',    bg: 'bg-red-500/8     border-red-500/20'    },
              { icon: Globe,         label: 'Cities Monitored',  value: stats.citiesMonitored, color: 'text-blue-400',   bg: 'bg-blue-500/8    border-blue-500/20'   },
            ].map(({ icon: Icon, label, value, color, bg }) => (
              <div key={label} className={`flex flex-col items-center gap-1 py-4 px-3 rounded-2xl border ${bg} backdrop-blur-sm`}>
                <Icon className={`w-4 h-4 ${color}`} />
                <span className={`font-black text-2xl leading-none ${color}`}>{value || '—'}</span>
                <span className="text-[10px] text-slate-500 text-center leading-tight">{label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Ticker ── */}
        <div className="border-y border-slate-800/60 bg-slate-900/40 backdrop-blur-sm py-2.5 overflow-hidden mb-12">
          <motion.div
            animate={{ x: [0, -1200] }}
            transition={{ duration: 35, repeat: Infinity, ease: 'linear' }}
            className="flex gap-10 whitespace-nowrap"
          >
            {TICKER.map((text, i) => (
              <span key={i} className="flex items-center gap-2 text-xs text-slate-500">
                <Zap className="w-3 h-3 text-blue-500 shrink-0" />
                <span className="text-slate-400">{text}</span>
              </span>
            ))}
          </motion.div>
        </div>

        {/* ── Leaderboard ── */}
        <div className="max-w-4xl mx-auto px-4 pb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.5 }}
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl font-bold text-slate-100">Global Danger Leaderboard</h2>
                <p className="text-xs text-slate-500 mt-0.5">Cities ranked by live climate risk score</p>
              </div>
              <a href="/leaderboard" className="flex items-center gap-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors px-3 py-1.5 rounded-full border border-blue-500/20 hover:border-blue-500/40">
                View all <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
            <DangerLeaderboard preview />
          </motion.div>
        </div>

      </div>
      <ScrollToTopButton />
    </div>
  );
}
