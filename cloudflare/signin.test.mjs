// The sign-in redirect only ever goes to our two Supabase projects.
// Usage: node cloudflare/signin.test.mjs
import assert from "node:assert/strict";
import worker from "./worker.js";

globalThis.fetch = async () => new Response("page", { status: 404 });
const get = (path) => worker.fetch(new Request(`https://yummersapp.com${path}`), {}, {});

const ok = await get("/signin/uobskavqhilnqakbdutt?provider=google&code_challenge=x");
assert.equal(ok.status, 302);
assert.equal(ok.headers.get("Location"), "https://uobskavqhilnqakbdutt.supabase.co/auth/v1/authorize?provider=google&code_challenge=x");
for (const path of ["/signin/gnmzwzmtdblkujyuvadi?provider=google", "/signin/evil.com", "/signin/mbuxxkchudopmpihrakk/x"]) {
    assert.equal((await get(path)).status, 404, path);
}
console.log("signin: ok");
