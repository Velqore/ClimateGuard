import { useState, useEffect } from 'react';
import { Flame, Activity, AlertTriangle, Globe } from 'lucide-react';
import { apiFetch } from '../utils/helpers';

export default function StatsBar() {
  const [stats, setStats] = useState({ wildfires: 0, earthquakes24hr: 0, extremeAlerts: 0, citiesMonitored: 50 });

  useEffect(() => {
    apiFetch('/api/global/stats').then(setStats).catch(() => {});
    const iv = setInterval(() => {
      apiFetch('/api/global/stats').then(setStats).catch(() => {});
    }, 60000);
    return () => clearInterval(iv);
  }, []);

  const items = [
    { icon: Flame, label: 'Active Wildfires', value: stats.wildfires, color: 'text-orange-400' },
    { icon: Activity, label: 'Earthquakes 24hr', value: stats.earthquakes24hr, color: 'text-amber-400' },
    { icon: AlertTriangle, label: 'Extreme Alerts', value: stats.extremeAlerts, color: 'text-red-400' },
    { icon: Globe, label: 'Cities Monitored', value: stats.citiesMonitored, color: 'text-blue-400' },
  ];

  return (
    <div className="flex flex-wrap justify-center gap-6 md:gap-10">
      {items.map(({ icon: Icon, label, value, color }) => (
        <div key={label} className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${color}`} />
          <span className="font-mono text-lg font-bold text-slate-100">{value || '—'}</span>
          <span className="text-xs text-slate-500">{label}</span>
        </div>
      ))}
    </div>
  );
}
