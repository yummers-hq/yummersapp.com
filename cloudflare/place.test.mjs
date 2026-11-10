// Runs the restaurant share pages (/p/...) and their sitemap through the Worker with beta faked. Usage: node cloudflare/place.test.mjs
import assert from "node:assert/strict";
import worker from "./worker.js";
import { GUIDES, openStatus } from "./guides.js";
import { PLACES } from "./guide-places.js";

for (const k of Object.keys(GUIDES)) delete GUIDES[k];
GUIDES.korean = "KOREAN01";
PLACES.rid1 = { name: "Clean One", kind: "Korean BBQ", price: "$12–20", when: "Dinner" };
const hours = { weekday_text: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((d) => `${d}: 9:00 AM – 9:00 PM`) };
const base = { share_id: "AAAAAAAA", name: "Pho <b> & Co", cuisine_type: ["Vietnamese"], district: "BKK", neighbourhood: "BKK1", address: "Road352 BKK1, Phnom Penh 12302, Cambodia", latitude: 11.5, longitude: 104.9, opening_hours: hours, picture: { kind: "cover", url: "https://lh3.googleusercontent.com/pho" }, liked: 0, disliked: 0, guides: [] };
const places = {
    AAAAAAAA: base,
    BBBBBBBB: { ...base, share_id: "BBBBBBBB", name: "Place 1 & Co", cuisine_type: ["International", "Korean"], district: "BKK", liked: 9, disliked: 3, guides: [{ share_id: "KOREAN01", title: "Korean" }], picture: { kind: "photo", id: "pid", userId: "uid", by: "someone" } },
    CCCCCCCC: { ...base, share_id: "CCCCCCCC", name: "ក្រុមហ៊ុន", opening_hours: null, picture: null, latitude: null, longitude: null, address: null },
};
const guide = { title: "Korean", description: "", share_id: "KOREAN01", profiles: { username: "yummers" }, list_restaurants: [{ position: 1, picture: { kind: "cover", url: "https://lh3.googleusercontent.com/g1" }, restaurants: { name: "Place 1 & Co", district: "BKK", cuisine_type: ["Korean"] } }] };
const embed = [{ position: 1, restaurants: { id: "rid1", neighbourhood: "BKK1" } }];
let mode = "ok", rows = [];
const store = new Map();
globalThis.caches = { default: { match: async (r) => store.get(r.url)?.clone(), put: async (r, v) => store.set(r.url, v) } };
globalThis.fetch = async (url, init = {}) => {
    url = String(url.url ?? url);
    if (mode === "down") return new Response("no", { status: 500 });
    if (url.includes("shared_place")) return mode === "nofn" ? new Response("{}", { status: 404 }) : Response.json(places[JSON.parse(init.body).p_share_id] ?? null);
    if (url.includes("shared_list")) return Response.json(guide);
    if (url.includes("lists?share_id")) return Response.json([{ user_id: "yid", list_restaurants: embed }]);
    if (url.includes("user_restaurants?select=restaurant_id")) {
        if (mode === "nocolumn") return new Response("{}", { status: 400 });
        const at = +url.match(/offset=(\d+)/)[1];
        return Response.json(rows.slice(at, at + 1000));
    }
    return new Response("static 404", { status: 404 });
};
const get = async (path) => { store.clear(); return worker.fetch(new Request("https://yummersapp.com" + path), {}, { waitUntil() {} }); };
const meta = (t, n) => t.match(new RegExp(`<meta (?:property|name)="${n}" content="([^"]*)"`))?.[1];

// A place in no guide, not yet rated, with a Google cover
let r = await get("/p/AAAAAAAA/pho-b-co");
let t = await r.text();
assert.equal(r.status, 200);
assert.equal(r.headers.get("Cache-Control"), "public, max-age=300");
assert.ok(!r.headers.has("X-Slug"));
for (const s of ["Pho &lt;b&gt; &amp; Co", "Vietnamese ·\u00a0BKK1", "Not rated on yummers yet", "Been here? Rate it in the app", "Street 352, BKK1, Phnom Penh", "query=11.5%2C104.9", ">Directions<", "9am – 9pm", "https://lh3.googleusercontent.com/pho", '"@type":"Restaurant"',
    'rel="canonical" href="https://yummersapp.com/p/AAAAAAAA/pho-b-co"']) assert.ok(t.includes(s), s);
