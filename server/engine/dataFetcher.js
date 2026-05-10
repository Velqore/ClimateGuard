/**
 * Data Fetcher Module
 * 
 * Responsible for aggregating data from multiple climate APIs:
 * - OpenWeatherMap (weather, forecasts, alerts)
 * - NASA FIRMS (active wildfires)
 * - USGS (earthquake data)
 * - Open-Meteo (free fallback weather)
 * - IQAir / OpenAQ (air quality)
 * - Nominatim (geocoding)
 * 
 * Features:
 * - Built-in caching (900s default) to reduce API calls
 * - Graceful fallback: e.g., Open-Meteo if OpenWeather unavailable
 * - Promise.allSettled for resilience: one API failure doesn't crash the query
 */
const axios = require('axios');
const cache = require('./cache');

const OPENWEATHER_KEY = process.env.OPENWEATHER_API_KEY || process.env.VITE_OPENWEATHER_API_KEY || '';
const FIRMS_KEY = process.env.NASA_FIRMS_API_KEY || process.env.VITE_NASA_FIRMS_API_KEY || '';
const FLICKR_KEY = process.env.FLICKR_API_KEY || '';
const IQAIR_KEY = process.env.IQAIR_API_KEY || process.env.VITE_IQAIR_API_KEY || '';

/**
 * Geocode a location name to latitude and longitude.
 * Uses Nominatim (OpenStreetMap) for free, reliable geocoding.
 * Results are cached for 1 hour to reduce external API calls.
 */
async function geocode(location) {
  const cached = cache.get(`geo:${location.toLowerCase()}`);
  if (cached) return cached;

  try {
    const { data } = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: { q: location, format: 'json', limit: 1 },
      headers: { 'User-Agent': 'ClimateGuardAI/1.0' },
      timeout: 8000,
    });
    if (data && data.length > 0) {
      const result = { name: data[0].display_name, lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
      cache.set(`geo:${location.toLowerCase()}`, result, 3600000);
      return result;
    }
  } catch (e) {
    console.error('Geocode error:', e.message);
  }
  return null;
}

/**
 * Fetch current weather and forecast for a location.
 * 
 * Primary: OpenWeatherMap (if key provided)
 * Fallback: Open-Meteo (free, no key required)
 * 
 * Returns: { current: {...}, forecast: [...], alerts: [...] }
 * Caches result for 15 minutes (900s).
 */
async function getWeather(lat, lon) {
  const key = `weather:${lat},${lon}`;
  const cached = cache.get(key);
  if (cached) return cached;

  // If no OpenWeather key, skip directly to free alternative
  if (!OPENWEATHER_KEY) return getOpenMeteoWeather(lat, lon);

  try {
    // Use Promise.allSettled so one failing endpoint doesn't crash the whole request.
    // Common: OpenWeather succeeds, we cache and return; if it fails, fallback to Open-Meteo.
    const [currentRes, forecastRes] = await Promise.allSettled([
      axios.get(`https://api.openweathermap.org/data/2.5/weather`, {
        params: { lat, lon, appid: OPENWEATHER_KEY, units: 'metric' },
        timeout: 8000,
      }),
      axios.get(`https://api.openweathermap.org/data/2.5/forecast`, {
        params: { lat, lon, appid: OPENWEATHER_KEY, units: 'metric' },
        timeout: 8000,
      }),
    ]);

    const current = currentRes.status === 'fulfilled' ? currentRes.value.data : null;
    const forecast = forecastRes.status === 'fulfilled' ? forecastRes.value.data : null;

    if (current) {
      const result = {
        current: {
          temp: current.main.temp,
          humidity: current.main.humidity,
          pressure: current.main.pressure,
          windSpeed: current.wind.speed,
          windDeg: current.wind.deg || 0,
          description: current.weather?.[0]?.description || '',
          icon: current.weather?.[0]?.icon || '',
          clouds: current.clouds?.all || 0,
          rain1h: current.rain?.['1h'] || 0,
          alerts: current.alerts || [],
        },
        forecast: forecast ? forecast.list.map(f => ({
          dt: f.dt,
          temp: f.main.temp,
          humidity: f.main.humidity,
          pressure: f.main.pressure,
          windSpeed: f.wind.speed,
          description: f.weather?.[0]?.description || '',
          pop: f.pop || 0,
          rain3h: f.rain?.['3h'] || 0,
        })) : [],
        alerts: forecast?.alerts || [],
      };
      cache.set(key, result, 900000);
      return result;
    }
  } catch (e) {
    console.error('OpenWeather error:', e.message);
  }

    // Gracefully fall back to Open-Meteo if OpenWeather is unavailable or has no result
  return getOpenMeteoWeather(lat, lon);
}

