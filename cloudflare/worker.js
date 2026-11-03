// Runs on Cloudflare in front of GitHub Pages. Clients that ask for Markdown
// (Accept: text/markdown) get the homepage as llms.txt and a short Markdown
// "not found" page; POST /api/signup takes a beta sign-up, and /api/confirm and
// /api/unsubscribe answer the links in its emails; everything else passes
// through unchanged.
import { guides, places, sitemap } from "./guides.js";

const NOT_FOUND = `# Page not found

There's no page at this address on yummersapp.com.

- [yummers home](https://yummersapp.com/)
- [What yummers is, for AI assistants](https://yummersapp.com/llms.txt)
- [Sitemap](https://yummersapp.com/sitemap.xml)
`;

function markdown(body, status) {
    return new Response(body, {
        status,
        headers: { "Content-Type": "text/markdown; charset=utf-8", Vary: "Accept" },
    });
}

// The confirmation a first sign-up gets, in the language the page was showing:
// a short personal note from Sovithyea, crediting the team of seven (#59), signed by hand, with the banner and
// social links in a strip at the bottom (owner, 20 Oct, #53, accepting a little
// more risk of Gmail's Promotions tab than the 19 Oct plain note). It has no
// List-Unsubscribe header, so Gmail treats it as personal mail; the privacy
// policy's unsubscribe link is the {unsubscribe} line (see unsubscribe()).
// The verify* strings are the note that comes first, with the confirm link (#46);
// join*, joined*, expired* and leave*/left* are the pages its links open.
const CONTACT = "hello@yummersapp.com";
const CONFIRM = {
    en: {
        subject: "Thanks for joining the yummers beta",
        note: [
            "Hi,",
            "Thanks for signing up for the yummers beta. I'm Sovithyea, one of a team of seven building yummers for Cambodia: an app to rate the places you've eaten, keep lists of where to go next, and see where your friends are eating.",
            "We're testing it with a small group on iPhone first. The beta opens in November, and we'll email you an invite as soon as there's a spot for you.",
            "If there's a place you think everyone should try, hit reply and tell me. I read every email.",
        ],
        regards: "Warm regards,",
        role: "Founder & Lead Engineer, yummers",
        offList: "Didn't sign up, or changed your mind? {unsubscribe}",
        unsubscribe: "Take me off the list",
        leaveTitle: "Leave the beta list?",
        leaveText: "We'll delete your email address and won't write to you again.",
        leftTitle: "You're off the list.",
        leftText: "Your email address is deleted. Changed your mind? You can sign up again on yummersapp.com.",
        verifySubject: "Confirm your email for the yummers beta",
        verifyNote: [
            "Hi,",
            "Thanks for signing up for the yummers beta. Press the link below to confirm it's your email, and you're on the list.",
        ],
        verifyButton: "Confirm my email",
        verifyIgnore: "Didn't sign up? Just ignore this email and we won't add you to the list.",
        joinTitle: "Join the yummers beta list?",
        joinText: "Press the button to confirm your email.",
        joinedTitle: "You're on the list!",
        joinedText: "We've sent you a short welcome note, and we'll write again when your invite is ready.",
        expiredTitle: "This link has expired.",
        expiredText: "Sign up again on yummersapp.com and we'll send you a new one.",
    },
    km: {
        subject: "អរគុណដែលបានចូលរួមសាកល្បង yummers",
        note: [
            "សួស្តី,",
            "អរគុណដែលបានចុះឈ្មោះសាកល្បង yummers។ ខ្ញុំឈ្មោះ Sovithyea ជាសមាជិកម្នាក់ក្នុងក្រុមប្រាំពីរនាក់ ដែលកំពុងបង្កើត yummers សម្រាប់ប្រទេសកម្ពុជា៖ កម្មវិធីសម្រាប់វាយតម្លៃកន្លែងដែលអ្នកបានញ៉ាំ កត់ចំណាំកន្លែងដែលចង់ទៅលើកក្រោយ និងមើលថាមិត្តភក្តិរបស់អ្នកកំពុងញ៉ាំនៅឯណា។",
            "យើងកំពុងសាកល្បងវាជាមួយក្រុមតូចមួយលើ iPhone សិន។ កម្មវិធីសាកល្បងនឹងបើកនៅខែវិច្ឆិកា ហើយយើងនឹងផ្ញើអ៊ីមែលអញ្ជើញទៅអ្នក ភ្លាមៗនៅពេលមានកន្លែងសម្រាប់អ្នក។",
            "បើមានកន្លែងណាដែលអ្នកគិតថាគ្រប់គ្នាគួរតែសាកល្បង សូមឆ្លើយតបមកប្រាប់ខ្ញុំ។ ខ្ញុំអានរាល់អ៊ីមែល។",
        ],
        regards: "ដោយក្តីរាប់អាន,",
        role: "ស្ថាបនិក និងប្រធានវិស្វករ yummers",
        offList: "មិនបានចុះឈ្មោះ ឬប្ដូរចិត្ត? {unsubscribe}",
        unsubscribe: "ដកឈ្មោះខ្ញុំចេញពីបញ្ជី",
        leaveTitle: "ចាកចេញពីបញ្ជីសាកល្បង?",
        leaveText: "យើងនឹងលុបអាសយដ្ឋានអ៊ីមែលរបស់អ្នក ហើយនឹងមិនផ្ញើអ៊ីមែលទៅអ្នកទៀតទេ។",
        leftTitle: "អ្នកបានចាកចេញពីបញ្ជីហើយ។",
        leftText: "អាសយដ្ឋានអ៊ីមែលរបស់អ្នកត្រូវបានលុបហើយ។ ប្ដូរចិត្តវិញ? អ្នកអាចចុះឈ្មោះម្ដងទៀតនៅ yummersapp.com។",
        verifySubject: "បញ្ជាក់អ៊ីមែលរបស់អ្នក សម្រាប់ការសាកល្បង yummers",
        verifyNote: [
            "សួស្តី,",
            "អរគុណដែលបានចុះឈ្មោះសាកល្បង yummers។ សូមចុចតំណខាងក្រោម ដើម្បីបញ្ជាក់ថាជាអ៊ីមែលរបស់អ្នក ហើយអ្នកនឹងមានឈ្មោះក្នុងបញ្ជី។",
        ],
        verifyButton: "បញ្ជាក់អ៊ីមែលរបស់ខ្ញុំ",
        verifyIgnore: "មិនបានចុះឈ្មោះទេ? គ្រាន់តែមិនអើពើនឹងអ៊ីមែលនេះ យើងនឹងមិនដាក់ឈ្មោះអ្នកក្នុងបញ្ជីទេ។",
        joinTitle: "ចូលក្នុងបញ្ជីសាកល្បង yummers?",
        joinText: "ចុចប៊ូតុងខាងក្រោម ដើម្បីបញ្ជាក់អ៊ីមែលរបស់អ្នក។",
        joinedTitle: "អ្នកមានឈ្មោះក្នុងបញ្ជីហើយ!",
        joinedText: "យើងបានផ្ញើសារស្វាគមន៍ខ្លីមួយទៅអ្នកហើយ។ យើងនឹងផ្ញើអ៊ីមែលម្ដងទៀត នៅពេលការអញ្ជើញរបស់អ្នករួចរាល់។",
        expiredTitle: "តំណនេះផុតកំណត់ហើយ។",
        expiredText: "សូមចុះឈ្មោះម្ដងទៀតនៅ yummersapp.com ហើយយើងនឹងផ្ញើតំណថ្មីទៅអ្នក។",
    },
    fr: {
        subject: "Merci d'avoir rejoint la bêta yummers",
        note: [
            "Bonjour,",
            "Merci de vous être inscrit à la bêta de yummers. Je m'appelle Sovithyea et je fais partie de l'équipe de sept personnes qui construit yummers pour le Cambodge : une appli pour noter les endroits où vous avez mangé, garder des listes de vos prochaines adresses et voir où mangent vos amis.",
            "Nous la testons d'abord sur iPhone avec un petit groupe. La bêta ouvre en novembre, et nous vous enverrons une invitation dès qu'il y aura une place pour vous.",
            "S'il y a un endroit que tout le monde devrait essayer selon vous, répondez à cet e-mail pour me le dire. Je lis tous les e-mails.",
        ],
        regards: "Bien chaleureusement,",
        role: "Fondateur et ingénieur principal, yummers",
        offList: "Vous ne vous êtes pas inscrit, ou vous avez changé d'avis ? {unsubscribe}",
        unsubscribe: "Me retirer de la liste",
        leaveTitle: "Quitter la liste de la bêta ?",
        leaveText: "Nous supprimerons votre adresse e-mail et ne vous écrirons plus.",
        leftTitle: "C'est fait, vous n'êtes plus sur la liste.",
        leftText: "Votre adresse e-mail est supprimée. Vous avez changé d'avis ? Vous pouvez vous réinscrire sur yummersapp.com.",
        verifySubject: "Confirmez votre e-mail pour la bêta yummers",
        verifyNote: [
            "Bonjour,",
            "Merci de vous être inscrit à la bêta de yummers. Appuyez sur le lien ci-dessous pour confirmer votre adresse e-mail, et vous serez sur la liste.",
        ],
        verifyButton: "Confirmer mon e-mail",
        verifyIgnore: "Vous ne vous êtes pas inscrit ? Ignorez simplement cet e-mail : nous ne vous ajouterons pas à la liste.",
        joinTitle: "Rejoindre la liste de la bêta yummers ?",
        joinText: "Appuyez sur le bouton pour confirmer votre e-mail.",
        joinedTitle: "C'est noté, vous êtes sur la liste !",
        joinedText: "Nous vous avons envoyé un petit mot de bienvenue. Nous vous écrirons dès que votre invitation sera prête.",
        expiredTitle: "Ce lien a expiré.",
        expiredText: "Inscrivez-vous à nouveau sur yummersapp.com et nous vous enverrons un nouveau lien.",
    },
};

