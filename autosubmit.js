// Submits the page's one form on load: the one-tap Melbourne join (cloudflare/worker.js, #201). Mail scanners
// open links but don't run scripts, so only a person's browser joins. A file, not inline: the CSP has no 'unsafe-inline' for scripts.
document.forms[0].submit();