/**
 * Free weather fallback using Open-Meteo API (no key required).
 * Provides current weather and 3-day forecast.
 */
async function getOpenMeteoWeather(lat, lon) {
  const key = `meteo:${lat},${lon}`;
  const cached = cache.get(key);
  if (cached) return cached;

  try {
    const { data } = await axios.get('https://api.open-meteo.com/v1/forecast', {
      params: {
        latitude: lat,
        longitude: lon,
        current: 'temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,wind_direction_10m,cloud_cover,precipitation,weather_code',
        hourly: 'temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,precipitation,weather_code',
        forecast_days: 3,
        timezone: 'auto',
      },
      timeout: 8000,
    });

    const c = data.current;
    const result = {
      current: {
        temp: c.temperature_2m,
        humidity: c.relative_humidity_2m,
        pressure: c.surface_pressure / 100,
        windSpeed: c.wind_speed_10m,
        windDeg: c.wind_direction_10m || 0,
        description: weatherCodeToText(c.weather_code),
        icon: '',
        clouds: c.cloud_cover || 0,
        rain1h: c.precipitation || 0,
        alerts: [],
      },
      forecast: data.hourly.time.map((t, i) => ({
        dt: new Date(t).getTime() / 1000,
        temp: data.hourly.temperature_2m[i],
        humidity: data.hourly.relative_humidity_2m[i],
        pressure: data.hourly.surface_pressure[i] / 100,
        windSpeed: data.hourly.wind_speed_10m[i],
        description: weatherCodeToText(data.hourly.weather_code[i]),
        pop: 0,
        rain3h: (data.hourly.precipitation[i] || 0) * 3,
      })),
      alerts: [],
    };
    cache.set(key, result, 900000);
    return result;
  } catch (e) {
    console.error('Open-Meteo error:', e.message);
  }
  return null;
}

function weatherCodeToText(code) {
  const map = {
    0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Fog', 48: 'Depositing rime fog',
    51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
    61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
    71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow',
    80: 'Slight rain showers', 81: 'Moderate rain showers', 82: 'Violent rain showers',
    95: 'Thunderstorm', 96: 'Thunderstorm with hail', 99: 'Thunderstorm with heavy hail',
  };
  return map[code] || 'Unknown';
}

async function getEarthquakes(lat, lon, radius = 500) {
  const key = `quakes:${lat},${lon}`;
  const cached = cache.get(key);
  if (cached) return cached;

  try {
    const { data } = await axios.get(
      `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson`,
      { timeout: 8000 }
    );

    const nearby = (data.features || []).filter(f => {
      const [qlon, qlat] = f.geometry.coordinates;
      const dist = haversine(lat, lon, qlat, qlon);
      return dist <= radius;
    }).map(f => ({
      id: f.id,
      magnitude: f.properties.mag,
      place: f.properties.place,
      time: f.properties.time,
      depth: f.geometry.coordinates[2],
      lat: f.geometry.coordinates[1],
      lon: f.geometry.coordinates[0],
      distance: Math.round(haversine(lat, lon, f.geometry.coordinates[1], f.geometry.coordinates[0])),
      url: f.properties.url,
    })).sort((a, b) => b.magnitude - a.magnitude);

    cache.set(key, nearby, 600000);
    return nearby;
  } catch (e) {
    console.error('USGS error:', e.message);
  }
  return [];
}

