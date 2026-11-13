"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const projectRoot = path.resolve(__dirname, "..");
const clientRoot = path.join(projectRoot, "client");

function read(relativePath) {
    return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function collectJavaScript(directory) {
    const files = [];
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) files.push(...collectJavaScript(fullPath));
        else if (entry.isFile() && entry.name.endsWith(".js")) files.push(fullPath);
    }
    return files;
}

function pngDimensions(filePath) {
    const data = fs.readFileSync(filePath);
    assert.equal(data.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", "File must be a PNG: " + filePath);
    return {
        width: data.readUInt32BE(16),
        height: data.readUInt32BE(20)
    };
}

test("PWA manifest is valid and has correctly sized install icons", () => {
    const manifest = JSON.parse(read("client/manifest.webmanifest"));
    assert.equal(manifest.name, "MEHFIL — Indian Mood Radio");
    assert.equal(manifest.short_name, "MEHFIL");
    assert.equal(manifest.display, "standalone");
    assert.equal(manifest.start_url, "/?source=pwa");

    const expected = new Map([
        ["/icons/icon-192.png", 192],
        ["/icons/icon-512.png", 512]
    ]);
    for (const icon of manifest.icons) {
        const expectedSize = expected.get(icon.src);
        assert.ok(expectedSize, "Unexpected manifest icon: " + icon.src);
        assert.equal(icon.type, "image/png");
        assert.deepEqual(
            pngDimensions(path.join(clientRoot, icon.src.replace(/^\//, ""))),
            { width: expectedSize, height: expectedSize }
        );
        expected.delete(icon.src);
    }
    assert.equal(expected.size, 0, "Both required PNG icons must be declared");

    assert.deepEqual(
        pngDimensions(path.join(clientRoot, "icons/apple-touch-icon.png")),
        { width: 180, height: 180 }
    );
});

test("service worker references existing app-shell assets and bypasses live endpoints", () => {
    const source = read("client/sw.js");
    const block = source.match(/const APP_SHELL = \[([\s\S]*?)\];/);
    assert.ok(block, "APP_SHELL list must exist");

    const assets = [...block[1].matchAll(/"([^"]+)"/g)].map(match => match[1]);
    assert.ok(assets.length >= 10, "Expected the complete MEHFIL app shell");
    for (const asset of assets) {
        const localPath = path.join(clientRoot, asset.replace(/^\//, ""));
        assert.ok(fs.existsSync(localPath), "Missing service-worker asset: " + asset);
    }

    assert.match(source, /url\.pathname\.startsWith\("\/api\/"\)/);
    assert.match(source, /url\.pathname\.startsWith\("\/socket\.io\/"\)/);
    assert.match(source, /url\.pathname\.startsWith\("\/\.netlify\/"\)/);
});

test("desktop and mobile install controls are present and uniquely identified", () => {
    const html = read("client/index.html");
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    assert.equal(new Set(ids).size, ids.length, "HTML IDs must be unique");
    assert.equal([...html.matchAll(/data-pwa-install/g)].length, 2);
    assert.match(html, /class="pwa-header-install" data-pwa-install hidden/);
    assert.match(html, /id="installAppButton" data-pwa-install hidden/);
    assert.match(html, /href="\/manifest\.webmanifest"/);
    assert.match(html, /src="js\/pwa\.js"/);
});

test("local HTML script, stylesheet and icon references resolve", () => {
    const html = read("client/index.html");
    const references = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
        .map(match => match[1])
        .filter(value => value && !/^(?:[a-z]+:|#|\/\/)/i.test(value));

    for (const reference of references) {
        const localPath = path.join(clientRoot, reference.replace(/^\//, "").split("?")[0]);
        assert.ok(fs.existsSync(localPath), "Missing local HTML reference: " + reference);
    }
});

test("frontend, server and Netlify JavaScript files parse", () => {
    const roots = [
        path.join(clientRoot, "js"),
        path.join(projectRoot, "server"),
        path.join(projectRoot, "netlify", "functions")
    ];
    const files = roots.flatMap(collectJavaScript);
    assert.ok(files.length >= 10, "Expected the full app JavaScript source set");

    for (const filePath of files) {
        const source = fs.readFileSync(filePath, "utf8");
        assert.doesNotThrow(
            () => new vm.Script(source, { filename: filePath }),
            "JavaScript syntax failed: " + path.relative(projectRoot, filePath)
        );
    }
});

test("toast notifications expose a polite live status to assistive technology", () => {
    const source = read("client/js/app.js");
    assert.match(source, /toast\.setAttribute\("role", "status"\)/);
    assert.match(source, /toast\.setAttribute\("aria-live", "polite"\)/);
    assert.match(source, /toast\.setAttribute\("aria-atomic", "true"\)/);
});
