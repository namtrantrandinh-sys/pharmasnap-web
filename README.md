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

`preview.html` demonstrates conversation, selected documents, ingredient-panel
checks and pharmacy availability. There are 11 written/spoken sample languages:
English, Vietnamese, Mandarin Chinese, Arabic, Hindi, Greek, Italian, Filipino,
Nepali, Korean and Spanish. The homepage’s 29-language claim refers to the app.

`demo-samples.js` contains conversational, native-script sample wording and its
language-specific neural voice. The 44 recordings read the matching responses;
`audio/manifest.json` records script and audio hashes so the browser checks catch
stale or mismatched recordings. Written and spoken languages can differ. Arabic
answers use right-to-left text. Audio starts only on a click and is cancelled on
screen/language/selection changes or when the page is hidden.

No microphone, camera, health records or live AI service are used in the website
walkthroughs. Separate written/spoken controls and the saved-document tray remain
identified as proposed controls. The stock example uses fictional pharmacies,
distances and availability. Unknown product inputs never receive invented stock.

### Regenerating sample speech

Development-only dependency: `edge-tts==7.2.8`. Run
`python3 scripts/generate-samples.py` from the repository root, with Node.js and
that Python package available. The generator uses Microsoft Edge neural speech
at a natural pace (rate -3%), saves MP3s, and records the exact text/audio hashes.
It retries failed clips, saves progress and reuses only recordings whose voice,
script and audio hashes still match. Regenerate affected recordings whenever a
response changes. The deployed website plays bundled files and never connects
visitors to the speech-generation service.

## Browser checks

The site remains static and needs no build or runtime dependencies. Development
checks require Node.js and Google Chrome:

```sh
npm ci
npm test
```

The test starts a temporary local server and checks desktop/tablet/mobile widths,
all sample and language combinations with actual audio playback, translated
answers, selected documents, stopping/replaying, navigation, visibility changes,
completion and audio-error recovery. Set `PHARMASNAP_SCREENSHOTS_DIR` to save
optional screenshots.


## Ingredient and stock workflows

The homepage makes ingredient checks for gluten/coeliac needs, declared allergens
and vegan preferences prominent, and explains exact-brand/product lookup. The
illustrative ingredient panel deliberately lists wheat flour, milk powder and
gelatine plus a “may contain peanuts” statement. The walkthrough highlights
these and distinguishes declared ingredients from cross-contact uncertainty;
it does not certify allergen-free, gluten-free or vegan suitability. Its optional
brand lookup prepares an external manufacturer-information search and clears
that link when the visitor edits the product.

The pharmacy story is photo-or-text identification followed by nearby availability
in one app view. The former Google pharmacy-search form has been removed. The
website walkthrough offers two prepared products (paracetamol and vitamin D),
with clearly labelled fictional pharmacies and confirmed/listed/out/unknown
availability states. The prepared-photo button illustrates the app entry point;
it does not access a camera, recognise uploaded photos, or query real inventory.
