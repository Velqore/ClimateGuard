const cache = new Map();
const DEFAULT_TTL = 15 * 60 * 1000; // 15 minutes

function set(key, value, ttl = DEFAULT_TTL) {
  cache.set(key, { value, expiry: Date.now() + ttl });
}

function get(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function has(key) {
  return get(key) !== null;
}

function clear() {
  cache.clear();
}

function size() {
  return cache.size;
}

module.exports = { set, get, has, clear, size };
