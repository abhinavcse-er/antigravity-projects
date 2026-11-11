const path = require('path');
const fs = require('fs');
const { seedSongs, seedCommunityMessages, seedRequests } = require('./seedData');

let db = null;
let isNativeSqlite = false;
let memoryStore = null;

const defaultDbFilePath = path.join(__dirname, 'mehfil.db');
const dbFilePath = process.env.DB_PATH ? path.resolve(process.env.DB_PATH) : defaultDbFilePath;
const jsonBackupPath = process.env.DB_PATH
  ? path.join(path.dirname(dbFilePath), 'mehfil-store.json')
  : path.join(__dirname, 'mehfil-store.json');

if (process.env.DB_PATH) {
  fs.mkdirSync(path.dirname(dbFilePath), { recursive: true });
  // Preserve an existing local SQLite file when moving to a newly mounted disk.
  if (dbFilePath !== defaultDbFilePath && !fs.existsSync(dbFilePath) && fs.existsSync(defaultDbFilePath)) {
    fs.copyFileSync(defaultDbFilePath, dbFilePath);
    console.log('[DB] Copied the existing SQLite database to the configured persistent path.');
  }
}

// Initialize database
function initDatabase() {
  try {
    const { DatabaseSync } = require('node:sqlite');
    db = new DatabaseSync(dbFilePath);
    isNativeSqlite = true;
    try {
      db.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON;');
    } catch (pragmaError) {
      console.warn('[DB] SQLite tuning pragma unavailable; continuing with safe defaults.', pragmaError.message);
    }
    console.log('[DB] Using high-performance Node built-in SQLite engine.');
    setupSqliteSchema();
  } catch (err) {
    console.warn('[DB] node:sqlite unavailable, falling back to JSON file storage.', err.message);
    isNativeSqlite = false;
    setupJsonStore();
  }
}

function setupSqliteSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS songs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      artist TEXT NOT NULL,
      album TEXT,
      mood TEXT NOT NULL,
      youtubeId TEXT NOT NULL,
      backupId TEXT,
      duration INTEGER DEFAULT 0,
      cover TEXT,
      lyricsSnippet TEXT,
      releaseYear INTEGER DEFAULT 2020,
      plays INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      songTitle TEXT NOT NULL,
      artist TEXT,
      mood TEXT NOT NULL,
      requesterName TEXT,
      dedication TEXT,
      votes INTEGER DEFAULT 1,
      status TEXT DEFAULT 'pending',
      createdAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS community_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userName TEXT NOT NULL,
      userAvatar TEXT DEFAULT '🎶',
      mood TEXT DEFAULT 'love',
      text TEXT NOT NULL,
      isShayari INTEGER DEFAULT 0,
      likes INTEGER DEFAULT 0,
      timestamp INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT NOT NULL,
      songId INTEGER NOT NULL,
      createdAt INTEGER NOT NULL,
      UNIQUE(userId, songId)
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_songs_mood_plays ON songs(mood, plays DESC);
    CREATE INDEX IF NOT EXISTS idx_requests_votes_created ON requests(votes DESC, createdAt DESC);
    CREATE INDEX IF NOT EXISTS idx_community_timestamp ON community_messages(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_favorites_user_created ON favorites(userId, createdAt DESC);
  `);

  // Check if songs exist
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM songs');
  const { count } = countStmt.get();
  if (count === 0) {
    console.log('[DB] Seeding curated songs and initial community baithak...');
    const insertSong = db.prepare(`
      INSERT INTO songs (title, artist, album, mood, youtubeId, backupId, duration, cover, lyricsSnippet, releaseYear, plays)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const s of seedSongs) {
      insertSong.run(
        s.title,
        s.artist,
        s.album || '',
        s.mood,
        s.youtubeId,
        s.backupId || '',
        s.duration || 240,
        s.cover || '',
        s.lyricsSnippet || '',
        s.releaseYear || 2020,
        Math.floor(Math.random() * 500) + 120
      );
    }

    const insertMsg = db.prepare(`
      INSERT INTO community_messages (userName, userAvatar, mood, text, isShayari, likes, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    for (const m of seedCommunityMessages) {
      insertMsg.run(m.userName, m.userAvatar, m.mood, m.text, m.isShayari ? 1 : 0, m.likes, m.timestamp);
    }

    const insertReq = db.prepare(`
      INSERT INTO requests (songTitle, artist, mood, requesterName, dedication, votes, status, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const r of seedRequests) {
      insertReq.run(r.songTitle, r.artist, r.mood, r.requesterName, r.dedication, r.votes, r.status, r.createdAt);
    }
    console.log('[DB] Seed completed successfully!');
  }
}

