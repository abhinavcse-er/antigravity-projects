/* =========================================================
   MEHFIL — player.js
   Resilient Audio Engine with Backup ID & Fallback Recovery
   ========================================================= */

const MehfilAudioPlayer = (function () {
    "use strict";

    let ytPlayer = null;
    let ytReady = false;
    let isPlaying = false;
    let currentSong = null;
    let currentVolume = 75;
    let isMuted = false;
    let progressTimer = null;
    let triedBackup = false;
    let errorRecoveryInProgress = false;
    let hasUserInteracted = false;
    let loadGeneration = 0;
    let activeVideoId = null;
    let pendingErrorTimer = null;
    let playbackRecordedForLoad = false;

    // Track user gesture to satisfy browser autoplay policy
    document.addEventListener("click", () => { hasUserInteracted = true; }, { once: true });
    document.addEventListener("keydown", () => { hasUserInteracted = true; }, { once: true });

    function initYouTube() {
        if (window.YT && window.YT.Player) {
            setupPlayer();
            return;
        }

        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName("script")[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

        window.onYouTubeIframeAPIReady = function () {
            setupPlayer();
        };
    }

    function setupPlayer() {
        const container = document.getElementById("youtubePlayer");
        if (!container) return;

        // Clean any existing iframes inside container
        container.innerHTML = "";

        ytPlayer = new window.YT.Player("youtubePlayer", {
            height: "100%",
            width: "100%",
            playerVars: {
                autoplay: 0,
                controls: 0,
                disablekb: 1,
                fs: 0,
                modestbranding: 1,
                rel: 0,
                playsinline: 1,
                iv_load_policy: 3,
                origin: window.location.origin,
                enablejsapi: 1
            },
            events: {
                onReady: onPlayerReady,
                onStateChange: onPlayerStateChange,
                onError: onPlayerError
            }
        });
    }

    function onPlayerReady() {
        ytReady = true;
        if (ytPlayer && typeof ytPlayer.setVolume === "function") {
            ytPlayer.setVolume(currentVolume);
        }
        console.log("[PLAYER] Audio Engine ready.");

        // If a song was queued before player was ready
        if (currentSong) {
            // A delayed iframe-ready callback cannot reuse the original mobile tap.
            // Cue the selected track and let the user start it with a fresh tap.
            loadSong(currentSong, false);
        }
    }

    function isCurrentPlayerEvent(event) {
        if (!activeVideoId) return true;
        const eventVideoId = event?.target?.getVideoData?.()?.video_id;
        return !eventVideoId || eventVideoId === activeVideoId;
    }

    function onPlayerStateChange(event) {
        if (!window.YT || !isCurrentPlayerEvent(event)) return;

        if (event.data === window.YT.PlayerState.PLAYING) {
            isPlaying = true;
            errorRecoveryInProgress = false;
            if (!playbackRecordedForLoad) {
                playbackRecordedForLoad = true;
                if (typeof window.onSongPlaybackStarted === "function") {
                    window.onSongPlaybackStarted(currentSong);
                }
            }
            updatePlayPauseUI(true);
            startProgressLoop();
        } else if (event.data === window.YT.PlayerState.PAUSED) {
            isPlaying = false;
            updatePlayPauseUI(false);
            stopProgressLoop();
        } else if (event.data === window.YT.PlayerState.ENDED) {
            isPlaying = false;
            updatePlayPauseUI(false);
            stopProgressLoop();
            const endedGeneration = loadGeneration;
            if (typeof window.onSongEnded === "function" && endedGeneration === loadGeneration) {
                window.onSongEnded();
            }
        }
    }

    function onPlayerError(event) {
        if (!isCurrentPlayerEvent(event)) return;
        const errorCode = event?.data || event;
        if (errorRecoveryInProgress) return;
        errorRecoveryInProgress = true;
        const failedSong = currentSong;
        const failedGeneration = loadGeneration;
        console.warn(`[PLAYER] YouTube rejected "${failedSong?.title || "this video"}" (code ${errorCode}).`);

        // YouTube errors 101/150 mean embedding is forbidden. Try one distinct
        // backup ID, then skip this track; never retry the same rejected video.
        const backupId = String(failedSong?.backupId || "").trim();
        if (backupId && backupId !== activeVideoId && !triedBackup &&
            ytPlayer && typeof ytPlayer.loadVideoById === "function") {
            triedBackup = true;
            activeVideoId = backupId;
            errorRecoveryInProgress = false;
            console.log(`[PLAYER] Trying backup source for "${failedSong.title}"...`);
            ytPlayer.loadVideoById({ videoId: backupId, startSeconds: 0 });
            return;
        }

        if (pendingErrorTimer) clearTimeout(pendingErrorTimer);
        pendingErrorTimer = setTimeout(() => {
            pendingErrorTimer = null;
            // Ignore delayed errors from a previous track after the user has
            // already selected another song.
            if (failedGeneration !== loadGeneration || failedSong !== currentSong) return;
            isPlaying = false;
            stopProgressLoop();
            updatePlayPauseUI(false);
            if (typeof window.onSongUnavailable === "function") {
                window.onSongUnavailable(failedSong, [failedSong?.youtubeId, failedSong?.backupId].filter(Boolean));
            } else if (typeof window.onSongEnded === "function") {
                window.onSongEnded();
            }
        }, 500);
    }

    function loadSong(song, autoPlay = true, seekSeconds = 0) {
        if (!song) return;
        loadGeneration++;
        if (pendingErrorTimer) {
            clearTimeout(pendingErrorTimer);
            pendingErrorTimer = null;
        }
        currentSong = song;
        playbackRecordedForLoad = false;
        triedBackup = false;
        errorRecoveryInProgress = false;
        activeVideoId = String(song.youtubeId || song.backupId || "").trim() || null;
        isPlaying = false;
        stopProgressLoop();

        console.log(`[PLAYER] Tuning into: "${song.title}" - ${song.artist}`);

        if (!activeVideoId) {
            updatePlayPauseUI(false);
            if (typeof window.onSongEnded === "function") {
                const failedGeneration = loadGeneration;
                setTimeout(() => {
                    if (failedGeneration === loadGeneration) window.onSongEnded();
                }, 0);
            }
            return;
        }

        if (ytReady && ytPlayer && typeof ytPlayer.loadVideoById === "function") {
            const vidId = activeVideoId;
            if (autoPlay && hasUserInteracted) {
                ytPlayer.loadVideoById({
                    videoId: vidId,
                    startSeconds: seekSeconds || 0
                });
                isPlaying = true;
                updatePlayPauseUI(true);
                startProgressLoop();
            } else {
                ytPlayer.cueVideoById({
                    videoId: vidId,
                    startSeconds: seekSeconds || 0
                });
                isPlaying = false;
                updatePlayPauseUI(false);
            }
        } else {
            // Keep the selected track queued; onPlayerReady() will cue it once
            // the official YouTube iframe has finished loading.
            updatePlayPauseUI(false);
        }
    }

    function play() {
        hasUserInteracted = true;
        if (!ytReady || !ytPlayer || typeof ytPlayer.playVideo !== "function") {
            updatePlayPauseUI(false);
            if (typeof window.showMehfilToast === "function") {
                window.showMehfilToast("Player is still loading. Please tap Play again in a moment.");
            }
            return;
        }

        ytPlayer.playVideo();
        // Wait for YouTube's PLAYING event before changing the UI or progress timer.
    }

    function pause() {
        if (ytPlayer && typeof ytPlayer.pauseVideo === "function") {
            ytPlayer.pauseVideo();
            isPlaying = false;
            updatePlayPauseUI(false);
            stopProgressLoop();
        }
    }

    function toggle() {
        hasUserInteracted = true;
        if (isPlaying) {
            pause();
        } else {
            play();
        }
    }

    function seek(percentage) {
        if (!ytPlayer || typeof ytPlayer.getDuration !== "function") return;
        const duration = ytPlayer.getDuration() || (currentSong ? currentSong.duration : 240);
        const seekTo = (percentage / 100) * duration;
        ytPlayer.seekTo(seekTo, true);
        updateProgress(seekTo, duration);
    }

    function setVolume(val) {
        currentVolume = Math.max(0, Math.min(100, val));
        if (ytPlayer && typeof ytPlayer.setVolume === "function") {
            ytPlayer.setVolume(currentVolume);
        }
        if (currentVolume > 0 && isMuted) {
            isMuted = false;
            if (ytPlayer && typeof ytPlayer.unMute === "function") ytPlayer.unMute();
        }
    }

    function toggleMute() {
        if (!ytPlayer) return;
        if (isMuted) {
            ytPlayer.unMute();
            isMuted = false;
        } else {
            ytPlayer.mute();
            isMuted = true;
        }
        return isMuted;
    }

    function startProgressLoop() {
        stopProgressLoop();
        progressTimer = setInterval(() => {
            if (ytPlayer && typeof ytPlayer.getCurrentTime === "function") {
                const current = ytPlayer.getCurrentTime() || 0;
                const dur = ytPlayer.getDuration() || (currentSong ? currentSong.duration : 240);
                updateProgress(current, dur);
            }
        }, 500);
    }

    function stopProgressLoop() {
        if (progressTimer) {
            clearInterval(progressTimer);
            progressTimer = null;
        }
    }

    function formatTime(sec) {
        const s = Math.floor(sec || 0);
        const m = Math.floor(s / 60);
        const rem = s % 60;
        return `${m < 10 ? "0" : ""}${m}:${rem < 10 ? "0" : ""}${rem}`;
    }

    function updateProgress(currentTime, duration) {
        const curEl = document.getElementById("currentTime");
        const durEl = document.getElementById("duration");
        const fillEl = document.getElementById("progressFill");

        if (curEl) curEl.textContent = formatTime(currentTime);
        if (durEl && duration) durEl.textContent = formatTime(duration);

        if (fillEl && duration > 0) {
            const pct = Math.min(100, (currentTime / duration) * 100);
            fillEl.style.width = `${pct}%`;
        }
    }

    function updatePlayPauseUI(playing) {
        const playBtns = [document.getElementById("playButton"), document.getElementById("bottomPlay")];
        playBtns.forEach(btn => {
            if (!btn) return;
            const icon = btn.querySelector("i");
            if (icon) {
                if (playing) {
                    icon.classList.remove("fa-play");
                    icon.classList.add("fa-pause");
                } else {
                    icon.classList.remove("fa-pause");
                    icon.classList.add("fa-play");
                }
            }
        });

        // Toggle body class for wave animation (CSS uses body.is-playing)
        if (playing) {
            document.body.classList.add("is-playing");
        } else {
            document.body.classList.remove("is-playing");
        }

        // Also toggle wave class directly (for modals.css or additional style)
        const wave = document.getElementById("audioWave");
        if (wave) {
            if (playing) {
                wave.classList.add("is-playing");
            } else {
                wave.classList.remove("is-playing");
            }
        }
    }

    initYouTube();

    return {
        loadSong,
        play,
        pause,
        toggle,
        seek,
        setVolume,
        toggleMute,
        isPlaying: () => isPlaying,
        getCurrentSong: () => currentSong,
        getVolume: () => currentVolume,
        isMuted: () => isMuted
    };
})();
