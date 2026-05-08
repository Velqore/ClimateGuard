import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Clock, Loader2, AlertTriangle, Shield } from 'lucide-react';
import { apiFetch, formatCoords, getRiskColor } from '../utils/helpers';
import { fadeInUp, staggerContainer } from '../utils/animations';
import SearchBar from '../components/SearchBar';
import RiskMeter from '../components/RiskMeter';
import HazardCard from '../components/HazardCard';
import WeatherWidget from '../components/WeatherWidget';
import TimelineChart from '../components/TimelineChart';
import TsunamiAlert from '../components/TsunamiAlert';
import EvacuationPlanner from '../components/EvacuationPlanner';
import PersonalRiskProfile from '../components/PersonalRiskProfile';
import ResourceMap from '../components/ResourceMap';
import ClimateTimeline from '../components/ClimateTimeline';
import DisasterPhotoFeed from '../components/DisasterPhotoFeed';
import AlertFeed from '../components/AlertFeed';
import HeatwaveAlert from '../components/HeatwaveAlert';
import AQIWidget from '../components/AQIWidget';
import WeatherForecastIntelligence from '../components/WeatherForecastIntelligence';
import ParticleBackground from '../components/ParticleBackground';
import AlertTakeover from '../components/AlertTakeover';

export default function Dashboard() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [activeTarget, setActiveTarget] = useState(null);

  const location = searchParams.get('location');
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');
  const hasCoords = Boolean(lat && lon);

  useEffect(() => {
    if (hasCoords) {
      const target = { lat: Number(lat), lon: Number(lon) };
      setActiveTarget(target);
      loadRisk(target);
      return;
    }

    if (location) {
      const target = { location };
      setActiveTarget(target);
      loadRisk(target);
    }
  }, [location, lat, lon]);

  const loadRisk = async (target, overrideProfile = profile) => {
    setLoading(true);
    try {
      const payload = target.lat != null && target.lon != null
        ? { lat: target.lat, lon: target.lon, profile: overrideProfile }
        : { location: target.location, profile: overrideProfile };

      const result = await apiFetch('/api/risk', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setData(result);
    } catch (err) {
      console.error('Dashboard risk load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (loc) => {
    const target = { location: loc };
    setActiveTarget(target);
    navigate(`/dashboard?location=${encodeURIComponent(loc)}`);
  };

  const handleProfileChange = async (newProfile) => {
    setProfile(newProfile);
    if (activeTarget) {
      await loadRisk(activeTarget, newProfile);
    }
  };

  const riskScore = data?.overall ?? 0;
  const isCritical = riskScore >= 80;

  return (
<div className="relative min-h-screen bg-[#030712] pt-20 pb-12 px-4 overflow-x-hidden">
        <ParticleBackground riskScore={riskScore} />
        <AlertTakeover riskScore={riskScore} location={data?.location?.name} show={isCritical && !!data} />
        <div className="relative z-10 max-w-6xl mx-auto">
          <div className="mb-8">
          <SearchBar onSearch={handleSearch} className="max-w-xl" />
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
            <span className="ml-3 text-slate-400">Analyzing climate risks...</span>
          </div>
        )}

        {!loading && !data && (
          <div className="text-center py-20">
            <MapPin className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-300 mb-2">Search a location to begin</h2>
            <p className="text-sm text-slate-500">Enter any city or coordinates to see real-time climate risk analysis</p>
          </div>
        )}

        {data && !loading && (
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="space-y-6"
          >
            {/* Location header */}
            <motion.div variants={fadeInUp} className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-100" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {data.location?.name?.split(',').slice(0, 2).join(',')}
                </h1>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs font-mono text-slate-500">
                    {formatCoords(data.location?.lat, data.location?.lon)}
                  </span>
                  <span className="text-xs text-slate-600">|</span>
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(data.lastUpdated).toLocaleTimeString()}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-medium" style={{
                  backgroundColor: `${getRiskColor(data.overall)}15`,
                  color: getRiskColor(data.overall),
                  border: `1px solid ${getRiskColor(data.overall)}30`,
                }}>
                  {data.riskLevel?.level || 'UNKNOWN'}
                </span>
              </div>
            </motion.div>

            {/* Tsunami alert */}
            <TsunamiAlert tsunami={data.tsunami} />

            {/* Personal risk profile */}
            <PersonalRiskProfile scores={data.scores} onProfileChange={handleProfileChange} />

            {/* Overall risk meter */}
            <motion.div variants={fadeInUp} className="grid md:grid-cols-2 gap-6">
              <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-md p-6 flex items-center justify-center">
                <RiskMeter score={data.overall} size="large" />
              </div>
              <TimelineChart forecast={data.weather?.forecast} />
            </motion.div>

            {data.location?.lat != null && data.location?.lon != null && (
              <WeatherForecastIntelligence lat={data.location.lat} lon={data.location.lon} />
            )}

            {/* Hazard cards */}
            <motion.div variants={fadeInUp}>
              <h2 className="text-lg font-bold text-slate-200 mb-4">Hazard Breakdown</h2>
              <div className="grid md:grid-cols-2 gap-3">
                {Object.entries(data.scores || {}).map(([type, score], i) => (
                  <HazardCard
                    key={type}
                    type={type}
                    score={score}
                    cause={data.causes?.[type]}
                    index={i}
                  />
                ))}
              </div>
            </motion.div>

            {/* Heatwave Alert */}
            {data.location?.lat && data.location?.lon && (
              <HeatwaveAlert lat={data.location.lat} lon={data.location.lon} />
            )}

            {/* AQI Widget */}
            {data.location?.lat && data.location?.lon && (
              <AQIWidget lat={data.location.lat} lon={data.location.lon} />
            )}

            {/* Evacuation planner */}
            <EvacuationPlanner
              scores={data.scores}
              location={data.location}
              resources={data.resources}
            />

            {/* Weather + Resources */}
            <div className="grid md:grid-cols-2 gap-6">
              <WeatherWidget weather={data.weather} />
              <ResourceMap
                lat={data.location?.lat}
                lon={data.location?.lon}
                resources={data.resources}
              />
            </div>

            {/* Nearby events */}
            {data.nearbyEvents?.length > 0 && (
              <motion.div variants={fadeInUp}>
                <h2 className="text-lg font-bold text-slate-200 mb-4">Nearby Events (500km)</h2>
                <AlertFeed limit={5} />
              </motion.div>
            )}

            {/* Historical timeline */}
            <ClimateTimeline historical={data.historical} />

            {/* Disaster photos */}
            <DisasterPhotoFeed
              location={data.location?.name?.split(',')[0]}
              disaster={data.dominant}
            />

            {/* Recommendations */}
            {data.recommendations?.length > 0 && (
              <motion.div variants={fadeInUp} className="rounded-xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-md p-4">
                <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-400" />
                  Recommendations
                </h3>
                <div className="space-y-2">
                  {data.recommendations.map((rec, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-slate-400">
                      <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                      <span>{rec.text}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}