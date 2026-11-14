// Guide pages (D92, yummers#441) and the restaurant pages for their places (D103, yummersapp.com#81):
// the team's public lists as pages Google can read. Built on request from beta through the public
// anon key (RLS and shared_list() decide what is public) and cached for an hour.
import { PLACES, COVERS } from "./guide-places.js";
import { POSTS } from "./guide-posts.js";

const SUPABASE = "https://uobskavqhilnqakbdutt.supabase.co";
const ANON = "sb_publishable_lHMGFti9a7-RxGHVj2Iz-g_wXFZoMC7"; // public by design, as in share.js
const SITE = "https://yummersapp.com";
// Only lists owned by this account are ever published, even if a share id is added by mistake.
const TEAM = "yummers";
// One line per guide: slug -> the list's share id (yummers#444). A place page exists for every place in these.
// shortcut: hand-kept map and a request-time scan of all guides to find a place, fine to ~20 guides
// (Workers allow 50 subrequests, two per guide); then add a guide_slug column and a place slug table.
export const GUIDES = {
    "korean-restaurants-phnom-penh": "CFvYICHV",
    "khmer-food-phnom-penh": "hn35pV5d",
    "bbq-phnom-penh": "OzG5s24K",
    "street-food-phnom-penh": "9tZNChF4",
    "rooftop-bars-phnom-penh": "mGkqaq21",
    "vegan-vegetarian-phnom-penh": "FTCiOz4g",
};

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const slugify = (s) => s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
// Name plus area, so branches differ; decided by the data, not the position in a list, so it never moves.
const placeSlug = (r) => slugify(`${r.name} ${r.district || ""}`).slice(0, 70).replace(/-+$/, "") || "place";
// The first cuisine tag that says something; "International" and friends are left out, so a place may have no kind.
const VAGUE = ["International", "Asian", "Western", "Fusion", "Restaurant"];
const cuisineOf = (r) => (r.cuisine_type || []).find((c) => !VAGUE.includes(c));
// Google's "11:00 AM – 10:00 PM" as "11am – 10pm"; "Closed" and "Open 24 hours" pass through.
export const shortHours = (h) => h
    .replace(/(\d{1,2})(?::(\d\d))?\s*([AP])M/g, (_, hr, min, ap) => `${hr}${min && min !== "00" ? `:${min}` : ""}${ap.toLowerCase()}m`)
    .replace(/\b(\d{1,2}):00\b/g, "$1");

// Google's "Road352 BKK1, Phnom Penh 12302, Cambodia" as "Street 352, BKK1, Phnom Penh".
// shortcut: only Road/Street/St/Saint plus a number are normalised, and 5-6 figure postcodes dropped; anything else (Khmer, plus codes, odd Google text) is left as Google wrote it.
export const cleanAddress = (a) => a
    .replace(/\s*\b\d{5,6}\b/g, "")
    .replace(/\b(?:[Rr]oad|[Ss]aint|[Ss]t(?:reet|ree)?)\.?\s*(\d+)(\s+(?=[A-Z]))?/g, (_, n, sp) => `Street ${n}${sp ? ", " : ""}`)
    .replace(/\s+/g, " ").replace(/\s+,/g, ",").replace(/(,\s*){2,}/g, ", ")
    .replace(/,\s*Cambodia$/, "").replace(/^,\s*|,\s*$/g, "").trim();

