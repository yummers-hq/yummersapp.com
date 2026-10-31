// PostHog (EU) with a cookie banner (spec D56 §3, #571). Until a visitor presses
// Accept, and after Decline, PostHog runs cookieless: it sets no cookie and writes
// nothing to localStorage, and each visit counts on its own. Accept lets it set its
// cookie, so a returning visitor is recognised. The only thing we remember
// ourselves is the choice, under CHOICE. The key is PostHog's public write-only key.
// Pinned to posthog-js 1.444.0 (static/<version>/array.js on PostHog's asset host).
!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/1.444.0/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],Object.defineProperty(u,"toString",{configurable:!0,enumerable:!0,writable:!0,value:function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e}}),Object.defineProperty(u.people,"toString",{configurable:!0,enumerable:!0,writable:!0,value:function(){return u.toString(1)+".people (stub)"}}),o="init capture opt_in_capturing opt_out_capturing clear_opt_in_out_capturing reset".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);

(function () {
    var CHOICE = "yummers-cookies"; // our own remembered choice: "accepted" or "declined"
    var text = {
        en: { msg: "We use cookies to see how people use this site.", accept: "Accept", decline: "Decline", label: "Cookies", settings: "Cookie settings" },
        km: { msg: "យើងប្រើខូគីដើម្បីមើលថាមនុស្សប្រើគេហទំព័រនេះយ៉ាងដូចម្តេច។", accept: "យល់ព្រម", decline: "បដិសេធ", label: "ខូគី", settings: "ការកំណត់ខូគី" },
        fr: { msg: "Nous utilisons des cookies pour voir comment ce site est utilisé.", accept: "Accepter", decline: "Refuser", label: "Cookies", settings: "Paramètres des cookies" }
    };
    var root = document.documentElement, banner;

    function get() { try { return localStorage.getItem(CHOICE); } catch (e) { return null; } }
    function set(v) { try { localStorage.setItem(CHOICE, v); } catch (e) { } }

    // Pages without the language switch still follow the language picked on the homepage.
    function lang() {
        if (text[root.lang] && root.lang !== "en") return root.lang;
        try { var l = localStorage.getItem("hr-lang"); if (text[l]) return l; } catch (e) { }
        return "en";
    }

    // /l/{id}/{list name}: only the id is sent, never the list's name (in a URL or a page title).
    function scrub(value) {
        if (typeof value === "string") return value.replace(/(\/l\/[0-9A-Za-z]{8})\/[^?#\s]*/g, "$1");
        if (value && typeof value === "object") {
            Object.keys(value).forEach(function (k) {
                if ((k === "title" || k === "$title") && location.pathname.indexOf("/l/") === 0) delete value[k];
                else value[k] = scrub(value[k]);
            });
        }
        return value;
    }

    posthog.init("phc_tnYLwb3uLXHAE6V6DG4Yb7u6bjt3DwbgX5sLmDtVYXsh", {
        api_host: "https://eu.i.posthog.com",
        defaults: "2026-08-30",
        cookieless_mode: "on_reject",
        opt_out_capturing_by_default: true, // no choice yet counts as declined: cookieless
        autocapture: false,
        disable_session_recording: true,
        disable_surveys: true,
        advanced_disable_flags: true, // no feature flags; also keeps /l/ list names out of the flags request
        capture_dead_clicks: false,
        capture_performance: false,
        capture_pageleave: false,
        before_send: scrub
    });

    function render() {
        var t = text[lang()];
        banner.setAttribute("aria-label", t.label);
        banner.querySelector("p").textContent = t.msg;
        banner.querySelector("[data-accept]").textContent = t.accept;
        banner.querySelector("[data-decline]").textContent = t.decline;
        document.querySelectorAll("[data-cookie-settings]").forEach(function (a) { a.textContent = t.settings; });
        reserve();
    }

    // Keep the footer reachable: the page gets as much room at the bottom as the banner takes.
    function reserve() { document.body.style.paddingBottom = banner.hidden ? "" : banner.offsetHeight + "px"; }

    function close(choice) {
        if (choice === "accepted") posthog.opt_in_capturing({ captureEventName: false });
        else if (get() === "accepted") { posthog.opt_out_capturing(); posthog.clear_opt_in_out_capturing(); posthog.reset(); }
        set(choice);
        banner.hidden = true;
        reserve();
        var back = document.querySelector("[data-cookie-settings]");
        if (back && banner.contains(document.activeElement)) back.focus();
    }

    function open() {
        banner.hidden = false;
        reserve();
        banner.querySelector("[data-accept]").focus();
    }

    function build() {
        banner = document.createElement("div");
        banner.className = "cookie-banner";
        banner.setAttribute("role", "region");
        banner.innerHTML = '<p></p><div class="cookie-actions"><button type="button" data-accept></button><button type="button" data-decline></button></div>';
        banner.hidden = !!get();
        document.body.appendChild(banner);
        banner.querySelector("[data-accept]").addEventListener("click", function () { close("accepted"); });
        banner.querySelector("[data-decline]").addEventListener("click", function () { close("declined"); });
        render();
        new MutationObserver(render).observe(root, { attributes: true, attributeFilter: ["lang"] });
        addEventListener("resize", reserve);
    }

    document.addEventListener("click", function (e) {
        var a = e.target.closest && e.target.closest("a");
        if (!a) return;
        if (a.hasAttribute("data-cookie-settings")) { e.preventDefault(); open(); return; }
        if (/^https?:$/.test(a.protocol) && a.host !== location.host) {
            posthog.capture("outbound_clicked", { target: a.hostname.replace(/^www\./, "") });
        }
    });

    if (document.body) build(); else document.addEventListener("DOMContentLoaded", build);
})();
