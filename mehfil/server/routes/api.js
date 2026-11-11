const express = require('express');
const router = express.Router();
const config = require('../config');
const db = require('../db/database');
const songService = require('../services/songService');
const presenceService = require('../services/presenceService');
const radioService = require('../services/radioService');

let presenceBroadcastTimer = null;

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
router.post('/presence/heartbeat', (req, res) => {
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
router.post('/songs/:id/play', (req, res) => {
  songService.recordPlay(req.params.id);
  res.json({ success: true });
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
router.post('/requests', (req, res) => {
  const { songTitle, artist, mood, requesterName, dedication } = req.body;
  if (!songTitle || !songTitle.trim()) {
    return res.status(400).json({ error: 'Song title is required' });
  }
  const newRequest = db.addRequest({
    songTitle: songTitle.trim(),
    artist: (artist || '').trim(),
    mood: mood || 'love',
    requesterName: (requesterName || '').trim() || 'Mehfil Dost',
    dedication: (dedication || '').trim()
  });

  // Broadcast to all sockets via app-level io
  if (req.app.get('io')) {
    req.app.get('io').emit('request:new', newRequest);
  }

  res.status(201).json(newRequest);
});

// POST /api/requests/:id/vote
router.post('/requests/:id/vote', (req, res) => {
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
router.post('/community', (req, res) => {
  const { userName, userAvatar, mood, text, isShayari } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Message text cannot be empty' });
  }

  const newMsg = db.addCommunityMessage({
    userName: (userName || '').trim() || 'Musafir',
    userAvatar: userAvatar || '🎶',
    mood: mood || 'love',
    text: text.trim(),
    isShayari: !!isShayari
  });

  if (req.app.get('io')) {
    req.app.get('io').emit('community:message', newMsg);
  }

  res.status(201).json(newMsg);
});

// POST /api/community/:id/like
router.post('/community/:id/like', (req, res) => {
  const updated = db.likeCommunityMessage(req.params.id);
  if (!updated) return res.status(404).json({ error: 'Message not found' });

  if (req.app.get('io')) {
    req.app.get('io').emit('community:like', updated);
  }

  res.json(updated);
});

// GET /api/favorites
router.get('/favorites', (req, res) => {
  const userId = req.headers['x-user-id'] || 'guest_user';
  res.json(db.getFavorites(userId));
});

// POST /api/favorites
router.post('/favorites', (req, res) => {
  const userId = req.headers['x-user-id'] || 'guest_user';
  const { songId } = req.body;
  if (!songId) return res.status(400).json({ error: 'songId is required' });

  const result = db.toggleFavorite(userId, songId);
  res.json(result);
});

module.exports = router;