// Google's place picture only: a person's photo, name or credit stays off these pages (spec criterion 8).
// Only hosts the CSP lets through count as a picture: beta also holds Street View links (streetviewpixels-pa.googleapis.com) that never load.
export const usable = (u) => (/^https:\/\/(?:[\w-]+\.)*googleusercontent\.com\/|^https:\/\/uobskavqhilnqakbdutt\.supabase\.co\/storage\//.test(u || "") ? u : null);
const coverOf = (it) => (it.picture?.kind === "cover" ? usable(it.picture.url) : null);
const firstSentence = (t) => (t.split(/(?<=[.!?])\s/)[0] || "").slice(0, 300);
// A meta description: whole sentences from the list, as many as fit in ~155 characters (the first always).
const fit = (parts, max = 2) => { let out = ""; for (const s of parts.slice(0, max)) { if (out && out.length + s.length + 1 > 155) break; out = out ? `${out} ${s}` : s; } return out; };
// "Open 11am – 10pm every day." when all seven days read the same, else nothing.
const sameHours = (hours) => { const h = new Set(hours.map(([, t]) => shortHours(t))); return hours.length === 7 && h.size === 1 ? `${/^open/i.test([...h][0]) ? "" : "Open "}${[...h][0]} every day.` : ""; };
const headline = (kind, area) => `${kind || "Restaurant"} in ${[area, "Phnom Penh"].filter(Boolean).join(", ")}.`;
// "a, b and c"
const listed = (xs) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`);

// A guide note's "Try the kuy teav." / "Go for grilled meats." sentences are the team's pick of what to order;
// the place page shows them under What to order and the rest as its opening line.
const PICK = /^(?:try|go for|order|get the|ask for|don['’]t miss|share)\b/i;
export const splitNote = (note) => {
    const s = (note || "").split(/(?<=[.!?])\s+/).filter(Boolean);
    return { rest: s.filter((x) => !PICK.test(x)).join(" "), pick: s.filter((x) => PICK.test(x)).join(" ") };
};

// Dishes from public ratings' "Ordered" text ("beef, rice and a stew"), most-named first. A dish shows only when the
// team named it or two different people did, so one person's free text never lands on the open web on its own.
export const dishes = (rows, team, max = 6) => {
    const seen = new Map();
    for (const { user_id, ordered } of rows) {
        for (let d of String(ordered || "").split(/[,;\n]/)) {
            d = d.trim().replace(/^and\s+/i, "").replace(/[.!]+$/, "");
            if (d.length < 2 || d.length > 50) continue;
            const e = seen.get(d.toLowerCase()) || { d, who: new Set() };
            e.who.add(user_id); seen.set(d.toLowerCase(), e);
        }
    }
    return [...seen.values()].filter((e) => e.who.has(team) || e.who.size >= 2)
        .sort((a, b) => b.who.size - a.who.size).slice(0, max).map((e) => e.d);
};

// Straight-line distance in km between two { latitude, longitude }.
const km = (a, b) => {
    const r = Math.PI / 180, h = Math.sin(((b.latitude - a.latitude) * r) / 2) ** 2
        + Math.cos(a.latitude * r) * Math.cos(b.latitude * r) * Math.sin(((b.longitude - a.longitude) * r) / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.sqrt(h));
};
// The closest places from every guide, within 3 km, leaving out this place and any already linked (skip).
export const nearby = (here, guides, skip = [], n = 3) => {
    if (here.d.latitude == null) return [];
    const seen = new Set([here.slug, ...skip]);
    return guides.flatMap((g) => g.items)
        .filter((x) => x.d.latitude != null && !seen.has(x.slug) && seen.add(x.slug))
        .map((x) => ({ x, km: km(here.d, x.d) })).filter((o) => o.km <= 3)
        .sort((a, b) => a.km - b.km).slice(0, n);
};
const away = (k) => (k < 1 ? `${Math.max(50, Math.round(k * 20) * 50)} m away` : `${k.toFixed(1)} km away`);

async function rest(path, init = {}) {
    const res = await fetch(`${SUPABASE}/rest/v1/${path}`, {
        ...init, headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json", ...init.headers },
    });
    if (!res.ok) throw new Error(String(res.status));
    return res;
}

// The guide, or null when it is missing, private, empty or not the team's; throws when beta is unreachable.
// shared_list() gives the title, notes and pictures; one embedded read adds what a place page needs
// (restaurant id, address, neighbourhood, position, hours) and the owner's id, matched to it by position.
async function load(slug) {
    const id = GUIDES[slug];
    const [list, rows] = await Promise.all([
        rest("rpc/shared_list", { method: "POST", body: JSON.stringify({ p_share_id: id }) }).then((r) => r.json()),
        rest(`lists?share_id=eq.${id}&select=user_id,list_restaurants(position,restaurants(id,address,neighbourhood,latitude,longitude,opening_hours))`).then((r) => r.json()),
    ]);
    if (!list || !rows[0] || list.profiles?.username !== TEAM || !list.list_restaurants?.length) return null;
    const detail = new Map(rows[0].list_restaurants.map((x) => [x.position, x.restaurants]));
    return {
        slug, title: list.title, description: list.description || "", shareId: list.share_id, owner: rows[0].user_id,
        items: list.list_restaurants.map((it) => ({ ...it, slug: placeSlug(it.restaurants), d: detail.get(it.position) || {} })),
    };
}

async function liveGuides() {
    return (await Promise.all(Object.keys(GUIDES).map(load))).filter(Boolean);
}


// opts: canonical (a path, default this page) and image (the chat card's picture, default share.jpg).
function layout(title, description, path, jsonld, body, opts = {}) {
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${SITE}${opts.canonical || path}">
<meta name="theme-color" content="#b8401e">
<meta property="og:type" content="website">
<meta property="og:site_name" content="yummers">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${SITE}${opts.canonical || path}">
<meta property="og:image" content="${esc(opts.image || `${SITE}/assets/share.jpg`)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(opts.image || `${SITE}/assets/share.jpg`)}">
<link rel="icon" href="/assets/favicon-192.png" sizes="192x192">
<link rel="apple-touch-icon" href="/assets/logo.png">
<script src="/theme.js"></script>
<link rel="stylesheet" href="/fonts.css">
<link rel="stylesheet" href="/style.css">
<style>
.g{padding-bottom:72px}
.out{padding-top:56px}.out h1{font-size:clamp(28px,8vw,44px)}
.acts{display:flex;flex-wrap:wrap;gap:0 14px}.acts .button{margin-top:24px}
.button-outline{background:transparent;color:var(--ink);box-shadow:inset 0 0 0 2px var(--ink)}.button-outline:hover{background:var(--accent);color:var(--cream);box-shadow:none}
.in{max-width:1040px;margin:0 auto;padding-inline:16px}
.g h1{font-weight:700;letter-spacing:-.02em}.g h2,.g h3,.g h4{letter-spacing:normal}
.cover{position:relative;aspect-ratio:4/3;background:var(--panel);color:#fffaf2}
.cover img,.photo img,.more-grid img,.pl-in img{display:block;width:100%;height:100%;object-fit:cover}
.cover:after{content:"";position:absolute;inset:0;background:linear-gradient(to top,rgba(28,20,16,.9),rgba(28,20,16,.66) 50%,rgba(28,20,16,0) 85%)}
.cover .txt{position:absolute;left:0;right:0;bottom:14px;z-index:1;text-shadow:0 1px 3px rgba(28,20,16,.6)}
.eyebrow{font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,250,242,.85)}
.g h1.t{font-size:30px;line-height:1.08;margin:4px 0;color:#fffaf2;text-wrap:balance;overflow-wrap:anywhere}
.cover .meta{color:rgba(255,250,242,.85)}
.meta{font-size:13px;color:var(--muted)}
.lead{font-size:15px;margin-top:16px;white-space:pre-line}
.items,.ixg{list-style:none;margin:0;padding:0}
.item{display:grid;gap:10px;padding:22px 0;border-bottom:1px solid var(--line)}
.item:last-child{border-bottom:0}
.head{display:grid;grid-template-columns:auto minmax(0,1fr);gap:12px;align-items:baseline}
.num{font:700 34px/1 'DM Sans','Noto Sans Khmer',sans-serif;letter-spacing:-.02em;color:var(--accent)}
.g h2.name{font-size:22px;line-height:1.15;overflow-wrap:anywhere}
.name a:hover{color:var(--accent)}
.photo{display:block;aspect-ratio:3/2;border-radius:14px;overflow:hidden;background:var(--panel)}
.item p{font-size:15px}
.ixg{display:grid;gap:14px;margin-top:18px}
.cov{position:relative;display:block;aspect-ratio:16/11;border-radius:18px;overflow:hidden;background:var(--panel);color:#fffaf2}
.cov img{display:block;width:100%;height:100%;object-fit:cover}
.cov:after{content:"";position:absolute;inset:0;background:linear-gradient(to top,rgba(28,20,16,.9),rgba(28,20,16,.66) 50%,rgba(28,20,16,0) 85%)}
.cov .txt{position:absolute;left:14px;right:14px;bottom:12px;z-index:1;text-shadow:0 1px 3px rgba(28,20,16,.6)}
.cov h2{font-size:23px;line-height:1.1;margin-top:2px;color:#fffaf2}
.ixh{padding-top:28px}
.ixh h1{font-size:34px;line-height:1.1}
.pl{display:grid;margin-top:16px}
.lede{font-size:17px;line-height:1.6}
.glance{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}
.glance span{font-size:13px;font-weight:500;background:var(--card);border:1px solid var(--line);border-radius:999px;padding:6px 12px}
.facts{display:grid;gap:14px;margin-top:18px;align-content:start}
.box{border-top:1px solid var(--line);padding-top:14px;display:grid;gap:6px;margin-top:18px}
.facts .box{margin-top:0}
.g .box h2,.g .more h2{font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;line-height:1.6;color:var(--muted);font-family:'DM Sans','Noto Sans Khmer',sans-serif}
.hours{display:grid;grid-template-columns:auto 1fr;gap:2px 16px;font-size:14px;font-variant-numeric:tabular-nums;margin:0}
.hours dt,.hours dd{margin:0}
.hours .today{font-weight:600}
.pl-in{display:grid;grid-template-columns:56px minmax(0,1fr);gap:12px;align-items:center}
.pl-in img{width:56px;height:56px;border-radius:12px}
.pl-in b{font-weight:600}
.wu{white-space:pre-line}
.glance .open{color:var(--green);border-color:var(--green)}
.rate{margin-top:18px;background:var(--card);border:1px solid var(--line);border-radius:18px;padding:16px;display:grid;gap:6px}
.rate b{font:700 22px 'DM Sans','Noto Sans Khmer',sans-serif}
.rate .big{font-size:40px;line-height:1;color:var(--accent)}
.rate p{margin:0;color:var(--muted);font-size:14px}
.dirbtn{display:flex;justify-content:center;align-self:start;margin-top:18px;font-weight:600;font-size:14px;background:var(--ink);color:var(--paper);border-radius:999px;padding:12px 18px}
.more{margin-top:28px}
.more h2{margin-bottom:12px}
.more-grid{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.more-grid .ph{display:block;aspect-ratio:4/3;border-radius:12px;overflow:hidden;background:var(--panel)}
.more-grid b{display:block;font:700 14px/1.2 'DM Sans','Noto Sans Khmer',sans-serif;margin-top:8px;overflow-wrap:anywhere}
.more-grid span.m{font-size:12.5px;color:var(--muted)}
.more-all{display:inline-block;margin-top:14px;font-weight:600;font-size:14px;color:var(--accent)}
/* Motion: the cover settles, text and index covers rise in, sections ease up on scroll (rise, in style.css), photos zoom on hover. Rests fully visible; off with reduced motion. */
.cover{overflow:hidden}
@media(prefers-reduced-motion:no-preference){
@keyframes g-in{from{opacity:0;transform:translateY(14px)}}
@keyframes g-settle{from{transform:scale(1.06)}}
.cover img{animation:g-settle 1.2s ease-out both}
.cover .txt,.ixh{animation:g-in .6s .15s ease-out both}
.lead,.lede,.glance{animation:g-in .6s .3s ease-out both}
.ixg li{animation:g-in .5s ease-out both}
.ixg li:nth-child(1){animation-delay:.2s}.ixg li:nth-child(2){animation-delay:.28s}.ixg li:nth-child(3){animation-delay:.36s}.ixg li:nth-child(n+4){animation-delay:.44s}
.cov img,.photo img,.more-grid .ph img,.pl-in img{transition:transform .5s cubic-bezier(.2,.7,.2,1)}
.cov:hover img,.cov:focus-visible img,.photo:hover img,.photo:focus-visible img,.more-grid a:hover img,.more-grid a:focus-visible img{transform:scale(1.04)}
}
@supports(animation-timeline:view()){@media(prefers-reduced-motion:no-preference){
.item,.facts .box,.more{animation:rise linear both;animation-timeline:view();animation-range:entry 0% entry 45%}
}}
@media(min-width:900px){
.in{padding-inline:28px}
.cover{aspect-ratio:auto;height:440px}
.cover .txt{bottom:30px}
.g h1.t{font-size:52px;margin:6px 0;max-width:16ch}
.cover .meta{font-size:15px}
.lead{font-size:19px;line-height:1.65;max-width:62ch;margin:32px 0 8px}
.item{grid-template-columns:1.15fr 1fr;grid-template-rows:1fr 1fr;column-gap:40px;align-items:center;padding:36px 0}
.item .photo{grid-column:1;grid-row:1/3}
.item .head{grid-column:2;grid-row:1;align-self:end}
.item p{grid-column:2;grid-row:2;align-self:start;font-size:16.5px;line-height:1.7;margin-top:4px}
.item:nth-child(even){grid-template-columns:1fr 1.15fr}
.item:nth-child(even) .photo{grid-column:2}
.item:nth-child(even) .head,.item:nth-child(even) p{grid-column:1}
.num{font-size:46px}
.g h2.name{font-size:30px}
.ixh{padding:40px 0 8px}
.ixh h1{font-size:46px}
.ixh .lead{margin-top:12px}
.ixg{grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;margin-top:24px}
.cov{aspect-ratio:4/5}
.cov h2{font-size:25px}
.pl{grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);grid-template-rows:auto auto auto 1fr;column-gap:56px;margin-top:36px}
.pl>:not(.facts){grid-column:1}
.facts{grid-column:2;grid-row:1/5;margin-top:0}
.lede{font-size:21px}
.more-grid{gap:14px}
.more-grid b{font-size:16px}
}
</style>
<script type="application/ld+json">${jsonld.replace(/</g, "\\u003c")}</script>
</head>
<body><a class="skip" href="#main">Skip to content</a>
<header class="header wrap"><a href="/" class="brand" aria-label="yummers home"><img class="brand-image" src="/assets/raccoon.png" alt="" width="58" height="32"><span class="brand-name">yummers<span class="brand-tag"> | Restaurant Lists App</span></span></a>
<nav aria-label="Main navigation"><a class="nav-status" href="/beta">Join the iPhone beta</a><button type="button" class="theme-toggle" aria-pressed="false" aria-label="Dark mode"></button><button type="button" class="burger" aria-label="Menu" aria-expanded="false" aria-controls="menu"><i></i><i></i><i></i></button></nav></header>
<div class="menu" id="menu"><ul class="menu-links"><li><a href="/guides">Guides</a></li><li><a href="/blog">Blog</a></li><li><a href="/#preview">How it works</a></li><li><a href="/about">About</a></li><li><a href="/contact">Contact</a></li><li><a href="/help/import">Help</a></li></ul><div class="menu-side"><p>yummers is a social food diary for Cambodia: rate places, keep lists and share them with friends.</p><div class="menu-extras"></div></div></div>
<main id="main" class="g">
${body}
</main>
<footer class="site-footer wrap">
<div class="footer-brand"><a href="/"><img class="footer-logo" src="/assets/logo-horizontal.svg" alt="yummers" width="170" height="45"></a><p>Rate the places you've eaten, keep lists, share them with friends.</p><div class="footer-follow"><a href="https://www.instagram.com/yummersapp/" target="_blank" rel="noopener" aria-label="yummers on Instagram"><img src="/assets/social/instagram.svg" alt="" width="17" height="17"></a><a href="https://www.facebook.com/profile.php?id=61594898428255" target="_blank" rel="noopener" aria-label="yummers on Facebook"><img src="/assets/social/facebook.svg" alt="" width="17" height="17"></a><a href="https://www.linkedin.com/company/hungryraccoon/" target="_blank" rel="noopener" aria-label="yummers on LinkedIn"><img src="/assets/social/linkedin.svg" alt="" width="17" height="17"></a><a href="https://www.tiktok.com/@hungryraccoonapp" target="_blank" rel="noopener" aria-label="yummers on TikTok"><img src="/assets/social/tiktok.svg" alt="" width="17" height="17"></a></div></div>
<nav class="footer-links" aria-label="Footer"><div><h2>Explore</h2><ul><li><a href="/guides">Guides</a></li><li><a href="/blog">Blog</a></li><li><a href="/#preview">How it works</a></li></ul></div><div><h2>yummers</h2><ul><li><a href="/about">About</a></li><li><a href="/contact">Contact us</a></li><li><a href="/help/import">Help</a></li><li><a href="/beta">Join the beta</a></li></ul></div><div><h2>Legal</h2><ul><li><a href="/privacy">Privacy policy</a></li><li><a href="/terms">Terms of service</a></li><li><a href="#cookies" role="button" data-cookie-settings>Cookie settings</a></li></ul></div></nav>
<div class="footer-bottom"><span>© 2026 yummers</span><span class="footer-lang"></span><span>Made in Phnom Penh</span></div>
</footer>
<script src="/analytics.js"></script>
</body>
</html>`;
}