// The Melbourne waitlist (yummers#786): English only, and its own segment. Its
// strings replace the beta's where they differ; the rest (leave*, left*, expired*,
// verifyButton, regards, role) are shared.
const ELSEWHERE = "Somewhere else in Melbourne";
const STATES = ["Regional Victoria", "New South Wales", "Queensland", "South Australia", "Western Australia", "Tasmania", "Australian Capital Territory", "Northern Territory"];
const MELBOURNE = {
    suburbs: ["CBD", "Carlton", "Fitzroy", "Collingwood", "Richmond", "Brunswick", "South Yarra", "Footscray", "Sunshine",
        "St Albans", "Springvale", "Noble Park", "Dandenong", "Clayton", "Box Hill", ELSEWHERE, ...STATES],
    subject: "You're on the yummers Melbourne list",
    note: [
        "Hi,",
        "Thanks for joining the yummers Melbourne list. I'm Sovithyea, one of a team of seven building yummers: an app to rate the places you've eaten, keep lists of where to go next, and see where your friends are eating.",
        "We're starting in Phnom Penh, and Melbourne is next. We'll email you when there's news. The more people who ask for it, the sooner it comes.",
    ],
    verifySubject: "Confirm your email for the yummers Melbourne list",
    verifyNote: [
        "Hi,",
        "Thanks for joining the yummers Melbourne list. Press the link below to confirm it's your email, and you're on the list.",
        "After that, we'll send your invite link in a second email. If you use Gmail, look in the Promotions tab.",
    ],
    joinTitle: "Join the yummers Melbourne list?",
    joinedTitle: "You're on the Melbourne list!",
    joinedText: "We'll write when there's news. Want it here sooner? Send your invite link to friends who'd use it.",
    invite: "Want yummers in Melbourne sooner? Send friends your invite link:",
    share: "Share my invite link",
};

