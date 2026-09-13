# pharmasnap.app

The public site for PharmaSnap.AI: a homepage plus the privacy policy and terms
Apple fetches during App Store review.

Plain static files, no build step. Served by GitHub Pages at https://pharmasnap.app.

- `/privacy` and `/terms` must keep returning 200 with a body — App Review fetches them.
- `.nojekyll` is load-bearing: without it Jekyll drops `_style.css` and `_home.css`.
- Source of truth is `web/` in the private app repo; copy changes across from there.

Deployed via GitHub Pages; DNS at GoDaddy (four A records + www CNAME).