const img = (url, w, h, eager) => (url ? `<img src="${esc(url)}" alt="" loading="${eager ? "eager" : "lazy"}" referrerpolicy="no-referrer" width="${w}" height="${h}">` : "");
// Display name and kind come from guide-places.js; a place missing there shows its database name and cuisine.
const nameOf = (it) => PLACES[it.d.id]?.name || it.restaurants.name;
// The no-break space after the dot keeps it with the part that follows, so a caption wraps before "·", never after it.
const dotted = (parts) => parts.filter(Boolean).join(" ·\u00a0");
const metaOf = (it) => dotted([PLACES[it.d.id]?.kind || cuisineOf(it.restaurants), it.d.neighbourhood || it.restaurants.district]);
const guideCover = (g) => coverOf(g.items.find((i) => i.d.id === COVERS[g.slug]) || {}) || g.items.map(coverOf).find(Boolean);
const cover = (photo, eyebrow, title, meta) => `<div class="cover">${img(photo, 1040, 780, true)}<div class="txt"><div class="in"><div class="eyebrow">${esc(eyebrow)}</div><h1 class="t">${esc(title)}</h1><div class="meta">${esc(meta)}</div></div></div></div>`;

function guidePage(g) {
    const path = `/guides/${g.slug}`;
    const description = fit(g.description.split(/(?<=[.!?])\s+/).filter(Boolean)) || `${g.title}, picked by the yummers team.`;
    const jsonld = JSON.stringify({
        "@context": "https://schema.org", "@type": "ItemList", name: g.title, description, url: SITE + path,
        itemListElement: g.items.map((it, i) => ({
            "@type": "ListItem", position: i + 1,
            item: { "@type": "Restaurant", name: nameOf(it), url: `${SITE}/places/${it.slug}`, ...(it.note && { description: it.note }) },
        })),
    });
    const items = g.items.map((it, i) => `<li class="item"><div class="head"><span class="num">${String(i + 1).padStart(2, "0")}</span><div><h2 class="name"><a href="/places/${it.slug}">${esc(nameOf(it))}</a></h2><div class="meta">${esc(metaOf(it))}</div></div></div><a class="photo" href="/places/${it.slug}" tabindex="-1" aria-hidden="true">${img(coverOf(it), 600, 400)}</a>${it.note ? `<p>${esc(it.note)}</p>` : ""}</li>`).join("");
    // The blog posts written for this guide, in the box the posts use to point back here.
    const posts = (POSTS[g.slug] || []).map((p) => `<a class="guidebox" href="/blog/${esc(p.slug)}">${img(p.image, 72, 72)}<span><b>${esc(p.title)}</b>From the blog · ${p.minutes} min read</span></a>`).join("");
    return layout(`${g.title} | yummers`, description, path, jsonld, `${cover(guideCover(g), "Guide · Phnom Penh", g.title, `${g.items.length} places · by the yummers team`)}
<div class="in">${g.description ? `<p class="lead">${esc(g.description)}</p>` : ""}<ol class="items">${items}</ol>${posts}</div>`);
}

