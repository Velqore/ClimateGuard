import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GitCompare, Loader2, Copy, Sunrise, Sunset } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { apiFetch } from '../utils/helpers';
import ScrollToTopButton from '../components/ScrollToTopButton';
import { fetchOpenMeteoForecast, getHistoricalStats, getUvCategory, formatForecastDay, formatForecastTime } from '../utils/intelligence';

function badgeTone(score = 0) {
  if (score > 60) return 'red';
  if (score > 40) return 'orange';
  if (score > 20) return 'amber';
  return 'emerald';
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

function CityCard({ title, city, risk, weather, aqi, tone, historical }) {
  const c = weather?.current;
  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-md p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">{title}</p>
          <h3 className="text-xl font-bold text-slate-100">{city}</h3>
        </div>
        <Badge tone={tone}>{risk ? `${Math.round(risk.overall)}/100` : 'Data unavailable'}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl border border-slate-700/40 bg-slate-900/40 p-3">
          <p className="text-xs text-slate-500 mb-1">Current temperature</p>
          <p className="font-mono text-slate-200">{c?.temperature_2m != null ? `${Number(c.temperature_2m).toFixed(1)}°C` : 'Data unavailable'}</p>
          <p className="text-xs text-slate-500 mt-1">Feels like {c?.apparent_temperature != null ? `${Number(c.apparent_temperature).toFixed(1)}°C` : '—'}</p>
        </div>
        <div className="rounded-xl border border-slate-700/40 bg-slate-900/40 p-3">
          <p className="text-xs text-slate-500 mb-1">Humidity</p>
          <p className="font-mono text-slate-200">{c?.relative_humidity_2m != null ? `${Math.round(c.relative_humidity_2m)}%` : 'Data unavailable'}</p>
        </div>
        <div className="rounded-xl border border-slate-700/40 bg-slate-900/40 p-3">
          <p className="text-xs text-slate-500 mb-1">Wind speed</p>
          <p className="font-mono text-slate-200">{c?.windspeed_10m != null ? `${Math.round(c.windspeed_10m)} km/h` : 'Data unavailable'}</p>
          <p className="text-xs text-slate-500 mt-1">Direction {c?.winddirection_10m != null ? `${Math.round(c.winddirection_10m)}°` : '—'}</p>
        </div>
        <div className="rounded-xl border border-slate-700/40 bg-slate-900/40 p-3">
          <p className="text-xs text-slate-500 mb-1">Pressure</p>
          <p className="font-mono text-slate-200">{c?.surface_pressure != null ? `${Math.round(c.surface_pressure)} hPa` : 'Data unavailable'}</p>
        </div>
        <div className="rounded-xl border border-slate-700/40 bg-slate-900/40 p-3">
          <p className="text-xs text-slate-500 mb-1">Visibility</p>
          <p className="font-mono text-slate-200">{weather?.visibility?.value != null ? `${Math.round(weather.visibility.value)} km` : 'Data unavailable'}</p>
        </div>
        <div className="rounded-xl border border-slate-700/40 bg-slate-900/40 p-3">
          <p className="text-xs text-slate-500 mb-1">UV Index</p>
          <p className="font-mono text-slate-200">{weather?.heat?.peakUv != null ? `${weather.heat.peakUv.toFixed(1)} (${getUvCategory(weather.heat.peakUv)})` : 'Data unavailable'}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl border border-slate-700/40 bg-slate-900/40 p-3">
          <p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Sunrise className="w-3 h-3" /> Sunrise</p>
          <p className="font-mono text-slate-200">{weather?.daily?.sunrise ? formatForecastTime(weather.daily.sunrise) : 'Data unavailable'}</p>
        </div>
        <div className="rounded-xl border border-slate-700/40 bg-slate-900/40 p-3">
          <p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Sunset className="w-3 h-3" /> Sunset</p>
          <p className="font-mono text-slate-200">{weather?.daily?.sunset ? formatForecastTime(weather.daily.sunset) : 'Data unavailable'}</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700/40 bg-slate-900/40 p-3">
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">AQI</p>
          <Badge tone={aqi?.overallAQI > 100 ? 'orange' : 'emerald'}>{aqi?.category || 'Data unavailable'}</Badge>
        </div>
        <p className="text-sm text-slate-300">Overall AQI: <span className="font-mono text-slate-100">{aqi?.overallAQI ?? '—'}</span></p>
        <p className="text-xs text-slate-500 mt-1">Pollutant comparison included below.</p>
      </div>

      <div className="rounded-xl border border-slate-700/40 bg-slate-900/40 p-3">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-2">Historical safety</p>
        {historical ? (
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
            <div>Earthquakes/decade: {historical.earthquakesPerDecade}</div>
            <div>Floods/decade: {historical.floodsPerDecade}</div>
            <div>Heatwave days/year: {historical.heatwaveDaysPerYear}</div>
            <div>Avg AQI: {historical.averageAQI}</div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Data unavailable</p>
        )}
      </div>
    </div>
  );
}

