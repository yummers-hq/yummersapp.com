// Builds the blog (#135): blog/*.md -> blog.html (the list) and blog/{slug}.html (one post), and
// refreshes the sitemap's blog entries and the homepage's "From the blog" block.
// Run `node build-blog.mjs` after adding or editing a post and commit the output; Pages has no build step.
// Posts use only ## headings, paragraphs, - and 1. lists, **bold**, *italic* and [text](/path) links.
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import assert from "node:assert/strict";

const SITE = "https://yummersapp.com";
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Escape first, so nothing in a post can become markup except what this converter writes.
const inline = (s) => esc(s)
    .replace(/\[([^\]]+)\]\((\/[^)\s]*)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");

export function markdown(src) {
    return src.trim().split(/\n{2,}/).map((block) => {
        const lines = block.split("\n");
        if (/^## /.test(block)) return `<h2>${inline(block.slice(3))}</h2>`;
        if (lines.every((l) => /^- /.test(l))) return `<ul>${lines.map((l) => `<li>${inline(l.slice(2))}</li>`).join("")}</ul>`;
        if (lines.every((l) => /^\d+\. /.test(l))) return `<ol>${lines.map((l) => `<li>${inline(l.replace(/^\d+\. /, ""))}</li>`).join("")}</ol>`;
        return `<p>${inline(lines.join(" "))}</p>`;
    }).join("\n");
}

assert.equal(markdown("## A & B\n\nHi **x** and *y* [z](/a?b=1&c=2) <b>\n\n- one\n- two\n\n1. a\n2. b"),
    '<h2>A &amp; B</h2>\n<p>Hi <strong>x</strong> and <em>y</em> <a href="/a?b=1&amp;c=2">z</a> &lt;b&gt;</p>\n<ul><li>one</li><li>two</li></ul>\n<ol><li>a</li><li>b</li></ol>');

// Front matter is `key: value` lines between two `---`; values may be quoted.
function parse(file) {
    const m = readFileSync(`blog/${file}`, "utf8").match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    assert(m, `${file}: no front matter`);
    const post = Object.fromEntries(m[1].split("\n").map((l) => l.match(/^(\w+): "?(.*?)"?$/).slice(1)));
    for (const k of ["title", "slug", "date", "description", "author"]) assert(post[k], `${file}: missing ${k}`);
    assert.equal(post.slug + ".md", file, `${file}: slug must match the file name`);
    return { ...post, body: markdown(m[2]) };
}

// Newest first. Posts on one day differ in the time of their `date`, which decides their order.
const posts = readdirSync("blog").filter((f) => f.endsWith(".md")).map(parse).sort((a, b) => b.date.localeCompare(a.date));
const day = (p) => new Date(p.date.slice(0, 10) + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

const NAV = `<nav aria-label="Main navigation"><a href="/guides">Guides</a><a href="/blog">Blog</a><a href="/#preview">How it works</a><a class="nav-status" href="/#launch">Join the iPhone beta</a><button type="button" class="theme-toggle" aria-pressed="false" aria-label="Dark mode" data-i18n-aria="themeLabel"></button></nav>`;
const FOOTER = readFileSync("contact.html", "utf8").match(/<footer[\s\S]*?<\/footer>/)[0].replace(/\n\s*/g, " ");

function page({ title, description, path, type, jsonld, main }) {
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${SITE}${path}">
<meta name="theme-color" content="#b8401e">
<meta property="og:type" content="${type}">
<meta property="og:site_name" content="yummers">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${SITE}${path}">
<meta property="og:image" content="${SITE}/assets/share.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${SITE}/assets/share.jpg">
<link rel="icon" href="/assets/favicon-192.png" sizes="192x192">
<link rel="apple-touch-icon" href="/assets/logo.png">
<script src="/theme.js"></script>
<link rel="stylesheet" href="/fonts.css">
<link rel="stylesheet" href="/style.css">
<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, "\\u003c")}</script>
</head>
<body><a class="skip" href="#main">Skip to content</a>
<header class="header wrap"><a href="/" class="brand" aria-label="yummers home"><img class="brand-image" src="/assets/raccoon.png" alt="" width="58" height="32"><span class="brand-name">yummers</span></a>
${NAV}</header>
<main id="main" class="blog wrap">
${main}
</main>
${FOOTER}
<script src="/analytics.js"></script>
</body>
</html>
`;
}

const listItems = (ps) => ps.map((p) => `<li><a class="post-link" href="/blog/${p.slug}"><span class="post-date">${day(p)}</span><span class="post-title">${esc(p.title)}</span><span class="post-desc">${esc(p.description)}</span></a></li>`).join("\n");

const indexDesc = "Where to eat in Phnom Penh, what to order, and how to eat like a local. From the yummers team.";
writeFileSync("blog.html", page({
    title: "Blog | yummers", description: indexDesc, path: "/blog", type: "website",
    jsonld: { "@context": "https://schema.org", "@type": "Blog", name: "yummers blog", description: indexDesc, url: `${SITE}/blog` },
    main: `<h1>Blog</h1>\n<p class="blog-intro">${esc(indexDesc)}</p>\n<ul class="posts">\n${listItems(posts)}\n</ul>`,
}));

for (const p of posts) {
    writeFileSync(`blog/${p.slug}.html`, page({
        title: `${p.title} | yummers`, description: p.description, path: `/blog/${p.slug}`, type: "article",
        jsonld: {
            "@context": "https://schema.org", "@type": "Article", headline: p.title, description: p.description,
            datePublished: p.date, author: { "@type": "Organization", name: p.author },
            publisher: { "@type": "Organization", name: "yummers", logo: { "@type": "ImageObject", url: `${SITE}/assets/logo.png` } },
            image: `${SITE}/assets/share.jpg`, mainEntityOfPage: `${SITE}/blog/${p.slug}`,
        },
        main: `<article>\n<p class="crumbs"><a href="/blog">Blog</a></p>\n<h1>${esc(p.title)}</h1>\n<p class="post-meta">${day(p)} · By ${esc(p.author)}</p>\n<div class="prose">\n${p.body}\n</div>\n</article>`,
    }));
}

// Replace what sits between a pair of marker comments.
const between = (file, name, inner) => {
    const re = new RegExp(`(<!-- ${name} -->)[\\s\\S]*?(<!-- /${name} -->)`);
    const src = readFileSync(file, "utf8");
    assert(re.test(src), `${file}: no ${name} markers`);
    writeFileSync(file, src.replace(re, (_, a, b) => `${a}\n${inner}\n${b}`));
};
between("sitemap.xml", "blog", ["/blog", ...posts.map((p) => `/blog/${p.slug}`)].map((u, i) =>
    `  <url>\n    <loc>${SITE}${u}</loc>\n    <lastmod>${(i ? posts[i - 1] : posts[0]).date.slice(0, 10)}</lastmod>\n  </url>`).join("\n"));
between("index.html", "blog-latest", `            <ul class="posts">\n${listItems(posts.slice(0, 3))}\n            </ul>`);
console.log(`built ${posts.length} posts`);