function indexPage(found) {
    const description = "Lists of where to eat in Phnom Penh, made by the yummers team.";
    const jsonld = JSON.stringify({ "@context": "https://schema.org", "@type": "CollectionPage", name: "Where to eat in Phnom Penh", description, url: `${SITE}/guides` });
    const cards = found.map((g, i) => `<li><a class="cov" href="/guides/${g.slug}">${img(guideCover(g), 520, 650, i === 0)}<div class="txt"><div class="eyebrow">Guide · ${g.items.length} places</div><h2>${esc(g.title)}</h2></div></a></li>`).join("");
    return layout("Where to eat in Phnom Penh | yummers", description, "/guides", jsonld,
        `<div class="in"><div class="ixh"><h1>Where to eat in Phnom Penh</h1><p class="lead">${found.length} guides from the yummers team, from Korean barbecue to rooftop bars.</p></div>\n<ul class="ixg">${cards}</ul></div>`);
}

// The team account's own public review of the place, and how many people liked it from public ratings.
// Both come through RLS, which already hides private accounts, hidden and blocked ratings and Want to try (0016, 0032, 0066, 0081).
async function placeFacts(g, id) {
    const [mine, liked, ordered] = await Promise.all([
        rest(`user_restaurants?select=review&user_id=eq.${g.owner}&restaurant_id=eq.${id}&is_public=eq.true&sentiment=not.is.null&limit=1`).then((r) => r.json()),
        rest(`user_restaurants?select=id&restaurant_id=eq.${id}&sentiment=eq.liked&is_public=eq.true`, { method: "HEAD", headers: { Prefer: "count=exact" } }),
        rest(`user_restaurants?select=user_id,ordered&restaurant_id=eq.${id}&is_public=eq.true&sentiment=not.is.null&ordered=not.is.null&limit=200`).then((r) => r.json()),
    ]);
    return { review: (mine[0]?.review || "").trim(), liked: Number(liked.headers.get("content-range")?.split("/")[1]) || 0, dishes: dishes(ordered, g.owner) };
}

