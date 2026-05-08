# Deploy ClimateGuard on Replit

## One-Click Setup (No Secrets Required!)

All API keys are already configured in the repository. Judges can deploy instantly without any setup.

### Step 1: Import to Replit

1. Go to https://replit.com/new
2. Click **"Import from GitHub"**
3. Paste: `https://github.com/Velqore/ClimateGuard.git`
4. Click **Import**

Replit automatically detects Node.js and uses the `.replit` config.

### Step 2: Click Run

Click **Run** at the top. That's it.

Replit builds dependencies and starts the server. You'll get a public URL like:
```
https://climateguard.username.repl.co
```

### Step 3: Open the App

Click the URL in the Replit output or open it in your browser. The app is live immediately.

## What Works Out of the Box

✅ Dashboard with real-time climate risk data  
✅ Interactive map with weather layers  
✅ AI Assistant with visible tool traces  
✅ Risk comparison between cities  
✅ Evacuation route planner  
✅ Disaster photo feed  
✅ All APIs functional (offline mode + real data)  

## Share with Judges

Copy the Replit URL and share directly. Judges see:
- Live production app
- Full functionality (no demo mode)
- Real climate data from public APIs
- Transparent tool-calling in Assistant UI

## Troubleshooting

**"Still loading after 2 minutes?"**  
→ Check the Replit console for build errors. Click **Stop** then **Run** again.

**"API endpoints 404?"**  
→ Wait for `Server running on port 3000` message. Sometimes takes 30-60 seconds on free tier.

**"Assistant not responding?"**  
→ Refresh the page. The offline agent is deterministic and always responds.

## Notes

- **All costs covered**: OpenWeatherMap, NASA, USGS, OpenAQ keys are included
- **Offline-first**: Even without internet, the agent uses deterministic fallbacks
- **No database needed**: Risk computed from real-time public APIs
- **Free tier works**: Replit's free tier handles this easily

