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

test("HTTP and Socket.IO message paths both persist before broadcasting", () => {
    const routes = read("server/routes/api.js");
    const sockets = read("server/sockets/socketHandler.js");

    assert.ok(routes.includes("communityService.normalizeCommunityMessage"));
    assert.ok(routes.includes("db.addCommunityMessage(message)"));
    assert.ok(routes.includes("io.emit('community:message', newMsg)"));

    assert.ok(sockets.includes("communityService.normalizeCommunityMessage"));
    assert.ok(sockets.includes("db.addCommunityMessage(message)"));
    assert.ok(sockets.includes("io.emit('community:message', newMsg)"));
});

test("community history is not cached and is refreshed after Socket.IO reconnect", () => {
    const routes = read("server/routes/api.js");
    const api = read("client/js/api.js");
    const sockets = read("client/js/socket.js");

    assert.ok(routes.includes("router.get('/community'"));
    assert.ok(routes.includes("res.setHeader('Cache-Control', 'no-store')"));
    assert.ok(api.includes('if (endpoint.startsWith("/community")) return 0;'));
    assert.ok(sockets.includes('socket.on("community:message"'));
    assert.ok(sockets.includes("window.onCommunitySocketReconnected"));
});

test("community likes are persisted and broadcast to every connected listener", () => {
    const routes = read("server/routes/api.js");
    const sockets = read("client/js/socket.js");
    const app = read("client/js/app.js");

    assert.ok(routes.includes("db.likeCommunityMessage(req.params.id)"));
    assert.ok(routes.includes("req.app.get('io').emit('community:like', updated)"));
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

    assert.ok(app.includes('if (!text || (submitButton && submitButton.disabled)) return;'));
    assert.ok(app.includes("submitButton.disabled = true"));
    assert.ok(app.includes("submitButton.disabled = false"));
    assert.ok(app.includes("Message could not be sent"));
});
