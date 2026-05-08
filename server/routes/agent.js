const express = require('express');
const router = express.Router();
const agent = require('../agent/agentManager');

router.get('/cities', async (req, res) => {
  try {
    const list = await agent.loadSavedCities();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load cities' });
  }
});

router.post('/cities', async (req, res) => {
  try {
    const { name, lat, lon, profile } = req.body;
    if (!name && !(lat && lon)) return res.status(400).json({ error: 'Provide name or lat/lon' });
    const list = await agent.loadSavedCities();
    const entry = { name: name || `${lat},${lon}`, lat, lon, profile };
    list.push(entry);
    await agent.saveSavedCities(list);
    res.json(entry);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save city' });
  }
});

router.delete('/cities', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Provide name to remove' });
    let list = await agent.loadSavedCities();
    list = list.filter(c => c.name !== name);
    await agent.saveSavedCities(list);
    res.json({ removed: name });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove city' });
  }
});

router.get('/alerts', async (req, res) => {
  try {
    const alertsPath = require('path').join(__dirname, '..', 'data', 'agentAlerts.json');
    const raw = require('fs').readFileSync(alertsPath, 'utf8');
    const arr = JSON.parse(raw || '[]');
    res.json(arr);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load alerts' });
  }
});

module.exports = router;
