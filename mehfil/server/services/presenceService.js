const NICKNAMES = [
  'Aashiq-Dil', 'Rafi-Ke-Diwane', 'Kishore-Fan', 'Ghalib-Ke-Shagird',
  'Sukoon-Seeker', 'Midnight-Chai', 'Purani-Jeans', 'Musafir-Azad',
  'Dil-Ki-Baatein', 'Pyaar-Tune-Kya-Kiya', 'Chai-Aur-Ghazal', 'Pahadon-Ka-Safar',
  'Nostalgia-Soul', 'Sufi-Sadhak', 'Bollywood-Geek', 'Raahi-Anjaan'
];

const AVATARS = ['🎶', '🥀', '☕', '🌧️', '✨', '🎸', '📻', '🌙', '🎧', '🚗'];
const HEARTBEAT_TTL_MS = 70000;

const VALID_MOODS = new Set([
  'love', 'dard', 'sukoon', 'safar', 'happy', 'late-night'
]);

class PresenceService {
  constructor() {
    // One active entry per browser/device ID. Socket and HTTP heartbeat
    // sessions share the same key, so they never inflate the live count.
    this.clients = new Map();
    this.socketToClient = new Map();
  }

  createClient(clientKey, initialMood = 'love') {
    const nickname = NICKNAMES[Math.floor(Math.random() * NICKNAMES.length)] + '-' + Math.floor(10 + Math.random() * 90);
    const avatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
    return {
      clientKey,
      nickname,
      avatar,
      mood: VALID_MOODS.has(initialMood) ? initialMood : 'love',
      joinedAt: Date.now(),
      lastSeen: Date.now(),
      socketIds: new Set()
    };
  }

  addClient(socketId, initialMood = 'love', clientKey = socketId) {
    const key = String(clientKey || socketId).slice(0, 100);
    let client = this.clients.get(key);
    if (!client) {
      client = this.createClient(key, initialMood);
      this.clients.set(key, client);
    }

    client.mood = VALID_MOODS.has(initialMood) ? initialMood : client.mood;
    client.lastSeen = Date.now();
    client.socketIds.add(socketId);
    this.socketToClient.set(socketId, key);
    return this.toPublicClient(client, socketId);
  }

  heartbeat(clientKey, mood = 'love') {
    const key = String(clientKey || '').trim().slice(0, 100);
    if (!key) return null;

    let client = this.clients.get(key);
    if (!client) {
      client = this.createClient(key, mood);
      this.clients.set(key, client);
    }

    if (VALID_MOODS.has(mood)) client.mood = mood;
    client.lastSeen = Date.now();
    return this.getStats();
  }

  removeClient(socketId) {
    const key = this.socketToClient.get(socketId);
    if (!key) return null;

    this.socketToClient.delete(socketId);
    const client = this.clients.get(key);
    if (!client) return null;

    client.socketIds.delete(socketId);
    if (client.socketIds.size === 0 && Date.now() - client.lastSeen > HEARTBEAT_TTL_MS) {
      this.clients.delete(key);
    }
    return this.toPublicClient(client);
  }

  updateClientMood(socketId, mood) {
    const key = this.socketToClient.get(socketId);
    const client = key ? this.clients.get(key) : null;
    if (!client) return null;
    client.mood = VALID_MOODS.has(mood) ? mood : 'love';
    client.lastSeen = Date.now();
    return this.toPublicClient(client, socketId);
  }

  getClient(socketId) {
    const key = this.socketToClient.get(socketId);
    const client = key ? this.clients.get(key) : null;
    return client ? this.toPublicClient(client, socketId) : null;
  }

  toPublicClient(client, socketId = null) {
    return {
      socketId,
      nickname: client.nickname,
      avatar: client.avatar,
      mood: client.mood,
      joinedAt: client.joinedAt
    };
  }

  getStats() {
    const now = Date.now();
    for (const [key, client] of this.clients.entries()) {
      if (client.socketIds.size === 0 && now - client.lastSeen > HEARTBEAT_TTL_MS) {
        this.clients.delete(key);
      }
    }

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
    return { total, realConnected: total, moods };
  }
}

module.exports = new PresenceService();
