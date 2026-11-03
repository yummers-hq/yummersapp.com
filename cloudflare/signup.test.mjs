// Runs the beta sign-up through the Worker with Turnstile, Resend and KV faked,
// so nothing is sent. Usage: node cloudflare/signup.test.mjs
import assert from "node:assert/strict";
import worker from "./worker.js";

const kv = new Map();
const env = {
    TURNSTILE_SECRET: "x", RESEND_API_KEY: "x", SEGMENT_ID: "seg", MELBOURNE_SEGMENT_ID: "melb",
    SIGNUPS: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => kv.set(k, v) },
};
const emails = [], contacts = new Map(), deleted = [], props = new Map(), segments = new Map(), legacy = new Set();
let hostname = "yummersapp.com";
globalThis.fetch = async (url, init) => {
    url = String(url);
    if (url.includes("turnstile")) return Response.json({ success: true, hostname });
    const body = init.body && JSON.parse(init.body);
    if (url.endsWith("/emails")) { emails.push(body); return Response.json({ id: "e" }); }
    // Like Resend, creating an existing contact answers OK with the same id.
    if (url.endsWith("/contacts")) {
        if (!contacts.has(body.email)) {
            contacts.set(body.email, crypto.randomUUID());
            props.set(body.email, Object.fromEntries(Object.entries(body.properties ?? {}).map(([k, value]) => [k, { value, type: "string" }])));
            segments.set(body.email, (body.segments ?? []).map((x) => x.id));
        }
        return Response.json({ id: contacts.get(body.email) });
    }
    if (init.method === "GET") {
        const email = decodeURIComponent(url.split("/").pop());
        const id = contacts.get(email);
        return id ? Response.json({ id, properties: props.get(email) }) : new Response(null, { status: 404 });
    }
    if (url.includes("/segments/")) {
        const [, email, seg] = url.match(/contacts\/([^/]+)\/segments\/(.+)$/);
        segments.get(decodeURIComponent(email)).push(seg);
        return new Response(null, { status: 200 });
    }
    if (init.method === "PATCH") {
        const email = decodeURIComponent(url.split("/").pop());
        for (const [k, value] of Object.entries(body.properties)) props.get(email)[k] = { value, type: "string" };
        return Response.json({ id: contacts.get(email) });
    }
    if (init.method === "DELETE") { deleted.push(url.split("/").pop()); return new Response(null, { status: 200 }); }
    throw new Error(`unexpected fetch ${url}`);
};

