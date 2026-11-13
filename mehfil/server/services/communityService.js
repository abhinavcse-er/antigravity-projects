"use strict";

const VALID_MOODS = new Set(["love", "dard", "sukoon", "safar", "happy", "late-night"]);

function normalizeCommunityMessage(data = {}, fallback = {}) {
    const rawText = typeof data.text === "string" ? data.text : "";
    const text = rawText.replace(/\u0000/g, "").trim().slice(0, 1000);
    if (!text) return null;

    const candidateName = typeof data.userName === "string" ? data.userName : fallback.userName;
    const userName = (typeof candidateName === "string" ? candidateName : "")
        .replace(/[\u0000-\u001f\u007f]/g, "")
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, 60) || "Musafir";

    const candidateAvatar = typeof data.userAvatar === "string" ? data.userAvatar : fallback.userAvatar;
    const userAvatar = (typeof candidateAvatar === "string" ? candidateAvatar : "")
        .replace(/[\u0000-\u001f\u007f]/g, "")
        .trim()
        .slice(0, 12) || "🎶";

    const candidateMood = typeof data.mood === "string" ? data.mood : fallback.mood;
    const mood = VALID_MOODS.has(candidateMood) ? candidateMood : "love";

    return {
        userName,
        userAvatar,
        mood,
        text,
        isShayari: data.isShayari === true || data.isShayari === 1 || data.isShayari === "true"
    };
}

module.exports = { normalizeCommunityMessage };
