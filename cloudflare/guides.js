// Guide pages (D92, yummers#441) and the restaurant pages for their places (D103, yummersapp.com#81):
// the team's public lists as pages Google can read. Built on request from beta through the public
// anon key (RLS and shared_list() decide what is public) and cached for an hour.
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
.g{max-width:640px;padding-top:56px;padding-bottom:72px}
.g h1{font-size:clamp(28px,6vw,44px);overflow-wrap:anywhere}
.g .by{color:var(--muted);font-size:15px;margin-top:10px}
.g .by a{text-decoration:underline;text-underline-offset:3px}
.g .desc{font-size:18px;line-height:1.6;margin-top:16px;max-width:60ch;white-space:pre-line}
.g h2{font-size:22px}
.cards{list-style:none;margin:28px 0 0;padding:0;display:grid;gap:12px}
.card,.panel{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:16px}
.card{display:flex;gap:14px;align-items:flex-start}
.card>div{flex:1;min-width:0}
.n{font-family:Fraunces,serif;font-weight:700;font-size:22px;color:var(--accent);min-width:24px}
.name{font-weight:600;font-size:17px;overflow-wrap:anywhere}
a.name:hover{color:var(--accent)}
.meta{color:var(--muted);font-size:14px;margin-top:2px}
.note{font-family:Fraunces,serif;color:var(--accent);margin-top:6px}
.thumb{flex:none;width:56px;height:56px;border-radius:12px;background:var(--panel);overflow:hidden}
.thumb img,.pic img{display:block;width:100%;height:100%;object-fit:cover}
.pic{aspect-ratio:16/9;border-radius:16px;background:var(--panel);overflow:hidden;margin-top:20px}
.panel{margin-top:16px}
.panel p{margin-top:8px}
.wu{white-space:pre-line;font-size:17px}
.hrs div{display:flex;justify-content:space-between;gap:16px;padding:6px 0;border-bottom:1px solid var(--line);font-size:15px}
.hrs div:last-child{border:0}
.hrs dt{color:var(--muted)}
.hrs dd{margin:0;text-align:right}
.dir{display:inline-block;margin-top:10px;font-weight:600;color:var(--accent);text-decoration:underline;text-underline-offset:3px}
.panel ul{margin:8px 0 0;padding-left:20px}
.panel li a{text-decoration:underline;text-underline-offset:3px}
</style>
<script type="application/ld+json">${jsonld.replace(/</g, "\\u003c")}</script>
</head>
<body><a class="skip" href="#main">Skip to content</a>
<header class="header wrap"><a href="/" class="brand" aria-label="yummers home"><img class="brand-image" src="/assets/raccoon.png" alt="" width="58" height="32"><span class="brand-name">yummers<span class="brand-tag"> | Restaurant Lists App</span></span></a>
<nav aria-label="Main navigation"><a href="/guides">Guides</a><a href="/blog">Blog</a><a href="/#preview">How it works</a><a class="nav-status" href="/#launch">Join the iPhone beta</a><button type="button" class="theme-toggle" aria-pressed="false" aria-label="Dark mode" data-i18n-aria="themeLabel"></button></nav></header>
<main id="main" class="g wrap">
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

const img = (url, w = 112, h = 112) => (url ? `<img src="${esc(url)}" alt="" loading="lazy" referrerpolicy="no-referrer" width="${w}" height="${h}">` : "");

function guidePage(g) {
    const path = `/guides/${g.slug}`;
    const description = firstSentence(g.description) || `${g.title}, picked by the yummers team.`;
    const jsonld = JSON.stringify({
        "@context": "https://schema.org", "@type": "ItemList", name: g.title, description, url: SITE + path,
        itemListElement: g.items.map((it, i) => ({
            "@type": "ListItem", position: i + 1,
            item: { "@type": "Restaurant", name: it.restaurants.name, url: `${SITE}/places/${it.slug}`, ...(it.note && { description: it.note }) },
        })),
    });
    const cards = g.items.map((it, i) => {
        const r = it.restaurants;
        return `<li class="card"><span class="n">${i + 1}</span><div><a class="name" href="/places/${it.slug}">${esc(r.name)}</a><div class="meta">${esc([cuisineOf(r), r.district].filter(Boolean).join(" · "))}</div>${it.note ? `<div class="note">“${esc(it.note)}”</div>` : ""}</div><span class="thumb">${img(coverOf(it))}</span></li>`;
    }).join("");
    return layout(`${g.title} | yummers`, description, path, jsonld, `<p class="by"><a href="/guides">Guides</a><a href="/blog">Blog</a> / Phnom Penh</p>
<h1>${esc(g.title)}</h1>
<p class="by">${g.items.length} places · By the yummers team</p>
${g.description ? `<p class="desc">${esc(g.description)}</p>` : ""}
<ol class="cards">${cards}</ol>`);
}

