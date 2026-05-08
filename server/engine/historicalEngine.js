const cache = require('./cache');

function getHistoricalData(lat, lon) {
  const key = `hist:${Math.round(lat)},${Math.round(lon)}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const data = generateHistoricalProfile(lat, lon);
  cache.set(key, data, 86400000);
  return data;
}

function generateHistoricalProfile(lat, lon) {
  const years = [];
  const currentYear = new Date().getFullYear();

  for (let y = currentYear - 10; y <= currentYear; y++) {
    const baseTemp = 14 + (lat / 90) * 15;
    const warming = (y - (currentYear - 10)) * 0.05;
    years.push({
      year: y,
      avgTemp: Math.round((baseTemp + warming + (Math.random() - 0.5) * 2) * 10) / 10,
      disasters: Math.round(getRegionDisasterRate(lat, lon) + (Math.random() - 0.3) * 3),
      precipitation: Math.round((800 + Math.sin(lon * 0.05) * 400 + (Math.random() - 0.5) * 200) * 10) / 10,
    });
  }

  return {
    years,
    trend: 'warming',
    tempChange: '+0.5°C',
    disasterTrend: 'increasing',
    summary: `This region has experienced a warming trend of approximately 0.5°C over the past decade, with ${years.reduce((s, y) => s + y.disasters, 0)} significant climate events recorded.`,
  };
}

function getRegionDisasterRate(lat, lon) {
  if (Math.abs(lat) < 30 && lon > 60 && lon < 160) return 8;
  if (Math.abs(lat) < 30) return 5;
  if (Math.abs(lat) < 50) return 3;
  return 2;
}

function getMonthlyRisk(lat, lon, month) {
  const isNorth = lat > 0;
  const seasons = isNorth
    ? { spring: [2, 3, 4], summer: [5, 6, 7], fall: [8, 9, 10], winter: [11, 0, 1] }
    : { spring: [8, 9, 10], summer: [11, 0, 1], fall: [2, 3, 4], winter: [5, 6, 7] };

  let season = 'spring';
  for (const [s, months] of Object.entries(seasons)) {
    if (months.includes(month)) { season = s; break; }
  }

  const risks = {
    wildfire: season === 'summer' ? 60 : season === 'fall' ? 35 : 15,
    flood: season === 'fall' ? 50 : season === 'summer' ? 30 : 20,
    storm: season === 'fall' ? 55 : season === 'winter' ? 45 : 25,
    heat: season === 'summer' ? 65 : season === 'spring' ? 25 : 10,
    earthquake: 20,
    airQuality: season === 'summer' ? 40 : season === 'winter' ? 45 : 25,
  };

  if (Math.abs(lat) < 23.5) {
    risks.storm = season === 'summer' ? 70 : 40;
    risks.flood = season === 'summer' ? 60 : 30;
  }

  return risks;
}

module.exports = { getHistoricalData, getMonthlyRisk };
