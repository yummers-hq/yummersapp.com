// Runs the guide and restaurant pages through the Worker with beta faked. Usage: node cloudflare/guides.test.mjs
import assert from "node:assert/strict";
import worker from "./worker.js";
import { GUIDES, shortHours, cleanAddress } from "./guides.js";
import { PLACES, COVERS } from "./guide-places.js";

for (const k of Object.keys(GUIDES)) delete GUIDES[k];
GUIDES["korean"] = "KOREAN01"; GUIDES["bbq"] = "BBQ00001"; GUIDES["mine"] = "OTHER001"; GUIDES["empty"] = "EMPTY001"; GUIDES["private"] = "PRIVATE1";
PLACES.rid1 = { name: "Clean One", kind: "Korean BBQ", price: "$12–20", when: "Dinner" }; // place 2 is not in the map: database name and cuisine
COVERS.korean = "rid2";
const row = (n, extra = {}) => ({
    note: `Order the ${n} <b>`, position: n,
    picture: { kind: "cover", url: `https://lh3.googleusercontent.com/p${n}` },
    restaurants: { name: `Place ${n} & Co`, district: "BKK", cuisine_type: ["International", "Korean"] }, ...extra,
});
const det = (n) => ({ position: n, restaurants: { id: `rid${n}`, neighbourhood: n === 1 ? "BKK1" : null, address: `${n} Street <1>`, latitude: 11.5, longitude: 104.9, opening_hours: { weekday_text: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((d) => `${d}: 9:00 AM – 9:00 PM`) } } });
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
assert.equal(r.headers.get("Cache-Control"), "public, max-age=300", "browsers keep a guide five minutes");
{ // The edge copy is keyed to the deployed version: a new version renders afresh.
    const at = (v) => worker.fetch(new Request("https://yummersapp.com/guides/korean"), { CF_VERSION_METADATA: { id: v } }, { waitUntil(p) { return p; } });
    store.clear(); await at("v1"); await new Promise((d) => setTimeout(d, 0));
    assert.ok([...store.keys()].some((k) => k.endsWith("?v=v1")), "cached under v1");
    await at("v2"); await new Promise((d) => setTimeout(d, 0));
    assert.ok([...store.keys()].some((k) => k.endsWith("?v=v2")), "a new deploy gets its own copy");
}
for (const s of ["Korean restaurants in Phnom Penh | yummers", "Clean One", "Place 2 &amp; Co", "Order the 1 &lt;b&gt;", "Korean BBQ · BKK1", "Korean · BKK", "Guide · Phnom Penh", "2 places · by the yummers team", ">01<", ">02<", '"name":"Clean One"', '"@type":"ItemList"', '"@type":"Restaurant"',
    'rel="canonical" href="https://yummersapp.com/guides/korean"', 'href="/places/place-1-co-bkk"', "https://lh3.googleusercontent.com/p1", 'href="/guides"']) assert.ok(t.includes(s), s);
assert.ok(!t.includes("<b>"), "notes are escaped");
assert.ok(!t.includes("Place 1 &amp; Co"), "the clean name replaces the database name");
assert.ok(t.indexOf("lh3.googleusercontent.com/p2") < t.indexOf("lh3.googleusercontent.com/p1"), "the guide cover is the chosen place's photo, first on the page");
assert.ok(!t.includes("/photos/") && !t.includes("someone"), "a person's photo and name stay off");

// Restaurant page
r = await get("/places/place-1-co-bkk");
t = await r.text();
assert.equal(r.status, 200);
for (const s of ["Clean One, BKK | yummers", "Korean BBQ", "About $12–20 a person", "<span>Dinner</span>", "In Korean restaurants in Phnom Penh", "More in Korean restaurants in Phnom Penh", "See all 2 places", "From the yummers team", "Get the short rib &lt;script&gt;. Worth the queue.", "7 people liked it on yummers", "1 Street &lt;1&gt;",
    "Monday", "9am – 9pm", "query=11.5%2C104.9", '"@type":"Restaurant"', 'href="/guides/korean"', 'href="/guides/bbq"', 'rel="canonical" href="https://yummersapp.com/places/place-1-co-bkk"', 'content="Get the short rib &lt;script&gt;.']) assert.ok(t.includes(s), s);
