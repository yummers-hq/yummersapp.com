// Runs the beta sign-up through the Worker with Turnstile, Resend and KV faked,
// so nothing is sent. Usage: node cloudflare/signup.test.mjs
import assert from "node:assert/strict";
import worker from "./worker.js";

const kv = new Map();
const env = {
    TURNSTILE_SECRET: "x", RESEND_API_KEY: "x", SEGMENT_ID: "seg",
    SIGNUPS: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => kv.set(k, v) },
};
const emails = [], contacts = new Map(), deleted = [];
let hostname = "yummersapp.com";
globalThis.fetch = async (url, init) => {
    url = String(url);
    if (url.includes("turnstile")) return Response.json({ success: true, hostname });
    const body = init.body && JSON.parse(init.body);
    if (url.endsWith("/emails")) { emails.push(body); return Response.json({ id: "e" }); }
    // Like Resend, creating an existing contact answers OK with the same id.
    if (url.endsWith("/contacts")) {
        if (!contacts.has(body.email)) contacts.set(body.email, crypto.randomUUID());
        return Response.json({ id: contacts.get(body.email) });
    }
    if (init.method === "GET") {
        const id = contacts.get(decodeURIComponent(url.split("/").pop()));
        return id ? Response.json({ id }) : new Response(null, { status: 404 });
    }
    if (url.includes("/segments/")) return new Response(null, { status: 200 });
    if (init.method === "DELETE") { deleted.push(url.split("/").pop()); return new Response(null, { status: 200 }); }
    throw new Error(`unexpected fetch ${url}`);
};

const waits = [];
const ctx = { waitUntil: (p) => waits.push(p) };
const call = (method, path, form) => worker.fetch(new Request(`https://yummersapp.com${path}`, { method, body: form }), env, ctx);
const signupForm = (email) => {
    const f = new FormData();
    f.set("email", email); f.set("cf-turnstile-response", "t"); f.set("lang", "fr");
    return f;
};

// Signing up emails a confirm link and saves nothing.
assert.equal((await call("POST", "/api/signup", signupForm("Sophea@Example.com"))).status, 204);
assert.equal(emails.length, 1);
assert.equal(emails[0].to, "sophea@example.com");
assert.equal(emails[0].subject, "Confirmez votre e-mail pour la bêta yummers");
const link = emails[0].text.match(/https:\/\/yummersapp\.com\/api\/confirm\?\S+/)[0];
assert.equal(contacts.size, 0);

// Signing up again the same day sends nothing more, and says the same.
assert.equal((await call("POST", "/api/signup", signupForm("sophea@example.com"))).status, 204);
assert.equal(emails.length, 1);

// Opening the link only asks.
const ask = await call("GET", link.replace("https://yummersapp.com", ""));
assert.match(await ask.text(), /<form method="post">.*Confirmer mon e-mail/s);
assert.equal(contacts.size, 0);

// Pressing the button joins the list and sends the welcome note with its unsubscribe link.
const joined = await call("POST", link.replace("https://yummersapp.com", ""));
assert.match(await joined.text(), /vous êtes sur la liste/);
await Promise.all(waits);
assert.ok(contacts.has("sophea@example.com"));
assert.equal(emails.length, 2);
assert.equal(emails[1].subject, "Merci d'avoir rejoint la bêta yummers");
const unsub = emails[1].text.match(/https:\/\/yummersapp\.com(\/api\/unsubscribe\?\S+)/)[1];
assert.equal(unsub, `/api/unsubscribe?id=${contacts.get("sophea@example.com")}&lang=fr`);

// Pressing it again doesn't send another welcome note.
assert.equal((await call("POST", link.replace("https://yummersapp.com", ""))).status, 200);
await Promise.all(waits);
assert.equal(emails.length, 2);

// The welcome note's unsubscribe link asks first, then deletes the contact.
assert.match(await (await call("GET", unsub)).text(), /<form method="post">.*Me retirer de la liste/s);
assert.equal(deleted.length, 0);
assert.match(await (await call("POST", unsub)).text(), /vous n'êtes plus sur la liste/);
assert.deepEqual(deleted, [contacts.get("sophea@example.com")]);

// A made-up or expired link says it has expired, and joins nothing.
const bad = await call("POST", `/api/confirm?token=${crypto.randomUUID()}&lang=en`);
assert.match(await bad.text(), /This link has expired/);
assert.match(await (await call("GET", "/api/confirm?token=nope")).text(), /This link has expired/);

// A Turnstile pass from another site is refused.
hostname = "evil.example";
assert.equal((await call("POST", "/api/signup", signupForm("dara@example.com"))).status, 403);
assert.equal(emails.length, 2);

console.log("ok  beta sign-up: confirm link, once a day, welcome email, unsubscribe, expired links, Turnstile hostname");
