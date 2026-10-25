// Shared lists (D40): GitHub Pages serves this page for any path it doesn't
// have, so /l/{shareId}/{slug} lands here. The list is read with the PUBLIC
// anon key; row-level security returns it only if its owner made it public.
// Everything user-written is inserted as text, never as HTML.
(function () {
  var SUPABASE = "https://uobskavqhilnqakbdutt.supabase.co";
  var ANON = "sb_publishable_lHMGFti9a7-RxGHVj2Iz-g_wXFZoMC7";
  var $ = function (id) { return document.getElementById(id); };
  function slugify(t) {
    var s = t.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/['’]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60).replace(/-+$/, "");
    return s || "list";
  }
  function show(title, message) {
    $("title").textContent = title; document.title = title + " · Yummers";
    if (message) { $("state").textContent = message; $("state").hidden = false; }
  }
  var m = /^\/l\/([0-9A-Za-z]{8})(?:\/[^/]*)?\/?$/.exec(location.pathname);
  if (!m) { show("Page not found", "That page doesn't exist. Head back to the home page."); return; }
  var id = m[1];
  var select = "title,description,share_id,profiles!lists_user_id_fkey(username,display_name),list_restaurants(note,position,restaurants(name,district,cuisine_type))";
  fetch(SUPABASE + "/rest/v1/lists?select=" + encodeURIComponent(select) + "&share_id=eq." + id, { headers: { apikey: ANON, Authorization: "Bearer " + ANON } })
    .then(function (r) { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
    .then(function (rows) {
      var l = rows && rows[0];
      // Private and missing read the same, so this page never confirms a list exists.
      if (!l) { show("This list is private or doesn't exist", "Its owner may have made it private."); return; }
      show(l.title);
      var slug = slugify(l.title), want = "/l/" + id + "/" + slug;
      if (location.pathname !== want) history.replaceState(null, "", want);
      var owner = l.profiles || {};
      var who = owner.display_name || (owner.username ? "@" + owner.username : "");
      var items = (l.list_restaurants || []).slice().sort(function (a, b) { return a.position - b.position; });
      $("by").textContent = (who ? "A list by " + who + " · " : "") + items.length + (items.length === 1 ? " place" : " places");
      if (l.description) { $("desc").textContent = l.description; $("desc").hidden = false; }
      var ol = $("places");
      items.forEach(function (it, i) {
        var r = it.restaurants || {};
        var cuisine = (r.cuisine_type || []).filter(function (c) { return c !== "International"; })[0] || (r.cuisine_type || [])[0] || "";
        var li = document.createElement("li");
        var n = document.createElement("span"); n.className = "n"; n.textContent = String(i + 1);
        var body = document.createElement("div");
        var name = document.createElement("div"); name.className = "name"; name.textContent = r.name || "A place";
        var meta = document.createElement("div"); meta.className = "meta"; meta.textContent = [cuisine, r.district].filter(Boolean).join(" · ");
        body.appendChild(name); body.appendChild(meta);
        if (it.note) { var note = document.createElement("div"); note.className = "note"; note.textContent = "“" + it.note + "”"; body.appendChild(note); }
        li.appendChild(n); li.appendChild(body); ol.appendChild(li);
      });
      if (items.length) ol.hidden = false;
    })
    .catch(function () { show("Couldn't load this list", "Check your connection and try again."); });
})();
