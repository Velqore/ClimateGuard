const HEATWAVE_THRESHOLDS = {
  tropical: { temp: 40, humidity: 70, days: 2 },
  temperate: { temp: 35, humidity: 50, days: 3 },
  arid: { temp: 45, humidity: 20, days: 2 },
  polar: { temp: 25, humidity: 40, days: 2 }
};

function getRegionType(lat, lon) {
  if (lat > 66.5 || lat < -66.5) return 'polar';
  if (lat > 23.5 && lat < 35 && lon > -20 && lon < 140) return 'arid';
  if (lat > -23.5 && lat < 23.5) return 'tropical';
  return 'temperate';
}

function calculateHeatIndex(tempC, humidity) {
  const T = (tempC * 9 / 5) + 32;
  const R = humidity;
  const HI = -42.379 + 2.04901523 * T + 10.14333127 * R
    - 0.22475541 * T * R - 0.00683783 * T * T
    - 0.05481717 * R * R + 0.00122874 * T * T * R
    + 0.00085282 * T * R * R - 0.00000199 * T * T * R * R;
  return Math.round(((HI - 32) * 5 / 9) * 10) / 10;
}

function calculateWetBulb(tempC, humidity) {
  return Math.round((tempC * Math.atan(0.151977 * Math.sqrt(humidity + 8.313659))
    + Math.atan(tempC + humidity)
    - Math.atan(humidity - 1.676331)
    + 0.00391838 * Math.pow(humidity, 1.5) * Math.atan(0.023101 * humidity)
    - 4.686035) * 10) / 10;
}

function generateHeatwaveCause(weatherData, region) {
  const pressure = weatherData.main?.pressure || 1013;
  const windSpeed = weatherData.wind?.speed || 5;
  const causes = [];
  
  if (pressure > 1020) causes.push("High-pressure dome trapping hot air");
  if (windSpeed < 3) causes.push("Stagnant air preventing heat dissipation");
  if (region === 'tropical') causes.push("High solar radiation from tropical location");
  if (region === 'arid') causes.push("Arid conditions with minimal moisture");
  
  return causes.join(". ") || "Combination of atmospheric conditions creating heat risk";
}

function getHealthRisks(severity) {
  const risks = {
    EXTREME: [
      "Heat stroke — life threatening (body temp > 40°C)",
      "Organ failure from prolonged heat exposure",
      "Cardiovascular collapse in vulnerable individuals",
      "Dehydration leading to kidney failure"
    ],
    SEVERE: [
      "Heat exhaustion — dizziness, nausea, heavy sweating",
      "Heat cramps from electrolyte loss",
      "Worsening of existing heart/respiratory conditions",
      "Severe dehydration risk"
    ],
    HIGH: [
      "Heat exhaustion risk with prolonged outdoor exposure",
      "Increased risk for elderly, children, outdoor workers",
      "Dehydration if fluid intake is inadequate"
    ],
    MODERATE: [
      "Discomfort and fatigue during outdoor activity",
      "Mild dehydration risk",
      "Sensitive individuals should limit sun exposure"
    ],
    LOW: ["Minimal health risk for healthy adults"]
  };
  return risks[severity] || risks.LOW;
}

function getHeatwaveRecommendations(severity, wetBulb) {
  const base = [
    "Stay indoors during peak heat hours (11am - 4pm)",
    "Drink water every 20 minutes even without thirst",
    "Wear loose, light-colored, breathable clothing",
    "Check on elderly neighbors and relatives"
  ];
  
  if (wetBulb >= 32) base.unshift("⚠️ CRITICAL: Limit ALL outdoor activity — wet bulb dangerous");
  if (severity === 'EXTREME') base.unshift("🚨 EXTREME HEAT EMERGENCY: Seek air-conditioned shelter immediately");
  
  return base;
}

