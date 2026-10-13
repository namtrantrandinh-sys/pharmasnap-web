# pharmasnap.app

The public site for PharmaSnap.AI: a homepage plus the privacy policy and terms
Apple fetches during App Store review.

Plain static files, no build step. Served by GitHub Pages at https://pharmasnap.app.

- `/privacy` and `/terms` must keep returning 200 with a body — App Review fetches them.
- `.nojekyll` is load-bearing: without it Jekyll drops `_style.css` and `_home.css`.
- Source of truth is `web/` in the private app repo; copy changes across from there.

Deployed via GitHub Pages; DNS at GoDaddy (four A records + www CNAME).


## Interactive website samples

`preview.html` demonstrates conversation, document selection and ingredient
comparison using fixed examples. `demo-samples.js` contains matching English and
Vietnamese text. The answer language controls the visible response; the spoken
language chooses its translated recording in `audio/`. Audio starts only after a
click. Switching screens, changing languages/selections, hiding the page or
pressing Stop cancels playback. These examples do not call a translation/AI API
or access a microphone, camera or health records.

The website samples cover two languages; the homepage's 29-language claim refers
to the app. Separate answer/voice controls and the saved-document tray remain
identified as design proposals.

The six AAC/M4A files were generated from the exact `response` strings using
macOS Karen (English) and Linh (Vietnamese), at 165 words per minute. To regenerate
a file on a Mac with those voices installed, save its response as UTF-8, then run:

```sh
say -v Linh -r 165 -f response.txt -o response.aiff
afconvert -f m4af -d aac -b 64000 response.aiff audio/conversation-vi.m4a
```

Use Karen and the appropriate filename for English. Regenerate the matching audio
whenever a response changes; written and spoken examples must agree.

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


## Product and pharmacy search

The homepage finder accepts a product name and an Australian suburb/postcode.
It prepares Google Maps links for nearby pharmacies and a Google search link
containing the product and location. Nothing is transmitted until the visitor
chooses one of those links. Inputs are not stored and no location permission is
requested. Results are external search results, not verified pharmacy inventory;
visitors are asked to confirm the exact product and stock before travelling.
