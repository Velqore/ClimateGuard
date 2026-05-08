const { isInRingOfFire, isInHimalayanBelt, isNearCoast } = require('./riskEngine');

function analyzeCause(hazardType, weatherData, locationData, earthquakes, fires, aqData) {
  switch (hazardType) {
    case 'earthquake': return analyzeEarthquakeCause(earthquakes, locationData);
    case 'wildfire': return analyzeWildfireCause(fires, weatherData, locationData);
    case 'storm': return analyzeStormCause(weatherData, locationData);
    case 'flood': return analyzeFloodCause(weatherData, locationData);
    case 'heat': return analyzeHeatCause(weatherData, locationData);
    case 'airQuality': return analyzeAirQualityCause(aqData, weatherData, fires, locationData);
    default: return defaultCause();
  }
}

function analyzeEarthquakeCause(earthquakes, locationData) {
  const lat = locationData?.lat || 0;
  const lon = locationData?.lon || 0;
  const primary = getTectonicContext(lat, lon);
  const contributing = [];
  const recent = earthquakes?.slice(0, 5) || [];

  if (recent.length > 0) {
    const maxMag = Math.max(...recent.map(q => q.magnitude));
    contributing.push(`${recent.length} seismic events detected within 500km in past 24 hours`);
    if (maxMag >= 5) contributing.push(`Largest event: M${maxMag.toFixed(1)} at ${recent[0].distance}km away`);
  }

  if (isInRingOfFire(lat, lon)) contributing.push('Pacific Ring of Fire — 90% of world earthquakes occur here');
  if (isInHimalayanBelt(lat, lon)) contributing.push('Indian-Eurasian plate collision zone — ongoing compression');

  return {
    primaryCause: primary,
    contributingFactors: contributing,
    scientificContext: 'Earthquakes occur when accumulated tectonic stress exceeds rock strength along fault lines.',
    historicalContext: 'This region has experienced significant seismic activity historically, consistent with its tectonic setting.',
    humanImpact: earthquakes?.length > 0 ? `Approximately ${estimateAffected(earthquakes)} people in affected zone` : 'Population center nearby may be affected',
    trend: recent.length > 3 ? 'WORSENING' : 'STABLE',
    trendReason: recent.length > 3 ? 'Increased seismic frequency in past 24 hours' : 'Seismic activity within normal range',
  };
}

function analyzeWildfireCause(fires, weatherData, locationData) {
  const contributing = [];
  let primary = 'Wildfire risk conditions detected in this area';

  if (weatherData) {
    const { humidity, temp, windSpeed } = weatherData;
    if (humidity < 15 && temp > 35 && windSpeed > 40) {
      primary = `Extreme fire weather: critically low humidity (${humidity}%), high temperature (${temp}°C), and strong winds (${windSpeed}km/h) creating perfect conditions for rapid fire spread`;
    } else if (humidity < 25 && temp > 30) {
      primary = `Low humidity (${humidity}%) and high temperatures (${temp}°C) drying vegetation and increasing fire susceptibility`;
    } else if (humidity < 35) {
      contributing.push(`Below-average humidity (${humidity}%) reducing moisture in vegetation`);
    }
    if (windSpeed > 40) contributing.push(`Strong winds (${windSpeed}km/h) could spread any ignition rapidly`);
  }

  if (fires && fires.length > 0) {
    const closest = Math.min(...fires.map(f => f.distance));
    primary = `Active fire detected ${closest}km away — wind direction may spread toward this location`;
    contributing.push(`${fires.length} active fire detections within 500km from satellite data`);
  }

  const month = new Date().getMonth();
  const lat = locationData?.lat || 0;
  const isSummer = (lat > 0 && month >= 5 && month <= 8) || (lat < 0 && month >= 11 && month <= 2);
  if (isSummer) contributing.push('Peak wildfire season for this region (historically highest risk: Jun-Sep)');

  return {
    primaryCause: primary,
    contributingFactors: contributing,
    scientificContext: 'Wildfires require three elements: fuel (dry vegetation), heat (ignition source), and oxygen (wind).',
    historicalContext: 'Wildfire frequency has increased globally by 25% over the past two decades due to climate change.',
    humanImpact: fires?.length > 0 ? `${fires.length} active fires threatening populated areas` : 'Potential threat to nearby communities if fire develops',
    trend: fires?.length > 3 ? 'WORSENING' : 'STABLE',
    trendReason: fires?.length > 3 ? 'Multiple active fires in region indicate escalating fire weather' : 'Fire conditions within seasonal norms',
  };
}

