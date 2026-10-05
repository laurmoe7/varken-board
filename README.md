# Varken board 🐷

A cute, dark idea-and-fix board for all my projects: Pet Shopper, funFX, Pathfinder sheet and whatever comes next.

- Quick capture with shorthand: `#funfx glow looks flat !now :bug` (`#project`, `!now|!soon|!someday`, `:idea|:fix|:bug`).
- Projects in the sidebar, items grouped by priority, status Open / Doing / Done.
- Attach images: paste with Ctrl+V, drop them on the page, or pick files. They are shrunk to 1600 px.
- Everything is saved in the browser (IndexedDB). Optional sync to a private GitHub data repo keeps a backup and lets Claude read the board.
- **Copy for Claude** turns the open items of a project into a task list to paste into a session.
- The panel on the right opens as you type a new item, so labels, notes and images go in the first time (Tab jumps to notes, Ctrl+Enter adds).
- Draw on screenshots (pen, arrow, circle, box) before keeping them.
- Drag cards to put them in order, or into another priority group. Alt+arrow keys do the same.
- A project can have a picture gallery (Pet Shopper has Cosmetics): a big-picture grid kept apart from the to-do list.
- Keys: `N` new item, `/` search, `Esc` close.

Plain web app, no build step, no dependencies. Open it over http (for example `python3 -m http.server`) or from GitHub Pages. `npm test` runs the logic and sync tests.

## Sync setup

1. Make a **private** repo for the data (for example `varken-data`, with a README so it has a first commit).
2. GitHub, Settings, Developer settings, Fine-grained tokens: a token for **only that repo**, with **Contents: Read and write**.
3. In the board: gear button, paste `owner/repo` and the token, Save and sync.

The sync writes `data.json` (the board), `BOARD.md` (readable backlog, open items by project and priority) and `images/<id>.jpg`.
