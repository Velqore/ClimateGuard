const express = require('express');
const router = express.Router();
const dataFetcher = require('../engine/dataFetcher');
const cache = require('../engine/cache');

router.get('/', async (req, res) => {
  try {
    const { type, limit = 50 } = req.query;

    const [earthquakes, eonetEvents] = await Promise.allSettled([
      dataFetcher.getGlobalEarthquakes(),
      dataFetcher.getEONETEvents(),
    ]);

    const quakeData = earthquakes.status === 'fulfilled' ? earthquakes.value : [];
    const eonetData = eonetEvents.status === 'fulfilled' ? eonetEvents.value : [];

    const alerts = [];

    for (const q of quakeData) {
      alerts.push({
        id: `eq-${q.id}`,
        type: 'earthquake',
        severity: q.magnitude >= 7 ? 'critical' : q.magnitude >= 5 ? 'high' : q.magnitude >= 3 ? 'moderate' : 'low',
        title: `M${q.magnitude.toFixed(1)} Earthquake`,
        location: q.place,
        magnitude: q.magnitude,
        depth: q.depth,
        time: q.time,
        lat: q.lat,
        lon: q.lon,
        affected: q.magnitude >= 6 ? 100000 : q.magnitude >= 5 ? 20000 : 5000,
      });
    }

    for (const e of eonetData) {
      const cat = e.category?.toLowerCase() || '';
      let alertType = 'storm';
      if (cat.includes('fire') || cat.includes('wildfire')) alertType = 'fire';
      else if (cat.includes('flood')) alertType = 'flood';
      else if (cat.includes('storm') || cat.includes('hurricane') || cat.includes('cyclone')) alertType = 'storm';
      else if (cat.includes('volcano')) alertType = 'volcano';
      else if (cat.includes('iceberg') || cat.includes('sea')) alertType = 'ice';

      alerts.push({
        id: `eonet-${e.id}`,
        type: alertType,
        severity: 'moderate',
        title: e.title,
        location: e.title,
        time: e.date ? new Date(e.date).getTime() : Date.now(),
        lat: e.lat,
        lon: e.lon,
        affected: 0,
      });
    }

    let filtered = alerts;
    if (type && type !== 'all') {
      filtered = alerts.filter(a => a.type === type);
    }

    filtered.sort((a, b) => {
      const sevOrder = { critical: 0, high: 1, moderate: 2, low: 3 };
      return (sevOrder[a.severity] || 3) - (sevOrder[b.severity] || 3);
    });

    res.json(filtered.slice(0, parseInt(limit)));
  } catch (err) {
    console.error('Alerts error:', err);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

module.exports = router;
