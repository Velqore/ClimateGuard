import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

export default function WeatherLayerControl() {
  const map = useMap();
  const [activeLayers, setActiveLayers] = useState([]);
  const [legendData, setLegendData] = useState(null);
  const weatherLayersRef = useRef({});
  const OPENWEATHER_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY || import.meta.env.OPENWEATHER_API_KEY || '';

  const layersConfig = {
    precipitation: {
      name: 'Rain',
      emoji: '🌧️',
      url: OPENWEATHER_KEY
        ? `https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${OPENWEATHER_KEY}`
        : null,
      legend: { min: '0mm', max: '50mm+', gradient: 'from-blue-200 to-blue-900' }
    },
    temperature: {
      name: 'Temp',
      emoji: '🌡️',
      url: OPENWEATHER_KEY
        ? `https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${OPENWEATHER_KEY}`
        : null,
      legend: { min: '-40°C', max: '40°C+', gradient: 'from-blue-400 via-green-400 via-yellow-400 to-red-600' }
    },
    wind: {
      name: 'Wind',
      emoji: '💨',
      url: OPENWEATHER_KEY
        ? `https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=${OPENWEATHER_KEY}`
        : null,
      legend: { min: 'Calm', max: 'Storm', gradient: 'from-white to-yellow-400 to-red-600' }
    },
    clouds: {
      name: 'Clouds',
      emoji: '☁️',
      url: OPENWEATHER_KEY
        ? `https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${OPENWEATHER_KEY}`
        : null,
      legend: { min: '0%', max: '100%', gradient: 'from-transparent to-white' }
    },
    aqi: {
      name: 'AQI',
      emoji: '😷',
      url: OPENWEATHER_KEY
        ? `https://tile.openweathermap.org/map/CO/{z}/{x}/{y}.png?appid=${OPENWEATHER_KEY}`
        : null,
      legend: { min: 'Good', max: 'Hazardous', gradient: 'from-green-500 via-yellow-500 via-orange-500 to-red-600' }
    },
    pressure: {
      name: 'Pressure',
      emoji: '📊',
      url: OPENWEATHER_KEY
        ? `https://tile.openweathermap.org/map/pressure_new/{z}/{x}/{y}.png?appid=${OPENWEATHER_KEY}`
        : null,
      legend: { min: 'Low', max: 'High', gradient: 'from-blue-500 to-red-600' }
    }
  };

  const weatherLayers = weatherLayersRef.current;

  // Initialize tile layers
  useEffect(() => {
    // ensure we have a dedicated pane above the base tiles for weather overlays
    try {
      if (map && !map.getPane('weatherPane')) {
        map.createPane('weatherPane');
        const p = map.getPane('weatherPane');
        if (p) p.style.zIndex = 650; // above default tile pane
      }
    } catch (e) {
      // ignore if map not ready
    }
    const makePlaceholderLayer = (color = '#0ea5e9') => {
      return L.gridLayer({
        tileSize: 256,
        opacity: 0.9,
        pane: 'weatherPane',
        attribution: '(placeholder)',
        createTile: function () {
          const canvas = document.createElement('canvas');
          canvas.width = canvas.height = 256;
          const ctx = canvas.getContext('2d');
          // solid subtle background
          ctx.fillStyle = color;
          ctx.globalAlpha = 0.10;
          ctx.fillRect(0, 0, 256, 256);
          // draw bolder diagonal hatch for visibility
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.globalAlpha = 0.22;
          for (let i = -256; i < 512; i += 24) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i + 256, 256);
            ctx.stroke();
          }
          return canvas;
        }
      });
    };

    const placeholderColors = {
      precipitation: '#0ea5e9',
      temperature: '#fb7185',
      wind: '#60a5fa',
      clouds: '#94a3b8',
      aqi: '#34d399',
      pressure: '#a78bfa'
    };

    Object.keys(layersConfig).forEach(key => {
      if (!weatherLayers[key]) {
        const cfg = layersConfig[key];
        if (cfg.url) {
          weatherLayers[key] = L.tileLayer(cfg.url, {
            pane: map && map.getPane('weatherPane') ? 'weatherPane' : undefined,
            opacity: 0.75,
            attribution: '© OpenWeatherMap'
          });
        } else {
          weatherLayers[key] = makePlaceholderLayer(placeholderColors[key] || '#0ea5e9');
        }
      }
    });
  }, [OPENWEATHER_KEY]);

  const toggleLayer = (layerName) => {
    try {
      if (activeLayers.includes(layerName)) {
        map.removeLayer(weatherLayers[layerName]);
        setActiveLayers(prev => prev.filter(l => l !== layerName));
        if (activeLayers.length === 1) setLegendData(null);
      } else {
        weatherLayers[layerName].addTo(map);
        setActiveLayers(prev => [...prev, layerName]);
        setLegendData(layersConfig[layerName].legend);
      }
    } catch (err) {
      console.error('Layer toggle error:', err);
    }
  };

  return (
    <>
      {/* Layer Toggle Buttons */}
      <div className="absolute top-6 right-6 z-[500] flex flex-col gap-2 bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-xl p-2">
        <p className="text-xs font-semibold text-slate-400 px-2 pt-2">Weather Layers</p>
        {Object.entries(layersConfig).map(([key, config]) => (
          <motion.button
            key={key}
            onClick={() => toggleLayer(key)}
            initial={{ scale: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeLayers.includes(key)
                ? 'bg-blue-500/30 border border-blue-500/50 text-blue-300 shadow-lg shadow-blue-500/20'
                : 'bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:bg-slate-700/50'
            }`}
          >
            <span>{config.emoji}</span>
            {config.name}
          </motion.button>
        ))}
      </div>

      {/* Legend */}
      <AnimatePresence>
        {legendData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-4 left-4 z-[500] bg-slate-900/90 backdrop-blur-md border border-slate-700/50 rounded-lg p-3 max-w-xs"
          >
            <p className="text-xs font-semibold text-slate-300 mb-2">Legend</p>
            <div className={`h-2 rounded-full bg-gradient-to-r ${legendData.gradient} mb-2`} />
            <div className="flex justify-between text-xs text-slate-400">
              <span>{legendData.min}</span>
              <span>{legendData.max}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
