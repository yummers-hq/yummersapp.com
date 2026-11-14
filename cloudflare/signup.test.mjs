// Runs the Android waitlist sign-up through the Worker with Turnstile, Resend and KV faked,
// so nothing is sent. Usage: node cloudflare/signup.test.mjs
import assert from "node:assert/strict";
import worker from "./worker.js";

const kv = new Map();
const env = {
    TURNSTILE_SECRET: "x", RESEND_API_KEY: "x", SEGMENT_ID: "seg", MELBOURNE_SEGMENT_ID: "melb", ANDROID_SEGMENT_ID: "andr",
    SIGNUPS: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => kv.set(k, v), delete: async (k) => kv.delete(k) },
};
const emails = [], contacts = new Map(), deleted = [], props = new Map(), segments = new Map(), legacy = new Set();
let hostname = "yummersapp.com", failEmail = false, lookupStatus = 0;
globalThis.fetch = async (url, init) => {
    url = String(url);
    if (url.includes("turnstile")) return Response.json({ success: true, hostname });
    const body = init.body && JSON.parse(init.body);
    if (url.endsWith("/emails")) { if (failEmail) return new Response(null, { status: 500 }); emails.push(body); return Response.json({ id: "e" }); }
    // Like Resend, creating an existing contact answers OK with the same id.
    if (url.endsWith("/contacts")) {
        if (body.segments?.some((x) => !x.id)) return new Response(null, { status: 422 }); // Resend refuses an unknown segment
        if (!contacts.has(body.email)) {
            contacts.set(body.email, crypto.randomUUID());
            props.set(body.email, Object.fromEntries(Object.entries(body.properties ?? {}).map(([k, value]) => [k, { value, type: "string" }])));
            segments.set(body.email, (body.segments ?? []).map((x) => x.id));
        }
        return Response.json({ id: contacts.get(body.email) });
    }
    if (init.method === "GET") {
        if (lookupStatus) return new Response(null, { status: lookupStatus });
        // Like Resend, a contact is found by its email or its id.
        const key = decodeURIComponent(url.split("/").pop());
        const email = contacts.has(key) ? key : [...contacts].find(([, id]) => id === key)?.[0];
        const id = contacts.get(email);
        return id ? Response.json({ id, email, properties: props.get(email) }) : new Response(null, { status: 404 });
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
    f.set("email", email); f.set("cf-turnstile-response", "t"); f.set("lang", "fr"); f.set("list", "android");
    for (const [k, v] of Object.entries(extra)) f.set(k, v);
    return f;
};

// Signing up emails a confirm link and saves nothing.
assert.equal((await call("POST", "/api/signup", signupForm("Sophea@Example.com"))).status, 204);
assert.equal(emails.length, 1);
assert.equal(emails[0].to, "sophea@example.com");
assert.equal(emails[0].subject, "Confirmez votre e-mail pour la liste Android de yummers");
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
assert.match(await joined.text(), /vous êtes sur la liste Android/);
await Promise.all(waits);
assert.ok(contacts.has("sophea@example.com"));
assert.equal(emails.length, 2);
assert.equal(emails[1].subject, "Vous êtes sur la liste Android de yummers");
assert.deepEqual(segments.get("sophea@example.com"), ["andr"]);
const unsub = emails[1].text.match(/https:\/\/yummersapp\.com(\/api\/unsubscribe\?\S+)/)[1];
assert.equal(unsub, `/api/unsubscribe?id=${contacts.get("sophea@example.com")}&lang=fr`);

// The link works once: pressing it again says it expired and sends no second welcome note.
assert.match(await (await call("POST", link.replace("https://yummersapp.com", ""))).text(), /Ce lien a expiré|expired/);
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

// Only a plain address is accepted.
assert.equal((await call("POST", "/api/signup", signupForm("a<v@x.com>"))).status, 400);

// A failed confirm email leaves no daily-limit key, so the person can try again.
failEmail = true;
assert.equal((await call("POST", "/api/signup", signupForm("retry@example.com"))).status, 502);
assert.equal(kv.has("sent:retry@example.com"), false);
failEmail = false;
assert.equal((await call("POST", "/api/signup", signupForm("retry@example.com"))).status, 204);
assert.equal(kv.has("sent:retry@example.com"), true);

// A lookup that fails for any reason but 404 is not a new contact: 502, no welcome email.
const mailed = emails.length;
const link2 = emails.at(-1).text.match(/\/api\/confirm\?\S+/)[0];
lookupStatus = 429;
assert.equal((await call("POST", link2)).status, 502);
lookupStatus = 0;
await Promise.all(waits);
assert.equal(emails.length, mailed);
assert.equal(contacts.has("retry@example.com"), false);

// A Turnstile pass from another site is refused.
hostname = "evil.example";
assert.equal((await call("POST", "/api/signup", signupForm("dara@example.com"))).status, 403);
assert.equal(emails.length, 3);

hostname = "yummersapp.com";

// Other kinds are refused before any email: the iPhone beta and Melbourne forms are gone.
const before = emails.length;
for (const list of ["", "melbourne", "beta"])
    assert.equal((await call("POST", "/api/signup", signupForm("x@example.com", { list }))).status, 400);
assert.equal(emails.length, before);

// Khmer and English get their own wording, and a language we don't have falls back to English.
for (const [lang, subject] of [["km", /Android/], ["en", /^Confirm your email for the yummers Android list$/], ["de", /^Confirm your email for the yummers Android list$/]]) {
    assert.equal((await call("POST", "/api/signup", signupForm(`${lang}@example.com`, { lang }))).status, 204);
    assert.match(emails.at(-1).subject, subject);
}

// Android segment: a new contact lands in ANDROID_SEGMENT_ID only, with the English welcome note.
const lk = emails.at(-1).text.match(/\/api\/confirm\?\S+/)[0];
assert.match(lk, /lang=en/);
assert.match(await (await call("POST", lk)).text(), /You're on the Android list!/);
await Promise.all(waits);
assert.deepEqual(segments.get("de@example.com"), ["andr"]);
assert.equal(emails.at(-1).subject, "You're on the yummers Android list");
assert.match(emails.at(-1).text, /Android is next/);

// An unset ANDROID_SEGMENT_ID fails (502) and never drops the person into the beta segment.
const savedAndroid = env.ANDROID_SEGMENT_ID;
delete env.ANDROID_SEGMENT_ID;
assert.equal((await call("POST", "/api/signup", signupForm("noseg@example.com"))).status, 204);
assert.equal((await call("POST", emails.at(-1).text.match(/\/api\/confirm\?\S+/)[0])).status, 502);
assert.equal(segments.get("noseg@example.com")?.length ?? 0, 0);
env.ANDROID_SEGMENT_ID = savedAndroid;
console.log("ok  android sign-up: confirm link, once a day, languages, segment, welcome email, unsubscribe, expired links, Turnstile hostname");

// Links sent before 14 Nov still confirm. A pending Melbourne token (as the old form saved it) joins the
// Melbourne segment with its properties, and the confirmed page and welcome note carry the invite link.
const pend = (n, v) => { const t = `00000000-0000-4000-8000-00000000000${n}`; kv.set(`confirm:${t}`, typeof v === "string" ? v : JSON.stringify(v)); return `/api/confirm?token=${t}&lang=en`; };
const html1 = await (await call("POST", pend(1, { email: "m1@example.com", list: "melbourne", suburb: "Footscray", ref: "" }))).text();
await Promise.all(waits);
const p1 = props.get("m1@example.com");
assert.deepEqual(segments.get("m1@example.com"), ["melb"]);
assert.equal(p1.suburb.value, "Footscray");
assert.match(p1.invite_code.value, /^[a-z0-9]{8}$/);
assert.notEqual(p1.invite_code.value, contacts.get("m1@example.com"));
assert.equal(p1.invited_by, undefined);
const inviteUrl = `https://yummersapp.com/melbourne?ref=${p1.invite_code.value}`;
assert.ok(html1.includes(inviteUrl) && html1.includes("Share my invite link"));
assert.ok(emails.at(-1).text.includes(inviteUrl) && emails.at(-1).html.includes(inviteUrl));
assert.match(emails.at(-1).text, /\/api\/unsubscribe\?id=/);

// A friend's code is recorded as invited_by.
await call("POST", pend(2, { email: "m2@example.com", list: "melbourne", suburb: "CBD", ref: p1.invite_code.value }));
await Promise.all(waits);
assert.equal(props.get("m2@example.com").invited_by.value, p1.invite_code.value);

// An existing contact (here an Android one) joins the Melbourne segment, gets a code and one welcome note;
// confirming again keeps the code and sends nothing more.
const sent = emails.length;
await call("POST", pend(3, { email: "sophea@example.com", list: "melbourne", suburb: "Box Hill", ref: "" }));
await Promise.all(waits);
assert.ok(["andr", "melb"].every((x) => segments.get("sophea@example.com").includes(x)));
const kept = props.get("sophea@example.com").invite_code.value;
assert.match(kept, /^[a-z0-9]{8}$/);
assert.equal(emails.length, sent + 1);
assert.equal(emails.at(-1).subject, "You're on the yummers Melbourne list");
assert.match(emails.at(-1).text, new RegExp(`/api/unsubscribe\\?id=${contacts.get("sophea@example.com")}&lang=en`));
await call("POST", pend(4, { email: "sophea@example.com", list: "melbourne", suburb: "Clayton", ref: "" }));
await Promise.all(waits);
assert.equal(props.get("sophea@example.com").invite_code.value, kept);
assert.equal(props.get("sophea@example.com").suburb.value, "Clayton");
assert.equal(emails.length, sent + 1);

// A plain-email token (the beta list, before the Melbourne list) still joins the beta segment with no
// properties; an existing contact joining it is not emailed.
const mailedBeta = emails.length;
assert.match(await (await call("POST", pend(5, "old@example.com"))).text(), /You're on the list!/);
await Promise.all(waits);
assert.deepEqual(segments.get("old@example.com"), ["seg"]);
assert.deepEqual(props.get("old@example.com"), {});
assert.equal(emails.length, mailedBeta + 1);
await call("POST", pend(6, "m2@example.com"));
await Promise.all(waits);
assert.equal(emails.length, mailedBeta + 1);
console.log("ok  old links: Melbourne and beta tokens still confirm, invite link, existing contact, plain-email tokens");

// The one-tap join (#201): a contact already on the beta list joins Melbourne from their id alone.
contacts.set("tap@example.com", crypto.randomUUID()); props.set("tap@example.com", {}); segments.set("tap@example.com", ["seg"]);
const tapId = contacts.get("tap@example.com"), tapPath = `/api/join-melbourne?id=${tapId}`;
const tapBefore = emails.length;
// Opening it joins nobody by itself: the page submits its Join button with a script, which scanners
// don't run. A bad or unknown id says the link has expired, and nothing joins.
const opened = await (await call("GET", tapPath)).text();
assert.ok(opened.includes('<script src="/autosubmit.js" defer>') && opened.includes('<form method="post">'));
assert.ok((await (await call("POST", "/api/join-melbourne?id=nope")).text()).includes("expired"));
assert.ok((await (await call("POST", "/api/join-melbourne?id=00000000-0000-4000-8000-00000000dead")).text()).includes("expired"));
assert.deepEqual(segments.get("tap@example.com"), ["seg"]);
// Pressing Join adds them to Melbourne with an invite code, no suburb, and one welcome note.
const tapped = await (await call("POST", tapPath)).text();
await Promise.all(waits);
assert.deepEqual(segments.get("tap@example.com"), ["seg", "melb"]);
const tapCode = props.get("tap@example.com").invite_code.value;
assert.equal(props.get("tap@example.com").suburb, undefined);
assert.ok(tapped.includes(`?ref=${tapCode}`));
assert.equal(emails.length, tapBefore + 1);
assert.equal(emails.at(-1).to, "tap@example.com");
assert.ok(emails.at(-1).text.includes("Melbourne starts with the CBD"));
// Pressing it again keeps the code and sends nothing more.
assert.ok((await (await call("POST", tapPath)).text()).includes(`?ref=${tapCode}`));
await Promise.all(waits);
assert.equal(emails.length, tapBefore + 1);
console.log("ok  melbourne one-tap join: asks first, bad ids refused, joins once, welcome with the CBD note");
