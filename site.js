// In-page links (How it works, Back to the top, ...)
// scroll to their section without adding #preview, #launch and so on to the
// address bar, so the link stays yummersapp.com/ (plus ?lang= when a
// language is picked). Without this script the links still work as normal
// anchors.
(function () {
    function go(target) {
        if (!target) {
            window.scrollTo({ top: 0 });
            return;
        }
        // #main (Back to the top, the skip link) starts below the header, so go to the very top.
        if (target.id === "main") window.scrollTo({ top: 0 });
        else target.scrollIntoView();
        // Move keyboard focus too, as following a real anchor would, so the
        // skip link and Back to the top still help keyboard and screen reader users.
        if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
    }

    document.addEventListener("click", function (e) {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        var link = e.target.closest && e.target.closest('a[href^="#"]');
        if (!link) return;
        var id = link.getAttribute("href").slice(1);
        var target = id ? document.getElementById(id) : null;
        if (id && !target) return;
        e.preventDefault();
        go(target);
    });

    // A link from another page (/#launch, an old shared link) lands on its section; the # is then dropped from the
    // address bar. This script runs before the browser's own jump to the #, and
    // dropping it cancels that jump, so scroll here instead.
    if (location.hash) {
        var landing = document.getElementById(location.hash.slice(1));
        history.replaceState(null, "", location.pathname + location.search);
        if (landing) go(landing);
    }
})();

// Homepage: the Android list form. Turnstile loads only when the visitor first touches the form
// (#132): its frame logs CSP errors under Cloudflare's own policy, so a page that is only read
// logs nothing. Explicit render, since inline script is banned.
(function () {
    var form = document.getElementById("signup");
    if (!form) return;
    var error = form.querySelector(".signup-error");
    form.addEventListener("focusin", function load() {
        form.removeEventListener("focusin", load);
        var box = form.querySelector(".cf-turnstile");
        var api = document.createElement("script");
        api.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        api.onload = function () {
            window.turnstile.render(box, { sitekey: box.dataset.sitekey, size: "flexible", theme: "auto", appearance: "always" });
        };
        document.head.appendChild(api);
    });
    form.addEventListener("submit", function (e) {
        e.preventDefault();
        var button = form.querySelector("button");
        button.disabled = true;
        error.hidden = true;
        var body = new FormData(form);
        body.set("lang", document.documentElement.lang); // the confirmation email's language
        fetch(form.action, { method: "POST", body: body })
            .then(function (res) {
                if (!res.ok) throw new Error(res.status);
                form.querySelector(".signup-fields").hidden = true;
                form.querySelector(".signup-done").hidden = false;
            })
            .catch(function () {
                error.hidden = false;
                button.disabled = false;
                // A Turnstile token works once, so get a fresh one for the retry.
                if (window.turnstile) window.turnstile.reset();
            });
    });
})();

// /beta: the top is the iPhone version in the HTML. Android phones get the Android waitlist form, and
// computers (not Android, not iPhone or iPad) get the TestFlight QR code. The links swap the version.
(function () {
    var ios = document.getElementById("join-ios");
    if (!ios) return;
    var parts = ["join-ios", "join-android", "join-desktop"];
    function show(id) {
        parts.forEach(function (p) { document.getElementById(p).hidden = p !== id; });
    }
    var ua = navigator.userAgent;
    var apple = /iPhone|iPad|iPod/.test(ua) || (/Mac/.test(navigator.platform) && navigator.maxTouchPoints > 1); // iPadOS says Mac
    if (/Android/i.test(ua)) show("join-android");
    else if (!apple && !/Mobi/i.test(ua)) show("join-desktop");
    document.querySelectorAll("[data-show]").forEach(function (link) {
        link.addEventListener("click", function (e) {
            e.preventDefault();
            show(link.dataset.show);
        });
    });
})();

// On narrow screens each row of phones swipes sideways; the dots under it show
// which phone is in view (hidden by CSS on wider screens, where nothing scrolls). A row of one phone has nothing to slide.
(function () {
    document.querySelectorAll(".onboarding-screens").forEach(function (row) {
        var figures = row.querySelectorAll("figure");
        if (figures.length < 2) return;
        var dots = document.createElement("div");
        dots.className = "screen-dots";
        dots.setAttribute("aria-hidden", "true");
        figures.forEach(function () { dots.appendChild(document.createElement("span")); });
        row.after(dots);
        function update() {
            var step = figures[1].offsetLeft - figures[0].offsetLeft;
            // The last phone can't snap to the left edge, so reaching the end means the last dot.
            var atEnd = row.scrollLeft >= row.scrollWidth - row.clientWidth - 2;
            var current = atEnd ? figures.length - 1 : Math.round(row.scrollLeft / step);
            dots.childNodes.forEach(function (dot, i) { dot.classList.toggle("on", i === current); });
        }
        row.addEventListener("scroll", update, { passive: true });
        update();
        pinWhileScrolling(row, dots);
    });

    // On phones the row holds still in the middle of the screen while scrolling
    // down slides its phones in from the right; after the last one the page
    // carries on. The track is as tall as the slide is long, so a finger only
    // ever moves down. Desktop, and anyone who asks for less motion, keep the plain row.
    function pinWhileScrolling(row, dots) {
        var phone = matchMedia("(max-width: 700px) and (prefers-reduced-motion: no-preference)");
        var track = document.createElement("div");
        var pin = document.createElement("div");
        track.className = "screen-track";
        pin.className = "screen-pin";
        row.before(track);
        track.appendChild(pin);
        pin.append(row, dots);
        var distance = 0, top = 0, SLOW = 3; // px scrolled down per px slid sideways

        function layout() {
            track.classList.toggle("pinned", phone.matches);
            if (!phone.matches) { track.style.height = pin.style.top = ""; return; }
            distance = row.scrollWidth - row.clientWidth;
            top = Math.max(0, (innerHeight - pin.offsetHeight) / 2);
            pin.style.top = top + "px";
            track.style.height = pin.offsetHeight + distance * SLOW + "px";
            slide();
        }

        function slide() {
            if (!phone.matches || !distance) return;
            var moved = top - track.getBoundingClientRect().top;
            row.scrollLeft = Math.min(distance, Math.max(0, moved / SLOW));
        }

        addEventListener("scroll", slide, { passive: true });
        addEventListener("resize", layout);
        phone.addEventListener("change", layout);
        row.querySelectorAll("img").forEach(function (img) { img.addEventListener("load", layout); });
        layout();
    }
})();

// Launch video: swap the poster for the player on click, so nothing loads until asked
document.querySelectorAll(".video-play").forEach(function (b) {
    b.addEventListener("click", function () {
        var box = document.createElement("div");
        box.className = "player";
        var v = document.createElement("video");
        v.src = b.dataset.video; v.controls = true; v.autoplay = true; v.playsInline = true;
        v.setAttribute("aria-label", b.getAttribute("aria-label")); // already in the chosen language
        box.appendChild(v);
        b.replaceWith(box);
        v.focus();
    });
});
