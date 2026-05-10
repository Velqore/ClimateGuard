/**
 * MCP Chat Route: AI Agent with Tool-Calling
 *
 * Supported AI_MODE values:
 * 1. OLLAMA (default): Local/AMD GPU LLM via Ollama — preferred mode
 *    Install Ollama with ROCm: https://ollama.com
 *    Recommended model on AMD MI300X: qwen2.5:72b (fits fully in 192GB HBM3)
 *    Set OLLAMA_BASE_URL + OLLAMA_MODEL env vars
 * 2. GROQ: Groq cloud LLM — free tier available (GROQ_API_KEY required)
 *    Sign up free at https://console.groq.com
 * 3. OFFLINE: Deterministic rule-based fallback — no LLM, no API cost
 */
const express = require('express');
const router = express.Router();
const axios = require('axios');
const agentManager = require('../agent/agentManager');
const dataFetcher = require('../engine/dataFetcher');

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

const AI_MODE = (process.env.AI_MODE || 'ollama').toLowerCase();

const GROQ_MODEL = process.env.GROQ_MODEL || 'llama3-8b-8192';
const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY || '';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:3b';
const OLLAMA_BASE_URL = (process.env.OLLAMA_BASE_URL || 'http://localhost:11434').replace(/\/$/, '');

async function getOllamaModels() {
  const response = await axios.get(`${OLLAMA_BASE_URL}/api/tags`, { timeout: 4000 });
  return (response.data?.models || []).map(m => m.name).filter(Boolean);
}

async function resolveOllamaModel() {
  const models = await getOllamaModels();
  if (!models.length) return { models, model: OLLAMA_MODEL, resolved: false };

  if (models.includes(OLLAMA_MODEL)) {
    return { models, model: OLLAMA_MODEL, resolved: true };
  }

  const preferred =
    models.find(m => m === 'qwen2.5:3b') ||
    models.find(m => m.startsWith('qwen2.5')) ||
    models.find(m => m.includes('qwen3.5:cloud')) ||
    models[0];
  return { models, model: preferred, resolved: preferred === OLLAMA_MODEL };
}

const CLIMATE_SYSTEM_PROMPT = `You are ClimateGuard AI — a world-class climate risk and emergency preparedness expert running on AMD MI300X GPU hardware. You help users understand wildfire, earthquake, flood, storm, heat, tsunami, and air quality risks for any location worldwide. You may call available tools by returning a JSON object like {"tool":"tool_name","arguments":{...}}. When done, give a direct, conversational, and genuinely helpful natural language answer. Be specific, accurate, and safety-focused. Never be robotic or templated — talk like an expert who cares.`;

const WAR_ENVIRONMENT_PROMPT = `You are ClimateGuard AI — a climate and environmental risk expert. When a user asks about war, conflict, bombs, sanctions, occupation, military escalation, or geopolitical instability, answer through the lens of environmental and climate impact. Explain likely or observed effects on air quality, toxic smoke, water contamination, sanitation, food systems, energy systems, displacement, ecosystem damage, infrastructure failure, and carbon or emissions spikes. Be careful and factual: do not claim to know battlefield details unless they are present in the tool output or the user supplied them. If live current-data access is limited, say so briefly and then provide the most relevant climate-risk interpretation and practical safety guidance. Stay direct, specific, and useful. Do not refuse the question just because it mentions war.`;

function buildSystemPrompt(message = '') {
  const text = normalizeText(message);
  const warLike = /\b(war|conflict|bomb|military|strike|missile|shelling|occupation|sanction|iran|gaza|ukraine|sudan|yemen|sahel|resistance|invasion)\b/.test(text);
  const environmentLike = /\b(climate|environment|air quality|aqi|pollution|water|food|emissions|ecosystem|forest|smoke|toxicity|sanitation|displacement|heat|flood|drought)\b/.test(text);
  return warLike && environmentLike ? `${CLIMATE_SYSTEM_PROMPT}\n\n${WAR_ENVIRONMENT_PROMPT}` : CLIMATE_SYSTEM_PROMPT;
}

