# Deploy ClimateGuard AI to Railway

## 1. Push to GitHub
Make sure your code is pushed to a GitHub repository.

## 2. Create Railway Project
1. Go to https://railway.app and sign in
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your repository

## 3. Set Environment Variables
In your Railway project dashboard → **Variables**, add:

```
NODE_ENV=production
PORT=3000

# Required for weather data
OPENWEATHER_API_KEY=your_key_here

# Optional AI keys (users can also enter these in the UI)
GROQ_API_KEY=your_key_here

# Ollama is the preferred default; Railway falls back to rule-based mode if Ollama is unavailable
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:72b

# Optional data sources
NASA_FIRMS_API_KEY=your_key_here
UNSPLASH_API_KEY=your_key_here
IQAIR_API_KEY=your_key_here
```

## 4. Deploy
Railway will automatically:
- Run `npm install` + `cd client && npm install`
- Build the React frontend with `npx vite build`
- Start the server with `node server/index.js`

The Express server serves the built React app as static files, so everything runs on a single port.

## 5. Custom Domain (optional)
In Railway dashboard → **Settings** → **Networking** → add your custom domain.

## Notes
- AI mode defaults to `ollama` and falls back to the rule-based planner if Ollama is unavailable
- Data files (savedCities, alerts) are initialized automatically on first start
- Railway's filesystem is ephemeral — saved cities reset on redeploy (acceptable for hackathon)
