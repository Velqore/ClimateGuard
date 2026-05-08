function calculateEarthquakeScore(earthquakes, lat, lon) {
  if (!earthquakes || earthquakes.length === 0) return 5;

  let score = 0;
  const recentWindow = 30; // days
  const now = Date.now();

  // Score recent earthquakes with exponential decay
  for (const q of earthquakes) {
    const ageInDays = (now - new Date(q.time).getTime()) / (1000 * 60 * 60 * 24);
    if (ageInDays > recentWindow) continue;

    // Distance-based scoring (exponential decay)
    const distFactor = Math.max(0, Math.exp(-q.distance / 200));
    
    // Magnitude scoring (0-8 scale, with higher weight for larger earthquakes)
    const magBase = Math.min(q.magnitude / 8, 1);
    const magFactor = magBase * magBase; // quadratic scaling for impact
    
    // Recency bonus (newer earthquakes weighted higher)
    const recencyFactor = Math.exp(-ageInDays / 10);
    
    score += magFactor * distFactor * recencyFactor * 30;
  }

  // Check for major recent earthquakes
  const maxMag = Math.max(...earthquakes.map(q => q.magnitude), 0);
  const recentMajor = earthquakes.filter(q => {
    const ageInDays = (now - new Date(q.time).getTime()) / (1000 * 60 * 60 * 24);
    return ageInDays <= 30 && q.magnitude >= 6;
  });

  if (maxMag >= 7.5) score += 50;
  else if (maxMag >= 7) score += 40;
  else if (maxMag >= 6.5) score += 30;
  else if (maxMag >= 6) score += 20;
  else if (maxMag >= 5) score += 10;

  score += Math.min(recentMajor.length * 10, 20);

  // Geographic factors
  if (isInRingOfFire(lat, lon)) score *= 1.4;
  if (isInHimalayanBelt(lat, lon)) score *= 1.3;

  return Math.min(Math.round(score), 100);
}

function calculateWildfireScore(fires, weather) {
  let score = 0;

  if (fires && fires.length > 0) {
    // Immediate threat (nearby active fires)
    const veryClose = fires.filter(f => f.distance < 25);
    const close = fires.filter(f => f.distance >= 25 && f.distance < 100);
    const moderate = fires.filter(f => f.distance >= 100 && f.distance < 300);

    score += Math.min(veryClose.length * 25, 50);
    score += Math.min(close.length * 12, 30);
    score += Math.min(moderate.length * 4, 15);
  } else {
    // No active fires, but check weather susceptibility
    score += 5;
  }

  if (weather) {
    const { humidity, temp, windSpeed, description } = weather;
    
    // Temperature component (dangerous when hot and dry)
    if (temp > 40) score += 25;
    else if (temp > 35) score += 18;
    else if (temp > 30) score += 10;

    // Humidity component (lower humidity = more fire risk)
    if (humidity < 10) score += 30;
    else if (humidity < 20) score += 25;
    else if (humidity < 30) score += 15;
    else if (humidity < 40) score += 8;

    // Wind component (higher wind spreads fire faster)
    if (windSpeed > 50) score += 30;
    else if (windSpeed > 35) score += 20;
    else if (windSpeed > 20) score += 10;
    else if (windSpeed > 10) score += 5;

    // Weather description bonus
    if (description?.toLowerCase().includes('smoke') || description?.toLowerCase().includes('haze')) score += 10;
  }

  return Math.min(Math.round(score), 100);
}

function calculateStormScore(weather, alerts) {
  let score = 0;

  if (weather) {
    // Atmospheric pressure (lower = stronger storms)
    if (weather.pressure < 970) score += 40;
    else if (weather.pressure < 985) score += 30;
    else if (weather.pressure < 1000) score += 15;
    else if (weather.pressure < 1010) score += 5;

    // Wind speed (primary indicator of storm severity)
    if (weather.windSpeed > 90) score += 40;
    else if (weather.windSpeed > 70) score += 35;
    else if (weather.windSpeed > 50) score += 25;
    else if (weather.windSpeed > 30) score += 12;
    else if (weather.windSpeed > 15) score += 5;

    // Precipitation (heavy rain indicates thunderstorms)
    if (weather.rain1h > 15) score += 25;
    else if (weather.rain1h > 10) score += 18;
    else if (weather.rain1h > 5) score += 10;
    else if (weather.rain1h > 1) score += 3;

    // Description keywords
    const desc = (weather.description || '').toLowerCase();
    if (desc.includes('thunderstorm') || desc.includes('tornado')) score += 30;
    else if (desc.includes('hurricane') || desc.includes('cyclone')) score += 40;
    else if (desc.includes('squall')) score += 20;
  }


  if (alerts && alerts.length > 0) {
    const stormAlerts = alerts.filter(a =>
      (a.event || '').toLowerCase().includes('storm') ||
      (a.event || '').toLowerCase().includes('hurricane') ||
      (a.event || '').toLowerCase().includes('cyclone') ||
      (a.event || '').toLowerCase().includes('tornado')
    );
    score += Math.min(stormAlerts.length * 15, 30);
  }

  return Math.min(Math.round(score), 100);
}