const NAME = "Sovithyea Prach";
const SOCIALS = [
    ["Instagram", "https://www.instagram.com/yummersapp/"],
    ["TikTok", "https://www.tiktok.com/@hungryraccoonapp"],
    ["Facebook", "https://www.facebook.com/profile.php?id=61594898428255"],
    ["LinkedIn", "https://www.linkedin.com/company/hungryraccoon/"],
];

function confirmText(t, unsub) {
    return `${t.note.join("\n\n")}

${t.regards}
${NAME}
${t.role} · https://yummersapp.com

${SOCIALS.map(([name, url]) => `${name}: ${url}`).join("\n")}

${t.offList.replace("{unsubscribe}", `${t.unsubscribe}: ${unsub}`)}
`;
}

// The note, the handwritten signature, then a cream strip with the banner, the
// social icons (the site footer's, as PNGs, since Gmail drops SVG) and the opt-out line. Images come from the site's assets. White
// and light-only, so the dark ink shows in a mail app's dark mode; Gmail and Outlook darken the
// backgrounds anyway, so the signature and icons carry their own solid white and cream (#61).
function confirmHtml(t, lang, unsub) {
    const p = (text, style = "") => `<p style="margin:0 0 16px;${style}">${text}</p>`;
    const link = "color:#A83618;";
    const socials = SOCIALS.map(([name, url]) => `<a href="${url}" style="display:inline-block;margin:0 4px;"><img src="https://yummersapp.com/assets/email-${name.toLowerCase()}.png" width="32" height="32" alt="${name}" style="display:block;border:0;"></a>`).join("");
    return `<!doctype html>
<html lang="${lang}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${t.subject}</title></head>
<body style="margin:0;padding:16px;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#2C2420;">
<div style="max-width:560px;">
${t.note.map(s => p(s)).join("\n")}
<p style="margin:0;">${t.regards}</p>
<img src="https://yummersapp.com/assets/email-signature.png" width="160" alt="${NAME}" style="display:block;margin:4px 0;border:0;">
${p(`${NAME}<br><span style="color:#75685C;">${t.role}</span>`)}
<div style="margin-top:28px;padding:16px;background:#F4EFE8;border-radius:12px;text-align:center;">
<a href="https://yummersapp.com"><img src="https://yummersapp.com/assets/email-banner.png" width="280" alt="yummers" style="display:block;margin:0 auto 10px;max-width:100%;height:auto;border:0;border-radius:8px;"></a>
${p(socials, "margin-bottom:10px;font-size:14px;")}
${p(t.offList.replace("{unsubscribe}", `<a href="${unsub}" style="${link}">${t.unsubscribe}</a>`), "margin:0;font-size:13px;color:#8A7D70;")}
</div>
</div>
</body>
</html>`;
}

