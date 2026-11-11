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
        isShuffle: false,
        isRepeat: false,
        recentSongs: [],
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

    // Toast Notification
    window.showMehfilToast = function (text) {
        let toast = $("mehfilToast");
        if (!toast) {
            toast = document.createElement("div");
            toast.id = "mehfilToast";
            toast.className = "mehfil-toast";
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
        state.currentMood = mood;
        state.isRadioSyncMode = false;
        updateRadioBadgeUI();

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
            if (songs && songs.length) {
                state.songs = songs;
                state.currentIndex = 0;
                playSongAtIndex(0, autoPlay);
            }
        } catch (err) {
            console.error("[MEHFIL] Error loading mood songs:", err);
        }
    }

    async function handleSurpriseMe() {
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

        // Record play on backend
        MehfilAPI.recordPlay(song.id).catch(() => {});

        // Add to Recently Played
        addToRecent(song);

        // Send to Audio Player
        MehfilAudioPlayer.loadSong(song, autoPlay, seekSeconds);
    }

    function addToRecent(song) {
        // Prevent duplicate consecutive entries
        state.recentSongs = state.recentSongs.filter(s => s.id !== song.id);
        state.recentSongs.unshift(song);
        if (state.recentSongs.length > 6) state.recentSongs.pop();

        renderRecentList();
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

    // Auto next track when song finishes
    window.onSongEnded = function () {
        if (state.isRepeat) {
            playSongAtIndex(state.currentIndex, true);
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
        if (state.isRadioSyncMode && radioState && radioState.currentSong) {
            window.showMehfilToast(`📻 Radio Station: "${radioState.currentSong.title}"`);
            playSong(radioState.currentSong, true, radioState.elapsedSeconds);
        }
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
        document.querySelectorAll("a[href='#favorites']").forEach(el => el.addEventListener("click", (e) => { e.preventDefault(); openModal("favoritesModal"); loadFavoritesModal(); }));
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
