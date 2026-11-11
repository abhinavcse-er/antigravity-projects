const NICKNAMES = [
  'Aashiq-Dil', 'Rafi-Ke-Diwane', 'Kishore-Fan', 'Ghalib-Ke-Shagird',
  'Sukoon-Seeker', 'Midnight-Chai', 'Purani-Jeans', 'Musafir-Azad',
  'Dil-Ki-Baatein', 'Pyaar-Tune-Kya-Kiya', 'Chai-Aur-Ghazal', 'Pahadon-Ka-Safar',
  'Nostalgia-Soul', 'Sufi-Sadhak', 'Bollywood-Geek', 'Raahi-Anjaan'
];

const AVATARS = ['🎶', '🥀', '☕', '🌧️', '✨', '🎸', '📻', '🌙', '🎧', '🚗'];

// Baseline active listeners to simulate a vibrant live radio room
const BASE_LISTENERS = 1240;

class PresenceService {
  constructor() {
    this.clients = new Map(); // socketId -> { id, nickname, avatar, mood, joinedAt }
  }

  addClient(socketId, initialMood = 'love') {
    const nickname = NICKNAMES[Math.floor(Math.random() * NICKNAMES.length)] + '-' + Math.floor(10 + Math.random() * 90);
    const avatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
    const clientData = {
      socketId,
      nickname,
      avatar,
      mood: initialMood || 'love',
      joinedAt: Date.now()
    };
    this.clients.set(socketId, clientData);
    return clientData;
  }

  removeClient(socketId) {
    const client = this.clients.get(socketId);
    this.clients.delete(socketId);
    return client;
  }

  updateClientMood(socketId, mood) {
    const client = this.clients.get(socketId);
    if (client) {
      client.mood = mood;
      return client;
    }
    return null;
  }

  getClient(socketId) {
    return this.clients.get(socketId) || null;
  }

  getStats() {
    const realCount = this.clients.size;
    const total = BASE_LISTENERS + realCount;

    // Calculate real mood distribution
    const moodCounts = {
      love: 0,
      dard: 0,
      sukoon: 0,
      safar: 0,
      happy: 0,
      'late-night': 0
    };

    // Distribute base listeners proportionally
    const baseDistribution = {
      love: Math.round(BASE_LISTENERS * 0.28),
      dard: Math.round(BASE_LISTENERS * 0.19),
      sukoon: Math.round(BASE_LISTENERS * 0.22),
      safar: Math.round(BASE_LISTENERS * 0.12),
      happy: Math.round(BASE_LISTENERS * 0.10),
      'late-night': Math.round(BASE_LISTENERS * 0.09)
    };

    Object.assign(moodCounts, baseDistribution);

    // Add active real clients
    for (const client of this.clients.values()) {
      if (moodCounts[client.mood] !== undefined) {
        moodCounts[client.mood]++;
      } else {
        moodCounts.love++;
      }
    }

    return {
      total,
      realConnected: realCount,
      moods: moodCounts
    };
  }
}

module.exports = new PresenceService();
