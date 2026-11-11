/* =========================================================
   MEHFIL — api.js
   Frontend REST API Client
   ========================================================= */

const MehfilAPI = (function () {
    "use strict";

    
   // Render backend API
const BASE_URL = "https://mehfil-backend-ing6.onrender.com/api";

    // Persistent User ID for favorites and identities
    let userId = localStorage.getItem("mehfil_user_id");
    if (!userId) {
        userId = "user_" + Math.random().toString(36).substring(2, 10);
        localStorage.setItem("mehfil_user_id", userId);
    }

    async function request(endpoint, options = {}) {
        const headers = {
            "Content-Type": "application/json",
            "x-user-id": userId,
            ...(options.headers || {})
        };

        try {
            const resp = await fetch(`${BASE_URL}${endpoint}`, {
                ...options,
                headers
            });
            if (!resp.ok) {
                const errData = await resp.json().catch(() => ({}));
                throw new Error(errData.error || `HTTP ${resp.status}`);
            }
            return await resp.json();
        } catch (err) {
            console.error(`[API Error] ${endpoint}:`, err);
            throw err;
        }
    }

    return {
        getUserId: () => userId,

        getStatus: () => request("/status"),

        getMoods: () => request("/moods"),

        getSongs: (params = {}) => {
            const searchParams = new URLSearchParams();
            if (params.mood && params.mood !== "all") searchParams.append("mood", params.mood);
            if (params.search) searchParams.append("search", params.search);
            if (params.limit) searchParams.append("limit", params.limit);
            const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
            return request(`/songs${query}`);
        },

        getRandomSong: (mood) => {
            const q = mood && mood !== "all" ? `?mood=${encodeURIComponent(mood)}` : "";
            return request(`/songs/random${q}`);
        },

        getSongById: (id) => request(`/songs/${id}`),

        recordPlay: (id) => request(`/songs/${id}/play`, { method: "POST" }),

        getRadioState: () => request("/radio"),

        getRequests: () => request("/requests"),

        submitRequest: (data) => request("/requests", {
            method: "POST",
            body: JSON.stringify(data)
        }),

        voteRequest: (id) => request(`/requests/${id}/vote`, {
            method: "POST"
        }),

        getCommunityMessages: () => request("/community"),

        postCommunityMessage: (data) => request("/community", {
            method: "POST",
            body: JSON.stringify(data)
        }),

        likeCommunityMessage: (id) => request(`/community/${id}/like`, {
            method: "POST"
        }),

        getFavorites: () => request("/favorites"),

        toggleFavorite: (songId) => request("/favorites", {
            method: "POST",
            body: JSON.stringify({ songId })
        })
    };
})();