async function getGlobalEarthquakes() {
  const key = 'quakes:global';
  const cached = cache.get(key);
  if (cached) return cached;

  try {
    const { data } = await axios.get(
      `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson`,
      { timeout: 8000 }
    );
    const quakes = (data.features || []).map(f => ({
      id: f.id,
      magnitude: f.properties.mag,
      place: f.properties.place,
      time: f.properties.time,
      depth: f.geometry.coordinates[2],
      lat: f.geometry.coordinates[1],
      lon: f.geometry.coordinates[0],
      url: f.properties.url,
    }));
    cache.set(key, quakes, 600000);
    return quakes;
  } catch (e) {
    console.error('USGS global error:', e.message);
  }
  return [];
}

async function getWildfires(lat, lon, radius = 500) {
  const key = `fires:${lat},${lon}`;
  const cached = cache.get(key);
  if (cached) return cached;

  if (!FIRMS_KEY) return [];

  try {
    const { data } = await axios.get(
      `https://firms.modaps.eosdis.nasa.gov/api/country/csv/${FIRMS_KEY}/VIIRS_SNPP_NRT/all/1`,
      { timeout: 10000 }
    );

    const lines = data.split('\n').slice(1).filter(l => l.trim());
    const fires = [];
    for (const line of lines) {
      const parts = line.split(',');
      if (parts.length < 5) continue;
      const flat = parseFloat(parts[1]);
      const flon = parseFloat(parts[2]);
      if (isNaN(flat) || isNaN(flon)) continue;
      const dist = haversine(lat, lon, flat, flon);
      if (dist <= radius) {
        fires.push({
          lat: flat,
          lon: flon,
          confidence: parts[8] || 'nominal',
          brightness: parseFloat(parts[3]) || 0,
          distance: Math.round(dist),
          date: parts[0] || '',
        });
      }
    }
    cache.set(key, fires, 900000);
    return fires;
  } catch (e) {
    console.error('FIRMS error:', e.message);
  }
  return [];
}

async function getEONETEvents() {
  const key = 'eonet:events';
  const cached = cache.get(key);
  if (cached) return cached;

  try {
    const { data } = await axios.get('https://eonet.gsfc.nasa.gov/api/v3/events', {
      params: { status: 'open', limit: 50 },
      timeout: 10000,
    });
    const events = (data.events || []).map(e => ({
      id: e.id,
      title: e.title,
      category: e.categories?.[0]?.title || 'Unknown',
      date: e.geometry?.[0]?.date || '',
      lat: e.geometry?.[0]?.coordinates?.[1] || 0,
      lon: e.geometry?.[0]?.coordinates?.[0] || 0,
      type: e.categories?.[0]?.title?.toLowerCase() || 'unknown',
    }));
    cache.set(key, events, 600000);
    return events;
  } catch (e) {
    console.error('EONET error:', e.message);
  }
  return [];
}

