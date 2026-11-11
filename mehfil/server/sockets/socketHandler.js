const presenceService = require('../services/presenceService');
const radioService = require('../services/radioService');
const db = require('../db/database');

function setupSockets(io) {
  io.on('connection', (socket) => {
    // Register new listener
    const initialMood = socket.handshake.query.mood || 'love';
    const client = presenceService.addClient(socket.id, initialMood);

    console.log(`[SOCKET] Listener joined: ${client.nickname} (${client.mood}) [Total active: ${presenceService.clients.size}]`);

    // Send welcome packet with their identity and current stats
    socket.emit('presence:welcome', {
      user: client,
      stats: presenceService.getStats(),
      radio: radioService.getCurrentState()
    });

    // Broadcast updated audience stats to all listeners
    io.emit('presence:update', presenceService.getStats());

    // User switches mood
    socket.on('mood:change', (newMood) => {
      const updated = presenceService.updateClientMood(socket.id, newMood);
      if (updated) {
        // Broadcast new audience distribution
        io.emit('presence:update', presenceService.getStats());
      }
    });

    // User sends community chat / shayari
    socket.on('community:message', (data) => {
      const client = presenceService.getClient(socket.id);
      const newMsg = db.addCommunityMessage({
        userName: data.userName || client?.nickname || 'Musafir',
        userAvatar: data.userAvatar || client?.avatar || '🎶',
        mood: data.mood || client?.mood || 'love',
        text: data.text,
        isShayari: !!data.isShayari
      });
      io.emit('community:message', newMsg);
    });

    // User clicks a live reaction (floating heart/flower/tea)
    socket.on('community:reaction', (reaction) => {
      const client = presenceService.getClient(socket.id);
      io.emit('community:reaction', {
        reaction: reaction.type || '❤️',
        user: client?.nickname || 'Dost',
        timestamp: Date.now()
      });
    });

    // User requests a song
    socket.on('request:new', (data) => {
      const client = presenceService.getClient(socket.id);
      const newRequest = db.addRequest({
        songTitle: data.songTitle,
        artist: data.artist,
        mood: data.mood || client?.mood || 'love',
        requesterName: data.requesterName || client?.nickname || 'Mehfil Dost',
        dedication: data.dedication
      });
      io.emit('request:new', newRequest);
    });

    // User votes on a request
    socket.on('request:vote', (requestId) => {
      const updated = db.voteRequest(requestId);
      if (updated) {
        io.emit('request:vote', updated);
      }
    });

    // Radio sync request
    socket.on('radio:sync', (callback) => {
      if (typeof callback === 'function') {
        callback(radioService.getCurrentState());
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      const removed = presenceService.removeClient(socket.id);
      if (removed) {
        console.log(`[SOCKET] Listener left: ${removed.nickname} [Active: ${presenceService.clients.size}]`);
        io.emit('presence:update', presenceService.getStats());
      }
    });
  });
}

module.exports = setupSockets;
