# Varken board 🐷

A cute, dark idea-and-fix board for all my projects: Pet Shopper, funFX, Pathfinder sheet and whatever comes next.

- Quick capture with shorthand: `#funfx glow looks flat !now :bug` (`#project`, `!now|!soon|!someday`, `:idea|:fix|:bug`).
- Projects in the sidebar, items grouped by priority, status Open / Doing / Done.
- Attach images: paste with Ctrl+V, drop them on the page, or pick files. They are shrunk to 1600 px.
- Everything is saved in the browser (IndexedDB). Optional sync to a private GitHub data repo keeps a backup and lets Claude read the board.
- **Copy for Claude** (in an item's panel) copies that one item, with its labels, notes and picture names, to paste into a session.
- **🎲 Varken's pick** (header) opens one open item to start with: easy ones first, then the most urgent, within the view you're on.
- The panel on the right opens as you type a new item, so labels, notes and images go in the first time (Tab jumps to notes, Ctrl+Enter adds).
- Draw on screenshots (pen, arrow, circle, box) before keeping them.
- Drag cards to put them in order, or into another priority group. Alt+arrow keys do the same.
- A project can have a picture gallery (Pet Shopper has Cosmetics): a big-picture grid kept apart from the to-do list.
- Gallery cards can carry a slot tag (Hat, Clothes, Face...) and be filtered by it; each project can set its own slot list.
- Options > Sync and backup can find and delete pictures nothing uses any more.
- Effort: rate a task Easy, Medium or Hard (`~easy` `~medium` `~hard` in the quick line, or the panel). The title takes a colour (mint, butter, coral) and a tag; filter by effort in the header.
- The pig in the header changes mood with the board (sleeping when clear, worried at too many Nows) and shows up in empty lists.
- A quiet "N unused pictures" button appears in the sidebar.
- Checking something off plays a soft chime and pops confetti (switch off in Options). The details panel slides over the page instead of squeezing the list.
- The mascot is a round squishy pig with a seedling on his head and a task note in his hands. The plant grows with how many things you checked off today (a bud, then leaves on the 3rd task, a flower bud on the 6th, full bloom on the 9th). Click him and he hops, shows off his note, wiggles or sways his plant; he cheers and sends hearts when you check something off, and says so when the whole list is clear. He also comments, now and then and never in a rush, on what you do (adding, deleting, drawing, syncing...), has catchphrases ("Excuse me!", "Hrrrrng..", "Varken nummer één!") and does a little dance.
- The header says how many things you checked off today. `?` opens a shortcut sheet.
- Notes: every project (and All projects) has a 📝 Notes tab beside its to-do list, and each gallery (Cosmetics) has one beside its ideas. Loose thoughts with no categories; "→ Task" or "→ Card" turns one into a real item.
- Clicking anywhere outside the details panel closes it.
- Every fifth thing you finish in a day is a party: a triumphant fanfare, big confetti and a dance. Poking the pig gives a little oink. From 10 pm to 6 am he sleeps in a nightcap, and he says hello the first time you open the board each day.
- Keys: `N` new item, `/` search, `Esc` close.

Plain web app, no build step, no dependencies. Open it over http (for example `python3 -m http.server`) or from GitHub Pages. `npm test` runs the logic and sync tests.

## Sync setup

1. Make a **private** repo for the data (for example `varken-data`, with a README so it has a first commit).
2. GitHub, Settings, Developer settings, Fine-grained tokens: a token for **only that repo**, with **Contents: Read and write**.
3. In the board: gear button, paste `owner/repo` and the token, Save and sync.

The sync writes `data.json` (the board), `BOARD.md` (readable backlog, open items by project and priority) and `images/<id>.jpg`.
- A 📋 copy button on every card title (shows on hover) copies the item for Claude. The sleeping pig sometimes peeks with one eye and blows a nose bubble.
- Daytime pig: blinks, hums a note, mornings (6-11) add a little sun and a stretch.
- Undo on the done toast; Sundays the pig sums up the week (done count, busiest project); seasonal looks: winter earmuffs, spring petals, summer shades, autumn leaf. The header, input and tabs stay on top and shrink when you scroll.
- Holiday looks: Santa hat 18-25 Dec, witch hat 25-31 Oct, crown on King's Day, pilgrim hat for Thanksgiving, bunny ears Easter weekend. Options has a switch for all seasonal clothes and a preview menu.
- More looks: Sinterklaas, New Year, Carnival, Valentine, St Patrick, 4th of July, and a birthday on 10 May (party hat, confetti, fanfare, dance on first open).
- Bigg, the pig's sweet little brother, comes up in his lines.
- Options has an effect tester: pick a look and the pig's state, then run dance, falling bits, peek, bubble, party, birthday hello and more.
- Winter scarf; more holidays with hats (Mother's Day, Father's Day, Prinsjesdag, Sint-Maarten, Bevrijdingsdag); a morning stretch, fireflies while he sleeps; special-day, weekday and season comments; a party on first open for the big holidays.
- The header stays on top and the pig card shrinks as you scroll (smoothly, driven by the scroll position). The icon is just the pig on a transparent background. The first poke after 10 am gets a stretch and a good morning.