function resendApi(env, method, path, body) {
    return fetch(`https://api.resend.com${path}`, {
        method,
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: body && JSON.stringify(body),
    });
}

const FROM = "Sovithyea from yummers <sovithyea@mail.yummersapp.com>";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// An invite code: 8 lowercase letters and digits. It is not the Resend contact id,
// which is the unsubscribe key.
const CODE = /^[a-z0-9]{8}$/;
const newCode = () => Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => "0123456789abcdefghijklmnopqrstuvwxyz"[b % 36]).join("");
const inviteLink = (code) => `https://yummersapp.com/melbourne?ref=${code}`;

// English with the Melbourne strings laid over it.
const melbourneStrings = () => ({ t: { ...CONFIRM.en, ...MELBOURNE }, lang: "en" });

// The strings for a form's or link's lang, falling back to English.
function language(lang) {
    const known = Object.hasOwn(CONFIRM, lang);
    return { t: known ? CONFIRM[lang] : CONFIRM.en, lang: known ? lang : "en" };
}

// The homepage's beta sign-up form. Checks the Turnstile token and emails a link
// to confirm the address; nothing joins the list until it's pressed, so nobody can
// sign up someone else (#46). A pending sign-up waits in KV for 7 days.
async function signup(request, env) {
    const form = await request.formData().catch(() => null);
    const email = String(form?.get("email") || "").trim().toLowerCase();
    if (email.length > 254 || !/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email)) {
        return new Response(null, { status: 400 });
    }

    const melbourne = form.get("list") === "melbourne";
    let suburb = String(form.get("suburb") || "");
    // The Melbourne form's extra fields are checked here, not trusted from the page.
    if (melbourne && (!MELBOURNE.suburbs.includes(suburb) || !form.get("adult"))) return new Response(null, { status: 400 });
    if (melbourne && suburb === ELSEWHERE) {
        const other = String(form.get("suburb_other") || "").trim();
        if (!/^[\p{L} '’.-]{1,60}$/u.test(other)) return new Response(null, { status: 400 });
        suburb = `Elsewhere: ${other}`;
    }
    // A malformed ref is dropped, so the sign-up still goes through.
    const ref = String(form.get("ref") || "");

    const check = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        body: new URLSearchParams({
            secret: env.TURNSTILE_SECRET,
            response: String(form.get("cf-turnstile-response") || ""),
            remoteip: request.headers.get("CF-Connecting-IP") || "",
        }),
    });
    const passed = await check.json();
    // The token must come from our page, not another site borrowing our site key.
    if (!passed.success || passed.hostname !== "yummersapp.com") return new Response(null, { status: 403 });

    // One confirm email a day per address, so the form can't flood an inbox. The
    // answer is the same either way, so it doesn't show who has signed up.
    const sent = `sent:${melbourne ? "melbourne:" : ""}${email}`;
    if (await env.SIGNUPS.get(sent)) return new Response(null, { status: 204 });
    await env.SIGNUPS.put(sent, "1", { expirationTtl: 86400 });
    const token = crypto.randomUUID();
    const pending = { email, ...(melbourne && { list: "melbourne", suburb, ref: CODE.test(ref) ? ref : "" }) };
    await env.SIGNUPS.put(`confirm:${token}`, JSON.stringify(pending), { expirationTtl: 7 * 86400 });
    const { t, lang } = melbourne ? melbourneStrings() : language(String(form.get("lang")));
    const link = `https://yummersapp.com/api/confirm?token=${token}&lang=${lang}`;
    // The same plain note as the welcome one, with the link as its last paragraph.
    const note = (last) => ({ ...t, subject: t.verifySubject, note: [...t.verifyNote, last], offList: t.verifyIgnore });
    const res = await resendApi(env, "POST", "/emails", {
        from: FROM,
        to: email,
        reply_to: CONTACT,
        subject: t.verifySubject,
        html: confirmHtml(note(`<a href="${link}" style="color:#A83618;">${t.verifyButton}</a>`), lang),
        text: confirmText(note(`${t.verifyButton}: ${link}`)),
    });
    if (!res.ok) {
        await env.SIGNUPS.delete(sent); // a failed send mustn't lock the person out for a day
        return new Response(null, { status: 502 });
    }
    return new Response(null, { status: 204 });
}

