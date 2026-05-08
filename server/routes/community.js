const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const FILE = path.join(__dirname, '../data/communityReports.json');

function read() {
  try {
    if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, '[]');
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch { return []; }
}

function save(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

router.get('/', (req, res) => {
  const reports = read();
  const { lat, lon, radius = 500 } = req.query;
  if (lat && lon) {
    const R = 6371;
    const near = reports.filter(r => {
      const dLat = (r.lat - Number(lat)) * Math.PI / 180;
      const dLon = (r.lon - Number(lon)) * Math.PI / 180;
      const a = Math.sin(dLat/2)**2 + Math.cos(Number(lat)*Math.PI/180)*Math.cos(r.lat*Math.PI/180)*Math.sin(dLon/2)**2;
      const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return d <= Number(radius);
    });
    return res.json(near);
  }
  res.json(reports.slice(-100).reverse());
});

router.post('/', (req, res) => {
  const { lat, lon, type, description, severity, location } = req.body;
  if (!lat || !lon || !type || !description) {
    return res.status(400).json({ error: 'lat, lon, type, description required' });
  }
  const reports = read();
  const report = {
    id: crypto.randomUUID(),
    lat: Number(lat),
    lon: Number(lon),
    type: String(type).slice(0, 50),
    description: String(description).slice(0, 500),
    severity: ['low', 'medium', 'high', 'critical'].includes(severity) ? severity : 'medium',
    location: String(location || '').slice(0, 100),
    timestamp: new Date().toISOString(),
    votes: 0,
  };
  reports.push(report);
  save(reports.slice(-500));
  res.json({ ok: true, report });
});

router.post('/:id/vote', (req, res) => {
  const reports = read();
  const r = reports.find(x => x.id === req.params.id);
  if (!r) return res.status(404).json({ error: 'Not found' });
  r.votes = (r.votes || 0) + 1;
  save(reports);
  res.json({ ok: true, votes: r.votes });
});

router.delete('/:id', (req, res) => {
  const reports = read().filter(r => r.id !== req.params.id);
  save(reports);
  res.json({ ok: true });
});

module.exports = router;
