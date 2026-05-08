import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { apiFetch } from '../utils/helpers';
import WeatherLayerControl from './WeatherLayerControl';

function FlyTo({ lat, lon }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lon) map.flyTo([lat, lon], 6, { duration: 1.5 });
  }, [lat, lon, map]);
  return null;
}

function MapClickHandler({ onAnalyzeLocation }) {
  const map = useMap();

  useEffect(() => {
    let popup = null;

    const handleClick = (e) => {
      const { lat, lng } = e.latlng;
      const container = document.createElement('div');
      container.style.minWidth = '220px';
      container.style.fontSize = '12px';
      container.style.color = '#e2e8f0';

      container.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:10px;background:rgba(15,23,42,0.98);border:1px solid rgba(59,130,246,0.25);border-radius:16px;padding:12px 14px;box-shadow:0 16px 40px rgba(2,6,23,0.45);">
          <div>
            <div style="font-weight:700;color:#f8fafc;margin-bottom:4px;">Select location</div>
            <div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:#cbd5e1;">
              Lat ${lat.toFixed(4)} | Lon ${lng.toFixed(4)}
            </div>
            <div style="margin-top:6px;color:#94a3b8;line-height:1.4;">Click analyze to open the risk dashboard for this coordinate.</div>
          </div>
          <button
            type="button"
            data-analyze-location="true"
            style="background:linear-gradient(135deg,#2563eb,#0ea5e9);color:white;border:none;border-radius:12px;padding:9px 12px;font-weight:700;cursor:pointer;box-shadow:0 10px 24px rgba(37,99,235,0.25);"
          >
            Analyze This Location
          </button>
        </div>
      `;

      if (popup) map.removeLayer(popup);
      popup = L.popup({ closeButton: true })
        .setLatLng([lat, lng])
        .setContent(container)
        .openOn(map);

      const button = container.querySelector('[data-analyze-location="true"]');
      button?.addEventListener('click', () => {
        onAnalyzeLocation?.(lat, lng);
      });
    };

    const handlePopupClose = () => {
      // Popup close event already removes the popup from the map.
      // Avoid calling `map.removeLayer` here to prevent triggering
      // the `popupclose` event again and causing recursion.
      popup = null;
    };

    map.on('click', handleClick);
    map.on('popupclose', handlePopupClose);
    
    return () => {
      map.off('click', handleClick);
      map.off('popupclose', handlePopupClose);
    };
  }, [map, onAnalyzeLocation]);

  return null;
}

function AQIMarkers() {
  const map = useMap();
  const [aqiStations, setAqiStations] = useState([]);
  const [showAQI, setShowAQI] = useState(false);

  useEffect(() => {
    loadAQIStations();
  }, []);

  const loadAQIStations = async () => {
    try {
      const data = await apiFetch('/api/map/aqi-stations');
      setAqiStations(data || []);
    } catch (err) {
      console.error('AQI stations error:', err);
    }
  };

  return (
    <>
      {showAQI && aqiStations.map(station => {
        const getAQIColor = (aqi) => {
          if (aqi <= 50) return '#22C55E';    // Green
          if (aqi <= 100) return '#EAB308';   // Yellow
          if (aqi <= 150) return '#F97316';   // Orange
          if (aqi <= 200) return '#EF4444';   // Red
          return '#9333EA';                   // Purple
        };

        const color = getAQIColor(station.aqi);
        const size = Math.max(5, Math.min(station.aqi / 20, 15));

        return (
          <CircleMarker
            key={`aqi_${station.lat}_${station.lon}`}
            center={[station.lat, station.lon]}
            radius={size}
            pathOptions={{
              fillColor: color,
              fillOpacity: 0.7,
              color: color,
              weight: 2
            }}
          >
            <Popup>
              <div className="text-xs">
                <strong>{station.stationName}</strong><br />
                AQI: <span style={{ color }}>{station.aqi}</span><br />
                {station.country}
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
}

export default function GlobalMap({ searchLocation, enableClickAnalysis = false, onAnalyzeLocation }) {
  const [earthquakes, setEarthquakes] = useState([]);
  const [eonetEvents, setEonetEvents] = useState([]);
  const [layers, setLayers] = useState({ earthquakes: true, fires: true, storms: true, floods: true, aqi: false });

  useEffect(() => {
    apiFetch('/api/global/events').then(data => {
      setEarthquakes(data.earthquakes || []);
      setEonetEvents(data.eonetEvents || []);
    }).catch(() => {});
  }, []);

  const fireEvents = useMemo(() => eonetEvents.filter(e => e.type === 'fire' || e.category?.toLowerCase().includes('fire')), [eonetEvents]);
  const stormEvents = useMemo(() => eonetEvents.filter(e => e.type === 'storm' || e.category?.toLowerCase().includes('storm')), [eonetEvents]);
  const floodEvents = useMemo(() => eonetEvents.filter(e => e.type === 'flood' || e.category?.toLowerCase().includes('flood')), [eonetEvents]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <MapContainer center={[20, 0]} zoom={2} className="h-full w-full" zoomControl={false} minZoom={2} maxZoom={15}>
        <FlyTo lat={searchLocation?.lat} lon={searchLocation?.lon} />
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />

        <WeatherLayerControl />
        {enableClickAnalysis && <MapClickHandler onAnalyzeLocation={onAnalyzeLocation} />}

        {/* Live data badge */}
        <div style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          zIndex: 400,
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          borderRadius: '10px',
          padding: '12px 16px',
          fontSize: '11px',
          fontWeight: '600',
          color: '#e0f2fe',
          border: '1.5px solid rgba(14, 165, 233, 0.5)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 8px 32px rgba(14, 165, 233, 0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#10b981',
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          }} />
          ✓ Live hazard data loaded
        </div>

        {layers.earthquakes && earthquakes.map((q, idx) => (
          <CircleMarker
            key={q.id || `eq-${idx}`}
            center={[q.lat, q.lon]}
            radius={Math.max(5, Math.min(q.magnitude * 2.8, 12))}
            pathOptions={{
              fillColor: '#fb923c',
              fillOpacity: 0.95,
              color: '#f97316',
              weight: 2,
            }}
          >
            <Tooltip direction="top" offset={[0, -6]} opacity={1} sticky>
              <div className="text-xs font-medium text-slate-100">M{q.magnitude?.toFixed?.(1)} {q.place}</div>
            </Tooltip>
            <Popup>
              <div className="text-xs" style={{ color: '#e0e7ff', minWidth: '180px' }}>
                <strong style={{ color: '#fbbf24', fontSize: '13px' }}>M{q.magnitude?.toFixed(1)} Earthquake</strong><br />
                <span style={{ color: '#cbd5e1' }}>{q.place}</span><br />
                <span style={{ color: '#94a3b8' }}>Depth: {q.depth}km</span>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {layers.fires && fireEvents.map((e, idx) => (
          <CircleMarker
            key={e.id || `fire-${idx}`}
            center={[e.lat, e.lon]}
            radius={7}
            pathOptions={{
              fillColor: '#f87171',
              fillOpacity: 0.9,
              color: '#dc2626',
              weight: 2.5
            }}
          >
            <Tooltip direction="top" offset={[0, -6]} opacity={1} sticky>
              <div className="text-xs font-medium text-slate-100">🔥 {e.title}</div>
            </Tooltip>
            <Popup><div className="text-xs" style={{ color: '#e0e7ff', minWidth: '180px' }}>
              <strong style={{ color: '#fca5a5' }}>🔥 {e.title}</strong><br />
              <span style={{ color: '#cbd5e1' }}>Wildfire</span>
            </div></Popup>
          </CircleMarker>
        ))}

        {layers.storms && stormEvents.map((e, idx) => (
          <CircleMarker
            key={e.id || `storm-${idx}`}
            center={[e.lat, e.lon]}
            radius={6}
            pathOptions={{ fillColor: '#60a5fa', fillOpacity: 0.9, color: '#3b82f6', weight: 1.5 }}
          >
            <Tooltip direction="top" offset={[0, -6]} opacity={1} sticky>
              <div className="text-xs font-medium text-slate-100">🌪 {e.title}</div>
            </Tooltip>
            <Popup><div className="text-xs" style={{ minWidth: '160px' }}><strong>{e.title}</strong><br />Storm</div></Popup>
          </CircleMarker>
        ))}

        {layers.floods && floodEvents.map((e, idx) => (
          <CircleMarker
            key={e.id || `flood-${idx}`}
            center={[e.lat, e.lon]}
            radius={6}
            pathOptions={{ fillColor: '#67e8f9', fillOpacity: 0.9, color: '#06b6d4', weight: 1.5 }}
          >
            <Tooltip direction="top" offset={[0, -6]} opacity={1} sticky>
              <div className="text-xs font-medium text-slate-100">💧 {e.title}</div>
            </Tooltip>
            <Popup><div className="text-xs" style={{ minWidth: '160px' }}><strong>{e.title}</strong><br />Flood</div></Popup>
          </CircleMarker>
        ))}

        {layers.aqi && <AQIMarkers />}

        {searchLocation && (
          <Marker
            position={[searchLocation.lat, searchLocation.lon]}
            icon={L.divIcon({
              className: 'custom-marker',
              html: '<div style="width:16px;height:16px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 0 12px #3b82f680;"></div>',
              iconSize: [16, 16],
              iconAnchor: [8, 8],
            })}
          />
        )}
      </MapContainer>

      <div className="absolute bottom-6 right-6 z-[1000] bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-xl p-3 space-y-2 max-w-xs">
        <p className="text-xs font-medium text-slate-300 mb-2">Hazard Layers</p>
        {[
          { key: 'earthquakes', label: 'Earthquakes', color: '#f97316', count: earthquakes.length },
          { key: 'fires', label: 'Wildfires', color: '#ef4444', count: fireEvents.length },
          { key: 'storms', label: 'Storms', color: '#3b82f6', count: stormEvents.length },
          { key: 'floods', label: 'Floods', color: '#06b6d4', count: floodEvents.length },
          { key: 'aqi', label: 'AQI Stations', color: '#9333EA', count: 100 },
        ].map(layer => (
          <button
            key={layer.key}
            onClick={() => setLayers(l => ({ ...l, [layer.key]: !l[layer.key] }))}
            className={`flex items-center gap-2 w-full px-2 py-1 rounded text-xs transition-colors ${
              layers[layer.key] ? 'text-slate-200 bg-slate-700/40' : 'text-slate-600 hover:text-slate-400'
            }`}
          >
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: layers[layer.key] ? layer.color : '#475569' }} />
            {layer.label}
            <span className="ml-auto font-mono text-slate-500">{layer.count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
