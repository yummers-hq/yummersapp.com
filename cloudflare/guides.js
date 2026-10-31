// Guide pages (D92, yummers#441): the team's public lists as pages Google can read.
// Built on request from beta through the public anon key and shared_list(), which
// returns a list only if it is public and not hidden. Cached for an hour.
const SUPABASE = "https://uobskavqhilnqakbdutt.supabase.co";
const ANON = "sb_publishable_lHMGFti9a7-RxGHVj2Iz-g_wXFZoMC7";
const SITE = "https://yummersapp.com";
// Only lists owned by this account are ever published, even if a share id is added by mistake.
const TEAM = "yummers";
// One line per guide: slug -> the list's share id (yummers#444).
export const GUIDES = {};

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// null when the guide is missing, private, empty or not the team's; throws when beta is unreachable.
async function load(slug) {
    const res = await fetch(`${SUPABASE}/rest/v1/rpc/shared_list`, {
        method: "POST",
        headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" },
        body: JSON.stringify({ p_share_id: GUIDES[slug] }),
    });
    if (!res.ok) throw new Error(String(res.status));
    const list = await res.json();
    if (!list || list.profiles?.username !== TEAM || !list.list_restaurants?.length) return null;
    return list;
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
<link rel="icon" href="/assets/favicon-192.png" sizes="192x192">
<link rel="stylesheet" href="/fonts.css">
<link rel="stylesheet" href="/style.css">
<style>
.guide{max-width:760px;padding-top:56px;padding-bottom:72px}
.guide h1{font-size:clamp(36px,6vw,56px)}
.guide .by{color:var(--muted);font-size:15px;margin-top:10px}
.guide .intro{font-size:18px;line-height:1.6;margin-top:16px;max-width:60ch;white-space:pre-line}
.guide ol,.guide ul{list-style:none;margin:32px 0 0;padding:0;border-top:1px solid var(--line)}
.guide li{display:flex;gap:16px;padding:18px 0;border-bottom:1px solid var(--line)}
.guide .n{font-family:Fraunces,serif;font-weight:700;font-size:22px;color:var(--accent);min-width:28px}
.guide .name{font-weight:600;font-size:17px}
.guide .meta{color:var(--muted);font-size:14px;margin-top:2px}
.guide .note{font-family:Fraunces,serif;color:var(--accent);margin-top:6px}
.guide .more{margin-top:40px;font-weight:600}
</style>
<script type="application/ld+json">${jsonld.replace(/</g, "\\u003c")}</script>
</head>
<body><a class="skip" href="#main">Skip to content</a>
<header class="header wrap"><a href="/" class="brand" aria-label="yummers home"><img class="brand-image" src="/assets/raccoon.png" alt="" width="58" height="32"><span class="brand-name">yummers</span></a>
<nav aria-label="Main navigation"><a href="/guides">Guides</a><a class="nav-status" href="/#launch">Join the iPhone beta</a></nav></header>
<main id="main" class="wrap guide">
${body}
</main>
<footer class="footer site-footer wrap">
<div class="footer-brand"><a class="brand" href="/"><img class="footer-logo" src="/assets/logo-horizontal.svg" alt="yummers" width="188" height="50"></a></div>
<nav class="footer-links" aria-label="Footer"><a href="/guides">Guides</a><a href="/about">About</a><a href="/privacy">Privacy policy</a><a href="/terms">Terms of service</a><a href="/contact">Contact us</a></nav>
<span class="footer-copy">© 2026 yummers</span>
</footer>
<script src="/analytics.js"></script>
</body>
</html>`;
}

function guidePage(slug, list) {
    const path = `/guides/${slug}`;
    const items = list.list_restaurants;
    const intro = list.description || "";
    const description = (intro.split(/(?<=[.!?])\s/)[0] || `${list.title}, picked by the yummers team.`).slice(0, 300);
    const jsonld = JSON.stringify({
        "@context": "https://schema.org", "@type": "ItemList", name: list.title, description, url: SITE + path,
        itemListElement: items.map((it, i) => ({
            "@type": "ListItem", position: i + 1,
            item: { "@type": "Restaurant", name: it.restaurants.name, ...(it.note && { description: it.note }) },
        })),
    });
    const rows = items.map((it, i) => {
        const r = it.restaurants, cuisine = (r.cuisine_type || []).find((c) => c !== "International") || (r.cuisine_type || [])[0];
        return `<li><span class="n">${i + 1}</span><div><div class="name">${esc(r.name)}</div><div class="meta">${esc([cuisine, r.district].filter(Boolean).join(" · "))}</div>${it.note ? `<div class="note">“${esc(it.note)}”</div>` : ""}</div></li>`;
    }).join("");
    const body = `<p class="by"><a href="/guides">Guides</a> / Phnom Penh</p>
<h1>${esc(list.title)}</h1>
<p class="by">${items.length} places · By the yummers team</p>
${intro ? `<p class="intro">${esc(intro)}</p>` : ""}
<ol>${rows}</ol>
<p class="more"><a href="/l/${esc(list.share_id)}">Open this list in yummers</a></p>`;
    return layout(`${list.title} | yummers`, description, path, jsonld, body);
}

function indexPage(found) {
    const description = "Lists of where to eat in Phnom Penh, made by the yummers team.";
    const jsonld = JSON.stringify({
        "@context": "https://schema.org", "@type": "CollectionPage", name: "Where to eat in Phnom Penh", description, url: `${SITE}/guides`,
    });
    const rows = found.map(([slug, l]) => `<li><div><div class="name"><a href="/guides/${slug}">${esc(l.title)}</a></div><div class="meta">${l.list_restaurants.length} places</div></div></li>`).join("");
    return layout("Where to eat in Phnom Penh | yummers", description, "/guides", jsonld,
        `<h1>Where to eat in Phnom Penh</h1>\n<p class="intro">${esc(description)}</p>\n<ul>${rows}</ul>`);
}

const html = (body) => new Response(body, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=3600" } });

// A Response for a guide address, or null to let the site answer (its 404 page).
// Beta being down is a 503, never a 404, so Google keeps the page.
async function render(pathname) {
    try {
        if (pathname === "/guides") {
            const found = (await Promise.all(Object.keys(GUIDES).map(async (s) => [s, await load(s)]))).filter(([, l]) => l);
            return found.length ? html(indexPage(found)) : null;
        }
        const slug = pathname.slice("/guides/".length);
        if (!Object.hasOwn(GUIDES, slug)) return null;
        const list = await load(slug);
        return list ? html(guidePage(slug, list)) : null;
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

// The static sitemap plus every guide that is live, so adding a guide is one line.
export async function sitemap(res) {
    if (!res.ok) return res;
    const live = (await Promise.all(Object.keys(GUIDES).map(async (s) => (await load(s).catch(() => null)) && s))).filter(Boolean);
    if (!live.length) return res;
    const urls = ["/guides", ...live.map((s) => `/guides/${s}`)].map((p) => `  <url>\n    <loc>${SITE}${p}</loc>\n  </url>\n`).join("");
    return new Response((await res.text()).replace("</urlset>", `${urls}</urlset>`), res);
}
