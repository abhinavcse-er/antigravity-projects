/* =========================================================
   MEHFIL — socket.js
   Real-Time Audience & WebSockets Manager
   ========================================================= */

const MehfilSocket = (function () {
    "use strict";

    let socket = null;
    let currentUser = null;
    let currentMood = "love";
    let isConnected = false;

    function init(initialMood = "love") {
        currentMood = initialMood;
        if (typeof io === "undefined") {
            console.warn("[SOCKET] Socket.IO client script not found. Realtime features offline.");
            return;
        }

       socket = io("https://mehfil-backend-ing6.onrender.com", {
    query: { mood: initialMood },
    transports: ["websocket", "polling"]
});

        socket.on("connect", () => {
            isConnected = true;
            console.log("[SOCKET] Connected to Mehfil Live Network!");
        });

        socket.on("presence:welcome", (data) => {
            currentUser = data.user;
            console.log("[SOCKET] Welcome identity:", currentUser);
            updateAudienceUI(data.stats);

            // Update user badge in chat input if element exists
            const userBadgeEl = document.getElementById("myUserBadge");
            if (userBadgeEl) {
                userBadgeEl.textContent = `${currentUser.avatar} ${currentUser.nickname}`;
            }
        });

        socket.on("presence:update", (stats) => {
            updateAudienceUI(stats);
        });

        socket.on("community:message", (msg) => {
            if (typeof window.onCommunityMessageReceived === "function") {
                window.onCommunityMessageReceived(msg);
            }
        });

        socket.on("community:reaction", (reactionData) => {
            spawnFloatingReaction(reactionData.reaction);
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

        socket.on("disconnect", () => {
            isConnected = false;
            console.log("[SOCKET] Disconnected from Mehfil Live Network.");
        });
    }

    function updateAudienceUI(stats) {
        if (!stats) return;

        // Total listeners
        const formattedTotal = stats.total.toLocaleString();
        ["headerListeners", "liveListeners", "bottomListeners", "centerListeners", "extraListeners"].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = formattedTotal;
        });

        // Mood breakdown
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
                if (el && count !== undefined) {
                    el.textContent = Number(count).toLocaleString();
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

        // Random horizontal position within container
        const randomX = Math.floor(Math.random() * 80);
        el.style.left = `${randomX}px`;

        container.appendChild(el);

        // Remove element after animation completes
        setTimeout(() => {
            if (el.parentNode) {
                el.parentNode.removeChild(el);
            }
        }, 3400);
    }

    return {
        init,
        getCurrentUser: () => currentUser,
        isConnected: () => isConnected,

        setMood: (mood) => {
            currentMood = mood;
            if (socket && socket.connected) {
                socket.emit("mood:change", mood);
            }
        },

        sendReaction: (type) => {
            spawnFloatingReaction(type);
            if (socket && socket.connected) {
                socket.emit("community:reaction", { type });
            }
        },

        sendMessage: (data) => {
            if (socket && socket.connected) {
                socket.emit("community:message", data);
            }
        },

        submitRequest: (data) => {
            if (socket && socket.connected) {
                socket.emit("request:new", data);
            }
        },

        voteRequest: (id) => {
            if (socket && socket.connected) {
                socket.emit("request:vote", id);
            }
        },

        syncRadio: () => {
            return new Promise((resolve) => {
                if (!socket || !socket.connected) return resolve(null);
                socket.emit("radio:sync", (state) => {
                    resolve(state);
                });
            });
        }
    };
})();
