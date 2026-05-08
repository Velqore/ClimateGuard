const express = require('express');
const axios = require('axios');

const router = express.Router();

const YOUTUBE_API_KEY = process.env.GOOGLE_API_KEY;
const YOUTUBE_BASE = 'https://www.googleapis.com/youtube/v3';

// GET /api/youtube/live?channelId=<channelId>
// Returns live video info if available, otherwise returns a fallback latest video
router.get('/live', async (req, res) => {
  let channelId = req.query.channelId;
  if (!channelId) return res.status(400).json({ error: 'channelId required' });
  if (!YOUTUBE_API_KEY) return res.status(500).json({ error: 'Server missing YouTube API key' });

  try {
    // If channelId looks like a human-readable slug/name (doesn't start with 'UC'),
    // try to resolve it to a real channelId using the search endpoint.
    if (!channelId.startsWith('UC')) {
      try {
        const resolveResp = await axios.get(`${YOUTUBE_BASE}/search`, {
          params: { part: 'snippet', q: channelId, type: 'channel', maxResults: 1, key: YOUTUBE_API_KEY },
          timeout: 6000,
        });
        const chItems = (resolveResp.data && resolveResp.data.items) || [];
        if (chItems.length > 0 && chItems[0].id?.channelId) {
          channelId = chItems[0].id.channelId;
        }
      } catch (e) {
        // ignore resolve errors and continue with original channelId
      }
    }

    // Try to find an active live broadcast for the channel
    const liveSearchUrl = `${YOUTUBE_BASE}/search`;
    const liveResp = await axios.get(liveSearchUrl, {
      params: {
        part: 'snippet',
        channelId,
        eventType: 'live',
        type: 'video',
        maxResults: 1,
        key: YOUTUBE_API_KEY,
      },
      timeout: 8000,
    });

    const items = (liveResp.data && liveResp.data.items) || [];
    if (items.length > 0) {
      const videoId = items[0].id.videoId;
      const title = items[0].snippet?.title || '';
      return res.json({ live: true, videoId, title, embedUrl: `https://www.youtube.com/embed/${videoId}` });
    }

    // Fallback: return most recent video from the channel
    const recentResp = await axios.get(liveSearchUrl, {
      params: {
        part: 'snippet',
        channelId,
        type: 'video',
        order: 'date',
        maxResults: 1,
        key: YOUTUBE_API_KEY,
      },
      timeout: 8000,
    });

    const recentItems = (recentResp.data && recentResp.data.items) || [];
    if (recentItems.length > 0) {
      const videoId = recentItems[0].id.videoId;
      const title = recentItems[0].snippet?.title || '';
      return res.json({ live: false, videoId, title, embedUrl: `https://www.youtube.com/embed/${videoId}` });
    }

    // Final fallback: return channel live embed query (may still work)
    return res.json({ live: false, embedUrl: `https://www.youtube.com/embed/live_stream?channel=${channelId}` });
  } catch (err) {
    console.error('YouTube API error:', err?.toString?.() || err);
    // On error, return the original live_stream channel embed as a safe fallback
    return res.status(200).json({ live: false, embedUrl: `https://www.youtube.com/embed/live_stream?channel=${channelId}` });
  }
});

module.exports = router;
