/* =========================================================
   MEHFIL — socket.js
   Real-Time Audience & WebSockets Manager
   ========================================================= */

const MehfilSocket = (function () {
    "use strict";

    const BACKEND_URL = "https://mehfil-backend-ing6.onrender.com";
    const VALID_MOODS = new Set(["love", "dard", "sukoon", "safar", "happy", "late-night"]);

    let socket = null;
    let currentUser = null;
    let currentMood = "love";
    let isConnected = false;
    let presencePollTimer = null;

    async function refreshPresenceSnapshot() {
        try {
            const response = await fetch(`${BACKEND_URL}/api/status`, { cache: "no-store" });
            if (!response.ok) throw new Error(`Presence status HTTP ${response.status}`);
            const payload = await response.json();
            if (payload?.status === "online" && Number.isFinite(Number(payload.listeners))) {
                updateAudienceUI({ total: payload.listeners, moods: payload.moods || {} });
                document.body.classList.toggle("mehfil-live-connected", isConnected);
                return true;
            }
        } catch (error) {
            console.warn("[SOCKET] Presence snapshot unavailable:", error.message);
        }
        return false;
    }

    function init(initialMood = "love") {
        currentMood = VALID_MOODS.has(initialMood) ? initialMood : "love";

        if (typeof window.io !== "function") {
            console.error("[SOCKET] Socket.IO client failed to load. Check the CDN script in index.html.");
            return;
        }

        // Prevent duplicate connections if initialization is triggered again.
        if (socket) {
            socket.removeAllListeners();
            socket.disconnect();
        }

        socket = window.io(BACKEND_URL, {
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
            document.body.classList.add("mehfil-live-connected");
            console.log("[SOCKET] Connected to MEHFIL backend:", socket.id);
            refreshPresenceSnapshot();
        });

        socket.on("connect_error", (error) => {
            isConnected = false;
            document.body.classList.remove("mehfil-live-connected");
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

        socket.io.on("reconnect", () => refreshPresenceSnapshot());

        socket.on("disconnect", (reason) => {
            isConnected = false;
            document.body.classList.remove("mehfil-live-connected");
            console.warn("[SOCKET] Disconnected from MEHFIL backend:", reason);
        });

        // REST snapshot is a recovery path if a realtime presence packet is missed.
        if (presencePollTimer) window.clearInterval(presencePollTimer);
        refreshPresenceSnapshot();
        presencePollTimer = window.setInterval(() => {
            if (!document.hidden) refreshPresenceSnapshot();
        }, 15000);
        document.addEventListener("visibilitychange", () => {
            if (!document.hidden) refreshPresenceSnapshot();
        });
    }

    function updateAudienceUI(stats) {
        if (!stats || stats.total === undefined || !Number.isFinite(Number(stats.total))) return;

        const total = Math.max(0, Math.floor(Number(stats.total)));
        const formattedTotal = total.toLocaleString();

        ["headerListeners", "liveListeners", "bottomListeners", "centerListeners"].forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.textContent = formattedTotal;
        });

        // Seven decorative avatar slots are shown in the panel.
        const extraEl = document.getElementById("extraListeners");
        if (extraEl) {
            extraEl.textContent = `+${Math.max(0, total - 7).toLocaleString()}`;
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
