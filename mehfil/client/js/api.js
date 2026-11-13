/* =========================================================
   MEHFIL — api.js
   Frontend REST API Client with lightweight response caching
   ========================================================= */

const MehfilAPI = (function () {
    "use strict";

    const BASE_URL = "https://mehfil-backend-ing6.onrender.com/api";
    const CACHE_LIMIT = 80;
    const GET_CACHE = new Map();
    const IN_FLIGHT = new Map();

    let userId = localStorage.getItem("mehfil_user_id");
    if (!userId) {
        userId = "user_" + Math.random().toString(36).substring(2, 10);
        localStorage.setItem("mehfil_user_id", userId);
    }

    function cacheTtl(endpoint) {
        if (endpoint.startsWith("/status")) return 5000;
        if (endpoint.startsWith("/radio")) return 3000;
        if (endpoint.startsWith("/moods")) return 10000;
        if (endpoint.startsWith("/songs")) return 30000;
        if (endpoint.startsWith("/favorites")) return 10000;
        if (endpoint.startsWith("/community") || endpoint.startsWith("/requests")) return 8000;
        return 0;
    }

    function remember(key, value, ttl) {
        if (!ttl) return;
        if (GET_CACHE.size >= CACHE_LIMIT) {
            const oldestKey = GET_CACHE.keys().next().value;
            if (oldestKey) GET_CACHE.delete(oldestKey);
        }
        GET_CACHE.set(key, { value, expiresAt: Date.now() + ttl });
    }

    function clearCache() {
        GET_CACHE.clear();
    }

    async function request(endpoint, options = {}) {
        const method = (options.method || "GET").toUpperCase();
        const isGet = method === "GET";
        const cacheKey = isGet ? endpoint : null;
        const ttl = isGet ? cacheTtl(endpoint) : 0;

        if (isGet && ttl) {
            const cached = GET_CACHE.get(cacheKey);
            if (cached && cached.expiresAt > Date.now()) return cached.value;
            if (cached) GET_CACHE.delete(cacheKey);
            if (IN_FLIGHT.has(cacheKey)) return IN_FLIGHT.get(cacheKey);
        }

        const headers = {
            "x-user-id": userId,
            ...(options.headers || {})
        };
        if (options.body && !headers["Content-Type"] && !headers["content-type"]) {
            headers["Content-Type"] = "application/json";
        }

        const requestPromise = (async () => {
            const controller = new AbortController();
            const timeoutId = window.setTimeout(() => controller.abort(), 15000);
            try {
                const resp = await fetch(`${BASE_URL}${endpoint}`, {
                    ...options,
                    method,
                    headers,
                    signal: options.signal || controller.signal
                });
                if (!resp.ok) {
                    const errData = await resp.json().catch(() => ({}));
                    throw new Error(errData.error || `HTTP ${resp.status}`);
                }
                const data = await resp.json();
                if (isGet) remember(cacheKey, data, ttl);
                else clearCache();
                return data;
            } catch (err) {
                console.error(`[API Error] ${endpoint}:`, err);
                throw err;
            } finally {
                window.clearTimeout(timeoutId);
                if (cacheKey) IN_FLIGHT.delete(cacheKey);
            }
        })();

        if (isGet && ttl) IN_FLIGHT.set(cacheKey, requestPromise);
        return requestPromise;
    }

    return {
        getUserId: () => userId,
        clearCache,

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
        getSongById: (id) => request(`/songs/${encodeURIComponent(id)}`),
        recordPlay: (id, mood) => request(`/songs/${encodeURIComponent(id)}/play`, {
            method: "POST",
            body: JSON.stringify({ mood })
        }),
        getRadioState: () => request("/radio"),
        getPersonalRadio: (params = {}) => {
            const searchParams = new URLSearchParams();
            if (params.mood) searchParams.append("mood", params.mood);
            if (params.limit) searchParams.append("limit", params.limit);
            const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
            return request(`/radio/personalized${query}`);
        },
        getRequests: () => request("/requests"),
        submitRequest: (data) => request("/requests", { method: "POST", body: JSON.stringify(data) }),
        voteRequest: (id) => request(`/requests/${encodeURIComponent(id)}/vote`, { method: "POST" }),
        getCommunityMessages: () => request("/community"),
        postCommunityMessage: (data) => request("/community", { method: "POST", body: JSON.stringify(data) }),
        likeCommunityMessage: (id) => request(`/community/${encodeURIComponent(id)}/like`, { method: "POST" }),
        getFavorites: () => request("/favorites"),
        toggleFavorite: (songId) => request("/favorites", {
            method: "POST",
            body: JSON.stringify({ songId })
        })
    };
})();
