// The Melbourne confirmed page's share button (the Worker's page(), which can't
// carry an inline script): the phone's share sheet, else copy the invite link.
(function () {
    var button = document.getElementById("invite-share");
    if (!button) return;
    button.addEventListener("click", function () {
        var link = button.dataset.link;
        if (navigator.share) return navigator.share({ url: link }).catch(function () {});
        navigator.clipboard.writeText(link).then(function () { button.textContent = "Link copied"; });
    });
})();
