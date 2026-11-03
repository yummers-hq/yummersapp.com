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
    document.addEventListener("click", function (e) {
        if (!e.target.closest(".theme-toggle")) return;
        var next = root.dataset.theme === "dark" ? "light" : "dark";
        set(next);
        try { localStorage.setItem(KEY, next); } catch (e) { }
    });
})();
