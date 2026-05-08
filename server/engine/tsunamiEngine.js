const { isNearCoast, haversine } = require('./riskEngine');

function assessTsunamiRisk(earthquakes, locationData) {
  if (!earthquakes || earthquakes.length === 0) return { risk: false };

  const significantQuakes = earthquakes.filter(q => q.magnitude >= 6.5);
  if (significantQuakes.length === 0) return { risk: false };

  const lat = locationData?.lat || 0;
  const lon = locationData?.lon || 0;

  if (!isNearCoast(lat, lon)) return { risk: false };

  const quake = significantQuakes[0];
  const mag = quake.magnitude;
  const depth = quake.depth || 50;

  if (depth > 70) return { risk: false };

  const distToCoast = isNearCoast(lat, lon) ? 50 : 200;

  let riskScore =
    (mag >= 9.0 ? 100 : mag >= 8.0 ? 80 : mag >= 7.5 ? 60 : mag >= 7.0 ? 40 : mag >= 6.5 ? 20 : 0) *
    (depth < 20 ? 1.3 : depth < 50 ? 1.0 : 0.7) *
    (distToCoast < 50 ? 1.4 : distToCoast < 100 ? 1.2 : distToCoast < 200 ? 1.0 : 0.5);

  riskScore = Math.min(Math.round(riskScore), 100);

  if (riskScore <= 30) return { risk: false };

  const estimatedArrival = Math.round((distToCoast / 750) * 60);

  return {
    risk: true,
    riskScore,
    level: riskScore > 70 ? 'CRITICAL' : riskScore > 40 ? 'HIGH' : 'WATCH',
    earthquakeMagnitude: mag,
    earthquakeDepth: depth,
    distanceToCoast: distToCoast,
    estimatedArrivalMinutes: estimatedArrival,
    affectedCoastline: getAffectedCoastline(lat, lon),
    immediateActions: [
      'Move immediately to high ground (30m+ elevation)',
      'Do not wait for official warning — act now',
      'Stay away from coast for at least 8 hours',
      'Do not return until all-clear from authorities',
      `Estimated wave arrival: ${estimatedArrival} minutes`,
    ],
    cause: `Magnitude ${mag} submarine earthquake at ${depth}km depth triggered potential tsunami along ${getAffectedCoastline(lat, lon)} coastline`,
  };
}

function getAffectedCoastline(lat, lon) {
  if (lon >= 120 && lon <= 180) return 'Western Pacific';
  if (lon >= 60 && lon <= 120) return 'Indian Ocean';
  if (lon >= -30 && lon <= 40) return 'Mediterranean / Eastern Atlantic';
  if (lon >= -130 && lon <= -60) return 'Eastern Pacific / Americas';
  return 'regional';
}

module.exports = { assessTsunamiRisk };