async function placePage(slug, all) {
    const g = all.find((x) => x.items.some((it) => it.slug === slug));
    if (!g) return null;
    const it = g.items.find((x) => x.slug === slug), r = it.restaurants, d = it.d, name = nameOf(it);
    const { review, liked, dishes: ate } = d.id ? await placeFacts(g, d.id) : { review: "", liked: 0, dishes: [] };
    const path = `/places/${slug}`, fact = PLACES[d.id] || {}, kind = fact.kind || cuisineOf(r), area = d.neighbourhood || r.district;
    const inGuides = all.filter((x) => x.items.some((i) => i.slug === slug));
    const hours = (d.opening_hours?.weekday_text || []).map((l) => l.split(/: (.*)/s)).filter((p) => p[1]);
    const { rest: lede, pick } = splitNote(it.note);
    // Searches ask for a place's "menu" and hours: the title names what the page answers, and only that.
    const answers = [(pick || ate.length) && "what to order", hours.length && "hours", fact.price && "prices"].filter(Boolean);
    const description = fit([firstSentence(review) || headline(kind, area), pick || (ate.length && `People order the ${listed(ate.slice(0, 3))}.`),
        sameHours(hours), fact.price && `About ${fact.price} a person.`, `Picked by the yummers team for ${g.title}.`].filter(Boolean), 5);
    const today = new Date().toLocaleDateString("en-US", { weekday: "long", timeZone: "Asia/Phnom_Penh" });
    const where = d.latitude != null && d.longitude != null ? `${d.latitude},${d.longitude}` : `${name} Phnom Penh`;
    const jsonld = JSON.stringify({
        "@context": "https://schema.org", "@type": "Restaurant", name, url: SITE + path, description,
        ...(kind && { servesCuisine: kind }),
        address: { "@type": "PostalAddress", ...(d.address && { streetAddress: cleanAddress(d.address) }), addressLocality: "Phnom Penh", addressCountry: "KH" },
        ...(d.latitude != null && { geo: { "@type": "GeoCoordinates", latitude: d.latitude, longitude: d.longitude } }),
    });
    const chips = [fact.kind, fact.price && `About ${fact.price} a person`, fact.when, liked && `${liked} ${liked === 1 ? "person" : "people"} liked it on yummers`].filter(Boolean);
    const at = g.items.indexOf(it), more = [1, 2, 3].map((n) => g.items[(at + n) % g.items.length]).filter((x) => x !== it);
    const near = nearby(it, all, more.map((x) => x.slug));
    const tile = (x, m) => `<li><a href="/places/${x.slug}"><span class="ph">${img(coverOf(x), 400, 300)}</span><b>${esc(nameOf(x))}</b><span class="m">${esc(m)}</span></a></li>`;
    const body = `${cover(coverOf(it), metaOf(it), name, `In ${g.title}`)}
<div class="in"><div class="pl">
${lede ? `<p class="lede">${esc(lede)}</p>` : ""}
${chips.length ? `<div class="glance">${chips.map((c) => `<span>${esc(c)}</span>`).join("")}</div>` : ""}
${pick || ate.length ? `<section class="box"><h2>What to order</h2>${pick ? `<p class="wu">${esc(pick)}</p>` : ""}${ate.length ? `<p class="wu">People on yummers ordered ${esc(listed(ate))}.</p>` : ""}</section>` : ""}
${review ? `<section class="box"><h2>From the yummers team</h2><p class="wu">${esc(review)}</p></section>` : ""}
<a class="dirbtn" href="https://www.google.com/maps/search/?api=1&amp;query=${encodeURIComponent(where)}" rel="noopener">Directions</a>
<div class="facts"><section class="box"><h2>Find it</h2>${d.address ? `<div>${esc(cleanAddress(d.address))}</div>` : ""}</section>
${hours.length ? `<section class="box"><h2>Opening hours</h2><dl class="hours">${hours.map(([day, h]) => { const c = day === today ? ' class="today"' : ""; return `<dt${c}>${esc(day)}</dt><dd${c}>${esc(shortHours(h))}</dd>`; }).join("")}</dl></section>` : ""}
<section class="box"><h2>In these guides</h2>${inGuides.map((x) => `<a class="pl-in" href="/guides/${x.slug}">${img(guideCover(x), 112, 112)}<div><b>${esc(x.title)}</b><div class="meta">${x.items.length} places</div></div></a>`).join("")}</section></div>
${near.length ? `<section class="more"><h2>Near here</h2><ul class="more-grid">${near.map((o) => tile(o.x, dotted([metaOf(o.x).split(" · ")[0], away(o.km)]))).join("")}</ul></section>` : ""}
<section class="more"><h2>More in ${esc(g.title)}</h2><ul class="more-grid">${more.map((x) => tile(x, metaOf(x))).join("")}</ul><a class="more-all" href="/guides/${g.slug}">See all ${g.items.length} places →</a></section>
</div></div>`;
    const said = listed(answers);
    return layout(`${name}${area ? `, ${area}` : ""}${said ? `: ${said[0].toUpperCase()}${said.slice(1)}` : ""} | yummers`, description, path, jsonld, body);
}

