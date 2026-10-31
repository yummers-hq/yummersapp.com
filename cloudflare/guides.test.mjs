// Runs the guide and restaurant pages through the Worker with beta faked. Usage: node cloudflare/guides.test.mjs
import assert from "node:assert/strict";
import worker from "./worker.js";
import { GUIDES } from "./guides.js";

for (const k of Object.keys(GUIDES)) delete GUIDES[k];
GUIDES["korean"] = "KOREAN01"; GUIDES["bbq"] = "BBQ00001"; GUIDES["mine"] = "OTHER001"; GUIDES["empty"] = "EMPTY001"; GUIDES["private"] = "PRIVATE1";
const row = (n, extra = {}) => ({
    note: `Order the ${n} <b>`, position: n,
    picture: { kind: "cover", url: `https://lh3.googleusercontent.com/p${n}` },
    restaurants: { name: `Place ${n} & Co`, district: "BKK", cuisine_type: ["International", "Korean"] }, ...extra,
});
const det = (n) => ({ position: n, restaurants: { id: `rid${n}`, address: `${n} Street <1>`, latitude: 11.5, longitude: 104.9, opening_hours: { weekday_text: ["Monday: 9:00 AM – 9:00 PM", "Tuesday: Closed"] } } });
const lists = {
    KOREAN01: { title: "Korean restaurants in Phnom Penh", description: "Korean food is easy to find here. Start with the BBQ.", share_id: "KOREAN01", profiles: { username: "yummers" }, list_restaurants: [row(1), row(2, { picture: { kind: "photo", id: "pid", userId: "uid", by: "someone" } })] },
    BBQ00001: { title: "BBQ", share_id: "BBQ00001", profiles: { username: "yummers" }, list_restaurants: [row(1)] },
    OTHER001: { title: "Not ours", share_id: "OTHER001", profiles: { username: "someone" }, list_restaurants: [row(1)] },
    EMPTY001: { title: "Empty", share_id: "EMPTY001", profiles: { username: "yummers" }, list_restaurants: [] },
    PRIVATE1: null,
};
const embeds = { KOREAN01: [det(1), det(2)], BBQ00001: [det(1)], OTHER001: [det(1)], EMPTY001: [] };
let down = false, review = "Get the short rib <script>. Worth the queue.", liked = "0-0/7";
const store = new Map();
globalThis.caches = { default: { match: async (r) => store.get(r.url)?.clone(), put: async (r, v) => store.set(r.url, v) } };
globalThis.fetch = async (url, init = {}) => {
    url = String(url.url ?? url);
    if (down && url.includes("supabase")) return new Response("no", { status: 500 });
    if (url.includes("shared_list")) return Response.json(lists[JSON.parse(init.body).p_share_id]);
    const share = url.match(/lists\?share_id=eq\.(\w+)/)?.[1];
    if (share) return Response.json(embeds[share] ? [{ user_id: "yid", list_restaurants: embeds[share] }] : []);
    if (url.includes("user_restaurants")) {
        if (init.method === "HEAD") return new Response(null, { headers: { "content-range": liked } });
        assert.ok(url.includes("user_id=eq.yid") && url.includes("is_public=eq.true"), "only the team's public review");
        return Response.json(review ? [{ review }] : []);
    }
    if (url.endsWith("/sitemap.xml")) return new Response("<urlset>\n</urlset>", { status: 200 });
    return new Response("static 404", { status: 404 }); // GitHub Pages
};
const get = async (path) => { store.clear(); return worker.fetch(new Request("https://yummersapp.com" + path), {}, { waitUntil() {} }); };

// Guide
let r = await get("/guides/korean");
let t = await r.text();
assert.equal(r.status, 200);
for (const s of ["Korean restaurants in Phnom Penh | yummers", "Place 1 &amp; Co", "Place 2 &amp; Co", "Order the 1 &lt;b&gt;", "Korean · BKK", '"@type":"ItemList"', '"@type":"Restaurant"',
    'rel="canonical" href="https://yummersapp.com/guides/korean"', 'href="/places/place-1-co-bkk"', "https://lh3.googleusercontent.com/p1", 'href="/guides"']) assert.ok(t.includes(s), s);
assert.ok(!t.includes("<b>"), "notes are escaped");
assert.ok(!t.includes("/photos/") && !t.includes("someone"), "a person's photo and name stay off");

// Restaurant page
r = await get("/places/place-1-co-bkk");
t = await r.text();
assert.equal(r.status, 200);
for (const s of ["Place 1 &amp; Co, BKK | yummers", "From the yummers team", "Get the short rib &lt;script&gt;. Worth the queue.", "7 people liked it on yummers", "1 Street &lt;1&gt;",
    "Monday", "9:00 AM – 9:00 PM", "query=11.5%2C104.9", '"@type":"Restaurant"', 'href="/guides/korean"', 'href="/guides/bbq"', 'rel="canonical" href="https://yummersapp.com/places/place-1-co-bkk"', 'content="Get the short rib &lt;script&gt;.']) assert.ok(t.includes(s), s);
assert.ok(!t.includes("<script>"), "the review is escaped");
assert.ok(!/want to try/i.test(t));
review = ""; liked = "*/0";
t = await (await get("/places/place-2-co-bkk")).text();
assert.ok(!t.includes("From the yummers team") && !t.includes("liked it on yummers"), "no review or likes: the blocks are left out");
assert.ok(t.includes("picked by the yummers team for Korean restaurants in Phnom Penh"));
assert.ok(!t.includes("someone") && !t.includes("/photos/"), "a person's photo stays off");

// 404s: unknown, not the team's, empty, private; places only from published guides
for (const p of ["/guides/mine", "/guides/empty", "/guides/private", "/guides/nope", "/guides/constructor", "/places/nope", "/places/place-1-co-bkk/x", "/places"]) assert.equal((await get(p)).status, 404, p);

// Index and sitemap
t = await (await get("/guides")).text();
assert.ok(t.includes("/guides/korean") && t.includes("/guides/bbq") && !t.includes("/guides/mine") && !t.includes("/guides/empty"));
t = await (await get("/sitemap.xml")).text();
assert.equal(t.match(/<loc>/g).length, 5, "index, 2 guides, 2 places (Place 1 is in both guides, once)");
assert.ok(t.includes("/places/place-1-co-bkk") && t.includes("<loc>https://yummersapp.com/guides</loc>") && !t.includes("/guides/mine"));

// Beta down: 503, never 404
down = true;
assert.equal((await get("/guides/korean")).status, 503);
assert.equal((await get("/places/place-1-co-bkk")).status, 503);
console.log("guides ok");