async function callGroq(messages, userApiKey) {
  const apiKey = userApiKey || GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY not configured — enter your key in the AI Mode panel');
  const res = await axios.post(
    GROQ_URL,
    { model: GROQ_MODEL, messages, max_tokens: 500, temperature: 0.7 },
    { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' } }
  );
  const content = res.data?.choices?.[0]?.message?.content || '';
  return String(content).trim();
}

async function callOllama(messages) {
  const url = `${OLLAMA_BASE_URL}/api/chat`;
  const { model } = await resolveOllamaModel();
  const res = await axios.post(
    url,
    { model, messages, stream: false },
    { timeout: 180000 }
  );
  const content = res.data?.message?.content || res.data?.response || '';
  return String(content).trim();
}

async function callModelForMode(mode, messages, userApiKey) {
  if (mode === 'groq') return callGroq(messages, userApiKey);
  if (mode === 'ollama') return callOllama(messages);
  return null;
}

function normalizeText(value = '') {
  return String(value).toLowerCase().replace(/[^a-z0-9\s,.-]/g, ' ');
}

const STOP_WORDS = new Set([
  'this','next','last','the','a','an','week','month','year','day','now','today',
  'tomorrow','that','these','those','some','any','every','all','both','each',
  'time','here','there','when','where','what','which','who','how','why','and',
  'but','or','if','then','also','so','from','into','out','up','down','over',
  'through','after','before','during','since','while','me','my','us','our',
  'you','your','he','she','him','her','his','its','they','their','we','i',
  'is','are','was','were','be','been','being','have','has','had','will','would',
  'could','should','may','might','shall','can','do','does','did','go','get',
  'give','make','take','know','think','see','come','want','look','use','find',
  'tell','ask','seem','feel','try','leave','call','keep','let','put','mean',
  'become','show','hear','play','run','move','live','believe','hold','bring',
  'happen','write','provide','sit','stand','lose','pay','meet','include',
  'continue','set','learn','change','lead','understand','watch','follow','stop',
  'create','speak','read','spend','grow','open','walk','win','offer','remember',
  'love','consider','appear','buy','wait','serve','die','send','expect','build',
  'stay','fall','cut','reach','kill','remain','suggest','raise','pass','sell',
  'require','report','decide','pull','safe','quickly','safely','likely',
]);

const HAZARD_WORDS = new Set([
  'hurricane','cyclone','earthquake','wildfire','fire','flood','tsunami',
  'storm','tornado','blizzard','heatwave','drought','avalanche','landslide',
  'mudslide','eruption','volcano','typhoon','disaster','hazard','risk',
]);

function extractCity(message) {
  const cleaned = normalizeText(message);

  // Compare pattern
  const compareMatch = cleaned.match(/compare\s+(?:the\s+)?(?:risk\s+)?(?:between\s+)?([a-z\s.-]+?)\s+(?:and|vs\.?|versus)\s+([a-z\s.-]+)/i);
  if (compareMatch) return { cityA: compareMatch[1].trim(), cityB: compareMatch[2].trim() };

  // Helper: extract city words — stop at the first hazard/stop word, keep leading valid words
  const cleanWords = (raw) => {
    if (!raw) return [];
    const result = [];
    for (const w of raw.trim().split(/\s+/)) {
      if (w.length <= 1 || STOP_WORDS.has(w) || HAZARD_WORDS.has(w)) break;
      result.push(w);
      if (result.length >= 3) break;
    }
    return result;
  };

  // Pattern: "travel to CITY" / "visit CITY" / "visiting CITY"
  const travelMatch = cleaned.match(/(?:travel(?:ing|led)?\s+to|visit(?:ing)?|going\s+to|trip\s+to|fly(?:ing)?\s+to)\s+([a-z][a-z\s.-]{1,40})/i);
  if (travelMatch) {
    const words = cleanWords(travelMatch[1]);
    if (words.length) return { city: words.join(' ') };
  }

  // Pattern: KEYWORD in/for/at/around CITY
  const riskMatch = cleaned.match(/(?:risk|aqi|weather|earthquake|flood|heat|wildfire|air quality|safe|safety|prepare|preparedness|pack|kit)\s+(?:in|for|at|around|near)?\s*([a-z][a-z\s.-]{1,40})/i);
  if (riskMatch) {
    const words = cleanWords(riskMatch[1]);
    if (words.length) return { city: words.join(' ') };
  }

  // Pattern: "in/to/for/at CITY ..."
  const prepositionMatches = cleaned.matchAll(/(?:^|\s)(?:in|to|for|at)\s+([a-z][a-z.-]*(?:\s[a-z][a-z.-]*){0,2})/gi);
  for (const m of prepositionMatches) {
    const words = cleanWords(m[1]);
    if (words.length) return { city: words.join(' ') };
  }

  return {};
}

function extractHazard(message) {
  const cleaned = normalizeText(message);
  if (cleaned.includes('tsunami')) return 'tsunami';
  if (cleaned.includes('earthquake')) return 'earthquake';
  if (cleaned.includes('wildfire') || cleaned.includes('fire')) return 'wildfire';
  if (cleaned.includes('flood')) return 'flood';
  if (cleaned.includes('heat') || cleaned.includes('heatwave')) return 'heat';
  if (cleaned.includes('storm') || cleaned.includes('hurricane') || cleaned.includes('cyclone') || cleaned.includes('typhoon')) return 'storm';
  if (cleaned.includes('tornado')) return 'tornado';
  if (cleaned.includes('tsunami')) return 'tsunami';
  return 'general';
}

/**
 * Offline Agent Planner: Deterministically select and invoke a climate tool
 * based on user message content. No LLM call required.
 */
function buildOfflinePlan(message) {
  const text = normalizeText(message);
  const { city, cityA, cityB } = extractCity(message);
  const hazard = extractHazard(message);

  if (cityA && cityB) {
    return { tool: 'compare_cities', arguments: { cityA, cityB } };
  }

  if (text.includes('aqi') || text.includes('air quality') || text.includes('pollution')) {
    return { tool: 'get_aqi_data', arguments: { city: city || 'Tokyo' } };
  }

  if (text.includes('evac') || text.includes('route') || text.includes('escape') || text.includes('safe direction')) {
    return { tool: 'get_evacuation_route', arguments: { lat: 35.6762, lon: 139.6503, hazard } };
  }

  if (text.includes('earthquake') && !city) {
    return { tool: 'get_earthquake_data', arguments: { lat: 35.6762, lon: 139.6503 } };
  }

  if (city) {
    return { tool: 'get_risk_data', arguments: { city } };
  }

  if (text.includes('compare')) {
    return { tool: 'compare_cities', arguments: { cityA: 'Tokyo', cityB: 'Osaka' } };
  }

  // No city found — return general advice based on hazard/intent
  return { tool: 'general_advice', arguments: { hazard, message }, generic: true };
}

async function runTool(toolName, args) {
  const handler = toolHandlers[toolName];
  if (!handler) return { error: `Tool ${toolName} is not available` };
  try {
    return await handler(args || {});
  } catch (err) {
    return { error: String(err) };
  }
}

function buildNaturalResponse(userMessage, toolName, toolResult) {
  const msg = (userMessage || '').toLowerCase();

  if (toolResult?.error) {
    return `I wasn't able to retrieve live data for that location right now. As a general guide: always maintain a 72-hour emergency kit (water, food, first aid, flashlight, battery radio), sign up for your local emergency alert system, and know at least two evacuation routes from your home. Check your local emergency management agency's website for location-specific risk information.`;
  }

  if ((msg.includes('war') || msg.includes('conflict') || msg.includes('bomb') || msg.includes('missile') || msg.includes('shelling') || msg.includes('occupation') || msg.includes('sanction')) && (msg.includes('climate') || msg.includes('environment') || msg.includes('air') || msg.includes('water') || msg.includes('food') || msg.includes('emission') || msg.includes('pollution') || msg.includes('ecosystem') || msg.includes('displacement') || msg.includes('sanitation'))) {
    const locationMatch = userMessage.match(/(?:in|of|for|at|about)\s+([A-Za-z][A-Za-z\s.-]{1,40})/i);
    const location = locationMatch?.[1]?.trim() || 'the region';
    return `In ${location}, war can affect the climate and environment in several concrete ways: air quality often worsens from smoke, dust, burning fuel, and damaged industry; water systems and sanitation can fail, which raises contamination and disease risk; farms, storage sites, and supply chains can be disrupted, increasing food stress; energy infrastructure damage can increase emissions and blackouts; and forests, soils, and coastal ecosystems can be damaged directly or by displacement pressure.

If you want the most important takeaway: the environmental impact is usually not just "pollution" — it is a chain reaction affecting air, water, food, energy, and human displacement all at once. If live local measurements are unavailable, I can still help you build a practical climate-impact assessment for the area.`;
  }

  if (toolName === 'get_risk_data' && toolResult) {
    const city = toolResult.city || 'the area';
    const overall = toolResult.overall ?? 0;
    const dominant = toolResult.dominant || 'general hazards';
    const scores = toolResult.scores || {};
    const level = overall >= 70 ? 'HIGH' : overall >= 45 ? 'MODERATE' : overall >= 20 ? 'LOW-MODERATE' : 'LOW';

    const topRisks = Object.entries(scores)
      .filter(([, v]) => v != null && v > 0)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([k, v]) => `${k} ${v}/100`)
      .join(' · ');

    let advice = '';

    if (msg.includes('safe') && (msg.includes('travel') || msg.includes('visit') || msg.includes('trip'))) {
      advice = `Traveling to ${city} is possible, but with a ${level} risk level you should: register with your country's travel advisory service, get travel insurance that covers natural disasters, download the local emergency alert app before you arrive, and keep your country's embassy number saved.`;
    } else if (msg.includes('pack') || msg.includes('kit') || msg.includes('bag') || msg.includes('bring')) {
      const kitItems = dominant === 'earthquake'
        ? 'sturdy shoes stored by your bed, a wrench to shut off the gas, a whistle to signal for help, and waterproof copies of key documents'
        : dominant === 'wildfire'
        ? 'N95 masks (smoke is toxic miles from the fire), goggles, fire-resistant clothing, a portable charger, and cash in small bills'
        : dominant === 'flood'
        ? 'a waterproof dry bag, water purification tablets, rubber boots, a hand-crank radio, and printed local flood maps'
        : dominant === 'storm'
        ? 'battery-powered radio, tarps and rope, waterproof matches, 3-day food and water supply, and important documents in a sealed bag'
        : 'at least 1 gallon of water per person per day for 3 days, non-perishable food, a first aid kit, flashlight with extra batteries, and copies of important documents';
      advice = `For ${city}'s main hazard (${dominant}), your emergency kit should prioritize: ${kitItems}. Keep your phone charged and emergency contacts saved offline.`;
    } else if (msg.includes('hurricane') || msg.includes('cyclone') || (msg.includes('storm') && !msg.includes('brain'))) {
      advice = `For ${city}'s hurricane/storm risk, act before the storm warning: board or shutter windows, fill bathtubs with water as a backup supply, charge all devices, fuel your car, and confirm your evacuation route. During the storm: stay indoors away from windows. After: never drive through floodwater — just 6 inches of moving water can knock you off your feet, and 12 inches can sweep away a small car.`;
    } else if (msg.includes('earthquake') || dominant === 'earthquake') {
      advice = `In ${city}, earthquake preparedness matters: secure heavy furniture and water heaters to walls, store water (1 gallon/person/day for 3 days), and identify the safest spots in each room — under a sturdy table, not in a doorway. During a quake: Drop to your hands and knees, take Cover under solid furniture, and Hold On until shaking stops. After: expect aftershocks, check for gas leaks (if you smell gas, leave immediately), and avoid damaged buildings.`;
    } else if (msg.includes('wildfire') || msg.includes('fire') || dominant === 'wildfire') {
      advice = `For ${city}'s wildfire risk, the most important rule is: don't wait for mandatory evacuation orders — leave early. Have a go-bag packed and by the door. Know multiple routes out of your area (fires can block roads fast). Sign up for emergency alerts now. During a fire: close all windows and vents, put a ladder at an upstairs window, and fill bathtubs with water. N95 masks can protect you from smoke, which is dangerous miles away from the fire front.`;
    } else if (msg.includes('flood') || dominant === 'flood') {
      advice = `For ${city}'s flood risk: know your flood zone (check FEMA or local flood maps), never walk or drive through floodwater (just 2 feet of water can float a car), move valuables and electrical items to upper floors ahead of rain events, and keep emergency sandbags accessible. Turn around, don't drown — most flood deaths happen in vehicles.`;
    } else if (msg.includes('survive') || msg.includes('plan') || msg.includes('prepare') || msg.includes('ready') || msg.includes('72')) {
      advice = `For a complete preparedness plan for ${city}: (1) Build a 72-hour kit — water, food, first aid, flashlight, radio; (2) Sign up for local emergency alerts; (3) Make a family communication plan with a designated out-of-area contact; (4) Know your two nearest evacuation routes; (5) Keep important documents in a waterproof bag. Review and refresh your kit every 6 months.`;
    } else {
      advice = `Key steps for ${city} residents: sign up for local emergency alerts (this is the single most important action), keep a 72-hour supply of water and food at home, know your two nearest evacuation routes, and discuss an emergency meeting point with your household. For ${dominant} specifically, research your local ${dominant} response procedures on your city's emergency management website.`;
    }

    return `${city} has a ${level} overall climate risk score of ${overall}/100. The dominant hazard is ${dominant}.\n\nRisk breakdown: ${topRisks}.\n\n${advice}`;
  }

  if (toolName === 'compare_cities' && toolResult) {
    const a = toolResult.cityA;
    const b = toolResult.cityB;
    const aScore = a.overall ?? 0;
    const bScore = b.overall ?? 0;
    const safer = aScore <= bScore ? a.name : b.name;
    const diff = Math.abs(aScore - bScore);
    const aTopRisk = Object.entries(a.scores || {}).sort(([, x], [, y]) => y - x)[0];
    const bTopRisk = Object.entries(b.scores || {}).sort(([, x], [, y]) => y - x)[0];
    return `${a.name} vs ${b.name}:\n\n${a.name}: ${aScore}/100 overall — primary risk: ${aTopRisk?.[0] || 'N/A'} (${aTopRisk?.[1] || 0}/100)\n${b.name}: ${bScore}/100 overall — primary risk: ${bTopRisk?.[0] || 'N/A'} (${bTopRisk?.[1] || 0}/100)\n\n${safer} is the relatively safer choice by ${diff} points. That said, both cities carry real hazards — always maintain emergency preparedness regardless of where you live, and subscribe to local alert systems in whichever city you choose.`;
  }

  if (toolName === 'get_aqi_data' && toolResult) {
    const entry = Array.isArray(toolResult.aqi) ? toolResult.aqi[0] : toolResult.aqi;
    const aqi = entry?.aqi_us ?? entry?.aqi ?? entry?.aqi_cn ?? 'unknown';
    const city = entry?.city || 'the area';
    const aqiNum = Number(aqi);
    let aqiLevel = 'Unknown', aqiAdvice = '';
    if (aqiNum <= 50) { aqiLevel = 'Good'; aqiAdvice = 'Air quality is satisfactory. All outdoor activities are fine.'; }
    else if (aqiNum <= 100) { aqiLevel = 'Moderate'; aqiAdvice = 'Acceptable for most, but sensitive groups (asthma, heart conditions, elderly) should limit prolonged outdoor exertion.'; }
    else if (aqiNum <= 150) { aqiLevel = 'Unhealthy for Sensitive Groups'; aqiAdvice = 'If you have respiratory or heart issues, wear an N95 mask outdoors and reduce outdoor time. Healthy individuals may still exercise but should watch for symptoms.'; }
    else if (aqiNum <= 200) { aqiLevel = 'Unhealthy'; aqiAdvice = 'Everyone should reduce outdoor activity. Keep windows closed, run an air purifier indoors if you have one, and avoid exercising outside.'; }
    else { aqiLevel = 'Very Unhealthy / Hazardous'; aqiAdvice = 'Stay indoors and keep windows and doors sealed. Wear an N95 mask (not a cloth mask) if you must go outside. Particularly dangerous for anyone with respiratory or heart conditions.'; }
    return `Current air quality in ${city}: AQI ${aqi} — ${aqiLevel}.\n\n${aqiAdvice}`;
  }

  if (toolName === 'get_evacuation_route' && toolResult) {
    const advice = toolResult.advice || 'Follow local emergency guidance immediately.';
    return `${advice}\n\nGeneral evacuation tips: Leave early — don't wait for mandatory orders. Take your go-bag, important documents, medications, and enough food and water for 72 hours. Tell someone outside the area where you are going. Follow official routes and avoid shortcuts — they may be blocked or dangerous.`;
  }

  if (toolName === 'get_earthquake_data' && toolResult) {
    const quakes = toolResult.earthquakes || [];
    const count = quakes.length;
    if (count === 0) return `No significant recent earthquakes recorded in this area. However, seismic activity can occur without warning anywhere. Stay prepared: know the Drop, Cover, Hold On technique, secure heavy furniture to walls, and store emergency water.`;
    const biggest = quakes.reduce((a, b) => ((a.magnitude || 0) > (b.magnitude || 0) ? a : b), quakes[0]);
    const recent = quakes[0];
    return `Found ${count} recent earthquakes in this area. Largest recorded: magnitude ${biggest?.magnitude?.toFixed?.(1) || 'unknown'}. Most recent: magnitude ${recent?.magnitude?.toFixed?.(1) || 'unknown'}.\n\nIf you feel shaking: Drop to hands and knees immediately, take Cover under a sturdy table or against an interior wall away from windows, and Hold On until shaking stops. After the quake: watch for aftershocks (they can be strong), check for gas leaks (if you smell gas, leave and don't use electrical switches), and stay away from damaged structures.`;
  }

  if (toolName === 'general_advice') {
    const h = toolResult?.hazard || 'general';
    const adviceMap = {
      storm: `Before a hurricane or major storm: act 72+ hours before the storm warning — don't wait for last-minute alerts. Board or tape windows, fill bathtubs with water as a backup supply, charge all devices, fuel your car, and confirm your evacuation route with your household. Gather a kit with a 3-day food and water supply, battery radio, flashlight, and important documents in a waterproof bag. During the storm: stay indoors, away from windows. After: never drive through floodwater — just 6 inches of moving water can knock you off your feet. Turn around, don't drown.`,
      earthquake: `Earthquake preparedness works best before shaking starts. Secure heavy furniture (bookshelves, water heaters, TVs) to walls with brackets. Identify safe spots in each room — under a sturdy table, against an interior wall away from windows. Store water (1 gallon per person per day for at least 3 days) and non-perishable food. Keep shoes near your bed. During an earthquake: Drop to your hands and knees, Cover your head and neck under a sturdy table, Hold On until shaking stops — don't try to run outside. After: watch for aftershocks, check for gas leaks (if you smell gas, leave immediately and don't use switches), avoid damaged structures.`,
      wildfire: `Wildfire preparedness: sign up for your local emergency alert system now — this is the single most important step. Build a go-bag with 72-hour supplies and keep it by the door. Know at least two evacuation routes from your home (fires can block roads fast). Don't wait for mandatory evacuation orders — leave early when a watch is issued. Create defensible space: clear dry vegetation 30+ feet around your home. If you can't evacuate: close all windows, vents, and doors; fill bathtubs with water; turn off gas; and signal from a window. N95 masks protect you from smoke, which can be deadly miles from the fire front.`,
      flood: `Flood preparedness: know your flood zone using FEMA flood maps or your local authority's website. Never walk, swim, or drive through floodwater — just 6 inches of moving water can knock a person down, and 12 inches can carry away a small vehicle. When flooding is forecast: move valuables, electrical items, and important documents to upper floors. Keep emergency sandbags, a hand-crank radio, rubber boots, and a waterproof bag in your emergency kit. If caught in a flood: move to higher ground immediately, don't wait. Subscribe to local flood warnings so you get alerts before water rises.`,
      heat: `During a heatwave, the most dangerous time is the first few days — your body hasn't acclimatized. Stay in air-conditioned spaces during peak heat hours (10am–4pm). Drink water regularly even if you don't feel thirsty — by the time you're thirsty, you're already mildly dehydrated. Wear loose, light-colored, breathable clothing. Check on elderly neighbours, young children, and pets — they are the most vulnerable. Warning signs of heat stroke: confusion, no sweating, hot dry skin, rapid pulse. Call emergency services immediately if you see these signs.`,
      tsunami: `Tsunami preparedness: if you are near the coast and feel a strong earthquake lasting 20+ seconds, don't wait for an official warning — move immediately to high ground (30+ meters elevation or 3+ km inland). The first wave is often not the largest — stay away from the coast for at least several hours after the initial wave. Know your evacuation routes before you need them. Natural warning signs: the sea rapidly receding (exposing the sea floor), a loud roaring sound from the ocean, or unusual ocean behaviour. Never go to the beach to watch a tsunami.`,
      tornado: `Tornado preparedness: when a tornado warning is issued for your area, move immediately to the lowest floor of a sturdy building — a basement or interior room away from windows. If no basement, go to an interior hallway or bathroom on the lowest floor and cover yourself with a mattress or heavy blankets. Never shelter in a car, mobile home, or under a bridge — these are extremely dangerous. If caught outside: lie flat in a low ditch and protect your head. After the tornado: watch for downed power lines, damaged structures, and gas leaks before re-entering buildings.`,
      general: `General emergency preparedness (applies everywhere): (1) Build a 72-hour emergency kit: 1 gallon of water per person per day, non-perishable food, first aid kit, flashlight with extra batteries, battery-powered radio, phone charger, copies of important documents in a waterproof bag, and any needed medications. (2) Sign up for your local emergency alert system. (3) Make a family communication plan: designate an out-of-area contact, agree on a meeting point, and save emergency numbers offline. (4) Know your two nearest evacuation routes. (5) Review and refresh your kit every 6 months. These steps dramatically increase your survival chances in any disaster.`,
    };
    const advice = adviceMap[h] || adviceMap.general;
    return advice;
  }

  return `I wasn't able to format a detailed response for that query. Try asking about a specific city and hazard type, for example: "What's the earthquake risk in Tokyo?" or "How should I prepare for a hurricane in Miami?"`;
}

