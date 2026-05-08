import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Activity, Flame } from 'lucide-react';
import { apiFetch } from '../utils/helpers';
import AnimatedLogo from './AnimatedLogo';
import { useScrollDirection } from '../hooks/useScrollDirection';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [stats, setStats] = useState({ wildfires: 0, earthquakes24hr: 0 });
  const location = useLocation();
  const scrollDirection = useScrollDirection();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    apiFetch('/api/global/stats').then(setStats).catch(() => {});
    const iv = setInterval(() => {
      apiFetch('/api/global/stats').then(setStats).catch(() => {});
    }, 60000);
    return () => clearInterval(iv);
  }, []);

  const links = [
    { to: '/', label: 'Home' },
    { to: '/globe', label: 'Globe' },
    { to: '/map', label: 'Map' },
    { to: '/compare', label: 'Compare' },
    { to: '/leaderboard', label: 'Leaderboard' },
    { to: '/travel', label: 'Travel' },
    { to: '/alerts', label: 'Alerts' },
    { to: '/community', label: 'Community' },
    { to: '/assistant', label: 'Assistant' },
  ];

  return (
    <motion.nav
      initial={{ y: -80 }}
      animate={{ y: scrollDirection === 'down' ? -120 : 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="fixed top-0 left-0 right-0 z-50 flex flex-col items-center transition-all duration-300 pointer-events-none bg-transparent border-none shadow-none"
    >
      <div className={`pointer-events-auto relative overflow-hidden rounded-full border px-2 py-2 m-4 shadow-2xl shadow-black/30 backdrop-blur-xl bg-slate-950/85 max-w-[calc(100vw-1rem)] ${
        scrolled ? 'border-slate-600/80' : 'border-slate-700/70'
      }`}>
        <div className="flex items-center gap-1">
          <Link to="/" className="flex items-center gap-2 px-4 py-2 rounded-full hover:bg-white/5 transition-colors">
            <AnimatedLogo compact size="lg" />
          </Link>

          <div className="hidden lg:flex items-center gap-0.5">
            {links.map(l => (
              <Link
                key={l.to}
                to={l.to}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  location.pathname === l.to
                    ? 'bg-blue-500/20 text-blue-300'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3 ml-2 pl-3 border-l border-slate-700/50">
            <div className="flex items-center gap-1.5 text-xs">
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-orange-300 font-mono">{stats.wildfires || '—'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-amber-300 font-mono">{stats.earthquakes24hr || '—'}</span>
            </div>
          </div>

          <button
            onClick={() => setOpen(!open)}
            className="lg:hidden p-2 rounded-lg hover:bg-blue-500/30 text-slate-300 hover:text-blue-300 transition-all duration-200"
            aria-label="Toggle menu"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              className="lg:hidden absolute top-full left-0 right-0 mt-2 mx-2 rounded-xl bg-slate-900/95 backdrop-blur-md border border-slate-700/50 overflow-hidden shadow-lg"
            >
              <div className="py-2 px-1">
                {links.map(l => (
                  <Link
                    key={l.to}
                    to={l.to}
                    onClick={() => setOpen(false)}
                    className={`block px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      location.pathname === l.to
                        ? 'bg-blue-500/30 text-blue-200 shadow-sm'
                        : 'text-slate-300 hover:text-slate-100 hover:bg-white/10'
                    }`}
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="pointer-events-none w-[min(96vw,1280px)] h-px bg-gradient-to-r from-transparent via-slate-700/70 to-transparent" />
    </motion.nav>
  );
}
