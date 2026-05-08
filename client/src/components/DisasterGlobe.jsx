import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Globe, Loader2, AlertTriangle, Zap, Waves, Flame, Wind } from 'lucide-react';

function hasWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
  } catch { return false; }
}

const TYPE_ICONS = { EQ: Zap, EARTHQUAKE: Zap, FL: Waves, FLOOD: Waves, WF: Flame, WILDFIRE: Flame, FIRE: Flame, TC: Wind, CYCLONE: Wind, HURRICANE: Wind };

function FlatMapFallback({ events }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#030712] relative overflow-hidden">
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse at 50% 40%, rgba(30,64,175,0.15) 0%, transparent 70%)',
      }} />
      <div className="relative w-full max-w-4xl px-4">
        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-900/30 border border-blue-700/30 rounded-full text-xs text-blue-300 mb-3">
            <Globe className="w-3 h-3" /> {events.length} Live War Hotspots — 3D Globe renders in production browser
          </div>
        </div>
        <div className="relative bg-slate-900/60 border border-slate-700/40 rounded-2xl overflow-hidden"
          style={{ paddingTop: '50%' }}>
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 400" preserveAspectRatio="xMidYMid meet">
            <defs>
              <radialGradient id="bg" cx="50%" cy="50%">
                <stop offset="0%" stopColor="#0f172a" />
                <stop offset="100%" stopColor="#020617" />
              </radialGradient>
            </defs>
            <rect width="800" height="400" fill="url(#bg)" />
            {/* Grid lines */}
            {[-60,-30,0,30,60].map(lat => {
              const y = ((90 - lat) / 180) * 400;
              return <line key={lat} x1="0" y1={y} x2="800" y2={y} stroke="rgba(148,163,184,0.06)" strokeWidth="1" />;
            })}
            {[-150,-120,-90,-60,-30,0,30,60,90,120,150].map(lng => {
              const x = ((lng + 180) / 360) * 800;
              return <line key={lng} x1={x} y1="0" x2={x} y2="400" stroke="rgba(148,163,184,0.06)" strokeWidth="1" />;
            })}
            {/* Equator */}
            <line x1="0" y1="200" x2="800" y2="200" stroke="rgba(148,163,184,0.12)" strokeWidth="1.5" />
            {/* Events */}
            {events.slice(0, 80).map((e, i) => {
              const x = ((Number(e.lon ?? e.longitude ?? 0) + 180) / 360) * 800;
              const y = ((90 - Number(e.lat ?? 0)) / 180) * 400;
              const color = TYPE_COLORS[String(e.eventType || '').toUpperCase().split(' ')[0]] || '#94a3b8';
              const r = e.severity === 'critical' ? 6 : 4;
              return (
                <g key={i}>
                  <motion.circle
                    cx={x} cy={y}
                    fill={color}
                    initial={{ r, opacity: 0.7 }}
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2 + (i % 4) * 0.5, repeat: Infinity, delay: (i * 0.15) % 3 }}
                    r={r}
                  />
                  <circle cx={x} cy={y} r={r + 6} fill={color} opacity={0.1} />
                </g>
              );
            })}
          </svg>
        </div>
        <div className="flex flex-wrap gap-2 justify-center mt-4">
          {[
            { label: 'Earthquake', color: '#f59e0b' }, { label: 'Storm', color: '#06b6d4' },
            { label: 'Flood', color: '#3b82f6' }, { label: 'Wildfire', color: '#f97316' },
          ].map(l => (
            <span key={l.label} className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="w-2 h-2 rounded-full" style={{ background: l.color }} />{l.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

const TYPE_COLORS = {
  EQ: '#f59e0b', EARTHQUAKE: '#f59e0b',
  TC: '#06b6d4', CYCLONE: '#06b6d4', HURRICANE: '#06b6d4',
  FL: '#3b82f6', FLOOD: '#3b82f6',
  VO: '#ef4444', VOLCANO: '#ef4444',
  WF: '#f97316', WILDFIRE: '#f97316', FIRE: '#f97316',
  DR: '#eab308', DROUGHT: '#eab308',
  STORM: '#8b5cf6', DISASTER: '#94a3b8',
  CONFLICT: '#ef4444', WAR: '#ef4444',
  WATER: '#38bdf8', FOOD: '#f59e0b', EMISSIONS: '#94a3b8', ECOSYSTEM: '#22c55e', DISPLACEMENT: '#fb7185', HEALTH: '#a855f7', INFRASTRUCTURE: '#c084fc',
};

const NAMED_PLACES = [
  { name: 'Tehran, Iran', lat: 35.6892, lng: 51.389, kind: 'city' },
  { name: 'Dubai, UAE', lat: 25.2048, lng: 55.2708, kind: 'city' },
  { name: 'Abu Dhabi, UAE', lat: 24.4539, lng: 54.3773, kind: 'city' },
  { name: 'London, UK', lat: 51.5072, lng: -0.1276, kind: 'city' },
  { name: 'New York, USA', lat: 40.7128, lng: -74.006, kind: 'city' },
  { name: 'Tokyo, Japan', lat: 35.6762, lng: 139.6503, kind: 'city' },
  { name: 'Delhi, India', lat: 28.6139, lng: 77.209, kind: 'city' },
  { name: 'Cairo, Egypt', lat: 30.0444, lng: 31.2357, kind: 'city' },
  { name: 'Nairobi, Kenya', lat: -1.2864, lng: 36.8172, kind: 'city' },
  { name: 'São Paulo, Brazil', lat: -23.5505, lng: -46.6333, kind: 'city' },
  { name: 'Ukraine', lat: 49.0, lng: 31.0, kind: 'country' },
  { name: 'Sudan', lat: 15.0, lng: 30.0, kind: 'country' },
  { name: 'Yemen', lat: 15.5, lng: 47.0, kind: 'country' },
  { name: 'Iran', lat: 32.0, lng: 53.0, kind: 'country' },
  { name: 'UAE', lat: 24.0, lng: 54.0, kind: 'country' },
  { name: 'Gaza Strip', lat: 31.5, lng: 34.5, kind: 'region' },
];

function getColor(type = '') {
  const k = type.toUpperCase().split(' ')[0];
  return TYPE_COLORS[k] || '#94a3b8';
}

export default function DisasterGlobe({ events = [], onEventClick }) {
  const mountRef = useRef(null);
  const globeRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [hovered, setHovered] = useState(null);
  const [webglOk] = useState(() => hasWebGL());
  const interactionRef = useRef({ hovering: false, dragging: false });

  useEffect(() => {
    if (!webglOk) return;
    let globe;
    let destroyed = false;
    let controls;
    let handleInteractionStart;
    let handleInteractionEnd;
    let handlePointerEnter;
    let handlePointerLeave;

    async function init() {
      const el = mountRef.current;
      if (!el) return;

      const GlobeGL = (await import('globe.gl')).default;
      if (destroyed) return;

      globe = GlobeGL()(el);
      globeRef.current = globe;

      globe
        .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-dark.jpg')
        .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png')
        .backgroundImageUrl('https://unpkg.com/three-globe/example/img/night-sky.png')
        .width(el.clientWidth)
        .height(el.clientHeight)
        .atmosphereColor('#1e40af')
        .atmosphereAltitude(0.18)
        .pointOfView({ lat: 20, lng: 10, altitude: 2.2 }, 0);

      controls = globe.controls?.();
      handleInteractionStart = () => {
        interactionRef.current.dragging = true;
        if (controls) controls.autoRotate = false;
      };
      handleInteractionEnd = () => {
        interactionRef.current.dragging = false;
        if (controls) controls.autoRotate = false;
      };
      handlePointerEnter = () => {
        interactionRef.current.hovering = true;
      };
      handlePointerLeave = () => {
        interactionRef.current.hovering = false;
        interactionRef.current.dragging = false;
        if (controls) controls.autoRotate = true;
      };

      if (controls) {
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.45;
        controls.enablePan = false;
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.addEventListener('start', handleInteractionStart);
        controls.addEventListener('end', handleInteractionEnd);
      }

      el.addEventListener('pointerenter', handlePointerEnter);
      el.addEventListener('pointerleave', handlePointerLeave);

      const mappedEvents = events.map(e => ({
        ...e,
        lat: e.lat ?? e.coordinates?.lat ?? (Math.random() * 140 - 70),
        lng: e.lng ?? e.lon ?? e.coordinates?.lon ?? (Math.random() * 360 - 180),
        color: e.color || getColor(e.eventType || e.type || e.effect || ''),
        label: e.title || e.name || 'Event',
        conflict: e.conflict || e.country || e.region || '',
        summary: e.effect || e.summary || e.description || '',
        size: e.severity === 'critical' ? 0.7 : e.severity === 'high' ? 0.55 : 0.4,
      }));

      globe
        .pointsData(mappedEvents)
        .pointColor('color')
        .pointRadius('size')
        .pointAltitude(0.02)
        .pointLabel(d => `
          <div style="background:linear-gradient(180deg,rgba(15,23,42,0.98),rgba(2,6,23,0.96));border:1px solid rgba(148,163,184,0.18);border-radius:14px;padding:10px 12px;max-width:240px;font-family:sans-serif;box-shadow:0 18px 40px rgba(2,6,23,0.45);">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:6px;">
              <div style="font-weight:700;color:#f8fafc;font-size:13px;line-height:1.3;">${d.label}</div>
              ${d.eventType ? `<div style="color:${d.color};font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;">${String(d.eventType).slice(0, 18)}</div>` : ''}
            </div>
            ${d.conflict ? `<div style="color:#cbd5e1;font-size:11px;">📍 ${d.conflict}</div>` : ''}
            ${d.summary ? `<div style="color:#94a3b8;font-size:11px;margin-top:5px;line-height:1.4;">${d.summary}</div>` : ''}
            <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;">
              <span style="padding:3px 8px;border-radius:999px;background:rgba(59,130,246,0.12);color:#93c5fd;font-size:10px;">Live signal</span>
              ${d.size >= 0.55 ? '<span style="padding:3px 8px;border-radius:999px;background:rgba(239,68,68,0.12);color:#fca5a5;font-size:10px;">High priority</span>' : '<span style="padding:3px 8px;border-radius:999px;background:rgba(148,163,184,0.12);color:#cbd5e1;font-size:10px;">Monitor</span>'}
            </div>
          </div>
        `)
        .onPointClick(d => onEventClick?.(d))
        .onPointHover(d => setHovered(d?.label || null));

      globe
        .labelsData(NAMED_PLACES)
        .labelLat('lat')
        .labelLng('lng')
        .labelText('name')
        .labelColor(d => d.kind === 'country' ? 'rgba(56,189,248,0.95)' : d.kind === 'region' ? 'rgba(248,113,113,0.95)' : 'rgba(226,232,240,0.92)')
        .labelSize(d => d.kind === 'country' ? 1.35 : d.kind === 'region' ? 1.15 : 1)
        .labelDotRadius(d => d.kind === 'country' ? 0.25 : 0.18)
        .labelAltitude(0.01)
        .labelResolution(2)
        .labelIncludeDot(true);

      globe
        .ringsData(mappedEvents.slice(0, 12))
        .ringColor(() => t => `rgba(239,68,68,${Math.max(0, 0.4 * (1 - t))})`)
        .ringMaxRadius(3)
        .ringPropagationSpeed(1.2)
        .ringRepeatPeriod(1800);

      setLoaded(true);
    }

    init().catch(console.error);

    const ro = new ResizeObserver(() => {
      if (globeRef.current && mountRef.current) {
        globeRef.current.width(mountRef.current.clientWidth);
        globeRef.current.height(mountRef.current.clientHeight);
      }
    });
    if (mountRef.current) ro.observe(mountRef.current);

    return () => {
      destroyed = true;
      const el = mountRef.current;
      if (controls && handleInteractionStart) controls.removeEventListener('start', handleInteractionStart);
      if (controls && handleInteractionEnd) controls.removeEventListener('end', handleInteractionEnd);
      if (el && handlePointerEnter) el.removeEventListener('pointerenter', handlePointerEnter);
      if (el && handlePointerLeave) el.removeEventListener('pointerleave', handlePointerLeave);
      if (globeRef.current) {
        try { globeRef.current._destructor?.(); } catch {}
      }
      ro.disconnect();
    };
  }, [events]);

  if (!webglOk) return <FlatMapFallback events={events} />;

  return (
    <div className="relative w-full h-full">
      <div ref={mountRef} className="w-full h-full" />

      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#030712]">
          <div className="flex flex-col items-center gap-3">
            <Globe className="w-10 h-10 text-blue-400 animate-pulse" />
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading war room globe...
            </div>
          </div>
        </div>
      )}

      {hovered && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-slate-900/90 border border-slate-700/50 rounded-full text-xs text-slate-300 pointer-events-none backdrop-blur-md"
        >
          {hovered}
        </motion.div>
      )}
    </div>
  );
}
