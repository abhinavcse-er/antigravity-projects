const db = require('../db/database');
const config = require('../config');

// Short-lived, bounded cache prevents repeated YouTube API calls for the same search.
const searchCache = new Map();
const pendingSearches = new Map();
const CACHE_TTL_MS = 60 * 1000;
const CACHE_MAX_ENTRIES = 200;

function cacheSearch(key, results) {
  if (searchCache.size >= CACHE_MAX_ENTRIES) {
    const oldestKey = searchCache.keys().next().value;
    if (oldestKey) searchCache.delete(oldestKey);
  }
  searchCache.set(key, { results, expiresAt: Date.now() + CACHE_TTL_MS });
}

async function fetchJson(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || `YouTube HTTP ${response.status}`);
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

class SongService {
  getSongs(options) {
    return db.getSongs(options);
  }

  getSongById(id) {
    return db.getSongById(id);
  }

  getRandomSong(mood) {
    return db.getRandomSong(mood);
  }

  recordPlay(id) {
    db.incrementPlays(id);
  }

  async searchSongs(query, mood) {
    const normalizedQuery = String(query || '').trim().replace(/\s+/g, ' ');
    if (!normalizedQuery) return [];
    const cacheKey = `${mood || 'all'}_${normalizedQuery}`.toLowerCase();
    const cached = searchCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.results;
    if (cached) searchCache.delete(cacheKey);
    if (pendingSearches.has(cacheKey)) return pendingSearches.get(cacheKey);

    const searchPromise = this.performSearch(normalizedQuery, mood)
      .then(results => {
        cacheSearch(cacheKey, results);
        return results;
      })
      .finally(() => pendingSearches.delete(cacheKey));

    pendingSearches.set(cacheKey, searchPromise);
    return searchPromise;
  }

  async performSearch(query, mood) {
    // Search YouTube first so users can find tracks outside the local catalogue.
    if (config.youtubeApiKey) {
      try {
        const searchQuery = `${query} Hindi song`;
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&videoCategoryId=10&maxResults=10&key=${config.youtubeApiKey}`;
        const searchData = await fetchJson(searchUrl);
        const items = Array.isArray(searchData.items) ? searchData.items : [];
        const ids = items.map(item => item.id?.videoId).filter(Boolean);

        if (ids.length) {
          const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=status&id=${ids.join(',')}&key=${config.youtubeApiKey}`;
          const detailsData = await fetchJson(detailsUrl);
          const embeddableIds = new Set((detailsData.items || [])
            .filter(video => video.status?.embeddable && video.status?.privacyStatus !== 'private')
            .map(video => video.id));

          const ytResults = items.filter(item => embeddableIds.has(item.id.videoId)).map(item => ({
            id: 'yt_' + item.id.videoId,
            title: item.snippet.title.replace(/(&quot;|&#39;|&amp;)/g, ''),
            artist: item.snippet.channelTitle,
            album: 'YouTube',
            mood: mood || 'love',
            youtubeId: item.id.videoId,
            duration: 240,
            cover: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url,
            lyricsSnippet: '',
            releaseYear: new Date().getFullYear(),
            plays: 0
          }));

          if (ytResults.length) return ytResults;
        }
      } catch (err) {
        console.warn('[SongService] YouTube search error:', err.message);
      }
    }

    // Fallback to curated tracks if YouTube is unavailable or all results are blocked.
    const dbResults = db.getSongs({ search: query, mood, limit: 10 });
    if (dbResults.length) return dbResults;
    return db.getSongs({ mood, limit: 10 });
  }
}

module.exports = new SongService();