/**
 * Execute offline agent: plan tool call, run it, build a rich natural language response.
 * Tool trace is always returned for full transparency.
 */
async function runOfflineAgent(message) {
  const plan = buildOfflinePlan(message);

  let toolResult;
  if (plan.generic) {
    toolResult = { hazard: plan.arguments.hazard };
  } else {
    toolResult = await runTool(plan.tool, plan.arguments);
  }

  const answer = buildNaturalResponse(message, plan.tool, toolResult);
  return {
    answer,
    source: 'offline-agent',
    toolTrace: [{ tool: plan.tool, arguments: plan.arguments, result: plan.generic ? null : toolResult }],
  };
}

function tryParseToolCall(text) {
  // look for a JSON object in the response
  const jsonMatch = text.match(/({[\s\S]*})/);
  if (!jsonMatch) return null;
  try {
    const obj = JSON.parse(jsonMatch[1]);
    if (obj.tool || obj.name) return obj;
  } catch (err) {
    return null;
  }
  return null;
}

const toolHandlers = {
  async get_risk_data({ city }) {
    if (!city) return { error: 'city required' };
    const res = await agentManager.evaluateCity({ name: city });
    if (!res) return { error: 'failed' };
    const dominant = Object.keys(res.scores || {}).reduce((a, b) => (res.scores[a] > res.scores[b] ? a : b));
    return { city: city, overall: res.overall, dominant, scores: res.scores };
  },

  async get_earthquake_data({ lat, lon }) {
    if (lat == null || lon == null) return { error: 'lat/lon required' };
    const q = await dataFetcher.getEarthquakes(Number(lat), Number(lon));
    return { earthquakes: q.slice ? q.slice(0, 20) : q };
  },

  async get_aqi_data({ city }) {
    if (!city) return { error: 'city required' };
    // try geocode then fetch
    const coords = await dataFetcher.geocode(city);
    if (!coords) return { error: 'geocode failed' };
    const a = await dataFetcher.getAirQuality(coords.lat, coords.lon);
    return { aqi: a };
  },

  async compare_cities({ cityA, cityB }) {
    if (!cityA || !cityB) return { error: 'two cities required' };
    const a = await agentManager.evaluateCity({ name: cityA });
    const b = await agentManager.evaluateCity({ name: cityB });
    return {
      cityA: { name: cityA, overall: a?.overall || null, scores: a?.scores || {} },
      cityB: { name: cityB, overall: b?.overall || null, scores: b?.scores || {} },
    };
  },

  async get_evacuation_route({ lat, lon, hazard }) {
    // Simple heuristic-based guidance
    if (!lat || !lon || !hazard) return { error: 'lat, lon, hazard required' };
    const h = String(hazard).toLowerCase();
    if (h.includes('tsunami')) return { advice: 'Move inland and to higher ground (seek elevation >30m). Avoid coastal roads.' };
    if (h.includes('earthquake')) return { advice: 'Move to open areas away from buildings, stay on higher ground if near coast.' };
    if (h.includes('fire') || h.includes('wildfire')) return { advice: 'Move upwind and away from fire; follow local evacuation orders and avoid valleys.' };
    return { advice: 'Follow local emergency guidance and move away from the hazard source.' };
  },
};

