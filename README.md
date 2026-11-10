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

The owner sign-in links to `/admin/reset.html`. It requests an emailed reset
code for an existing account and exchanges it with Auth's recovery-only OTP
flow. The fresh page also offers “I already have a code” for another browser.
Recovery is memory-only and never grants an owner role. Existing verified
TOTP factors still require a successful challenge and AAL2 before changing a
password. The previous recovery-fragment flow remains supported; callback URLs
are immediately scrubbed, and unsuccessful query callbacks show the code route.
Owner tools continue to enforce their independent owner-account and MFA checks.

`admin/source/recovery-email-template.html` is the reviewed Reset password email
body. Its exact website redirect branch displays the email code and a non-secret
page link; its ELSE branch preserves the existing native app reset link. Keep
the subject and native allowlist unchanged. Publish this template alongside the
code form; do not replace native recovery with an OTP-only global template.

Build the pinned public-client recovery asset with `npm run build:recovery`.
Run `npm run test:recovery` for real-SDK browser checks with synthetic Auth
responses; no real emails, passwords or owner permissions are changed by tests.
The exact live redirect allowlist entry is
`https://pharmasnap.app/admin/reset.html`; existing native app entries remain.

Recovery failures show a static help code and an allowlisted HTTP status. Account-existence errors use the same neutral fallback. Raw error messages, tokens, passwords and email values are never logged or included in diagnostics. A rejected code or HTTP403 does not establish an email mismatch.

## App Store link and promo video

- Every store link points at `https://apps.apple.com/app/id6800983602` (header
  "Get the app", hero badge, closing badge, video end card) and the
  `apple-itunes-app` meta tag shows Safari's banner on iPhone. The listing
  returns 404 until version 1.0 is released in App Store Connect, so publish
  this page after the release.
- `img/app-store-badge.svg` is Apple's official badge from developer.apple.com,
  unaltered. Only its display height is set in CSS (Apple's minimum is 40px).
- `media/pharmasnap-promo.mp4` is the 65-second promo, re-encoded to 720x1280
  H.264 (~5 MB, faststart). `promo.js` loads it only when the hero play button
  is pressed and plays it in a `<dialog>`; without JavaScript the button links
  to the MP4. The play button is placed on the phone in the hero artwork with
  container units in `_illustrations.css`; re-measure if the artwork changes.
