// Notes pages: quick, loose thoughts with no type or priority. Every project has a Notes tab beside its list, each
// gallery has one beside its ideas (Pet Shopper: Cosmetics), and All projects has one too. Notes live in `state.notes` (see L.createNote, L.liveNotes);
// a note can be turned into a real item or gallery idea when it is ready.

// Which notes are on show: All projects' (''), a project's (its id), or a gallery's ('<id>/gallery').
const notesScope = () => (ui.view === 'gnotes' ? ui.project + '/gallery' : ui.project === 'all' ? '' : ui.project);
const notesProject = () => project(ui.project);

function renderNotesHead(poke) {
  const gp = ui.view === 'gnotes' ? notesProject() : null;
  const p = notesProject();
  const count = L.liveNotes(state, notesScope()).length;
  $('#viewTitle').textContent = gp ? '🎀 ' + gp.gallery : p ? p.emoji + ' ' + p.name : '🌈 All projects';
  const sub = $('#viewSub');
  sub.className = 'sub';
  sub.textContent = count === 1 ? '1 loose thought' : count + ' loose thoughts';
  paintHero('notes', count, 0, poke === true);
  $('#typeChips').hidden = true;
  $('#effortSel').hidden = true;
  $('#statusSel').hidden = true;
  $('#pickBtn').hidden = true;
  const input = $('#quickInput');
  input.dataset.def = input.dataset.def || input.placeholder;
  input.placeholder = 'Jot something down… ( N )';
  $('#quickHint').hidden = true;
}

// The two tabs under the input: the view itself and its notes.
function renderTabs() {
  const gal = ui.view === 'gallery' || ui.view === 'gnotes';
  const gp = gal ? notesProject() : null;
  const mainCount = gal && gp ? L.countGallery(state.items, gp.id) : L.countOpen(state.items, ui.project);
  const noteCount = L.liveNotes(state, notesScope()).length;
  const main = gal ? '🎀 Ideas' : '📋 To-do';
  const notes = isNotesView();
  $('#viewTabs').innerHTML = `<button data-vt="main" class="${notes ? '' : 'on'}">${main} <small>${mainCount}</small></button><button data-vt="notes" class="${notes ? 'on' : ''}">📝 Notes <small>${noteCount}</small></button>`;
}

$('#viewTabs').addEventListener('click', (e) => {
  const b = e.target.closest('[data-vt]');
  if (!b) return;
  const gal = ui.view === 'gallery' || ui.view === 'gnotes';
  showView(ui.project, b.dataset.vt === 'notes' ? (gal ? 'gnotes' : 'notes') : gal ? 'gallery' : 'list');
});

const noteDate = (n) => new Date(n.created).toLocaleDateString([], { day: 'numeric', month: 'short' });

function renderNotes() {
  const list = L.liveNotes(state, notesScope(), ui.q);
  const el = $('#list');
  if (!list.length) {
    el.innerHTML = ui.q
      ? emptyHtml('sniff', 'Nothing matches', 'I sniffed every note. Try a different search.')
      : emptyHtml('sleep', 'No notes yet', 'Type above and press Enter. Turn the good ones into tasks later.');
    return;
  }
  el.innerHTML = `<div class="notes">${list
    .map(
      (n) => `<article class="note" data-note="${esc(n.id)}">
      <textarea rows="2" aria-label="Note">${esc(n.text)}</textarea>
      <div class="note-foot"><span class="muted small">${esc(noteDate(n))}</span>
        <span class="note-btns"><button class="ghost small" data-promote title="Turn this note into a real ${ui.view === 'gnotes' ? 'gallery card' : 'task'}">→ ${ui.view === 'gnotes' ? 'Card' : 'Task'}</button><button class="ghost small" data-note-del aria-label="Delete note">Delete</button></span>
      </div>
    </article>`
    )
    .join('')}</div>`;
  growNotes();
}

function growNotes() {
  document.querySelectorAll('.note textarea').forEach((t) => {
    t.style.height = 'auto';
    t.style.height = t.scrollHeight + 2 + 'px';
  });
}

function addNote() {
  const input = $('#quickInput');
  const text = input.value.trim();
  if (!text) { toast('Type a note first'); return; }
  pigSay('note', { p: 0.25 });
  state.notes.push(L.createNote({ scope: notesScope(), text }));
  input.value = '';
  save();
  renderList();
  input.focus();
}

const findNote = (id) => state.notes.find((n) => n.id === id);

// Turns a note into an item (general page: in the project you used last) or a gallery idea (project page).
function promoteNote(n) {
  pigSay('promote', { p: 0.6 });
  const [first, ...rest] = n.text.trim().split('\n');
  const title = first.trim().slice(0, 120);
  const more = (first.trim().length > 120 ? first.trim() : '') + (rest.length ? '\n' + rest.join('\n') : '');
  const gal = n.scope.endsWith('/gallery');
  const proj = n.scope.replace('/gallery', '');
  const it = L.createItem(
    gal
      ? { project: proj, gallery: true, title, notes: more.trim() }
      : { project: proj || ui.last || (projectsLive()[0] || {}).id || '', title, notes: more.trim() }
  );
  state.items.push(it);
  n.deleted = true;
  touch(n);
  save();
  renderAll();
  toast(gal ? 'Moved to the gallery' : 'Moved to your list', () => {
    it.deleted = true; touch(it);
    n.deleted = false; touch(n);
    save();
    renderAll();
  });
}

$('#list').addEventListener('input', (e) => {
  const card = e.target.closest && e.target.closest('.note');
  if (!card || e.target.tagName !== 'TEXTAREA') return;
  const n = findNote(card.dataset.note);
  if (!n) return;
  n.text = e.target.value;
  touch(n);
  save();
  growNotes();
});

$('#list').addEventListener('click', (e) => {
  const card = e.target.closest('.note');
  if (!card) return;
  const n = findNote(card.dataset.note);
  if (!n) return;
  if (e.target.closest('[data-promote]')) {
    if (!n.text.trim()) return toast('Write something first');
    promoteNote(n);
  } else if (e.target.closest('[data-note-del]')) {
    n.deleted = true;
    touch(n);
    save();
    renderList();
    toast('Note deleted', () => { n.deleted = false; touch(n); save(); renderList(); });
  }
});
