# MEHFIL (महफ़िल) — Jahan Har Mood Ka Ek Gaana Hai 📻

> **A Full-Stack, Real-Time Ambient Indian Music Lounge, Synchronized Radio & Community Baithak.**
> Rebuilt and elevated from `apnimehfil.netlify.app` with a production-ready Node.js backend, real-time WebSockets, high-performance SQLite database, dynamic audience presence, and rich interactive features.

---

## 🌟 What Was Rebuilt & Upgraded

The original `apnimehfil.netlify.app` was a static frontend prototype with placeholder Firebase configuration (`YOUR_API_KEY`), exposed client-side YouTube search keys prone to quota exhaustion, broken 404 image paths, non-functioning navigation anchors (`#explore`, `#requests`, `#community`), and static mock listener counts.

### 🚀 New Full-Stack Architecture
1. **Real Backend Server (Node.js + Express + Socket.IO)**:
   - **Real-Time Audience Presence**: Tracks live WebSocket connections, assigns poetic anonymous identities (`Shayar-42`, `Musafir-7`, `Aashiq-Dil`), and dynamically calculates listener distribution across all 6 moods.
   - **Synchronized 24/7 Mehfil Radio**: Central server-driven radio clock. Listeners can tune in to "Live Radio Sync" where everyone across the globe hears the exact same song at the exact same beat and second.
   - **Solo Mood Lounge**: Switch seamlessly between exploring personal moods and joining the live synchronized radio room.
   - **Built-in High-Performance Database**: Powered by Node 24's native `node:sqlite` engine (with persistent JSON fallback for cross-platform zero-dependency reliability).
   - **Curated Multi-Mood Catalog**: 40+ iconic Hindi/Bollywood/Indie songs pre-seeded with verified YouTube IDs, album covers, durations, and lyrics quotes across:
     - ❤️ **Love (इश्क़)**: Romantic melodies (*Tum Se Hi*, *Kesariya*, *Raabta*, *Pee Loon*, *Apna Bana Le*)
     - 🌧️ **Dard (दर्द)**: Heartbreak & soulful tears (*Channa Mereya*, *Agar Tum Saath Ho*, *Kabira*, *Tujhe Bhula Diya*)
     - 🪶 **Sukoon (सुकून)**: Calming, acoustic, spiritual peace (*Kun Faya Kun*, *Maula Mere Maula*, *Khaabon Ke Parinday*)
     - 🚗 **Safar (सफ़र)**: Road-trip highways & wanderlust (*Safarnama*, *Ilahi*, *Yun Hi Chala Chal*, *Matargashti*)
     - 😃 **Happy (ख़ुशी)**: Celebration & festive euphoria (*Badtameez Dil*, *Gallan Goodiyaan*, *London Thumakda*)
     - 🌙 **Late Night (रात)**: Midnight indie confessions & ghazals (*Choo Lo*, *Baarishein*, *Waqt Ki Baatein*, *Faasle*)

2. **Interactive Real-Time Community**:
   - **Farmaish Corner (Song Requests)**: Listeners submit song requests with personal dedications (*"Dedicating to college hostel late nights"*). Requests stream live to all listeners with a real-time community upvote queue.
   - **Mehfil Baithak (Live Lounge)**: Real-time chat and poetry/shayari stream with user badges, timestamping, and heart likes.
   - **Floating Reaction Shower**: Quick reactions (`❤️`, `☕`, `🎶`, `🌧️`, `🥀`, `🔥`) trigger floating animations across all connected screens simultaneously.
   - **Explore Library**: Search songs by title, artist, movie, or lyrics; filter by mood chips with instant playback.
   - **Personal Favorites**: Heart button persists liked tracks to the backend database with instant access in the Favorites drawer.

