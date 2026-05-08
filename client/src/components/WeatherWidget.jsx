import { Cloud, Droplets, Wind, Thermometer, Eye, Gauge } from 'lucide-react';

export default function WeatherWidget({ weather }) {
  if (!weather?.current) {
    return (
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-md p-4">
        <p className="text-sm text-slate-500">Weather data temporarily unavailable</p>
      </div>
    );
  }

  const c = weather.current;

  const items = [
    { icon: Thermometer, label: 'Temperature', value: `${c.temp?.toFixed(1) || '—'}°C`, color: 'text-amber-400' },
    { icon: Droplets, label: 'Humidity', value: `${c.humidity || '—'}%`, color: 'text-cyan-400' },
    { icon: Wind, label: 'Wind', value: `${c.windSpeed?.toFixed(1) || '—'} km/h`, color: 'text-blue-400' },
    { icon: Gauge, label: 'Pressure', value: `${c.pressure?.toFixed(0) || '—'} hPa`, color: 'text-slate-400' },
    { icon: Cloud, label: 'Clouds', value: `${c.clouds || '—'}%`, color: 'text-slate-500' },
    { icon: Eye, label: 'Conditions', value: c.description || '—', color: 'text-slate-300' },
  ];

  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-md p-4">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
      <h3 className="text-sm font-medium text-slate-300 mb-3">Current Weather</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {items.map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="flex items-center gap-2">
            <Icon className={`w-4 h-4 ${color} shrink-0`} />
            <div>
              <p className="text-xs text-slate-500">{label}</p>
              <p className="text-sm font-mono text-slate-200">{value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
