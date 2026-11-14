// Checks what AI agents look for on the site: llms.txt, the About and Contact
// pages, the homepage's Organization data and the sitemap, plus the Worker's
// security headers.
// Usage: node check.mjs [base URL]   (default: the live site)
const base = (process.argv[2] || "https://yummersapp.com").replace(/\/$/, "");
let failed = 0;

function check(name, ok) {
    console.log(`${ok ? "ok  " : "FAIL"} ${name}`);
    if (!ok) failed++;
}

async function get(path, accept = "text/html") {
    const res = await fetch(base + path, { headers: { Accept: accept } });
    return { status: res.status, type: res.headers.get("content-type") || "", vary: res.headers.get("vary") || "", body: await res.text() };
}

const text = (html) => html.replace(/<(script|style)[\s\S]*?<\/\1>|<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

const llms = await get("/llms.txt");
check("llms.txt is served as text", llms.status === 200 && llms.type.startsWith("text/plain"));
check("llms.txt has an H1, a summary and a When to use section",
    /^# \S/.test(llms.body) && /^> \S/m.test(llms.body) && /^## When to use$/m.test(llms.body));

for (const page of ["/about", "/contact", "/privacy"]) {
    const { status, body } = await get(page);
    check(`${page} has 500+ characters of text`, status === 200 && text(body.split("<main")[1] || "").length >= 500);
}

// Search engines read the FAQ data; it must say exactly what the page shows.
const about = (await get("/about")).body;
const faqData = JSON.parse(about.match(/application\/ld\+json">([\s\S]*?)<\/script>/)[1]).mainEntity
    .map((q) => [q.name, q.acceptedAnswer.text]);
const faqShown = [...about.split('id="faq"')[1].split("<h2")[0].matchAll(/<h3>([\s\S]*?)<\/h3>\s*<p>([\s\S]*?)<\/p>/g)]
    .map(([, q, a]) => [text(q), text(a)]);
check("About's FAQ data matches the questions on the page",
    faqData.length > 0 && JSON.stringify(faqData) === JSON.stringify(faqShown));

const home = await get("/");
const graph = JSON.parse(home.body.match(/application\/ld\+json">([\s\S]*?)<\/script>/)[1])["@graph"];
const org = graph.find((x) => x["@type"] === "Organization");
check("Organization has a description", !!org?.description);
check("Organization has a contactPoint with an email and contactType",
    !!(org?.contactPoint?.email && org.contactPoint.contactType));

const sitemap = await get("/sitemap.xml");
const urls = [...sitemap.body.matchAll(/<loc>https:\/\/yummersapp\.com(\/[^<]*)<\/loc>/g)].map((m) => m[1]);
check("sitemap lists the About and Contact pages", urls.includes("/about") && urls.includes("/contact"));
for (const path of urls) check(`sitemap URL ${path} responds 200`, (await get(path)).status === 200);

const footer = home.body.match(/<nav class="footer-links"[\s\S]*?<\/nav>/)[0];
for (const [, href] of footer.matchAll(/href="([^"]+)"/g)) {
    check(`footer link ${href} responds 200`, (await get("/" + href.replace(/^\//, ""))).status === 200);
}

const missing = await get("/no-such-page");
check("an unknown path still returns 404", missing.status === 404);

// Served by the Cloudflare Worker (cloudflare/worker.js), not GitHub Pages.
const mdHome = await get("/", "text/markdown");
check("homepage returns Markdown with Vary: Accept when asked",
    mdHome.status === 200 && mdHome.type.startsWith("text/markdown") && /\baccept\b/i.test(mdHome.vary) && mdHome.body.startsWith("# "));
check("homepage still returns HTML to browsers", home.type.startsWith("text/html"));
const md404 = await get("/no-such-page", "text/markdown");
check("unknown path returns a Markdown 404 linking to llms.txt",
    md404.status === 404 && md404.type.startsWith("text/markdown") && md404.body.includes("/llms.txt"));
const badSignup = await fetch(`${base}/api/signup`, { method: "POST", body: new URLSearchParams({ email: "not-an-email", list: "android" }) });
check("the Android sign-up refuses a bad email", badSignup.status === 400);

// The Worker's security headers (#48), on a page, a share link and an API answer.
for (const res of [await fetch(base + "/"), await fetch(base + "/l/abcdefgh/x"), badSignup]) {
    const h = (name) => res.headers.get(name) || "";
    check(`${new URL(res.url).pathname} sends the security headers`,
        h("content-security-policy").includes("frame-ancestors 'none'") && h("strict-transport-security").includes("max-age=")
        && h("x-content-type-options") === "nosniff" && h("referrer-policy") && h("x-frame-options") === "DENY");
}

process.exit(failed ? 1 : 0);