function analyzeStormCause(weatherData, locationData) {
  const contributing = [];
  let primary = 'Storm conditions detected in this area';

  if (weatherData) {
    const { pressure, windSpeed, temp } = weatherData;
    if (pressure < 990) {
      primary = `Deep low-pressure system (${pressure}hPa) drawing in surrounding air masses and intensifying circulation`;
      contributing.push('Atmospheric pressure significantly below normal indicates strong cyclonic activity');
    }
    if (windSpeed > 50) contributing.push(`High wind speeds (${windSpeed}km/h) indicating active storm system`);

    const lat = locationData?.lat || 0;
    if (Math.abs(lat) < 30 && temp > 26) {
      contributing.push(`Warm ocean surface temperatures providing energy to fuel tropical storm development`);
    }
  }

  const month = new Date().getMonth();
  if (month >= 5 && month <= 10) contributing.push('Active tropical cyclone season in Northern Hemisphere');

  return {
    primaryCause: primary,
    contributingFactors: contributing,
    scientificContext: 'Storms form when warm moist air rises and condenses, releasing latent heat that drives further convection.',
    historicalContext: 'Storm intensity has increased by 15% globally as ocean temperatures rise.',
    humanImpact: 'Coastal and low-lying populations most at risk from storm surge and flooding',
    trend: 'STABLE',
    trendReason: 'Current storm activity consistent with seasonal patterns',
  };
}

function analyzeFloodCause(weatherData, locationData) {
  const contributing = [];
  let primary = 'Flood risk conditions detected in this area';

  if (weatherData) {
    const { humidity, rain1h, windSpeed } = weatherData;
    if (rain1h > 10) {
      primary = `Extreme rainfall (${rain1h}mm in 1 hour) exceeding soil absorption capacity, causing surface runoff and flooding`;
    } else if (humidity > 90) {
      primary = 'Saturated atmosphere with very high humidity indicating imminent heavy precipitation';
      contributing.push(`Humidity at ${humidity}% — near maximum capacity`);
    }
  }

  if (isNearCoast(locationData?.lat || 0, locationData?.lon || 0)) {
    contributing.push('Coastal location increases risk of storm surge flooding');
  }

  const month = new Date().getMonth();
  if (month >= 5 && month <= 9) contributing.push('Monsoon season — seasonal moisture-laden winds bringing heavy rainfall');

  return {
    primaryCause: primary,
    contributingFactors: contributing,
    scientificContext: 'Flooding occurs when water input exceeds the drainage capacity of the land and river systems.',
    historicalContext: 'Flood frequency has increased 30% in the past decade due to changing precipitation patterns.',
    humanImpact: 'Low-lying areas and river basins most vulnerable — potential for significant displacement',
    trend: 'WORSENING',
    trendReason: 'Increasing extreme precipitation events linked to climate change',
  };
}

function analyzeHeatCause(weatherData, locationData) {
  const contributing = [];
  let primary = 'Elevated heat risk conditions detected';

  if (weatherData) {
    const { temp, pressure, windSpeed, humidity } = weatherData;
    if (pressure > 1020) {
      primary = `A persistent high-pressure dome (${pressure}hPa) is trapping hot air over the region, blocking cooler air masses`;
      contributing.push('High-pressure system preventing cloud formation and precipitation');
    }
    if (windSpeed < 10) contributing.push('Near-stagnant air with minimal wind preventing heat dissipation');
    if (humidity > 60 && temp > 30) contributing.push(`High humidity (${humidity}%) making ${temp}°C feel significantly hotter (heat index)`);

    if (temp > 40) primary = `Extreme temperature of ${temp}°C poses severe health risk — heatstroke likely within 30 minutes of exposure`;
    else if (temp > 35) primary = `Dangerously high temperature of ${temp}°C — significant heat stress risk for vulnerable populations`;
  }

  const pop = locationData?.population || 0;
  if (pop > 1000000) contributing.push('Urban heat island effect — concrete and asphalt absorbing and radiating additional heat');

  return {
    primaryCause: primary,
    contributingFactors: contributing,
    scientificContext: 'Heatwaves occur when high-pressure systems trap warm air, amplified by urban surfaces and climate trends.',
    historicalContext: 'Average temperatures have risen 1.1°C globally since pre-industrial times, increasing heatwave frequency.',
    humanImpact: 'Elderly, children, and outdoor workers most at risk — potential for heat-related hospitalizations',
    trend: 'WORSENING',
    trendReason: 'Global warming trend increasing baseline temperatures and heatwave duration',
  };
}

