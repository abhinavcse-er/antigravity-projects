const NICKNAMES = [
  'Aashiq-Dil', 'Rafi-Ke-Diwane', 'Kishore-Fan', 'Ghalib-Ke-Shagird',
  'Sukoon-Seeker', 'Midnight-Chai', 'Purani-Jeans', 'Musafir-Azad',
  'Dil-Ki-Baatein', 'Pyaar-Tune-Kya-Kiya', 'Chai-Aur-Ghazal', 'Pahadon-Ka-Safar',
  'Nostalgia-Soul', 'Sufi-Sadhak', 'Bollywood-Geek', 'Raahi-Anjaan'
];

const AVATARS = ['🎶', '🥀', '☕', '🌧️', '✨', '🎸', '📻', '🌙', '🎧', '🚗'];

const VALID_MOODS = new Set([
  'love', 'dard', 'sukoon', 'safar', 'happy', 'late-night'
]);

class PresenceService {
  constructor() {
    // One entry per currently connected Socket.IO session.
    this.clients = new Map();
  }

  addClient(socketId, initialMood = 'love') {
    const nickname = NICKNAMES[Math.floor(Math.random() * NICKNAMES.length)] + '-' + Math.floor(10 + Math.random() * 90);
    const avatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
    const mood = VALID_MOODS.has(initialMood) ? initialMood : 'love';
    const clientData = {
      socketId,
      nickname,
      avatar,
      mood,
      joinedAt: Date.now()
    };
    this.clients.set(socketId, clientData);
    return clientData;
  }

  removeClient(socketId) {
    const client = this.clients.get(socketId) || null;
    this.clients.delete(socketId);
    return client;
  }

  updateClientMood(socketId, mood) {
    const client = this.clients.get(socketId);
    if (!client) return null;
    client.mood = VALID_MOODS.has(mood) ? mood : 'love';
    return client;
  }

  getClient(socketId) {
    return this.clients.get(socketId) || null;
  }

  getStats() {
    const moods = {
      love: 0,
      dard: 0,
      sukoon: 0,
      safar: 0,
      happy: 0,
      'late-night': 0
    };

    for (const client of this.clients.values()) {
      const mood = VALID_MOODS.has(client.mood) ? client.mood : 'love';
      moods[mood]++;
    }

    const total = this.clients.size;
    return {
      total,
      realConnected: total,
      moods
    };
  }
}

module.exports = new PresenceService();
