import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plane,
  Calendar,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  MapPin,
  Luggage,
  Building2,
  Wind,
  Shield,
} from 'lucide-react';
import { apiFetch } from '../utils/helpers';
import {
  fetchOpenMeteoForecast,
  getCountrySafety,
  getHistoricalStats,
  getUvCategory,
  formatForecastDay,
  formatForecastTime,
} from '../utils/intelligence';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from 'recharts';

function MiniSkeleton() {
  return <div className="h-24 rounded-xl bg-slate-700/30 animate-pulse" />;
}

function Badge({ tone = 'slate', children }) {
  const tones = {
    emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
    amber: 'bg-amber-500/15 text-amber-300 border-amber-500/20',
    orange: 'bg-orange-500/15 text-orange-300 border-orange-500/20',
    red: 'bg-red-500/15 text-red-300 border-red-500/20',
    blue: 'bg-blue-500/15 text-blue-300 border-blue-500/20',
    slate: 'bg-slate-500/15 text-slate-300 border-slate-500/20',
  };

  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${tones[tone] || tones.slate}`}>{children}</span>;
}

function sectionTone(score = 0) {
  if (score > 60) return 'red';
  if (score > 40) return 'orange';
  if (score > 20) return 'amber';
  return 'emerald';
}

function formatCountry(name = '') {
  return name.split(',').slice(-1)[0]?.trim() || '';
}

function buildPackingExtras(result, forecast, hasEarthquakeRisk) {
  const items = [];
  const rainChance = forecast?.rain?.maxProbability || 0;
  const aqiScore = result?.scores?.airQuality || 0;
  const heatScore = result?.scores?.heat || 0;

  if (rainChance > 60) {
    items.push('🌂 Compact umbrella', '🥾 Waterproof boots', '💧 Waterproof phone case', '🧳 Waterproof bag cover');
  }
  if (aqiScore > 40) {
    items.push('😷 Pack 10× N95 masks', '💊 Antihistamines if you have allergies', '👁️ Lubricating eye drops');
  }
  if (heatScore > 35 || (forecast?.heat?.peakTemp ?? 0) > 38) {
    items.push('🧴 SPF 50+ sunscreen', '👒 Wide brim hat', '💧 2L water bottle minimum', '🥤 Oral rehydration salts', '🌡️ Personal thermometer');
  }
  if (hasEarthquakeRisk) {
    items.push('🔦 Flashlight with extra batteries', '📻 Hand-crank emergency radio', '🏥 Basic first aid kit', '💊 7-day supply of medications', '📄 Physical copies of important documents');
  }

  return items;
}

function buildDayCards(forecast) {
  const byDay = new Map();
  (forecast?.next72 || []).forEach(item => {
    const day = new Date(item.time).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    const entry = byDay.get(day) || { temps: [], rain: [], uv: [], wind: [], visibility: [] };
    if (typeof item.apparentTemperature === 'number') entry.temps.push(item.apparentTemperature);
    entry.rain.push(item.precipitationProbability || 0);
    if (typeof item.uvIndex === 'number') entry.uv.push(item.uvIndex);
    entry.wind.push(item.windSpeed || 0);
    if (typeof item.visibility === 'number') entry.visibility.push(item.visibility);
    byDay.set(day, entry);
  });

  return Array.from(byDay.entries()).slice(0, 3).map(([day, entry]) => {
    const maxTemp = entry.temps.length ? Math.max(...entry.temps) : null;
    const minTemp = entry.temps.length ? Math.min(...entry.temps) : null;
    const rain = entry.rain.length ? Math.max(...entry.rain) : 0;
    const uv = entry.uv.length ? Math.max(...entry.uv) : 0;
    const wind = entry.wind.length ? Math.max(...entry.wind) : 0;
    const visibility = entry.visibility.length ? Math.min(...entry.visibility) : null;
    let dominantRisk = 'Normal';
    if (rain > 70) dominantRisk = 'Rain';
    if (wind > 60) dominantRisk = 'Storm';
    if ((maxTemp ?? 0) > 40) dominantRisk = 'Heat';

    return { day, maxTemp, minTemp, rain, uv, wind, visibility, dominantRisk };
  });
}

export default function TravelSafetyChecker() {
  const [form, setForm] = useState({ from: '', to: '', startDate: '', endDate: '' });
  const [result, setResult] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [resources, setResources] = useState([]);
  const [route, setRoute] = useState([]);
  const [historical, setHistorical] = useState(null);
  const [safety, setSafety] = useState(null);
  const [dayCards, setDayCards] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.to.trim()) return;

    setLoading(true);
    setResult(null);
    setForecast(null);
    setResources([]);
    setRoute([]);
    setHistorical(null);
    setSafety(null);
    setDayCards([]);

    try {
      const [travelResult] = await Promise.allSettled([
        apiFetch('/api/travel', {
          method: 'POST',
          body: JSON.stringify(form),
        }),
      ]);

      if (travelResult.status !== 'fulfilled' || !travelResult.value) {
        console.error('Travel checker error: destination analysis failed');
        return;
      }

      const travelData = travelResult.value;
      setResult(travelData);

      const destination = travelData.destination;
      const countryName = formatCountry(destination?.name || form.to);
      const destinationCity = destination?.name?.split(',')[0] || form.to;

      const [forecastResult, resourcesResult, destRiskResult, fromRiskResult] = await Promise.allSettled([
        fetchOpenMeteoForecast(destination.lat, destination.lon),
        apiFetch(`/api/resources?lat=${destination.lat}&lon=${destination.lon}`),
        apiFetch('/api/risk', {
          method: 'POST',
          body: JSON.stringify({ location: form.to.trim() }),
        }),
        form.from.trim()
          ? apiFetch('/api/risk', {
              method: 'POST',
              body: JSON.stringify({ location: form.from.trim() }),
            })
          : Promise.resolve(null),
      ]);

      const forecastData = forecastResult.status === 'fulfilled' ? forecastResult.value : null;
      const resourceData = resourcesResult.status === 'fulfilled' && Array.isArray(resourcesResult.value) ? resourcesResult.value : [];
      const destinationRisk = destRiskResult.status === 'fulfilled' ? destRiskResult.value : null;
      const fromRisk = fromRiskResult.status === 'fulfilled' ? fromRiskResult.value : null;

      setForecast(forecastData);
      setResources(resourceData);
      setHistorical(getHistoricalStats(destinationCity));
      setSafety(getCountrySafety(countryName));
      setDayCards(buildDayCards(forecastData));

      if (fromRisk?.location?.lat != null && fromRisk?.location?.lon != null) {
        const midpoint = {
          lat: (fromRisk.location.lat + destination.lat) / 2,
          lon: (fromRisk.location.lon + destination.lon) / 2,
        };
        const [midpointRiskResult] = await Promise.allSettled([
          apiFetch('/api/risk', {
            method: 'POST',
            body: JSON.stringify({ lat: midpoint.lat, lon: midpoint.lon }),
          }),
        ]);

        const midpointRisk = midpointRiskResult.status === 'fulfilled' ? midpointRiskResult.value : null;
        setRoute([
          { label: 'Start', name: form.from.trim(), risk: fromRisk },
          { label: 'Midpoint', name: 'Between points', risk: midpointRisk },
          { label: 'Destination', name: destinationCity, risk: destinationRisk || travelData },
        ]);
      }
    } catch (err) {
      console.error('Travel error:', err);
    } finally {
      setLoading(false);
    }
  };

  const verdictConfig = {
    SAFE: { icon: ShieldCheck, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' },
    CAUTION: { icon: ShieldAlert, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
    AVOID: { icon: ShieldX, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
  };

  const verdict = result?.verdict || 'CAUTION';
  const vc = verdictConfig[verdict] || verdictConfig.CAUTION;
  const VIcon = vc.icon;
  const enhancedPacking = result ? Array.from(new Set([...(result.packingList || []), ...buildPackingExtras(result, forecast, (result.scores?.earthquake || 0) > 50)])) : [];
  const insuranceNeeded = (result?.overall || 0) > 50;
  const hospitals = resources.filter(r => r.type === 'hospital').slice(0, 5);
  const bestDay = dayCards.slice().sort((a, b) => (a.rain + (a.maxTemp || 0) + a.wind) - (b.rain + (b.maxTemp || 0) + b.wind))[0];
  const worstDay = dayCards.slice().sort((a, b) => (b.rain + (b.maxTemp || 0) + b.wind) - (a.rain + (a.maxTemp || 0) + a.wind))[0];

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-md p-6">
        <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
          <Plane className="w-5 h-5 text-blue-400" />
          Travel Safety Checker
        </h3>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs text-slate-500 mb-2 block font-medium">From</label>
            <input
              type="text"
              value={form.from}
              onChange={e => setForm(f => ({ ...f, from: e.target.value }))}
              placeholder="Your city"
              className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-blue-500/50 focus:bg-slate-900 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-2 block font-medium">To</label>
            <input
              type="text"
              value={form.to}
              onChange={e => setForm(f => ({ ...f, to: e.target.value }))}
              placeholder="Destination city"
              className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-blue-500/50 focus:bg-slate-900 transition-colors"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs text-slate-500 mb-2 block font-medium">Start Date</label>
            <input
              type="date"
              value={form.startDate}
              onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
              className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none focus:border-blue-500/50 focus:bg-slate-900 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-2 block font-medium">End Date</label>
            <input
              type="date"
              value={form.endDate}
              onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
              className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none focus:border-blue-500/50 focus:bg-slate-900 transition-colors"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-lg font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Analyzing...' : 'Check Safety'}
        </button>
      </form>

      {loading && <MiniSkeleton />}

      {result && !loading && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className={`rounded-2xl border-2 ${vc.border} ${vc.bg} p-6 text-center relative overflow-hidden`}>
            <VIcon className={`w-12 h-12 mx-auto mb-3 ${vc.color}`} />
            <h3 className={`text-2xl font-bold ${vc.color}`}>{result.verdict}</h3>
            <p className="text-sm text-slate-400 mt-1">
              {result.destination?.name?.split(',')[0]} — Risk Score:{' '}
              <span className="font-mono font-bold" style={{ color: '#e2e8f0' }}>
                {Math.round(result.overall)}/100
              </span>
            </p>
            {insuranceNeeded && (
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-200">
                <Shield className="w-4 h-4" />
                High risk destination - Travel insurance strongly recommended
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-md p-4">
              <h4 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-400" /> Route risk analysis
              </h4>
              {route.length > 0 ? (
                <div className="space-y-3">
                  {route.map((stop) => {
                    const score = stop.risk?.overall ?? 0;
                    return (
                      <div key={stop.label} className="rounded-xl border border-slate-700/40 bg-slate-900/40 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{stop.label}</p>
                            <p className="text-sm font-medium text-slate-200">{stop.name || 'Data unavailable'}</p>
                          </div>
                          <Badge tone={sectionTone(score)}>{score ? `${Math.round(score)}/100` : 'Data unavailable'}</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-500">Enter a departure city to compare the journey route.</p>
              )}
            </div>

            <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-md p-4">
              <h4 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" /> Best / worst travel timing
              </h4>
              <p className="text-sm text-slate-400">Safest departure time: <span className="font-mono text-slate-200">{forecast?.next24?.length ? formatForecastTime(forecast.next24.slice().sort((a, b) => (a.precipitationProbability + a.windSpeed) - (b.precipitationProbability + b.windSpeed))[0]?.time) : 'Data unavailable'}</span></p>
              <p className="text-sm text-slate-400 mt-2">Avoid traveling during: <span className="font-mono text-slate-200">{forecast?.storm?.peakAt?.time ? `${formatForecastTime(forecast.storm.peakAt.time)}` : 'storm or flood peaks'}</span></p>
              <p className="text-xs text-slate-500 mt-3">If a storm or flood peak appears in the forecast, shift travel outside the peak window.</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-md p-4 space-y-4">
            <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Wind className="w-4 h-4 text-cyan-400" /> Destination detailed forecast
            </h4>

            {forecast ? (
              <>
                <div className="grid md:grid-cols-4 gap-3">
                  <div className="rounded-xl border border-slate-700/40 bg-slate-900/40 p-3">
                    <p className="text-xs text-slate-500 uppercase tracking-[0.2em] mb-2">Rain prediction</p>
                    <p className="text-sm font-semibold text-slate-200">{forecast.rain.badge}</p>
                    <p className="text-xs text-slate-500 mt-1">Total rainfall: {forecast.rain.totalRain} mm</p>
                  </div>
                  <div className="rounded-xl border border-slate-700/40 bg-slate-900/40 p-3">
                    <p className="text-xs text-slate-500 uppercase tracking-[0.2em] mb-2">Heatwave prediction</p>
                    <p className="text-sm font-semibold text-slate-200">{forecast.heat.badge}</p>
                    <p className="text-xs text-slate-500 mt-1">Peak feels-like: {forecast.heat.peakTemp == null ? '—' : `${Math.round(forecast.heat.peakTemp)}°C`}</p>
                  </div>
                  <div className="rounded-xl border border-slate-700/40 bg-slate-900/40 p-3">
                    <p className="text-xs text-slate-500 uppercase tracking-[0.2em] mb-2">Storm prediction</p>
                    <p className="text-sm font-semibold text-slate-200">{forecast.storm.badge}</p>
                    <p className="text-xs text-slate-500 mt-1">Peak wind: {Math.round(forecast.storm.peakWind)} km/h</p>
                  </div>
                  <div className="rounded-xl border border-slate-700/40 bg-slate-900/40 p-3">
                    <p className="text-xs text-slate-500 uppercase tracking-[0.2em] mb-2">Visibility</p>
                    <p className="text-sm font-semibold text-slate-200">{forecast.visibility.value == null ? 'Data unavailable' : `${Math.round(forecast.visibility.value)} km`}</p>
                    <p className="text-xs text-slate-500 mt-1">{forecast.visibility.label}</p>
                  </div>
                </div>

                <div className="grid xl:grid-cols-2 gap-4">
                  <div className="h-56 rounded-xl border border-slate-700/40 bg-slate-900/40 p-3">
                    <h5 className="text-sm font-semibold text-slate-200 mb-2">Rain timeline</h5>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={(forecast.next24 || []).map((item, index) => ({
                        hour: index + 1,
                        chance: item.precipitationProbability,
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                        <XAxis dataKey="hour" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                        <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} domain={[0, 100]} />
                        <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 10, fontSize: 12 }} />
                        <Bar dataKey="chance" fill="#60A5FA" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="h-56 rounded-xl border border-slate-700/40 bg-slate-900/40 p-3">
                    <h5 className="text-sm font-semibold text-slate-200 mb-2">Feels-like temperature</h5>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={(forecast.next72 || []).map((item, index) => ({
                        time: index % 12 === 0 ? formatForecastDay(item.time) : '',
                        temp: item.apparentTemperature,
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                        <XAxis dataKey="time" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                        <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                        <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 10, fontSize: 12 }} />
                        <Line type="monotone" dataKey="temp" stroke="#fb923c" strokeWidth={2.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-500">Data unavailable</p>
            )}
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-md p-4">
              <h4 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-red-400" /> Health & safety profile
              </h4>
              <div className="space-y-3 text-sm text-slate-400">
                <p><span className="text-slate-200 font-medium">Emergency number:</span> {safety?.emergency || '112'}</p>
                <p><span className="text-slate-200 font-medium">Tap water safe?</span> {safety?.tapWaterSafe || 'Check locally'}</p>
                <p><span className="text-slate-200 font-medium">Required vaccinations:</span> {safety?.vaccinations || 'Routine vaccines'}</p>
                <p><span className="text-slate-200 font-medium">Emergency apps:</span> {safety?.apps || 'Local emergency services'}</p>
              </div>

              <div className="mt-4 space-y-2">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Nearest hospitals</p>
                {hospitals.length > 0 ? hospitals.map(h => (
                  <div key={h.id} className="rounded-lg border border-slate-700/40 bg-slate-900/40 p-3 text-sm text-slate-300">
                    <p className="font-medium text-slate-100">{h.name}</p>
                    <p className="text-xs text-slate-500">{h.distance} km away</p>
                  </div>
                )) : (
                  <p className="text-sm text-slate-500">Data unavailable</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-md p-4">
              <h4 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-400" /> Historical disaster data
              </h4>
              {historical ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-700/40 bg-slate-900/40 p-3">
                    <p className="text-xs text-slate-500">Earthquakes / decade</p>
                    <p className="text-lg font-bold text-slate-100">{historical.earthquakesPerDecade}</p>
                  </div>
                  <div className="rounded-xl border border-slate-700/40 bg-slate-900/40 p-3">
                    <p className="text-xs text-slate-500">Floods / decade</p>
                    <p className="text-lg font-bold text-slate-100">{historical.floodsPerDecade}</p>
                  </div>
                  <div className="rounded-xl border border-slate-700/40 bg-slate-900/40 p-3">
                    <p className="text-xs text-slate-500">Heatwave days / year</p>
                    <p className="text-lg font-bold text-slate-100">{historical.heatwaveDaysPerYear}</p>
                  </div>
                  <div className="rounded-xl border border-slate-700/40 bg-slate-900/40 p-3">
                    <p className="text-xs text-slate-500">Average AQI</p>
                    <p className="text-lg font-bold text-slate-100">{historical.averageAQI}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500">Data unavailable</p>
              )}

              {dayCards.length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Day by day</p>
                    {bestDay && <span className="text-xs text-emerald-300">Best day: {bestDay.day}</span>}
                  </div>
                  {dayCards.map(day => (
                    <div key={day.day} className="rounded-xl border border-slate-700/40 bg-slate-900/40 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-slate-100">{day.day}</p>
                          <p className="text-xs text-slate-500">Dominant risk: {day.dominantRisk}</p>
                        </div>
                        <Badge tone={day.dominantRisk === 'Heat' ? 'red' : day.dominantRisk === 'Storm' ? 'orange' : day.dominantRisk === 'Rain' ? 'blue' : 'emerald'}>
                          {day.dominantRisk}
                        </Badge>
                      </div>
                      <div className="mt-2 text-xs text-slate-400 grid grid-cols-2 gap-2">
                        <span>Temp: {day.minTemp == null ? '—' : `${Math.round(day.minTemp)}°C`} to {day.maxTemp == null ? '—' : `${Math.round(day.maxTemp)}°C`}</span>
                        <span>AQI: {result?.scores?.airQuality ?? '—'}</span>
                        <span>Rain: {Math.round(day.rain)}%</span>
                        <span>UV: {day.uv ? `${day.uv.toFixed(1)} (${getUvCategory(day.uv)})` : '—'}</span>
                      </div>
                    </div>
                  ))}
                  {worstDay && <p className="text-xs text-rose-300">Worst day - stay indoors: {worstDay.day}</p>}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-md p-4">
            <h4 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
              <Luggage className="w-4 h-4 text-slate-400" /> Packing recommendations
            </h4>
            <div className="flex flex-wrap gap-2">
              {enhancedPacking.length > 0 ? enhancedPacking.map((item, i) => (
                <span key={`${item}-${i}`} className="px-3 py-1.5 bg-slate-700/40 border border-slate-600/30 rounded-full text-xs text-slate-300">
                  {item}
                </span>
              )) : <p className="text-sm text-slate-500">Data unavailable</p>}
            </div>
          </div>

          {result?.overall > 50 && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
              ⚠️ High risk destination - Travel insurance strongly recommended. Consider World Nomads and SafetyWing.
            </div>
          )}

          {result.bestMonths && (
            <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-md p-4">
              <h4 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-400" /> Best Time to Visit
              </h4>
              <p className="text-sm text-slate-400">{result.bestMonths}</p>
            </div>
          )}

          {result.warnings?.length > 0 && (
            <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-md p-4">
              <h4 className="text-sm font-medium text-slate-300 mb-2">Warnings</h4>
              <ul className="space-y-1">
                {result.warnings.map((w, i) => (
                  <li key={i} className="text-xs text-amber-300 flex items-start gap-2">
                    <span className="font-mono text-amber-500 mt-0.5">!</span>
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
