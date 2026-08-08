// hearthstoneData.js
// Fetches minion data from the community-run HearthstoneJSON API, filters it
// down to what the game needs, and caches it in localStorage so you're not
// re-downloading the full multi-MB card dump on every page load.

const CARDS_URL = "https://api.hearthstonejson.com/v1/latest/enUS/cards.collectible.json";
const CACHE_KEY = "hsjson:minions:v1";
const TTL_MS = 24 * 60 * 60 * 1000; // refetch at most once a day

/** Cropped illustration only — no card frame. Good if you're drawing your own frame. */
export function tileArtUrl(id) {
  return `https://art.hearthstonejson.com/v1/tiles/${id}.jpg`;
}

/** Full official card render, frame and all. Sizes: 256x or 512x. */
export function renderArtUrl(id, size = "256x") {
  return `https://art.hearthstonejson.com/v1/render/latest/enUS/${size}/${id}.png`;
}

/**
 * Returns an array of collectible minions: { id, name, cost, atk, hp, rarity, text }.
 * Serves from localStorage if a fresh copy exists; otherwise fetches and re-caches.
 */
export async function getMinionData({ forceRefresh = false } = {}) {
  if (!forceRefresh) {
    const cached = readCache();
    if (cached) return cached;
  }

  const res = await fetch(CARDS_URL);
  if (!res.ok) {
    throw new Error(`HearthstoneJSON request failed: ${res.status} ${res.statusText}`);
  }
  const all = await res.json();

  const minions = all
    .filter(
      (c) =>
        c.collectible &&
        c.type === "MINION" &&
        typeof c.attack === "number" &&
        typeof c.health === "number" &&
        c.name &&
        c.id
    )
    .map((c) => ({
      id: c.id,
      name: c.name,
      cost: c.cost ?? 0,
      atk: c.attack,
      hp: c.health,
      rarity: c.rarity ?? "FREE",
      text: cleanText(c.text),
    }));

  writeCache(minions);
  return minions;
}

export function clearMinionCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore — nothing to clear if storage isn't available
  }
}

/** Returns cache age in ms, or null if there's no cached data. */
export function getCacheAge() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { timestamp } = JSON.parse(raw);
    return Date.now() - timestamp;
  } catch {
    return null;
  }
}

function cleanText(text) {
  if (!text) return "";
  return text
    .replace(/\$/g, "")
    .replace(/#/g, "")
    .trim();
}

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { timestamp, data } = JSON.parse(raw);
    if (Date.now() - timestamp > TTL_MS) return null;
    return data;
  } catch {
    return null;
  }
}

function writeCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data }));
  } catch (err) {
    // Quota exceeded, private browsing, storage disabled, etc. — fail silently,
    // the game still works, it'll just refetch next load.
    console.warn("Could not cache Hearthstone card data:", err);
  }
}
