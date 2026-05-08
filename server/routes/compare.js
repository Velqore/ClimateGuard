const express = require('express');
const router = express.Router();
const dataFetcher = require('../engine/dataFetcher');
const riskEngine = require('../engine/riskEngine');
const causeEngine = require('../engine/causeEngine');
const historicalEngine = require('../engine/historicalEngine');

router.post('/', async (req, res) => {
  try {
    const { cityA, cityB } = req.body;
    if (!cityA || !cityB) return res.status(400).json({ error: 'Provide both cities' });

    const [geoAResult, geoBResult] = await Promise.allSettled([
      dataFetcher.geocode(cityA),
      dataFetcher.geocode(cityB),
    ]);

    const geoA = geoAResult.status === 'fulfilled' ? geoAResult.value : null;
    const geoB = geoBResult.status === 'fulfilled' ? geoBResult.value : null;

    if (!geoA) return res.status(404).json({ error: `City not found: ${cityA}` });
    if (!geoB) return res.status(404).json({ error: `City not found: ${cityB}` });

    const [dataAResult, dataBResult] = await Promise.allSettled([
      getCityRisk(geoA),
      getCityRisk(geoB),
    ]);

    const dataA = dataAResult.status === 'fulfilled' ? dataAResult.value : { scores: {}, overall: 0, riskLevel: 'UNKNOWN', dominant: 'unknown' };
    const dataB = dataBResult.status === 'fulfilled' ? dataBResult.value : { scores: {}, overall: 0, riskLevel: 'UNKNOWN', dominant: 'unknown' };

    const comparison = {
      cityA: { ...geoA, ...dataA },
      cityB: { ...geoB, ...dataB },
      winner: dataA.overall <= dataB.overall ? 'cityA' : 'cityB',
      winnerName: dataA.overall <= dataB.overall ? cityA : cityB,
      loserName: dataA.overall <= dataB.overall ? cityB : cityA,
      percentSafer: Math.round(Math.abs(dataA.overall - dataB.overall) / Math.max(dataA.overall, dataB.overall) * 100),
      hazardComparison: {},
      narrative: '',
    };

    for (const hazard of Object.keys(dataA.scores)) {
      const a = dataA.scores[hazard];
      const b = dataB.scores[hazard];
      comparison.hazardComparison[hazard] = {
        cityA: a,
        cityB: b,
        winner: a <= b ? 'cityA' : 'cityB',
        difference: Math.abs(a - b),
      };
    }

    comparison.narrative = generateNarrative(cityA, cityB, dataA, dataB, comparison);

    res.json(comparison);
  } catch (err) {
    console.error('Compare error:', err);
    res.status(500).json({ error: 'Failed to compare cities' });
  }
});

async function getCityRisk(coords) {
  const [weather, earthquakes, fires, aqData] = await Promise.allSettled([
    dataFetcher.getWeather(coords.lat, coords.lon),
    dataFetcher.getEarthquakes(coords.lat, coords.lon),
    dataFetcher.getWildfires(coords.lat, coords.lon),
    dataFetcher.getAirQuality(coords.lat, coords.lon),
  ]);

  const weatherData = weather.status === 'fulfilled' ? weather.value : null;
  const earthquakeData = earthquakes.status === 'fulfilled' ? earthquakes.value : [];
  const fireData = fires.status === 'fulfilled' ? fires.value : [];
  const aqResult = aqData.status === 'fulfilled' ? aqData.value : [];
  const currentWeather = weatherData?.current || {};

  const scores = {
    earthquake: riskEngine.calculateEarthquakeScore(earthquakeData, coords.lat, coords.lon),
    wildfire: riskEngine.calculateWildfireScore(fireData, currentWeather),
    storm: riskEngine.calculateStormScore(currentWeather, []),
    flood: riskEngine.calculateFloodScore(currentWeather, coords.lat, coords.lon),
    heat: riskEngine.calculateHeatScore(currentWeather),
    airQuality: riskEngine.calculateAirQualityScore(aqResult),
  };

  const overall = riskEngine.calculateOverallRisk(scores);
  const riskLevel = riskEngine.getRiskLevel(overall);
  const dominant = riskEngine.getDominantHazard(scores);

  return { scores, overall, riskLevel, dominant };
}

function generateNarrative(cityA, cityB, dataA, dataB, comparison) {
  const safer = comparison.winnerName;
  const pct = comparison.percentSafer;
  const aDom = dataA.dominant;
  const bDom = dataB.dominant;

  let text = `${safer} is ${pct}% safer this week. `;

  const aWins = Object.entries(comparison.hazardComparison).filter(([, v]) => v.winner === 'cityA');
  const bWins = Object.entries(comparison.hazardComparison).filter(([, v]) => v.winner === 'cityB');

  if (aWins.length > 0 && comparison.winner === 'cityA') {
    text += `${cityA} has lower ${aWins.map(([k]) => k).join(', ')} risk. `;
  }
  if (bWins.length > 0 && comparison.winner === 'cityB') {
    text += `${cityB} has lower ${bWins.map(([k]) => k).join(', ')} risk. `;
  }

  if (aDom === bDom) {
    text += `Both cities share elevated ${aDom} risk.`;
  }

  return text;
}

module.exports = router;
