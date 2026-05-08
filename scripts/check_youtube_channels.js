const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.GOOGLE_API_KEY;
if (!API_KEY) {
  console.error('Missing GOOGLE_API_KEY in env');
  process.exit(1);
}

async function resolve(q) {
  try {
    const url = 'https://www.googleapis.com/youtube/v3/search';
    const res = await axios.get(url, { params: { part: 'snippet', type: 'channel', q, maxResults: 3, key: API_KEY } });
    return res.data.items.map(it => ({ title: it.snippet.title, channelId: it.id.channelId }));
  } catch (err) {
    return { error: err.toString() };
  }
}

(async () => {
  for (const q of ['News18India', 'AajTak', 'CNN']) {
    const out = await resolve(q);
    console.log('Query:', q);
    console.log(JSON.stringify(out, null, 2));
    console.log('---');
  }
})();
