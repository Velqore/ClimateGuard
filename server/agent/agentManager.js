/**
 * Autonomous Climate Risk Monitoring Agent
 * 
 * This module implements a background scheduler that periodically evaluates
 * saved cities for climate risk changes. When risk changes exceed a threshold,
 * the agent generates an alert and schedules a follow-up check.
 */
const fs = require('fs');
const path = require('path');
const dataFetcher = require('../engine/dataFetcher');
const riskEngine = require('../engine/riskEngine');
const { promisify } = require('util');

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

const DATA_DIR = path.join(__dirname, '..', 'data');
const CITIES_FILE = path.join(DATA_DIR, 'savedCities.json');
const ALERTS_FILE = path.join(DATA_DIR, 'agentAlerts.json');

/**
 * Ensure data directory exists for persisting cities and alerts to JSON files.
 */
async function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(CITIES_FILE)) await writeFile(CITIES_FILE, JSON.stringify([]));
    if (!fs.existsSync(ALERTS_FILE)) await writeFile(ALERTS_FILE, JSON.stringify([]));
  } catch (err) {
    console.error('Agent ensure data dir error:', err);
  }
}

async function loadSavedCities() {
  try {
    await ensureDataDir();
    const raw = await readFile(CITIES_FILE, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (err) {
    console.error('Failed to load saved cities:', err);
    return [];
  }
}

async function saveSavedCities(list) {
  try {
    await ensureDataDir();
    await writeFile(CITIES_FILE, JSON.stringify(list, null, 2));
  } catch (err) {
    console.error('Failed to save saved cities:', err);
  }
}

async function appendAlert(alert) {
  try {
    await ensureDataDir();
    const raw = await readFile(ALERTS_FILE, 'utf8');
    const arr = JSON.parse(raw || '[]');
    arr.unshift({ ...alert, time: new Date().toISOString() });
    arr.splice(50); // keep recent 50
    await writeFile(ALERTS_FILE, JSON.stringify(arr, null, 2));
  } catch (err) {
    console.error('Failed to append alert:', err);
  }
}

/**
 * In-memory cache of last known risk scores per city.
 * Used to detect significant risk changes (threshold-based alerts).
 */
const lastRisk = new Map();

/**
 * Evaluate climate risk for a single city by fetching all hazard data.
 */
async function evaluateCity(city) {
  try {
    // City may be { name, lat, lon, profile }
    const coords = (city.lat && city.lon)
      ? { lat: Number(city.lat), lon: Number(city.lon), name: city.name || `${city.lat},${city.lon}` }
      : (await dataFetcher.geocode(city.name));

    if (!coords) return null;

    // Fetch all hazard data in parallel using Promise.allSettled for resilience.
    // Even if one API fails, the agent continues with available data.
    const [weather, earthquakes, fires, aqData, eonetEvents, resources] = await Promise.allSettled([
      dataFetcher.getWeather(coords.lat, coords.lon),
      dataFetcher.getEarthquakes(coords.lat, coords.lon),
      dataFetcher.getWildfires(coords.lat, coords.lon),
      dataFetcher.getAirQuality(coords.lat, coords.lon),
      dataFetcher.getEONETEvents(),
      dataFetcher.getNearbyResources(coords.lat, coords.lon),
    ]);

    const weatherData = weather.status === 'fulfilled' ? weather.value : null;
    const earthquakeData = earthquakes.status === 'fulfilled' ? earthquakes.value : [];
    const fireData = fires.status === 'fulfilled' ? fires.value : [];
    const aqResult = aqData.status === 'fulfilled' ? aqData.value : [];

    const currentWeather = weatherData?.current || {};

    const scores = {
      earthquake: riskEngine.calculateEarthquakeScore(earthquakeData, coords.lat, coords.lon),
      wildfire: riskEngine.calculateWildfireScore(fireData, currentWeather),
      storm: riskEngine.calculateStormScore(currentWeather, weatherData?.alerts || []),
      flood: riskEngine.calculateFloodScore(currentWeather, coords.lat, coords.lon),
      heat: riskEngine.calculateHeatScore(currentWeather),
      airQuality: riskEngine.calculateAirQualityScore(aqResult),
    };

    const overall = riskEngine.calculateOverallRisk(scores, city.profile || {});

    return { coords, scores, overall, weather: weatherData, earthquakes: earthquakeData };
  } catch (err) {
    console.error('evaluateCity error for', city, err);
    return null;
  }
}

async function checkAllCities(opts = { threshold: 10, followUpMinutes: 30 }) {
  const cities = await loadSavedCities();
  for (const city of cities) {
    const result = await evaluateCity(city);
    if (!result) continue;

    const prev = lastRisk.get(city.name) ?? city.lastKnownOverall ?? null;
    if (prev == null) {
      lastRisk.set(city.name, result.overall);
      continue;
    }

    const diff = Math.abs(result.overall - prev);
    if (diff >= opts.threshold) {
      // Determine whether to alert (simple decision for now)
      const dominant = Object.keys(result.scores).reduce((a, b) => result.scores[a] > result.scores[b] ? a : b);
      const alert = {
        city: city.name,
        from: prev,
        to: result.overall,
        change: result.overall - prev,
        dominant,
        sampleEvent: result.earthquakes && result.earthquakes.length ? result.earthquakes[0] : null,
      };

      // Send / record alert
      console.log('AGENT ALERT:', formatAlertText(alert));
      await appendAlert(alert);

      // schedule follow-up check after followUpMinutes
      setTimeout(async () => {
        try {
          const follow = await evaluateCity(city);
          if (!follow) return;
          const followAlert = {
            city: city.name,
            previous: result.overall,
            current: follow.overall,
            resolved: follow.overall < result.overall,
          };
          console.log('AGENT FOLLOW-UP:', formatFollowUpText(followAlert));
          await appendAlert({ followUp: true, ...followAlert });
          lastRisk.set(city.name, follow.overall);
        } catch (err) {
          console.error('Follow-up error', err);
        }
      }, opts.followUpMinutes * 60 * 1000);

      lastRisk.set(city.name, result.overall);
    } else {
      lastRisk.set(city.name, result.overall);
    }
  }
}

function formatAlertText(a) {
  const ev = a.sampleEvent ? ` New M${a.sampleEvent.magnitude || a.sampleEvent.mag} event ${a.sampleEvent.place || ''}.` : '';
  return `⚠️ Risk in ${a.city} changed ${a.from} → ${a.to} (${a.change >= 0 ? '+' : ''}${a.change}). Dominant: ${a.dominant}.${ev} Recommendation: check dashboard.`;
}

function formatFollowUpText(f) {
  if (f.resolved) return `✅ ${f.city} risk returned ${f.previous} → ${f.current}. Situation improving.`;
  return `ℹ️ ${f.city} risk checked ${f.previous} → ${f.current}. Still elevated.`;
}

let scheduler = null;

function startScheduler(intervalMinutes = 15, opts) {
  if (scheduler) return;
  // run once immediately
  checkAllCities(opts).catch(e => console.error('Initial checkAllCities error', e));
  scheduler = setInterval(() => {
    checkAllCities(opts).catch(e => console.error('Scheduled checkAllCities error', e));
  }, intervalMinutes * 60 * 1000);
  console.log(`Agent scheduler started, interval ${intervalMinutes} minutes`);
}

function stopScheduler() {
  if (scheduler) clearInterval(scheduler);
  scheduler = null;
}

module.exports = {
  loadSavedCities,
  saveSavedCities,
  evaluateCity,
  checkAllCities,
  startScheduler,
  stopScheduler,
  appendAlert,
  getSavedCities: loadSavedCities,
};
