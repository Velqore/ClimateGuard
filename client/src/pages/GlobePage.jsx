import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe,
  RefreshCw,
  AlertTriangle,
  Zap,
  Flame,
  Waves,
  Wind,
  X,
  ExternalLink,
  Radar,
  MapPinned,
  BrainCircuit,
  ClipboardList,
  ArrowRight,
  Route,
  ShieldAlert,
  Clock3,
  Target,
} from 'lucide-react';
import DisasterGlobe from '../components/DisasterGlobe';
import { apiFetch } from '../utils/helpers';

const TYPE_ICON = {
  EQ: Zap, EARTHQUAKE: Zap,
  TC: Wind, CYCLONE: Wind, HURRICANE: Wind, STORM: Wind,
  FL: Waves, FLOOD: Waves,
  WF: Flame, WILDFIRE: Flame, FIRE: Flame,
  DISASTER: AlertTriangle,
  CONFLICT: AlertTriangle,
  WAR: AlertTriangle,
  EMISSIONS: Flame,
  WATER: Waves,
  FOOD: Wind,
  ECOSYSTEM: Globe,
  DISPLACEMENT: AlertTriangle,
};
const TYPE_COLOR = {
  EQ: 'text-amber-400', EARTHQUAKE: 'text-amber-400',
  TC: 'text-cyan-400', CYCLONE: 'text-cyan-400', HURRICANE: 'text-cyan-400', STORM: 'text-purple-400',
  FL: 'text-blue-400', FLOOD: 'text-blue-400',
  WF: 'text-orange-400', WILDFIRE: 'text-orange-400', FIRE: 'text-orange-400',
  CONFLICT: 'text-red-400', WAR: 'text-red-400',
  EMISSIONS: 'text-slate-300', WATER: 'text-sky-300', FOOD: 'text-amber-300', ECOSYSTEM: 'text-emerald-300', DISPLACEMENT: 'text-rose-300',
};

function getTypeKey(t = '') { return t.toUpperCase().split(' ')[0]; }

const TYPE_LABEL = {
  EQ: 'Earthquake',
  EARTHQUAKE: 'Earthquake',
  TC: 'Storm / Cyclone',
  CYCLONE: 'Storm / Cyclone',
  HURRICANE: 'Storm / Cyclone',
  STORM: 'Storm / Cyclone',
  FL: 'Flood',
  FLOOD: 'Flood',
  WF: 'Wildfire',
  WILDFIRE: 'Wildfire',
  FIRE: 'Wildfire',
  DISASTER: 'Disaster',
  CONFLICT: 'Conflict',
  WAR: 'Conflict',
  EMISSIONS: 'Emissions',
  WATER: 'Water Stress',
  FOOD: 'Food Stress',
  ECOSYSTEM: 'Ecosystem Damage',
  DISPLACEMENT: 'Displacement',
};