// The confirm link. Like unsubscribe(), opening it (GET) only asks, because mail
// scanners open links on their own; the button POSTs, which joins the list.
// The link works once: after joining it is deleted, so pressing it again says it expired.
async function confirm(request, env, ctx, url) {
    const { t, lang } = language(url.searchParams.get("lang"));
    const token = url.searchParams.get("token") || "";
    const raw = UUID.test(token) && await env.SIGNUPS.get(`confirm:${token}`);
    if (!raw) return page(lang, t.expiredTitle, t.expiredText);
    // Sign-ups pending from before the Melbourne list are plain email strings.
    const pending = raw.startsWith("{") ? JSON.parse(raw) : { email: raw };
    const m = pending.list === "melbourne";
    const s = m ? melbourneStrings() : { t, lang };
    if (request.method !== "POST") return page(s.lang, s.t.joinTitle, s.t.joinText, s.t.verifyButton);
    const code = await join(env, ctx, pending, s.t, s.lang);
    if (!code) return new Response(null, { status: 502 });
    await env.SIGNUPS.delete(`confirm:${token}`);
    return page(s.lang, s.t.joinedTitle, s.t.joinedText, null, m ? inviteBlock(s.t, code) : "");
}

// Saves a confirmed email as a Resend contact in the beta sign-up segment (or the
// Melbourne one, with its suburb, invite code and inviter as contact properties),
// and sends a new contact the welcome note. Answers true, or for Melbourne the
// contact's invite code, or false when Resend refused.
async function join(env, ctx, { email, list, suburb, ref }, t, lang) {
    const m = list === "melbourne";
    const resend = (path, body) => resendApi(env, "POST", path, body);
    const to = encodeURIComponent(email);
    // Resend's create also answers OK for an existing contact (same id), so look the
    // address up first: an existing one is only added to the segment, and not emailed.
    const found = await resendApi(env, "GET", `/contacts/${to}`);
    if (!found.ok && found.status !== 404) return false;
    const exists = found.ok;
    const old = exists ? await found.json() : null;
    // An existing contact keeps the code (and inviter) it already has.
    const had = m && old?.properties?.invite_code?.value;
    const code = m && (had || newCode());
    const segment = m ? env.MELBOURNE_SEGMENT_ID : env.SEGMENT_ID;
    const properties = m && { suburb, ...(!had && { invite_code: code, ...(ref && { invited_by: ref }) }) };
    let res;
    if (exists) {
        res = await resend(`/contacts/${to}/segments/${segment}`, {});
        if (res.ok && m) res = await resendApi(env, "PATCH", `/contacts/${to}`, { properties });
    } else {
        res = await resend("/contacts", { email, segments: [{ id: segment }], ...(m && { properties }) });
    }
    // Only a new contact, or one joining Melbourne for the first time (no code yet), is
    // emailed, so joining again can't send them repeat mail. The send runs after the
    // reply, and a failed send doesn't fail joining.
    if (res.ok && (!exists || (m && !had))) ctx.waitUntil((exists ? Promise.resolve(old) : res.json()).then(({ id }) => {
        // The contact's id is the unsubscribe link's key: only this email carries it.
        const unsub = `https://yummersapp.com/api/unsubscribe?id=${id}&lang=${lang}`;
        return resend("/emails", {
            from: FROM,
            to: email,
            reply_to: CONTACT,
            subject: t.subject,
            html: confirmHtml(m ? { ...t, note: [...t.note, `${t.invite}<br><a href="${inviteLink(code)}" style="color:#A83618;">${inviteLink(code)}</a>`] } : t, lang, unsub),
            text: confirmText(m ? { ...t, note: [...t.note, `${t.invite}\n${inviteLink(code)}`] } : t, unsub),
        });
    }));
    return res.ok && (code || true);
}

