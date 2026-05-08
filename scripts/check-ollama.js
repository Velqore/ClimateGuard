#!/usr/bin/env node
/**
 * ClimateGuard — Ollama Connection Checker
 * Called by the API to verify Ollama is reachable and the model is loaded.
 * Returns JSON to stdout.
 */

const http = require('http');

const BASE = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:72b';

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve({}); }
      });
    }).on('error', reject);
  });
}

async function check() {
  try {
    const tags = await get(`${BASE}/api/tags`);
    const models = (tags.models || []).map(m => m.name);
    const hasModel = models.some(m => m.startsWith(MODEL.split(':')[0]));
    console.log(JSON.stringify({
      ok: true,
      running: true,
      model: MODEL,
      modelLoaded: hasModel,
      availableModels: models,
      baseUrl: BASE,
    }));
  } catch (e) {
    console.log(JSON.stringify({
      ok: false,
      running: false,
      error: e.message,
      model: MODEL,
      baseUrl: BASE,
      hint: 'Run: npm run dev:amd72b or set OLLAMA_MODEL to match your loaded model',
    }));
  }
}

check();
