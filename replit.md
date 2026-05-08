# ClimateGuard — replit.md

## Overview

ClimateGuard is a real-time climate risk intelligence platform that aggregates live data from multiple public APIs to assess natural disaster risks for any location worldwide. Users can search cities and receive composite risk scores covering earthquakes, wildfires, hurricanes, floods, heatwaves, tsunamis, and air quality.

Key features:
- **Risk Dashboard** — composite risk scores per city with ParticleBackground + AlertTakeover for critical scores
- **Interactive Map** — Leaflet-based map with earthquake, wildfire, and EONET overlays
- **3D Disaster Globe** — globe.gl WebGL globe with live GDACS/EONET events; SVG 2D fallback when WebGL unavailable
- **City Compare** — side-by-side hazard comparison between two cities
- **Danger Leaderboard** — global ranking of at-risk cities (40+ pre-seeded)
- **Travel Safety Checker** — destination risk advice and packing recommendations
- **Alerts Feed** — real-time weather alerts and active climate events
- **Live Disaster Feed** — GDACS RSS + ReliefWeb aggregator (`/api/feed`)
- **Climate Assistant** — Ollama-first AI agent with visible tool traces; Groq fallback; rule-based offline mode
- **Evacuation Planner** — suggested routes and nearby emergency resources
- **Disaster Photo Feed** — Flickr imagery tied to active climate events
- **Community Reports** — crowdsourced incident reports with upvoting (`/community`)
- **AI modes** — ollama | groq | offline (rule-based fallback)

The app is structured as a monorepo with a separate `client/` (Vite/React) and `server/` (Node/Express) directory. In production (and on Replit), the Express server serves the built React app as static files while also providing all API routes under `/api`.

---

## User Preferences

Preferred communication style: Simple, everyday language.

---

## System Architecture

### Frontend (client/)

- **React 18** with **Vite** as the build tool and dev server
- **React Router v7** for client-side routing
- **Tailwind CSS** (dark theme: `#030712` background, `#0F172A` surface, `#1E293B` cards) with custom fonts (Space Grotesk, Inter, JetBrains Mono)
- **Framer Motion** for animations (fade-in, stagger, spring, pulse effects defined in `client/src/utils/animations.js`)
- **Recharts** for risk score visualizations and charts
- **Leaflet / React-Leaflet** for the interactive world map
- **Lucide React** for icons
- **PapaParse** for CSV parsing (likely NASA FIRMS fire data in CSV format)

The Vite dev server runs on port 5000 and proxies all `/api` requests to the Express backend on port 3000. In production, the built `client/dist/` is served by Express.

Utility modules:
- `client/src/utils/helpers.js` — risk color/level helpers (score → color/text/border class)
- `client/src/utils/animations.js` — reusable Framer Motion variants
- `client/src/utils/causeTemplates.js` — hazard icon/color config
- `client/src/utils/intelligence.js` — direct Open-Meteo API calls from the browser (client-side forecast fetching)

### Backend (server/)

- **Node.js + Express 5** with CommonJS modules
- **express-rate-limit** — 200 requests per 15 minutes, proxy-aware (`trust proxy 1`)
- **CORS** configured for localhost and `*.replit.dev` / `*.repl.co` origins
- **dotenv** for environment variables

**Route structure:**

| Route | File | Purpose |
|---|---|---|
| `POST /api/risk` | `routes/risk.js` | Main risk assessment for a city |
| `GET /api/alerts` | `routes/alerts.js` | Global earthquake + EONET alerts feed |
| `POST /api/compare` | `routes/compare.js` | Side-by-side city risk comparison |
| `GET /api/leaderboard` | `routes/leaderboard.js` | Ranked list of 40+ monitored cities |
| `POST /api/travel` | `routes/travel.js` | Travel safety assessment |
| `GET /api/resources` | `routes/resources.js` | Nearby emergency resources by lat/lon |
| `GET /api/photos` | `routes/photos.js` | Flickr disaster imagery |
| `GET /api/heatwave` | `routes/enhanced.js` | Heatwave detection endpoint |
| `POST /api/mcp/chat` | `routes/mcp.js` | AI assistant (Ollama-first, Groq fallback, rule-based offline mode) |
| `GET/POST/DELETE /api/agent/cities` | `routes/agent.js` | Saved cities CRUD |
| `GET /api/agent/alerts` | `routes/agent.js` | Agent-generated persistent alerts |

**Engine modules (server/engine/):**

| File | Purpose |
|---|---|
| `dataFetcher.js` | All external API calls (geocoding, weather, earthquakes, wildfires, AQI, EONET, Flickr, resources) with built-in 15-min in-memory cache |
| `cache.js` | Simple TTL Map-based in-memory cache |
| `riskEngine.js` | Score calculation for each hazard type (0–100 scale) |
| `causeEngine.js` | Scientific explanation generation for each hazard |
| `heatwaveEngine.js` | Heat index, wet bulb, and heatwave severity logic |
| `tsunamiEngine.js` | Tsunami risk from earthquake data |
| `historicalEngine.js` | Synthetic historical trend data (10-year generated profiles, cached 24h) |

### AI Agent / MCP (server/routes/mcp.js + server/agent/)

Three modes are controlled by the `AI_MODE` environment variable:

