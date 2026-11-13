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

    assert.match(routes, /communityService\.normalizeCommunityMessage/);
    assert.match(routes, /db\.addCommunityMessage\(message\)/);
    assert.match(routes, /io\.emit\('community:message', newMsg\)/);

    assert.match(sockets, /communityService\.normalizeCommunityMessage/);
    assert.match(sockets, /db\.addCommunityMessage\(message\)/);
    assert.match(sockets, /io\.emit\('community:message', newMsg\)/);
});

test("community history is not cached and is refreshed after Socket.IO reconnect", () => {
    const routes = read("server/routes/api.js");
    const api = read("client/js/api.js");
    const sockets = read("client/js/socket.js");

    assert.match(routes, /router\.get\('\\/community'[\\s\\S]*?Cache-Control', 'no-store'/);
    assert.match(api, /endpoint\.startsWith\\("\\/community"\\)\\) return 0/);
    assert.match(sockets, /socket\.on\\("community:message"/);
    assert.match(sockets, /window\.onCommunitySocketReconnected/);
});

test("community likes are persisted and broadcast to every connected listener", () => {
    const routes = read("server/routes/api.js");
    const sockets = read("client/js/socket.js");
    const app = read("client/js/app.js");

    assert.match(routes, /db\.likeCommunityMessage\(req\.params\.id\)/);
    assert.match(routes, /io\.emit\('community:like', updated\)/);
    assert.match(sockets, /socket\.on\\("community:like"/);
    assert.match(app, /window\.onCommunityLikeReceived = function/);
    assert.match(app, /updateCommunityLikeCount\\(updated\\)/);
});

test("chat content is rendered as text, deduplicated by database ID, and limited to 40 messages", () => {
    const app = read("client/js/app.js");

    assert.match(app, /const communityMessages = new Map\\(\\)/);
    assert.match(app, /const COMMUNITY_MESSAGE_LIMIT = 40/);
    assert.match(app, /function rememberCommunityMessage\\(/);
    assert.match(app, /messageText\.textContent = msg\.text/);
    assert.match(app, /userName\.textContent = msg\.userName/);
    assert.match(app, /appendCommunityMessage\\(savedMessage, true\\)/);
    assert.doesNotMatch(app, /bubble\.innerHTML/);
});

test("Baithak stream is accessible and the composer caps comments at 1000 characters", () => {
    const html = read("client/index.html");

    assert.match(html, /id="communityMessagesStream" role="log" aria-live="polite"/);
    assert.match(html, /id="chatTextInput"[^>]*maxlength="1000"/);
    assert.match(html, /Live chat · Messages are shared with everyone/);
});

test("chat submit prevents duplicate posts while a save request is in progress", () => {
    const app = read("client/js/app.js");

    assert.match(app, /if \\(!text \\|\\| \\(submitButton && submitButton\.disabled\\)\\) return/);
    assert.match(app, /submitButton\.disabled = true/);
    assert.match(app, /submitButton\.disabled = false/);
    assert.match(app, /Message could not be sent/);
});