export default function Compare() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [cityA, setCityA] = useState(searchParams.get('cityA') || '');
  const [cityB, setCityB] = useState(searchParams.get('cityB') || '');
  const [loading, setLoading] = useState(false);
  const [comparison, setComparison] = useState(null);
  const [copyState, setCopyState] = useState('Share this comparison');

  useEffect(() => {
    if (searchParams.get('cityA') && searchParams.get('cityB')) {
      handleCompare(undefined, searchParams.get('cityA'), searchParams.get('cityB'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCompare = async (e, overrideA, overrideB) => {
    e?.preventDefault();
    const a = (overrideA || cityA).trim();
    const b = (overrideB || cityB).trim();
    if (!a || !b) return;

    setLoading(true);
    try {
      const [riskAResult, riskBResult] = await Promise.allSettled([
        apiFetch('/api/risk', { method: 'POST', body: JSON.stringify({ location: a }) }),
        apiFetch('/api/risk', { method: 'POST', body: JSON.stringify({ location: b }) }),
      ]);

      const riskA = riskAResult.status === 'fulfilled' ? riskAResult.value : null;
      const riskB = riskBResult.status === 'fulfilled' ? riskBResult.value : null;

      if (!riskA || !riskB) {
        console.error('Compare page error: one or both risk lookups failed');
        setComparison(null);
        return;
      }

      const [weatherAResult, weatherBResult, aqiAResult, aqiBResult] = await Promise.allSettled([
        fetchOpenMeteoForecast(riskA.location.lat, riskA.location.lon),
        fetchOpenMeteoForecast(riskB.location.lat, riskB.location.lon),
        apiFetch(`/api/aqi?lat=${riskA.location.lat}&lon=${riskA.location.lon}`),
        apiFetch(`/api/aqi?lat=${riskB.location.lat}&lon=${riskB.location.lon}`),
      ]);

      const weatherA = weatherAResult.status === 'fulfilled' ? weatherAResult.value : null;
      const weatherB = weatherBResult.status === 'fulfilled' ? weatherBResult.value : null;
      const aqiA = aqiAResult.status === 'fulfilled' ? aqiAResult.value : null;
      const aqiB = aqiBResult.status === 'fulfilled' ? aqiBResult.value : null;

      const cityAName = riskA.location?.name?.split(',')[0] || a;
      const cityBName = riskB.location?.name?.split(',')[0] || b;

      const rainA = weatherA?.rain?.totalRain ?? 0;
      const rainB = weatherB?.rain?.totalRain ?? 0;
      const heatA = weatherA?.heat?.peakTemp ?? 0;
      const heatB = weatherB?.heat?.peakTemp ?? 0;
      const aqiScoreA = aqiA?.overallAQI ?? 999;
      const aqiScoreB = aqiB?.overallAQI ?? 999;

      const winnerOutdoor = [
        { name: cityAName, score: (riskA.overall || 0) + rainA + heatA + aqiScoreA / 10 },
        { name: cityBName, score: (riskB.overall || 0) + rainB + heatB + aqiScoreB / 10 },
      ].sort((x, y) => x.score - y.score)[0];

      const winnerFamily = [
        { name: cityAName, score: (aqiScoreA || 0) + (riskA.overall || 0) },
        { name: cityBName, score: (aqiScoreB || 0) + (riskB.overall || 0) },
      ].sort((x, y) => x.score - y.score)[0];

      const winnerResp = aqiScoreA <= aqiScoreB ? cityAName : cityBName;
      const winnerElderly = [
        { name: cityAName, score: (riskA.overall || 0) + heatA },
        { name: cityBName, score: (riskB.overall || 0) + heatB },
      ].sort((x, y) => x.score - y.score)[0];

      setComparison({
        cityA: { name: cityAName, ...riskA },
        cityB: { name: cityBName, ...riskB },
        weatherA,
        weatherB,
        aqiA,
        aqiB,
        historicalA: getHistoricalStats(cityAName),
        historicalB: getHistoricalStats(cityBName),
        winners: {
          outdoor: winnerOutdoor.name,
          family: winnerFamily.name,
          respiratory: winnerResp,
          elderly: winnerElderly.name,
        },
        rainWinner: rainA <= rainB ? cityAName : cityBName,
        rainTotals: { a: rainA, b: rainB },
        heatWinner: heatA >= heatB ? cityAName : cityBName,
        heatPeaks: { a: heatA, b: heatB },
      });

      setSearchParams({ cityA: a, cityB: b });
    } catch (err) {
      console.error('Compare error:', err);
    } finally {
      setLoading(false);
    }
  };

  const shareComparison = async () => {
    const url = `${window.location.origin}${window.location.pathname}?cityA=${encodeURIComponent(cityA)}&cityB=${encodeURIComponent(cityB)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopyState('Copied link');
      setTimeout(() => setCopyState('Share this comparison'), 1800);
    } catch (error) {
      console.error('Share copy error:', error);
      setCopyState('Copy failed');
      setTimeout(() => setCopyState('Share this comparison'), 1800);
    }
  };

  const pollutantRows = useMemo(() => {
    const left = comparison?.aqiA?.pollutants || {};
    const right = comparison?.aqiB?.pollutants || {};
    return ['pm25', 'pm10', 'no2', 'o3'].map(key => ({
      key,
      label: key.toUpperCase(),
      a: left[key]?.value ?? null,
      b: right[key]?.value ?? null,
      winner: (left[key]?.value ?? Infinity) <= (right[key]?.value ?? Infinity) ? 'A' : 'B',
    }));
  }, [comparison]);

  const rainBars = comparison ? [{ name: comparison.cityA.name, rain: comparison.rainTotals.a }, { name: comparison.cityB.name, rain: comparison.rainTotals.b }] : [];

  return (
    <div className="min-h-screen bg-[#030712] pt-20 pb-12 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-slate-100 mb-2 flex items-center gap-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            <GitCompare className="w-6 h-6 text-blue-400" />
            City Comparison
          </h1>
          <p className="text-sm text-slate-500 mb-6">Compare climate risk, weather, AQI, and historical safety between any two cities worldwide</p>
        </motion.div>

        <form onSubmit={handleCompare} className="grid md:grid-cols-2 gap-4 rounded-2xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-md p-4">
          <div>
            <label className="text-xs text-slate-500 mb-2 block font-medium">City A</label>
            <input type="text" value={cityA} onChange={e => setCityA(e.target.value)} placeholder="e.g. Tokyo, Japan" className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-blue-500/50 focus:bg-slate-900 transition-colors" />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-2 block font-medium">City B</label>
            <input type="text" value={cityB} onChange={e => setCityB(e.target.value)} placeholder="e.g. Manila, Philippines" className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-blue-500/50 focus:bg-slate-900 transition-colors" />
          </div>
          <div className="md:col-span-2 flex flex-col sm:flex-row gap-3">
            <button type="submit" disabled={loading} className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-xl font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? 'Comparing...' : 'Compare Cities'}
            </button>
            <button type="button" onClick={shareComparison} className="sm:w-52 py-3 bg-slate-800/60 hover:bg-slate-700/60 text-slate-100 rounded-xl font-medium text-sm border border-slate-700/50 transition-colors flex items-center justify-center gap-2">
              <Copy className="w-4 h-4" /> {copyState}
            </button>
          </div>
        </form>

        {loading && (
          <div className="flex items-center justify-center py-12 text-slate-400 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
            Loading climate comparison...
          </div>
        )}

        {comparison && !loading && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-4">
              <CityCard title="City A" city={comparison.cityA.name} risk={comparison.cityA} weather={comparison.weatherA} aqi={comparison.aqiA} tone={badgeTone(comparison.cityA.overall)} historical={comparison.historicalA} />
              <CityCard title="City B" city={comparison.cityB.name} risk={comparison.cityB} weather={comparison.weatherB} aqi={comparison.aqiB} tone={badgeTone(comparison.cityB.overall)} historical={comparison.historicalB} />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-md p-4">
                <h3 className="text-sm font-semibold text-slate-200 mb-3">Detailed side-by-side weather</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-slate-500 text-xs uppercase tracking-[0.2em]">
                      <tr>
                        <th className="py-2">Metric</th>
                        <th className="py-2">{comparison.cityA.name}</th>
                        <th className="py-2">{comparison.cityB.name}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/40 text-slate-300">
                      {[
                        ['Temperature', comparison.weatherA?.current?.temperature_2m, comparison.weatherB?.current?.temperature_2m],
                        ['Feels like', comparison.weatherA?.current?.apparent_temperature, comparison.weatherB?.current?.apparent_temperature],
                        ['Humidity', comparison.weatherA?.current?.relative_humidity_2m, comparison.weatherB?.current?.relative_humidity_2m],
                        ['Wind speed', comparison.weatherA?.current?.windspeed_10m, comparison.weatherB?.current?.windspeed_10m],
                        ['Pressure', comparison.weatherA?.current?.surface_pressure, comparison.weatherB?.current?.surface_pressure],
                        ['Visibility', comparison.weatherA?.visibility?.value, comparison.weatherB?.visibility?.value],
                      ].map(([label, a, b]) => (
                        <tr key={label}>
                          <td className="py-2 text-slate-500">{label}</td>
                          <td className="py-2 font-mono">{a == null ? '—' : Number(a).toFixed(1)}</td>
                          <td className="py-2 font-mono">{b == null ? '—' : Number(b).toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-md p-4">
                <h3 className="text-sm font-semibold text-slate-200 mb-3">Rain comparison</h3>
                <p className="text-sm text-slate-400 mb-3">Which city will have more rain this week?</p>
                <div className="space-y-3">
                  {rainBars.map(entry => (
                    <div key={entry.name} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-300">{entry.name}</span>
                        <span className="font-mono text-slate-200">{entry.rain.toFixed(1)} mm</span>
                      </div>
                      <div className="h-3 rounded-full bg-slate-700/40 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-600" style={{ width: `${Math.min(entry.rain * 10, 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
                  {comparison.rainWinner} is drier this week
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-md p-4">
                <h3 className="text-sm font-semibold text-slate-200 mb-3">Heatwave comparison</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-700/40 bg-slate-900/40 p-3">
                    <p className="text-xs text-slate-500">{comparison.cityA.name}</p>
                    <p className="text-lg font-bold text-slate-100">{comparison.heatPeaks.a == null ? '—' : `${Math.round(comparison.heatPeaks.a)}°C`}</p>
                  </div>
                  <div className="rounded-xl border border-slate-700/40 bg-slate-900/40 p-3">
                    <p className="text-xs text-slate-500">{comparison.cityB.name}</p>
                    <p className="text-lg font-bold text-slate-100">{comparison.heatPeaks.b == null ? '—' : `${Math.round(comparison.heatPeaks.b)}°C`}</p>
                  </div>
                </div>
                <div className="mt-3 inline-flex items-center rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-xs text-orange-300">
                  {comparison.heatWinner} is hotter
                </div>
              </div>

              <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-md p-4">
                <h3 className="text-sm font-semibold text-slate-200 mb-3">AQI comparison</h3>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[comparison.aqiA, comparison.aqiB].map((aqi, index) => (
                    <div key={index} className="rounded-xl border border-slate-700/40 bg-slate-900/40 p-3 text-center">
                      <p className="text-xs text-slate-500 mb-2">{index === 0 ? comparison.cityA.name : comparison.cityB.name}</p>
                      <div className="mx-auto h-24 w-24">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={[{ name: 'aqi', value: Math.min(aqi?.overallAQI || 0, 500) }, { name: 'rest', value: Math.max(500 - (aqi?.overallAQI || 0), 0) }]} innerRadius={30} outerRadius={42} dataKey="value" startAngle={90} endAngle={-270}>
                              <Cell fill="#38bdf8" />
                              <Cell fill="rgba(51,65,85,0.6)" />
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <p className="text-lg font-bold text-slate-100 mt-2">{aqi?.overallAQI ?? '—'}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-2 text-sm">
                  {pollutantRows.map(row => (
                    <div key={row.key} className="flex items-center gap-2 rounded-lg border border-slate-700/30 bg-slate-900/30 px-3 py-2">
                      <span className="w-14 text-xs text-slate-400">{row.label}</span>
                      <span className={`font-mono ${row.winner === 'A' ? 'text-emerald-300' : 'text-slate-300'} flex-1 text-right`}>{row.a == null ? '—' : row.a}</span>
                      <span className="text-slate-600 text-xs">vs</span>
                      <span className={`font-mono ${row.winner === 'B' ? 'text-emerald-300' : 'text-slate-300'} flex-1`}>{row.b == null ? '—' : row.b}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-md p-4">
              <h3 className="text-sm font-semibold text-slate-200 mb-3">Historical comparison</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  ['Earthquakes/decade', comparison.historicalA?.earthquakesPerDecade, comparison.historicalB?.earthquakesPerDecade],
                  ['Floods/decade', comparison.historicalA?.floodsPerDecade, comparison.historicalB?.floodsPerDecade],
                  ['Heatwave days/year', comparison.historicalA?.heatwaveDaysPerYear, comparison.historicalB?.heatwaveDaysPerYear],
                  ['Average AQI', comparison.historicalA?.averageAQI, comparison.historicalB?.averageAQI],
                ].map(([label, a, b]) => (
                  <div key={label} className="rounded-xl border border-slate-700/40 bg-slate-900/40 p-3 text-sm">
                    <p className="text-xs text-slate-500 mb-2">{label}</p>
                    <div className="flex gap-2 items-end h-20">
                      <div className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full h-16 rounded bg-slate-700/40 overflow-hidden flex items-end"><div className="w-full bg-blue-500/70" style={{ height: `${Math.min((a || 0) / 2, 100)}%` }} /></div>
                        <span className="text-[10px] text-slate-500">A</span>
                      </div>
                      <div className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full h-16 rounded bg-slate-700/40 overflow-hidden flex items-end"><div className="w-full bg-emerald-500/70" style={{ height: `${Math.min((b || 0) / 2, 100)}%` }} /></div>
                        <span className="text-[10px] text-slate-500">B</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {[
                { title: 'Better for outdoor activities this week', city: comparison.winners.outdoor, reason: 'lower heat + better AQI + less rain' },
                { title: 'Better for families with children', city: comparison.winners.family, reason: 'lower AQI + lower overall risk' },
                { title: 'Better for people with respiratory issues', city: comparison.winners.respiratory, reason: `better air quality (${comparison.aqiA?.overallAQI ?? '—'} vs ${comparison.aqiB?.overallAQI ?? '—'})` },
                { title: 'Better for elderly travelers', city: comparison.winners.elderly, reason: 'lower heat + lower disaster risk' },
              ].map(item => (
                <div key={item.title} className="rounded-2xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-md p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-2">{item.title}</p>
                  <p className="text-lg font-bold text-slate-100">{item.city}</p>
                  <p className="text-sm text-slate-400 mt-1">{item.reason}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {!loading && !comparison && (
          <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-md p-6 text-sm text-slate-500">
            Compare two cities to see detailed climate, AQI, and historical safety differences.
          </div>
        )}
      </div>
      <ScrollToTopButton />
    </div>
  );
}