function indexPage(found) {
    const description = "Lists of where to eat in Phnom Penh, made by the yummers team.";
    const jsonld = JSON.stringify({ "@context": "https://schema.org", "@type": "CollectionPage", name: "Where to eat in Phnom Penh", description, url: `${SITE}/guides` });
    const cards = found.map((g) => `<li class="card"><div><a class="name" href="/guides/${g.slug}">${esc(g.title)}</a><div class="meta">${g.items.length} places</div></div><span class="thumb">${img(coverOf(g.items[0]))}</span></li>`).join("");
    return layout("Where to eat in Phnom Penh | yummers", description, "/guides", jsonld,
        `<h1>Where to eat in Phnom Penh</h1>\n<p class="desc">${esc(description)}</p>\n<ul class="cards">${cards}</ul>`);
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
    const it = g.items.find((x) => x.slug === slug), r = it.restaurants, d = it.d;
    const { review, liked } = d.id ? await placeFacts(g, d.id) : { review: "", liked: 0 };
    const path = `/places/${slug}`, cuisine = cuisineOf(r);
    const description = firstSentence(review) || `${r.name}, ${cuisine ? `${cuisine.toLowerCase()} in ` : "in "}${r.district ? `${r.district}, ` : ""}Phnom Penh, picked by the yummers team for ${g.title}.`;
    const inGuides = all.filter((x) => x.items.some((i) => i.slug === slug));
    const hours = (d.opening_hours?.weekday_text || []).map((l) => l.split(/: (.*)/s)).filter((p) => p[1]);
    const where = d.latitude != null && d.longitude != null ? `${d.latitude},${d.longitude}` : `${r.name} Phnom Penh`;
    const jsonld = JSON.stringify({
        "@context": "https://schema.org", "@type": "Restaurant", name: r.name, url: SITE + path, description,
        ...(cuisine && { servesCuisine: cuisine }),
        address: { "@type": "PostalAddress", ...(d.address && { streetAddress: d.address }), addressLocality: "Phnom Penh", addressCountry: "KH" },
        ...(d.latitude != null && { geo: { "@type": "GeoCoordinates", latitude: d.latitude, longitude: d.longitude } }),
    });
    const body = `<p class="by"><a href="/guides">Guides</a><a href="/blog">Blog</a> / <a href="/guides/${g.slug}">${esc(g.title)}</a></p>
<h1>${esc(r.name)}</h1>
<p class="by">${esc([cuisine, r.district].filter(Boolean).join(" · "))}</p>
${coverOf(it) ? `<div class="pic">${img(coverOf(it), 800, 450)}</div>` : ""}
${liked ? `<p class="by">${liked} ${liked === 1 ? "person" : "people"} liked it on yummers</p>` : ""}
${review ? `<section class="panel"><h2>From the yummers team</h2><p class="wu">${esc(review)}</p></section>` : ""}
${it.note ? `<p class="note">“${esc(it.note)}”</p>` : ""}
<section class="panel"><h2>Find it</h2>${d.address ? `<p>${esc(d.address)}</p>` : ""}<a class="dir" href="https://www.google.com/maps/search/?api=1&amp;query=${encodeURIComponent(where)}" rel="noopener">Directions</a></section>
${hours.length ? `<section class="panel"><h2>Opening hours</h2><dl class="hrs">${hours.map(([day, h]) => `<div><dt>${esc(day)}</dt><dd>${esc(h)}</dd></div>`).join("")}</dl></section>` : ""}
<section class="panel"><h2>In our guides</h2><ul>${inGuides.map((x) => `<li><a href="/guides/${x.slug}">${esc(x.title)}</a></li>`).join("")}</ul></section>`;
    return layout(`${r.name}${r.district ? `, ${r.district}` : ""} | yummers`, description, path, jsonld, body);
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
