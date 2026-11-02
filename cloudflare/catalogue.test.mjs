// The place list is cached, shared by phones that miss together, and only for our two projects.
// Usage: node cloudflare/catalogue.test.mjs
import assert from "node:assert/strict";
import worker from "./worker.js";

const store = new Map();
globalThis.caches = { default: {
    match: async (req) => store.get(req.url)?.clone(),
    put: async (req, res) => { store.set(req.url, res); },
} };
let origin = 0;
globalThis.fetch = async (url, init) => {
    origin++;
    assert.equal(String(url), "https://uobskavqhilnqakbdutt.supabase.co/rest/v1/rpc/catalogue_rows");
    assert.equal(init.headers.apikey, "anon");
    await new Promise((r) => setTimeout(r, 20));
    return new Response('[{"id":1}]', { status: 200 });
};
const waits = [];
const get = (path) => worker.fetch(new Request(`https://yummersapp.com${path}`, { headers: { apikey: "anon" } }), {}, { waitUntil: (p) => waits.push(p) });

const crowd = await Promise.all(Array.from({ length: 6 }, () => get("/catalogue/uobskavqhilnqakbdutt")));
await Promise.all(waits);
assert.equal(origin, 1, "six phones, one trip to the database");
for (const res of crowd) assert.equal(await res.text(), '[{"id":1}]');

const later = await get("/catalogue/uobskavqhilnqakbdutt");
assert.equal(origin, 1, "the next phone is served from the cache");
assert.equal(later.headers.get("Cache-Control"), "public, max-age=600");

globalThis.fetch = async () => new Response("page", { status: 404 });
for (const path of ["/catalogue/gnmzwzmtdblkujyuvadi", "/catalogue/evil.com", "/catalogue/uobskavqhilnqakbdutt/x"]) {
    assert.equal((await get(path)).status, 404, path);
}
console.log("catalogue: ok");
