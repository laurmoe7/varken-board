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
- Gallery cards can carry a slot tag (Hat, Clothes, Face...) and be filtered by it; each project can set its own slot list.
- Options > Sync and backup can find and delete pictures nothing uses any more.
- Effort: rate a task Easy, Medium or Hard (`~easy` `~medium` `~hard` in the quick line, or the panel). The title takes a colour (mint, butter, coral) and a tag; filter by effort in the header.
- Gallery cards have a ⚖ to pick two to four and compare them big and side by side.
- The pig in the header changes mood with the board (sleeping when clear, worried at too many Nows) and shows up in empty lists.
- A quiet "N unused pictures" button appears in the sidebar.
- Checking something off plays a soft chime and pops confetti (switch off in Options). The details panel slides over the page instead of squeezing the list.
- The mascot is a round squishy pig with a seedling on his head and a task note in his hands. The plant grows with how many things you checked off today (bud, leaves, flower). Click him and he hops, shows off his note, wiggles or sways his plant; he cheers and sends hearts when you check something off, and says so when the whole list is clear.
- The header says how many things you checked off today. `?` opens a shortcut sheet.
- Notes: every project (and All projects) has a 📝 Notes tab beside its to-do list, and each gallery (Cosmetics) has one beside its ideas. Loose thoughts with no categories; "→ Task" or "→ Card" turns one into a real item.
- Clicking anywhere outside the details panel closes it.
- Keys: `N` new item, `/` search, `Esc` close.

Plain web app, no build step, no dependencies. Open it over http (for example `python3 -m http.server`) or from GitHub Pages. `npm test` runs the logic and sync tests.

## Sync setup

1. Make a **private** repo for the data (for example `varken-data`, with a README so it has a first commit).
2. GitHub, Settings, Developer settings, Fine-grained tokens: a token for **only that repo**, with **Contents: Read and write**.
3. In the board: gear button, paste `owner/repo` and the token, Save and sync.

The sync writes `data.json` (the board), `BOARD.md` (readable backlog, open items by project and priority) and `images/<id>.jpg`.
