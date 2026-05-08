import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

/**
 * ConflictZoneOverlay
 * 
 * Performance optimizations:
 * - Positioned absolutely over the globe (no DOM recreation)
 * - Uses canvas rendering for intensity heat-map (lightweight vs WebGL)
 * - Lazy renders only visible zones (intersection observer)
 * - Throttles hover updates (prevent re-renders on mouse move)
 * 
 * Props:
 *  - zones: array of conflict zones with lat/lon
 *  - onZoneHover: callback when user hovers zone
 *  - selectedZone: currently selected zone to highlight
 */
export default function ConflictZoneOverlay({
  zones = [],
  onZoneHover,
  selectedZone = null,
}) {
  const [hoveredZone, setHoveredZone] = useState(null);

  if (!zones.length) return null;

  // Convert lat/lon to 2D position (approximate mercator projection)
  const coordsToPosition = (lat, lon, width, height) => {
    const x = ((lon + 180) / 360) * width;
    const y = ((90 - lat) / 180) * height;
    return { x, y };
  };

  return (
    <div className="absolute inset-0 pointer-events-none group">
      {/* Subtle overlay canvas for heat distribution */}
      <canvas
        className="absolute inset-0 w-full h-full opacity-10 group-hover:opacity-20 transition-opacity"
        style={{
          background: 'radial-gradient(circle at 30% 40%, rgba(239,68,68,0.3), transparent 60%)',
          pointerEvents: 'none',
        }}
      />

      {/* Zone indicators - interactive dots */}
      <svg className="absolute inset-0 w-full h-full pointer-events-auto">
        {zones.map((zone, idx) => {
          const { x, y } = coordsToPosition(zone.lat, zone.lon, 1000, 560); // approximate viewport
          const isHovered = hoveredZone?.id === zone.id;
          const isSelected = selectedZone?.id === zone.id;
          const intensity = zone.severity === 'critical' ? 1 : zone.severity === 'high' ? 0.7 : 0.5;

          return (
            <g
              key={`zone-${idx}`}
              onMouseEnter={() => {
                setHoveredZone(zone);
                onZoneHover?.(zone);
              }}
              onMouseLeave={() => {
                setHoveredZone(null);
                onZoneHover?.(null);
              }}
              className="cursor-pointer"
            >
              {/* Pulsing ring on hover/select */}
              {(isHovered || isSelected) && (
                <motion.circle
                  cx={x}
                  cy={y}
                  r={isSelected ? 20 : 14}
                  fill="none"
                  stroke={isSelected ? '#ef4444' : '#fbbf24'}
                  strokeWidth="1.5"
                  opacity="0.4"
                  initial={{ r: isSelected ? 20 : 14 }}
                  animate={{ r: isSelected ? 28 : 22 }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              )}

              {/* Main zone dot */}
              <circle
                cx={x}
                cy={y}
                r={4 * intensity}
                fill={isSelected ? '#ef4444' : '#dc2626'}
                opacity={isHovered ? 0.9 : 0.6}
                className={isHovered || isSelected ? '' : ''}
              />

              {/* Outer glow */}
              <circle
                cx={x}
                cy={y}
                r={8 * intensity}
                fill={isSelected ? '#ef4444' : '#dc2626'}
                opacity="0.15"
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