assert.ok(!t.includes("Pho <b>") && !t.includes("In these guides") && !t.includes("Keep a list"), "escaped, no guides box, no pitch box");
assert.equal(t.match(/class="today"/g).length, 2, "today's row is bold");
assert.equal(meta(t, "twitter:card"), "summary_large_image");
assert.equal(meta(t, "og:title"), "Pho &lt;b&gt; &amp; Co, BKK1 | yummers");
const d1 = "Vietnamese in BKK1, Phnom Penh. Open 9am – 9pm every day. See what people think on yummers.";
assert.equal(meta(t, "og:description"), d1);
assert.equal(meta(t, "twitter:description"), d1);
assert.equal(meta(t, "description"), d1);
assert.equal(meta(t, "og:image"), "https://lh3.googleusercontent.com/pho");
assert.equal(meta(t, "twitter:image"), "https://lh3.googleusercontent.com/pho");
JSON.parse(t.match(/ld\+json">(.*?)<\/script>/)[1].replace(/\\u003c/g, "<"));

// A place in a guide, rated by 12: clean name, /places/ canonical, a person's photo credited
t = await (await get("/p/BBBBBBBB/place-1-co")).text();
for (const s of ["Clean One", "Korean BBQ ·\u00a0BKK1", "75%", "liked it", "from 12 ratings on yummers", "In 1 yummers guide", "In these guides", 'href="/guides/korean"', "1 places",
    'rel="canonical" href="https://yummersapp.com/places/place-1-co-bkk"', "Photo by @someone", "/storage/v1/object/public/photos/uid/pid.jpg"]) assert.ok(t.includes(s), s);
assert.equal(meta(t, "og:description"), "Korean BBQ in BKK1, Phnom Penh. Open 9am – 9pm every day. In our guide: Korean. See what people think on yummers.");
assert.equal(meta(t, "og:url"), "https://yummersapp.com/places/place-1-co-bkk");
places.BBBBBBBB.liked = 3; places.BBBBBBBB.disliked = 1;
assert.ok((await (await get("/p/BBBBBBBB/place-1-co")).text()).includes("Not rated on yummers yet"), "under 5 ratings");

// Nothing known: no hours, no picture, no address, a Khmer name (slug "place"), the generic card image
r = await get("/p/CCCCCCCC/place");
t = await r.text();
assert.equal(r.status, 200);
assert.equal(meta(t, "og:image"), "https://yummersapp.com/assets/share.jpg");
assert.ok(!t.includes("Opening hours") && !t.includes("Find it"));

// A Street View link as the cover (beta holds 210) is no picture: the generic card, no <img>
places.DDDDDDDD = { ...base, share_id: "DDDDDDDD", name: "Dee", picture: { kind: "cover", url: "https://streetviewpixels-pa.googleapis.com/v1/thumbnail?panoid=w800-h600-k-no" } };
t = await (await get("/p/DDDDDDDD/dee")).text();
assert.equal(meta(t, "og:image"), "https://yummersapp.com/assets/share.jpg");
assert.ok(!t.includes("streetviewpixels") && !t.includes("<img src=\"https://lh3") , "no broken picture");

// Wrong or missing slug: 301 to the right one
for (const p of ["/p/AAAAAAAA", "/p/AAAAAAAA/", "/p/AAAAAAAA/wrong"]) {
    r = await get(p);
    assert.equal(r.status, 301, p);
    assert.equal(r.headers.get("Location"), "https://yummersapp.com/p/AAAAAAAA/pho-b-co");
}

// Unknown id, a bad id, and beta without shared_place(): the site's own 404, never an error
for (const p of ["/p/ZZZZZZZZ/x", "/p/short/x", "/p/"]) assert.equal((await get(p)).status, 404, p);
mode = "nofn";
r = await get("/p/AAAAAAAA/pho-b-co");
assert.equal(r.status, 404);
assert.ok(!(await r.text()).includes("Error"));
// Beta unreachable: 503, so Google keeps the page
mode = "down";
assert.equal((await get("/p/AAAAAAAA/pho-b-co")).status, 503);

// Opening status in Phnom Penh time (UTC+7)
const at = (iso) => openStatus({ weekday_text: ["Monday: 11:00 AM – 2:00 PM, 5:00 – 10:00 PM", "Tuesday: Closed", "Wednesday: 6:00 PM – 2:00 AM", "Thursday: Closed", "Friday: Open 24 hours", "Saturday: Closed", "Sunday: Closed"] }, new Date(iso)).text;
assert.equal(at("2026-11-02T05:00:00Z"), "Open now · closes 2pm"); // Monday 12:00
assert.equal(at("2026-11-02T08:00:00Z"), "Closed · opens 5pm"); // Monday 15:00
assert.equal(at("2026-11-02T16:00:00Z"), "Closed · opens Wed 6pm"); // Monday 23:00, Tuesday closed
assert.equal(at("2026-11-04T18:00:00Z"), "Open now · closes 2am"); // Wednesday 01:00 Thursday is covered by Wednesday's late close
assert.equal(at("2026-11-05T20:30:00Z"), "Open 24 hours"); // Friday 03:30
assert.equal(openStatus(null), null);

// Sitemap: each rated place once, never a guide place (its canonical is /places/); empty before 0086 reaches beta
mode = "ok";
rows = Array.from({ length: 1500 }, (_, i) => ({ restaurant_id: `r${i}`, restaurants: { share_id: String(i).padStart(8, "0"), name: i ? `Place ${i}` : "A & B" } }));
rows.push({ restaurant_id: "r7", restaurants: rows[7].restaurants }, { restaurant_id: "rid1", restaurants: { share_id: "GUIDE001", name: "Place 1 & Co" } }, { restaurant_id: "gone", restaurants: null });
t = await (await get("/sitemap-places.xml")).text();
assert.equal(t.match(/<loc>/g).length, 1500, "two pages of ratings read; a place rated twice is listed once");
assert.ok(t.includes("<loc>https://yummersapp.com/p/00000000/a-b</loc>") && t.includes("/p/00001499/place-1499</loc>"));
assert.ok(!t.includes("GUIDE001"), "a guide place is left out");
rows = [];
assert.ok(!(await (await get("/sitemap-places.xml")).text()).includes("<loc>"), "no ratings: no places");
mode = "nocolumn";
t = await (await get("/sitemap-places.xml")).text();
assert.ok(t.includes("<urlset") && !t.includes("<loc>"));
console.log("place ok");

// Vague cuisine tags are skipped; with nothing left there is no kind, chip or stray separator
places.AAAAAAAA = { ...base, cuisine_type: ["International", "Asian", "Thai"], opening_hours: { weekday_text: hours.weekday_text.map((l, i) => i ? l : "Monday: 10:00 AM – 6:00 PM") } };
t = await (await get("/p/AAAAAAAA/pho-b-co")).text();
assert.equal(meta(t, "og:description"), "Thai in BKK1, Phnom Penh. See what people think on yummers.", "first useful tag; hours differ, so left out");
assert.ok(t.includes(">Thai ·\u00a0BKK1<") || t.includes("Thai ·\u00a0BKK1"));
places.AAAAAAAA = { ...base, cuisine_type: ["International"], neighbourhood: null, district: null };
t = await (await get("/p/AAAAAAAA/pho-b-co")).text();
assert.equal(meta(t, "og:description"), "Restaurant in Phnom Penh. Open 9am – 9pm every day. See what people think on yummers.");
assert.ok(!t.includes("International") && !t.includes("> · ") && !t.includes(" ·  ") && !/·\s*</.test(t.replace(/<script[\s\S]*?<\/script>/g, "")), "no kind, no stray separator");