function calculateFloodScore(weather, lat, lon) {
  let score = 0;

  if (weather) {
    // Immediate precipitation threat
    if (weather.rain1h > 25) score += 40;
    else if (weather.rain1h > 15) score += 30;
    else if (weather.rain1h > 5) score += 15;
    else if (weather.rain1h > 1) score += 5;

    // High humidity + rain = flood risk
    if (weather.humidity > 85 && weather.rain1h > 5) score += 20;
    else if (weather.humidity > 80 && weather.rain1h > 2) score += 10;

    // Storm conditions
    if (weather.windSpeed > 40 && weather.rain1h > 5) score += 15;

    // Weather description
    if (weather.description?.toLowerCase().includes('rain')) score += 10;
    if (weather.description?.toLowerCase().includes('drizzle')) score += 3;
  } else {
    score = 10;
  }

  // Geographic flood risk
  const isCoastal = isNearCoast(lat, lon);
  if (isCoastal) score *= 1.3;

  // Low-lying areas more prone to floods
  if (lat > -40 && lat < 40) score *= 1.1;

  return Math.min(Math.round(score), 100);
}

function calculateHeatScore(weather) {
  let score = 0;

  if (weather) {
    const temp = weather.temp || 0;
    const humidity = weather.humidity || 50;
    const feelsLike = weather.feels_like || temp;

    // Temperature-based scoring (realistic heat danger)
    if (temp > 50) score += 45;
    else if (temp > 45) score += 40;
    else if (temp > 40) score += 30;
    else if (temp > 35) score += 20;
    else if (temp > 30) score += 10;
    else if (temp > 25) score += 3;

    // Feels-like temperature (humidity amplification)
    if (feelsLike > 50) score += 20;
    else if (feelsLike > 45) score += 15;
    else if (feelsLike > 40) score += 10;

    // High humidity at moderate temps = dangerous
    if (humidity > 70 && temp > 30) score += 15;
    else if (humidity > 60 && temp > 32) score += 10;

    // Dangerous heat + low wind = stagnant conditions
    if (temp > 35 && humidity > 60 && weather.windSpeed < 5) score += 15;

    // Duration factor (consecutive hot days compound effect)
    // This would need historical tracking in production
  } else {
    score = 5;
  }

  return Math.min(Math.round(score), 100);
}

function calculateAirQualityScore(aqData) {
  if (!aqData || aqData.length === 0) return 10;

  let totalAqi = 0;
  let count = 0;

  for (const reading of aqData) {
    if (reading.aqi !== undefined && reading.aqi !== null) {
      totalAqi += reading.aqi;
      count++;
    }
  }

  const avgAqi = count > 0 ? totalAqi / count : 50;

  // EPA AQI breakpoints for more realistic scoring
  if (avgAqi > 500) return 100;
  if (avgAqi > 400) return 95;
  if (avgAqi > 300) return 85;
  if (avgAqi > 250) return 75;
  if (avgAqi > 200) return 65;
  if (avgAqi > 150) return 55;
  if (avgAqi > 100) return 40;
  if (avgAqi > 50) return 25;
  if (avgAqi > 35) return 15;
  return 5;
}

