import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { getRiskColor, getRiskLevel } from '../utils/helpers';

const TICKS = 10;
const START_ANGLE = -135;
const END_ANGLE = 135;
const TOTAL_ANGLE = END_ANGLE - START_ANGLE;

function polarToXY(cx, cy, r, angleDeg) {
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx, cy, r, startDeg, endDeg) {
  const s = polarToXY(cx, cy, r, startDeg);
  const e = polarToXY(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
}

export default function RiskMeter({ score = 0, size = 'large', label = 'Overall Risk' }) {
  const [animated, setAnimated] = useState(0);
  const riskColor = getRiskColor(score);
  const riskLevel = getRiskLevel(score);
  const isLarge = size === 'large';

  const SZ = isLarge ? 220 : 140;
  const cx = SZ / 2;
  const cy = SZ / 2 + (isLarge ? 10 : 6);
  const R = isLarge ? 82 : 52;
  const strokeW = isLarge ? 10 : 7;

  useEffect(() => {
    let start = 0;
    const dur = 1400;
    const t0 = Date.now();
    const run = () => {
      const p = Math.min((Date.now() - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 4);
      setAnimated(Math.round(eased * score));
      if (p < 1) requestAnimationFrame(run);
    };
    requestAnimationFrame(run);
  }, [score]);

  const needleAngle = START_ANGLE + (animated / 100) * TOTAL_ANGLE;
  const needleLen = R - strokeW / 2 - 4;
  const needleTip = polarToXY(cx, cy, needleLen, needleAngle);
  const needleTail = polarToXY(cx, cy, -14, needleAngle);

  const arcEnd = START_ANGLE + (animated / 100) * TOTAL_ANGLE;
  const isCritical = score > 80;
  const isHigh = score > 60;

  const zones = [
    { start: START_ANGLE, end: START_ANGLE + TOTAL_ANGLE * 0.25, color: '#22c55e' },
    { start: START_ANGLE + TOTAL_ANGLE * 0.25, end: START_ANGLE + TOTAL_ANGLE * 0.5, color: '#eab308' },
    { start: START_ANGLE + TOTAL_ANGLE * 0.5, end: START_ANGLE + TOTAL_ANGLE * 0.75, color: '#f97316' },
    { start: START_ANGLE + TOTAL_ANGLE * 0.75, end: END_ANGLE, color: '#ef4444' },
  ];

  return (
    <div className="flex flex-col items-center select-none">
      <div className="relative" style={{ width: SZ, height: SZ * 0.72 }}>
        <svg width={SZ} height={SZ * 0.72} viewBox={`0 0 ${SZ} ${SZ * 0.72}`} overflow="visible">
          {/* Track */}
          <path
            d={describeArc(cx, cy, R, START_ANGLE, END_ANGLE)}
            fill="none" stroke="rgba(148,163,184,0.08)" strokeWidth={strokeW} strokeLinecap="round"
          />

          {/* Colored zone arcs */}
          {zones.map((z, i) => (
            <path key={i}
              d={describeArc(cx, cy, R, z.start, z.end)}
              fill="none" stroke={z.color} strokeWidth={strokeW * 0.35} strokeLinecap="butt" opacity={0.25}
            />
          ))}

          {/* Tick marks */}
          {Array.from({ length: TICKS + 1 }).map((_, i) => {
            const angle = START_ANGLE + (i / TICKS) * TOTAL_ANGLE;
            const outer = polarToXY(cx, cy, R + strokeW * 0.5 + 2, angle);
            const inner = polarToXY(cx, cy, R + strokeW * 0.5 + (i % 5 === 0 ? 8 : 5), angle);
            return (
              <line key={i}
                x1={outer.x} y1={outer.y} x2={inner.x} y2={inner.y}
                stroke="rgba(148,163,184,0.25)" strokeWidth={i % 5 === 0 ? 1.5 : 0.75} strokeLinecap="round"
              />
            );
          })}

          {/* Active arc */}
          {animated > 0 && (
            <motion.path
              d={describeArc(cx, cy, R, START_ANGLE, arcEnd)}
              fill="none" stroke={riskColor} strokeWidth={strokeW} strokeLinecap="round"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
              transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
              style={{ filter: isCritical ? `drop-shadow(0 0 6px ${riskColor})` : isHigh ? `drop-shadow(0 0 3px ${riskColor})` : 'none' }}
            />
          )}

          {/* Glow ring for critical */}
          {isCritical && (
            <motion.path
              d={describeArc(cx, cy, R, START_ANGLE, arcEnd)}
              fill="none" stroke={riskColor} strokeWidth={strokeW * 1.6} strokeLinecap="round" opacity={0.15}
              animate={{ opacity: [0.08, 0.2, 0.08] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}

          {/* Needle */}
          <motion.g
            initial={{ rotate: START_ANGLE - 90, originX: cx, originY: cy }}
            animate={{ rotate: needleAngle - 90 }}
            style={{ originX: cx, originY: cy }}
            transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <line
              x1={cx} y1={cy}
              x2={polarToXY(cx, cy, needleLen, 0).x}
              y2={polarToXY(cx, cy, needleLen, 0).y}
              stroke="white" strokeWidth={isLarge ? 2.5 : 1.8} strokeLinecap="round"
              style={{ filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.6))' }}
            />
            <line
              x1={cx} y1={cy}
              x2={polarToXY(cx, cy, -12, 0).x}
              y2={polarToXY(cx, cy, -12, 0).y}
              stroke="rgba(148,163,184,0.5)" strokeWidth={isLarge ? 1.5 : 1} strokeLinecap="round"
            />
          </motion.g>

          {/* Hub */}
          <circle cx={cx} cy={cy} r={isLarge ? 7 : 5} fill="white" style={{ filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.5))' }} />
          <circle cx={cx} cy={cy} r={isLarge ? 3.5 : 2.5} fill={riskColor} />

          {/* Score */}
          <text x={cx} y={cy - R * 0.28} textAnchor="middle" fontSize={isLarge ? 30 : 19}
            fontWeight="800" fontFamily="ui-monospace,monospace" fill={riskColor}>
            {animated}
          </text>
          <text x={cx} y={cy - R * 0.28 + (isLarge ? 18 : 12)} textAnchor="middle"
            fontSize={isLarge ? 10 : 8} fontWeight="700" fontFamily="sans-serif" fill={riskColor} opacity={0.85}>
            {riskLevel}
          </text>

          {/* Zone labels */}
          {isLarge && (
            <>
              {[
                { angle: START_ANGLE + TOTAL_ANGLE * 0.12, label: 'MIN', color: '#22c55e' },
                { angle: START_ANGLE + TOTAL_ANGLE * 0.38, label: 'LOW', color: '#eab308' },
                { angle: START_ANGLE + TOTAL_ANGLE * 0.62, label: 'MOD', color: '#f97316' },
                { angle: START_ANGLE + TOTAL_ANGLE * 0.88, label: 'HIGH', color: '#ef4444' },
              ].map((z, i) => {
                const pos = polarToXY(cx, cy, R + strokeW + 15, z.angle);
                return (
                  <text key={i} x={pos.x} y={pos.y} textAnchor="middle" fontSize="7"
                    fontWeight="600" fontFamily="sans-serif" fill={z.color} opacity={0.6}>
                    {z.label}
                  </text>
                );
              })}
            </>
          )}
        </svg>
      </div>

      {label && (
        <span className={`mt-1 text-slate-400 ${isLarge ? 'text-sm' : 'text-xs'}`}>{label}</span>
      )}
    </div>
  );
}
