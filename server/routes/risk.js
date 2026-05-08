const express = require('express');
const router = express.Router();
const dataFetcher = require('../engine/dataFetcher');
const riskEngine = require('../engine/riskEngine');
const causeEngine = require('../engine/causeEngine');
const tsunamiEngine = require('../engine/tsunamiEngine');
const historicalEngine = require('../engine/historicalEngine');

router.post('/', async (req, res) => {
  try {
    const { location, lat, lon, profile } = req.body;

    let coords;
    if (lat && lon) {
      coords = { lat: parseFloat(lat), lon: parseFloat(lon), name: `${lat}, ${lon}` };
    } else if (location) {
      coords = await dataFetcher.geocode(location);
      if (!coords) return res.status(404).json({ error: 'Location not found' });
    } else {
      return res.status(400).json({ error: 'Provide location or lat/lon' });
    }

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
    const eonetData = eonetEvents.status === 'fulfilled' ? eonetEvents.value : [];
    const resourceData = resources.status === 'fulfilled' ? resources.value : [];

    const currentWeather = weatherData?.current || {};
    const alerts = weatherData?.alerts || [];

    const scores = {
      earthquake: riskEngine.calculateEarthquakeScore(earthquakeData, coords.lat, coords.lon),
      wildfire: riskEngine.calculateWildfireScore(fireData, currentWeather),
      storm: riskEngine.calculateStormScore(currentWeather, alerts),
      flood: riskEngine.calculateFloodScore(currentWeather, coords.lat, coords.lon),
      heat: riskEngine.calculateHeatScore(currentWeather),
      airQuality: riskEngine.calculateAirQualityScore(aqResult),
    };

    const overall = riskEngine.calculateOverallRisk(scores, profile);
    const riskLevel = riskEngine.getRiskLevel(overall);
    const dominant = riskEngine.getDominantHazard(scores);

    const causes = {};
    for (const hazard of Object.keys(scores)) {
      if (scores[hazard] > 15) {
        causes[hazard] = causeEngine.analyzeCause(hazard, currentWeather, coords, earthquakeData, fireData, aqResult);
      }
    }

    const tsunami = tsunamiEngine.assessTsunamiRisk(earthquakeData, coords);
    const historical = historicalEngine.getHistoricalData(coords.lat, coords.lon);

    const nearbyEvents = eonetData.filter(e => {
      const dist = dataFetcher.haversine(coords.lat, coords.lon, e.lat, e.lon);
      return dist <= 500;
    }).slice(0, 10);

    const recommendations = generateRecommendations(scores, dominant, tsunami);

    res.json({
      location: coords,
      overall,
      riskLevel,
      dominant,
      scores,
      causes,
      tsunami,
      weather: weatherData,
      earthquakes: earthquakeData.slice(0, 10),
      fires: fireData.slice(0, 10),
      airQuality: aqResult,
      nearbyEvents,
      resources: resourceData.slice(0, 15),
      historical,
      recommendations,
      lastUpdated: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Risk calculation error:', err);
    res.status(500).json({ error: 'Failed to calculate risk', details: err.message });
  }
});

function generateRecommendations(scores, dominant, tsunami) {
  const recs = [];

  if (scores.earthquake > 40) {
    recs.push({ type: 'earthquake', text: 'Secure heavy furniture and prepare an earthquake kit with 72-hour supplies' });
  }
  if (scores.wildfire > 40) {
    recs.push({ type: 'wildfire', text: 'Create defensible space around property and prepare go-bag with N95 masks' });
  }
  if (scores.storm > 40) {
    recs.push({ type: 'storm', text: 'Reinforce windows and doors, stock emergency water and non-perishable food' });
  }
  if (scores.flood > 40) {
    recs.push({ type: 'flood', text: 'Know your evacuation route and move valuables above ground level' });
  }
  if (scores.heat > 40) {
    recs.push({ type: 'heat', text: 'Stay hydrated, limit outdoor activity to early morning, check on elderly neighbors' });
  }
  if (scores.airQuality > 40) {
    recs.push({ type: 'airQuality', text: 'Use HEPA air purifiers indoors, limit outdoor exercise, wear N95 masks outside' });
  }
  if (tsunami.risk) {
    recs.push({ type: 'tsunami', text: 'IMMEDIATE: Move to high ground (30m+ elevation). Do not wait for official warning.' });
  }

  return recs;
}

module.exports = router;
