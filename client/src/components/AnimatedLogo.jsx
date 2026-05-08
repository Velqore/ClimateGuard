import { motion } from 'framer-motion';

const PETALS = [
  { angle: 0,   color: '#38bdf8', delay: 0    },
  { angle: 72,  color: '#818cf8', delay: 0.45 },
  { angle: 144, color: '#c084fc', delay: 0.9  },
  { angle: 216, color: '#60a5fa', delay: 1.35 },
  { angle: 288, color: '#a78bfa', delay: 1.8  },
];

const PETAL_PATH = 'M0,0 C-10,-10 -11,-20 0,-26 C11,-20 10,-10 0,0 Z';

export function FlowingMark({ size = 48 }) {
  return (
    <svg
      viewBox="-35 -35 70 70"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ overflow: 'visible' }}
    >
      <defs>
        <filter id="lgGlow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2.5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="lgBoltGlow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="1.8" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="lgHalo" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <linearGradient id="boltGrad" x1="0" y1="-14" x2="0" y2="14" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#f0f9ff" />
          <stop offset="45%"  stopColor="#93c5fd" />
          <stop offset="100%" stopColor="#818cf8" />
        </linearGradient>
      </defs>

      <motion.circle
        cx="0" cy="0" r="11"
        fill="#818cf8"
        filter="url(#lgHalo)"
        animate={{ opacity: [0.2, 0.45, 0.2] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        style={{ transformOrigin: '0px 0px' }}
      />

      <motion.g
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        style={{ transformOrigin: '0px 0px' }}
      >
        {PETALS.map((p, i) => (
          <motion.path
            key={i}
            d={PETAL_PATH}
            fill={p.color}
            filter="url(#lgGlow)"
            transform={`rotate(${p.angle})`}
            animate={{ opacity: [0.55, 0.95, 0.55] }}
            transition={{ duration: 3.6, repeat: Infinity, delay: p.delay, ease: 'easeInOut' }}
          />
        ))}
      </motion.g>

      <motion.path
        d="M1.5,-14 L-6,2 L-1,2 L-3,14 L8,0 L2.5,0 Z"
        fill="url(#boltGrad)"
        filter="url(#lgBoltGlow)"
        animate={{ opacity: [0.82, 1, 0.82] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      />
    </svg>
  );
}

export default function AnimatedLogo({ compact = false, size = 'md' }) {
  const sizeMap = {
    sm: { icon: 32, text: 'text-xs',   sub: 'text-[8px]',  gap: 'gap-1.5' },
    md: { icon: 40, text: 'text-sm',   sub: 'text-[9px]',  gap: 'gap-2'   },
    lg: { icon: 48, text: 'text-base', sub: 'text-[10px]', gap: 'gap-2.5' },
    xl: { icon: 60, text: 'text-lg',   sub: 'text-[11px]', gap: 'gap-3'   },
  };

  const s = sizeMap[size] || sizeMap.md;

  return (
    <motion.div
      className={`flex items-center ${compact ? 'gap-2' : s.gap}`}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <div style={{ flexShrink: 0, width: s.icon, height: s.icon, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <FlowingMark size={s.icon} />
      </div>

      {!compact && (
        <motion.div
          className="leading-none select-none"
          initial={{ x: -6, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.12 }}
        >
          <div
            className={`font-black leading-none ${s.text} text-white`}
            style={{ letterSpacing: '-0.03em' }}
          >
            ClimateGuard
          </div>
          <div
            className={`mt-[3px] uppercase ${s.sub}`}
            style={{ letterSpacing: '0.2em', fontWeight: 600, color: 'rgba(148,163,184,0.7)' }}
          >
            climate intelligence
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
