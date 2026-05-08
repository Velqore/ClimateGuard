import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Shield, Fuel, Siren } from 'lucide-react';

const typeConfig = {
  hospital: { color: '#ef4444', label: 'Hospital' },
  shelter: { color: '#22c55e', label: 'Shelter' },
  fire_station: { color: '#f97316', label: 'Fire Station' },
  police: { color: '#3b82f6', label: 'Police' },
  fuel: { color: '#eab308', label: 'Gas Station' },
};

function createIcon(type) {
  const config = typeConfig[type] || { color: '#94a3b8' };
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="width:12px;height:12px;background:${config.color};border:2px solid white;border-radius:50%;box-shadow:0 0 6px ${config.color}80;"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
}

function FlyToCenter({ lat, lon }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lon], 12, { duration: 1.5 });
  }, [lat, lon, map]);
  return null;
}

export default function ResourceMap({ lat, lon, resources = [] }) {
  if (!lat || !lon) return null;

  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-md overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-500/30 to-transparent" />
      <h3 className="text-sm font-medium text-slate-300 p-4 pb-2">Nearby Emergency Resources</h3>
      <div className="h-64 w-full overflow-hidden relative">
        <MapContainer center={[lat, lon]} zoom={12} className="h-full w-full absolute inset-0" zoomControl={false}>
          <FlyToCenter lat={lat} lon={lon} />
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          />
          <Marker position={[lat, lon]} icon={L.divIcon({
            className: 'custom-marker',
            html: '<div style="width:16px;height:16px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 0 10px #3b82f680;"></div>',
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          })} />
          {resources.map(r => (
            <Marker key={r.id} position={[r.lat, r.lon]} icon={createIcon(r.type)}>
              <Popup>
                <div className="text-xs">
                  <strong>{r.name}</strong><br />
                  Type: {typeConfig[r.type]?.label || r.type}<br />
                  Distance: {r.distance}km
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
      <div className="p-3 flex flex-wrap gap-3 border-t border-slate-700/30">
        {Object.entries(typeConfig).map(([type, config]) => {
          const count = resources.filter(r => r.type === type).length;
          if (count === 0) return null;
          return (
            <div key={type} className="flex items-center gap-1.5 text-xs">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: config.color }} />
              <span className="text-slate-400">{config.label}: {count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
