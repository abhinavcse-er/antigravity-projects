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
    const cacheKey = `${mood || 'all'}_${query}`.toLowerCase();
    if (searchCache.has(cacheKey)) return searchCache.get(cacheKey);

    // Search YouTube first so users can find tracks outside the local catalogue.
    if (config.youtubeApiKey) {
      try {
        const searchQuery = `${query} Hindi song`;
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&videoCategoryId=10&maxResults=10&key=${config.youtubeApiKey}`;
        const searchResp = await fetch(searchUrl);
        const searchData = await searchResp.json();
        if (!searchResp.ok) throw new Error(searchData.error?.message || `YouTube search HTTP ${searchResp.status}`);

        const items = Array.isArray(searchData.items) ? searchData.items : [];
        const ids = items.map(item => item.id?.videoId).filter(Boolean);
        if (ids.length) {
          // Search results can include videos whose owners have disabled embeds.
          const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=status&id=${ids.join(',')}&key=${config.youtubeApiKey}`;
          const detailsResp = await fetch(detailsUrl);
          const detailsData = await detailsResp.json();
          if (!detailsResp.ok) throw new Error(detailsData.error?.message || `YouTube details HTTP ${detailsResp.status}`);
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

          if (ytResults.length) {
            searchCache.set(cacheKey, ytResults);
            return ytResults;
          }
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
