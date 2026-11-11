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
                controls: 1,
                disablekb: 0,
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

    function onPlayerStateChange(event) {
        if (!window.YT) return;

        if (event.data === window.YT.PlayerState.PLAYING) {
            isPlaying = true;
            triedBackup = false;
            errorRecoveryInProgress = false; // A playable source was found
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
            if (typeof window.onSongEnded === "function") {
                window.onSongEnded();
            }
        }
    }

    function onPlayerError(event) {
        const errorCode = event.data || event;
        if (errorRecoveryInProgress) return;
        errorRecoveryInProgress = true;
        console.warn(`[PLAYER] YouTube rejected this video (code ${errorCode}); trying recovery.`);

        // If song has a backup ID and we haven't tried it yet, try the backup stream!
        if (currentSong && currentSong.backupId && currentSong.backupId !== currentSong.youtubeId && !triedBackup) {
            triedBackup = true;
            // Let exactly one error from the backup source enter recovery.
            // Once that fails, the recovery lock stays set until the next track.
            errorRecoveryInProgress = false;
            console.log(`[PLAYER] Trying backup source for "${currentSong.title}"...`);
            if (ytPlayer && typeof ytPlayer.loadVideoById === "function") {
                ytPlayer.loadVideoById({
                    videoId: currentSong.backupId,
                    startSeconds: 0
                });
                return;
            }
        }

        // Otherwise smoothly advance to next song without alarming the user
        // The video cannot be embedded (for example YouTube error 150).
        // Skip it once; the next track gets a fresh recovery state.
        setTimeout(() => {
            // loadSong() resets this lock for the next track.
            if (typeof window.onSongEnded === "function") {
                window.onSongEnded();
            }
        }, 800);
    }

    function loadSong(song, autoPlay = true, seekSeconds = 0) {
        currentSong = song;
        triedBackup = false;
        errorRecoveryInProgress = false;
        if (!song) return;

        console.log(`[PLAYER] Tuning into: "${song.title}" - ${song.artist}`);

        if (ytReady && ytPlayer && typeof ytPlayer.loadVideoById === "function") {
            const vidId = song.youtubeId || song.backupId;
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
        isPlaying = true;
        updatePlayPauseUI(true);
        startProgressLoop();
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