3. **Audio Engine & Frontend Aesthetics**:
   - YouTube IFrame API audio engine with autoplay error recovery and auto-advancing playlists.
   - Ambient mood lighting that smoothly shifts background gradients and glows according to the selected mood.
   - Retro spectrum audio wave visualizer and floating particle engine.
   - Collapsible persistent bottom player bar with volume control, seek scrubber, shuffle, and repeat.
   - Complete keyboard shortcuts support (`Space`, `N`, `P`, `M`, `S`, `R`, `1-6`, `Esc`).
   - **Personal Radio**: Builds a private, adaptive queue from the listener's selected mood, confirmed listening history, recently played tracks and favorites. It adds artist/mood variety and refreshes the queue when the current set ends. The first version uses a lightweight weighted recommendation engine rather than an external generative-AI API.

---

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js, Socket.IO, `node:sqlite` (SQLite 3)
- **Frontend**: Vanilla ES6+ JavaScript, CSS3 Glassmorphism, FontAwesome 6.7, Google Fonts (Playfair Display & DM Sans)
- **Audio Engine**: YouTube IFrame Player API + HTML5 Audio fallback

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18+ recommended; v24 fully supported with built-in SQLite)
- npm

### 2. Installation
```bash
cd mehfil
npm install
```

### 3. Start the Server
```bash
# Run production server
npm start

# Or run in development watch mode
npm run dev
```

The application will start on **http://localhost:3000**.

---

## 📡 REST API Documentation

| Endpoint | Method | Description |
|---|---|---|
| `/api/status` | `GET` | Server status, active listener count, live radio state |
| `/api/moods` | `GET` | List of all 6 moods with quotes, hex colors, and listener counts |
| `/api/songs` | `GET` | Query songs (`?mood=love`, `?search=arijit`, `?limit=20`) |
| `/api/songs/:id` | `GET` | Get details for a single song |
| `/api/songs/random` | `GET` | Get a random surprise song (optionally `?mood=`) |
| `/api/songs/:id/play` | `POST` | Record a song play |
| `/api/radio` | `GET` | Current synchronized radio track, elapsed seconds & next track |
| `/api/radio/personalized` | `GET` | Private mood/history/favorites-based Personal Radio queue (`x-user-id` header) |
| `/api/requests` | `GET` | Active song requests queue sorted by votes |
| `/api/requests` | `POST` | Submit a new song request with title, artist, mood, dedication |
| `/api/requests/:id/vote`| `POST` | Upvote a song request |
| `/api/community` | `GET` | Recent community messages and shayaris |
| `/api/community` | `POST` | Post a new message or shayari to the live lounge |
| `/api/community/:id/like`| `POST` | Like a community message |
| `/api/favorites` | `GET` | Get user's saved favorite songs (`x-user-id` header) |
| `/api/favorites` | `POST` | Toggle a song in/out of favorites |

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Space` | Play / Pause |
| `N` or `→` | Next Track |
| `P` or `←` | Previous Track |
| `M` | Mute / Unmute Volume |
| `S` | Toggle Shuffle |
| `R` | Toggle Repeat |
| `1` – `6` | Switch Mood (1=Love, 2=Dard, 3=Sukoon, 4=Safar, 5=Happy, 6=Late Night) |
| `Esc` | Close any active modal dialog |


## Database storage (Render Free and paid options)

- **Render Free (zero-cost setup):** Leave `DB_PATH` unset. On Render, MEHFIL uses SQLite in the writable temporary directory. The database works while the service instance is running, but its contents can be lost when the free service restarts, sleeps, or redeploys. This is expected on an ephemeral filesystem.
- **Persistent storage (optional, may cost extra):** Attach a Render Persistent Disk mounted at `/var/data`, then set `DB_PATH=/var/data/mehfil.db`. Do this only if you intentionally choose a paid disk/service arrangement and have checked the current Render pricing.

The default free setup is single-instance. Live presence is held in process memory, so this setup is not a guarantee of 1,000 concurrent listeners. Validate capacity with staged load tests before advertising that target.


## Quality checks

Run the built-in smoke suite from the `mehfil/` directory:

```bash
npm test
```

The tests validate the PWA manifest and icon dimensions, service-worker app-shell paths and live-endpoint bypasses, desktop/mobile install controls, local HTML references, JavaScript syntax, and accessible toast announcements. GitHub Actions runs the same suite when files under `mehfil/` change.
