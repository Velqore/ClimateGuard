const express = require('express');
const router = express.Router();
const dataFetcher = require('../engine/dataFetcher');

router.get('/', async (req, res) => {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) return res.status(400).json({ error: 'lat and lon required' });

    const resources = await dataFetcher.getNearbyResources(parseFloat(lat), parseFloat(lon));
    res.json(resources);
  } catch (err) {
    console.error('Resources error:', err);
    res.status(500).json({ error: 'Failed to fetch resources' });
  }
});

module.exports = router;