function analyzeAirQualityCause(aqData, weatherData, fires, locationData) {
  const contributing = [];
  let primary = 'Air quality degradation detected in this area';

  if (fires && fires.length > 0) {
    const closest = Math.min(...fires.map(f => f.distance));
    primary = `Smoke from ${fires.length} active wildfires within ${closest}km carrying fine particulate matter (PM2.5) into the atmosphere`;
    contributing.push('Wildfire smoke contains PM2.5, CO, and VOCs — harmful at any concentration');
  }

  if (weatherData) {
    const { windSpeed, pressure } = weatherData;
    if (windSpeed < 10 && pressure > 1015) {
      if (fires?.length > 0) {
        contributing.push('Temperature inversion trapping pollutants near ground level');
      } else {
        primary = 'Temperature inversion trapping pollutants near ground level — warm air above acting as a lid on cooler polluted air below';
      }
      contributing.push('Low wind speeds preventing pollutant dispersion');
    }
  }

  const pop = locationData?.population || 0;
  if (pop > 500000) contributing.push('High vehicle density generating elevated NOx and particulate emissions');

  const month = new Date().getMonth();
  if (month >= 10 || month <= 2) contributing.push('Winter heating season increasing emissions from residential and commercial heating');

  return {
    primaryCause: primary,
    contributingFactors: contributing,
    scientificContext: 'Air quality degrades when pollutant emissions exceed atmospheric dispersion capacity.',
    historicalContext: 'Urban air quality has improved in developed nations but worsened in rapidly industrializing regions.',
    humanImpact: aqData?.length > 0 ? `${aqData.length} monitoring stations reporting elevated readings` : 'Respiratory risk for sensitive populations',
    trend: 'STABLE',
    trendReason: 'Air quality levels consistent with seasonal and regional patterns',
  };
}

function getTectonicContext(lat, lon) {
  if (isInRingOfFire(lat, lon)) {
    return 'Located on the Pacific Ring of Fire — the world\'s most seismically active zone where the Pacific Plate meets surrounding plates';
  }
  if (isInHimalayanBelt(lat, lon)) {
    return 'Located in the Himalayan seismic belt where the Indian Plate collides with the Eurasian Plate';
  }
  if (lon >= -30 && lon <= -15) {
    return 'Situated near the Mid-Atlantic Ridge where tectonic plates are actively spreading';
  }
  if (lat >= 10 && lat <= 25 && lon >= -90 && lon <= -60) {
    return 'Near the Caribbean-North American plate boundary — active transform fault zone';
  }
  return 'Located in a region with moderate tectonic activity. Recent seismic activity may indicate stress accumulation along local fault lines';
}

function estimateAffected(earthquakes) {
  if (!earthquakes || earthquakes.length === 0) return 0;
  const maxMag = Math.max(...earthquakes.map(q => q.magnitude));
  if (maxMag >= 7) return 500000;
  if (maxMag >= 6) return 100000;
  if (maxMag >= 5) return 20000;
  return 5000;
}

function defaultCause() {
  return {
    primaryCause: 'Hazard conditions detected — detailed cause analysis pending data availability',
    contributingFactors: [],
    scientificContext: 'Multiple environmental factors contribute to hazard formation.',
    historicalContext: 'Historical data being compiled for this region.',
    humanImpact: 'Assessment in progress',
    trend: 'STABLE',
    trendReason: 'Insufficient data for trend analysis',
  };
}

module.exports = { analyzeCause };
