const db = require('../db/database');
const config = require('../config');

// Short-lived cache + in-flight deduplication protects the YouTube API quota.
const searchCache = new Map();
const pendingSearches = new Map();
const CACHE_TTL_MS = 2 * 60 * 1000;
const CACHE_MAX_ENTRIES = 150;

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

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function scoreResult(query, title, artist) {
  const q = normalize(query);
  const t = normalize(title);
  const a = normalize(artist);
  if (!q || !t) return 0;

  let score = 0;
  if (t === q) score += 120;
  else if (t.startsWith(q)) score += 95;
  else if (t.includes(q)) score += 78;
  if (a === q) score += 85;
  else if (a.includes(q)) score += 55;

  const tokens = q.split(' ').filter(token => token.length > 1);
  if (tokens.length) {
    const titleHits = tokens.filter(token => t.includes(token)).length;
    const artistHits = tokens.filter(token => a.includes(token)).length;
    score += Math.round((titleHits / tokens.length) * 48);
    score += Math.round((artistHits / tokens.length) * 24);
  }

  const requested = q;
  if (/\b(official|audio|video|lyrics|lyrical|song|songs|music)\b/.test(t)) score += 4;
  if (!/\b(shorts?)\b/.test(requested) && /\bshorts?\b/.test(t)) score -= 35;
  if (!/\blive\b/.test(requested) && /\blive\b/.test(t)) score -= 12;
  if (!/\b(cover|karaoke|instrumental)\b/.test(requested) && /\b(cover|karaoke|instrumental)\b/.test(t)) score -= 18;
  if (!/\b(remix|slowed|reverb|lofi)\b/.test(requested) && /\b(slowed|reverb|lofi)\b/.test(t)) score -= 12;
  return score;
}

function parseDuration(isoDuration) {
  const match = String(isoDuration || '').match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return 240;
  return (Number(match[1] || 0) * 3600) + (Number(match[2] || 0) * 60) + Number(match[3] || 0);
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
    if (!normalizedQuery || normalizedQuery.length < 2) return [];

    const cacheKey = `${mood || 'all'}_${normalize(normalizedQuery)}`;
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
    if (config.youtubeApiKey) {
      try {
        // Search the exact phrase. Do not append generic words such as "Hindi song":
        // that broadens the query and often pushes unrelated uploads into suggestions.
        const params = new URLSearchParams({
          part: 'snippet',
          q: query,
          type: 'video',
          order: 'relevance',
          regionCode: 'IN',
          relevanceLanguage: 'hi',
          safeSearch: 'strict',
          videoEmbeddable: 'true',
          videoSyndicated: 'true',
          maxResults: '20',
          key: config.youtubeApiKey
        });
        const searchData = await fetchJson(`https://www.googleapis.com/youtube/v3/search?${params}`);
        const items = Array.isArray(searchData.items) ? searchData.items : [];
        const ids = items.map(item => item.id?.videoId).filter(Boolean);

        if (ids.length) {
          const detailsParams = new URLSearchParams({
            part: 'status,contentDetails',
            id: ids.join(','),
            key: config.youtubeApiKey
          });
          const detailsData = await fetchJson(`https://www.googleapis.com/youtube/v3/videos?${detailsParams}`);
          const detailsById = new Map((detailsData.items || []).map(video => [video.id, video]));

          const ranked = items
            .map(item => {
              const videoId = item.id?.videoId;
              const details = detailsById.get(videoId);
              if (!videoId || !details?.status?.embeddable || details.status.privacyStatus !== 'public') return null;

              const title = String(item.snippet?.title || '').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
              const artist = item.snippet?.channelTitle || 'Unknown artist';
              const score = scoreResult(query, title, artist);
              if (score < 18) return null;

              return {
                id: 'yt_' + videoId,
                title,
                artist,
                album: 'YouTube',
                mood: mood || 'love',
                youtubeId: videoId,
                duration: parseDuration(details.contentDetails?.duration),
                cover: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || '',
                lyricsSnippet: '',
                releaseYear: item.snippet?.publishedAt ? new Date(item.snippet.publishedAt).getFullYear() : new Date().getFullYear(),
                plays: 0,
                searchScore: score
              };
            })
            .filter(Boolean)
            .sort((a, b) => b.searchScore - a.searchScore);

          const unique = [];
          const seen = new Set();
          for (const song of ranked) {
            const key = normalize(song.title);
            if (seen.has(key)) continue;
            seen.add(key);
            delete song.searchScore;
            unique.push(song);
            if (unique.length === 8) break;
          }
          if (unique.length) return unique;
        }
      } catch (err) {
        console.warn('[SongService] YouTube search error:', err.message);
      }
    }

    // Use only genuinely matching catalogue tracks. Never fill the dropdown with
    // random songs from the current mood when the query has no match.
    const dbResults = db.getSongs({ search: query, mood: mood || 'all', limit: 30 });
    return dbResults
      .map(song => ({ ...song, searchScore: scoreResult(query, song.title, song.artist) }))
      .filter(song => song.searchScore >= 18)
      .sort((a, b) => b.searchScore - a.searchScore)
      .slice(0, 8)
      .map(({ searchScore, ...song }) => song);
  }
}

module.exports = new SongService();
