const db = require('../db/database');

class RadioService {
  constructor() {
    this.playlist = [];
    this.currentIndex = 0;
    this.currentSong = null;
    this.songStartTime = Date.now();
    this.timer = null;
    this.io = null;
  }

  init(io) {
    this.io = io;
    this.loadPlaylist();
    this.startRadio();
  }

  loadPlaylist() {
    const allSongs = db.getSongs({ limit: 100 });
    if (allSongs.length > 0) {
      // Shuffle songs for varied radio schedule
      this.playlist = [...allSongs].sort(() => Math.random() - 0.5);
    }
  }

  startRadio() {
    if (!this.playlist.length) return;
    this.currentSong = this.playlist[this.currentIndex];
    this.songStartTime = Date.now();
    const durationMs = (this.currentSong.duration || 240) * 1000;

    console.log(`[RADIO] Now broadcasting: "${this.currentSong.title}" - ${this.currentSong.artist} (${this.currentSong.mood})`);

    if (this.io) {
      this.io.emit('radio:track_change', this.getCurrentState());
    }

    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.nextTrack();
    }, durationMs);
  }

  nextTrack() {
    this.currentIndex = (this.currentIndex + 1) % this.playlist.length;
    // Reshuffle when looped
    if (this.currentIndex === 0) {
      this.loadPlaylist();
    }
    this.startRadio();
  }

  getCurrentState() {
    if (!this.currentSong) {
      this.loadPlaylist();
      if (this.playlist.length) {
        this.currentSong = this.playlist[0];
      }
    }

    const elapsedSeconds = Math.max(0, Math.floor((Date.now() - this.songStartTime) / 1000));
    const nextSong = this.playlist[(this.currentIndex + 1) % this.playlist.length];

    return {
      isPlaying: true,
      currentSong: this.currentSong,
      elapsedSeconds,
      duration: this.currentSong ? this.currentSong.duration : 240,
      startedAt: this.songStartTime,
      nextSong: nextSong ? { title: nextSong.title, artist: nextSong.artist } : null
    };
  }
}

module.exports = new RadioService();
