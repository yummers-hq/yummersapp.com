// Shared lists (D40): GitHub Pages serves this page for any path it doesn't
// have, so /l/{shareId}/{slug} lands here. The list is read with the PUBLIC
// anon key, through shared_list(), which returns it only if its owner made it public.
// Everything user-written is inserted as text, never as HTML.
(function () {
  var SUPABASE = "https://uobskavqhilnqakbdutt.supabase.co";
  var ANON = "sb_publishable_lHMGFti9a7-RxGHVj2Iz-g_wXFZoMC7";
  // The app's list colours (theme.ts listColours, D101).
  var COLOURS = { terracotta: "#B8401E", forest: "#1E6A44", blue: "#3B5BA9", ochre: "#9A4B06", plum: "#7A4E9C", teal: "#2F7D78", rose: "#A63A5C", charcoal: "#2C2420" };
  var $ = function (id) { return document.getElementById(id); };
  function slugify(t) {
    var s = t.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/['’]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60).replace(/-+$/, "");
    return s || "list";
  }
  function text(tag, cls, t) { var e = document.createElement(tag); if (cls) e.className = cls; e.textContent = t; return e; }
  // A picture over its placeholder; a broken file just leaves the placeholder showing.
  function img(box, src) {
    if (!/^https:\/\//.test(src || "")) return;
    var i = document.createElement("img");
    i.alt = ""; i.loading = "lazy"; i.referrerPolicy = "no-referrer"; i.onerror = function () { i.remove(); };
    i.src = src; box.appendChild(i);
  }
  // A place's resolved picture (0084): a Google cover has its url, a person's photo is built from its ids.
  function picUrl(p) {
    if (!p) return "";
    if (p.kind === "cover") return p.url;
    return p.kind === "photo" && p.userId && p.id ? SUPABASE + "/storage/v1/object/public/photos/" + encodeURIComponent(p.userId) + "/" + encodeURIComponent(p.id) + "_thumb.jpg" : "";
  }
  function picture(box, p) { img(box, picUrl(p)); }
  function face(url, handle) { var f = text("span", "face", (handle.replace("@", "").charAt(0) || "?").toUpperCase()); img(f, url); return f; }
  // The app's cover order: the uploaded cover, the cover place's picture, the colour and emoji, a mosaic of the first places.
  function renderCover(l, items) {
    var c = $("cover"), cp = items.filter(function (it) { return it.id === l.cover_restaurant_id; })[0];
    c.hidden = false;
    if (l.cover_url) { img(c, l.cover_url); }
    else if (cp && picUrl(cp.picture)) { picture(c, cp.picture); }
    else if (l.colour && COLOURS[l.colour]) { c.style.background = COLOURS[l.colour]; c.textContent = l.emoji || ""; c.classList.add("tile"); }
    else {
      c.classList.add("mosaic");
      items.slice(0, 4).forEach(function (it) { var q = document.createElement("span"); picture(q, it.picture); c.appendChild(q); });
      if (!c.firstChild || !c.querySelector("img")) { c.className = "cover tile"; c.textContent = l.emoji || (l.title || "?").charAt(0).toUpperCase(); }
    }
  }
  function show(title, message) {
    $("title").textContent = title; document.title = title + " · yummers";
    if (message) { $("state").textContent = message; $("state").hidden = false; $("ways").hidden = false; }
  }
  var m = /^\/l\/([0-9A-Za-z]{8})(?:\/[^/]*)?\/?$/.exec(location.pathname);
  if (!m) { show("Page not found", "That page doesn't exist. Head back to the home page."); return; }
  var id = m[1];
  // shared_list() (app migration 0066) returns one public list by its share id,
  // in the shape below, or null. It also opens lists by people who approve who
  // follows them, whose lists the plain table read no longer returns (D107).
  fetch(SUPABASE + "/rest/v1/rpc/shared_list", { method: "POST", headers: { apikey: ANON, Authorization: "Bearer " + ANON, "Content-Type": "application/json" }, body: JSON.stringify({ p_share_id: id }) })
    .then(function (r) { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
    .then(function (l) {
      // Private and missing read the same, so this page never confirms a list exists.
      if (!l) { show("This list is private or doesn't exist", "Its owner may have made it private."); return; }
      show(l.title);
      if (window.posthog) posthog.capture("shared_list_viewed", { share_id: id });
      var slug = slugify(l.title), want = "/l/" + id + "/" + slug;
      if (location.pathname !== want) history.replaceState(null, "", want);
      var owner = l.profiles || {};
      var who = owner.display_name || (owner.username ? "@" + owner.username : "");
      var items = (l.list_restaurants || []).slice().sort(function (a, b) { return a.position - b.position; });
      var count = items.length + (items.length === 1 ? " place" : " places");
      // 0084 adds cover_restaurant_id (null still sends the key); without it, today's text layout.
      var rich = "cover_restaurant_id" in l;
      document.body.classList.toggle("rich", rich);
      if (rich) {
        var handle = owner.username ? "@" + owner.username : owner.display_name || "";
        var o = $("owner");
        o.appendChild(face(owner.avatar_url, handle)); o.appendChild(text("span", "", handle)); o.hidden = !handle;
        $("by").textContent = "Public · " + count;
        renderCover(l, items);
      } else {
        $("by").textContent = (who ? "A list by " + who + " · " : "") + count;
      }
      if (l.description) { $("desc").textContent = l.description; $("desc").hidden = false; }
      var ol = $("places");
      items.forEach(function (it, i) {
        var r = it.restaurants || {};
        var cuisine = (r.cuisine_type || []).filter(function (c) { return c !== "International"; })[0] || (r.cuisine_type || [])[0] || "";
        var li = document.createElement("li");
        var lead = text("span", "n", String(i + 1));
        if (rich) { lead = text("span", "thumb", (cuisine || r.name || "?").charAt(0).toUpperCase()); picture(lead, it.picture); }
        var body = document.createElement("div");
        body.appendChild(text("div", "name", r.name || "A place"));
        body.appendChild(text("div", "meta", [cuisine, r.district].filter(Boolean).join(" · ")));
        if (it.note) body.appendChild(text("div", "note", "\u201c" + it.note + "\u201d"));
        if (it.picture && it.picture.kind === "photo" && it.picture.by) body.appendChild(text("div", "credit", "Photo by @" + it.picture.by));
        li.appendChild(lead); li.appendChild(body); ol.appendChild(li);
      });
      if (items.length) ol.hidden = false;
    })
    .catch(function () { show("Couldn't load this list", "Check your connection and try again."); });
})();
