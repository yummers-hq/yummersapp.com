// The association file and the code page (yummers#139, #331).
// Usage: node cloudflare/app-links.test.mjs
import assert from "node:assert/strict";
import worker from "./worker.js";

globalThis.fetch = async () => new Response("page", { status: 404 });
const get = (path, ua = "") => worker.fetch(new Request(`https://yummersapp.com${path}`, { headers: { "User-Agent": ua } }), {}, {});

const aasa = await get("/.well-known/apple-app-site-association");
assert.equal(aasa.status, 200);
assert.equal(aasa.headers.get("Content-Type"), "application/json");
const { details } = (await aasa.json()).applinks;
assert.deepEqual(details[0].appIDs, ["A7M335434R.com.hungryraccoonapp.app"]);
assert.deepEqual(details[0].components.map((c) => c["/"]), ["/l/*", "/p/*", "/in"]);

const iphone = await (await get("/in?c=12345678", "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)")).text();
assert.match(iphone, />12345678</);
assert.match(iphone, /href="hungryraccoon:\/\/in\?c=12345678"/);
const other = await (await get("/in?c=12345678", "Mozilla/5.0 (Macintosh)")).text();
assert.match(other, />12345678</);
assert.doesNotMatch(other, /hungryraccoon:/);
for (const path of ["/in", "/in?c=1234567", "/in?c=123456789", "/in?c=abcdefgh", "/in?c=1234567%22%3E"]) {
    const html = await (await get(path, "iPhone")).text();
    assert.match(html, /doesn't have a code/, path);
    assert.doesNotMatch(html, /hungryraccoon:/, path);
}
console.log("app-links: ok");
