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
            console.log("[SOCKET] Connected to MEHFIL backend:", socket.id);
        });

        socket.on("connect_error", (error) => {
            isConnected = false;
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

        socket.on("disconnect", (reason) => {
            isConnected = false;
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