// Fallback JSON store
function setupJsonStore() {
  if (fs.existsSync(jsonBackupPath)) {
    try {
      memoryStore = JSON.parse(fs.readFileSync(jsonBackupPath, 'utf8'));
    } catch {
      memoryStore = null;
    }
  }

  if (!memoryStore) {
    memoryStore = {
      songs: seedSongs.map((s, idx) => ({ ...s, id: idx + 1, plays: Math.floor(Math.random() * 500) + 120 })),
      community_messages: seedCommunityMessages.map((m, idx) => ({ ...m, id: idx + 1 })),
      requests: seedRequests.map((r, idx) => ({ ...r, id: idx + 1 })),
      favorites: []
    };
    persistJsonStore();
  }
}

function persistJsonStore() {
  if (!isNativeSqlite && memoryStore) {
    fs.writeFileSync(jsonBackupPath, JSON.stringify(memoryStore, null, 2), 'utf8');
  }
}

// API methods
const dbApi = {
  getSongs: ({ mood, search, limit = 50 }) => {
    if (isNativeSqlite) {
      let query = 'SELECT * FROM songs WHERE 1=1';
      const params = [];

      if (mood && mood !== 'all') {
        query += ' AND mood = ?';
        params.push(mood);
      }
      if (search && search.trim()) {
        query += ' AND (title LIKE ? OR artist LIKE ? OR album LIKE ?)';
        const term = `%${search.trim()}%`;
        params.push(term, term, term);
      }
      query += ' ORDER BY plays DESC LIMIT ?';
      params.push(Number(limit));

      return db.prepare(query).all(...params);
    } else {
      let list = memoryStore.songs;
      if (mood && mood !== 'all') {
        list = list.filter(s => s.mood === mood);
      }
      if (search && search.trim()) {
        const q = search.trim().toLowerCase();
        list = list.filter(s =>
          (s.title && s.title.toLowerCase().includes(q)) ||
          (s.artist && s.artist.toLowerCase().includes(q)) ||
          (s.album && s.album.toLowerCase().includes(q))
        );
      }
      return list.slice(0, limit);
    }
  },

  getSongById: (id) => {
    if (isNativeSqlite) {
      return db.prepare('SELECT * FROM songs WHERE id = ?').get(id) || null;
    } else {
      return memoryStore.songs.find(s => s.id === Number(id)) || null;
    }
  },

  getRandomSong: (mood) => {
    if (isNativeSqlite) {
      if (mood && mood !== 'all') {
        return db.prepare('SELECT * FROM songs WHERE mood = ? ORDER BY RANDOM() LIMIT 1').get(mood) || null;
      }
      return db.prepare('SELECT * FROM songs ORDER BY RANDOM() LIMIT 1').get() || null;
    } else {
      let list = memoryStore.songs;
      if (mood && mood !== 'all') {
        list = list.filter(s => s.mood === mood);
      }
      if (!list.length) return null;
      return list[Math.floor(Math.random() * list.length)];
    }
  },

  incrementPlays: (id) => {
    if (isNativeSqlite) {
      db.prepare('UPDATE songs SET plays = plays + 1 WHERE id = ?').run(id);
    } else {
      const s = memoryStore.songs.find(s => s.id === Number(id));
      if (s) {
        s.plays = (s.plays || 0) + 1;
        persistJsonStore();
      }
    }
  },

  getRequests: () => {
    if (isNativeSqlite) {
      return db.prepare('SELECT * FROM requests ORDER BY votes DESC, createdAt DESC LIMIT 30').all();
    } else {
      return [...memoryStore.requests].sort((a, b) => b.votes - a.votes || b.createdAt - a.createdAt).slice(0, 30);
    }
  },

  addRequest: ({ songTitle, artist, mood, requesterName, dedication }) => {
    const createdAt = Date.now();
    if (isNativeSqlite) {
      const stmt = db.prepare(`
        INSERT INTO requests (songTitle, artist, mood, requesterName, dedication, votes, status, createdAt)
        VALUES (?, ?, ?, ?, ?, 1, 'pending', ?)
      `);
      const info = stmt.run(
        songTitle,
        artist || 'Unknown',
        mood || 'love',
        requesterName || 'Mehfil Dost',
        dedication || '',
        createdAt
      );
      return db.prepare('SELECT * FROM requests WHERE id = ?').get(info.lastInsertRowid);
    } else {
      const newReq = {
        id: memoryStore.requests.length + 1,
        songTitle,
        artist: artist || 'Unknown',
        mood: mood || 'love',
        requesterName: requesterName || 'Mehfil Dost',
        dedication: dedication || '',
        votes: 1,
        status: 'pending',
        createdAt
      };
      memoryStore.requests.unshift(newReq);
      persistJsonStore();
      return newReq;
    }
  },

  voteRequest: (id) => {
    if (isNativeSqlite) {
      db.prepare('UPDATE requests SET votes = votes + 1 WHERE id = ?').run(id);
      return db.prepare('SELECT * FROM requests WHERE id = ?').get(id);
    } else {
      const req = memoryStore.requests.find(r => r.id === Number(id));
      if (req) {
        req.votes = (req.votes || 0) + 1;
        persistJsonStore();
      }
      return req;
    }
  },

  getCommunityMessages: (limit = 40) => {
    if (isNativeSqlite) {
      return db.prepare('SELECT * FROM community_messages ORDER BY timestamp DESC LIMIT ?').all(limit).reverse();
    } else {
      return [...memoryStore.community_messages].sort((a, b) => a.timestamp - b.timestamp).slice(-limit);
    }
  },

  addCommunityMessage: ({ userName, userAvatar, mood, text, isShayari }) => {
    const timestamp = Date.now();
    if (isNativeSqlite) {
      const stmt = db.prepare(`
        INSERT INTO community_messages (userName, userAvatar, mood, text, isShayari, likes, timestamp)
        VALUES (?, ?, ?, ?, ?, 0, ?)
      `);
      const info = stmt.run(
        userName || 'Musafir',
        userAvatar || '🎶',
        mood || 'love',
        text,
        isShayari ? 1 : 0,
        timestamp
      );
      return db.prepare('SELECT * FROM community_messages WHERE id = ?').get(info.lastInsertRowid);
    } else {
      const newMsg = {
        id: memoryStore.community_messages.length + 1,
        userName: userName || 'Musafir',
        userAvatar: userAvatar || '🎶',
        mood: mood || 'love',
        text,
        isShayari: !!isShayari,
        likes: 0,
        timestamp
      };
      memoryStore.community_messages.push(newMsg);
      persistJsonStore();
      return newMsg;
    }
  },

  likeCommunityMessage: (id) => {
    if (isNativeSqlite) {
      db.prepare('UPDATE community_messages SET likes = likes + 1 WHERE id = ?').run(id);
      return db.prepare('SELECT * FROM community_messages WHERE id = ?').get(id);
    } else {
      const msg = memoryStore.community_messages.find(m => m.id === Number(id));
      if (msg) {
        msg.likes = (msg.likes || 0) + 1;
        persistJsonStore();
      }
      return msg;
    }
  },

  getFavorites: (userId) => {
    if (isNativeSqlite) {
      return db.prepare(`
        SELECT s.*, f.createdAt as favoritedAt
        FROM favorites f
        JOIN songs s ON f.songId = s.id
        WHERE f.userId = ?
        ORDER BY f.createdAt DESC
      `).all(userId);
    } else {
      const favs = memoryStore.favorites.filter(f => f.userId === userId);
      return favs.map(f => {
        const song = memoryStore.songs.find(s => s.id === f.songId);
        return song ? { ...song, favoritedAt: f.createdAt } : null;
      }).filter(Boolean);
    }
  },

  toggleFavorite: (userId, songId) => {
    const createdAt = Date.now();
    if (isNativeSqlite) {
      const existing = db.prepare('SELECT * FROM favorites WHERE userId = ? AND songId = ?').get(userId, songId);
      if (existing) {
        db.prepare('DELETE FROM favorites WHERE userId = ? AND songId = ?').run(userId, songId);
        return { isFavorite: false };
      } else {
        db.prepare('INSERT INTO favorites (userId, songId, createdAt) VALUES (?, ?, ?)').run(userId, songId, createdAt);
        return { isFavorite: true };
      }
    } else {
      const idx = memoryStore.favorites.findIndex(f => f.userId === userId && f.songId === Number(songId));
      if (idx !== -1) {
        memoryStore.favorites.splice(idx, 1);
        persistJsonStore();
        return { isFavorite: false };
      } else {
        memoryStore.favorites.push({ userId, songId: Number(songId), createdAt });
        persistJsonStore();
        return { isFavorite: true };
      }
    }
  }
};

initDatabase();

module.exports = dbApi;