const WAR_HOTSPOTS = [
  {
    title: 'Ukraine energy corridor',
    region: 'Eastern Europe',
    lat: 49.0,
    lon: 31.0,
    eventType: 'EMISSIONS',
    severity: 'critical',
    source: 'ClimateGuard Watch',
    link: 'https://www.youtube.com/results?search_query=ukraine+war+climate+impact+live',
    effect: 'Power-grid strain, fuel disruption, and emissions from destroyed infrastructure.',
    conflict: 'Ukraine',
  },
  {
    title: 'Gaza coastal water stress',
    region: 'Eastern Mediterranean',
    lat: 31.5,
    lon: 34.5,
    eventType: 'WATER',
    severity: 'critical',
    source: 'ClimateGuard Watch',
    link: 'https://www.youtube.com/results?search_query=gaza+war+environment+live',
    effect: 'Wastewater leakage, debris, and coastal ecosystem damage.',
    conflict: 'Gaza Strip',
  },
  {
    title: 'Sudan displacement belt',
    region: 'Northeast Africa',
    lat: 15.0,
    lon: 30.0,
    eventType: 'FOOD',
    severity: 'high',
    source: 'ClimateGuard Watch',
    link: 'https://www.youtube.com/results?search_query=sudan+conflict+climate+impact+live',
    effect: 'Farming disruption, food insecurity, and pressure on fragile land systems.',
    conflict: 'Sudan',
  },
  {
    title: 'Red Sea shipping pressure',
    region: 'Red Sea',
    lat: 20.0,
    lon: 38.0,
    eventType: 'EMISSIONS',
    severity: 'high',
    source: 'ClimateGuard Watch',
    link: 'https://www.youtube.com/results?search_query=red+sea+shipping+war+climate+impact+live',
    effect: 'Rerouted freight increases fuel burn and raises supply-chain emissions.',
    conflict: 'Red Sea corridor',
  },
  {
    title: 'Yemen water and port strain',
    region: 'Arabian Peninsula',
    lat: 15.5,
    lon: 47.0,
    eventType: 'WATER',
    severity: 'high',
    source: 'ClimateGuard Watch',
    link: 'https://www.youtube.com/results?search_query=yemen+war+environment+climate+live',
    effect: 'Ports, water systems, and agricultural recovery remain under chronic stress.',
    conflict: 'Yemen',
  },
  {
    title: 'Sahel resilience front',
    region: 'West Africa',
    lat: 15.0,
    lon: 3.0,
    eventType: 'DISPLACEMENT',
    severity: 'high',
    source: 'ClimateGuard Watch',
    link: 'https://www.youtube.com/results?search_query=sahel+conflict+climate+impact+live',
    effect: 'Armed instability weakens drought adaptation and accelerates land degradation.',
    conflict: 'Sahel',
  },
  {
    title: 'Myanmar forest pressure',
    region: 'Southeast Asia',
    lat: 20.0,
    lon: 96.0,
    eventType: 'ECOSYSTEM',
    severity: 'moderate',
    source: 'ClimateGuard Watch',
    link: 'https://www.youtube.com/results?search_query=myanmar+war+environment+climate+live',
    effect: 'Forest loss and displacement pressure vulnerable ecosystems and communities.',
    conflict: 'Myanmar',
  },
  {
    title: 'Haiti resilience watch',
    region: 'Caribbean',
    lat: 19.0,
    lon: -72.0,
    eventType: 'DISPLACEMENT',
    severity: 'moderate',
    source: 'ClimateGuard Watch',
    link: 'https://www.youtube.com/results?search_query=haiti+crisis+climate+live',
    effect: 'Fragile response systems leave communities more exposed to storms and floods.',
    conflict: 'Haiti',
  },
];

function toYouTubeSearchUrl(query) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

function getTypeLabel(event) {
  const key = getTypeKey(event?.eventType || event?.type || '');
  return TYPE_LABEL[key] || 'Conflict zone';
}

function getEventTitle(event) {
  return event?.title || event?.label || event?.name || 'Live event';
}

function getEventLocation(event) {
  return event?.conflict || event?.country || event?.place || event?.location || event?.region || '';
}

