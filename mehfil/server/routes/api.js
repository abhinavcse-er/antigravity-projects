const express = require('express');
const router = express.Router();
const config = require('../config');
const db = require('../db/database');
const songService = require('../services/songService');
const presenceService = require('../services/presenceService');
const radioService = require('../services/radioService');

let presenceBroadcastTimer = null;


function createRateLimiter({ windowMs = 60000, max = 30, ipMultiplier = 10 } = {}) {
  const buckets = new Map();
  let operations = 0;
  return (req, res, next) => {
    const clientId = String(req.headers['x-user-id'] || '').slice(0, 100);
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const now = Date.now();
    const checks = [
      { key: 'client:' + (clientId || ip), limit: max },
      { key: 'ip:' + ip, limit: max * ipMultiplier }
    ];
    if ((++operations & 255) === 0) {
      for (const [key, bucket] of buckets) {
        if (now - bucket.startedAt >= windowMs) buckets.delete(key);
      }
    }
    for (const check of checks) {
      let bucket = buckets.get(check.key);
      if (!bucket || now - bucket.startedAt >= windowMs) {
        bucket = { startedAt: now, count: 0 };
        buckets.set(check.key, bucket);
      }
      bucket.count++;
      if (bucket.count > check.limit) {
        res.setHeader('Retry-After', String(Math.max(1, Math.ceil((windowMs - (now - bucket.startedAt)) / 1000))));
        return res.status(429).json({ error: 'Too many requests. Please try again shortly.' });
      }
    }
    next();
  };
}
const writeLimiter = createRateLimiter({ windowMs: 60000, max: 30 });
const heartbeatLimiter = createRateLimiter({ windowMs: 60000, max: 6, ipMultiplier: 1000 });
const validMoods = new Set(['love', 'dard', 'sukoon', 'safar', 'happy', 'late-night']);
const validClientId = value => /^[a-zA-Z0-9_-]{6,100}$/.test(String(value || ''));


function schedulePresenceBroadcast(io) {
  if (!io || presenceBroadcastTimer) return;
  presenceBroadcastTimer = setTimeout(() => {
    presenceBroadcastTimer = null;
    io.emit('presence:update', presenceService.getStats());
  }, 500);
}


 // POST /api/presence/heartbeat
// HTTP heartbeat keeps the live audience accurate when a device's WebSocket
// is blocked or temporarily reconnecting. The device ID is shared with Socket.IO.
router.post('/presence/heartbeat', heartbeatLimiter, (req, res) => {
  const clientKey = String(req.headers['x-user-id'] || '').trim();
  if (!/^[a-zA-Z0-9_-]{6,100}$/.test(clientKey)) {
    return res.status(400).json({ error: 'A valid client ID is required' });
  }

  const mood = String(req.body?.mood || 'love');
  const stats = presenceService.heartbeat(clientKey, mood);
  schedulePresenceBroadcast(req.app.get('io'));
  res.json({ ok: true, stats });
});

// GET /api/status
router.get('/status', (req, res) => {
  const stats = presenceService.getStats();
  const radio = radioService.getCurrentState();
  res.json({
    status: 'online',
    appName: 'MEHFIL',
    tagline: 'Jahan Har Mood Ka Ek Gaana Hai',
    listeners: stats.total,
    moods: stats.moods,
    radio: {
      nowPlaying: radio.currentSong?.title,
      artist: radio.currentSong?.artist,
      elapsedSeconds: radio.elapsedSeconds
    }
  });
});

// GET /api/moods
router.get('/moods', (req, res) => {
  const stats = presenceService.getStats();
  const result = Object.values(config.moods).map(m => ({
    ...m,
    listeners: stats.moods[m.id] || 0
  }));
  res.json(result);
});