function calculateOverallRisk(scores, profile = {}) {
  const weights = {
    earthquake: 0.18,      // Slightly reduced
    wildfire: 0.18,        // Slightly reduced
    storm: 0.18,           // Slightly reduced
    flood: 0.15,           // Slightly increased
    heat: 0.18,            // Increased (health impact)
    airQuality: 0.13,      // Increased (daily impact)
  };

  let overall = 0;
  for (const [key, weight] of Object.entries(weights)) {
    overall += (scores[key] || 0) * weight;
  }

  // Apply profile adjustments with more nuanced scoring
  if (profile) {
    const { ageGroup, healthConditions, livingSituation } = profile;

    // Age group multipliers (more realistic)
    if (ageGroup === 'child') overall *= 1.25;
    else if (ageGroup === 'elderly') overall *= 1.35;
    else if (ageGroup === 'pregnant') overall *= 1.30;

    // Health conditions (boost specific hazards)
    if (healthConditions === 'asthma') {
      scores.airQuality = Math.min(Math.round(scores.airQuality * 1.6), 100);
    } else if (healthConditions === 'heart') {
      scores.heat = Math.min(Math.round(scores.heat * 1.5), 100);
      scores.storm = Math.min(Math.round(scores.storm * 1.3), 100);
    } else if (healthConditions === 'respiratory') {
      scores.airQuality = Math.min(Math.round(scores.airQuality * 1.7), 100);
    } else if (healthConditions === 'mobility') {
      scores.flood = Math.min(Math.round(scores.flood * 1.4), 100);
      scores.earthquake = Math.min(Math.round(scores.earthquake * 1.3), 100);
    }

    // Living situation impact
    if (livingSituation === 'coastal') {
      scores.flood = Math.min(Math.round(scores.flood * 1.4), 100);
      scores.storm = Math.min(Math.round(scores.storm * 1.2), 100);
    } else if (livingSituation === 'mountain') {
      scores.earthquake = Math.min(Math.round(scores.earthquake * 1.3), 100);
      scores.wildfire = Math.min(Math.round(scores.wildfire * 1.2), 100);
    } else if (livingSituation === 'urban') {
      scores.airQuality = Math.min(Math.round(scores.airQuality * 1.3), 100);
      scores.heat = Math.min(Math.round(scores.heat * 1.2), 100);
      scores.flood = Math.min(Math.round(scores.flood * 1.1), 100);
    } else if (livingSituation === 'rural') {
      scores.wildfire = Math.min(Math.round(scores.wildfire * 1.3), 100);
    }
  }

  // Recalculate overall with adjusted scores
  overall = 0;
  for (const [key, weight] of Object.entries(weights)) {
    overall += (scores[key] || 0) * weight;
  }

  return Math.min(Math.round(overall), 100);
}

function getRiskLevel(score) {
  if (score <= 20) return { level: 'MINIMAL', color: '#22C55E', label: 'Minimal Risk' };
  if (score <= 40) return { level: 'LOW', color: '#06B6D4', label: 'Low Risk' };
  if (score <= 60) return { level: 'MODERATE', color: '#F59E0B', label: 'Moderate Risk' };
  if (score <= 80) return { level: 'HIGH', color: '#F97316', label: 'High Risk' };
  return { level: 'CRITICAL', color: '#EF4444', label: 'Critical Risk' };
}

function getDominantHazard(scores) {
  let max = 0;
  let dominant = 'earthquake';
  for (const [key, val] of Object.entries(scores)) {
    if (val > max) { max = val; dominant = key; }
  }
  return dominant;
}

function isInRingOfFire(lat, lon) {
  return (lat >= -60 && lat <= 70) && (
    (lon >= 120 && lon <= 180) ||
    (lon >= -180 && lon <= -60)
  );
}

function isInHimalayanBelt(lat, lon) {
  return lat >= 20 && lat <= 40 && lon >= 60 && lon <= 100;
}

function isNearCoast(lat, lon) {
  const coastalRegions = [
    { latMin: 25, latMax: 50, lonMin: -130, lonMax: -115 },
    { latMin: 30, latMax: 45, lonMin: 130, lonMax: 145 },
    { latMin: -40, latMax: -10, lonMin: 140, lonMax: 155 },
    { latMin: 20, latMax: 45, lonMin: -10, lonMax: 40 },
    { latMin: 5, latMax: 25, lonMin: 88, lonMax: 110 },
  ];
  return coastalRegions.some(r => lat >= r.latMin && lat <= r.latMax && lon >= r.lonMin && lon <= r.lonMax);
}

module.exports = {
  calculateEarthquakeScore, calculateWildfireScore, calculateStormScore,
  calculateFloodScore, calculateHeatScore, calculateAirQualityScore,
  calculateOverallRisk, getRiskLevel, getDominantHazard,
  isInRingOfFire, isInHimalayanBelt, isNearCoast,
};