const waits = [];
const ctx = { waitUntil: (p) => waits.push(p) };
const call = (method, path, form) => worker.fetch(new Request(`https://yummersapp.com${path}`, { method, body: form }), env, ctx);
const signupForm = (email, extra = {}) => {
    const f = new FormData();
    f.set("email", email); f.set("cf-turnstile-response", "t"); f.set("lang", "fr");
    for (const [k, v] of Object.entries(extra)) f.set(k, v);
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

hostname = "yummersapp.com";
const melb = (extra) => ({ list: "melbourne", suburb: "Footscray", adult: "yes", ...extra });
const confirmFrom = async (n) => {
    const l = emails[n].text.match(/\/api\/confirm\?\S+/)[0];
    return { l, res: await call("POST", l) };
};

// Melbourne: an unknown suburb or no age tick is refused before any email is sent.
const before = emails.length;
assert.equal((await call("POST", "/api/signup", signupForm("m1@example.com", melb({ suburb: "Atlantis" })))).status, 400);
assert.equal((await call("POST", "/api/signup", signupForm("m1@example.com", melb({ adult: "" })))).status, 400);
// "Somewhere else" needs a plain-text suburb of 1 to 60 characters.
const else_ = (other) => melb({ suburb: "Somewhere else in Melbourne", suburb_other: other });
for (const bad of ["", "  ", "a".repeat(61), "<b>x</b>", "Preston2"])
    assert.equal((await call("POST", "/api/signup", signupForm("m1@example.com", else_(bad)))).status, 400);
assert.equal((await call("POST", "/api/signup", signupForm("m1@example.com", melb({ suburb: "Narnia" })))).status, 400);
assert.equal(emails.length, before);

// A valid sign-up (with a malformed ref, which is dropped) gets an English confirm email,
// and confirming adds the contact to the Melbourne segment with its properties.
assert.equal((await call("POST", "/api/signup", signupForm("m1@example.com", melb({ ref: "../EVIL" })))).status, 204);
assert.equal(emails.at(-1).subject, "Confirm your email for the yummers Melbourne list");
let c = await confirmFrom(emails.length - 1);
const html1 = await c.res.text();
await Promise.all(waits);
const p1 = props.get("m1@example.com");
assert.deepEqual(segments.get("m1@example.com"), ["melb"]);
assert.equal(p1.suburb.value, "Footscray");
assert.match(p1.invite_code.value, /^[a-z0-9]{8}$/);
assert.notEqual(p1.invite_code.value, contacts.get("m1@example.com"));
assert.equal(p1.invited_by, undefined);
// The confirmed page and the welcome note both show the invite link.
const inviteUrl = `https://yummersapp.com/melbourne?ref=${p1.invite_code.value}`;
assert.ok(html1.includes(inviteUrl) && html1.includes("Share my invite link"));
assert.ok(emails.at(-1).text.includes(inviteUrl));
assert.ok(emails.at(-1).html.includes(inviteUrl));
assert.match(emails.at(-1).text, /\/api\/unsubscribe\?id=/);

// A friend arriving with that code is recorded as invited by it.
assert.equal((await call("POST", "/api/signup", signupForm("m2@example.com", melb({ ref: p1.invite_code.value })))).status, 204);
await confirmFrom(emails.length - 1);
await Promise.all(waits);
assert.equal(props.get("m2@example.com").invited_by.value, p1.invite_code.value);

// An existing contact (here a beta one) joins the Melbourne segment and keeps an invite code it has;
// one without a code gets one. Neither is emailed again.
const sent = emails.length;
assert.equal((await call("POST", "/api/signup", signupForm("sophea@example.com", melb({ suburb: "Box Hill" })))).status, 204);
await confirmFrom(emails.length - 1);
assert.ok(["seg", "melb"].every((x) => segments.get("sophea@example.com").includes(x)));
assert.match(props.get("sophea@example.com").invite_code.value, /^[a-z0-9]{8}$/);
const kept = props.get("sophea@example.com").invite_code.value;
env.SIGNUPS.put("confirm:" + "00000000-0000-4000-8000-000000000001", JSON.stringify({ email: "sophea@example.com", list: "melbourne", suburb: "Clayton", ref: "" }));
await call("POST", "/api/confirm?token=00000000-0000-4000-8000-000000000001");
assert.equal(props.get("sophea@example.com").invite_code.value, kept);
assert.equal(props.get("sophea@example.com").suburb.value, "Clayton");
assert.equal(emails.length, sent + 1); // only the confirm email

// A beta sign-up still goes to the beta segment, with no properties; and a pending token
// saved before the Melbourne list (a plain email string) still confirms there.
kv.set("confirm:00000000-0000-4000-8000-000000000002", "old@example.com");
const old = await call("POST", "/api/confirm?token=00000000-0000-4000-8000-000000000002&lang=en");
assert.match(await old.text(), /You're on the list!/);
await Promise.all(waits);
assert.deepEqual(segments.get("old@example.com"), ["seg"]);
assert.deepEqual(props.get("old@example.com"), {});

// Elsewhere "Preston" (trimmed) is stored as "Elsewhere: Preston".
assert.equal((await call("POST", "/api/signup", signupForm("m5@example.com", else_(" Preston ")))).status, 204);
await confirmFrom(emails.length - 1);
await Promise.all(waits);
assert.equal(props.get("m5@example.com").suburb.value, "Elsewhere: Preston");

// A listed state is stored as it is.
assert.equal((await call("POST", "/api/signup", signupForm("m6@example.com", melb({ suburb: "Queensland" })))).status, 204);
await confirmFrom(emails.length - 1);
await Promise.all(waits);
assert.equal(props.get("m6@example.com").suburb.value, "Queensland");

console.log("ok  melbourne waitlist: validation, ref, segment and properties, invite link, existing contact, old pending tokens");
console.log("ok  beta sign-up: confirm link, once a day, welcome email, unsubscribe, expired links, Turnstile hostname");
