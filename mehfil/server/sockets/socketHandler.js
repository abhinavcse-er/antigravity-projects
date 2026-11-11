const presenceService = require('../services/presenceService');
const radioService = require('../services/radioService');
const db = require('../db/database');

let presenceBroadcastTimer = null;

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
    const client = presenceService.addClient(socket.id, initialMood);

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
      const client = presenceService.getClient(socket.id);
      const text = typeof data.text === 'string' ? data.text.trim().slice(0, 1000) : '';
      if (!text) return;
      const newMsg = db.addCommunityMessage({
        userName: String(data.userName || client?.nickname || 'Musafir').slice(0, 60),
        userAvatar: data.userAvatar || client?.avatar || '🎶',
        mood: data.mood || client?.mood || 'love',
        text,
        isShayari: !!data.isShayari
      });
      io.emit('community:message', newMsg);
    });

    socket.on('community:reaction', (reaction = {}) => {
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
      const updated = db.voteRequest(requestId);
      if (updated) io.emit('request:vote', updated);
    });

    socket.on('radio:sync', (callback) => {
      if (typeof callback === 'function') callback(radioService.getCurrentState());
    });

    socket.on('disconnect', () => {
      presenceService.removeClient(socket.id);
      schedulePresenceBroadcast(io);
    });
  });
}

module.exports = setupSockets;