router.get('/mode', async (req, res) => {
  const isOllamaMode = AI_MODE === 'ollama';
  let activeModel = AI_MODE === 'groq' ? GROQ_MODEL : AI_MODE === 'ollama' ? OLLAMA_MODEL : 'offline';
  let resolvedFromFallback = false;

  if (isOllamaMode) {
    try {
      const resolution = await resolveOllamaModel();
      activeModel = resolution.model;
      resolvedFromFallback = !resolution.resolved;
    } catch {}
  }

  res.json({
    mode: AI_MODE,
    model: activeModel,
    ollamaBaseUrl: isOllamaMode ? OLLAMA_BASE_URL : undefined,
    ollamaModel: OLLAMA_MODEL,
    resolvedFromFallback,
    available: {
      offline: true,
      groq: !!GROQ_API_KEY,
      ollama: true,
    },
  });
});

router.get('/ollama/status', async (req, res) => {
  try {
    const { models, model, resolved } = await resolveOllamaModel();
    res.json({
      running: true,
      baseUrl: OLLAMA_BASE_URL,
      model,
      modelLoaded: !!model,
      activeModel: model,
      availableModels: models,
      configuredModel: OLLAMA_MODEL,
      resolvedFromFallback: !resolved,
      hint: models.includes(OLLAMA_MODEL) ? null : `Using ${model} because ${OLLAMA_MODEL} is not loaded.`,
    });
  } catch (err) {
    const isRefused = err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND';
    res.json({
      running: false,
      baseUrl: OLLAMA_BASE_URL,
      model: OLLAMA_MODEL,
      modelLoaded: false,
      error: isRefused ? 'Ollama not running' : err.message,
      hint: 'Run: npm run dev:amd  to auto-install and start Ollama',
    });
  }
});

