// Runs the guide pages through the Worker with beta faked. Usage: node cloudflare/guides.test.mjs
import assert from "node:assert/strict";
import worker from "./worker.js";
import { GUIDES } from "./guides.js";

GUIDES["korean"] = "KOREAN01"; GUIDES["mine"] = "OTHER001"; GUIDES["empty"] = "EMPTY001"; GUIDES["private"] = "PRIVATE1";
const row = (n) => ({ note: `Order the ${n} <b>`, position: n, restaurants: { name: `Place ${n}`, district: "BKK", cuisine_type: ["International", "Korean"] } });
const lists = {
    KOREAN01: { title: "Korean restaurants in Phnom Penh", description: "Korean food is easy to find here. Start with the BBQ.", share_id: "KOREAN01", profiles: { username: "yummers" }, list_restaurants: [row(1), row(2)] },
    OTHER001: { title: "Not ours", share_id: "OTHER001", profiles: { username: "someone" }, list_restaurants: [row(1)] },
    EMPTY001: { title: "Empty", share_id: "EMPTY001", profiles: { username: "yummers" }, list_restaurants: [] },
    PRIVATE1: null,
};
let down = false;
const store = new Map();
globalThis.caches = { default: { match: async (r) => store.get(r.url)?.clone(), put: async (r, v) => store.set(r.url, v) } };
globalThis.fetch = async (url, init) => {
    url = String(url.url ?? url);
    if (url.includes("shared_list")) {
        if (down) return new Response("no", { status: 500 });
        return Response.json(lists[JSON.parse(init.body).p_share_id]);
    }
    if (url.endsWith("/sitemap.xml")) return new Response("<urlset>\n</urlset>", { status: 200 });
    return new Response("static 404", { status: 404 }); // GitHub Pages
};
const get = async (path) => { store.clear(); return worker.fetch(new Request("https://yummersapp.com" + path), {}, { waitUntil() {} }); };

let r = await get("/guides/korean");
let t = await r.text();
assert.equal(r.status, 200);
for (const s of ["Korean restaurants in Phnom Penh | yummers", "Place 1", "Place 2", "Order the 1 &lt;b&gt;", "Korean · BKK", '"@type":"Restaurant"', 'rel="canonical" href="https://yummersapp.com/guides/korean"']) assert.ok(t.includes(s), s);
assert.ok(!t.includes("<b>"), "notes are escaped");
for (const slug of ["mine", "empty", "private", "nope"]) assert.equal((await get("/guides/" + slug)).status, 404, slug);
t = await (await get("/guides")).text();
assert.ok(t.includes("/guides/korean") && !t.includes("/guides/mine") && !t.includes("/guides/empty"));
t = await (await get("/sitemap.xml")).text();
assert.ok(t.includes("/guides/korean") && t.includes("<loc>https://yummersapp.com/guides</loc>") && !t.includes("/guides/mine"));
down = true;
assert.equal((await get("/guides/korean")).status, 503);
console.log("guides ok");
