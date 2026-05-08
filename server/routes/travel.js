const express = require('express');
const router = express.Router();
const dataFetcher = require('../engine/dataFetcher');
const riskEngine = require('../engine/riskEngine');
const historicalEngine = require('../engine/historicalEngine');

router.post('/', async (req, res) => {
  try {
    const { from, to, startDate, endDate } = req.body;
    if (!to) return res.status(400).json({ error: 'Destination required' });

    const dest = await dataFetcher.geocode(to);
    if (!dest) return res.status(404).json({ error: 'Destination not found' });

    const [weather, earthquakes, fires, aqData] = await Promise.allSettled([
      dataFetcher.getWeather(dest.lat, dest.lon),
      dataFetcher.getEarthquakes(dest.lat, dest.lon),
      dataFetcher.getWildfires(dest.lat, dest.lon),
      dataFetcher.getAirQuality(dest.lat, dest.lon),
    ]);

    const weatherData = weather.status === 'fulfilled' ? weather.value : null;
    const earthquakeData = earthquakes.status === 'fulfilled' ? earthquakes.value : [];
    const fireData = fires.status === 'fulfilled' ? fires.value : [];
    const aqResult = aqData.status === 'fulfilled' ? aqData.value : [];
    const currentWeather = weatherData?.current || {};

    const scores = {
      earthquake: riskEngine.calculateEarthquakeScore(earthquakeData, dest.lat, dest.lon),
      wildfire: riskEngine.calculateWildfireScore(fireData, currentWeather),
      storm: riskEngine.calculateStormScore(currentWeather, []),
      flood: riskEngine.calculateFloodScore(currentWeather, dest.lat, dest.lon),
      heat: riskEngine.calculateHeatScore(currentWeather),
      airQuality: riskEngine.calculateAirQualityScore(aqResult),
    };

    const overall = riskEngine.calculateOverallRisk(scores);
    const riskLevel = riskEngine.getRiskLevel(overall);

    let monthRisk = null;
    if (startDate) {
      const month = new Date(startDate).getMonth();
      monthRisk = historicalEngine.getMonthlyRisk(dest.lat, dest.lon, month);
    }

    let verdict = 'SAFE';
    if (overall > 60) verdict = 'AVOID';
    else if (overall > 40) verdict = 'CAUTION';

    const bestMonths = findBestMonths(dest.lat, dest.lon);

    const packingList = generatePackingList(scores, verdict);

    res.json({
      destination: dest,
      overall,
      riskLevel,
      verdict,
      scores,
      weather: weatherData,
      monthRisk,
      bestMonths,
      packingList,
      warnings: generateWarnings(scores),
      lastUpdated: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Travel error:', err);
    res.status(500).json({ error: 'Failed to assess travel safety' });
  }
});

function findBestMonths(lat, lon) {
  const monthlyScores = [];
  for (let m = 0; m < 12; m++) {
    const risks = historicalEngine.getMonthlyRisk(lat, lon, m);
    const avg = Object.values(risks).reduce((s, v) => s + v, 0) / 6;
    monthlyScores.push({ month: m, score: avg });
  }
  monthlyScores.sort((a, b) => a.score - b.score);
  const best = monthlyScores.slice(0, 3);
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return best.map(b => months[b.month]).join(', ');
}

function generateWarnings(scores) {
  const warnings = [];
  if (scores.earthquake > 40) warnings.push('Active seismic zone — familiarize yourself with earthquake safety procedures');
  if (scores.wildfire > 40) warnings.push('Wildfire risk — avoid forested areas and monitor local fire reports');
  if (scores.storm > 40) warnings.push('Storm season — check weather forecasts daily and have contingency plans');
  if (scores.flood > 40) warnings.push('Flood-prone area — avoid low-lying accommodation near rivers');
  if (scores.heat > 40) warnings.push('Extreme heat expected — plan outdoor activities for early morning only');
  if (scores.airQuality > 40) warnings.push('Poor air quality — bring N95 masks and limit outdoor exercise');
  return warnings;
}

function generatePackingList(scores, verdict) {
  const items = ['Passport and travel documents', 'First aid kit', 'Flashlight', 'Portable charger'];

  if (scores.earthquake > 30) items.push('Emergency whistle', 'Sturdy shoes');
  if (scores.wildfire > 30) items.push('N95 masks (pack of 10)', 'Fire-resistant clothing');
  if (scores.storm > 30) items.push('Rain gear', 'Waterproof bags for electronics');
  if (scores.flood > 30) items.push('Waterproof boots', 'Dry bags');
  if (scores.heat > 30) items.push('SPF 50+ sunscreen', 'Electrolyte packets', 'Wide-brim hat');
  if (scores.airQuality > 30) items.push('N95 masks', 'Portable air purifier');

  if (verdict === 'AVOID') items.push('Consider postponing travel');
  if (verdict === 'CAUTION') items.push('Travel insurance recommended');

  return items;
}

module.exports = router;
