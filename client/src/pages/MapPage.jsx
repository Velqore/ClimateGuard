import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Radar, Shield, Route, Layers3 } from 'lucide-react';
import GlobalMap from '../components/GlobalMap';
import { apiFetch } from '../utils/helpers';

export default function MapPage() {
  const [search, setSearch] = useState('');
  const [searchLoc, setSearchLoc] = useState(null);
  const navigate = useNavigate();

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!search.trim()) return;
    try {
      const result = await apiFetch(`/api/risk`, {
        method: 'POST',
        body: JSON.stringify({ location: search.trim() }),
      });
      setSearchLoc({ lat: result.location.lat, lon: result.location.lon });
    } catch (err) {
      console.error('Map search error:', err);
    }
  };

  const handleAnalyzeLocation = (lat, lon) => {
    navigate(`/dashboard?lat=${lat}&lon=${lon}`);
  };

  return (
    <div className="min-h-screen bg-[#030712] pt-4 md:pt-6 pb-6 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_30%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.10),transparent_28%),radial-gradient(circle_at_bottom,rgba(30,41,59,0.55),transparent_40%)]" />

      <div className="relative z-10 mx-auto max-w-[1600px] px-4 md:px-6 lg:px-8">
        <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)] items-start mb-5">
          <section className="rounded-3xl border border-slate-700/50 bg-slate-950/70 backdrop-blur-xl shadow-2xl shadow-black/20 p-5 md:p-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-300">
              <Radar className="w-3.5 h-3.5" />
              Live Map Intelligence
            </div>

            <h1 className="mt-4 text-3xl md:text-4xl font-black tracking-tight text-white">
              Climate Risk Map
            </h1>
            <p className="mt-3 text-sm md:text-[15px] leading-relaxed text-slate-400 max-w-xl">
              Search any place, drop a coordinate marker, and inspect earthquakes, wildfires, storms, floods,
              and air quality on a high-contrast world map.
            </p>

            <div className="mt-5 grid grid-cols-3 gap-2">
              {[
                { icon: Shield, label: 'Live layers', value: '5' },
                { icon: Layers3, label: 'Map tools', value: '4' },
                { icon: Route, label: 'Analyze', value: '1 tap' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="rounded-2xl border border-slate-700/50 bg-slate-900/60 px-3 py-3">
                  <Icon className="w-4 h-4 text-sky-300" />
                  <div className="mt-2 text-lg font-bold text-white">{value}</div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{label}</div>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-slate-700/50 bg-slate-900/60 p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-full bg-blue-500/15 p-2 text-blue-300">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-100">Select location</div>
                  <div className="mt-1 text-xs leading-relaxed text-slate-400">
                    Click anywhere on the map to drop a marker, review the coordinate, and analyze it in the dashboard.
                  </div>
                </div>
              </div>

              <form onSubmit={handleSearch} className="mt-4 flex items-center gap-2 rounded-2xl border border-slate-700/50 bg-slate-950/80 px-3 py-2.5 shadow-inner shadow-black/20">
                <MapPin className="w-4 h-4 text-slate-500 shrink-0" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Fly to any location..."
                  className="bg-transparent text-sm text-slate-200 placeholder-slate-600 outline-none flex-1 min-w-0"
                />
                <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-sky-500/15 px-3 py-1.5 text-xs font-semibold text-sky-200 hover:bg-sky-500/25 transition-colors shrink-0">
                  <Search className="w-4 h-4" />
                  Search
                </button>
              </form>
            </div>
          </section>

          <section className="relative rounded-3xl border border-slate-700/50 bg-slate-950/65 backdrop-blur-xl shadow-2xl shadow-black/20 overflow-hidden min-h-[72vh]">
            <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-3 border-b border-slate-700/40 bg-slate-950/75 px-4 py-3 backdrop-blur-md">
              <div>
                <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Interactive Hazard Map</div>
                <div className="text-sm font-semibold text-slate-100 mt-1">Explore live hazards and open the risk dashboard</div>
              </div>
              <div className="hidden md:flex items-center gap-2 text-[11px] text-slate-500">
                <span className="rounded-full border border-slate-700/50 bg-slate-900/70 px-3 py-1">Drag to explore</span>
                <span className="rounded-full border border-slate-700/50 bg-slate-900/70 px-3 py-1">Click to analyze</span>
              </div>
            </div>

            <div className="h-[72vh] pt-14">
              <GlobalMap searchLocation={searchLoc} enableClickAnalysis onAnalyzeLocation={handleAnalyzeLocation} />
            </div>
          </section>
        </div>

        <div className="grid gap-4 md:grid-cols-3 mt-5">
          {[
            {
              title: 'How it works',
              text: 'Search a city, click anywhere on the map, then open the dashboard for risk details and local context.',
            },
            {
              title: 'Live layers',
              text: 'Toggle earthquakes, fires, storms, floods, and AQI from the layer control on the map.',
            },
            {
              title: 'Best use',
              text: 'Use the map for quick location checks and the dashboard for deeper climate risk analysis.',
            },
          ].map(card => (
            <div key={card.title} className="rounded-2xl border border-slate-700/50 bg-slate-950/60 backdrop-blur-md px-4 py-4 shadow-lg shadow-black/10">
              <div className="text-xs uppercase tracking-[0.22em] text-sky-300">{card.title}</div>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{card.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
