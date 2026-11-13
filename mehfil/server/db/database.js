const path = require('path');
const fs = require('fs');
const os = require('os');
const { seedSongs, seedCommunityMessages, seedRequests } = require('./seedData');

let db = null;
let isNativeSqlite = false;
let memoryStore = null;

const isRender = process.env.RENDER === 'true';
// Render Free has an ephemeral filesystem. Use its writable temp directory by default;
// data remains available while the instance runs, but is not guaranteed across restarts.
const defaultDbFilePath = isRender
  ? path.join(os.tmpdir(), 'mehfil.db')
  : path.join(__dirname, 'mehfil.db');
const requestedDbFilePath = process.env.DB_PATH ? path.resolve(process.env.DB_PATH) : defaultDbFilePath;
let dbFilePath = requestedDbFilePath;
let jsonBackupPath = process.env.DB_PATH
  ? path.join(path.dirname(dbFilePath), 'mehfil-store.json')
  : path.join(path.dirname(defaultDbFilePath), 'mehfil-store.json');

if (process.env.DB_PATH) {
  const mountDirectory = path.dirname(requestedDbFilePath);
  try {
    // Render creates and mounts this directory; the app must not create /var/data itself.
    if (!fs.existsSync(mountDirectory)) {
      throw new Error(`mount directory does not exist: ${mountDirectory}`);
    }
    fs.accessSync(mountDirectory, fs.constants.W_OK);
    // Preserve an existing local SQLite file when moving to a newly mounted disk.
    if (requestedDbFilePath !== defaultDbFilePath &&
        !fs.existsSync(requestedDbFilePath) &&
        fs.existsSync(defaultDbFilePath)) {
      fs.copyFileSync(defaultDbFilePath, requestedDbFilePath);
      console.log('[DB] Copied the existing SQLite database to the configured persistent path.');
    }
    console.log(`[DB] Persistent database path is writable: ${requestedDbFilePath}`);
  } catch (diskError) {
    // Keep startup available, but warn that this temporary fallback is not persistent.
    console.error(`[DB] WARNING: DB_PATH is not writable (${diskError.message}). Attach a Render Persistent Disk and mount it at ${mountDirectory}. Using temporary storage; data may be lost on restart or redeploy.`);
    dbFilePath = path.join(os.tmpdir(), 'mehfil.db');
    jsonBackupPath = path.join(os.tmpdir(), 'mehfil-store.json');
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

    CREATE TABLE IF NOT EXISTS listening_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT NOT NULL,
      songId INTEGER,
      mood TEXT NOT NULL,
      playedAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS playlists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT NOT NULL,
      name TEXT NOT NULL COLLATE NOCASE,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      UNIQUE(userId, name)
    );

    CREATE TABLE IF NOT EXISTS playlist_songs (
      playlistId INTEGER NOT NULL,
      songId INTEGER NOT NULL,
      position INTEGER NOT NULL DEFAULT 0,
      addedAt INTEGER NOT NULL,
      PRIMARY KEY (playlistId, songId),
      FOREIGN KEY (playlistId) REFERENCES playlists(id) ON DELETE CASCADE,
      FOREIGN KEY (songId) REFERENCES songs(id) ON DELETE CASCADE
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_songs_mood_plays ON songs(mood, plays DESC);
    CREATE INDEX IF NOT EXISTS idx_requests_votes_created ON requests(votes DESC, createdAt DESC);
    CREATE INDEX IF NOT EXISTS idx_community_timestamp ON community_messages(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_favorites_user_created ON favorites(userId, createdAt DESC);
    CREATE INDEX IF NOT EXISTS idx_history_user_played ON listening_history(userId, playedAt DESC);
    CREATE INDEX IF NOT EXISTS idx_playlists_user_updated ON playlists(userId, updatedAt DESC);
    CREATE INDEX IF NOT EXISTS idx_playlist_songs_position ON playlist_songs(playlistId, position);
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
      favorites: [],
      listening_history: []
    };
    persistJsonStore();
  } else {
    let migrated = false;
    if (!Array.isArray(memoryStore.listening_history)) {
      memoryStore.listening_history = [];
      migrated = true;
    }
    if (!Array.isArray(memoryStore.playlists)) {
      memoryStore.playlists = [];
      migrated = true;
    }
    if (!Array.isArray(memoryStore.playlist_songs)) {
      memoryStore.playlist_songs = [];
      migrated = true;
    }
    if (migrated) persistJsonStore();
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

  recordListening: (userId, songId, mood) => {
    if (!userId || !mood) return;
    const numericSongId = Number.isInteger(Number(songId)) && Number(songId) > 0
      ? Number(songId)
      : null;
    const playedAt = Date.now();

    if (isNativeSqlite) {
      db.prepare(
        'INSERT INTO listening_history (userId, songId, mood, playedAt) VALUES (?, ?, ?, ?)'
      ).run(userId, numericSongId, mood, playedAt);
      db.prepare(`
        DELETE FROM listening_history
        WHERE userId = ?
          AND id NOT IN (
            SELECT id FROM listening_history
            WHERE userId = ?
            ORDER BY playedAt DESC, id DESC
            LIMIT 500
          )
      `).run(userId, userId);
      return;
    }

    if (!Array.isArray(memoryStore.listening_history)) memoryStore.listening_history = [];
    memoryStore.listening_history.push({ userId, songId: numericSongId, mood, playedAt });
    const userRows = memoryStore.listening_history
      .filter(item => item.userId === userId)
      .sort((a, b) => b.playedAt - a.playedAt);
    const keep = new Set(userRows.slice(0, 500));
    memoryStore.listening_history = memoryStore.listening_history.filter(item =>
      item.userId !== userId || keep.has(item)
    );
    persistJsonStore();
  },

  getListeningHistory: (userId, limit = 100) => {
    const safeLimit = Math.max(1, Math.min(500, Math.floor(Number(limit) || 100)));
    if (!userId) return [];
    if (isNativeSqlite) {
      return db.prepare(`
        SELECT songId, mood, playedAt
        FROM listening_history
        WHERE userId = ?
        ORDER BY playedAt DESC, id DESC
        LIMIT ?
      `).all(userId, safeLimit);
    }
    return (memoryStore.listening_history || [])
      .filter(item => item.userId === userId)
      .sort((a, b) => b.playedAt - a.playedAt)
      .slice(0, safeLimit);
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

  getPlaylists: (userId) => {
    if (!userId) return [];
    if (isNativeSqlite) {
      return db.prepare(`
        SELECT p.id, p.name, p.createdAt, p.updatedAt,
          COUNT(ps.songId) AS songCount
        FROM playlists p
        LEFT JOIN playlist_songs ps ON ps.playlistId = p.id
        WHERE p.userId = ?
        GROUP BY p.id
        ORDER BY p.updatedAt DESC, p.id DESC
      `).all(userId);
    }
    return (memoryStore.playlists || [])
      .filter(item => item.userId === userId)
      .map(item => ({
        id: item.id,
        name: item.name,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        songCount: (memoryStore.playlist_songs || []).filter(link => link.playlistId === item.id).length
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt || b.id - a.id);
  },

  getPlaylist: (userId, playlistId) => {
    if (!userId) return null;
    if (isNativeSqlite) {
      const playlist = db.prepare(
        'SELECT id, name, createdAt, updatedAt FROM playlists WHERE id = ? AND userId = ?'
      ).get(playlistId, userId);
      if (!playlist) return null;
      const songs = db.prepare(`
        SELECT s.*, ps.position, ps.addedAt
        FROM playlist_songs ps
        JOIN songs s ON s.id = ps.songId
        WHERE ps.playlistId = ?
        ORDER BY ps.position ASC, ps.addedAt ASC
      `).all(playlistId);
      return { ...playlist, songs };
    }
    const playlist = (memoryStore.playlists || []).find(item =>
      item.id === Number(playlistId) && item.userId === userId
    );
    if (!playlist) return null;
    const songs = (memoryStore.playlist_songs || [])
      .filter(link => link.playlistId === playlist.id)
      .sort((a, b) => a.position - b.position || a.addedAt - b.addedAt)
      .map(link => memoryStore.songs.find(song => song.id === link.songId))
      .filter(Boolean);
    return { ...playlist, songs };
  },

  createPlaylist: (userId, name) => {
    if (!userId || !name) return null;
    const now = Date.now();
    if (isNativeSqlite) {
      const info = db.prepare(
        'INSERT INTO playlists (userId, name, createdAt, updatedAt) VALUES (?, ?, ?, ?)'
      ).run(userId, name, now, now);
      return db.prepare(
        'SELECT id, name, createdAt, updatedAt FROM playlists WHERE id = ? AND userId = ?'
      ).get(info.lastInsertRowid, userId);
    }
    if (!Array.isArray(memoryStore.playlists)) memoryStore.playlists = [];
    const duplicate = memoryStore.playlists.some(item =>
      item.userId === userId && item.name.toLowerCase() === name.toLowerCase()
    );
    if (duplicate) return null;
    const id = memoryStore.playlists.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
    const playlist = { id, userId, name, createdAt: now, updatedAt: now };
    memoryStore.playlists.push(playlist);
    persistJsonStore();
    return { ...playlist };
  },

  renamePlaylist: (userId, playlistId, name) => {
    if (!userId || !name) return null;
    const now = Date.now();
    if (isNativeSqlite) {
      const result = db.prepare(
        'UPDATE playlists SET name = ?, updatedAt = ? WHERE id = ? AND userId = ?'
      ).run(name, now, playlistId, userId);
      if (!result.changes) return null;
      return db.prepare(
        'SELECT id, name, createdAt, updatedAt FROM playlists WHERE id = ? AND userId = ?'
      ).get(playlistId, userId);
    }
    const playlist = (memoryStore.playlists || []).find(item =>
      item.id === Number(playlistId) && item.userId === userId
    );
    if (!playlist) return null;
    const duplicate = memoryStore.playlists.some(item =>
      item.userId === userId && item.id !== playlist.id &&
      item.name.toLowerCase() === name.toLowerCase()
    );
    if (duplicate) return null;
    playlist.name = name;
    playlist.updatedAt = now;
    persistJsonStore();
    return { ...playlist };
  },

  deletePlaylist: (userId, playlistId) => {
    if (!userId) return false;
    if (isNativeSqlite) {
      return db.prepare('DELETE FROM playlists WHERE id = ? AND userId = ?')
        .run(playlistId, userId).changes > 0;
    }
    const index = (memoryStore.playlists || []).findIndex(item =>
      item.id === Number(playlistId) && item.userId === userId
    );
    if (index < 0) return false;
    const [removed] = memoryStore.playlists.splice(index, 1);
    memoryStore.playlist_songs = (memoryStore.playlist_songs || [])
      .filter(link => link.playlistId !== removed.id);
    persistJsonStore();
    return true;
  },

  addSongToPlaylist: (userId, playlistId, songId) => {
    if (!userId) return null;
    const numericSongId = Number(songId);
    const numericPlaylistId = Number(playlistId);
    const now = Date.now();
    if (isNativeSqlite) {
      const playlist = db.prepare('SELECT id FROM playlists WHERE id = ? AND userId = ?')
        .get(numericPlaylistId, userId);
      const song = db.prepare('SELECT id FROM songs WHERE id = ?').get(numericSongId);
      if (!playlist || !song) return null;
      const position = db.prepare(
        'SELECT COALESCE(MAX(position), -1) + 1 AS nextPosition FROM playlist_songs WHERE playlistId = ?'
      ).get(numericPlaylistId).nextPosition;
      const result = db.prepare(
        'INSERT OR IGNORE INTO playlist_songs (playlistId, songId, position, addedAt) VALUES (?, ?, ?, ?)'
      ).run(numericPlaylistId, numericSongId, position, now);
      if (result.changes) {
        db.prepare('UPDATE playlists SET updatedAt = ? WHERE id = ? AND userId = ?')
          .run(now, numericPlaylistId, userId);
      }
      return { added: result.changes > 0 };
    }
    const playlist = (memoryStore.playlists || []).find(item =>
      item.id === numericPlaylistId && item.userId === userId
    );
    const song = memoryStore.songs.find(item => item.id === numericSongId);
    if (!playlist || !song) return null;
    if (!Array.isArray(memoryStore.playlist_songs)) memoryStore.playlist_songs = [];
    const exists = memoryStore.playlist_songs.some(link =>
      link.playlistId === numericPlaylistId && link.songId === numericSongId
    );
    if (exists) return { added: false };
    const links = memoryStore.playlist_songs.filter(link => link.playlistId === numericPlaylistId);
    const position = links.reduce((max, link) => Math.max(max, Number(link.position) || 0), -1) + 1;
    memoryStore.playlist_songs.push({ playlistId: numericPlaylistId, songId: numericSongId, position, addedAt: now });
    playlist.updatedAt = now;
    persistJsonStore();
    return { added: true };
  },

  removeSongFromPlaylist: (userId, playlistId, songId) => {
    if (!userId) return false;
    const numericPlaylistId = Number(playlistId);
    const numericSongId = Number(songId);
    const now = Date.now();
    if (isNativeSqlite) {
      const playlist = db.prepare('SELECT id FROM playlists WHERE id = ? AND userId = ?')
        .get(numericPlaylistId, userId);
      if (!playlist) return false;
      const result = db.prepare(
        'DELETE FROM playlist_songs WHERE playlistId = ? AND songId = ?'
      ).run(numericPlaylistId, numericSongId);
      if (result.changes) {
        db.prepare('UPDATE playlists SET updatedAt = ? WHERE id = ? AND userId = ?')
          .run(now, numericPlaylistId, userId);
      }
      return result.changes > 0;
    }
    const playlist = (memoryStore.playlists || []).find(item =>
      item.id === numericPlaylistId && item.userId === userId
    );
    if (!playlist) return false;
    const before = (memoryStore.playlist_songs || []).length;
    memoryStore.playlist_songs = (memoryStore.playlist_songs || []).filter(link =>
      !(link.playlistId === numericPlaylistId && link.songId === numericSongId)
    );
    const removed = memoryStore.playlist_songs.length < before;
    if (removed) {
      playlist.updatedAt = now;
      persistJsonStore();
    }
    return removed;
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