function getEventTime(event) {
  const raw = event?.pubDate || event?.date || event?.time || event?.updatedAt;
  if (!raw) return 'Live';
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return 'Live';
  return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function compareRecency(a, b) {
  const aTime = new Date(a?.pubDate || a?.date || a?.time || 0).getTime();
  const bTime = new Date(b?.pubDate || b?.date || b?.time || 0).getTime();
  return bTime - aTime;
}

function sanitizeText(value = '') {
  const decoded = String(value)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  return decoded
    .replace(/<[^>]*>/g, ' ')
    .replace(/<.*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function scoreNewsItem(item) {
  const source = String(item?.source || '').toLowerCase();
  const title = String(item?.title || '').toLowerCase();
  const description = String(item?.description || '').toLowerCase();
  const text = `${title} ${description}`;

  const sourceWeights = [
    ['reuters', 100],
    ['bbc', 96],
    ['ap', 94],
    ['associated press', 94],
    ['dw', 90],
    ['al jazeera', 88],
    ['google news', 72],
    ['climateguard watch', 80],
  ];

  let score = 40;
  for (const [needle, value] of sourceWeights) {
    if (source.includes(needle)) {
      score = Math.max(score, value);
    }
  }

  const topicMatches = [
    ['climate', 10], ['environment', 10], ['war', 10], ['conflict', 10],
    ['displacement', 18], ['refugee', 18], ['evacuat', 14],
    ['water', 16], ['wastewater', 16], ['drought', 16], ['river', 12], ['aquifer', 12],
    ['food', 16], ['agriculture', 16], ['crop', 14], ['harvest', 14], ['famine', 18],
    ['energy', 14], ['oil', 14], ['fuel', 14], ['pipeline', 14], ['refinery', 14], ['power grid', 14],
    ['shipping', 12], ['trade route', 12], ['port', 12],
    ['emission', 10], ['pollution', 10], ['ecosystem', 10], ['sanitation', 10], ['smoke', 10], ['fire', 10],
  ];
  for (const [needle, value] of topicMatches) {
    if (text.includes(needle)) score += value;
  }

  // Prefer stories that tie climate impacts to recent conflict regions.
  const regionSignals = [
    'ukraine', 'gaza', 'sudan', 'yemen', 'sahel', 'myanmar', 'haiti', 'red sea', 'horn of africa',
    'india', 'bangladesh', 'pakistan', 'somalia', 'ethiopia', 'nigeria', 'niger', 'chad', 'syria', 'lebanon',
  ];
  if (regionSignals.some(sig => text.includes(sig))) score += 12;

  if (item?.link) score += 4;
  if (item?.pubDate) score += 2;
  return score;
}

function summarizeImpact(item) {
  const text = `${item?.title || ''} ${item?.description || ''}`.toLowerCase();
  const reasons = [];
  const effects = [];

  if (text.includes('oil') || text.includes('fuel') || text.includes('refinery') || text.includes('pipeline') || text.includes('shipping')) {
    reasons.push('energy infrastructure and fuel systems are affected');
    effects.push('higher emissions and air pollution');
  }
  if (text.includes('water') || text.includes('wastewater') || text.includes('coastal') || text.includes('river')) {
    reasons.push('water and sanitation systems are under pressure');
    effects.push('water contamination and ecosystem stress');
  }
  if (text.includes('food') || text.includes('farm') || text.includes('agriculture') || text.includes('crop') || text.includes('grain')) {
    reasons.push('food systems and agriculture are disrupted');
    effects.push('food insecurity and land stress');
  }
  if (text.includes('smoke') || text.includes('fire') || text.includes('burn') || text.includes('explosion') || text.includes('bomb')) {
    reasons.push('smoke, burning, or blast damage can spread pollution');
    effects.push('short-term air quality deterioration');
  }
  if (text.includes('displacement') || text.includes('refugee') || text.includes('evacuat')) {
    reasons.push('population displacement increases resource pressure elsewhere');
    effects.push('greater waste, energy use, and land pressure in host regions');
  }
  if (text.includes('forest') || text.includes('coast') || text.includes('ecosystem') || text.includes('wetland')) {
    reasons.push('sensitive ecosystems are directly exposed');
    effects.push('biodiversity and habitat damage');
  }

  const severity = (item?._score || 0) >= 110 ? 'global' : (item?._score || 0) >= 95 ? 'regional' : 'local-to-regional';

  return {
    severity,
    headline: effects[0] || 'mixed environmental pressure',
    reasons: reasons.length ? reasons.slice(0, 3) : ['conflict disrupts infrastructure and emergency response', 'local damage can ripple through trade, food, water, and energy systems'],
    effects: effects.length ? effects.slice(0, 3) : ['air quality stress', 'water and sanitation pressure', 'displacement-related resource strain'],
  };
}

export default function GlobePage() {
  const [events, setEvents] = useState(WAR_HOTSPOTS);
  const [feedItems, setFeedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    const fallbackItems = WAR_HOTSPOTS.map((event, index) => ({
      title: event.title,
      description: event.effect,
      source: event.source || 'ClimateGuard Watch',
      link: event.link || toYouTubeSearchUrl(`${event.title} climate conflict`),
      conflict: event.conflict,
      eventType: event.eventType,
      severity: event.severity,
      pubDate: new Date(Date.now() - index * 3600 * 1000).toISOString(),
    }));

    try {
      setEvents(WAR_HOTSPOTS);
      setFeedItems(fallbackItems);
      const [feed] = await Promise.allSettled([
        apiFetch('/api/feed?topic=climate-conflict'),
      ]);

      if (feed.status === 'fulfilled' && feed.value?.items) {
        setFeedItems(feed.value.items.map(item => ({
          ...item,
          title: sanitizeText(item.title || ''),
          description: sanitizeText(item.description || ''),
          link: String(item.link || '').trim(),
          source: item.source || 'Google News',
        })));
      }
      setLastUpdated(new Date());
    } catch {
      // Keep fallback items for demo reliability when remote feed is unavailable.
    } finally {
      setLoading(false);
    }
  };

  // When user clicks a conflict zone, highlight the related region in the feed
  const handleEventClick = (event) => {
    setSelected(event);
  };

  useEffect(() => { load(); }, []);

  const countByType = events.reduce((acc, e) => {
    const k = getTypeKey(e.eventType || '');
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});

  const recentEvents = useMemo(
    () => [...events].sort((a, b) => {
      const order = { critical: 0, high: 1, moderate: 2, low: 3 };
      return (order[a.severity] ?? 9) - (order[b.severity] ?? 9);
    }).slice(0, 8),
    [events],
  );

  const uniqueZones = useMemo(() => {
    const zones = new Set();
    events.forEach(event => {
      const label = getEventLocation(event) || event?.title;
      if (label) zones.add(label);
    });
    return zones.size;
  }, [events]);

  const topTypes = useMemo(
    () => Object.entries(countByType).sort((a, b) => b[1] - a[1]).slice(0, 4),
    [countByType],
  );

  const articleItems = useMemo(
    () => [...feedItems]
      .map(item => ({ ...item, _score: scoreNewsItem(item) }))
      .sort((a, b) => b._score - a._score || compareRecency(a, b))
      .slice(0, 6),
    [feedItems],
  );

  const primaryType = topTypes[0]?.[0] || 'DISPLACEMENT';
  const primaryLabel = TYPE_LABEL[primaryType] || 'Conflict network';
  const criticalSignals = events.filter(event => (event.severity || '').toLowerCase() === 'critical').length;
  const activeSignals = events.length;
  const impactSignals = [...new Set(events.map(event => getTypeKey(event.eventType || '')))].filter(Boolean).length;
  const featuredStory = articleItems[0] || null;
  const featuredImpact = summarizeImpact(featuredStory);

  const briefingLines = [
    `Monitoring ${activeSignals} conflict zones across ${uniqueZones || 0} active regions.`,
    `Primary pressure is ${primaryLabel.toLowerCase()} and the environmental damage attached to it.`,
    'Use the Map page for terrain and weather detail; this page is for war-room monitoring, climate impact, and response coordination.',
  ];

  const responseDeck = [
    {
      label: 'Open Map',
      icon: MapPinned,
      action: () => navigate('/map'),
      tone: 'blue',
      description: 'Detailed terrain, layers, and local analysis.',
    },
    {
      label: 'Open Alerts',
      icon: ShieldAlert,
      action: () => navigate('/alerts'),
      tone: 'orange',
      description: 'Live alert stream and severity triage.',
    },
    {
      label: 'Ask AI',
      icon: BrainCircuit,
      action: () => navigate('/assistant'),
      tone: 'emerald',
      description: 'Generate a response briefing or safety plan.',
    },
    {
      label: 'Compare Cities',
      icon: Route,
      action: () => navigate('/compare'),
      tone: 'violet',
      description: 'Side-by-side risk evaluation.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,rgba(220,38,38,0.16),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(30,64,175,0.12),transparent_32%)]" />
      <div className="relative mx-auto max-w-7xl px-4 pt-24 pb-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between mb-6">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-red-300 mb-4">
              <Target className="w-3.5 h-3.5" />
              Live War Room
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Climate Conflict War Room
            </h1>
            <p className="mt-3 max-w-2xl text-sm md:text-base text-slate-400 leading-relaxed">
              This page focuses on war and its environmental effects: displacement, water stress, emissions,
              food disruption, infrastructure damage, and live news around climate-linked conflict.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-full border border-slate-700/60 bg-slate-900/70 px-4 py-2 text-sm text-slate-300 hover:border-slate-500 hover:text-white transition-colors disabled:opacity-40">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh feeds
            </button>
            <button onClick={() => navigate('/map')} className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 transition-colors">
              Open Map
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 mb-6">
          {[
            { label: 'Conflict zones', value: activeSignals, icon: Radar, tone: 'text-red-300', bg: 'bg-red-500/10 border-red-500/20' },
            { label: 'Critical now', value: criticalSignals, icon: AlertTriangle, tone: 'text-rose-300', bg: 'bg-rose-500/10 border-rose-500/20' },
            { label: 'Environmental effects', value: impactSignals, icon: Globe, tone: 'text-emerald-300', bg: 'bg-emerald-500/10 border-emerald-500/20' },
            { label: 'Primary pressure', value: primaryLabel, icon: MapPinned, tone: 'text-sky-300', bg: 'bg-sky-500/10 border-sky-500/20' },
          ].map(card => {
            const Icon = card.icon;
            return (
              <div key={card.label} className={`rounded-2xl border ${card.bg} backdrop-blur-md p-4 shadow-lg shadow-black/10`}>
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-slate-500 mb-3">
                  <Icon className={`w-4 h-4 ${card.tone}`} />
                  {card.label}
                </div>
                <div className={`text-2xl font-black ${card.tone}`}>{card.value || '—'}</div>
              </div>
            );
          })}
        </div>

        <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_340px] items-start">
          <section className="rounded-3xl border border-slate-700/50 bg-slate-900/40 backdrop-blur-xl p-4 shadow-2xl shadow-black/20">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-[0.2em]">Crisis Timeline</h2>
                <p className="text-xs text-slate-500 mt-1">Conflict hotspots and environmental damage points, sorted live.</p>
              </div>
              <Clock3 className="w-4 h-4 text-slate-500" />
            </div>

            <div className="space-y-3 max-h-[70vh] overflow-auto pr-1">
              {recentEvents.length ? recentEvents.map((event, index) => {
                const type = getTypeKey(event.eventType || event.type || '');
                const Icon = TYPE_ICON[type] || AlertTriangle;
                const color = TYPE_COLOR[type] || 'text-slate-400';
                return (
                  <button
                    key={`${getEventTitle(event)}-${index}`}
                    onClick={() => setSelected(event)}
                    className="w-full text-left rounded-2xl border border-slate-700/50 bg-slate-950/40 p-3 hover:border-red-500/30 hover:bg-slate-950/60 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 rounded-xl border border-current/20 bg-current/10 p-2 ${color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 mb-1">
                          <span className="uppercase tracking-[0.18em]">{TYPE_LABEL[type] || 'Conflict zone'}</span>
                          <span>{getEventTime(event)}</span>
                        </div>
                        <p className="text-sm font-semibold text-slate-100 truncate">{getEventTitle(event)}</p>
                        <p className="text-xs text-slate-500 mt-1 truncate">{getEventLocation(event) || event.effect}</p>
                      </div>
                    </div>
                  </button>
                );
              }) : (
                <div className="rounded-2xl border border-dashed border-slate-700/50 bg-slate-950/40 p-4 text-sm text-slate-500">
                  Waiting for conflict signals.
                </div>
              )}
            </div>
          </section>

          <section className="relative rounded-3xl border border-slate-700/50 bg-slate-900/35 backdrop-blur-xl overflow-hidden shadow-2xl shadow-black/20 min-h-[72vh]">
            <div className="absolute inset-x-0 top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/40 bg-slate-950/65 px-4 py-3 backdrop-blur-md">
              <div>
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-red-300">
                  <Globe className="w-3.5 h-3.5" />
                  3D War Globe
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Drag to inspect. Release and leave the globe to resume rotation.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {topTypes.slice(0, 3).map(([type, count]) => {
                  const Icon = TYPE_ICON[type] || AlertTriangle;
                  const color = TYPE_COLOR[type] || 'text-slate-400';
                  return (
                    <span key={type} className={`inline-flex items-center gap-1.5 rounded-full border border-slate-700/50 bg-slate-950/60 px-3 py-1 text-[11px] ${color}`}>
                      <Icon className="w-3 h-3" />
                      {TYPE_LABEL[type] || type}: {count}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="h-[72vh] pt-14">
              <DisasterGlobe events={events} onEventClick={handleEventClick} />
            </div>

            <div className="absolute bottom-4 left-4 right-4 grid gap-2 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-700/50 bg-slate-950/70 px-3 py-2 text-xs text-slate-400 backdrop-blur-md">
                <div className="mb-1 font-semibold text-slate-200">Command status</div>
                Live coordination mode is active.
              </div>
              <div className="rounded-2xl border border-slate-700/50 bg-slate-950/70 px-3 py-2 text-xs text-slate-400 backdrop-blur-md">
                <div className="mb-1 font-semibold text-slate-200">Rotation behavior</div>
                Pauses on drag, resumes only after pointer leaves.
              </div>
              <div className="rounded-2xl border border-slate-700/50 bg-slate-950/70 px-3 py-2 text-xs text-slate-400 backdrop-blur-md">
                <div className="mb-1 font-semibold text-slate-200">Map guidance</div>
                Open the Map page for terrain, weather, and deeper analysis.
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="rounded-3xl border border-slate-700/50 bg-slate-900/40 backdrop-blur-xl p-4 shadow-2xl shadow-black/20">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-emerald-300 mb-3">
                <BrainCircuit className="w-4 h-4" />
                AI Incident Briefing
              </div>

              <h2 className="text-lg font-bold text-white mb-3">Executive summary</h2>
              <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
                {briefingLines.map(line => <p key={line}>{line}</p>)}
              </div>

              <div className="mt-4 rounded-2xl border border-slate-700/50 bg-slate-950/50 p-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-slate-500 mb-3">
                  <ClipboardList className="w-4 h-4" />
                  Response priorities
                </div>
                <div className="space-y-2 text-sm text-slate-300">
                  <div className="flex items-start gap-2"><span className="mt-1 h-2 w-2 rounded-full bg-sky-400" />Use the Map page for terrain, weather, and local hazard detail.</div>
                  <div className="flex items-start gap-2"><span className="mt-1 h-2 w-2 rounded-full bg-amber-400" />Use Alerts to separate conflict escalation from environmental damage signals.</div>
                  <div className="flex items-start gap-2"><span className="mt-1 h-2 w-2 rounded-full bg-emerald-400" />Use the AI Assistant to generate a response plan or executive note.</div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-700/50 bg-slate-900/40 backdrop-blur-xl p-4 shadow-2xl shadow-black/20">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-sky-300 mb-3">
                <Route className="w-4 h-4" />
                Response Deck
              </div>

              <div className="grid gap-3">
                {responseDeck.map(item => {
                  const Icon = item.icon;
                  const tones = {
                    blue: 'border-blue-500/20 bg-blue-500/10 text-blue-300',
                    orange: 'border-orange-500/20 bg-orange-500/10 text-orange-300',
                    emerald: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
                    violet: 'border-violet-500/20 bg-violet-500/10 text-violet-300',
                  };
                  return (
                    <button
                      key={item.label}
                      onClick={item.action}
                      className={`rounded-2xl border p-4 text-left transition-transform hover:-translate-y-0.5 ${tones[item.tone]}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 font-semibold">
                            <Icon className="w-4 h-4" />
                            {item.label}
                          </div>
                          <p className="mt-1 text-xs opacity-80">{item.description}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 shrink-0 opacity-80" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

          </section>
        </div>

        <section className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-3xl border border-slate-700/50 bg-slate-900/40 backdrop-blur-xl p-4 shadow-2xl shadow-black/20">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-[0.2em]">Watchlist</h2>
                <p className="text-xs text-slate-500 mt-1">Key live counters placed here to use the empty space beneath the globe.</p>
              </div>
              <ShieldAlert className="w-4 h-4 text-amber-300" />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
              {[
                ['Zones', uniqueZones],
                ['Critical', criticalSignals],
                ['Impacts', impactSignals],
                ['Top type', primaryLabel],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-slate-700/50 bg-slate-950/50 p-3">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{label}</div>
                  <div className="mt-1 text-lg font-bold text-white">{value || '—'}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-700/50 bg-slate-900/40 backdrop-blur-xl p-4 shadow-2xl shadow-black/20">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-amber-300 mb-3">
              <ShieldAlert className="w-4 h-4" />
              Watchlist Notes
            </div>
            <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
              <p>Use the map and assistant for tactical detail, and keep the globe focused on live conflict coverage.</p>
              <p>The cards above now sit in the space that was previously empty below the globe and timeline.</p>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-slate-700/50 bg-slate-900/40 backdrop-blur-xl p-4 shadow-2xl shadow-black/20">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-[0.2em]">Recent Climate-Conflict Coverage</h2>
                <p className="text-xs text-slate-500 mt-1">Fresh headlines about war, displacement, water stress, energy, and environmental damage.</p>
              </div>
              {featuredStory?.source && (
                <span className="text-[11px] text-red-300">{featuredStory.source}</span>
              )}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {articleItems.slice(0, 8).map((item, index) => (
                <button
                  key={`${item.title}-${index}`}
                  onClick={() => setSelected(item)}
                  className={`rounded-2xl border p-4 text-left transition-colors ${index === 0 ? 'border-red-500/30 bg-red-500/10' : 'border-slate-700/50 bg-slate-950/40 hover:border-slate-500'}`}
                >
                  <div className="flex items-center justify-between gap-2 text-[11px] uppercase tracking-[0.22em] text-slate-500">
                    <span>{item.source || 'Feed'}</span>
                    <span className="text-slate-600">{index + 1}</span>
                  </div>
                  <div className="mt-2 text-sm font-semibold text-slate-100 leading-snug line-clamp-2 break-all">{item.title}</div>
                  <div className="mt-2 text-xs text-slate-500 line-clamp-3 break-words">
                    {item.description || 'Open the story queue for more context.'}
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-slate-500">
                    <span>{getEventLocation(item) || 'Global coverage'}</span>
                    <span className="text-red-300">Open story</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-700/50 bg-slate-900/40 backdrop-blur-xl p-4 shadow-2xl shadow-black/20">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-[0.2em]">Ranked Story Queue</h2>
                <p className="text-xs text-slate-500 mt-1">Sorted by credibility, recency, and climate-conflict relevance.</p>
              </div>
              <span className="text-[11px] text-slate-500">top {articleItems.length}</span>
            </div>

            <div className="space-y-3 max-h-[50vh] overflow-auto pr-1">
              {articleItems.length ? articleItems.map((item, index) => (
                <button
                  key={`${item.title}-${index}`}
                  onClick={() => setSelected(item)}
                  className={`w-full rounded-2xl border p-4 text-left transition-colors ${index === 0 ? 'border-red-500/30 bg-red-500/10' : 'border-slate-700/50 bg-slate-950/40 hover:border-slate-500'}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] uppercase tracking-[0.24em] text-slate-400">{item.source || 'Feed'}</span>
                    <span className="text-[10px] text-slate-500">score {Math.round(item._score || 0)}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-100 leading-snug line-clamp-2 break-all">{item.title}</h3>
                  <p className="mt-2 text-xs text-slate-400 line-clamp-3">
                    {item.description || 'Relevant war-and-environment reporting.'}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-slate-500">
                    <span>{getEventLocation(item) || 'Global coverage'}</span>
                    <span className="text-red-300">Select story</span>
                  </div>
                </button>
              )) : (
                <div className="rounded-2xl border border-dashed border-slate-700/50 bg-slate-950/40 p-5 text-sm text-slate-500">
                  No article feed available right now.
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-slate-700/50 bg-slate-900/40 backdrop-blur-xl p-4 shadow-2xl shadow-black/20">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-[0.2em]">Global Environmental Impact</h2>
              <p className="text-xs text-slate-500 mt-1">Shows why a large war or attack can matter beyond the battlefield.</p>
            </div>
            {featuredStory && (
              <div className="text-[11px] text-slate-500">
                Based on: <span className="text-slate-300">{featuredStory.title}</span>
              </div>
            )}
          </div>

          <div className="grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-2xl border border-slate-700/50 bg-slate-950/50 p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-red-300 mb-3">
                <AlertTriangle className="w-4 h-4" />
                Estimated effect
              </div>
              <div className="text-2xl font-black text-white">{featuredImpact.headline}</div>
              <div className="mt-3 text-sm text-slate-400 leading-relaxed">
                A major attack or conflict event can spread environmental damage through air, water, food, energy, and displacement chains. The impact below is ranked from the latest prominent story.
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {featuredImpact.effects.map(effect => (
                  <div key={effect} className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-3 text-sm text-slate-200">
                    {effect}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700/50 bg-slate-950/50 p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-emerald-300 mb-3">
                <ShieldAlert className="w-4 h-4" />
                Why it matters
              </div>
              <div className="text-sm text-slate-300 leading-relaxed space-y-3">
                <p><span className="text-white font-semibold">Severity:</span> {featuredImpact.severity}</p>
                <div>
                  <p className="text-slate-400 mb-2">Reasons</p>
                  <ul className="space-y-2">
                    {featuredImpact.reasons.map(reason => (
                      <li key={reason} className="flex items-start gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-red-400" />
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-3 text-xs text-slate-400">
                  If the event is large enough, the climate effect often becomes regional or global through fuel burn, reconstruction emissions, refugee pressure, and damage to water and food systems.
                </div>
              </div>
            </div>
          </div>
        </section>

        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 60 }}
              className="mt-4 rounded-3xl border border-slate-700/50 bg-slate-900/95 backdrop-blur-xl p-4 shadow-2xl shadow-black/30"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">{selected.source || 'Live Event'}</span>
                    {selected.eventType && (
                      <span className="px-2 py-0.5 bg-slate-800 rounded text-[10px] text-slate-400">{selected.eventType}</span>
                    )}
                  </div>
                  <h3 className="text-white font-bold text-base break-words">{selected.title || selected.label}</h3>
                  {selected.conflict && <p className="text-slate-400 text-sm">📍 {selected.conflict}</p>}
                  {selected.effect && <p className="text-slate-400 text-sm mt-1 break-words">{selected.effect}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {selected.link && (
                    <a href={selected.link} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 border border-red-500/40 rounded-lg text-xs text-red-300 hover:bg-red-600/30 transition-colors">
                      <ExternalLink className="w-3 h-3" /> Details
                    </a>
                  )}
                  <button onClick={() => setSelected(null)} className="p-1.5 text-slate-500 hover:text-slate-300">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!loading && !events.length && (
          <div className="mt-4 rounded-3xl border border-slate-700/50 bg-slate-900/40 backdrop-blur-xl p-5 text-sm text-slate-500">
            No active conflict zones are available right now.
          </div>
        )}

        {lastUpdated && (
          <div className="mt-3 text-[11px] text-slate-600">
            Last refreshed {lastUpdated.toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
}