router.post('/chat', async (req, res) => {
  const activeMode = (req.body?.mode || AI_MODE).toLowerCase();

  try {
    const { message, mode: requestedMode, apiKey: userApiKey } = req.body;
    if (!message) return res.status(400).json({ error: 'message required' });

    const resolvedMode = (requestedMode || activeMode).toLowerCase();

    if (resolvedMode === 'offline') {
      const offline = await runOfflineAgent(message);
      return res.json(offline);
    }

    const messages = [
      { role: 'system', content: buildSystemPrompt(message) },
      { role: 'user', content: message },
    ];

    let modelOutput = '';
    let iterations = 0;
    const maxIterations = 5;
    const toolTrace = [];

    while (iterations < maxIterations) {
      iterations += 1;
      const reply = await callModelForMode(resolvedMode, messages, userApiKey);
      modelOutput = reply;

      const toolCall = tryParseToolCall(reply);
      if (!toolCall) {
        return res.json({ answer: reply, source: resolvedMode, toolTrace: toolTrace.length ? toolTrace : null });
      }

      const toolName = toolCall.tool || toolCall.name;
      const args = toolCall.arguments || toolCall.args || toolCall.parameters || {};

      const handler = toolHandlers[toolName];
      if (!handler) {
        messages.push({ role: 'assistant', content: `Tool ${toolName} is not available.` });
        continue;
      }

      let toolResult;
      try {
        toolResult = await handler(args);
      } catch (err) {
        toolResult = { error: String(err) };
      }

      toolTrace.push({ tool: toolName, arguments: args, result: toolResult });
      messages.push({ role: 'assistant', content: JSON.stringify({ tool: toolName, result: toolResult }) });
    }

    return res.json({ answer: modelOutput, source: resolvedMode, toolTrace: toolTrace.length ? toolTrace : null });
  } catch (err) {
    console.error('MCP chat error:', err);
    const httpStatus = err.response?.status;
    const errMsg = err.message || '';

    const shouldFallbackToRuleBased =
      activeMode === 'ollama' ||
      errMsg.includes('ECONNREFUSED') ||
      errMsg.includes('ENOTFOUND') ||
      errMsg.includes('connect') ||
      errMsg.includes('Cannot connect');

    if (shouldFallbackToRuleBased) {
      try {
        const fallback = await runOfflineAgent(req.body?.message || 'risk Tokyo');
        return res.status(200).json({
          ...fallback,
          fallbackReason: err.message,
          source: 'rule-based-fallback',
        });
      } catch (fallbackErr) {
        return res.status(500).json({ error: 'MCP fallback failed', details: fallbackErr.message });
      }
    }

    if (httpStatus === 401 || httpStatus === 403) {
      return res.status(200).json({
        answer: `Your ${activeMode} API key was rejected (authentication failed). Please open the AI Mode panel, clear your current key, and paste a fresh one from console.groq.com. Your key may have expired or been entered incorrectly.`,
        source: 'error',
        toolTrace: null,
      });
    }

    if (errMsg.includes('not configured') || errMsg.includes('API key')) {
      return res.status(200).json({
        answer: `No API key is configured for ${activeMode} mode. Click "AI Mode" in the top right, select the ${activeMode} card, and enter your key. You can get a free Groq key at console.groq.com.`,
        source: 'error',
        toolTrace: null,
      });
    }

    if (httpStatus === 429) {
      return res.status(200).json({
        answer: `The ${activeMode} API is rate-limited right now. Please wait a moment and try again, or switch to Rule-Based mode which always works without limits.`,
        source: 'error',
        toolTrace: null,
      });
    }

    res.status(500).json({ error: 'MCP chat failed', details: err.message });
  }
});

router.post('/test-key', async (req, res) => {
  const { mode, apiKey } = req.body;
  if (!mode || !apiKey) return res.status(400).json({ ok: false, error: 'mode and apiKey required' });

  const testMessages = [{ role: 'user', content: 'Reply with only the word "ok".' }];

  try {
    if (mode === 'groq') {
      await callGroq(testMessages, apiKey);
    } else {
      return res.json({ ok: true, message: 'No key needed for this mode.' });
    }
    res.json({ ok: true });
  } catch (err) {
    const status = err.response?.status;
    if (status === 429) return res.json({ ok: true, message: 'Key is valid (rate limited).' });
    const error = (status === 401 || status === 403)
      ? 'Invalid API key — authentication failed.'
      : err.message || 'Connection failed.';
    res.json({ ok: false, error });
  }
});

module.exports = router;
