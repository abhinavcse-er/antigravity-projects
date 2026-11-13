/* =========================================================
   MEHFIL — app.js
   Full-Stack UI Controller, Navigation & State Orchestrator
   ========================================================= */

(function () {
    "use strict";

    // Application State
    const state = {
        currentMood: "love",
        songs: [],
        currentIndex: 0,
        currentSong: null,
        isRadioSyncMode: false,
        isPersonalRadio: false,
        isShuffle: false,
        isRepeat: false,
        recentSongs: (() => { try { const saved = JSON.parse(localStorage.getItem('mehfil_recent_songs') || '[]'); return Array.isArray(saved) ? saved.slice(0, 6) : []; } catch { return []; } })(),
        unavailableVideoIds: (() => { try { const saved = JSON.parse(localStorage.getItem('mehfil_unavailable_video_ids') || '[]'); return new Set(Array.isArray(saved) ? saved : []); } catch { return new Set(); } })(),
        favoriteSongIds: new Set(),
        moodData: {
            love: { title: "LOVE", quote: "“Pyaar ke gaane, dil se dil tak.”", action: "WHY LOVE?" },
            dard: { title: "DARD", quote: "“Kuch gaane, dil ko halka kar dete hain.”", action: "WHY DARD?" },
            sukoon: { title: "SUKOON", quote: "“Thoda ruk jao, duniya kahin nahi ja rahi.”", action: "WHY SUKOON?" },
            safar: { title: "SAFAR", quote: "“Raaste lambe ho, playlist chhoti nahi.”", action: "WHY SAFAR?" },
            happy: { title: "HAPPY", quote: "“Aaj reason nahi, bas gaane chahiye.”", action: "WHY HAPPY?" },
            "late-night": { title: "LATE NIGHT", quote: "“Raat lambi hai, baatein bhi honi chahiye.”", action: "WHY LATE NIGHT?" }
        }
    };

    // Helper: Select element
    const $ = (id) => document.getElementById(id);
    let moodLoadVersion = 0;
    let personalRadioRequestVersion = 0;
    let activePlaylistId = null;
    let activePlaylist = null;
    let musicLibraryCatalog = null;
    let playlistSearchTimer = null;
    let playlistSearchVersion = 0;

    // Toast Notification
    window.showMehfilToast = function (text) {
        let toast = $("mehfilToast");
        if (!toast) {
            toast = document.createElement("div");
            toast.id = "mehfilToast";
            toast.className = "mehfil-toast";
            toast.setAttribute("role", "status");
            toast.setAttribute("aria-live", "polite");
            toast.setAttribute("aria-atomic", "true");
            document.body.appendChild(toast);
        }
        toast.textContent = text;
        toast.classList.add("show");
        setTimeout(() => {
            toast.classList.remove("show");
        }, 3000);
    };

    // Initialize Application
    document.addEventListener("DOMContentLoaded", async () => {
        console.log("[MEHFIL] Initializing client application...");

        // Start particle visualizer
        if (window.MehfilVisualizer) {
            MehfilVisualizer.init();
        }

        // Initialize WebSockets
        if (window.MehfilSocket) {
            MehfilSocket.init(state.currentMood);
        }

        // Attach UI Listeners
        attachMoodListeners();
        attachQuickSongSearch();
        attachPlayerControls();
        attachNavigationModals();
        attachKeyboardShortcuts();
        attachQuickReactions();
        attachRadioModeToggle();
        loadFavorites();
        renderRecentList();

        // Load initial mood songs and play
        await switchMood("love", false);
    });

    /* =====================================================
       MOOD SWITCHING
    ===================================================== */
    function attachMoodListeners() {
        document.querySelectorAll(".mood-button").forEach(btn => {
            btn.addEventListener("click", () => {
                const mood = btn.getAttribute("data-mood");
                if (mood) switchMood(mood, true);
            });
        });

        const surpriseBtn = $("surpriseButton");
        if (surpriseBtn) {
            surpriseBtn.addEventListener("click", handleSurpriseMe);
        }

        const personalRadioBtn = $("personalRadioButton");
        if (personalRadioBtn) {
            personalRadioBtn.addEventListener("click", () => startPersonalRadio(false));
        }
    }

    function attachQuickSongSearch() {
        const form = $("quickSongSearch");
        const input = $("quickSongSearchInput");
        const button = $("quickSongSearchButton");
        const suggestions = $("quickSongSuggestions");
        if (!form || !input || !suggestions) return;

        let debounceTimer = null;
        let requestVersion = 0;
        let suggestionSongs = [];
        let activeIndex = -1;
        const searchButtonMarkup = button?.innerHTML || "";
        const setSearchBusy = (busy) => {
            if (!button) return;
            button.disabled = busy;
            button.innerHTML = busy
                ? '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i><span>Searching</span>'
                : searchButtonMarkup;
        };

        const closeSuggestions = () => {
            requestVersion++;
            clearTimeout(debounceTimer);
            setSearchBusy(false);
            suggestions.hidden = true;
            suggestions.innerHTML = "";
            suggestionSongs = [];
            activeIndex = -1;
            input.setAttribute("aria-expanded", "false");
        };

        const playSelectedSong = (song) => {
            if (!song) return;
            const list = suggestionSongs.length ? suggestionSongs : [song];
            state.songs = list;
            state.currentIndex = Math.max(0, list.findIndex(item => item.id === song.id));
            playSongAtIndex(state.currentIndex, true);
            input.value = song.title;
            closeSuggestions();
            window.showMehfilToast("Playing: " + song.title);
        };

        const renderSuggestions = (songs) => {
            suggestionSongs = songs;
            activeIndex = -1;
            suggestions.innerHTML = "";

            if (!songs.length) {
                const empty = document.createElement("div");
                empty.className = "mehfil-search-empty";
                empty.textContent = "No songs found. Try another name.";
                suggestions.appendChild(empty);
                suggestions.hidden = false;
                input.setAttribute("aria-expanded", "true");
                return;
            }

            const fragment = document.createDocumentFragment();
            songs.forEach((song, index) => {
                const item = document.createElement("button");
                item.type = "button";
                item.className = "mehfil-suggestion";
                item.setAttribute("role", "option");
                item.setAttribute("aria-selected", "false");

                if (song.cover) {
                    const cover = document.createElement("img");
                    cover.src = song.cover;
                    cover.alt = "";
                    cover.loading = "lazy";
                    cover.decoding = "async";
                    item.appendChild(cover);
                }

                const details = document.createElement("span");
                details.className = "mehfil-suggestion-details";
                const title = document.createElement("strong");
                title.textContent = song.title || "Unknown song";
                const artist = document.createElement("small");
                artist.textContent = song.artist || "Unknown artist";
                details.append(title, artist);
                item.appendChild(details);

                item.addEventListener("mousedown", event => event.preventDefault());
                item.addEventListener("click", () => playSelectedSong(song));
                fragment.appendChild(item);
            });
            suggestions.appendChild(fragment);

            suggestions.hidden = false;
            input.setAttribute("aria-expanded", "true");
        };

        const searchSuggestions = async (query) => {
            const normalizedQuery = String(query || "").trim().replace(/\s+/g, " ");
            if (normalizedQuery.length < 2) return;
            const version = ++requestVersion;
            setSearchBusy(true);
            try {
                const songs = await MehfilAPI.getSongs({ search: normalizedQuery, mood: "all", limit: 8 });
                const currentQuery = input.value.trim().replace(/\s+/g, " ");
                if (version !== requestVersion || currentQuery !== normalizedQuery) return;
                renderSuggestions(Array.isArray(songs) ? songs.slice(0, 8) : []);
            } catch (error) {
                if (version !== requestVersion) return;
                console.error("[MEHFIL] Suggestions failed:", error);
                renderSuggestions([]);
            } finally {
                if (version === requestVersion) setSearchBusy(false);
            }
        };

        input.setAttribute("autocomplete", "off");
        input.setAttribute("aria-autocomplete", "list");
        input.setAttribute("aria-controls", "quickSongSuggestions");
        input.setAttribute("aria-expanded", "false");

        input.addEventListener("input", () => {
            requestVersion++;
            const query = input.value.trim().replace(/\s+/g, " ");
            clearTimeout(debounceTimer);
            suggestionSongs = [];
            activeIndex = -1;
            if (query.length < 2) {
                requestVersion++;
                closeSuggestions();
                return;
            }
            suggestions.innerHTML = '<div class="mehfil-search-loading" role="status"><i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Finding matching songs...</div>';
            suggestions.hidden = false;
            input.setAttribute("aria-expanded", "true");
            debounceTimer = setTimeout(() => searchSuggestions(query), 420);
        });

        input.addEventListener("keydown", event => {
            if (suggestions.hidden) return;
            const items = Array.from(suggestions.querySelectorAll(".mehfil-suggestion"));
            if (event.key === "ArrowDown" && items.length) {
                event.preventDefault();
                activeIndex = (activeIndex + 1) % items.length;
            } else if (event.key === "ArrowUp" && items.length) {
                event.preventDefault();
                activeIndex = activeIndex <= 0 ? items.length - 1 : activeIndex - 1;
            } else if (event.key === "Enter" && items.length) {
                event.preventDefault();
                const selectedIndex = activeIndex >= 0 ? activeIndex : 0;
                playSelectedSong(suggestionSongs[selectedIndex]);
            } else if (event.key === "Escape") {
                closeSuggestions();
            } else {
                return;
            }
            items.forEach((item, index) => {
                item.classList.toggle("active", index === activeIndex);
                item.setAttribute("aria-selected", String(index === activeIndex));
            });
        });

        form.addEventListener("submit", event => {
            event.preventDefault();
            const query = input.value.trim().replace(/\s+/g, " ");
            if (!query) {
                input.focus();
                window.showMehfilToast("Enter a song or artist name first.");
                return;
            }
            if (activeIndex >= 0 && suggestionSongs[activeIndex]) {
                playSelectedSong(suggestionSongs[activeIndex]);
            } else if (suggestionSongs.length) {
                playSelectedSong(suggestionSongs[0]);
            } else {
                searchSuggestions(query);
            }
        });

        document.addEventListener("click", event => {
            if (!form.contains(event.target)) closeSuggestions();
        });
    }

    async function switchMood(mood, autoPlay = true) {
        if (!state.moodData[mood]) return;
        const requestVersion = ++moodLoadVersion;
        personalRadioRequestVersion++;
        state.currentMood = mood;
        state.isRadioSyncMode = false;
        state.isPersonalRadio = false;
        updateRadioBadgeUI();
        updatePersonalRadioButtonUI();

        // Update body class for ambient color glow
        document.body.className = `mood-${mood}`;

        // Update active state on mood buttons
        document.querySelectorAll(".mood-button").forEach(btn => {
            if (btn.getAttribute("data-mood") === mood) {
                btn.classList.add("active");
            } else {
                btn.classList.remove("active");
            }
        });

        // Update Mood Header & Quotes
        const mInfo = state.moodData[mood];
        if ($("moodTitle")) $("moodTitle").textContent = mInfo.title;
        if ($("moodQuote")) $("moodQuote").textContent = mInfo.quote;
        if ($("moodAction")) $("moodAction").innerHTML = `${mInfo.action} <i class="fa-solid fa-arrow-right"></i>`;

        // Notify backend of mood change via WebSockets
        MehfilSocket.setMood(mood);

        // Fetch curated songs for this mood from backend API
        try {
            const songs = await MehfilAPI.getSongs({ mood });
            if (requestVersion !== moodLoadVersion || state.currentMood !== mood) return;
            const playableCandidates = (Array.isArray(songs) ? songs : []).filter(song => {
                const ids = [song.youtubeId, song.backupId].filter(Boolean);
                return ids.length && ids.some(id => !state.unavailableVideoIds.has(String(id)));
            });
            if (playableCandidates.length) {
                state.songs = playableCandidates;
                state.currentIndex = 0;
                playSongAtIndex(0, autoPlay);
            } else {
                state.songs = [];
                state.currentIndex = 0;
                window.showMehfilToast("No known playable tracks in this mood yet. Try Search or another mood.");
            }
        } catch (err) {
            console.error("[MEHFIL] Error loading mood songs:", err);
        }
    }

    async function startPersonalRadio(silent = false) {
        const button = $("personalRadioButton");
        if (button?.disabled) return;
        if (button) button.disabled = true;
        const requestVersion = ++personalRadioRequestVersion;
        const requestedMood = state.currentMood;

        try {
            const result = await MehfilAPI.getPersonalRadio({
                mood: requestedMood,
                limit: 20,
                recentIds: state.recentSongs.map(song => song.id)
            });
            if (requestVersion !== personalRadioRequestVersion || requestedMood !== state.currentMood) return;
            const songs = (Array.isArray(result?.songs) ? result.songs : []).filter(song => {
                const ids = [song.youtubeId, song.backupId].filter(Boolean);
                return ids.length && ids.some(id => !state.unavailableVideoIds.has(String(id)));
            });

            if (!songs.length) {
                if (silent && state.songs.length) {
                    playSongAtIndex((state.currentIndex + 1) % state.songs.length, true);
                } else if (!silent) {
                    window.showMehfilToast("No playable recommendations yet. Try another mood or Search.");
                }
                return;
            }

            state.isRadioSyncMode = false;
            state.isPersonalRadio = true;
            updateRadioBadgeUI();
            updatePersonalRadioButtonUI();
            state.songs = songs;
            state.currentIndex = 0;
            playSongAtIndex(0, true);

            if (!silent) {
                const isPersonalized = !!result?.profile?.personalized;
                window.showMehfilToast(isPersonalized
                    ? "Your Personal Radio is ready — tuned to your listening taste."
                    : "Your Personal Radio is ready — starting with your selected mood.");
            }
        } catch (error) {
            if (requestVersion === personalRadioRequestVersion) {
                console.error("[MEHFIL] Personal Radio failed:", error);
                if (silent && state.songs.length) {
                    playSongAtIndex((state.currentIndex + 1) % state.songs.length, true);
                } else if (!silent) {
                    window.showMehfilToast("Personal Radio could not load. Please try again.");
                }
            }
        } finally {
            if (button) button.disabled = false;
        }
    }

    function updatePersonalRadioButtonUI() {
        const button = $("personalRadioButton");
        if (!button) return;
        button.setAttribute("aria-pressed", String(state.isPersonalRadio));
        button.classList.toggle("personal-radio-active", state.isPersonalRadio);
        const title = button.querySelector("strong");
        const subtitle = button.querySelector("small");
        if (title) title.textContent = state.isPersonalRadio ? "Your Personal Radio" : "Personal Radio";
        if (subtitle) subtitle.textContent = state.isPersonalRadio ? "Tuned to your taste" : "Made for your mood";
        button.title = state.isPersonalRadio
            ? "Your personalized radio queue is active"
            : "Create a radio queue from your mood and listening history";
    }

    async function handleSurpriseMe() {
        personalRadioRequestVersion++;
        state.isPersonalRadio = false;
        updatePersonalRadioButtonUI();
        try {
            const randomSong = await MehfilAPI.getRandomSong();
            if (randomSong) {
                window.showMehfilToast(`🎲 Surprise! Playing "${randomSong.title}" (${randomSong.mood.toUpperCase()})`);
                state.currentMood = randomSong.mood;
                document.body.className = `mood-${randomSong.mood}`;
                document.querySelectorAll(".mood-button").forEach(btn => {
                    btn.classList.toggle("active", btn.getAttribute("data-mood") === randomSong.mood);
                });

                const mInfo = state.moodData[randomSong.mood] || state.moodData.love;
                if ($("moodTitle")) $("moodTitle").textContent = mInfo.title;
                if ($("moodQuote")) $("moodQuote").textContent = mInfo.quote;

                // Load mood playlist and locate random track
                const songs = await MehfilAPI.getSongs({ mood: randomSong.mood });
                state.songs = songs;
                const foundIdx = songs.findIndex(s => s.id === randomSong.id);
                state.currentIndex = foundIdx !== -1 ? foundIdx : 0;
                playSong(randomSong, true);
            }
        } catch (err) {
            console.error("Surprise failed:", err);
        }
    }

    /* =====================================================
       PLAYER MANAGEMENT
    ===================================================== */
    function playSongAtIndex(index, autoPlay = true) {
        if (!state.songs.length) return;
        state.currentIndex = (index + state.songs.length) % state.songs.length;
        playSong(state.songs[state.currentIndex], autoPlay);
    }

    function playSong(song, autoPlay = true, seekSeconds = 0) {
        if (!song) return;

        // Align the active queue for tracks started from Search, Explore,
        // Favorites and Recently Played as well as mood-library controls.
        const queueIndex = state.songs.findIndex(item => String(item.id) === String(song.id));
        if (queueIndex >= 0) {
            state.currentIndex = queueIndex;
        } else {
            state.songs = [song, ...state.songs.filter(item => String(item.id) !== String(song.id))];
            state.currentIndex = 0;
        }
        state.currentSong = song;

        // Update Track Metadata in UI
        if ($("songTitle")) $("songTitle").textContent = song.title;
        if ($("songArtist")) $("songArtist").textContent = song.artist;
        if ($("bottomSong")) $("bottomSong").textContent = song.title;
        if ($("bottomArtist")) $("bottomArtist").textContent = song.artist;

        // Cover artwork
        const coverEl = $("albumCoverVisual") || document.querySelector(".album-cover") || document.querySelector(".album-art");
        if (coverEl && song.cover) {
            coverEl.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.25), rgba(0,0,0,0.65)), url('${song.cover}')`;
            coverEl.style.backgroundSize = "cover";
            coverEl.style.backgroundPosition = "center";
        }

        const bottomCover = document.querySelector(".bottom-cover");
        if (bottomCover) {
            if (song.cover) {
                bottomCover.style.backgroundImage = `url('${song.cover}')`;
                bottomCover.style.backgroundSize = "cover";
                bottomCover.style.backgroundPosition = "center";
                const bIcon = bottomCover.querySelector("i");
                if (bIcon) bIcon.style.display = "none";
            }
        }

        // Lyrics snippet in center
        const lyricsEl = $("lyricsSnippet");
        if (lyricsEl) {
            lyricsEl.textContent = song.lyricsSnippet ? `“${song.lyricsSnippet}”` : "";
        }

        // Update Favorite Button State
        updateFavoriteButtonUI(song.id);

        // Send to Audio Player
        MehfilAudioPlayer.loadSong(song, autoPlay, seekSeconds);
    }

    function addToRecent(song) {
        // Prevent duplicate consecutive entries
        state.recentSongs = state.recentSongs.filter(s => s.id !== song.id);
        state.recentSongs.unshift(song);
        if (state.recentSongs.length > 6) state.recentSongs.pop();
        try {
            localStorage.setItem("mehfil_recent_songs", JSON.stringify(state.recentSongs));
        } catch (error) {
            console.warn("[MEHFIL] Could not persist recently played tracks:", error);
        }

        renderRecentList();
        renderLibraryRecent();
    }

    function renderRecentList() {
        const listEl = $("recentList");
        if (!listEl) return;
        listEl.innerHTML = "";

        state.recentSongs.forEach(song => {
            const btn = document.createElement("button");
            btn.className = "recent-song";
            btn.type = "button";
            btn.innerHTML = `
                <span class="mini-cover" style="${song.cover ? `background-image: url('${song.cover}'); background-size: cover; background-position: center;` : ''}">
                    ${song.cover ? '' : '<i class="fa-solid fa-music"></i>'}
                </span>
                <span class="recent-info">
                    <strong>${song.title}</strong>
                    <small>${song.artist}</small>
                </span>
                <span class="recent-play-icon">
                    <i class="fa-solid fa-play"></i>
                </span>
            `;
            btn.addEventListener("click", () => {
                playSong(song, true);
            });
            listEl.appendChild(btn);
        });
    }

    function attachPlayerControls() {
        // Play / Pause
        const playBtns = [$("playButton"), $("bottomPlay")];
        playBtns.forEach(btn => {
            if (btn) btn.addEventListener("click", () => MehfilAudioPlayer.toggle());
        });

        // Next
        const nextBtns = [$("nextButton"), $("bottomNext")];
        nextBtns.forEach(btn => {
            if (btn) btn.addEventListener("click", () => {
                if (state.isShuffle) {
                    const rnd = Math.floor(Math.random() * state.songs.length);
                    playSongAtIndex(rnd, true);
                } else {
                    playSongAtIndex(state.currentIndex + 1, true);
                }
            });
        });

        // Previous
        const prevBtns = [$("previousButton"), $("bottomPrevious")];
        prevBtns.forEach(btn => {
            if (btn) btn.addEventListener("click", () => {
                playSongAtIndex(state.currentIndex - 1, true);
            });
        });

        // Shuffle
        const shuffleBtns = [$("shuffleButton"), $("bottomShuffle")];
        shuffleBtns.forEach(btn => {
            if (btn) btn.addEventListener("click", () => {
                state.isShuffle = !state.isShuffle;
                shuffleBtns.forEach(b => b.classList.toggle("active", state.isShuffle));
                window.showMehfilToast(state.isShuffle ? "Shuffle ON 🔀" : "Shuffle OFF");
            });
        });

        // Repeat
        const repeatBtns = [$("repeatButton"), $("bottomRepeat")];
        repeatBtns.forEach(btn => {
            if (btn) btn.addEventListener("click", () => {
                state.isRepeat = !state.isRepeat;
                repeatBtns.forEach(b => b.classList.toggle("active", state.isRepeat));
                window.showMehfilToast(state.isRepeat ? "Repeat ON 🔁" : "Repeat OFF");
            });
        });

        // Progress bar seek
        const progressBar = $("progressBar");
        if (progressBar) {
            progressBar.addEventListener("click", (e) => {
                const rect = progressBar.getBoundingClientRect();
                const pct = ((e.clientX - rect.left) / rect.width) * 100;
                MehfilAudioPlayer.seek(pct);
            });
        }

        // Volume slider & mute
        const volSlider = $("volumeSlider");
        if (volSlider) {
            volSlider.addEventListener("input", (e) => {
                MehfilAudioPlayer.setVolume(Number(e.target.value));
                updateVolumeIcon(Number(e.target.value));
            });
        }

        const volBtn = $("volumeButton");
        if (volBtn) {
            volBtn.addEventListener("click", () => {
                const muted = MehfilAudioPlayer.toggleMute();
                updateVolumeIcon(muted ? 0 : MehfilAudioPlayer.getVolume());
            });
        }

        // Favorite button
        const favBtn = $("favoriteButton");
        if (favBtn) {
            favBtn.addEventListener("click", toggleCurrentSongFavorite);
        }

        // Bottom player collapse / expand
        const collapseBtn = $("collapsePlayer");
        const bottomPlayer = document.querySelector(".bottom-player");
        if (collapseBtn && bottomPlayer) {
            collapseBtn.addEventListener("click", () => {
                bottomPlayer.classList.toggle("collapsed");
                const icon = collapseBtn.querySelector("i");
                if (icon) {
                    icon.classList.toggle("fa-chevron-down");
                    icon.classList.toggle("fa-chevron-up");
                }
            });
        }
    }

    function updateVolumeIcon(vol) {
        const icon = $("volumeIcon");
        if (!icon) return;
        icon.className = "fa-solid";
        if (vol === 0) icon.classList.add("fa-volume-xmark");
        else if (vol < 40) icon.classList.add("fa-volume-low");
        else icon.classList.add("fa-volume-high");
    }

    // Record only after the YouTube player confirms real playback, not merely
    // when a track is selected or an unavailable video is queued.
    window.onSongPlaybackStarted = function (song) {
        if (!song) return;
        addToRecent(song);
        MehfilAPI.recordPlay(song.id, song.mood || state.currentMood).catch(error => {
            console.warn("[MEHFIL] Listening history could not be saved:", error);
        });
    };

    // Remove a track only after both its primary and backup YouTube
    // sources have failed. Remember rejected IDs so future mood loads hide it.
    window.onSongUnavailable = function (song, videoIds = []) {
        videoIds.forEach(id => state.unavailableVideoIds.add(String(id)));
        try {
            localStorage.setItem("mehfil_unavailable_video_ids", JSON.stringify([...state.unavailableVideoIds]));
        } catch (error) {
            console.warn("[MEHFIL] Could not persist unavailable video IDs:", error);
        }

        const failedIndex = state.songs.findIndex(item => String(item.id) === String(song?.id));
        if (failedIndex >= 0) {
            state.songs.splice(failedIndex, 1);
            if (failedIndex < state.currentIndex) state.currentIndex--;
            if (state.currentIndex >= state.songs.length) state.currentIndex = 0;
        }
        state.recentSongs = state.recentSongs.filter(item => String(item.id) !== String(song?.id));
        try {
            localStorage.setItem("mehfil_recent_songs", JSON.stringify(state.recentSongs));
        } catch (error) {
            console.warn("[MEHFIL] Could not update recently played storage:", error);
        }
        renderRecentList();
        renderLibraryRecent();

        window.showMehfilToast("Skipping unavailable track: " + (song?.title || "Unknown song"));
        if (state.songs.length) {
            playSongAtIndex(state.currentIndex, true);
        } else {
            state.currentSong = null;
            window.showMehfilToast("No playable songs left in this mood. Try another mood or Search.");
        }
    };

    // Auto next track when song finishes
    window.onSongEnded = function () {
        if (state.isRepeat) {
            playSongAtIndex(state.currentIndex, true);
        } else if (state.isPersonalRadio && !state.isShuffle &&
            state.currentIndex >= state.songs.length - 1) {
            // Build a fresh personal queue at the end of each radio set.
            startPersonalRadio(true);
        } else if (state.isShuffle) {
            const rnd = Math.floor(Math.random() * state.songs.length);
            playSongAtIndex(rnd, true);
        } else {
            playSongAtIndex(state.currentIndex + 1, true);
        }
    };

    /* =====================================================
       FAVORITES
    ===================================================== */
    async function loadFavorites() {
        try {
            const favs = await MehfilAPI.getFavorites();
            if (favs && Array.isArray(favs)) {
                state.favoriteSongIds = new Set(favs.map(f => f.id));
                if (state.currentSong) {
                    updateFavoriteButtonUI(state.currentSong.id);
                }
            }
        } catch (err) {
            console.warn("Could not load favorites:", err);
        }
    }

    async function toggleCurrentSongFavorite() {
        if (!state.currentSong) return;
        const songId = state.currentSong.id;
        try {
            const res = await MehfilAPI.toggleFavorite(songId);
            if (res.isFavorite) {
                state.favoriteSongIds.add(songId);
                window.showMehfilToast("Added to Liked Songs ❤️");
                MehfilSocket.sendReaction("❤️");
            } else {
                state.favoriteSongIds.delete(songId);
                window.showMehfilToast("Removed from Liked Songs");
            }
            updateFavoriteButtonUI(songId);
        } catch (err) {
            console.error("Favorite toggle failed:", err);
        }
    }

    function updateFavoriteButtonUI(songId) {
        const favBtn = $("favoriteButton");
        if (!favBtn) return;
        const isFav = state.favoriteSongIds.has(songId);
        favBtn.classList.toggle("active", isFav);
        const icon = favBtn.querySelector("i");
        if (icon) {
            icon.className = isFav ? "fa-solid fa-heart" : "fa-regular fa-heart";
        }
    }

    /* =====================================================
       RADIO SYNCHRONIZATION MODE
    ===================================================== */
    function attachRadioModeToggle() {
        const badge = $("radioModeBadge");
        if (badge) {
            badge.addEventListener("click", async () => {
                personalRadioRequestVersion++;
                state.isPersonalRadio = false;
                updatePersonalRadioButtonUI();
                state.isRadioSyncMode = !state.isRadioSyncMode;
                updateRadioBadgeUI();

                if (state.isRadioSyncMode) {
                    window.showMehfilToast("📻 Joined Synchronized Mehfil Live Radio!");
                    const radio = await MehfilSocket.syncRadio();
                    if (radio && radio.currentSong) {
                        playSong(radio.currentSong, true, radio.elapsedSeconds);
                    }
                } else {
                    window.showMehfilToast("🎧 Returned to Solo Mood Lounge");
                }
            });
        }
    }

    function updateRadioBadgeUI() {
        const badge = $("radioModeBadge");
        if (!badge) return;
        badge.classList.toggle("active-radio", state.isRadioSyncMode);
        const text = badge.querySelector(".mode-text");
        if (text) {
            text.textContent = state.isRadioSyncMode ? "Live Radio Sync" : "Solo Lounge";
        }
    }

    window.onRadioTrackChange = function (radioState) {
        if (!state.isRadioSyncMode || !radioState?.currentSong) return;
        const incoming = radioState.currentSong;
        // Duplicate broadcasts/reconnects must not reload the same long track.
        if (state.currentSong && String(state.currentSong.id) === String(incoming.id)) return;
        window.showMehfilToast(`📻 Radio Station: "${incoming.title}"`);
        playSong(incoming, true, Math.max(0, Number(radioState.elapsedSeconds) || 0));
    };

    /* =====================================================
       QUICK REACTIONS BAR
    ===================================================== */
    function attachQuickReactions() {
        document.querySelectorAll(".reaction-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const reaction = btn.getAttribute("data-reaction") || "❤️";
                MehfilSocket.sendReaction(reaction);
            });
        });
    }

    /* =====================================================
       MODALS: EXPLORE, REQUESTS, COMMUNITY, ABOUT, FAVORITES
    ===================================================== */
    function attachNavigationModals() {
        // Nav Links
        document.querySelectorAll("a[href='#explore']").forEach(el => el.addEventListener("click", (e) => { e.preventDefault(); openModal("exploreModal"); loadExploreSongs(); }));
        document.querySelectorAll("a[href='#requests']").forEach(el => el.addEventListener("click", (e) => { e.preventDefault(); openModal("requestsModal"); loadRequests(); }));
        document.querySelectorAll("a[href='#community']").forEach(el => el.addEventListener("click", (e) => { e.preventDefault(); openModal("communityModal"); loadCommunityMessages(); }));
        document.querySelectorAll("a[href='#favorites']").forEach(el => el.addEventListener("click", (e) => { e.preventDefault(); openModal("favoritesModal"); loadMusicLibrary(); }));
        const viewAllRecent = $("viewAllRecent");
        if (viewAllRecent) {
            viewAllRecent.addEventListener("click", () => {
                openModal("favoritesModal");
                loadMusicLibrary();
            });
        }
        attachPlaylistControls();
        document.querySelectorAll("a[href='#about']").forEach(el => el.addEventListener("click", (e) => { e.preventDefault(); openModal("aboutModal"); }));

        // Mood action button (now a <button> not <a>)
        const moodActionBtn = $("moodAction");
        if (moodActionBtn) {
            moodActionBtn.addEventListener("click", () => { openModal("exploreModal"); loadExploreSongs(); });
        }

        // Close buttons
        document.querySelectorAll(".modal-close-btn").forEach(btn => {
            btn.addEventListener("click", () => closeModal());
        });

        // Click outside modal to close
        document.querySelectorAll(".mehfil-modal-overlay").forEach(overlay => {
            overlay.addEventListener("click", (e) => {
                if (e.target === overlay) closeModal();
            });
        });

        // Explore Search & Filter
        const searchInput = $("exploreSearchInput");
        if (searchInput) {
            let debounce = null;
            searchInput.addEventListener("input", (e) => {
                clearTimeout(debounce);
                debounce = setTimeout(() => {
                    loadExploreSongs(e.target.value);
                }, 300);
            });
        }

        document.querySelectorAll(".mood-chip").forEach(chip => {
            chip.addEventListener("click", () => {
                document.querySelectorAll(".mood-chip").forEach(c => c.classList.remove("active"));
                chip.classList.add("active");
                const mood = chip.getAttribute("data-mood");
                loadExploreSongs($("exploreSearchInput")?.value || "", mood);
            });
        });

        // Submit Song Request Form
        const reqForm = $("requestSongForm");
        if (reqForm) {
            reqForm.addEventListener("submit", async (e) => {
                e.preventDefault();
                const title = $("reqTitle").value;
                const artist = $("reqArtist").value;
                const mood = $("reqMood").value;
                const dedication = $("reqDedication").value;
                const name = $("reqName").value;

                if (!title) return;

                try {
                    await MehfilAPI.submitRequest({
                        songTitle: title,
                        artist,
                        mood,
                        dedication,
                        requesterName: name
                    });
                    reqForm.reset();
                    window.showMehfilToast("Farmaish submitted to Mehfil! 🎶");
                    loadRequests();
                } catch (err) {
                    window.showMehfilToast("Could not submit request.");
                }
            });
        }

        // Community Send Message Form
        const chatForm = $("communityChatForm");
        if (chatForm) {
            chatForm.addEventListener("submit", async (e) => {
                e.preventDefault();
                const textInput = $("chatTextInput");
                const text = textInput.value;
                const isShayari = $("isShayariCheckbox")?.checked || false;

                if (!text || !text.trim()) return;

                const user = MehfilSocket.getCurrentUser();
                try {
                    await MehfilAPI.postCommunityMessage({
                        userName: user?.nickname || "Musafir",
                        userAvatar: user?.avatar || "🎶",
                        mood: state.currentMood,
                        text: text.trim(),
                        isShayari
                    });
                    textInput.value = "";
                } catch (err) {
                    window.showMehfilToast("Message could not be sent.");
                }
            });
        }

        // Mobile Menu toggle
        const menuBtn = $("menuButton");
        const mobileMenu = $("mobileMenu");
        const closeMenu = $("closeMenu");
        if (menuBtn && mobileMenu) {
            menuBtn.setAttribute("aria-expanded", "false");
            const closeMobileMenu = () => {
                mobileMenu.classList.remove("open");
                menuBtn.setAttribute("aria-expanded", "false");
            };

            menuBtn.addEventListener("click", () => {
                const isOpen = mobileMenu.classList.toggle("open");
                menuBtn.setAttribute("aria-expanded", String(isOpen));
            });

            if (closeMenu) closeMenu.addEventListener("click", closeMobileMenu);
            mobileMenu.querySelectorAll("a").forEach(link => {
                link.addEventListener("click", closeMobileMenu);
            });
            mobileMenu.addEventListener("click", event => {
                if (event.target === mobileMenu) closeMobileMenu();
            });
            document.addEventListener("keydown", event => {
                if (event.key === "Escape") closeMobileMenu();
            });
        }
    }

    function openModal(id) {
        closeModal();
        const modal = $(id);
        if (modal) modal.classList.add("active");
    }

    function closeModal() {
        document.querySelectorAll(".mehfil-modal-overlay").forEach(m => m.classList.remove("active"));
        const mobileMenu = $("mobileMenu");
        if (mobileMenu) mobileMenu.classList.remove("open");
    }

    /* EXPLORE DATA */
    async function loadExploreSongs(search = "", mood = "all") {
        const listEl = $("exploreSongsList");
        if (!listEl) return;
        listEl.innerHTML = "<div style='text-align:center; padding: 20px; color: var(--muted);'><i class='fa-solid fa-spinner fa-spin'></i> Surfacing melodies...</div>";

        try {
            const songs = await MehfilAPI.getSongs({ search, mood });
            listEl.innerHTML = "";

            if (!songs.length) {
                listEl.innerHTML = "<div style='text-align:center; padding: 20px; color: var(--muted);'>No matching songs found in this mood.</div>";
                return;
            }

            songs.forEach(song => {
                const row = document.createElement("div");
                row.className = "song-item-row";
                const isFav = state.favoriteSongIds.has(song.id);
                row.innerHTML = `
                    <div class="song-item-info">
                        <img class="song-item-cover" src="${song.cover || 'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=100'}" alt="${song.title}" loading="lazy" decoding="async">
                        <div class="song-item-meta">
                            <div class="song-item-title">${song.title}</div>
                            <div class="song-item-artist">${song.artist} • <span style="text-transform: capitalize; color: var(--accent);">${song.mood}</span></div>
                        </div>
                    </div>
                    <div class="song-item-actions">
                        <button class="fav-item-btn ${isFav ? 'favorited' : ''}" data-id="${song.id}">
                            <i class="${isFav ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
                        </button>
                        <button class="play-item-btn" data-id="${song.id}">
                            <i class="fa-solid fa-play"></i>
                        </button>
                    </div>
                `;

                row.querySelector(".play-item-btn").addEventListener("click", () => {
                    closeModal();
                    playSong(song, true);
                });

                row.querySelector(".fav-item-btn").addEventListener("click", async (e) => {
                    e.stopPropagation();
                    const res = await MehfilAPI.toggleFavorite(song.id);
                    if (res.isFavorite) state.favoriteSongIds.add(song.id);
                    else state.favoriteSongIds.delete(song.id);
                    row.querySelector(".fav-item-btn").classList.toggle("favorited", res.isFavorite);
                    row.querySelector(".fav-item-btn i").className = res.isFavorite ? "fa-solid fa-heart" : "fa-regular fa-heart";
                });

                listEl.appendChild(row);
            });
        } catch (err) {
            listEl.innerHTML = "<div style='color: #ff5f7a; text-align:center;'>Error loading songs.</div>";
        }
    }

    /* REQUESTS DATA */
    async function loadRequests() {
        const listEl = $("requestsQueueList");
        if (!listEl) return;
        try {
            const requests = await MehfilAPI.getRequests();
            renderRequestsList(requests);
        } catch (err) {
            listEl.innerHTML = "<div>Failed to load requests queue.</div>";
        }
    }

    function renderRequestsList(requests) {
        const listEl = $("requestsQueueList");
        if (!listEl) return;
        listEl.innerHTML = "";

        if (!requests.length) {
            listEl.innerHTML = "<div style='color: var(--muted); text-align:center;'>No requests in queue yet. Be the first to ask!</div>";
            return;
        }

        requests.forEach(req => {
            const item = document.createElement("div");
            item.className = "request-item";
            item.innerHTML = `
                <div class="request-meta">
                    <h4>${req.songTitle} <small style="color:var(--muted); font-weight:normal;">by ${req.artist || 'Unknown'}</small></h4>
                    <div class="request-requester">Farmaish by <strong>${req.requesterName}</strong> • <span style="text-transform: capitalize; color:var(--accent);">${req.mood}</span></div>
                    ${req.dedication ? `<div class="request-dedication">“${req.dedication}”</div>` : ""}
                </div>
                <button class="vote-btn" data-id="${req.id}">
                    <i class="fa-solid fa-thumbs-up"></i>
                    <strong style="margin-top:2px;">${req.votes || 1}</strong>
                </button>
            `;

            item.querySelector(".vote-btn").addEventListener("click", async () => {
                const updated = await MehfilAPI.voteRequest(req.id);
                if (updated) {
                    item.querySelector("strong").textContent = updated.votes;
                    item.querySelector(".vote-btn").classList.add("voted");
                }
            });

            listEl.appendChild(item);
        });
    }

    window.onRequestReceived = function (newReq) {
        loadRequests();
    };

    window.onRequestVoted = function (updatedReq) {
        const btn = document.querySelector(`.vote-btn[data-id="${updatedReq.id}"] strong`);
        if (btn) btn.textContent = updatedReq.votes;
    };

    /* COMMUNITY CHAT DATA */
    async function loadCommunityMessages() {
        const stream = $("communityMessagesStream");
        if (!stream) return;
        try {
            const messages = await MehfilAPI.getCommunityMessages();
            stream.innerHTML = "";
            messages.forEach(msg => appendCommunityMessage(msg, false));
            stream.scrollTop = stream.scrollHeight;
        } catch (err) {
            stream.innerHTML = "<div>Unable to connect to community stream.</div>";
        }
    }

    function appendCommunityMessage(msg, scroll = true) {
        const stream = $("communityMessagesStream");
        if (!stream) return;

        const bubble = document.createElement("div");
        bubble.className = `chat-bubble ${msg.isShayari ? 'is-shayari' : ''}`;
        const timeAgo = formatTimeAgo(msg.timestamp);

        bubble.innerHTML = `
            <div class="chat-bubble-header">
                <div class="chat-user-badge">
                    <span>${msg.userAvatar || '🎶'}</span>
                    <span>${msg.userName}</span>
                    <span style="font-size:0.75rem; color:var(--accent); text-transform:capitalize;">• ${msg.mood || 'love'}</span>
                </div>
                <div class="chat-time">${timeAgo}</div>
            </div>
            <div class="chat-text">${msg.text}</div>
            <div class="chat-actions">
                <button class="like-msg-btn" data-id="${msg.id}">
                    <i class="fa-solid fa-heart"></i>
                    <span>${msg.likes || 0}</span>
                </button>
            </div>
        `;

        bubble.querySelector(".like-msg-btn").addEventListener("click", async () => {
            const updated = await MehfilAPI.likeCommunityMessage(msg.id);
            if (updated) {
                bubble.querySelector(".like-msg-btn span").textContent = updated.likes;
            }
        });

        stream.appendChild(bubble);
        if (scroll) stream.scrollTop = stream.scrollHeight;
    }

    window.onCommunityMessageReceived = function (msg) {
        appendCommunityMessage(msg, true);
    };

    function formatTimeAgo(ts) {
        const diff = Math.floor((Date.now() - ts) / 1000);
        if (diff < 60) return "just now";
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        return `${Math.floor(diff / 3600)}h ago`;
    }

    /* =====================================================
       MY MUSIC LIBRARY — PRIVATE PLAYLISTS
    ===================================================== */
    async function loadMusicLibrary() {
        activePlaylistId = null;
        activePlaylist = null;
        playlistSearchVersion++;
        clearTimeout(playlistSearchTimer);
        const searchInput = $("playlistSongSearchInput");
        const searchResults = $("playlistSongSearchResults");
        if (searchInput) searchInput.value = "";
        if (searchResults) {
            searchResults.hidden = true;
            searchResults.innerHTML = "";
        }
        const detail = $("playlistDetail");
        if (detail) detail.hidden = true;
        renderLibraryRecent();
        await Promise.all([loadPlaylists(), loadFavoritesModal()]);
    }

    async function loadPlaylists() {
        const listEl = $("playlistsList");
        const countEl = $("playlistCount");
        if (!listEl) return;
        listEl.innerHTML = '<p class="library-empty">Loading your playlists...</p>';

        try {
            const playlists = await MehfilAPI.getPlaylists();
            if (countEl) countEl.textContent = `${playlists.length} PLAYLIST${playlists.length === 1 ? "" : "S"}`;
            listEl.innerHTML = "";
            if (!playlists.length) {
                listEl.innerHTML = '<p class="library-empty">No playlists yet. Create one above to start your collection.</p>';
                return;
            }

            playlists.forEach(playlist => {
                const card = document.createElement("div");
                card.className = "library-playlist-card";

                const copy = document.createElement("div");
                copy.className = "library-playlist-card-copy";
                const name = document.createElement("strong");
                name.className = "library-playlist-card-name";
                name.textContent = playlist.name;
                const meta = document.createElement("small");
                meta.className = "library-playlist-card-meta";
                meta.textContent = `${Number(playlist.songCount) || 0} song${Number(playlist.songCount) === 1 ? "" : "s"}`;
                copy.append(name, meta);

                const open = document.createElement("button");
                open.type = "button";
                open.className = "library-playlist-open-btn";
                open.title = "Open playlist";
                open.setAttribute("aria-label", `Open ${playlist.name}`);
                open.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
                open.addEventListener("click", () => openPlaylistDetail(playlist.id));

                card.append(copy, open);
                listEl.appendChild(card);
            });
        } catch (error) {
            console.error("[MEHFIL] Could not load playlists:", error);
            listEl.innerHTML = '<p class="library-empty">Your playlists could not be loaded. Please try again.</p>';
        }
    }

    async function openPlaylistDetail(playlistId) {
        playlistSearchVersion++;
        const searchResults = $("playlistSongSearchResults");
        if (searchResults) {
            searchResults.hidden = true;
            searchResults.innerHTML = "";
        }
        const detail = $("playlistDetail");
        const songsEl = $("playlistSongsList");
        const titleEl = $("playlistDetailTitle");
        if (!detail || !songsEl || !titleEl) return;

        songsEl.innerHTML = '<p class="library-empty">Loading playlist...</p>';
        detail.hidden = false;
        activePlaylistId = Number(playlistId);

        try {
            const playlist = await MehfilAPI.getPlaylist(activePlaylistId);
            if (activePlaylistId !== Number(playlistId)) return;
            activePlaylist = playlist;
            titleEl.textContent = playlist.name;
            renderPlaylistSongs(playlist);
        } catch (error) {
            console.error("[MEHFIL] Could not open playlist:", error);
            songsEl.innerHTML = '<p class="library-empty">Playlist could not be opened. Refresh and try again.</p>';
        }
    }

    function renderPlaylistSongs(playlist) {
        const listEl = $("playlistSongsList");
        if (!listEl) return;
        listEl.innerHTML = "";

        (playlist.songs || []).forEach((song, index) => {
            const row = createLibrarySongRow(song, {
                playLabel: "Play song",
                onPlay: () => playPlaylistTrack(playlist.songs, index),
                extraClass: "playlist-song-row"
            });
            const remove = document.createElement("button");
            remove.type = "button";
            remove.className = "playlist-remove-btn";
            remove.title = "Remove from playlist";
            remove.setAttribute("aria-label", `Remove ${song.title} from playlist`);
            remove.innerHTML = '<i class="fa-solid fa-xmark"></i>';
            remove.addEventListener("click", async () => {
                try {
                    await MehfilAPI.removeSongFromPlaylist(playlist.id, song.id);
                    await openPlaylistDetail(playlist.id);
                    await loadPlaylists();
                    window.showMehfilToast("Removed from playlist.");
                } catch (error) {
                    console.error("[MEHFIL] Could not remove playlist song:", error);
                    window.showMehfilToast(error.message || "Could not remove this song.");
                }
            });
            row.querySelector(".song-item-actions")?.appendChild(remove);
            listEl.appendChild(row);
        });
    }

    function createLibrarySongRow(song, options = {}) {
        const row = document.createElement("div");
        row.className = `song-item-row ${options.extraClass || ""}`;

        const info = document.createElement("div");
        info.className = "song-item-info";
        if (song.cover) {
            const cover = document.createElement("img");
            cover.className = "song-item-cover";
            cover.src = song.cover;
            cover.alt = "";
            cover.loading = "lazy";
            cover.decoding = "async";
            info.appendChild(cover);
        }
        const meta = document.createElement("div");
        meta.className = "song-item-meta";
        const title = document.createElement("div");
        title.className = "song-item-title";
        title.textContent = song.title || "Unknown song";
        const artist = document.createElement("div");
        artist.className = "song-item-artist";
        artist.textContent = song.artist || "Unknown artist";
        meta.append(title, artist);
        info.appendChild(meta);

        const actions = document.createElement("div");
        actions.className = "song-item-actions";
        const play = document.createElement("button");
        play.type = "button";
        play.className = "play-item-btn";
        play.title = options.playLabel || "Play song";
        play.setAttribute("aria-label", options.playLabel || `Play ${song.title || "song"}`);
        play.innerHTML = '<i class="fa-solid fa-play"></i>';
        play.addEventListener("click", options.onPlay || (() => {
            closeModal();
            playSong(song, true);
        }));
        actions.appendChild(play);
        row.append(info, actions);
        return row;
    }

    function playPlaylistTrack(playlistSongs, selectedIndex) {
        const playable = (Array.isArray(playlistSongs) ? playlistSongs : []).filter(song => {
            const ids = [song.youtubeId, song.backupId].filter(Boolean);
            return ids.length && ids.some(id => !state.unavailableVideoIds.has(String(id)));
        });
        if (!playable.length) {
            window.showMehfilToast("This playlist has no playable tracks yet.");
            return;
        }
        const selectedSong = playlistSongs[selectedIndex];
        const startIndex = playable.findIndex(song => String(song.id) === String(selectedSong?.id));
        if (startIndex < 0) {
            window.showMehfilToast("This track is currently unavailable.");
            return;
        }

        state.isPersonalRadio = false;
        state.isRadioSyncMode = false;
        updatePersonalRadioButtonUI();
        updateRadioBadgeUI();
        state.songs = playable;
        state.currentIndex = startIndex;
        closeModal();
        playSongAtIndex(startIndex, true);
    }

    function renderLibraryRecent() {
        const listEl = $("libraryRecentList");
        if (!listEl) return;
        listEl.innerHTML = "";
        if (!state.recentSongs.length) {
            listEl.innerHTML = '<p class="library-recent-empty">Songs you play will appear here.</p>';
            return;
        }
        state.recentSongs.forEach(song => {
            listEl.appendChild(createLibrarySongRow(song, {
                onPlay: () => {
                    closeModal();
                    playSong(song, true);
                }
            }));
        });
    }

    async function searchPlaylistCatalog(query) {
        const resultsEl = $("playlistSongSearchResults");
        if (!resultsEl || !activePlaylistId) return;
        const searchVersion = ++playlistSearchVersion;
        const normalized = String(query || "").trim().toLowerCase();
        if (normalized.length < 2) {
            resultsEl.hidden = true;
            resultsEl.innerHTML = "";
            return;
        }

        resultsEl.hidden = false;
        resultsEl.innerHTML = '<p class="library-empty">Searching MEHFIL library...</p>';
        try {
            if (!musicLibraryCatalog) {
                musicLibraryCatalog = await MehfilAPI.getSongs({ mood: "all", limit: 300 });
            }
            if (searchVersion !== playlistSearchVersion) return;

            const matches = (Array.isArray(musicLibraryCatalog) ? musicLibraryCatalog : [])
                .filter(song => {
                    const ids = [song.youtubeId, song.backupId].filter(Boolean);
                    const playable = ids.some(id => !state.unavailableVideoIds.has(String(id)));
                    const text = [song.title, song.artist, song.album].join(" ").toLowerCase();
                    return playable && text.includes(normalized);
                })
                .slice(0, 15);

            resultsEl.innerHTML = "";
            if (!matches.length) {
                resultsEl.innerHTML = '<p class="library-empty">No matching songs found in the MEHFIL library.</p>';
                return;
            }

            matches.forEach(song => {
                const row = document.createElement("div");
                row.className = "library-song-picker-row";
                const copy = document.createElement("div");
                copy.className = "library-song-picker-info";
                const title = document.createElement("strong");
                title.textContent = song.title;
                const artist = document.createElement("small");
                artist.textContent = song.artist || "Unknown artist";
                copy.append(title, artist);

                const add = document.createElement("button");
                add.type = "button";
                add.className = "library-song-picker-add";
                add.innerHTML = '<i class="fa-solid fa-plus"></i> Add';
                add.addEventListener("click", async () => {
                    const playlistId = activePlaylistId;
                    add.disabled = true;
                    try {
                        const result = await MehfilAPI.addSongToPlaylist(playlistId, song.id);
                        if (result.added) {
                            window.showMehfilToast("Added to playlist.");
                        } else {
                            window.showMehfilToast("This song is already in the playlist.");
                        }
                        await openPlaylistDetail(playlistId);
                        await loadPlaylists();
                        const input = $("playlistSongSearchInput");
                        if (input) await searchPlaylistCatalog(input.value);
                    } catch (error) {
                        console.error("[MEHFIL] Could not add playlist song:", error);
                        window.showMehfilToast(error.message || "Could not add this song.");
                        add.disabled = false;
                    }
                });
                row.append(copy, add);
                resultsEl.appendChild(row);
            });
        } catch (error) {
            if (searchVersion !== playlistSearchVersion) return;
            console.error("[MEHFIL] Playlist search failed:", error);
            resultsEl.innerHTML = '<p class="library-empty">Song search is temporarily unavailable.</p>';
        }
    }

    function attachPlaylistControls() {
        const createForm = $("createPlaylistForm");
        const nameInput = $("playlistNameInput");
        if (createForm && nameInput) {
            createForm.addEventListener("submit", async event => {
                event.preventDefault();
                const name = nameInput.value.trim().replace(/\s+/g, " ");
                if (!name) return;
                const submit = createForm.querySelector('button[type="submit"]');
                if (submit) submit.disabled = true;
                try {
                    await MehfilAPI.createPlaylist(name);
                    nameInput.value = "";
                    await loadPlaylists();
                    window.showMehfilToast(`Created playlist "${name}".`);
                } catch (error) {
                    window.showMehfilToast(error.message || "Could not create playlist.");
                } finally {
                    if (submit) submit.disabled = false;
                }
            });
        }

        const searchInput = $("playlistSongSearchInput");
        const searchForm = $("addPlaylistSongForm");
        if (searchForm) {
            searchForm.addEventListener("submit", event => {
                event.preventDefault();
                searchPlaylistCatalog(searchInput?.value || "");
            });
        }
        if (searchInput) {
            searchInput.addEventListener("input", () => {
                clearTimeout(playlistSearchTimer);
                playlistSearchTimer = setTimeout(() => searchPlaylistCatalog(searchInput.value), 220);
            });
        }

        const playButton = $("playPlaylistButton");
        if (playButton) {
            playButton.addEventListener("click", () => {
                if (activePlaylist) playPlaylistTrack(activePlaylist.songs || [], 0);
            });
        }

        const renameButton = $("renamePlaylistButton");
        if (renameButton) {
            renameButton.addEventListener("click", async () => {
                if (!activePlaylist) return;
                const name = window.prompt("Rename playlist", activePlaylist.name);
                if (name === null) return;
                const cleaned = name.trim().replace(/\s+/g, " ");
                if (!cleaned) {
                    window.showMehfilToast("Playlist name cannot be empty.");
                    return;
                }
                try {
                    await MehfilAPI.renamePlaylist(activePlaylist.id, cleaned);
                    await openPlaylistDetail(activePlaylist.id);
                    await loadPlaylists();
                    window.showMehfilToast("Playlist renamed.");
                } catch (error) {
                    window.showMehfilToast(error.message || "Could not rename playlist.");
                }
            });
        }

        const deleteButton = $("deletePlaylistButton");
        if (deleteButton) {
            deleteButton.addEventListener("click", async () => {
                if (!activePlaylist) return;
                if (!window.confirm(`Delete "${activePlaylist.name}" and all songs in it?`)) return;
                try {
                    await MehfilAPI.deletePlaylist(activePlaylist.id);
                    activePlaylist = null;
                    activePlaylistId = null;
                    const detail = $("playlistDetail");
                    if (detail) detail.hidden = true;
                    await loadPlaylists();
                    window.showMehfilToast("Playlist deleted.");
                } catch (error) {
                    window.showMehfilToast(error.message || "Could not delete playlist.");
                }
            });
        }

        const closeDetail = $("closePlaylistDetailButton");
        if (closeDetail) {
            closeDetail.addEventListener("click", () => {
                playlistSearchVersion++;
                activePlaylist = null;
                activePlaylistId = null;
                const searchResults = $("playlistSongSearchResults");
                if (searchResults) {
                    searchResults.hidden = true;
                    searchResults.innerHTML = "";
                }
                const detail = $("playlistDetail");
                if (detail) detail.hidden = true;
            });
        }
    }

    /* FAVORITES MODAL */
    async function loadFavoritesModal() {
        const listEl = $("favoritesList");
        if (!listEl) return;
        listEl.innerHTML = "<div style='text-align:center; padding:20px; color:var(--muted);'>Loading your loved songs...</div>";

        try {
            const favs = await MehfilAPI.getFavorites();
            listEl.innerHTML = "";
            if (!favs.length) {
                listEl.innerHTML = "<div style='text-align:center; padding:20px; color:var(--muted);'>No favorite songs saved yet. Tap the heart ❤️ on any track!</div>";
                return;
            }

            favs.forEach(song => {
                const row = document.createElement("div");
                row.className = "song-item-row";
                row.innerHTML = `
                    <div class="song-item-info">
                        <img class="song-item-cover" src="${song.cover || ''}" alt="${song.title}" loading="lazy" decoding="async">
                        <div class="song-item-meta">
                            <div class="song-item-title">${song.title}</div>
                            <div class="song-item-artist">${song.artist} • <span style="text-transform:capitalize; color:var(--accent);">${song.mood}</span></div>
                        </div>
                    </div>
                    <div class="song-item-actions">
                        <button class="fav-item-btn favorited" data-id="${song.id}">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                        <button class="play-item-btn">
                            <i class="fa-solid fa-play"></i>
                        </button>
                    </div>
                `;

                row.querySelector(".play-item-btn").addEventListener("click", () => {
                    closeModal();
                    playSong(song, true);
                });

                row.querySelector(".fav-item-btn").addEventListener("click", async () => {
                    await MehfilAPI.toggleFavorite(song.id);
                    state.favoriteSongIds.delete(song.id);
                    loadFavoritesModal();
                    if (state.currentSong && state.currentSong.id === song.id) {
                        updateFavoriteButtonUI(song.id);
                    }
                });

                listEl.appendChild(row);
            });
        } catch (err) {
            listEl.innerHTML = "<div>Error fetching favorites.</div>";
        }
    }

    /* =====================================================
       KEYBOARD SHORTCUTS
    ===================================================== */
    function attachKeyboardShortcuts() {
        window.addEventListener("keydown", (e) => {
            // Ignore if user is typing inside an input or textarea
            const tag = document.activeElement.tagName;
            if (tag === "INPUT" || tag === "TEXTAREA") {
                if (e.key === "Escape") closeModal();
                return;
            }

            if (e.key === " ") {
                e.preventDefault();
                MehfilAudioPlayer.toggle();
            } else if (e.key === "ArrowRight" || e.key === "n" || e.key === "N") {
                e.preventDefault();
                playSongAtIndex(state.currentIndex + 1, true);
            } else if (e.key === "ArrowLeft" || e.key === "p" || e.key === "P") {
                e.preventDefault();
                playSongAtIndex(state.currentIndex - 1, true);
            } else if (e.key === "m" || e.key === "M") {
                e.preventDefault();
                const muted = MehfilAudioPlayer.toggleMute();
                updateVolumeIcon(muted ? 0 : MehfilAudioPlayer.getVolume());
            } else if (e.key === "s" || e.key === "S") {
                state.isShuffle = !state.isShuffle;
                window.showMehfilToast(state.isShuffle ? "Shuffle ON 🔀" : "Shuffle OFF");
            } else if (e.key === "r" || e.key === "R") {
                state.isRepeat = !state.isRepeat;
                window.showMehfilToast(state.isRepeat ? "Repeat ON 🔁" : "Repeat OFF");
            } else if (e.key === "Escape") {
                closeModal();
            } else if (["1", "2", "3", "4", "5", "6"].includes(e.key)) {
                const moods = ["love", "dard", "sukoon", "safar", "happy", "late-night"];
                const targetMood = moods[Number(e.key) - 1];
                if (targetMood) switchMood(targetMood, true);
            }
        });
    }

})();