// The welcome note's unsubscribe link. Opening it (GET) only asks, because
// mail scanners open links on their own; the button POSTs, which deletes the
// contact outright.
async function unsubscribe(request, env, url) {
    const { t, lang } = language(url.searchParams.get("lang"));
    const id = url.searchParams.get("id") || "";
    const valid = UUID.test(id);
    if (request.method !== "POST") return page(lang, t.leaveTitle, t.leaveText, valid && t.unsubscribe);
    const res = valid ? await resendApi(env, "DELETE", `/contacts/${id}`) : null;
    // Already gone (404) counts as done: the link may be pressed twice.
    if (!res || !(res.ok || res.status === 404)) return new Response(null, { status: valid ? 502 : 400 });
    return page(lang, t.leftTitle, t.leftText);
}

// The small page the emails' links open. A button, if given, POSTs back to the same address.
function page(lang, title, text, button, extra = "") {
    const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
    return new Response(`<!doctype html>
<html lang="${lang}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title></head>
<body style="margin:0;padding:48px 16px;background:#F5F0E8;font-family:${font};color:#2C2420;text-align:center;">
  <img src="/assets/logo.png" width="64" height="64" alt="yummers" style="border-radius:16px;">
  <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.4;margin:20px 0 8px;">${title}</h1>
  <p style="font-size:16px;line-height:1.5;color:#665A4E;max-width:420px;margin:0 auto 24px;">${text}</p>
  ${extra}
  ${button ? `<form method="post"><button style="font:600 15px ${font};background:#A83618;color:#fff;border:0;border-radius:999px;padding:13px 24px;cursor:pointer;">${button}</button></form>` : `<a href="/" style="color:#A83618;font-weight:600;text-decoration:none;">yummersapp.com</a>`}
</body>
</html>`, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}

// The invite link and its share button, which invite.js wires up (inline scripts are not allowed).
function inviteBlock(t, code) {
    const link = inviteLink(code);
    return `<p style="font-size:16px;margin:0 0 16px;"><a href="${link}" style="color:#A83618;font-weight:600;word-break:break-all;">${link}</a></p>
  <p><button id="invite-share" data-link="${link}" style="font:600 15px sans-serif;background:#A83618;color:#fff;border:0;border-radius:999px;padding:13px 24px;cursor:pointer;">${t.share}</button></p>
  <script src="/invite.js" defer></script>`;
}

// Sent with every answer (#48). The policy allows only what the pages use: their
// own files, Cloudflare's Turnstile (the sign-up's bot check), Cloudflare Web
// Analytics' script (the zone's automatic setup injects it; it reports to our own
// /cdn-cgi/rum, so 'self' covers that; until PostHog, #51), PostHog's script and
// EU endpoint (analytics.js, #2), and the Supabase
// project that 404.html's share links read (beta since #73), whose public photo
// bucket and Google's place pictures are the only image hosts (the list page, #94).
// Inline styles stay allowed for 404.html's <style> and page() below.
const SECURITY_HEADERS = {
    "Content-Security-Policy": [
        "default-src 'self'",
        "script-src 'self' https://challenges.cloudflare.com https://static.cloudflareinsights.com https://eu-assets.i.posthog.com",
        "frame-src https://challenges.cloudflare.com",
        "connect-src 'self' https://uobskavqhilnqakbdutt.supabase.co https://eu.i.posthog.com",
        "img-src 'self' data: https://uobskavqhilnqakbdutt.supabase.co https://*.googleusercontent.com",
        "style-src 'self' 'unsafe-inline'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
    ].join("; "),
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Frame-Options": "DENY",
};

// The app's place list (yummers#731). Straight from the database it is 4 MB a
// phone, and six phones opening a build together queued the whole project.
// Cloudflare keeps one copy per project for ten minutes. Only our two projects,
// no parameters, so a caller can't make the database do anything else.
const inflight = new Map();
async function catalogue(request, ref, ctx) {
    const key = new Request(`https://yummersapp.com/catalogue/${ref}`);
    const hit = await caches.default.match(key);
    if (hit) return hit;
    // Phones that miss together share one trip to the database.
    if (!inflight.has(ref)) {
        const trip = fetch(`https://${ref}.supabase.co/rest/v1/rpc/catalogue_rows`, {
            headers: { apikey: request.headers.get("apikey") || "" },
        }).then(async (res) => {
            const body = await res.text();
            const out = new Response(body, { status: res.status, headers: { "Content-Type": "application/json" } });
            if (res.ok) {
                out.headers.set("Cache-Control", "public, max-age=600");
                ctx.waitUntil(caches.default.put(key, out.clone()));
            }
            return out;
        }).finally(() => inflight.delete(ref));
        inflight.set(ref, trip);
    }
    return (await inflight.get(ref)).clone();
}

// Shared lists (/l/{id}/{slug}, D40, #95). Chat apps don't run the page's script,
// so the Worker answers with 404.html plus this list's own preview tags. The
// same answer for a private, hidden or missing list (the generic card), and
// always 200, so nothing here shows whether a list exists. 404.html itself
// still draws the page, so the two never disagree.
const SUPABASE = "https://uobskavqhilnqakbdutt.supabase.co";
const ANON = "sb_publishable_lHMGFti9a7-RxGHVj2Iz-g_wXFZoMC7"; // public by design, as in share.js
const SHARE_IMAGE = "https://yummersapp.com/assets/share-square.jpg"; // 600 x 600
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
// Same slug as share.js; the slug is decoration, so a mismatch breaks nothing.
const slugify = (t) => t.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60).replace(/-+$/, "") || "list";

