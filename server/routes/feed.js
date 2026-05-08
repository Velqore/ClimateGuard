const express = require('express');
const router = express.Router();
const axios = require('axios');
const cache = require('../engine/cache');

const GDACS_RSS = 'https://www.gdacs.org/xml/rss.xml';
const RELIEFWEB = 'https://api.reliefweb.int/v1/disasters?appname=climateguard&limit=20&sort[]=date:desc&fields[include][]=name&fields[include][]=date&fields[include][]=type&fields[include][]=country';

function buildGoogleNewsRss(query) {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
}

function parseGenericRss(text, sourceHint = 'Google News') {
  const items = [];
  const itemReg = /<item>([\s\S]*?)<\/item>/g;
  let m;

  while ((m = itemReg.exec(text)) !== null) {
    const block = m[1];
    const title = (block.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/) || [])[1] || '';
    const desc = (block.match(/<description>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/description>/) || [])[1] || '';
    const link = (block.match(/<link>(.*?)<\/link>/) || [])[1] || '';
    const pubDate = (block.match(/<pubDate>(.*?)<\/pubDate>/) || [])[1] || '';
    const source = (block.match(/<source[^>]*>(.*?)<\/source>/) || [])[1] || sourceHint;

    if (title) {
      items.push({
        title: title.replace(/<[^>]+>/g, '').trim(),
        description: desc.replace(/<[^>]+>/g, '').trim().slice(0, 220),
        link: link.trim(),
        pubDate,
        severity: '',
        country: '',
        eventType: 'WAR',
        source: source.replace(/<[^>]+>/g, '').trim() || sourceHint,
      });
    }
  }

  return items.slice(0, 20);
}

function parseRSSItem(text) {
  const items = [];
  const itemReg = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemReg.exec(text)) !== null) {
    const block = m[1];
    const title = (block.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/) || [])[1] || '';
    const desc = (block.match(/<description>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/description>/) || [])[1] || '';
    const link = (block.match(/<link>(.*?)<\/link>/) || [])[1] || '';
    const pubDate = (block.match(/<pubDate>(.*?)<\/pubDate>/) || [])[1] || '';
    const severity = (block.match(/<gdacs:severity[^>]*>(.*?)<\/gdacs:severity>/) || [])[1] || '';
    const country = (block.match(/<gdacs:country>(.*?)<\/gdacs:country>/) || [])[1] || '';
    const eventType = (block.match(/<gdacs:eventtype>(.*?)<\/gdacs:eventtype>/) || [])[1] || '';

    if (title) {
      items.push({
        title: title.replace(/<[^>]+>/g, '').trim(),
        description: desc.replace(/<[^>]+>/g, '').trim().slice(0, 200),
        link, pubDate,
        severity: severity.replace(/<[^>]+>/g, '').trim(),
        country: country.replace(/<[^>]+>/g, '').trim(),
        eventType: eventType.replace(/<[^>]+>/g, '').trim().toUpperCase(),
        source: 'GDACS',
      });
    }
  }
  return items.slice(0, 20);
}

router.get('/', async (req, res) => {
  const topic = String(req.query.topic || '').toLowerCase();
  const cachedKey = topic === 'climate-conflict' ? 'climate_conflict_feed' : 'global_feed';
  const cached = cache.get(cachedKey);
  if (cached && (topic === 'war' || topic === 'climate-conflict')) return res.json(cached);

  if (topic === 'war' || topic === 'climate-conflict') {
    const queries = [
      'climate conflict water crisis displacement news',
      'war climate environmental impact latest news',
      'conflict emissions agriculture water crisis climate',
      'humanitarian crisis climate conflict latest headlines',
    ];

    const results = await Promise.allSettled(
      queries.map(query => axios.get(buildGoogleNewsRss(query), { timeout: 8000, headers: { 'User-Agent': 'ClimateGuard/1.0' } }))
    );

    const items = [];

    for (const result of results) {
      if (result.status !== 'fulfilled') continue;
      try {
        items.push(...parseGenericRss(result.value.data, 'Google News'));
      } catch {}
    }

    const deduped = [];
    const seen = new Set();
    for (const item of items) {
      const key = `${item.title}|${item.link}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(item);
    }

    return res.json({
      items: deduped.slice(0, 24),
      fetchedAt: new Date().toISOString(),
      sources: ['Google News'],
      topic: topic === 'climate-conflict' ? 'climate-conflict' : 'war',
    });
  }

  const [gdacsResult, reliefResult] = await Promise.allSettled([
    axios.get(GDACS_RSS, { timeout: 8000, headers: { 'User-Agent': 'ClimateGuard/1.0' } }),
    axios.get(RELIEFWEB, { timeout: 8000 }),
  ]);

  const items = [];

  if (gdacsResult.status === 'fulfilled') {
    try {
      const parsed = parseRSSItem(gdacsResult.value.data);
      items.push(...parsed);
    } catch {}
  }

  if (reliefResult.status === 'fulfilled') {
    try {
      const disasters = reliefResult.value.data?.data || [];
      for (const d of disasters.slice(0, 10)) {
        const f = d.fields || {};
        const typeObj = Array.isArray(f.type) ? f.type[0] : f.type;
        const country = Array.isArray(f.country) ? f.country[0]?.name : f.country?.name;
        items.push({
          title: f.name || 'Unknown Event',
          description: '',
          link: `https://reliefweb.int/disaster/${d.id}`,
          pubDate: f.date?.created || '',
          severity: '',
          country: country || '',
          eventType: typeObj?.name?.toUpperCase() || 'DISASTER',
          source: 'ReliefWeb',
        });
      }
    } catch {}
  }

  const result = {
    items: items.slice(0, 30),
    fetchedAt: new Date().toISOString(),
    sources: ['GDACS', 'ReliefWeb'],
  };

  if (items.length > 0) cache.set('global_feed', result, 10 * 60 * 1000);
  if (items.length > 0 && topic === 'climate-conflict') cache.set('climate_conflict_feed', result, 10 * 60 * 1000);

  res.json(result);
});

module.exports = router;
