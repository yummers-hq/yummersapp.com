# yummersapp.com

The public website for **Yummers**, a restaurant discovery app for Cambodia that is still in the making.

The app was called HungryRaccoon until October 2026 (D85). The old domain, hungryraccoonapp.com, forwards here with a Cloudflare redirect rule that keeps the path and query, so share links already sent (`/l/...`) still open (#35). The repo is `yummers-hq/yummersapp.com` (renamed from `hungryraccoon-hq/hungryraccoonapp.com`; GitHub forwards the old address).

This is a plain static page: HTML, CSS, fonts and images, with no build step. It is served by GitHub Pages on `yummersapp.com`. The only server code is the Cloudflare Worker below, which also takes the homepage's beta sign-ups (#32). It has no download links. Visits are counted by Cloudflare Web Analytics (the zone's automatic setup, no cookies) until PostHog replaces it (#51, #2).

The app itself lives in a separate private repository. This repo holds only what the public site needs.

## Editing

Run `npx serve` here and visit http://localhost:3000. Links use clean addresses (`/about`, not `/about.html`), which GitHub Pages and `serve` both resolve to the `.html` file; `python3 -m http.server` doesn't, so links between pages 404 there. The `.html` addresses keep working too. Every push to `main` publishes.

## What's in it

| File | What it is |
|---|---|
| `index.html`, `style.css` | The page |
| `fonts.css`, `assets/font-*.woff2` | DM Sans and Fraunces, from Google Fonts (SIL Open Font License) |
| `assets/logo.png` | The app icon from Khen's brandbook (31 Oct 2026) at 180 px: the iPhone home-screen icon, Google's logo and the sign-up email's logo, which all need a square, solid picture |
| `assets/raccoon.png` | The brandbook's peeking raccoon, see-through, at three times its 58 × 32 size in the header and footer |
| `assets/favicon-192.png` | The browser-tab and Google search icon: the brandbook's app icon at 192 px, because Google only uses icons whose size is a multiple of 48 px and `logo.png` is 180 (#13) |
| `assets/app-*.webp` | Screenshots of the app taken on 19 October 2026 in the iOS Simulator (Expo Go, test database), signed in as made-up demo accounts (`@sophea_eats` and friends) so no real person's data is shown (#33). Resized to 828 px wide. The sign-in screen (`app-signin.webp`) is the owner's own iPhone screenshot from a TestFlight build, because Expo Go can't show Continue with Apple; its status bar was swapped for the Simulator's, and on 31 Oct its old app icon for the brandbook's |
| `i18n.js` | The English / Khmer / French switch on the homepage. English stays in `index.html`; this file holds the Khmer and French, keyed by each element's `data-i18n`, `data-i18n-alt` or `data-i18n-aria`. The choice is kept in `localStorage` on the visitor's device (not a cookie, never sent) and can be linked with `?lang=km` or `?lang=fr`. The Khmer and French were drafted by Claude and need a fluent speaker's review. The privacy and terms pages (#8) and the app screenshots (#9) stay English for now |
| `site.js` | Makes the in-page links (How it works, Take a peek inside, Back to the top) scroll to their section without adding `#preview`, `#launch` and so on to the address bar, while still moving keyboard focus there. The links work as plain anchors without it. On phones it also holds each row of app screenshots in place while scrolling down slides them across (no sideways swipe), unless the visitor asks for less motion |
| `assets/khmer-*.woff2` | Noto Sans Khmer and Noto Serif Khmer, from Google Fonts (SIL Open Font License). `unicode-range` means they download only when Khmer text is on screen |
| `CNAME` | Tells GitHub Pages the custom domain |
| `about.html`, `contact.html` | About and Contact pages, in the same layout as the privacy policy and terms. AI assistants look for these (with the privacy policy) to check a business is real. English only for now, like the legal pages |
| `llms.txt` | A plain-text summary for AI assistants ([llmstxt.org](https://llmstxt.org/) format), including when to suggest Yummers and when not to. Keep it in step with the About page |
| `check.mjs` | `node check.mjs` checks the live site (or `node check.mjs http://localhost:3000`): `llms.txt`, the About and Contact pages, the homepage's Organization data, that the About page's FAQ data matches its questions, the sitemap, footer links, the Worker's Markdown responses and its security headers |

## The Cloudflare Worker

The domain's DNS is on Cloudflare, which sits in front of GitHub Pages (#22). `cloudflare/worker.js` runs on every request and changes only what AI agents asking for Markdown (`Accept: text/markdown`) get: the homepage as `llms.txt`, and unknown addresses as a short Markdown "not found" page with a link to `llms.txt`. Both carry `Vary: Accept`. Browsers get the same pages as before, and share links (`/l/...`) are never touched. It's deployed by hand: `cd cloudflare && npx wrangler deploy` (needs `npx wrangler login` on the Cloudflare account). A push to `main` doesn't deploy it.

It also answers `POST /api/signup`, the homepage's beta sign-up form (#32): it checks the Cloudflare Turnstile token (and that it was issued on yummersapp.com), then emails a short note from Sovithyea (`sovithyea@mail.yummersapp.com`, replies to hello@) with a link to confirm the address, in the language the page was showing (English, Khmer or French). Nothing joins the list until that link is used (#46). The link (`/api/confirm?token=…`) opens a page that asks first, because mail scanners open links; its button saves the email as a Resend contact in one segment, and a new contact gets a short welcome note; joining again sends nothing. Pending sign-ups wait in the `SIGNUPS` Workers KV namespace for 7 days, and one address gets at most one confirm email a day however often the form is sent. `node cloudflare/signup.test.mjs` runs the whole flow with Turnstile, Resend and KV faked. The welcome note's unsubscribe link (`/api/unsubscribe?id=<Resend contact id>`) opens a page that asks first, because mail scanners open links; the button deletes the contact from Resend. Both notes end with Sovithyea's handwritten signature and a cream strip with the banner and social icons (#53; the images are `assets/email-signature.png`, `assets/email-banner.png` and `assets/email-<instagram|tiktok|facebook|linkedin>.png`, the footer's icons as PNGs because Gmail drops SVG, so don't rename them), and have no List-Unsubscribe header, so Gmail treats them as personal mail. It needs three secrets, `RESEND_API_KEY`, `TURNSTILE_SECRET` and `SEGMENT_ID` (set each with `npx wrangler secret put <NAME>`), and the Turnstile site key goes in `index.html`'s `data-sitekey`. Deploy the Worker before the form goes live, or sign-ups fail.

Every answer also carries security headers (#48): a Content-Security-Policy that allows only the site's own files, Cloudflare Turnstile, Cloudflare Web Analytics' script and the Supabase project the share page reads (change it there when share links move to beta, #224), plus HSTS, `nosniff`, a referrer policy and no framing. Scripts must be files, not inline: the share page's script is `share.js` for that reason. Load every page with the browser console open after changing what a page loads.

The Organization data has no postal `address` until the company is registered.

## October 2026 website refresh

The homepage now uses the welcome screen and adds neighbourhood and cuisine previews. Ratings are labelled as in the test build, verified against `RateSheet.tsx`, `useRating.ts`, and `RestaurantScreen.tsx` in the app repository. Search and sign-in copy was checked against `SearchScreen.tsx` and `AuthSheet.tsx`. Lists and friends remain marked coming soon. Only the public website was changed. The moving ticker uses a filled, asymmetric starburst drawn in SVG.

## Social icons

The footer uses locally hosted brand SVGs from [Font Awesome Free 6](https://github.com/FortAwesome/Font-Awesome/tree/6.x/svgs/brands), replacing hand-drawn approximations. License and attribution are included in `assets/social/LICENSE.txt`.
