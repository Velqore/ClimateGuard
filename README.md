# ClimateGuard

**ClimateGuard** is a real-time climate risk intelligence platform that helps users assess natural disaster risks for any location worldwide. It aggregates live data from multiple sources to provide risk scores, hazard breakdowns, interactive maps, travel safety assessments, and an AI-powered climate assistant.

For hackathon demos and local runs, the assistant now defaults to Ollama. It still behaves like an AI agent: it plans a response, calls climate tools, and returns a visible tool trace. Groq is available as a cloud fallback, and the rule-based offline mode remains as a safety net.

---

## Features

- **Risk Dashboard** — Search any city and get a composite risk score covering earthquakes, wildfires, hurricanes, floods, heatwaves, tsunamis, and air quality.
- **Interactive Map** — Visualize global earthquakes, wildfires (NASA FIRMS), and EONET events on a live map.
- **City Compare** — Side-by-side risk comparison of two cities across all hazard categories.
- **Danger Leaderboard** — Ranking of the world's most at-risk cities.
- **Travel Safety Checker** — Get tailored travel safety advice and packing recommendations for any destination.
- **Alerts Feed** — Real-time weather alerts and active climate events for a location.
- **Climate Assistant** — Ollama-first assistant with Groq fallback and a rule-based offline tool planner.
- **Evacuation Planner** — Suggested evacuation routes and nearby emergency resources.
- **Disaster Photo Feed** — Recent Flickr imagery associated with active climate events.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, Framer Motion |
| Routing | React Router v7 |
| Charts | Recharts |
| Maps | Leaflet / React-Leaflet |
| Backend | Node.js, Express 5 |
| Database | Supabase |
| Rate Limiting | express-rate-limit |

### Agent Mode

| Mode | Purpose |
|------|---------|
| `ollama` | Default. Uses local or AMD-hosted Ollama with `qwen2.5:72b` by default. |
| `groq` | Optional. Uses Groq cloud LLM if you want hosted replies. |
| `offline` | Deterministic rule-based tool planning with no paid API dependency. |

---

## External APIs

| API | Purpose |
|-----|---------|
| [OpenWeatherMap](https://openweathermap.org/api) | Current weather, forecasts, air quality index |
| [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/) | Active wildfire / hotspot data |
| [NASA EONET](https://eonet.gsfc.nasa.gov/) | Natural event tracking (storms, floods, etc.) |
| [USGS Earthquake API](https://earthquake.usgs.gov/fdsnws/event/1/) | Real-time global earthquake data |
| [Flickr API](https://www.flickr.com/services/api/) | Disaster-related photo feed |

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- npm ≥ 9

### 1. Clone the repository

```bash
git clone https://github.com/Velqore/ClimateGuard.git
cd ClimateGuard
```

### 2. Configure environment variables

Copy the example file and fill in your API keys:

```bash
cp .env.example .env
```

```
OPENWEATHER_API_KEY=your_openweather_key
NASA_FIRMS_API_KEY=your_nasa_firms_key
FLICKR_API_KEY=your_flickr_key
GROQ_API_KEY=your_groq_key
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:72b
AI_MODE=ollama
PORT=3000
```

Optional API keys:

```bash
IQAIR_API_KEY=your_iqair_key
```

### 3. Install dependencies

```bash
npm install
```

### Vercel note

- Use `npm run build` as the Vercel build command.
- `npm run dev:amd` is for persistent local/VM development and cannot be used as a Vercel build step.
- Set `VITE_API_URL` to your backend URL.
- For Vercel environment variables, the backend also accepts these VITE-prefixed aliases:
  - `VITE_GOOGLE_API_KEY`
  - `VITE_OPENWEATHER_API_KEY`
  - `VITE_NASA_FIRMS_API_KEY`
  - `VITE_IQAIR_API_KEY`
  - `VITE_GROQ_API_KEY`

### 4. Run in development

```bash
npm run dev
```

This starts both the Express API server (port 3000) and the Vite dev server (port 5173) concurrently.

### Deploy on Replit (No Setup Required)

All API keys are pre-configured. One-click deployment for judges:

1. Go to https://replit.com/new
2. Click **"Import from GitHub"**
3. Paste: `https://github.com/Velqore/ClimateGuard.git`
4. Click **Run**

That's it. The live app is instantly available at a public URL. Judges see the full working project without any configuration.

See [REPLIT_SETUP.md](REPLIT_SETUP.md) for detailed instructions.

### Why this is open source ready

This project is not just a demo shell. It includes:

- A working backend and frontend that run locally from source.
- A deterministic offline agent mode so the project still functions without paid AI credits.
- A visible `toolTrace` so the agent behavior is inspectable.
- A repeatable verification command:

```bash
npm test
```

That runs the offline MCP agent check against the live server.

### 5. Build for production

```bash
npm run build   # builds the React client
npm start       # serves the API + static build on PORT
```

---

## Project Structure

```
ClimateGuard/
├── client/                  # React frontend (Vite)
│   └── src/
│       ├── components/      # Reusable UI components
│       ├── pages/           # Route-level page components
│       └── utils/           # Helpers, animation presets
└── server/                  # Express backend
    ├── engine/              # Risk calculation engines
    │   ├── riskEngine.js
    │   ├── heatwaveEngine.js
    │   ├── tsunamiEngine.js
    │   ├── historicalEngine.js
    │   ├── causeEngine.js
    │   ├── dataFetcher.js
    │   └── cache.js
    └── routes/              # API route handlers
        ├── risk.js
        ├── alerts.js
        ├── compare.js
        ├── leaderboard.js
        ├── travel.js
        ├── resources.js
        ├── photos.js
        └── enhanced.js
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/risk` | Climate risk score for a location |
| GET | `/api/alerts` | Active weather alerts |
| GET | `/api/compare` | Side-by-side city comparison |
| GET | `/api/leaderboard` | Most dangerous cities ranking |
| GET | `/api/travel` | Travel safety assessment |
| GET | `/api/resources` | Nearby emergency resources |
| GET | `/api/photos` | Disaster photo feed |
| GET | `/api/global/events` | Global earthquakes and EONET events |
| GET | `/api/global/stats` | Aggregated global event statistics |
| POST | `/api/chat` | Climate assistant chatbot |
| POST | `/api/mcp/chat` | AI agent / tool-calling endpoint with offline fallback |

### Verification

Use these commands to confirm the project is healthy before a release:

```bash
npm run build
npm test
```

### Contributing

If you want to help improve ClimateGuard, start with [CONTRIBUTING.md](CONTRIBUTING.md). Issue and pull request templates are available under `.github/` to keep reports consistent and easy to review.

### AI Agent Demo Flow

Use one of these sample prompts in `/api/mcp/chat`:

- "What is the risk in Tokyo?"
- "Compare the climate risk between Tokyo and Osaka"
- "What is the AQI in Delhi?"
- "What evacuation route should I take for a wildfire in Tokyo?"

The response includes a `toolTrace` array in offline mode so judges can see exactly which tool was used.

---

## Risk Score Reference

| Score | Level |
|-------|-------|
| 0 – 20 | 🟢 Minimal |
| 21 – 40 | 🔵 Low |
| 41 – 60 | 🟡 Moderate |
| 61 – 80 | 🟠 High |
| 81 – 100 | 🔴 Critical |

---

## License

This project is open source. See [LICENSE](LICENSE) for details.
