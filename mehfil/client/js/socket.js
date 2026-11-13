/* =========================================================
   MEHFIL — socket.js
   Real-Time Audience & WebSockets Manager
   ========================================================= */

const MehfilSocket = (function () {
    "use strict";

    const BACKEND_URL = "https://mehfil-backend-ing6.onrender.com";
    const API_URL = BACKEND_URL + "/api";
    const HEARTBEAT_INTERVAL = 25000;
    const VALID_MOODS = new Set(["love", "dard", "sukoon", "safar", "happy", "late-night"]);

    let socket = null;
    let currentUser = null;
    let currentMood = "love";
    let isConnected = false;
    let heartbeatTimer = null;
    let heartbeatInFlight = false;
    let heartbeatFailureLogged = false;

    function getClientId() {
        return window.MehfilAPI?.getUserId?.() || null;
    }

    async function sendHeartbeat() {
        const clientId = getClientId();
        if (!clientId || heartbeatInFlight) return;

        heartbeatInFlight = true;
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), 9000);

        try {
            const response = await fetch(API_URL + "/presence/heartbeat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-user-id": clientId
                },
                body: JSON.stringify({ mood: currentMood }),
                signal: controller.signal,
                cache: "no-store"
            });

            if (!response.ok) throw new Error("Presence heartbeat HTTP " + response.status);
            const payload = await response.json();
            if (payload?.stats) updateAudienceUI(payload.stats);

            if (heartbeatFailureLogged) {
                console.info("[PRESENCE] Live audience sync restored.");
                heartbeatFailureLogged = false;
            }
        } catch (error) {
            if (!heartbeatFailureLogged) {
                console.warn("[PRESENCE] Heartbeat unavailable; retrying automatically.", error.message);
                heartbeatFailureLogged = true;
                markAudienceUnavailable();
            }
        } finally {
            window.clearTimeout(timeoutId);
            heartbeatInFlight = false;
        }
    }

    function markAudienceUnavailable() {
        ["headerListeners", "liveListeners", "bottomListeners", "centerListeners", "loveCount", "dardCount", "sukoonCount", "safarCount", "happyCount", "nightCount"].forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.textContent = "—";
        });
        const extra = document.getElementById("extraListeners");
        if (extra) extra.style.display = "none";
    }

    function startHeartbeat() {
        if (heartbeatTimer) window.clearInterval(heartbeatTimer);
        sendHeartbeat();
        heartbeatTimer = window.setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
    }

    function init(initialMood = "love") {
        currentMood = VALID_MOODS.has(initialMood) ? initialMood : "love";
        startHeartbeat();

        if (typeof window.io !== "function") {
            console.error("[SOCKET] Socket.IO client failed to load. HTTP presence fallback remains active.");
            return;
        }

        // Prevent duplicate connections if initialization is triggered again.
        if (socket) {
            socket.removeAllListeners();
            socket.disconnect();
        }

        socket = window.io(BACKEND_URL, {
            auth: { userId: getClientId() },
            query: { mood: currentMood },
            transports: ["websocket", "polling"],
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 10000,
            timeout: 20000
        });

        socket.on("connect", () => {
            isConnected = true;
            console.log("[SOCKET] Connected to MEHFIL backend:", socket.id);
            const liveBadge = document.querySelector(".header-live");
            if (liveBadge) liveBadge.title = "Live audience connected and syncing";
            sendHeartbeat();
            if (window.MehfilAPI?.clearCache) window.MehfilAPI.clearCache();
            if (typeof window.onCommunitySocketReconnected === "function") {
                window.onCommunitySocketReconnected();
            }
        });

        socket.on("connect_error", (error) => {
            isConnected = false;
            const liveBadge = document.querySelector(".header-live");
            if (liveBadge) liveBadge.title = "Live audience is temporarily unavailable; reconnecting";
            console.error("[SOCKET] Connection failed:", error.message);
        });

        socket.on("presence:welcome", (data) => {
            currentUser = data?.user || null;
            if (data?.stats) updateAudienceUI(data.stats);

            const userBadgeEl = document.getElementById("myUserBadge");
            if (userBadgeEl && currentUser) {
                userBadgeEl.textContent = `${currentUser.avatar} ${currentUser.nickname}`;
            }
        });

        socket.on("presence:update", updateAudienceUI);

        socket.on("community:message", (msg) => {
            if (typeof window.onCommunityMessageReceived === "function") {
                window.onCommunityMessageReceived(msg);
            }
        });

        socket.on("community:like", (msg) => {
            if (typeof window.onCommunityLikeReceived === "function") {
                window.onCommunityLikeReceived(msg);
            }
        });

        socket.on("community:reaction", (reactionData) => {
            spawnFloatingReaction(reactionData?.reaction || "❤️");
        });

        socket.on("request:new", (newReq) => {
            if (typeof window.onRequestReceived === "function") {
                window.onRequestReceived(newReq);
            }
        });

        socket.on("request:vote", (updatedReq) => {
            if (typeof window.onRequestVoted === "function") {
                window.onRequestVoted(updatedReq);
            }
        });

        socket.on("radio:track_change", (radioState) => {
            if (typeof window.onRadioTrackChange === "function") {
                window.onRadioTrackChange(radioState);
            }
        });

        socket.on("disconnect", (reason) => {
            isConnected = false;
            const liveBadge = document.querySelector(".header-live");
            if (liveBadge) liveBadge.title = "Realtime reconnecting; live count continues through HTTP heartbeat";
            console.warn("[SOCKET] Disconnected from MEHFIL backend:", reason);
        });
    }

    function updateAudienceUI(stats) {
        if (!stats || !Number.isFinite(Number(stats.total))) return;

        const total = Math.max(0, Math.floor(Number(stats.total)));
        const formattedTotal = total.toLocaleString();

        ["headerListeners", "liveListeners", "bottomListeners", "centerListeners"].forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.textContent = formattedTotal;
        });

        const extraEl = document.getElementById("extraListeners");
        const avatarSlots = document.querySelectorAll(".listener-avatars > div");
        avatarSlots.forEach((slot, index) => {
            slot.style.display = index < Math.min(total, 7) ? "" : "none";
        });
        if (extraEl) {
            extraEl.textContent = "+" + Math.max(0, total - 7).toLocaleString();
            extraEl.style.display = total > 7 ? "" : "none";
        }

        if (stats.moods) {
            const moodMap = {
                loveCount: stats.moods.love,
                dardCount: stats.moods.dard,
                sukoonCount: stats.moods.sukoon,
                safarCount: stats.moods.safar,
                happyCount: stats.moods.happy,
                nightCount: stats.moods["late-night"]
            };

            Object.entries(moodMap).forEach(([id, count]) => {
                const el = document.getElementById(id);
                if (el && Number.isFinite(Number(count))) {
                    el.textContent = Math.max(0, Number(count)).toLocaleString();
                }
            });
        }
    }

    function spawnFloatingReaction(emoji = "❤️") {
        const container = document.getElementById("reactionsContainer");
        if (!container) return;

        const el = document.createElement("div");
        el.className = "floating-reaction";
        el.textContent = emoji;
        el.style.left = `${Math.floor(Math.random() * 80)}px`;
        container.appendChild(el);

        window.setTimeout(() => {
            if (el.parentNode) el.parentNode.removeChild(el);
        }, 3400);
    }

    return {
        init,
        getCurrentUser: () => currentUser,
        isConnected: () => isConnected,

        setMood: (mood) => {
            currentMood = VALID_MOODS.has(mood) ? mood : "love";
            if (socket?.connected) socket.emit("mood:change", currentMood);
            sendHeartbeat();
        },

        sendReaction: (type) => {
            spawnFloatingReaction(type);
            if (socket?.connected) socket.emit("community:reaction", { type });
        },

        sendMessage: (data) => {
            if (socket?.connected) socket.emit("community:message", data);
        },

        submitRequest: (data) => {
            if (socket?.connected) socket.emit("request:new", data);
        },

        voteRequest: (id) => {
            if (socket?.connected) socket.emit("request:vote", id);
        },

        syncRadio: () => new Promise((resolve) => {
            if (!socket?.connected) return resolve(null);
            socket.emit("radio:sync", (state) => resolve(state));
        })
    };
})();

// app.js checks the browser global before starting realtime presence.
// Expose the manager so the heartbeat and live-count UI actually initialize.
window.MehfilSocket = MehfilSocket;
