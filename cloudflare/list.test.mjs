// A shared list's link carries its own preview tags; a private or missing list gets the generic card, same status.
// Usage: node cloudflare/list.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import worker from "./worker.js";

const PAGE = '<html><head><title>A list on yummers</title>\n<meta name="description" content="generic">\n</head><body></body></html>';
let list;
globalThis.fetch = async (url) => {
    if (String(url).endsWith("/404.html")) return new Response(PAGE, { status: 200 });
    assert.equal(String(url), "https://uobskavqhilnqakbdutt.supabase.co/rest/v1/rpc/shared_list");
    return list instanceof Error ? Promise.reject(list) : new Response(JSON.stringify(list));
};
const get = (path, method = "GET") => worker.fetch(new Request(`https://yummersapp.com${path}`, { method }), {}, {});
const meta = (html, name) => html.match(new RegExp(`<meta (?:property|name)="${name}" content="([^"]*)"`))?.[1];

list = {
    title: 'Pho & "noodles" <b>', description: null, cover_url: null, profiles: { username: "tester1" },
    list_restaurants: [{ position: 1, picture: null }, { position: 0, picture: { kind: "photo", id: "pid", userId: "uid", by: "x" } }],
};
let res = await get("/l/stXQQCCT/whatever");
let html = await res.text();
assert.equal(res.status, 200);
assert.equal(res.headers.get("Cache-Control"), "public, max-age=300");
assert.equal(meta(html, "og:title"), "Pho &#38; &#34;noodles&#34; &#60;b&#62;");
assert.ok(!html.includes("<b>"), "the title is never inserted as HTML");
assert.equal(meta(html, "og:description"), "List by @tester1 · 2 places");
assert.equal(meta(html, "og:url"), "https://yummersapp.com/l/stXQQCCT/pho-noodles-b");
assert.equal(meta(html, "og:image"), "https://uobskavqhilnqakbdutt.supabase.co/storage/v1/object/public/photos/uid/pid.jpg", "first place's photo");
assert.equal(meta(html, "twitter:card"), "summary");
assert.equal(meta(html, "og:image:width"), undefined, "a real photo: size unknown");
assert.ok(res.headers.get("Content-Security-Policy").includes("img-src"));

list = { ...list, description: "Best bowls", cover_url: "https://uobskavqhilnqakbdutt.supabase.co/storage/v1/object/public/photos/c.jpg" };
html = await (await get("/l/stXQQCCT")).text();
assert.equal(meta(html, "og:image"), list.cover_url, "the cover wins");
assert.equal(meta(html, "og:description"), "List by @tester1 · 2 places", "the list's own description isn't used");
list.cover_url = "javascript:alert(1)"; list.list_restaurants = [];
assert.equal(meta(await (await get("/l/stXQQCCT")).text(), "og:image"), "https://yummersapp.com/assets/share-square.jpg", "not https, no photo: the square picture");
list.list_restaurants = [{ position: 0, picture: { kind: "cover", url: "https://streetviewpixels-pa.googleapis.com/v1/thumbnail?panoid=w800-h600-k-no" } }];
assert.equal(meta(await (await get("/l/stXQQCCT")).text(), "og:image"), "https://yummersapp.com/assets/share-square.jpg", "a Street View link is no picture");
list.list_restaurants = [{ position: 0, picture: null }];
assert.equal(meta(await (await get("/l/stXQQCCT")).text(), "og:description"), "List by @tester1 · 1 place");
assert.equal(meta(await (await get("/l/stXQQCCT")).text(), "og:image:width"), "600");

// Private, hidden and missing all read null; a failed lookup reads the same but isn't cached.
for (const l of [null, new Error("down")]) {
    list = l;
    res = await get("/l/AbCd1234/x");
    html = await res.text();
    assert.equal(res.status, 200);
    assert.equal(meta(html, "og:title"), "A list on yummers");
    assert.equal(meta(html, "og:url"), "https://yummersapp.com/l/AbCd1234");
    assert.equal(meta(html, "og:image"), "https://yummersapp.com/assets/share-square.jpg");
    assert.equal(meta(html, "og:image:height"), "600");
    assert.equal(res.headers.get("Cache-Control"), l instanceof Error ? "no-store" : "public, max-age=300");
}
// Malformed list paths and other methods go to the site untouched.
globalThis.fetch = async () => new Response("page", { status: 404 });
assert.equal((await get("/l/short/x")).status, 404);
assert.equal((await get("/l/AbCd1234/x", "POST")).status, 404);
console.log("list: ok");

// Browsers ask for /favicon.ico: it goes to the 192 px tab icon.
const fav = await get("/favicon.ico");
assert.equal(fav.status, 301);
assert.equal(fav.headers.get("Location"), "https://yummersapp.com/assets/favicon-192.png");

// The dead-list page (404.html + share.js): the message shows with two ways on, whether the list is missing or the lookup failed.
const dead = readFileSync(new URL("../404.html", import.meta.url), "utf8"), draw = readFileSync(new URL("../share.js", import.meta.url), "utf8");
assert.ok(dead.includes('<a class="button" href="/guides">See what\'s good in Phnom Penh</a>') && dead.includes('href="/#launch">Join the iPhone beta</a>'));
assert.ok(draw.includes('$("ways").hidden = false') && draw.includes("private or doesn't exist") && draw.includes("Couldn't load this list"));
