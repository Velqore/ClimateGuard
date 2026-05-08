const express = require('express');
const axios = require('axios');
const { detectHeatwave } = require('../engine/heatwaveEngine');
const { getWeather } = require('../engine/dataFetcher');

const router = express.Router();

// Cache for API responses
const cache = {};
const CACHE_DURATION = {
  aqi: 30 * 60 * 1000,        // 30 minutes
  heatwave: 15 * 60 * 1000,   // 15 minutes
  aqiStations: 60 * 60 * 1000, // 1 hour
  heatwaveGrid: 15 * 60 * 1000 // 15 minutes
};

function getCached(key) {
  const item = cache[key];
  if (item && Date.now() - item.timestamp < item.duration) {
    return item.data;
  }
  delete cache[key];
  return null;
}

function setCached(key, data, duration) {
  cache[key] = { data, timestamp: Date.now(), duration };
}

// GET /api/heatwave?lat=X&lon=Y
router.get('/heatwave', async (req, res) => {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) return res.status(400).json({ error: 'Missing coordinates' });

    const cacheKey = `heatwave_${lat}_${lon}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    // Use internal getWeather which falls back to Open-Meteo when OpenWeather key is missing
    const wf = await getWeather(lat, lon);

    // normalize weatherData to OpenWeather-like shape expected by detectHeatwave
    const weatherData = {
      main: {
        temp: wf?.current?.temp ?? wf?.current?.temp ?? 0,
        feels_like: wf?.current?.feelsLike ?? wf?.current?.feels_like ?? wf?.current?.feels_like ?? 0,
        humidity: wf?.current?.humidity ?? 50,
        pressure: wf?.current?.pressure ?? 1013
      },
      wind: { speed: wf?.current?.windSpeed ?? wf?.current?.wind_speed ?? 0 }
    };

    // normalize forecastData to Open-Meteo-like hourly arrays if possible
    let forecastData = null;
    if (wf?.forecast?.hourly) {
      forecastData = wf.forecast; // already in hourly form
    } else if (Array.isArray(wf?.forecast) && wf.forecast.length > 0) {
      const hourly = {
        apparent_temperature: wf.forecast.map(f => f.temp || 0),
        relativehumidity_2m: wf.forecast.map(f => f.humidity || 50),
        time: wf.forecast.map(f => f.dt ? new Date(f.dt * 1000).toISOString() : new Date().toISOString())
      };
      forecastData = { hourly };
    }

    const heatwaveData = await detectHeatwave(weatherData, forecastData, lat, lon);
    
    setCached(cacheKey, heatwaveData, CACHE_DURATION.heatwave);
    res.json(heatwaveData);
  } catch (error) {
    console.error('Heatwave error:', error);
    res.status(500).json({ error: 'Failed to fetch heatwave data', details: error.message });
  }
});

// GET /api/aqi?lat=X&lon=Y
router.get('/aqi', async (req, res) => {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) return res.status(400).json({ error: 'Missing coordinates' });

    const cacheKey = `aqi_${lat}_${lon}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    // Fetch from Open-Meteo Air Quality API
    const aqRes = await axios.get(
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,ozone,uv_index`
    );

    const hourly = aqRes.data.hourly;
    const pm25 = hourly.pm2_5?.[0] || 0;
    const pm10 = hourly.pm10?.[0] || 0;
    const co = hourly.carbon_monoxide?.[0] || 0;
    const no2 = hourly.nitrogen_dioxide?.[0] || 0;
    const o3 = hourly.ozone?.[0] || 0;

    // Calculate AQI from PM2.5 using standard formula
    const calculateAQI = (value) => {
      if (value <= 12) return Math.round((value / 12) * 50);
      if (value <= 35.4) return Math.round(((value - 12.1) / (35.4 - 12.1)) * 50 + 50);
      if (value <= 55.4) return Math.round(((value - 35.5) / (55.4 - 35.5)) * 50 + 100);
      if (value <= 150.4) return Math.round(((value - 55.5) / (150.4 - 55.5)) * 50 + 150);
      if (value <= 250.4) return Math.round(((value - 150.5) / (250.4 - 150.5)) * 100 + 200);
      return Math.round(((value - 250.5) / (500.4 - 250.5)) * 200 + 300);
    };

    const overallAQI = calculateAQI(pm25);

    const getCategory = (aqi) => {
      if (aqi <= 50) return { category: 'Good', color: '#22C55E' };
      if (aqi <= 100) return { category: 'Moderate', color: '#EAB308' };
      if (aqi <= 150) return { category: 'Unhealthy for Sensitive', color: '#F97316' };
      if (aqi <= 200) return { category: 'Unhealthy', color: '#EF4444' };
      if (aqi <= 300) return { category: 'Very Unhealthy', color: '#9333EA' };
      return { category: 'Hazardous', color: '#7F1D1D' };
    };

    const categoryData = getCategory(overallAQI);

    const getRecommendation = (aqi) => {
      if (aqi <= 50) return "✅ Air quality is good. Safe for outdoor activities.";
      if (aqi <= 100) return "⚠️ Acceptable. Sensitive individuals should limit prolonged outdoor exertion.";
      if (aqi <= 150) return "🔶 Unhealthy for sensitive groups. Children and elderly should reduce outdoor time.";
      if (aqi <= 200) return "🔴 Unhealthy. Everyone should limit outdoor activities. Wear N95 mask outdoors.";
      if (aqi <= 300) return "🟣 Very unhealthy. Avoid all outdoor activities. Keep windows closed.";
      return "☠️ Hazardous. Stay indoors. Seal doors and windows. Seek medical advice if symptomatic.";
    };

    const aqi_data = {
      overallAQI,
      category: categoryData.category,
      color: categoryData.color,
      pollutants: {
        pm25: { value: Math.round(pm25 * 10) / 10, unit: 'μg/m³', safe_limit: 12, status: pm25 > 12 ? 'Unhealthy' : 'Safe' },
        pm10: { value: Math.round(pm10 * 10) / 10, unit: 'μg/m³', safe_limit: 50, status: pm10 > 50 ? 'Unhealthy' : 'Safe' },
        co: { value: Math.round(co * 100) / 100, unit: 'mg/m³', safe_limit: 4.4, status: co > 4.4 ? 'Unhealthy' : 'Safe' },
        no2: { value: Math.round(no2 * 10) / 10, unit: 'μg/m³', safe_limit: 25, status: no2 > 25 ? 'Unhealthy' : 'Safe' },
        o3: { value: Math.round(o3 * 10) / 10, unit: 'μg/m³', safe_limit: 100, status: o3 > 100 ? 'Unhealthy' : 'Safe' }
      },
      recommendation: getRecommendation(overallAQI),
      dominantPollutant: 'PM2.5',
      lastUpdated: new Date().toISOString()
    };

    setCached(cacheKey, aqi_data, CACHE_DURATION.aqi);
    res.json(aqi_data);
  } catch (error) {
    console.error('AQI error:', error);
    res.status(500).json({ error: 'Failed to fetch AQI data', details: error.message });
  }
});

// GET /api/map/aqi-stations
router.get('/map/aqi-stations', async (req, res) => {
  try {
    const cacheKey = 'aqi_stations_global';
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const response = await axios.get('https://api.openaq.org/v2/latest?limit=100&sort=desc');
    
    const stations = response.data.results.map(station => ({
      lat: station.coordinates?.latitude || 0,
      lon: station.coordinates?.longitude || 0,
      aqi: Math.round(station.measurements?.[0]?.value || 0),
      stationName: station.location || 'Unknown',
      country: station.country,
      pollutants: station.measurements?.map(m => ({ name: m.parameter, value: m.value })) || []
    })).filter(s => s.lat && s.lon);

    setCached(cacheKey, stations, CACHE_DURATION.aqiStations);
    res.json(stations);
  } catch (error) {
    console.error('AQI stations error:', error);
    res.status(500).json({ error: 'Failed to fetch AQI stations', details: error.message });
  }
});

// GET /api/map/heatwave-grid
router.get('/map/heatwave-grid', async (req, res) => {
  try {
    const { bbox } = req.query;
    if (!bbox) return res.status(400).json({ error: 'Missing bbox' });

    const [minLat, minLon, maxLat, maxLon] = bbox.split(',').map(Number);
    const cacheKey = `heatwave_grid_${bbox}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    // Create grid of points
    const points = [];
    const step = (maxLat - minLat) / 5; // 5x5 grid
    
    for (let lat = minLat; lat <= maxLat; lat += step) {
      for (let lon = minLon; lon <= maxLon; lon += step) {
        // Use getWeather which will fallback if OpenWeather key missing
        const wf = await getWeather(lat, lon).catch(() => null);
        if (wf?.current) {
          points.push({
            lat,
            lon,
            temp: wf.current.temp || 0,
            feelsLike: wf.current.feelsLike || wf.current.feels_like || 0,
            humidity: wf.current.humidity || 50
          });
        }
      }
    }

    setCached(cacheKey, points, CACHE_DURATION.heatwaveGrid);
    res.json(points);
  } catch (error) {
    console.error('Heatwave grid error:', error);
    res.status(500).json({ error: 'Failed to fetch heatwave grid', details: error.message });
  }
});

module.exports = router;