async function getAirQuality(lat, lon) {
  const key = `aq:${lat},${lon}`;
  const cached = cache.get(key);
  if (cached) return cached;
  // Prefer IQAir (AirVisual) if API key provided, for more accurate AQI
  if (IQAIR_KEY) {
    try {
      const url = 'http://api.airvisual.com/v2/nearest_city';
      const { data } = await axios.get(url, { params: { lat, lon, key: IQAIR_KEY }, timeout: 8000 });
      if (data && data.status === 'success' && data.data) {
        const p = data.data.current?.pollution || {};
        const s = data.data.current || {};
        const result = [{
          source: 'iqair',
          city: data.data.city || '',
          state: data.data.state || '',
          country: data.data.country || '',
          lat: data.data.location?.coordinates?.[1] || lat,
          lon: data.data.location?.coordinates?.[0] || lon,
          aqi_us: p.aqius || null,
          aqi_cn: p.aqicn || null,
          main_pollutant: p.mainus || p.maincn || null,
          ts: p.ts || null,
          raw: p,
          details: s,
        }];
        cache.set(key, result, 900000);
        return result;
      }
    } catch (err) {
      console.error('IQAir error:', err.message);
      // fallthrough to OpenAQ
    }
  }

  try {
    const { data } = await axios.get('https://api.openaq.org/v2/latest', {
      params: { lat, lon, radius: 50000, limit: 5, order_by: 'distance' },
      timeout: 8000,
    });

    const results = (data.results || []).map(r => {
      const pm25 = r.measurements?.find(m => m.parameter === 'pm25');
      const pm10 = r.measurements?.find(m => m.parameter === 'pm10');
      const no2 = r.measurements?.find(m => m.parameter === 'no2');
      return {
        source: 'openaq',
        location: r.location,
        city: r.city,
        lat: r.coordinates?.latitude,
        lon: r.coordinates?.longitude,
        pm25: pm25?.value || null,
        pm10: pm10?.value || null,
        no2: no2?.value || null,
        aqi: pm25?.value || pm10?.value || 0,
        lastUpdated: pm25?.lastUpdated || r.date?.utc || '',
      };
    });

    cache.set(key, results, 900000);
    return results;
  } catch (e) {
    console.error('OpenAQ error:', e.message);
  }
  return [];
}

async function getNearbyResources(lat, lon, radius = 10000) {
  const key = `resources:${lat},${lon}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const query = `
    [out:json][timeout:10];
    (
      node["amenity"="hospital"](around:${radius / 1000},${lat},${lon});
      node["amenity"="shelter"](around:${radius / 1000},${lat},${lon});
      node["amenity"="fire_station"](around:${radius / 1000},${lat},${lon});
      node["amenity"="police"](around:${radius / 1000},${lat},${lon});
      node["amenity"="fuel"](around:${radius / 1000},${lat},${lon});
    );
    out body;
  `;

  try {
    const { data } = await axios.post('https://overpass-api.de/api/interpreter', `data=${encodeURIComponent(query)}`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 15000,
    });

    const resources = (data.elements || []).map(e => ({
      id: e.id,
      name: e.tags?.name || 'Unnamed',
      type: e.tags?.amenity || 'unknown',
      lat: e.lat,
      lon: e.lon,
      distance: Math.round(haversine(lat, lon, e.lat, e.lon)),
    })).sort((a, b) => a.distance - b.distance);

    cache.set(key, resources, 1800000);
    return resources;
  } catch (e) {
    console.error('Overpass error:', e.message);
  }
  return [];
}

async function getDisasterPhotos(location, disaster) {
  if (!FLICKR_KEY) return [];

  const key = `photos:${location}:${disaster}`;
  const cached = cache.get(key);
  if (cached) return cached;

  try {
    const { data } = await axios.get('https://api.flickr.com/services/rest/', {
      params: {
        method: 'flickr.photos.search',
        api_key: FLICKR_KEY,
        text: `${disaster} ${location}`,
        sort: 'date-taken',
        per_page: 9,
        format: 'json',
        nojsoncallback: 1,
        extras: 'url_m,url_l,date_taken,owner_name',
      },
      timeout: 8000,
    });

    const photos = (data.photos?.photo || []).map(p => ({
      id: p.id,
      title: p.title,
      url: p.url_m || `https://farm${p.farm}.staticflickr.com/${p.server}/${p.id}_${p.secret}_m.jpg`,
      urlLarge: p.url_l || '',
      dateTaken: p.datetaken,
      owner: p.ownername,
    }));

    cache.set(key, photos, 1800000);
    return photos;
  } catch (e) {
    console.error('Flickr error:', e.message);
  }
  return [];
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

module.exports = {
  geocode, getWeather, getEarthquakes, getGlobalEarthquakes,
  getWildfires, getEONETEvents, getAirQuality, getNearbyResources,
  getDisasterPhotos, haversine,
};
