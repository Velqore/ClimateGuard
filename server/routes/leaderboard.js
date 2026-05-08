const express = require('express');
const router = express.Router();
const cache = require('../engine/cache');
const dataFetcher = require('../engine/dataFetcher');
const riskEngine = require('../engine/riskEngine');

const MONITORED_CITIES = [
  { name: 'Tokyo', country: 'Japan', lat: 35.6762, lon: 139.6503 },
  { name: 'Manila', country: 'Philippines', lat: 14.5995, lon: 120.9842 },
  { name: 'Jakarta', country: 'Indonesia', lat: -6.2088, lon: 106.8456 },
  { name: 'Dhaka', country: 'Bangladesh', lat: 23.8103, lon: 90.4125 },
  { name: 'Mumbai', country: 'India', lat: 19.076, lon: 72.8777 },
  { name: 'Delhi', country: 'India', lat: 28.7041, lon: 77.1025 },
  { name: 'Karachi', country: 'Pakistan', lat: 24.8607, lon: 67.0011 },
  { name: 'Los Angeles', country: 'USA', lat: 34.0522, lon: -118.2437 },
  { name: 'New York', country: 'USA', lat: 40.7128, lon: -74.006 },
  { name: 'Miami', country: 'USA', lat: 25.7617, lon: -80.1918 },
  { name: 'Mexico City', country: 'Mexico', lat: 19.4326, lon: -99.1332 },
  { name: 'São Paulo', country: 'Brazil', lat: -23.5505, lon: -46.6333 },
  { name: 'Lagos', country: 'Nigeria', lat: 6.5244, lon: 3.3792 },
  { name: 'Cairo', country: 'Egypt', lat: 30.0444, lon: 31.2357 },
  { name: 'Istanbul', country: 'Turkey', lat: 41.0082, lon: 28.9784 },
  { name: 'Tehran', country: 'Iran', lat: 35.6892, lon: 51.389 },
  { name: 'Beijing', country: 'China', lat: 39.9042, lon: 116.4074 },
  { name: 'Shanghai', country: 'China', lat: 31.2304, lon: 121.4737 },
  { name: 'Seoul', country: 'South Korea', lat: 37.5665, lon: 126.978 },
  { name: 'Bangkok', country: 'Thailand', lat: 13.7563, lon: 100.5018 },
  { name: 'Sydney', country: 'Australia', lat: -33.8688, lon: 151.2093 },
  { name: 'Auckland', country: 'New Zealand', lat: -36.8485, lon: 174.7633 },
  { name: 'Nairobi', country: 'Kenya', lat: -1.2921, lon: 36.8219 },
  { name: 'London', country: 'UK', lat: 51.5074, lon: -0.1278 },
  { name: 'Paris', country: 'France', lat: 48.8566, lon: 2.3522 },
  { name: 'Madrid', country: 'Spain', lat: 40.4168, lon: -3.7038 },
  { name: 'Rome', country: 'Italy', lat: 41.9028, lon: 12.4964 },
  { name: 'Athens', country: 'Greece', lat: 37.9838, lon: 23.7275 },
  { name: 'Moscow', country: 'Russia', lat: 55.7558, lon: 37.6173 },
  { name: 'Santiago', country: 'Chile', lat: -33.4489, lon: -70.6693 },
  { name: 'Lima', country: 'Peru', lat: -12.0464, lon: -77.0428 },
  { name: 'Bogota', country: 'Colombia', lat: 4.711, lon: -74.0721 },
  { name: 'Buenos Aires', country: 'Argentina', lat: -34.6037, lon: -58.3816 },
  { name: 'Kathmandu', country: 'Nepal', lat: 27.7172, lon: 85.324 },
  { name: 'Colombo', country: 'Sri Lanka', lat: 6.9271, lon: 79.8612 },
  { name: 'Yangon', country: 'Myanmar', lat: 16.8661, lon: 96.1951 },
  { name: 'Ho Chi Minh City', country: 'Vietnam', lat: 10.8231, lon: 106.6297 },
  { name: 'Kabul', country: 'Afghanistan', lat: 34.5553, lon: 69.2075 },
  { name: 'Baghdad', country: 'Iraq', lat: 33.3152, lon: 44.3661 },
  { name: 'Tbilisi', country: 'Georgia', lat: 41.7151, lon: 44.8271 },
  { name: 'Warsaw', country: 'Poland', lat: 52.2297, lon: 21.0122 },
  { name: 'Bucharest', country: 'Romania', lat: 44.4268, lon: 26.1025 },
  { name: 'Kiev', country: 'Ukraine', lat: 50.4501, lon: 30.5234 },
  { name: 'Lisbon', country: 'Portugal', lat: 38.7223, lon: -9.1393 },
  { name: 'Casablanca', country: 'Morocco', lat: 33.5731, lon: -7.5898 },
  { name: 'Johannesburg', country: 'South Africa', lat: -26.2041, lon: 28.0473 },
  { name: 'Caracas', country: 'Venezuela', lat: 10.4806, lon: -66.9036 },
  { name: 'Phnom Penh', country: 'Cambodia', lat: 11.5564, lon: 104.9282 },
  { name: 'Ulaanbaatar', country: 'Mongolia', lat: 47.8864, lon: 106.9057 },
];