// Beta unreachable: the site's shell, a way to retry and a way on that needs no data. Never cached.
export const outage = (path) => new Response(layout("We'll be right back | yummers", "Our restaurant data is taking a short break.", path, "{}", `<div class="in out"><h1>We'll be right back</h1>
<p class="lead">Our restaurant data is taking a short break. Try again in a minute.</p>
<p class="acts"><a class="button" href="${esc(path)}">Try again</a><a class="button button-outline" href="/blog">Read the blog</a></p></div>`), {
    status: 503, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Retry-After": "60" },
});

const html = (body) => new Response(body, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=3600" } });

// A Response for a guide or place address, or null to let the site answer (its 404 page).
// Beta being down is a 503, never a 404, so Google keeps the page.
async function render(pathname) {
    try {
        if (pathname.startsWith("/guides/")) {
            const slug = pathname.slice("/guides/".length);
            const g = Object.hasOwn(GUIDES, slug) && await load(slug);
            return g ? html(guidePage(g)) : null;
        }
        const all = await liveGuides();
        if (pathname === "/guides") return all.length ? html(indexPage(all)) : null;
        const page = pathname.startsWith("/places/") && await placePage(pathname.slice("/places/".length), all);
        return page ? html(page) : null;
    } catch {
        return outage(pathname);
    }
}

// The edge keeps a page for an hour, keyed to the deployed version so a deploy shows at once;
// browsers keep it five minutes.
async function edge(path, url, ctx, version, make) {
    const key = new Request(url.origin + path + (version ? "?v=" + version : ""));
    const hit = await caches.default.match(key);
    const res = hit || await make();
    if (!res?.ok) return res;
    if (!hit) ctx.waitUntil(caches.default.put(key, res.clone()));
    const out = new Response(res.body, res);
    out.headers.set("Cache-Control", "public, max-age=300");
    return out;
}

export async function guides(url, ctx, version = "") {
    const path = url.pathname.replace(/\/$/, "");
    return edge(path, url, ctx, version, () => render(path));
}

// The static sitemap plus every live guide and the places in them, so adding a guide is one line.
export async function sitemap(res) {
    if (!res.ok) return res;
    const live = await liveGuides().catch(() => []);
    if (!live.length) return res;
    const paths = new Set(["/guides", ...live.map((g) => `/guides/${g.slug}`), ...live.flatMap((g) => g.items.map((it) => `/places/${it.slug}`))]);
    const urls = [...paths].map((p) => `  <url>\n    <loc>${SITE}${p}</loc>\n  </url>\n`).join("");
    return new Response((await res.text()).replace("</urlset>", `${urls}</urlset>`), res);
}

// Any restaurant (/p/{share_id}/{slug}, D126, yummers#784): shared_place() on beta. Until migration 0086 reaches beta
// the function doesn't exist, which reads as "not found" (the site's 404), never an error.
const photoUrl = (p) => `https://uobskavqhilnqakbdutt.supabase.co/storage/v1/object/public/photos/${encodeURIComponent(p.userId)}/${encodeURIComponent(p.id)}.jpg`;
const minutes = (h, m, ap) => ((+h % 12) + (/p/i.test(ap) ? 12 : 0)) * 60 + +(m || 0);
const clock = (t) => { const m = t % 1440; return `${(Math.floor(m / 60) + 11) % 12 + 1}${m % 60 ? ":" + String(m % 60).padStart(2, "0") : ""}${m < 720 ? "am" : "pm"}`; };
// "11:00 AM – 2:30 PM, 5:30 – 9:00 PM" as [[660, 870], [1050, 1260]]; a close past midnight runs on beyond 1440.
const ranges = (text) => [...text.matchAll(/(\d{1,2})(?::(\d\d))?\s*([AP]M)?\s*[–-]\s*(\d{1,2})(?::(\d\d))?\s*([AP]M)/gi)].map(([, h1, m1, a1, h2, m2, a2]) => {
    const end = minutes(h2, m2, a2);
    let start = minutes(h1, m1, a1 || a2);
    if (!a1 && start > end) start -= 720; // "11:00 – 2:00 PM"
    return [start, end <= start ? end + 1440 : end];
});
// "Open now · closes 10pm" or "Closed · opens 11am" (or "Closed · opens Tue 11am"), in Phnom Penh time; null when hours are unknown.
// shortcut: Phnom Penh's clock for every place (beta is Phnom Penh only); use the place's city when Melbourne arrives.
export function openStatus(hours, now = new Date()) {
    const lines = hours?.weekday_text;
    if (!lines?.length) return null;
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Phnom_Penh", weekday: "long", hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(now).map((p) => [p.type, p.value]));
    const day = lines.findIndex((l) => l.startsWith(parts.weekday + ":")), t = +parts.hour * 60 + +parts.minute;
    if (day < 0) return null;
    const on = (d) => (lines[(day + d + 7) % 7].split(/: (.*)/s)[1] || "");
    if (/24 hours/i.test(on(0))) return { open: true, text: "Open 24 hours" };
    const now0 = [...ranges(on(-1)).map(([a, b]) => [a - 1440, b - 1440]), ...ranges(on(0))].find(([a, b]) => a <= t && t < b);
    if (now0) return { open: true, text: `Open now · closes ${clock(now0[1])}` };
    for (let d = 0; d < 7; d++) {
        const next = ranges(on(d)).find(([a]) => d > 0 || a > t);
        if (next) return { open: false, text: `Closed · opens ${d ? lines[(day + d) % 7].slice(0, 3) + " " : ""}${clock(next[0])}` };
    }
    return { open: false, text: "Closed" };
}

// The place, or null when the id is unknown or beta has no shared_place() yet; throws when beta is unreachable.
async function loadPlace(id) {
    try {
        return await rest("rpc/shared_place", { method: "POST", body: JSON.stringify({ p_share_id: id }) }).then((r) => r.json());
    } catch (e) {
        if (e.message === "404" || e.message === "400") return null;
        throw e;
    }
}

async function placeShare(id) {
    const p = await loadPlace(id);
    if (!p) return null;
    // Guides the Worker publishes: the place's /places/ page is then the canonical one.
    const slugs = Object.keys(GUIDES).filter((s) => (p.guides || []).some((g) => g.share_id === GUIDES[s]));
    const inGuides = (await Promise.all(slugs.map(load))).filter(Boolean);
    const item = inGuides[0]?.items.find((it) => it.slug === placeSlug(p));
    const fact = PLACES[item?.d.id] || {};
    const name = fact.name || p.name, area = p.neighbourhood || p.district;
    const kind = fact.kind || cuisineOf(p), line = dotted([kind, area]);
    const sub = inGuides.length ? `in ${inGuides.length} yummers ${inGuides.length === 1 ? "guide" : "guides"}` : "on yummers";
    const picture = p.picture?.kind === "cover" ? { url: coverOf({ picture: p.picture }) } : p.picture?.kind === "photo" ? { url: photoUrl(p.picture), by: p.picture.by } : null;
    const total = p.liked + p.disliked, status = openStatus(p.opening_hours);
    const rate = total < 5
        ? `<b>Not rated on yummers yet</b><p>Been here? Rate it in the app, and see what your friends think.</p>`
        : `<b class="big">${Math.round((p.liked / total) * 100)}%</b><b>liked it</b><p>from ${total} ratings on yummers</p>`;
    const slug = slugify(p.name).slice(0, 60).replace(/-+$/, "") || "place";
    const path = `/p/${id}/${slug}`, canonical = item ? `/places/${item.slug}` : path;
    const hours = (p.opening_hours?.weekday_text || []).map((l) => l.split(/: (.*)/s)).filter((x) => x[1]);
    const description = fit([headline(kind, area), sameHours(hours), inGuides.length && `In our guide: ${inGuides[0].title}.`, "See what people think on yummers."].filter(Boolean), 4);
    const today = new Date().toLocaleDateString("en-US", { weekday: "long", timeZone: "Asia/Phnom_Penh" });
    const where = p.latitude != null && p.longitude != null ? `${p.latitude},${p.longitude}` : `${name} Phnom Penh`;
    const jsonld = JSON.stringify({
        "@context": "https://schema.org", "@type": "Restaurant", name, url: SITE + canonical,
        ...(kind && { servesCuisine: kind }),
        address: { "@type": "PostalAddress", ...(p.address && { streetAddress: cleanAddress(p.address) }), addressLocality: "Phnom Penh", addressCountry: "KH" },
        ...(p.latitude != null && { geo: { "@type": "GeoCoordinates", latitude: p.latitude, longitude: p.longitude } }),
    });
    const chips = [kind && `<span>${esc(kind)}</span>`, status && `<span${status.open ? ' class="open"' : ""}>${esc(status.text)}</span>`].filter(Boolean).join("");
    const body = `${cover(picture?.url, line, name, `${sub[0].toUpperCase()}${sub.slice(1)}${picture?.by ? ` · Photo by @${picture.by}` : ""}`)}
<div class="in"><div class="pl">
${chips ? `<div class="glance">${chips}</div>` : ""}
<div class="rate">${rate}</div>
<a class="dirbtn" href="https://www.google.com/maps/search/?api=1&amp;query=${encodeURIComponent(where)}" rel="noopener">Directions</a>
<div class="facts">${p.address ? `<section class="box"><h2>Find it</h2><div>${esc(cleanAddress(p.address))}</div></section>` : ""}
${hours.length ? `<section class="box"><h2>Opening hours</h2><dl class="hours">${hours.map(([day, h]) => { const c = day === today ? ' class="today"' : ""; return `<dt${c}>${esc(day)}</dt><dd${c}>${esc(shortHours(h))}</dd>`; }).join("")}</dl></section>` : ""}
${inGuides.length ? `<section class="box"><h2>In these guides</h2>${inGuides.map((x) => `<a class="pl-in" href="/guides/${x.slug}">${img(guideCover(x), 112, 112)}<div><b>${esc(x.title)}</b><div class="meta">${x.items.length} places</div></div></a>`).join("")}</section>` : ""}</div>
</div></div>`;
    const res = html(layout(`${name}${area ? `, ${area}` : ""} | yummers`, description, path, jsonld, body, { canonical, image: picture?.url }));
    res.headers.set("X-Slug", slug);
    return res;
}

// /p/{share_id}/{slug}: the right slug is in the answer, so a wrong or missing one is a 301, as for /l/.
// Also /sitemap-places.xml: the /p/ address of every rated place outside the guides (robots.txt names this file).
export async function places(url, ctx, version = "") {
    try {
        if (url.pathname === "/sitemap-places.xml") {
            return await edge(url.pathname, url, ctx, version, async () => {
                // Only places with something of our own: at least one public rating (the page's liked count, and any
                // person's photo, hang off one). Google parked the ~6,000 unrated pages as copies of a Maps listing
                // ("discovered, not indexed", 10 Nov); they still answer, they just aren't offered. A place in a
                // guide is left out too: its canonical is /places/{slug}, which sitemap.xml lists.
                const inGuide = new Set((await liveGuides().catch(() => [])).flatMap((g) => g.items.map((it) => it.d.id)));
                const rated = new Map();
                try {
                    let page, at = 0;
                    do {
                        page = await rest(`user_restaurants?select=restaurant_id,restaurants(share_id,name)&is_public=eq.true&hidden=eq.false&sentiment=not.is.null&order=id&limit=1000&offset=${at}`).then((r) => r.json());
                        at += page.length;
                        for (const r of page) if (r.restaurants?.share_id && !inGuide.has(r.restaurant_id)) rated.set(r.restaurant_id, r.restaurants);
                    } while (page.length === 1000);
                } catch (e) {
                    if (e.message !== "400") throw e; // no share_id column on beta yet: an empty list
                }
                const rows = [...rated.values()];
                const urls = rows.map((r) => `  <url><loc>${SITE}/p/${r.share_id}/${esc(slugify(r.name).slice(0, 60).replace(/-+$/, "") || "place")}</loc></url>\n`).join("");
                return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}</urlset>\n`, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
            });
        }
        const [, id, slug] = url.pathname.match(/^\/p\/([0-9A-Za-z]{8})(?:\/([^/]*))?\/?$/) || [];
        if (!id) return null;
        const res = await edge(`/p/${id}`, url, ctx, version, async () => await placeShare(id));
        if (!res?.ok) return res;
        const want = res.headers.get("X-Slug");
        res.headers.delete("X-Slug");
        return slug === want ? res : Response.redirect(`${SITE}/p/${id}/${want}`, 301);
    } catch {
        return outage(url.pathname);
    }
}