// GET /api/songs
router.get('/songs', async (req, res) => {
  try {
    const { mood, search, limit } = req.query;
    if (search && search.trim()) {
      const results = await songService.searchSongs(search.trim(), mood);
      return res.json(results);
    }
    const songs = songService.getSongs({ mood, search, limit: limit ? Number(limit) : 50 });
    res.json(songs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch songs', details: err.message });
  }
});

// GET /api/songs/random
router.get('/songs/random', (req, res) => {
  const { mood } = req.query;
  const song = songService.getRandomSong(mood);
  if (!song) return res.status(404).json({ error: 'No songs found' });
  res.json(song);
});

// GET /api/songs/:id
router.get('/songs/:id', (req, res) => {
  const song = songService.getSongById(req.params.id);
  if (!song) return res.status(404).json({ error: 'Song not found' });
  res.json(song);
});

// POST /api/songs/:id/play
router.post('/songs/:id/play', writeLimiter, (req, res) => {
  const userId = String(req.headers['x-user-id'] || '').trim();
  songService.recordPlay(
    req.params.id,
    validClientId(userId) ? userId : null,
    validMoods.has(req.body?.mood) ? req.body.mood : null
  );
  res.json({ success: true });
});

// GET /api/radio/personalized
// Recommendations are private to the browser's MEHFIL client ID.
router.get('/radio/personalized', (req, res) => {
  const userId = String(req.headers['x-user-id'] || '').trim();
  if (!validClientId(userId)) {
    return res.status(400).json({ error: 'A valid client ID is required' });
  }

  const mood = validMoods.has(req.query.mood) ? req.query.mood : 'love';
  const requestedLimit = Number(req.query.limit) || 20;
  const limit = Math.max(1, Math.min(30, Math.floor(requestedLimit)));
  const recentSongIds = String(req.query.recent || '')
    .split(',')
    .map(Number)
    .filter(id => Number.isInteger(id) && id > 0)
    .slice(0, 12);
  const songs = songService.getPersonalizedSongs(userId, mood, limit, recentSongIds);
  const hasHistory = db.getListeningHistory(userId, 1).length > 0;
  const hasFavorites = db.getFavorites(userId).length > 0;

  res.setHeader('Cache-Control', 'private, no-store');
  res.json({
    songs,
    profile: {
      mood,
      basedOnHistory: hasHistory,
      basedOnFavorites: hasFavorites,
      personalized: hasHistory || hasFavorites
    }
  });
});

// GET /api/radio
router.get('/radio', (req, res) => {
  res.json(radioService.getCurrentState());
});

// GET /api/requests
router.get('/requests', (req, res) => {
  res.json(db.getRequests());
});

// POST /api/requests
router.post('/requests', writeLimiter, (req, res) => {
  const { songTitle, artist, mood, requesterName, dedication } = req.body || {};
  if (typeof songTitle !== 'string' || !songTitle.trim()) {
    return res.status(400).json({ error: 'Song title is required' });
  }
  const newRequest = db.addRequest({
    songTitle: songTitle.trim().slice(0, 160),
    artist: typeof artist === 'string' ? artist.trim().slice(0, 100) : '',
    mood: validMoods.has(mood) ? mood : 'love',
    requesterName: typeof requesterName === 'string' ? requesterName.trim().slice(0, 60) || 'Mehfil Dost' : 'Mehfil Dost',
    dedication: typeof dedication === 'string' ? dedication.trim().slice(0, 500) : ''
  });

  // Broadcast to all sockets via app-level io
  if (req.app.get('io')) {
    req.app.get('io').emit('request:new', newRequest);
  }

  res.status(201).json(newRequest);
});

// POST /api/requests/:id/vote
router.post('/requests/:id/vote', writeLimiter, (req, res) => {
  const updated = db.voteRequest(req.params.id);
  if (!updated) return res.status(404).json({ error: 'Request not found' });

  if (req.app.get('io')) {
    req.app.get('io').emit('request:vote', updated);
  }

  res.json(updated);
});

// GET /api/community
router.get('/community', (req, res) => {
  res.json(db.getCommunityMessages());
});

// POST /api/community
router.post('/community', writeLimiter, (req, res) => {
  const { userName, userAvatar, mood, text, isShayari } = req.body || {};
  if (typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Message text cannot be empty' });
  }

  const newMsg = db.addCommunityMessage({
    userName: typeof userName === 'string' ? userName.trim().slice(0, 60) || 'Musafir' : 'Musafir',
    userAvatar: typeof userAvatar === 'string' ? userAvatar.slice(0, 12) : '🎶',
    mood: validMoods.has(mood) ? mood : 'love',
    text: text.trim().slice(0, 1000),
    isShayari: !!isShayari
  });

  if (req.app.get('io')) {
    req.app.get('io').emit('community:message', newMsg);
  }

  res.status(201).json(newMsg);
});

// POST /api/community/:id/like
router.post('/community/:id/like', writeLimiter, (req, res) => {
  const updated = db.likeCommunityMessage(req.params.id);
  if (!updated) return res.status(404).json({ error: 'Message not found' });

  if (req.app.get('io')) {
    req.app.get('io').emit('community:like', updated);
  }

  res.json(updated);
});

// GET /api/favorites
router.get('/favorites', (req, res) => {
  const userId = String(req.headers['x-user-id'] || '');
  if (!validClientId(userId)) return res.status(400).json({ error: 'A valid client ID is required' });
  res.json(db.getFavorites(userId));
});

// POST /api/favorites
router.post('/favorites', writeLimiter, (req, res) => {
  const userId = String(req.headers['x-user-id'] || '');
  const { songId } = req.body || {};
  if (!validClientId(userId)) return res.status(400).json({ error: 'A valid client ID is required' });
  if (!Number.isInteger(Number(songId)) || Number(songId) < 1) return res.status(400).json({ error: 'A valid songId is required' });

  const result = db.toggleFavorite(userId, songId);
  res.json(result);
});

module.exports = router;