async function detectHeatwave(weatherData, forecastData, lat, lon) {
  try {
    const region = getRegionType(lat, lon);
    const threshold = HEATWAVE_THRESHOLDS[region];
    
    if (!forecastData?.hourly) {
      return {
        isHeatwave: false,
        severity: 'LOW',
        currentTemp: weatherData.main?.temp || 0,
        feelsLike: weatherData.main?.feels_like || 0,
        heatIndex: 0,
        wetBulbTemp: 0,
        wetBulbStatus: 'SAFE',
        maxForecastTemp: weatherData.main?.temp || 0,
        peakHeatTime: new Date().toISOString(),
        humidity: weatherData.main?.humidity || 50,
        consecutiveHotHours: 0,
        region,
        urbanHeatBonus: 0,
        heatwaveScore: 0,
        hourlyForecast: [],
        cause: "Insufficient data",
        healthRisks: ['Minimal risk'],
        recommendations: ['Monitor weather conditions'],
        dominantPollutant: 'N/A',
        lastUpdated: new Date().toISOString()
      };
    }
    
    const hourlyTemps = forecastData.hourly.apparent_temperature || [];
    const hourlyHumidity = forecastData.hourly.relativehumidity_2m || [];
    const hourlyTime = forecastData.hourly.time || [];
    
    let consecutiveHotHours = 0;
    let maxTemp = weatherData.main?.temp || 0;
    let peakTime = new Date().toISOString();
    
    hourlyTemps.forEach((temp, i) => {
      if (temp >= threshold.temp) {
        consecutiveHotHours++;
        if (temp > maxTemp) {
          maxTemp = temp;
          peakTime = hourlyTime[i] || new Date().toISOString();
        }
      }
    });
    
    const heatIndex = calculateHeatIndex(weatherData.main?.temp || 0, weatherData.main?.humidity || 50);
    const wetBulb = calculateWetBulb(weatherData.main?.temp || 0, weatherData.main?.humidity || 50);
    
    const wetBulbStatus = wetBulb >= 35 ? 'UNSURVIVABLE - Immediate danger to life' :
                          wetBulb >= 32 ? 'CRITICAL - Extreme heat stress' :
                          wetBulb >= 28 ? 'DANGEROUS - High heat stress' :
                          wetBulb >= 24 ? 'CAUTION - Moderate heat stress' : 'SAFE - Manageable conditions';
    
    const isHeatwave = consecutiveHotHours >= (threshold.days * 12);
    
    const severity = maxTemp >= 50 ? 'EXTREME' :
                     maxTemp >= 45 ? 'SEVERE' :
                     maxTemp >= 40 ? 'HIGH' :
                     maxTemp >= 35 ? 'MODERATE' : 'LOW';
    
    const heatwaveScore = Math.min(
      Math.round((maxTemp / threshold.temp) * 70 + (consecutiveHotHours / (threshold.days * 12)) * 30),
      100
    );
    
    return {
      isHeatwave,
      severity,
      currentTemp: weatherData.main?.temp || 0,
      feelsLike: weatherData.main?.feels_like || 0,
      heatIndex,
      wetBulbTemp: wetBulb,
      wetBulbStatus,
      maxForecastTemp: maxTemp,
      peakHeatTime: peakTime,
      humidity: weatherData.main?.humidity || 50,
      consecutiveHotHours,
      region,
      urbanHeatBonus: 0,
      heatwaveScore,
      hourlyForecast: hourlyTemps.map((t, i) => ({
        time: hourlyTime[i] || new Date().toISOString(),
        temp: t,
        humidity: hourlyHumidity[i] || 50,
        dangerous: t >= threshold.temp
      })),
      cause: generateHeatwaveCause(weatherData, region),
      healthRisks: getHealthRisks(severity),
      recommendations: getHeatwaveRecommendations(severity, wetBulb),
      dominantPollutant: 'N/A',
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error('Heatwave detection error:', error);
    return null;
  }
}

module.exports = { detectHeatwave };
