const presenceService = require('../services/presenceService');
const radioService = require('../services/radioService');
const db = require('../db/database');
const communityService = require('../services/communityService');

let presenceBroadcastTimer = null;
const socketEventWindows = new Map();

function allowSocketEvent(socket, eventName, max = 8, windowMs = 10000) {
  const now = Date.now();
  const key = socket.id + ':' + eventName;
  let bucket = socketEventWindows.get(key);
  if (!bucket || now - bucket.startedAt >= windowMs) {
    bucket = { startedAt: now, count: 0 };
    socketEventWindows.set(key, bucket);
  }
  bucket.count++;
  return bucket.count <= max;
}

// Coalesce connection and mood bursts into one audience update instead of
// broadcasting a full presence snapshot for every individual socket event.
function schedulePresenceBroadcast(io) {
  if (presenceBroadcastTimer) return;
  presenceBroadcastTimer = setTimeout(() => {
    presenceBroadcastTimer = null;
    io.emit('presence:update', presenceService.getStats());
  }, 300);
}

function setupSockets(io) {
  io.on('connection', (socket) => {
    const initialMood = socket.handshake.query.mood || 'love';
    const clientKey = socket.handshake.auth?.userId || socket.handshake.query.userId || socket.id;
    const client = presenceService.addClient(socket.id, initialMood, clientKey);

    // The joining client receives its own current snapshot in the welcome event.
    socket.emit('presence:welcome', {
      user: client,
      stats: presenceService.getStats(),
      radio: radioService.getCurrentState()
    });
    schedulePresenceBroadcast(io);

    socket.on('mood:change', (newMood) => {
      const updated = presenceService.updateClientMood(socket.id, newMood);
      if (updated) schedulePresenceBroadcast(io);
    });

    socket.on('community:message', (data = {}) => {
      if (!allowSocketEvent(socket, 'community:message', 5)) return;
      const client = presenceService.getClient(socket.id);
      const message = communityService.normalizeCommunityMessage(data, {
        userName: client?.nickname || 'Musafir',
        userAvatar: client?.avatar || '🎶',
        mood: client?.mood || 'love'
      });
      if (!message) return;

      try {
        const newMsg = db.addCommunityMessage(message);
        if (newMsg) io.emit('community:message', newMsg);
      } catch (error) {
        console.error('[COMMUNITY] Socket message could not be saved:', error);
      }
    });

    socket.on('community:reaction', (reaction = {}) => {
      if (!allowSocketEvent(socket, 'community:reaction', 12)) return;
      const client = presenceService.getClient(socket.id);
      const allowedReactions = new Set(['❤️', '☕', '🎶', '🌧️', '🥀', '🔥']);
      const value = allowedReactions.has(reaction.type) ? reaction.type : '❤️';
      io.emit('community:reaction', {
        reaction: value,
        user: client?.nickname || 'Dost',
        timestamp: Date.now()
      });
    });

    socket.on('request:new', (data = {}) => {
      if (!allowSocketEvent(socket, 'request:new', 3, 60000)) return;
      const client = presenceService.getClient(socket.id);
      const songTitle = typeof data.songTitle === 'string' ? data.songTitle.trim().slice(0, 160) : '';
      if (!songTitle) return;
      const newRequest = db.addRequest({
        songTitle,
        artist: String(data.artist || '').slice(0, 100),
        mood: data.mood || client?.mood || 'love',
        requesterName: String(data.requesterName || client?.nickname || 'Mehfil Dost').slice(0, 60),
        dedication: String(data.dedication || '').slice(0, 500)
      });
      io.emit('request:new', newRequest);
    });

    socket.on('request:vote', (requestId) => {
      if (!allowSocketEvent(socket, 'request:vote', 10)) return;
      const updated = db.voteRequest(requestId);
      if (updated) io.emit('request:vote', updated);
    });

    socket.on('radio:sync', (callback) => {
      if (typeof callback === 'function') callback(radioService.getCurrentState());
    });

    socket.on('disconnect', () => {
      for (const key of socketEventWindows.keys()) {
        if (key.startsWith(socket.id + ':')) socketEventWindows.delete(key);
      }
      presenceService.removeClient(socket.id);
      schedulePresenceBroadcast(io);
    });
  });
}

module.exports = setupSockets;
