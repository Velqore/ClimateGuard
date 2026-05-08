import { motion } from 'framer-motion';
import { Satellite, Database, Shield, Cpu, Github, ExternalLink } from 'lucide-react';
import { fadeInUp, staggerContainer } from '../utils/animations';

export default function About() {
  const dataSources = [
    { name: 'OpenWeather API', desc: 'Current weather, forecasts, and extreme weather alerts', url: 'https://openweathermap.org' },
    { name: 'USGS Earthquake API', desc: 'Real-time global earthquake feed updated every minute', url: 'https://earthquake.usgs.gov' },
    { name: 'NASA FIRMS', desc: 'Real-time wildfire/fire detection from satellites', url: 'https://firms.modaps.eosdis.nasa.gov' },
    { name: 'NASA EONET', desc: 'Natural events: storms, volcanoes, floods, sea ice', url: 'https://eonet.gsfc.nasa.gov' },
    { name: 'OpenAQ', desc: 'Real-time global air quality data', url: 'https://openaq.org' },
    { name: 'Open-Meteo', desc: 'High-resolution weather forecasts globally', url: 'https://open-meteo.com' },
    { name: 'Nominatim', desc: 'Geocoding — convert city names to coordinates', url: 'https://nominatim.openstreetmap.org' },
    { name: 'OpenStreetMap Overpass', desc: 'Hospitals, shelters, emergency resources', url: 'https://overpass-api.de' },
    { name: 'Flickr API', desc: 'Real disaster photos from affected locations', url: 'https://flickr.com' },
  ];

  return (
    <div className="min-h-screen bg-[#030712] pt-20 pb-12 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="space-y-12"
        >
          <motion.div variants={fadeInUp} className="text-center">
            <Satellite className="w-12 h-12 text-blue-400 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-slate-100 mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              About ClimateGuard AI
            </h1>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Real-time global climate risk intelligence — free, open, and accessible to everyone on Earth.
            </p>
          </motion.div>

          <motion.div variants={fadeInUp} className="rounded-xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-md p-6">
            <h2 className="text-lg font-bold text-slate-200 mb-3">The Problem</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Climate disasters affected 185 million people in 2024 alone. Yet most people have no way to quickly understand their real-time climate risk. Existing tools are fragmented, expensive, or require expert knowledge. ClimateGuard AI changes this by providing instant, comprehensive risk assessment for any location on Earth — combining live data from 9+ public APIs into a single, actionable dashboard.
            </p>
          </motion.div>

          <motion.div variants={fadeInUp}>
            <h2 className="text-lg font-bold text-slate-200 mb-4">How It Works</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { icon: Database, title: '1. Live Data', desc: 'We aggregate real-time data from NASA, NOAA, USGS, OpenWeather, and OpenAQ — updated every 15 minutes.' },
                { icon: Shield, title: '2. Risk Engine', desc: 'Our multi-hazard scoring engine calculates risk across 6 dimensions: earthquake, wildfire, storm, flood, heat, and air quality.' },
                { icon: Cpu, title: '3. Intelligence', desc: 'Cause analysis explains WHY each hazard is occurring, with scientific context, historical trends, and actionable recommendations.' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="rounded-xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-md p-4">
                  <Icon className="w-6 h-6 text-blue-400 mb-3" />
                  <h3 className="text-sm font-bold text-slate-200 mb-2">{title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div variants={fadeInUp}>
            <h2 className="text-lg font-bold text-slate-200 mb-4">Data Sources</h2>
            <div className="space-y-2">
              {dataSources.map(src => (
                <div key={src.name} className="flex items-center justify-between p-3 rounded-lg border border-slate-700/30 bg-slate-800/20">
                  <div>
                    <h3 className="text-sm font-medium text-slate-300">{src.name}</h3>
                    <p className="text-xs text-slate-500">{src.desc}</p>
                  </div>
                  <a href={src.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div variants={fadeInUp} className="rounded-xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-md p-6">
            <h2 className="text-lg font-bold text-slate-200 mb-3">Risk Scoring Methodology</h2>
            <p className="text-sm text-slate-400 leading-relaxed mb-4">
              Each hazard is scored 0-100 based on real-time conditions. The overall risk is a weighted average:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {[
                { name: 'Earthquake', weight: '20%' },
                { name: 'Wildfire', weight: '20%' },
                { name: 'Storm', weight: '20%' },
                { name: 'Flood', weight: '15%' },
                { name: 'Heat', weight: '15%' },
                { name: 'Air Quality', weight: '10%' },
              ].map(({ name, weight }) => (
                <div key={name} className="flex items-center justify-between p-2 bg-slate-900/50 rounded-lg">
                  <span className="text-slate-400">{name}</span>
                  <span className="font-mono text-slate-300">{weight}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-1 text-xs text-slate-500">
              <p>0-20: MINIMAL (green) | 21-40: LOW (cyan) | 41-60: MODERATE (amber)</p>
              <p>61-80: HIGH (orange) | 81-100: CRITICAL (red)</p>
            </div>
          </motion.div>

          <motion.div variants={fadeInUp} className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-full">
              <Cpu className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-slate-400">Powered by AMD MI300X GPUs</span>
            </div>
            <p className="text-xs text-slate-600 mt-4">MIT Open Source License</p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
