import { motion } from 'framer-motion';
import { Compass, MapPin, Clock, Phone, ArrowRight, Shield } from 'lucide-react';
import { getRiskColor } from '../utils/helpers';

const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
const directionAngles = { N: 0, NE: 45, E: 90, SE: 135, S: 180, SW: 225, W: 270, NW: 315 };

export default function EvacuationPlanner({ scores, location, resources = [] }) {
  const overall = Object.values(scores).reduce((s, v) => s + v, 0) / 6;
  if (overall < 60) return null;

  const dominant = Object.entries(scores).sort(([, a], [, b]) => b - a)[0];
  const hazardDirection = getHazardDirection(dominant[0]);
  const safeDirections = directions.filter(d => {
    const angle = directionAngles[d];
    const hazardAngle = directionAngles[hazardDirection];
    const diff = Math.abs(angle - hazardAngle);
    return diff > 90 && diff < 270;
  }).slice(0, 3);

  const hospitals = resources.filter(r => r.type === 'hospital').slice(0, 3);
  const shelters = resources.filter(r => r.type === 'shelter' || r.type === 'fire_station').slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border-2 border-orange-500/30 bg-orange-500/5 backdrop-blur-md overflow-hidden"
    >
      <div className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-orange-400" />
          <h3 className="text-base font-bold text-orange-300">Evacuation Planner</h3>
          <span className="px-2 py-0.5 bg-red-500/20 text-red-300 text-xs rounded-full font-medium">
            {overall > 80 ? 'CRITICAL' : 'HIGH'} RISK
          </span>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
              <Compass className="w-4 h-4 text-blue-400" />
              Safe Evacuation Directions
            </h4>
            <p className="text-xs text-slate-400 mb-3">
              Head {safeDirections.join('/')} — away from {dominant[0]} bearing {hazardDirection}
            </p>

            <div className="relative w-40 h-40 mx-auto mb-4">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(148,163,184,0.1)" strokeWidth="1" />
                <circle cx="50" cy="50" r="30" fill="none" stroke="rgba(148,163,184,0.05)" strokeWidth="1" />
                <circle cx="50" cy="50" r="15" fill="none" stroke="rgba(148,163,184,0.05)" strokeWidth="1" />
                <circle cx="50" cy="50" r="4" fill="#f97316" />
                {directions.map(d => {
                  const angle = (directionAngles[d] - 90) * Math.PI / 180;
                  const x = 50 + 42 * Math.cos(angle);
                  const y = 50 + 42 * Math.sin(angle);
                  const isSafe = safeDirections.includes(d);
                  return (
                    <g key={d}>
                      <text x={x} y={y} textAnchor="middle" dominantBaseline="middle"
                        className="text-[6px] font-mono"
                        fill={isSafe ? '#22c55e' : '#64748b'}
                      >
                        {d}
                      </text>
                      {isSafe && (
                        <circle cx={50 + 25 * Math.cos(angle)} cy={50 + 25 * Math.sin(angle)} r="3" fill="#22c55e" opacity="0.5" />
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                Time Estimates
              </h4>
              <p className="text-xs text-slate-400">Recommended evacuation window: Next 2 hours</p>
              <p className="text-xs text-slate-400">If hazard progresses at current rate: ~3-6 hours before impact</p>
            </div>
          </div>

          <div className="space-y-3">
            {hospitals.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-red-400" />
                  Nearby Hospitals
                </h4>
                {hospitals.map(h => (
                  <div key={h.id} className="flex items-center gap-2 text-xs text-slate-400 py-1">
                    <MapPin className="w-3 h-3 text-red-400" />
                    <span className="truncate">{h.name}</span>
                    <span className="font-mono text-slate-500">{h.distance}km</span>
                  </div>
                ))}
              </div>
            )}

            {shelters.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-400" />
                  Emergency Shelters
                </h4>
                {shelters.map(s => (
                  <div key={s.id} className="flex items-center gap-2 text-xs text-slate-400 py-1">
                    <MapPin className="w-3 h-3 text-green-400" />
                    <span className="truncate">{s.name}</span>
                    <span className="font-mono text-slate-500">{s.distance}km</span>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 border-t border-slate-700/30">
              <h4 className="text-sm font-medium text-slate-300 mb-2">Emergency Steps</h4>
              <ol className="space-y-1">
                {[
                  'Gather emergency kit and documents',
                  'Follow safe direction — do NOT head toward hazard',
                  'Notify neighbors and family of your plan',
                  'Monitor official channels for updates',
                  'Do not return until all-clear is given',
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                    <span className="font-mono text-orange-400 mt-0.5">{i + 1}.</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function getHazardDirection(hazardType) {
  const map = {
    wildfire: 'SW',
    flood: 'S',
    storm: 'W',
    earthquake: 'E',
    heat: 'S',
    airQuality: 'W',
  };
  return map[hazardType] || 'S';
}