1. **`ollama` (default)** — Uses Ollama with `qwen2.5:72b` by default. This is the preferred mode for local and AMD runs.

2. **`groq` (optional)** — Uses Groq cloud LLM via REST API. Requires `GROQ_API_KEY`.

3. **`offline`** — Deterministic rule-based intent parser. Selects one of several tools (`get_risk_data`, `compare_cities`, `get_aqi_data`, `get_evacuation_route`, etc.), executes it, and returns a tool trace. No external LLM dependency.

The agent manager (`server/agent/agentManager.js`) runs a background scheduler that periodically checks saved cities for risk changes and writes alerts to `server/data/agentAlerts.json`. Saved cities are persisted to `server/data/savedCities.json` (JSON files, not a database).

### Data Flow for Risk Assessment

1. Client sends `POST /api/risk` with city name or coordinates
2. Server geocodes the city via Nominatim (OpenStreetMap)
3. `Promise.allSettled` fires 6 parallel API calls: weather, earthquakes, wildfires, AQI, EONET events, nearby resources
4. Each hazard score is calculated independently (0–100)
5. Overall composite risk score is computed
6. Cause analysis, tsunami assessment, and historical context are appended
7. Full JSON response returned to client

`Promise.allSettled` is used throughout — individual API failures degrade gracefully without crashing the response.

### Caching Strategy

- In-memory Map with TTL (default 15 minutes)
- Geocoding cached 1 hour
- Historical profiles cached 24 hours
- No persistent cache — restarts clear the cache

### Data Persistence

No traditional database is used for the main data flows. Supabase (`@supabase/supabase-js`) is listed as a dependency in `package.json` and referenced in the README but the actual Supabase integration code is not visible in the provided files — it may be used for user preferences or session data elsewhere. Agent city saves and alerts use local JSON files.

---

## External Dependencies

### APIs Called Server-Side

| Service | Purpose | Key Env Var |
|---|---|---|
| **Nominatim (OpenStreetMap)** | Geocoding city names to lat/lon | None (free, no key) |
| **OpenWeatherMap** | Current weather, forecasts, weather alerts | `OPENWEATHER_API_KEY` |
| **NASA FIRMS** | Active wildfire hotspot data | `NASA_FIRMS_API_KEY` |
| **USGS Earthquake API** | Earthquake data by region | None (free, no key) |
| **NASA EONET** | Natural event tracking (storms, floods, volcanoes) | None (free, no key) |
| **Open-Meteo** | Free weather fallback when OpenWeather unavailable | None (free, no key) |
| **IQAir / OpenAQ** | Air quality index data | `IQAIR_API_KEY` |
| **Flickr** | Disaster-related photo imagery | `FLICKR_API_KEY` |
| **Ollama** | Preferred local/AMD AI assistant | `OLLAMA_BASE_URL`, `OLLAMA_MODEL` |
| **Groq** | Optional cloud LLM for AI assistant | `GROQ_API_KEY` |

### APIs Called Client-Side

| Service | Purpose |
|---|---|
| **Open-Meteo** | Direct browser fetch for 3-day hourly forecast in `intelligence.js` |

### Key npm Packages

| Package | Version | Role |
|---|---|---|
| express | ^5.2.1 | HTTP server |
| @supabase/supabase-js | ^2.105.1 | Database client |
| axios | ^1.16.0 | Server-side HTTP requests |
| express-rate-limit | ^8.4.1 | API rate limiting |
| concurrently | ^9.2.1 | Run client + server simultaneously in dev |
| nodemon | ^3.1.14 | Server auto-reload in dev |
| papaparse | ^5.5.3 | CSV parsing (NASA FIRMS data) |
| react-leaflet / leaflet | ^4.2.1 / ^1.9.4 | Interactive maps |
| recharts | ^3.8.1 | Charts and data visualization |
| framer-motion | ^12.38.0 | Animations |
| react-router-dom | ^7.14.2 | Client-side routing |
| lucide-react | ^0.344.0 | Icon library |

### Dev Tooling

- **Vite** — frontend bundler with React plugin, serves on port 5000, proxies `/api` to port 3000
- **Tailwind CSS** — utility-first styling with PostCSS/Autoprefixer
- **ESLint** — linting with react-hooks and react-refresh plugins
- **TypeScript** — type checking for the client (strict mode, `checkJs: false` for JS files)
- **npm test** runs `server/test_offline_agent.js` against the live server to verify the offline agent returns correct structure

### Environment Variables Summary

```
OPENWEATHER_API_KEY=   # OpenWeatherMap
NASA_FIRMS_API_KEY=    # NASA FIRMS wildfire
FLICKR_API_KEY=        # Flickr photos
IQAIR_API_KEY=         # IQAir AQI
GROQ_API_KEY=          # Optional Groq LLM
OLLAMA_BASE_URL=       # Ollama endpoint, default http://localhost:11434
OLLAMA_MODEL=          # Ollama model, default qwen2.5:72b
AI_MODE=ollama         # "ollama", "groq", or "offline"
PORT=3000              # Express server port
```

The app is designed to run without most API keys — Open-Meteo, USGS, Nominatim, and EONET are all free with no key required, so the core risk functionality works out of the box.