assert.ok(!t.includes("<script>"), "the review is escaped");
const today = new Date().toLocaleDateString("en-US", { weekday: "long", timeZone: "Asia/Phnom_Penh" });
assert.equal(t.match(/class="today"/g).length, 2, "today's row, in Phnom Penh time, is bold");
assert.ok(t.includes(`<dt class="today">${today}</dt>`));
assert.ok(!/want to try/i.test(t));
assert.ok(t.includes('href="/places/place-2-co-bkk"') && t.includes(">Place 2 &amp; Co<"), "more from the same guide");
review = ""; liked = "*/0";
t = await (await get("/places/place-2-co-bkk")).text();
assert.ok(!t.includes("From the yummers team") && !t.includes("liked it on yummers"), "no review or likes: the blocks are left out");
assert.ok(!t.includes("About $") && !t.includes("<span>Dinner</span>"), "no facts for a place missing from the map: no chips invented");
assert.ok(t.includes("picked by the yummers team for Korean restaurants in Phnom Penh"));
assert.ok(!t.includes("someone") && !t.includes("/photos/"), "a person's photo stays off");

// Hours and addresses (real beta values)
for (const [a, b] of [["11:00 AM – 10:00 PM", "11am – 10pm"], ["11:30 AM – 10:30 PM", "11:30am – 10:30pm"], ["11:00 AM – 12:00 AM", "11am – 12am"], ["11:00 AM – 2:30 PM, 5:30 – 9:00 PM", "11am – 2:30pm, 5:30 – 9pm"], ["4:00 – 11:00 PM", "4 – 11pm"], ["Closed", "Closed"], ["Open 24 hours", "Open 24 hours"]]) assert.equal(shortHours(a), b);
for (const [a, b] of [
    ["Road352 BKK1, Phnom Penh 12302, Cambodia", "Street 352, BKK1, Phnom Penh"],
    ["Stree334, Phnom Penh, Cambodia", "Street 334, Phnom Penh"],
    ["#1, Street 370 Phnom Penh, 12304, Cambodia", "#1, Street 370, Phnom Penh"],
    ["# 155A, St113, Sangkat Boengkengkang3, 12304, Cambodia", "# 155A, Street 113, Sangkat Boengkengkang3"],
    ["HWCC+F7F, Street 118 Corner of Street 61 Preah Chey Chetha St. (118), Phnom Penh, Cambodia", "HWCC+F7F, Street 118, Corner of Street 61, Preah Chey Chetha St. (118), Phnom Penh"],
    ["z59, ហាងម្ហូបបួស St 210, corner 265, Phnom Penh, Cambodia", "z59, ហាងម្ហូបបួស Street 210, corner 265, Phnom Penh"],
    ["GXW4+JFX តំបន់អភិវឌ្ឍន៍ទីក្រុងកោះពេជ្រ-កោះនរា, Phnom Penh, Cambodia", "GXW4+JFX តំបន់អភិវឌ្ឍន៍ទីក្រុងកោះពេជ្រ-កោះនរា, Phnom Penh"],
    ["7, Street398, Sangkat Boeng Keng Kang I, 9a St 398, Phnom Penh 12302, Cambodia", "7, Street 398, Sangkat Boeng Keng Kang I, 9a Street 398, Phnom Penh"],
]) assert.equal(cleanAddress(a), b);

// 404s: unknown, not the team's, empty, private; places only from published guides
for (const p of ["/guides/mine", "/guides/empty", "/guides/private", "/guides/nope", "/guides/constructor", "/places/nope", "/places/place-1-co-bkk/x", "/places"]) assert.equal((await get(p)).status, 404, p);

// Index and sitemap
t = await (await get("/guides")).text();
assert.ok(t.includes("2 guides from the yummers team") && t.includes("Guide · 2 places") && t.includes("Guide · 1 places"));
assert.ok(t.includes("/guides/korean") && t.includes("/guides/bbq") && !t.includes("/guides/mine") && !t.includes("/guides/empty"));
t = await (await get("/sitemap.xml")).text();
assert.equal(t.match(/<loc>/g).length, 5, "index, 2 guides, 2 places (Place 1 is in both guides, once)");
assert.ok(t.includes("/places/place-1-co-bkk") && t.includes("<loc>https://yummersapp.com/guides</loc>") && !t.includes("/guides/mine"));

// Beta down: 503, never 404
down = true;
assert.equal((await get("/guides/korean")).status, 503);
assert.equal((await get("/places/place-1-co-bkk")).status, 503);
console.log("guides ok");
