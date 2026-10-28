# pharmasnap.app

The public site for PharmaSnap.AI: a homepage plus the privacy policy and terms
Apple fetches during App Store review.

Plain static files, no build step. Served by GitHub Pages at https://pharmasnap.app.

- `/privacy` and `/terms` must keep returning 200 with a body — App Review fetches them.
- `.nojekyll` is load-bearing: without it Jekyll drops `_style.css` and `_home.css`.
- The homepage and interactive samples live in this repository. Legal copy
  originated in `web/` in the private app repo; keep its promises consistent with
  the app’s current behaviour.

Deployed via GitHub Pages; DNS at GoDaddy (four A records + www CNAME).


## Interactive website samples

`preview.html` is a silent design preview with conversation and selected-document
screens. Its English and Vietnamese controls illustrate proposed language choices.
The sphere moves through listening, thinking and speaking states without using a
microphone or generating audio. Document choices are illustrative items; no health
records, uploads, location or AI services are used.

The app supports30 display languages and24 spoken languages. Those app counts do
not describe the preview's two sample-language choices. The preview labels its
proposed controls and never presents them as real medical answers.

The older `demo-samples.js` and44 bundled recordings are retained assets, not the
current preview runtime. `audio/manifest.json` keeps their text/audio hashes. Do
not claim the current preview plays them or regenerates speech.

## Browser checks

The site is static. Development checks need Node.js and Google Chrome:

```sh
npm ci
npm test
```

The test checks the actual illustrated homepage at desktop/tablet/mobile widths,
feature/context claims, the two silent preview states in English/Vietnamese,
completion, stopping, language/navigation/visibility cancellation, document
selection and the absence of audio/uploads/external requests. Retired recording
and script hashes are still checked independently. Set
`PHARMASNAP_SCREENSHOTS_DIR` to save homepage screenshots.

## Ingredient and pharmacy wording

The homepage describes multi-concern ingredient questions and exact-product
evidence, including missing-evidence limits. Nearby pharmacy website listings do
not establish a branch's current stock. Contact the pharmacy about availability.
The website runs no live stock lookup. Older fictional ingredient and pharmacy
samples remain in the retained data/audio assets; they are not interactive modes
in the current public preview.

## Owner password recovery

The owner sign-in links to `/admin/reset.html`. It requests a password-reset
email for the existing PharmaSNAP account; it creates no new account or owner
role. Recovery tokens are accepted only from a recovery fragment, immediately
removed from the URL, and kept in memory. Enrolled accounts must complete their
existing authenticator challenge before a password change. Owner tools continue
to require the usual owner membership and MFA after signing in again.

Build the pinned public-client recovery asset with `npm run build:recovery`.
Run `npm run test:recovery` for real-SDK browser checks with synthetic Auth
responses; no real emails, passwords or owner permissions are changed by tests.
The exact live redirect allowlist entry is
`https://pharmasnap.app/admin/reset.html`; existing native app entries remain.