// The list's cover, else the first place's picture (0084), else null.
function listImage(l) {
    const first = (l.list_restaurants || []).slice().sort((a, b) => a.position - b.position)[0]?.picture;
    const photo = first?.kind === "photo" && first.userId && first.id
        ? `${SUPABASE}/storage/v1/object/public/photos/${encodeURIComponent(first.userId)}/${encodeURIComponent(first.id)}.jpg` : null;
    const url = l.cover_url || photo || (first?.kind === "cover" && first.url);
    return /^https:\/\//.test(url || "") ? url : null;
}

async function sharedList(url, id) {
    const [pageRes, listRes] = await Promise.all([
        fetch(new URL("/404.html", url)),
        fetch(`${SUPABASE}/rest/v1/rpc/shared_list`, {
            method: "POST",
            headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" },
            body: JSON.stringify({ p_share_id: id }),
        }).catch(() => null),
    ]);
    if (!pageRes.ok) return pageRes;
    const l = listRes?.ok ? await listRes.json().catch(() => null) : null;
    const places = l?.list_restaurants?.length || 0;
    const owner = l?.profiles?.username ? `@${l.profiles.username}` : l?.profiles?.display_name;
    const title = l ? l.title : "A list on yummers";
    const description = !l ? "A list of places to eat in Cambodia, shared from yummers."
        : `List${owner ? ` by ${owner}` : ""} · ${places} ${places === 1 ? "place" : "places"}`;
    const photo = l && listImage(l);
    const image = photo || SHARE_IMAGE;
    const canonical = `https://yummersapp.com/l/${id}${l ? `/${slugify(l.title)}` : ""}`;
    const tags = [
        ["property", "og:type", "website"], ["property", "og:site_name", "yummers"],
        ["property", "og:title", title], ["property", "og:description", description],
        ["property", "og:url", canonical], ["property", "og:image", image],
        ...(photo ? [] : [["property", "og:image:width", "600"], ["property", "og:image:height", "600"]]),
        ["name", "twitter:card", "summary"], ["name", "twitter:title", title],
        ["name", "twitter:description", description], ["name", "twitter:image", image],
    ].map(([k, n, v]) => `<meta ${k}="${n}" content="${esc(v)}">`).join("\n  ");
    const html = (await pageRes.text())
        .replace(/<title>[^<]*<\/title>/, () => `<title>${esc(title)}</title>`)
        .replace(/<meta name="description" content="[^"]*">/, () => `<meta name="description" content="${esc(description)}">`)
        .replace("</head>", () => `  ${tags}\n</head>`);
    return new Response(html, { headers: {
        "Content-Type": "text/html; charset=utf-8",
        // Five minutes, so a list made private stops previewing quickly. A failed lookup isn't kept.
        "Cache-Control": listRes?.ok ? "public, max-age=300" : "no-store",
    } });
}

