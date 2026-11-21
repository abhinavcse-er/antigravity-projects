"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const community = require("../server/services/communityService");

test("community messages are normalized and length-limited before storage", () => {
    const message = community.normalizeCommunityMessage({
        userName: "  <b>Guest</b>   One  ",
        userAvatar: "🎶",
        mood: "happy",
        text: "  Hello everyone!  ",
        isShayari: true
    });

    assert.deepEqual(message, {
        userName: "<b>Guest</b> One",
        userAvatar: "🎶",
        mood: "happy",
        text: "Hello everyone!",
        isShayari: true
    });
    assert.equal(community.normalizeCommunityMessage({ text: "x".repeat(1200) }).text.length, 1000);
});

test("empty and non-string messages are rejected", () => {
    assert.equal(community.normalizeCommunityMessage({ text: "   " }), null);
    assert.equal(community.normalizeCommunityMessage({ text: 123 }), null);
});

test("HTTP and Socket.IO message paths persist owner-scoped messages before broadcasting", () => {
    const routes = read("server/routes/api.js");
    const sockets = read("server/sockets/socketHandler.js");

    assert.ok(routes.includes("communityService.normalizeCommunityMessage"));
    assert.ok(routes.includes("db.addCommunityMessage({ ...message, ownerId })"));
    assert.ok(routes.includes("io.emit('community:message', publicCommunityMessage(newMsg, null))"));

    assert.ok(sockets.includes("communityService.normalizeCommunityMessage"));
    assert.ok(sockets.includes("db.addCommunityMessage({ ...message, ownerId })"));
    assert.ok(sockets.includes("io.emit('community:message', publicMessage)"));
});

test("community history is not cached and is refreshed after Socket.IO reconnect", () => {
    const routes = read("server/routes/api.js");
    const api = read("client/js/api.js");
    const sockets = read("client/js/socket.js");

    assert.ok(routes.includes("router.get('/community'"));
    assert.ok(routes.includes("res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private')"));
    assert.ok(api.includes('if (endpoint.startsWith("/community")) return 0;'));
    assert.ok(sockets.includes('socket.on("community:message"'));
    assert.ok(sockets.includes("window.onCommunitySocketReconnected"));
    assert.ok(read("client/js/app.js").includes("}, 3000)"));
    assert.ok(read("client/js/app.js").includes("startCommunityPolling"));
});

test("community likes are persisted and broadcast to every connected listener", () => {
    const routes = read("server/routes/api.js");
    const sockets = read("client/js/socket.js");
    const app = read("client/js/app.js");

    assert.ok(routes.includes("db.likeCommunityMessage(id)"));
    assert.ok(routes.includes("req.app.get('io').emit('community:like', publicMessage)"));
    assert.ok(sockets.includes('socket.on("community:like"'));
    assert.ok(app.includes("window.onCommunityLikeReceived = function"));
    assert.ok(app.includes("updateCommunityLikeCount(updated)"));
});

test("chat content is rendered as text, deduplicated by database ID, and limited to 40 messages", () => {
    const app = read("client/js/app.js");

    assert.ok(app.includes("const communityMessages = new Map()"));
    assert.ok(app.includes("const COMMUNITY_MESSAGE_LIMIT = 40"));
    assert.ok(app.includes("function rememberCommunityMessage("));
    assert.ok(app.includes("messageText.textContent = msg.text"));
    assert.ok(app.includes("userName.textContent = msg.userName"));
    assert.ok(app.includes("appendCommunityMessage(savedMessage, true)"));
    assert.ok(!app.includes("bubble.innerHTML"));
});

test("Baithak stream is accessible and the composer caps comments at 1000 characters", () => {
    const html = read("client/index.html");

    assert.ok(html.includes('id="communityMessagesStream" role="log" aria-live="polite"'));
    assert.ok(html.includes('id="chatTextInput" class="form-control" placeholder="Share a feeling, memory, or shayari..." maxlength="1000"'));
    assert.ok(html.includes("Live chat · Messages are shared with everyone"));
});

test("chat submit prevents duplicate posts while a save request is in progress", () => {
    const app = read("client/js/app.js");

    assert.ok(app.includes('if (!text || !userName || userName.length < 2 || (submitButton && submitButton.disabled)) {'));
    assert.ok(app.includes("submitButton.disabled = true"));
    assert.ok(app.includes("submitButton.disabled = false"));
    assert.ok(app.includes("Message could not be sent"));
});


test("community messages can only be edited or deleted by their browser owner", () => {
    const routes = read("server/routes/api.js");
    const database = read("server/db/database.js");

    assert.ok(routes.includes("router.patch('/community/:id'"));
    assert.ok(routes.includes("router.delete('/community/:id'"));
    assert.ok(routes.includes("db.editCommunityMessage(id, ownerId"));
    assert.ok(routes.includes("db.deleteCommunityMessage(id, ownerId)"));
    assert.ok(database.includes("WHERE id = ? AND ownerId = ?"));
    assert.ok(database.includes("ownerId: ownerId || null"));
});

test("community name picker, edit/delete controls and live recovery are wired", () => {
    const html = read("client/index.html");
    const app = read("client/js/app.js");
    const api = read("client/js/api.js");
    const sockets = read("client/js/socket.js");

    assert.ok(html.includes('id="communityUserNameInput"'));
    assert.ok(app.includes("COMMUNITY_NAME_STORAGE_KEY"));
    assert.ok(app.includes("MehfilAPI.editCommunityMessage"));
    assert.ok(app.includes("MehfilAPI.deleteCommunityMessage"));
    assert.ok(api.includes("editCommunityMessage:"));
    assert.ok(api.includes("deleteCommunityMessage:"));
    assert.ok(sockets.includes('socket.on("community:update"'));
    assert.ok(sockets.includes('socket.on("community:delete"'));
});
