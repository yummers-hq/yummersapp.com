// Light/dark theme for every page. Loaded in <head> without defer, so data-theme
// is set before first paint and the page never flashes the wrong theme (the
// site's CSP rules out an inline script). The visitor's own choice, if any, is
// kept in localStorage on their device (never sent); otherwise the OS setting.
(function () {
    var root = document.documentElement, KEY = "yummers-theme";
    function set(theme) {
        root.dataset.theme = theme;
        document.querySelectorAll(".theme-toggle").forEach(function (b) { b.setAttribute("aria-pressed", theme === "dark"); });
        // Screenshots with a dark version swap to it; dark files download only when needed.
        document.querySelectorAll("img[data-dark]").forEach(function (img) { img.src = img.dataset[theme]; });
        // The hero clip swaps the same way, its poster being the clip's first frame (same name, .webp).
        // With reduced motion it stays on that still.
        document.querySelectorAll("video[data-dark]").forEach(function (v) {
            if (matchMedia("(prefers-reduced-motion: reduce)").matches) { v.removeAttribute("autoplay"); v.pause(); }
            if (!v.src.endsWith(v.dataset[theme])) v.src = v.dataset[theme];
            v.poster = v.dataset[theme].replace(".mp4", ".webp");
        });
    }
    var saved;
    try { saved = localStorage.getItem(KEY); } catch (e) { }
    root.dataset.theme = saved === "light" || saved === "dark" ? saved : matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    document.addEventListener("DOMContentLoaded", function () { set(root.dataset.theme); });
    root.classList.add("js");
    document.addEventListener("click", function (e) {
        if (!e.target.closest(".theme-toggle")) return;
        var next = root.dataset.theme === "dark" ? "light" : "dark";
        set(next);
        try { localStorage.setItem(KEY, next); } catch (e) { }
    });

    // The round menu button (style.css, .menu): the circle grows from the button; Esc and links close it,
    // Tab stays inside it, focus goes to the first link and back to the button, and the page behind can't scroll.
    document.addEventListener("DOMContentLoaded", function () {
        var btn = document.querySelector(".burger"), menu = document.getElementById("menu");
        if (!btn || !menu) return;
        var label = btn.getAttribute("aria-label");
        function focusables() { return Array.prototype.slice.call(document.querySelectorAll(".header a, .header button, .menu a, .menu button")); }
        function toggle(open, refocus) {
            if (open) {
                var r = btn.getBoundingClientRect();
                menu.style.setProperty("--cx", r.left + r.width / 2 + "px");
                menu.style.setProperty("--cy", r.top + r.height / 2 + "px");
            }
            root.classList.toggle("menu-open", open);
            btn.setAttribute("aria-expanded", open);
            btn.setAttribute("aria-label", open ? "Close menu" : label);
            if (open) menu.querySelector("a").focus({ preventScroll: true });
            else if (refocus) btn.focus({ preventScroll: true });
        }
        btn.addEventListener("click", function () { toggle(!root.classList.contains("menu-open"), true); });
        // A link closes the menu and goes on to its page (or, for a #section, scrolls the page behind).
        document.addEventListener("click", function (e) { if (e.target.closest(".header a, .menu a")) toggle(false); });
        document.addEventListener("keydown", function (e) {
            if (!root.classList.contains("menu-open")) return;
            if (e.key === "Escape") return toggle(false, true);
            if (e.key !== "Tab") return;
            var f = focusables(), first = f[0], last = f[f.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        });
    });
})();
