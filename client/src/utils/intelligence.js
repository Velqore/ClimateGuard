export async function fetchOpenMeteoForecast(lat, lon) {
  if (lat == null || lon == null) return null;

  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', lat);
  url.searchParams.set('longitude', lon);
  url.searchParams.set('hourly', [
    'precipitation_probability',
    'precipitation',
    'apparent_temperature',
    'uv_index',
    'windspeed_10m',
    'winddirection_10m',
    'visibility',
    'temperature_2m',
    'relative_humidity_2m',
    'surface_pressure',
  ].join(','));
  url.searchParams.set('current', 'temperature_2m,apparent_temperature,uv_index,windspeed_10m,winddirection_10m,visibility,precipitation_probability,precipitation,relative_humidity_2m,surface_pressure');
  url.searchParams.set('daily', 'sunrise,sunset');
  url.searchParams.set('forecast_days', '3');
  url.searchParams.set('timezone', 'auto');

  try {
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Open-Meteo request failed with ${response.status}`);
    }
    const data = await response.json();
    return buildForecastInsights(data);
  } catch (error) {
    console.error('Open-Meteo forecast error:', error);
    return null;
  }
}

export function buildForecastInsights(data) {
  const hourly = data?.hourly || {};
  const daily = data?.daily || {};
  const times = hourly.time || [];
  const hours = times.map((time, index) => ({
    time,
    precipitationProbability: hourly.precipitation_probability?.[index] ?? 0,
    precipitation: hourly.precipitation?.[index] ?? 0,
    apparentTemperature: hourly.apparent_temperature?.[index] ?? null,
    uvIndex: hourly.uv_index?.[index] ?? null,
    windSpeed: hourly.windspeed_10m?.[index] ?? 0,
    windDirection: hourly.winddirection_10m?.[index] ?? 0,
    visibility: hourly.visibility?.[index] ?? null,
    temperature: hourly.temperature_2m?.[index] ?? null,
  }));

  const next24 = hours.slice(0, 24);
  const next72 = hours.slice(0, 72);

  const maxRainProb = Math.max(...next24.map(h => h.precipitationProbability), 0);
  const heaviestRain = next24.reduce((best, item) => {
    if (!best || item.precipitationProbability > best.precipitationProbability) return item;
    return best;
  }, null);
  const totalRain = next24.reduce((sum, item) => sum + (item.precipitation || 0), 0);

  const maxFeelsLike = next72.reduce((best, item) => {
    if (!best || (item.apparentTemperature ?? -Infinity) > (best.apparentTemperature ?? -Infinity)) return item;
    return best;
  }, null);
  const maxUv = next72.reduce((best, item) => {
    if (!best || (item.uvIndex ?? -Infinity) > (best.uvIndex ?? -Infinity)) return item;
    return best;
  }, null);
  const maxWind = next72.reduce((best, item) => {
    if (!best || (item.windSpeed ?? -Infinity) > (best.windSpeed ?? -Infinity)) return item;
    return best;
  }, null);
  const minVisibility = next24.reduce((best, item) => {
    if (!best || (item.visibility ?? Infinity) < (best.visibility ?? Infinity)) return item;
    return best;
  }, null);

  const rainLabel = getRainPredictionLabel(maxRainProb);
  const heatLabel = getHeatwaveLabel(next72);
  const stormLabel = getStormLabel(maxWind?.windSpeed ?? 0);
  const visibilityLabel = getVisibilityLabel(minVisibility?.visibility);
  const peakTemp = maxFeelsLike?.apparentTemperature ?? null;
  const peakUv = maxUv?.uvIndex ?? null;

  return {
    raw: data,
    hourly: hours,
    next24,
    next72,
    current: data?.current || null,
    daily: {
      sunrise: daily.sunrise?.[0] || null,
      sunset: daily.sunset?.[0] || null,
    },
    rain: {
      label: rainLabel.label,
      detail: rainLabel.detail,
      color: rainLabel.color,
      badge: rainLabel.badge,
      maxProbability: maxRainProb,
      heaviestRain,
      totalRain: Math.round(totalRain * 10) / 10,
    },
    heat: {
      label: heatLabel.label,
      detail: heatLabel.detail,
      color: heatLabel.color,
      badge: heatLabel.badge,
      peakTemp,
      peakAt: maxFeelsLike,
      peakUv,
      peakUvAt: maxUv,
      cause: heatLabel.cause,
    },
    storm: {
      label: stormLabel.label,
      detail: stormLabel.detail,
      color: stormLabel.color,
      badge: stormLabel.badge,
      peakWind: maxWind?.windSpeed ?? 0,
      peakAt: maxWind,
      direction: maxWind?.windDirection ?? 0,
    },
    visibility: {
      label: visibilityLabel.label,
      detail: visibilityLabel.detail,
      color: visibilityLabel.color,
      badge: visibilityLabel.badge,
      value: minVisibility?.visibility ?? null,
    },
  };
}

export function getRainPredictionLabel(maxProbability = 0) {
  if (maxProbability > 70) return { label: 'YES', detail: 'Rain Expected', color: 'blue', badge: '🌧️ YES — Rain Expected' };
  if (maxProbability >= 50) return { label: 'LIKELY', detail: 'Possible Rain', color: 'sky', badge: '🌦️ LIKELY — Possible Rain' };
  if (maxProbability >= 25) return { label: 'UNLIKELY', detail: 'Small Chance', color: 'slate', badge: '⛅ UNLIKELY — Small Chance' };
  return { label: 'NO', detail: 'Clear Skies', color: 'emerald', badge: '☀️ NO — Clear Skies' };
}

export function getHeatwaveLabel(next72 = []) {
  const temps = next72.map(h => h.apparentTemperature).filter(v => typeof v === 'number');
  const maxTemp = temps.length ? Math.max(...temps) : null;
  if (maxTemp == null) return { label: 'NONE', detail: 'No forecast data', color: 'slate', badge: '⚪ NO HEATWAVE — Data unavailable', cause: '' };
  if (maxTemp > 45) return { label: 'CRITICAL', detail: 'Dangerous', color: 'red', badge: '🔴 CRITICAL HEATWAVE — Dangerous', cause: 'Caused by: High pressure system + low humidity + clear skies allowing maximum solar radiation' };
  if (maxTemp >= 40) return { label: 'WARNING', detail: 'Severe Heat', color: 'orange', badge: '🟠 HEATWAVE WARNING — Severe Heat', cause: 'Caused by: High pressure system + low humidity + clear skies allowing maximum solar radiation' };
  if (maxTemp >= 35) return { label: 'WATCH', detail: 'Elevated Risk', color: 'amber', badge: '🟡 HEAT WATCH — Elevated Risk', cause: 'Caused by: High pressure system + low humidity + clear skies allowing maximum solar radiation' };
  return { label: 'NONE', detail: 'Normal Temperatures', color: 'emerald', badge: '🟢 NO HEATWAVE — Normal Temperatures', cause: '' };
}

export function getStormLabel(maxWind = 0) {
  if (maxWind > 90) return { label: 'SEVERE STORM RISK', detail: 'Extreme winds', color: 'red', badge: '⛈️ SEVERE STORM RISK' };
  if (maxWind >= 60) return { label: 'STORM POSSIBLE', detail: 'Damaging winds', color: 'orange', badge: '🌩️ STORM POSSIBLE' };
  if (maxWind >= 40) return { label: 'WINDY CONDITIONS', detail: 'Breezy and unsettled', color: 'amber', badge: '💨 WINDY CONDITIONS' };
  return { label: 'CALM CONDITIONS', detail: 'Low storm risk', color: 'emerald', badge: '✅ CALM CONDITIONS' };
}

export function getVisibilityLabel(valueKm) {
  if (valueKm == null) return { label: 'Data unavailable', detail: '', color: 'slate', badge: '— Data unavailable' };
  if (valueKm < 1) return { label: 'Very Poor', detail: 'Poor visibility warning', color: 'red', badge: 'Very Poor' };
  if (valueKm < 5) return { label: 'Poor', detail: '', color: 'orange', badge: 'Poor' };
  if (valueKm < 10) return { label: 'Moderate', detail: '', color: 'amber', badge: 'Moderate' };
  return { label: 'Good', detail: '', color: 'emerald', badge: 'Good' };
}

export function formatForecastTime(timeString) {
  if (!timeString) return '—';
  const date = new Date(timeString);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function formatForecastDay(timeString) {
  if (!timeString) return '—';
  const date = new Date(timeString);
  return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

export function getUvCategory(value = 0) {
  if (value >= 11) return 'Extreme';
  if (value >= 8) return 'Very High';
  if (value >= 6) return 'High';
  if (value >= 3) return 'Moderate';
  return 'Low';
}

export function getCompassDirection(degrees = 0) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(degrees / 45) % 8];
}

export function getVisibilityStatus(valueKm = 0) {
  if (valueKm == null) return 'Data unavailable';
  if (valueKm < 1) return 'Very Poor';
  if (valueKm < 5) return 'Poor';
  if (valueKm < 10) return 'Moderate';
  return 'Good';
}

export function normalizeLabel(value = '') {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export const countrySafetyData = {
  India: { emergency: '112', tapWaterSafe: 'Usually not recommended', vaccinations: 'Routine vaccines, hepatitis A, typhoid', apps: '112 India, Aarogya Setu' },
  USA: { emergency: '911', tapWaterSafe: 'Yes', vaccinations: 'Routine vaccines', apps: '911, FEMA' },
  Japan: { emergency: '119', tapWaterSafe: 'Yes', vaccinations: 'Routine vaccines', apps: 'Yurekuru Call, Safety Tips' },
  UK: { emergency: '999', tapWaterSafe: 'Yes', vaccinations: 'Routine vaccines', apps: '112/999, Met Office' },
  Philippines: { emergency: '911', tapWaterSafe: 'Usually boil recommended', vaccinations: 'Routine vaccines, hepatitis A, typhoid', apps: 'PH Emergency, Red Cross' },
  Australia: { emergency: '000', tapWaterSafe: 'Yes', vaccinations: 'Routine vaccines', apps: 'Emergency+, Fires Near Me' },
  Canada: { emergency: '911', tapWaterSafe: 'Yes', vaccinations: 'Routine vaccines', apps: 'Alert Ready, WeatherCAN' },
  Bangladesh: { emergency: '999', tapWaterSafe: 'Usually boil recommended', vaccinations: 'Routine vaccines, typhoid, hepatitis A', apps: '999, Bangladesh Red Crescent' },
  Indonesia: { emergency: '112', tapWaterSafe: 'Usually boil recommended', vaccinations: 'Routine vaccines, hepatitis A, typhoid', apps: '112, BMKG' },
  China: { emergency: '110', tapWaterSafe: 'Usually not recommended', vaccinations: 'Routine vaccines, hepatitis A', apps: 'National Emergency, Weather' },
  France: { emergency: '112', tapWaterSafe: 'Yes', vaccinations: 'Routine vaccines', apps: '112, Vigicrues' },
  Germany: { emergency: '112', tapWaterSafe: 'Yes', vaccinations: 'Routine vaccines', apps: 'NINA, WarnWetter' },
  Italy: { emergency: '112', tapWaterSafe: 'Yes', vaccinations: 'Routine vaccines', apps: '112, Protezione Civile' },
  Spain: { emergency: '112', tapWaterSafe: 'Yes', vaccinations: 'Routine vaccines', apps: '112, AEMET' },
  Mexico: { emergency: '911', tapWaterSafe: 'Usually not recommended', vaccinations: 'Routine vaccines, hepatitis A, typhoid', apps: '911, SIAT-CT' },
  Brazil: { emergency: '190', tapWaterSafe: 'Usually not recommended', vaccinations: 'Routine vaccines, hepatitis A, yellow fever in some regions', apps: '190, Defesa Civil' },
  Singapore: { emergency: '999', tapWaterSafe: 'Yes', vaccinations: 'Routine vaccines', apps: 'myENV, SCDF' },
  SouthAfrica: { emergency: '112', tapWaterSafe: 'Usually not recommended', vaccinations: 'Routine vaccines, hepatitis A, typhoid', apps: '112, SA Weather' },
  Turkey: { emergency: '112', tapWaterSafe: 'Usually boil recommended', vaccinations: 'Routine vaccines', apps: 'AFAD, 112' },
  Thailand: { emergency: '191', tapWaterSafe: 'Usually boil recommended', vaccinations: 'Routine vaccines, hepatitis A, typhoid', apps: '191, Thai Meteorological' },
  Vietnam: { emergency: '113', tapWaterSafe: 'Usually boil recommended', vaccinations: 'Routine vaccines, hepatitis A, typhoid', apps: '113, VNDMS' },
  SouthKorea: { emergency: '119', tapWaterSafe: 'Yes', vaccinations: 'Routine vaccines', apps: '119, Safety Korea' },
  UAE: { emergency: '999', tapWaterSafe: 'Yes', vaccinations: 'Routine vaccines', apps: 'UAE Weather, 999' },
  SaudiArabia: { emergency: '999', tapWaterSafe: 'Usually boil recommended', vaccinations: 'Routine vaccines', apps: '998/999, NCM' },
  Egypt: { emergency: '122', tapWaterSafe: 'Usually not recommended', vaccinations: 'Routine vaccines, hepatitis A, typhoid', apps: '122, Civil Protection' },
  Kenya: { emergency: '999', tapWaterSafe: 'Usually boil recommended', vaccinations: 'Routine vaccines, yellow fever for some travelers', apps: '999, Kenya Red Cross' },
  Nigeria: { emergency: '112', tapWaterSafe: 'Usually boil recommended', vaccinations: 'Routine vaccines, hepatitis A, typhoid, yellow fever', apps: '112, NEMA' },
  Argentina: { emergency: '911', tapWaterSafe: 'Yes in major cities', vaccinations: 'Routine vaccines', apps: '911, SMN' },
  Chile: { emergency: '131', tapWaterSafe: 'Yes', vaccinations: 'Routine vaccines', apps: 'Senapred, 131' },
  NewZealand: { emergency: '111', tapWaterSafe: 'Yes', vaccinations: 'Routine vaccines', apps: '112/111, MetService' },
};

export const historicalCityData = {
  Tokyo: { earthquakesPerDecade: 847, floodsPerDecade: 32, heatwaveDaysPerYear: 16, averageAQI: 42 },
  Manila: { earthquakesPerDecade: 214, floodsPerDecade: 78, heatwaveDaysPerYear: 28, averageAQI: 73 },
  Delhi: { earthquakesPerDecade: 96, floodsPerDecade: 21, heatwaveDaysPerYear: 48, averageAQI: 168 },
  Dhaka: { earthquakesPerDecade: 88, floodsPerDecade: 92, heatwaveDaysPerYear: 35, averageAQI: 159 },
  Karachi: { earthquakesPerDecade: 52, floodsPerDecade: 29, heatwaveDaysPerYear: 55, averageAQI: 154 },
  Mumbai: { earthquakesPerDecade: 41, floodsPerDecade: 66, heatwaveDaysPerYear: 24, averageAQI: 132 },
  Jakarta: { earthquakesPerDecade: 173, floodsPerDecade: 84, heatwaveDaysPerYear: 22, averageAQI: 91 },
  LosAngeles: { earthquakesPerDecade: 137, floodsPerDecade: 14, heatwaveDaysPerYear: 31, averageAQI: 58 },
  SanFrancisco: { earthquakesPerDecade: 129, floodsPerDecade: 18, heatwaveDaysPerYear: 12, averageAQI: 46 },
  NewYork: { earthquakesPerDecade: 23, floodsPerDecade: 24, heatwaveDaysPerYear: 21, averageAQI: 52 },
  London: { earthquakesPerDecade: 9, floodsPerDecade: 26, heatwaveDaysPerYear: 12, averageAQI: 41 },
  Paris: { earthquakesPerDecade: 12, floodsPerDecade: 19, heatwaveDaysPerYear: 18, averageAQI: 44 },
  Rome: { earthquakesPerDecade: 34, floodsPerDecade: 17, heatwaveDaysPerYear: 33, averageAQI: 49 },
  Madrid: { earthquakesPerDecade: 17, floodsPerDecade: 11, heatwaveDaysPerYear: 41, averageAQI: 47 },
  Berlin: { earthquakesPerDecade: 6, floodsPerDecade: 14, heatwaveDaysPerYear: 9, averageAQI: 36 },
  Istanbul: { earthquakesPerDecade: 212, floodsPerDecade: 28, heatwaveDaysPerYear: 29, averageAQI: 61 },
  Athens: { earthquakesPerDecade: 97, floodsPerDecade: 13, heatwaveDaysPerYear: 42, averageAQI: 56 },
  Cairo: { earthquakesPerDecade: 19, floodsPerDecade: 7, heatwaveDaysPerYear: 61, averageAQI: 88 },
  Lagos: { earthquakesPerDecade: 4, floodsPerDecade: 51, heatwaveDaysPerYear: 66, averageAQI: 145 },
  Nairobi: { earthquakesPerDecade: 21, floodsPerDecade: 29, heatwaveDaysPerYear: 18, averageAQI: 64 },
  Sydney: { earthquakesPerDecade: 18, floodsPerDecade: 22, heatwaveDaysPerYear: 27, averageAQI: 39 },
  Melbourne: { earthquakesPerDecade: 15, floodsPerDecade: 18, heatwaveDaysPerYear: 23, averageAQI: 35 },
  Toronto: { earthquakesPerDecade: 12, floodsPerDecade: 16, heatwaveDaysPerYear: 17, averageAQI: 41 },
  Vancouver: { earthquakesPerDecade: 48, floodsPerDecade: 19, heatwaveDaysPerYear: 14, averageAQI: 34 },
  MexicoCity: { earthquakesPerDecade: 71, floodsPerDecade: 20, heatwaveDaysPerYear: 26, averageAQI: 99 },
  SaoPaulo: { earthquakesPerDecade: 7, floodsPerDecade: 37, heatwaveDaysPerYear: 29, averageAQI: 68 },
  BuenosAires: { earthquakesPerDecade: 5, floodsPerDecade: 24, heatwaveDaysPerYear: 19, averageAQI: 55 },
  Seoul: { earthquakesPerDecade: 43, floodsPerDecade: 16, heatwaveDaysPerYear: 27, averageAQI: 53 },
  Bangkok: { earthquakesPerDecade: 11, floodsPerDecade: 63, heatwaveDaysPerYear: 53, averageAQI: 84 },
  Singapore: { earthquakesPerDecade: 3, floodsPerDecade: 18, heatwaveDaysPerYear: 365, averageAQI: 43 },
  Hanoi: { earthquakesPerDecade: 18, floodsPerDecade: 47, heatwaveDaysPerYear: 34, averageAQI: 96 },
};

export function getHistoricalStats(cityName = '') {
  const key = normalizeLabel(cityName).replace(/\s+/g, '');
  const direct = historicalCityData[cityName?.replace(/\s+/g, '')] || historicalCityData[cityName] || null;
  if (direct) return direct;

  const match = Object.entries(historicalCityData).find(([name]) => normalizeLabel(name).replace(/\s+/g, '') === key);
  return match ? match[1] : null;
}

export function getCountrySafety(countryName = '') {
  if (!countryName) return null;
  const normalized = normalizeLabel(countryName);
  const entry = Object.entries(countrySafetyData).find(([key]) => normalizeLabel(key) === normalized);
  return entry ? entry[1] : { emergency: '112', tapWaterSafe: 'Check locally', vaccinations: 'Routine vaccines', apps: 'Local emergency services' };
}
