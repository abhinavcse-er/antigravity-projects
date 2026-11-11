const db = require('../db/database');
const config = require('../config');

// In-memory cache for search queries
const searchCache = new Map();

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
    // 1. Search database first
    const dbResults = db.getSongs({ search: query, mood, limit: 10 });
    if (dbResults.length > 0) {
      return dbResults;
    }

    // 2. If YouTube API Key is configured, search YouTube on backend and cache
    if (config.youtubeApiKey) {
      const cacheKey = `${mood || 'all'}_${query}`.toLowerCase();
      if (searchCache.has(cacheKey)) {
        return searchCache.get(cacheKey);
      }

      try {
        const searchQuery = `${query} Hindi song audio`;
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&videoCategoryId=10&maxResults=8&key=${config.youtubeApiKey}`;
        const resp = await fetch(url);
        const data = await resp.json();

        if (data.items && data.items.length) {
          const ytResults = data.items.map((item, idx) => ({
            id: 'yt_' + item.id.videoId,
            title: item.snippet.title.replace(/(&quot;|&#39;|&amp;)/g, ''),
            artist: item.snippet.channelTitle,
            album: 'YouTube',
            mood: mood || 'love',
            youtubeId: item.id.videoId,
            duration: 240,
            cover: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url,
            lyricsSnippet: item.snippet.description || '',
            releaseYear: new Date().getFullYear(),
            plays: 50
          }));

          searchCache.set(cacheKey, ytResults);
          return ytResults;
        }
      } catch (err) {
        console.warn('[SongService] YouTube search error:', err.message);
      }
    }

    // 3. Fallback to all matching mood songs
    return db.getSongs({ mood, limit: 10 });
  }
}

module.exports = new SongService();
