export function getRiskColor(score) {
  if (score <= 20) return '#22C55E';
  if (score <= 40) return '#06B6D4';
  if (score <= 60) return '#F59E0B';
  if (score <= 80) return '#F97316';
  return '#EF4444';
}

export function getRiskLevel(score) {
  if (score <= 20) return 'MINIMAL';
  if (score <= 40) return 'LOW';
  if (score <= 60) return 'MODERATE';
  if (score <= 80) return 'HIGH';
  return 'CRITICAL';
}

export function getRiskBgClass(score) {
  if (score <= 20) return 'bg-green-500';
  if (score <= 40) return 'bg-cyan-500';
  if (score <= 60) return 'bg-amber-500';
  if (score <= 80) return 'bg-orange-500';
  return 'bg-red-500';
}

export function getRiskTextClass(score) {
  if (score <= 20) return 'text-green-400';
  if (score <= 40) return 'text-cyan-400';
  if (score <= 60) return 'text-amber-400';
  if (score <= 80) return 'text-orange-400';
  return 'text-red-400';
}

export function getRiskBorderClass(score) {
  if (score <= 20) return 'border-green-500/30';
  if (score <= 40) return 'border-cyan-500/30';
  if (score <= 60) return 'border-amber-500/30';
  if (score <= 80) return 'border-orange-500/30';
  return 'border-red-500/30';
}

export function formatTimeAgo(timestamp) {
  if (!timestamp) return '';
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function hazardIcon(type) {
  const icons = {
    earthquake: 'Mountain',
    wildfire: 'Flame',
    storm: 'CloudLightning',
    flood: 'Waves',
    heat: 'Thermometer',
    airQuality: 'Wind',
  };
  return icons[type] || 'AlertTriangle';
}

export function hazardLabel(type) {
  const labels = {
    earthquake: 'Earthquake',
    wildfire: 'Wildfire',
    storm: 'Storm',
    flood: 'Flood',
    heat: 'Extreme Heat',
    airQuality: 'Air Quality',
  };
  return labels[type] || type;
}

export function severityColor(severity) {
  const colors = {
    critical: 'text-red-400',
    high: 'text-orange-400',
    moderate: 'text-amber-400',
    low: 'text-cyan-400',
  };
  return colors[severity] || 'text-slate-400';
}

export function severityBg(severity) {
  const colors = {
    critical: 'bg-red-500/20 border-red-500/30',
    high: 'bg-orange-500/20 border-orange-500/30',
    moderate: 'bg-amber-500/20 border-amber-500/30',
    low: 'bg-cyan-500/20 border-cyan-500/30',
  };
  return colors[severity] || 'bg-slate-500/20 border-slate-500/30';
}

export function formatCoords(lat, lon) {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(2)}°${latDir}, ${Math.abs(lon).toFixed(2)}°${lonDir}`;
}

const rawApiBase = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
export const API_BASE = rawApiBase.endsWith('/api') ? rawApiBase.slice(0, -4) : rawApiBase;

function buildApiUrl(path) {
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return API_BASE ? `${API_BASE}${normalizedPath}` : normalizedPath;
}

// Request cache to avoid duplicate API calls
const requestCache = new Map();
const cacheTimeout = 60000; // 1 minute cache

// Ongoing requests to avoid duplicate simultaneous requests
const ongoingRequests = new Map();

export async function apiFetch(path, options = {}) {
  const url = buildApiUrl(path);
  
  // Create cache key (only for GET requests)
  const cacheKey = options.method === 'GET' || !options.method ? url : null;
  
  // Check cache for GET requests
  if (cacheKey) {
    const cached = requestCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cacheTimeout) {
      console.log(`[Cache HIT] ${path}`);
      return cached.data;
    }
  }
  
  // Check if request is already in progress (for deduplication)
  if (cacheKey && ongoingRequests.has(cacheKey)) {
    console.log(`[Dedup] Waiting for in-progress request: ${path}`);
    return ongoingRequests.get(cacheKey);
  }
  
  // Create the request promise
  const requestPromise = apiFetchWithRetry(url, options);
  
  // Store ongoing request
  if (cacheKey) {
    ongoingRequests.set(cacheKey, requestPromise);
  }
  
  try {
    const result = await requestPromise;
    
    // Cache successful GET responses
    if (cacheKey) {
      requestCache.set(cacheKey, { data: result, timestamp: Date.now() });
      console.log(`[Cache STORE] ${path}`);
    }
    
    return result;
  } finally {
    // Remove from ongoing requests
    if (cacheKey) {
      ongoingRequests.delete(cacheKey);
    }
  }
}

async function apiFetchWithRetry(url, options = {}, retries = 0) {
  const maxRetries = 3;
  const baseDelay = 1000; // 1 second base delay
  
  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });
    
    if (!res.ok) {
      // Handle rate limiting with exponential backoff
      if (res.status === 429 && retries < maxRetries) {
        const delay = baseDelay * Math.pow(2, retries); // 1s, 2s, 4s, 8s
        const jitter = Math.random() * 1000; // Add random jitter
        const totalDelay = delay + jitter;
        
        console.warn(`[429 Rate Limited] Retrying after ${totalDelay.toFixed(0)}ms (attempt ${retries + 1}/${maxRetries})`);
        
        await new Promise(resolve => setTimeout(resolve, totalDelay));
        return apiFetchWithRetry(url, options, retries + 1);
      }
      
      throw new Error(`API error: ${res.status} (${url})`);
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await res.text();
      throw new Error(`API returned non-JSON response (${url}): ${text.slice(0, 120)}`);
    }

    return res.json();
  } catch (error) {
    // Retry on network errors up to maxRetries
    if (retries < maxRetries && error instanceof TypeError) {
      const delay = baseDelay * Math.pow(2, retries);
      console.warn(`[Network Error] Retrying after ${delay}ms (attempt ${retries + 1}/${maxRetries})`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return apiFetchWithRetry(url, options, retries + 1);
    }
    
    throw error;
  }
}
