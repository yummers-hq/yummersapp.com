// Guide pages (D92, yummers#441) and the restaurant pages for their places (D103, yummersapp.com#81):
// the team's public lists as pages Google can read. Built on request from beta through the public
// anon key (RLS and shared_list() decide what is public) and cached for an hour.
import { PLACES, COVERS } from "./guide-places.js";

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
const cuisineOf = (r) => (r.cuisine_type || []).find((c) => c !== "International") || (r.cuisine_type || [])[0];
// Google's place picture only: a person's photo, name or credit stays off these pages (spec criterion 8).
const coverOf = (it) => (it.picture?.kind === "cover" && /^https:\/\//.test(it.picture.url) ? it.picture.url : null);
const firstSentence = (t) => (t.split(/(?<=[.!?])\s/)[0] || "").slice(0, 300);

async function rest(path, init = {}) {
    const res = await fetch(`${SUPABASE}/rest/v1/${path}`, {
        ...init, headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json", ...init.headers },
    });
    if (!res.ok) throw new Error(String(res.status));
    return res;
}

// The guide, or null when it is missing, private, empty or not the team's; throws when beta is unreachable.
// shared_list() gives the title, notes and pictures; one embedded read adds what a place page needs
// (restaurant id, address, position, hours) and the owner's id, matched to it by position.
async function load(slug) {
    const id = GUIDES[slug];
    const [list, rows] = await Promise.all([
        rest("rpc/shared_list", { method: "POST", body: JSON.stringify({ p_share_id: id }) }).then((r) => r.json()),
        rest(`lists?share_id=eq.${id}&select=user_id,list_restaurants(position,restaurants(id,address,latitude,longitude,opening_hours))`).then((r) => r.json()),
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


function layout(title, description, path, jsonld, body) {
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${SITE}${path}">
<meta name="theme-color" content="#b8401e">
<meta property="og:type" content="website">
<meta property="og:site_name" content="yummers">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${SITE}${path}">
<meta property="og:image" content="${SITE}/assets/share.jpg">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/assets/favicon-192.png" sizes="192x192">
<link rel="apple-touch-icon" href="/assets/logo.png">
<script src="/theme.js"></script>
<link rel="stylesheet" href="/fonts.css">
<link rel="stylesheet" href="/style.css">
<style>
.g{padding-bottom:72px}
.in{max-width:1040px;margin:0 auto;padding-inline:16px}
.g h1,.g h2,.g h3,.g h4{letter-spacing:normal}
.cover{position:relative;aspect-ratio:4/3;background:var(--panel);color:#fffaf2}
.cover img,.photo img,.more-grid img,.pl-in img{display:block;width:100%;height:100%;object-fit:cover}
.cover:after{content:"";position:absolute;inset:0;background:linear-gradient(to top,rgba(28,20,16,.85),rgba(28,20,16,0) 60%)}
.cover .txt{position:absolute;left:0;right:0;bottom:14px;z-index:1}
.eyebrow{font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,250,242,.85)}
.g h1.t{font-size:30px;line-height:1.08;margin:4px 0;color:#fffaf2;text-wrap:balance;overflow-wrap:anywhere}
.cover .meta{color:rgba(255,250,242,.85)}
.meta{font-size:13px;color:var(--muted)}
.lead{font-size:15px;margin-top:16px;white-space:pre-line}
.items,.ixg{list-style:none;margin:0;padding:0}
.item{display:grid;gap:10px;padding:22px 0;border-bottom:1px solid var(--line)}
.head{display:grid;grid-template-columns:auto minmax(0,1fr);gap:12px;align-items:baseline}
.num{font:700 34px/1 Fraunces,serif;color:var(--accent)}
.g h2.name{font-size:22px;line-height:1.15;overflow-wrap:anywhere}
.name a:hover{color:var(--accent)}
.photo{display:block;aspect-ratio:3/2;border-radius:14px;overflow:hidden;background:var(--panel)}
.item p{font-size:15px}
.ixg{display:grid;gap:14px;margin-top:18px}
.cov{position:relative;display:block;aspect-ratio:16/11;border-radius:18px;overflow:hidden;background:var(--panel);color:#fffaf2}
.cov img{display:block;width:100%;height:100%;object-fit:cover}
.cov:after{content:"";position:absolute;inset:0;background:linear-gradient(to top,rgba(28,20,16,.85),rgba(28,20,16,0) 62%)}
.cov .txt{position:absolute;left:14px;right:14px;bottom:12px;z-index:1}
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
.box h3,.more h3{font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);font-family:Poppins,sans-serif}
.box a.dir{color:var(--accent);font-weight:600}
.hours{display:grid;grid-template-columns:auto 1fr;gap:2px 16px;font-size:14px;font-variant-numeric:tabular-nums;margin:0}
.hours dt,.hours dd{margin:0}
.hours .today{font-weight:600}
.pl-in{display:grid;grid-template-columns:56px minmax(0,1fr);gap:12px;align-items:center}
.pl-in img{width:56px;height:56px;border-radius:12px}
.pl-in b{font-weight:600}
.wu{white-space:pre-line}
.more{margin-top:28px}
.more h3{margin-bottom:12px}
.more-grid{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.more-grid .ph{display:block;aspect-ratio:4/3;border-radius:12px;overflow:hidden;background:var(--panel)}
.more-grid b{display:block;font:600 14px/1.2 Fraunces,serif;margin-top:8px;overflow-wrap:anywhere}
.more-grid span.m{font-size:12.5px;color:var(--muted)}
.more-all{display:inline-block;margin-top:14px;font-weight:600;font-size:14px;color:var(--accent)}
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
<nav aria-label="Main navigation"><a class="nav-status" href="/#launch">Join the iPhone beta</a><button type="button" class="theme-toggle" aria-pressed="false" aria-label="Dark mode"></button><button type="button" class="burger" aria-label="Menu" aria-expanded="false" aria-controls="menu"><i></i><i></i><i></i></button></nav></header>
<div class="menu" id="menu"><ul class="menu-links"><li><a href="/guides">Guides</a></li><li><a href="/blog">Blog</a></li><li><a href="/#preview">How it works</a></li><li><a href="/about">About</a></li><li><a href="/contact">Contact</a></li></ul><div class="menu-side"><p>yummers is a social food diary for Cambodia: rate places, keep lists and share them with friends.</p><div class="menu-extras"></div></div></div>
<main id="main" class="g">
${body}
</main>
<footer class="footer site-footer wrap">
<div class="footer-brand"><a class="brand" href="/"><img class="footer-logo" src="/assets/logo-horizontal.svg" alt="yummers" width="188" height="50"></a></div>
<nav class="footer-links" aria-label="Footer"><a href="/guides">Guides</a><a href="/blog">Blog</a><a href="/about">About</a><a href="/privacy">Privacy policy</a><a href="/terms">Terms of service</a><a href="/contact">Contact us</a><a href="#cookies" role="button" data-cookie-settings>Cookie settings</a></nav>
<div class="footer-follow"><a href="https://www.instagram.com/yummersapp/" target="_blank" rel="noopener" aria-label="yummers on Instagram"><img src="/assets/social/instagram.svg" alt="" width="21" height="21"></a><a href="https://www.facebook.com/profile.php?id=61594898428255" target="_blank" rel="noopener" aria-label="yummers on Facebook"><img src="/assets/social/facebook.svg" alt="" width="21" height="21"></a><a href="https://www.linkedin.com/company/hungryraccoon/" target="_blank" rel="noopener" aria-label="yummers on LinkedIn"><img src="/assets/social/linkedin.svg" alt="" width="21" height="21"></a><a href="https://www.tiktok.com/@hungryraccoonapp" target="_blank" rel="noopener" aria-label="yummers on TikTok"><img src="/assets/social/tiktok.svg" alt="" width="21" height="21"></a></div><span class="footer-copy">© 2026 yummers</span>
</footer>
<script src="/analytics.js"></script>
</body>
</html>`;
}

const img = (url, w, h, eager) => (url ? `<img src="${esc(url)}" alt="" loading="${eager ? "eager" : "lazy"}" referrerpolicy="no-referrer" width="${w}" height="${h}">` : "");
// Display name and kind come from guide-places.js; a place missing there shows its database name and cuisine.
const nameOf = (it) => PLACES[it.d.id]?.name || it.restaurants.name;
const metaOf = (it) => [PLACES[it.d.id]?.kind || cuisineOf(it.restaurants), it.restaurants.district].filter(Boolean).join(" · ");
const guideCover = (g) => coverOf(g.items.find((i) => i.d.id === COVERS[g.slug]) || {}) || g.items.map(coverOf).find(Boolean);
const cover = (photo, eyebrow, title, meta) => `<div class="cover">${img(photo, 1040, 780, true)}<div class="txt"><div class="in"><div class="eyebrow">${esc(eyebrow)}</div><h1 class="t">${esc(title)}</h1><div class="meta">${esc(meta)}</div></div></div></div>`;

function guidePage(g) {
    const path = `/guides/${g.slug}`;
    const description = firstSentence(g.description) || `${g.title}, picked by the yummers team.`;
    const jsonld = JSON.stringify({
        "@context": "https://schema.org", "@type": "ItemList", name: g.title, description, url: SITE + path,
        itemListElement: g.items.map((it, i) => ({
            "@type": "ListItem", position: i + 1,
            item: { "@type": "Restaurant", name: nameOf(it), url: `${SITE}/places/${it.slug}`, ...(it.note && { description: it.note }) },
        })),
    });
    const items = g.items.map((it, i) => `<li class="item"><div class="head"><span class="num">${String(i + 1).padStart(2, "0")}</span><div><h2 class="name"><a href="/places/${it.slug}">${esc(nameOf(it))}</a></h2><div class="meta">${esc(metaOf(it))}</div></div></div><a class="photo" href="/places/${it.slug}" tabindex="-1" aria-hidden="true">${img(coverOf(it), 600, 400)}</a>${it.note ? `<p>${esc(it.note)}</p>` : ""}</li>`).join("");
    return layout(`${g.title} | yummers`, description, path, jsonld, `${cover(guideCover(g), "Guide · Phnom Penh", g.title, `${g.items.length} places · by the yummers team`)}
<div class="in">${g.description ? `<p class="lead">${esc(g.description)}</p>` : ""}<ol class="items">${items}</ol></div>`);
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
    const [mine, liked] = await Promise.all([
        rest(`user_restaurants?select=review&user_id=eq.${g.owner}&restaurant_id=eq.${id}&is_public=eq.true&sentiment=not.is.null&limit=1`).then((r) => r.json()),
        rest(`user_restaurants?select=id&restaurant_id=eq.${id}&sentiment=eq.liked&is_public=eq.true`, { method: "HEAD", headers: { Prefer: "count=exact" } }),
    ]);
    return { review: (mine[0]?.review || "").trim(), liked: Number(liked.headers.get("content-range")?.split("/")[1]) || 0 };
}

async function placePage(slug, all) {
    const g = all.find((x) => x.items.some((it) => it.slug === slug));
    if (!g) return null;
    const it = g.items.find((x) => x.slug === slug), r = it.restaurants, d = it.d, name = nameOf(it);
    const { review, liked } = d.id ? await placeFacts(g, d.id) : { review: "", liked: 0 };
    const path = `/places/${slug}`, cuisine = cuisineOf(r), fact = PLACES[d.id] || {};
    const description = firstSentence(review) || `${name}, ${cuisine ? `${cuisine.toLowerCase()} in ` : "in "}${r.district ? `${r.district}, ` : ""}Phnom Penh, picked by the yummers team for ${g.title}.`;
    const inGuides = all.filter((x) => x.items.some((i) => i.slug === slug));
    const hours = (d.opening_hours?.weekday_text || []).map((l) => l.split(/: (.*)/s)).filter((p) => p[1]);
    const today = new Date().toLocaleDateString("en-US", { weekday: "long", timeZone: "Asia/Phnom_Penh" });
    const where = d.latitude != null && d.longitude != null ? `${d.latitude},${d.longitude}` : `${name} Phnom Penh`;
    const jsonld = JSON.stringify({
        "@context": "https://schema.org", "@type": "Restaurant", name, url: SITE + path, description,
        ...(cuisine && { servesCuisine: cuisine }),
        address: { "@type": "PostalAddress", ...(d.address && { streetAddress: d.address }), addressLocality: "Phnom Penh", addressCountry: "KH" },
        ...(d.latitude != null && { geo: { "@type": "GeoCoordinates", latitude: d.latitude, longitude: d.longitude } }),
    });
    const chips = [fact.kind, fact.price && `About ${fact.price} a person`, fact.when, liked && `${liked} ${liked === 1 ? "person" : "people"} liked it on yummers`].filter(Boolean);
    const at = g.items.indexOf(it), more = [1, 2, 3].map((n) => g.items[(at + n) % g.items.length]).filter((x) => x !== it);
    const body = `${cover(coverOf(it), metaOf(it), name, `In ${g.title}`)}
<div class="in"><div class="pl">
${it.note ? `<p class="lede">${esc(it.note)}</p>` : ""}
${chips.length ? `<div class="glance">${chips.map((c) => `<span>${esc(c)}</span>`).join("")}</div>` : ""}
${review ? `<section class="box"><h3>From the yummers team</h3><p class="wu">${esc(review)}</p></section>` : ""}
<div class="facts"><section class="box"><h3>Find it</h3>${d.address ? `<div>${esc(d.address)}</div>` : ""}<a class="dir" href="https://www.google.com/maps/search/?api=1&amp;query=${encodeURIComponent(where)}" rel="noopener">Directions</a></section>
${hours.length ? `<section class="box"><h3>Opening hours</h3><dl class="hours">${hours.map(([day, h]) => { const c = day === today ? ' class="today"' : ""; return `<dt${c}>${esc(day)}</dt><dd${c}>${esc(h)}</dd>`; }).join("")}</dl></section>` : ""}
<section class="box"><h3>In these guides</h3>${inGuides.map((x) => `<a class="pl-in" href="/guides/${x.slug}">${img(guideCover(x), 112, 112)}<div><b>${esc(x.title)}</b><div class="meta">${x.items.length} places</div></div></a>`).join("")}</section></div>
<section class="more"><h3>More in ${esc(g.title)}</h3><ul class="more-grid">${more.map((x) => `<li><a href="/places/${x.slug}"><span class="ph">${img(coverOf(x), 400, 300)}</span><b>${esc(nameOf(x))}</b><span class="m">${esc(metaOf(x))}</span></a></li>`).join("")}</ul><a class="more-all" href="/guides/${g.slug}">See all ${g.items.length} places →</a></section>
</div></div>`;
    return layout(`${name}${r.district ? `, ${r.district}` : ""} | yummers`, description, path, jsonld, body);
}

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
        return new Response("Guides are unavailable right now. Try again in a minute.", { status: 503, headers: { "Retry-After": "60" } });
    }
}

export async function guides(url, ctx) {
    const path = url.pathname.replace(/\/$/, "");
    const key = new Request(url.origin + path);
    const hit = await caches.default.match(key);
    if (hit) return hit;
    const res = await render(path);
    if (res?.ok) ctx.waitUntil(caches.default.put(key, res.clone()));
    return res;
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