async function route(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/api/signup" && request.method === "POST") return signup(request, env);
    if (url.pathname === "/api/confirm") return confirm(request, env, ctx, url);
    if (url.pathname === "/api/unsubscribe") return unsubscribe(request, env, url);
    // The app starts Google sign-in here so iPhone's "wants to use … to Sign In"
    // names yummersapp.com, not the database (yummers#543). Only our two
    // projects, so it can't send anyone anywhere else.
    const signin = url.pathname.match(/^\/signin\/(mbuxxkchudopmpihrakk|uobskavqhilnqakbdutt)$/);
    if (signin) return Response.redirect(`https://${signin[1]}.supabase.co/auth/v1/authorize${url.search}`, 302);
    const cached = url.pathname.match(/^\/catalogue\/(mbuxxkchudopmpihrakk|uobskavqhilnqakbdutt)$/);
    if (cached) return catalogue(request, cached[1], ctx);
    const list = url.pathname.match(/^\/l\/([0-9A-Za-z]{8})(?:\/[^/]*)?\/?$/);
    if (list && ["GET", "HEAD"].includes(request.method)) return sharedList(url, list[1]);
    if (/^\/(p\/|sitemap-places\.xml$)/.test(url.pathname) && ["GET", "HEAD"].includes(request.method)) {
        const page = await places(url, ctx, env.CF_VERSION_METADATA?.id);
        if (page) return page;
    }
    if (/^\/(guides|places)(\/|$)/.test(url.pathname) && ["GET", "HEAD"].includes(request.method)) {
        const page = await guides(url, ctx, env.CF_VERSION_METADATA?.id);
        if (page) return page;
    }
    const wantsMarkdown = (request.headers.get("Accept") || "").includes("text/markdown");

    if (wantsMarkdown && url.pathname === "/") {
        const llms = await fetch(new URL("/llms.txt", url));
        return markdown(await llms.text(), llms.status);
    }

    const res = await fetch(request);
    if (url.pathname === "/sitemap.xml") return sitemap(res);
    // Share links (/l/...) are rendered by 404.html, so they arrive as 404s
    // but are real pages.
    if (wantsMarkdown && res.status === 404 && !url.pathname.startsWith("/l/")) {
        return markdown(NOT_FOUND, 404);
    }
    const out = new Response(res.body, res);
    out.headers.append("Vary", "Accept");
    return out;
}

export default {
    async fetch(request, env, ctx) {
        const res = await route(request, env, ctx);
        const out = new Response(res.body, res);
        for (const [name, value] of Object.entries(SECURITY_HEADERS)) out.headers.set(name, value);
        return out;
    },
};