let leaderboardCache = null;
let lastRefresh = 0;
const REFRESH_INTERVAL = 30 * 60 * 1000;

async function refreshLeaderboard() {
  if (Date.now() - lastRefresh < REFRESH_INTERVAL && leaderboardCache) return leaderboardCache;

  const results = [];

  for (const city of MONITORED_CITIES) {
    try {
      const [weather, earthquakes, fires, aqData] = await Promise.allSettled([
        dataFetcher.getWeather(city.lat, city.lon),
        dataFetcher.getEarthquakes(city.lat, city.lon),
        dataFetcher.getWildfires(city.lat, city.lon),
        dataFetcher.getAirQuality(city.lat, city.lon),
      ]);

      const weatherData = weather.status === 'fulfilled' ? weather.value : null;
      const earthquakeData = earthquakes.status === 'fulfilled' ? earthquakes.value : [];
      const fireData = fires.status === 'fulfilled' ? fires.value : [];
      const aqResult = aqData.status === 'fulfilled' ? aqData.value : [];
      const currentWeather = weatherData?.current || {};

      const scores = {
        earthquake: riskEngine.calculateEarthquakeScore(earthquakeData, city.lat, city.lon),
        wildfire: riskEngine.calculateWildfireScore(fireData, currentWeather),
        storm: riskEngine.calculateStormScore(currentWeather, []),
        flood: riskEngine.calculateFloodScore(currentWeather, city.lat, city.lon),
        heat: riskEngine.calculateHeatScore(currentWeather),
        airQuality: riskEngine.calculateAirQualityScore(aqResult),
      };

      const overall = riskEngine.calculateOverallRisk(scores);
      const dominant = riskEngine.getDominantHazard(scores);

      results.push({
        name: city.name,
        country: city.country,
        lat: city.lat,
        lon: city.lon,
        overall,
        scores,
        dominant,
        riskLevel: riskEngine.getRiskLevel(overall),
      });
    } catch (e) {
      console.error(`Leaderboard error for ${city.name}:`, e.message);
    }
  }

  results.sort((a, b) => b.overall - a.overall);

  leaderboardCache = {
    mostDangerous: results.slice(0, 10),
    safest: results.slice(-10).reverse(),
    mostEarthquake: [...results].sort((a, b) => b.scores.earthquake - a.scores.earthquake).slice(0, 5),
    worstAirQuality: [...results].sort((a, b) => b.scores.airQuality - a.scores.airQuality).slice(0, 5),
    highestHeat: [...results].sort((a, b) => b.scores.heat - a.scores.heat).slice(0, 5),
    lastUpdated: new Date().toISOString(),
  };

  lastRefresh = Date.now();
  return leaderboardCache;
}

router.get('/', async (req, res) => {
  try {
    const data = await refreshLeaderboard();
    res.json(data);
  } catch (err) {
    console.error('Leaderboard error:', err);
    if (leaderboardCache) res.json(leaderboardCache);
    else res.status(500).json({ error: 'Failed to generate leaderboard' });
  }
});

module.exports = router;
