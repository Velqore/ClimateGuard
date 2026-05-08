const express = require('express');
const router = express.Router();
const dataFetcher = require('../engine/dataFetcher');

router.get('/', async (req, res) => {
  try {
    const { location, disaster } = req.query;
    if (!location) return res.status(400).json({ error: 'location required' });

    const photos = await dataFetcher.getDisasterPhotos(location, disaster || 'disaster');
    res.json(photos);
  } catch (err) {
    console.error('Photos error:', err);
    res.status(500).json({ error: 'Failed to fetch photos' });
  }
});

module.exports = router;
