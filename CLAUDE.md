# Varken board (a pig; "varken" is Dutch for pig)

Lauren's idea-and-fix board for all her projects (Pet Shopper, funFX, Pathfinder sheet, more later). Owner: Lauren (GitHub laurmoe7), based in Europe. She uses it on a laptop in Chrome, so it is built for typing and keyboard use. Private tool, not for release.

## How to work with Lauren

- She wants honest, unflattering feedback. Don't flatter; say when something looks bad or is a weak idea.
- Cute and sweet, dark only (no light mode). It is deliberately not the Nibble look: night-purple, pastel accents, rounded cards.
- Work on the session branch. Changes go live only when she says "big push": run `npm test`, then push to `main` (no pull request); the Pages workflow tests and deploys.
- Keep files focused: `logic.js` rules (testable, no DOM), `store.js` IndexedDB, `sync.js` GitHub sync, `app.js` page code. Start a new `app-*.js` file when a topic needs one (add it to `index.html` and the workflow's file copy if it is not `*.js`).

## How it works

- Plain web app, no build, no dependencies. Scripts share one scope and load in the order in `index.html`.
- State (`state`: `projects`, `items`, `images` metadata) is saved whole in IndexedDB `meta/state`; image Blobs are in `images/<id>`. Images are shrunk to 1600 px JPEG on the way in (`processImage`).
- Items and projects carry `updated`; merging keeps the newer copy per id (`L.mergeStates`). Deleting sets `deleted: true` (a tombstone) so deletes sync. Always call `touch(obj)` when changing one.
- Sync (`sync.js`) is optional: a fine-grained token for one private data repo, kept in `localStorage` `varken-sync`. It writes `data.json`, `BOARD.md` and `images/<id>.jpg` through the contents API. `tests/sync.test.js` runs it against a fake GitHub.
- Quick-add shorthand lives in `L.parseQuick`.

## Reading and updating the board from a session

If the data repo is attached to the session, read `BOARD.md` for the open items (and `data.json` for everything). To mark an item done, edit its object in `data.json`: set `status` to `"done"` and `updated` to the current time in milliseconds (`Date.now()`), so the newer copy wins on the next sync. Never remove items; set `deleted: true` instead.
