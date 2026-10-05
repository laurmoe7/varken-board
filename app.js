'use strict';
// Page code: sidebar, list, detail panel, images, sync button. Rules live in logic.js.
const L = BoardLogic;
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let state = L.defaultState();
// ui.drafting: the right panel is in "new item" mode, filling ui.draftItem until Add.
const blankDraft = () => ({ project: '', type: 'idea', priority: 'soon', effort: '', slot: '', build: '', notes: '', images: [] });
const ui = { project: 'all', view: 'list', slot: 'all', type: 'all', effort: 'all', status: 'active', q: '', open: null, drafting: false, draftItem: blankDraft(), last: '' };
let ready = false;
const isNotesView = () => ui.view === 'notes' || ui.view === 'gnotes'; // notes of a project (or All) or of a gallery

// ---------- saving ----------
let saveTimer, syncTimer, syncing = false, changedDuringSync = false, savePending = false;
function touch(obj) { obj.updated = Date.now(); }
function writeState() {
  savePending = false;
  return Store.saveState(state).catch(() => setPill('bad', 'Could not save in this browser'));
}
function save() {
  clearTimeout(saveTimer);
  savePending = true;
  saveTimer = setTimeout(writeState, 20);
  changedDuringSync = true;
  scheduleSync();
}
// Closing the tab right after a change must not lose it, so write at once when the page is hidden.
function flushSave() {
  if (!savePending) return;
  clearTimeout(saveTimer);
  writeState();
}
document.addEventListener('visibilitychange', () => document.hidden && flushSave());
window.addEventListener('pagehide', flushSave);
function loadUi() {
  try { Object.assign(ui, JSON.parse(localStorage.getItem('varken-ui')) || {}, { open: null, q: '', drafting: false, draftItem: blankDraft() }); } catch { /* fresh */ }
}
function saveUi() { try { localStorage.setItem('varken-ui', JSON.stringify({ project: ui.project, view: ui.view, type: ui.type, effort: ui.effort, status: ui.status, last: ui.last })); } catch { /* ignore */ } }

// ---------- sync ----------
function setPill(kind, text) {
  const p = $('#syncPill');
  p.className = 'pill ' + (kind || '');
  p.textContent = text;
}
function scheduleSync() {
  if (!Sync.config()) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(doSync, 3000);
}
async function doSync() {
  if (!Sync.config() || syncing || !ready) return false;
  syncing = true;
  changedDuringSync = false;
  setPill('busy', '⏳ Syncing…');
  try {
    const merged = await Sync.run(state, { hasImage: Store.hasImage, getImage: Store.getImage, putImage: Store.putImage });
    state = L.mergeStates(state, merged);
    await Store.saveState(state);
    setPill('ok', '✓ Synced ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    renderAll(true);
    refreshHints();
    $('#syncMsg').textContent = 'Synced.';
    $('#syncMsg').classList.remove('err');
    syncing = false;
    if (changedDuringSync) scheduleSync();
    return true;
  } catch (e) {
    const offline = !navigator.onLine || /fetch/i.test(e.message);
    setPill('bad', offline ? '⚠ Offline' : '⚠ Sync problem');
    $('#syncPill').title = e.message;
    $('#syncMsg').textContent = offline ? 'Could not reach GitHub. Your board is safe in this browser.' : e.message;
    $('#syncMsg').classList.add('err');
  }
  syncing = false;
  if (changedDuringSync) scheduleSync();
  return false;
}
function initPill() {
  if (Sync.config()) setPill('', '☁ Sync on');
  else setPill('', '☁ Set up sync');
}

// ---------- images ----------
const urls = new Map();
async function imgUrl(id) {
  if (urls.has(id)) return urls.get(id);
  const blob = await Store.getImage(id);
  if (!blob) return null;
  const u = URL.createObjectURL(blob);
  urls.set(id, u);
  return u;
}
function hydrate(root) {
  root.querySelectorAll('img[data-img]').forEach(async (img) => {
    const u = await imgUrl(img.dataset.img);
    img.draggable = false;
    if (u) img.src = u; else img.alt = 'still downloading';
  });
}
async function processImage(file) {
  const bmp = await createImageBitmap(file);
  const { w, h } = L.fitSize(bmp.width, bmp.height);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bmp, 0, 0, w, h);
  const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.85));
  const id = L.uid();
  await Store.putImage(id, blob);
  state.images[id] = { name: file.name || 'pasted image', added: Date.now() };
  return id;
}
async function addFiles(files, target) {
  const pics = Array.from(files).filter((f) => f.type.startsWith('image/'));
  if (!pics.length || !target) return;
  const isDraft = target === ui.draftItem;
  for (const f of pics) {
    try {
      target.images.push(await processImage(f));
      if (!isDraft) touch(target);
    } catch { toast('Could not read that image'); }
  }
  save();
  renderImages();
  if (!isDraft) renderList();
}
// Where a pasted or dropped image goes: the panel's item, or a new item (opening the panel for it).
function imageTarget(inDetail) {
  if (inDetail && current()) return current();
  startDraft();
  return ui.draftItem;
}

// ---------- rendering ----------
const project = (id) => state.projects.find((p) => p.id === id && !p.deleted);
const projectsLive = () => L.liveProjects(state);

// The project whose picture gallery is on show (view 'gallery'), else null.
const galleryProject = () => {
  const p = ui.view === 'gallery' ? project(ui.project) : null;
  return p && p.gallery ? p : null;
};
const GALLERY_STATUSES = [{ id: 'open', label: 'Idea' }, { id: 'doing', label: 'Making it' }, { id: 'done', label: 'In the game' }];

function showView(projectId, view) {
  if ((view === 'notes' || view === 'gnotes') && ui.drafting) { ui.drafting = false; ui.draftItem = blankDraft(); }
  ui.project = projectId;
  ui.view = view;
  ui.slot = 'all';
  ui.open = null;
  saveUi();
  renderAll();
}

function renderSide() {
  const rows = [{ id: 'all', name: 'All projects', emoji: '🌈', color: '#f4eeff' }].concat(projectsLive());
  const inGallery = !!galleryProject();
  $('#projects').innerHTML = rows
    .map(
      (p) => `<div class="proj ${ui.project === p.id && (ui.view === 'list' || ui.view === 'notes') ? 'on' : ''}" data-project="${esc(p.id)}" role="button" tabindex="0">
        <span class="badge" style="background:${esc(p.color)}">${esc(p.emoji)}</span>
        <span class="name">${esc(p.name)}</span>
        <span class="count">${L.countOpen(state.items, p.id)}</span>
        ${p.id === 'all' ? '' : '<button class="edit" data-edit="' + esc(p.id) + '" title="Edit project" aria-label="Edit project">✎</button>'}
      </div>${
        p.gallery
          ? `<div class="proj subrow ${ui.project === p.id && (inGallery || ui.view === 'gnotes') ? 'on' : ''}" data-gallery="${esc(p.id)}" role="button" tabindex="0">
        <span class="badge" style="background:${esc(p.color)}">🎀</span>
        <span class="name">${esc(p.gallery)}</span>
        <span class="count">${L.countGallery(state.items, p.id)}</span>
      </div>`
          : ''
      }`
    )
    .join('');
}

function renderHead(poke) {
  if (isNotesView()) return renderNotesHead(poke);
  const gp = galleryProject();
  const p = project(ui.project);
  $('#viewTitle').textContent = gp ? '🎀 ' + gp.gallery : p ? p.emoji + ' ' + p.name : '🌈 All projects';
  const n = L.countOpen(state.items, ui.project);
  const now = L.countNow(state.items);
  const sub = $('#viewSub');
  sub.className = 'sub';
  paintHero(!!gp, gp ? L.countGallery(state.items, gp.id) : n, now, poke === true);
  if (gp) {
    const g = L.countGallery(state.items, gp.id);
    sub.textContent = `${gp.emoji} ${gp.name} · ${g} ${g === 1 ? 'idea' : 'ideas'}`;
  } else if (now > L.NOW_CAP) {
    sub.classList.add('warn');
    sub.textContent = `${now} things marked Now. That's a lot, pick the real top ${L.NOW_CAP}. 🐷`;
  } else {
    const today = L.doneToday(state.items, Date.now(), ui.project);
    sub.textContent = (n === 1 ? '1 thing to do' : n + ' things to do') + (today ? ` · ✨ ${today} done today` : '');
  }
  if (gp) {
    const slots = L.slotCounts(state.items, gp.id, gp.slots);
    $('#typeChips').innerHTML = slots.length
      ? `<button data-slot="all" class="${ui.slot === 'all' ? 'on' : ''}">All</button>` +
        slots.map((x) => `<button data-slot="${esc(x.slot)}" class="${ui.slot === x.slot ? 'on' : ''}">${esc(x.slot)} <small>${x.count}</small></button>`).join('')
      : '';
    $('#typeChips').hidden = !slots.length;
  } else {
    $('#typeChips').innerHTML = [{ id: 'all', label: 'All' }]
      .concat(L.TYPES.map((t) => ({ id: t.id, label: t.emoji + ' ' + t.label })))
      .map((t) => `<button data-type="${t.id}" class="${ui.type === t.id ? 'on' : ''}">${esc(t.label)}</button>`)
      .join('');
    $('#typeChips').hidden = false;
  }
  $('#effortSel').hidden = !!gp;
  $('#effortSel').value = ui.effort;
  $('#statusSel').hidden = !!gp;
  $('#statusSel').value = ui.status;
  $('#copyBtn').hidden = !gp && ui.status === 'done';
  const input = $('#quickInput');
  const hint = $('#quickHint');
  input.dataset.def = input.dataset.def || input.placeholder;
  input.placeholder = gp ? `Name a ${gp.gallery.toLowerCase()} idea… ( N )` : input.dataset.def;
  hint.hidden = !!gp; // the shorthand doesn't apply to gallery ideas
}

function cardHtml(it) {
  const p = project(it.project);
  const pics = it.images
    .slice(0, 4)
    .map((id) => `<img data-img="${esc(id)}" alt="">`)
    .join('');
  return `<article class="card p-${it.priority} ${it.status} ${ui.open === it.id ? 'sel' : ''}" data-id="${esc(it.id)}" tabindex="0" draggable="true">
    <button class="check" data-check aria-label="${it.status === 'done' ? 'Mark not done' : 'Mark done'}">✓</button>
    <div class="card-body">
      <div class="card-title ${it.effort ? 'fx-' + it.effort : ''}">${L.typeOf(it.type).emoji} ${esc(it.title)}</div>
      <div class="meta">
        ${it.effort ? `<span class="tag fx fx-${it.effort}">${L.effortOf(it.effort).emoji} ${L.effortOf(it.effort).label.toLowerCase()}</span>` : ''}
        ${ui.project === 'all' && p ? `<span class="tag proj-tag" style="background:${esc(p.color)}">${esc(p.emoji)} ${esc(p.name)}</span>` : ''}
        ${it.status === 'doing' ? '<span class="tag doing">doing</span>' : ''}
        ${it.build ? `<span class="tag">build ${esc(it.build)}</span>` : ''}
        ${it.notes ? '<span class="tag">📝</span>' : ''}
        ${it.images.length > 4 ? `<span class="tag">🖼 ${it.images.length}</span>` : ''}
      </div>
      ${pics ? `<div class="thumbs">${pics}</div>` : ''}
    </div>
  </article>`;
}

function renderListView() {
  const items = L.sortItems(L.filterItems(state.items, ui));
  const groups = L.groupByPriority(items);
  const el = $('#list');
  if (!groups.length) {
    const searching = ui.q || ui.type !== 'all' || ui.effort !== 'all' || ui.status !== 'active';
    el.innerHTML = searching
      ? emptyHtml('sniff', 'Nothing matches', 'I sniffed everywhere. Try a different filter.')
      : emptyHtml('sleep', 'All clear!', 'Add an idea or a fix above and Varken will keep it safe.');
  } else {
    el.innerHTML = groups
      .map(
        (g) => `<section class="group" data-priority="${g.priority.id}"><h2><span class="dot dot-${g.priority.id}"></span>${g.priority.label} <span>${g.items.length}</span></h2>
        <div class="cards">${g.items.map(cardHtml).join('')}</div></section>`
      )
      .join('');
    hydrate(el);
  }
}

function renderList() {
  const gp = galleryProject();
  const typing = document.activeElement;
  if (isNotesView() && typing && typing.tagName === 'TEXTAREA' && typing.closest('.note')) { renderSide(); renderHead(); return; } // don't pull the note you are typing in away
  if (isNotesView()) renderNotes();
  else if (gp) renderGallery(gp);
  else renderListView();
  renderSide();
  renderHead();
  renderTabs();
  paintCompareBar();
}

const item = () => state.items.find((i) => i.id === ui.open && !i.deleted);

function seg(field, list, cur, cls) {
  return `<div class="seg ${cls || ''}" data-seg="${field}">${list.map((o) => `<button type="button" data-val="${esc(o.id)}" class="${cur === o.id ? 'on' : ''}">${o.emoji ? o.emoji + ' ' : ''}${esc(o.label)}</button>`).join('')}</div>`;
}

const current = () => (ui.drafting ? ui.draftItem : item());

// What the new-item panel shows: the panel's choices with anything typed as #project !now :bug on top.
const draftValues = () => Object.assign(L.parseQuick($('#quickInput').value, projectsLive(), quickDefaults()), { slot: ui.draftItem.slot });

// The title box grows with its text, so long titles are easy to read and edit.
function growTitle() {
  for (const t of [$('#dTitle'), $('#dNotes')]) {
    if (!t) continue;
    t.style.height = 'auto';
    t.style.height = t.scrollHeight + 2 + 'px';
  }
}

function renderDetail() {
  const d = $('#detail');
  const it = current();
  $('.app').classList.toggle('has-detail', !!it);
  d.hidden = !it;
  if (!it) { d.innerHTML = ''; d.classList.remove('gal'); return; }
  const draft = ui.drafting;
  const gal = draft ? !!galleryProject() : !!it.gallery;
  d.classList.toggle('gal', gal);
  const v = draft ? draftValues() : it;
  const slotProject = gal ? (draft ? galleryProject() : project(it.project)) : null;
  const slotNames = slotProject ? L.parseSlots(slotProject.slots) : [];
  if (gal && it.slot && !slotNames.includes(it.slot)) slotNames.push(it.slot);
  const slotRow = slotNames.length ? `<label>Slot ${seg('slot', slotNames.map((x) => ({ id: x, label: x })), v.slot || '', 'wrap')}</label>` : '';
  const images = `<label>Images</label>
    <div class="imgs" id="dImgs"></div>
    <div class="drop" id="dDrop">Paste (Ctrl+V), drop images here, or <button type="button" id="dPick">pick files</button><input type="file" id="dFile" accept="image/*" multiple hidden></div>`;
  d.innerHTML = `
    <h3>${draft ? 'New ' + (gal ? 'idea' : 'item') : 'Details'} <button class="ghost icon" id="dClose" aria-label="Close">✕</button></h3>
    ${draft ? '<div class="draft-title" id="dPreview"></div>' : `<textarea id="dTitle" rows="2" aria-label="Title">${esc(it.title)}</textarea>`}
    ${gal ? images + slotRow : `<label>Type ${seg('type', L.TYPES, v.type)}</label>
    <label>Priority ${seg('priority', L.PRIORITIES, v.priority)}</label>
    <label>Effort <span class="muted small">(click again to clear)</span> ${seg('effort', L.EFFORTS, v.effort)}</label>`}
    ${draft ? '' : `<label>Status ${seg('status', gal ? GALLERY_STATUSES : L.STATUSES, it.status)}</label>`}
    ${gal ? '' : `<label>Project <select id="dProject">${projectsLive().map((p) => `<option value="${esc(p.id)}" ${p.id === v.project ? 'selected' : ''}>${esc(p.emoji)} ${esc(p.name)}</option>`).join('')}</select></label>
    <label>Seen in build <input id="dBuild" value="${esc(it.build)}" placeholder="e.g. 212" autocomplete="off"></label>`}
    <label>Notes <textarea id="dNotes" placeholder="${gal ? 'What is it? Colours, which slot, where it goes…' : 'What is it, what should happen instead…'}">${esc(it.notes)}</textarea></label>
    ${gal ? '' : images}
    <div class="row">${
      draft
        ? '<button type="button" class="primary" id="dAdd">Add</button><button type="button" class="ghost" id="dClear">Clear</button><span class="muted small">Tab jumps here, Ctrl+Enter adds</span>'
        : '<button class="danger" id="dDelete">Delete</button>'
    }</div>`;
  if (draft) paintDraft();
  renderImages();
  growTitle();
}

// Refreshes the new-item panel's title and choices as you type, without rebuilding it.
function paintDraft() {
  if (!ui.drafting) return;
  const v = draftValues();
  const prev = $('#dPreview');
  if (prev) {
    prev.textContent = v.title || 'Start typing your title above…';
    prev.classList.toggle('dim', !v.title);
  }
  document.querySelectorAll('#detail [data-seg]').forEach((g) =>
    g.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.val === v[g.dataset.seg]))
  );
  const sel = $('#dProject');
  if (sel) sel.value = v.project;
}

function renderImages() {
  const it = current();
  const el = $('#dImgs');
  if (!it || !el) return;
  el.innerHTML = it.images.map((id) => `<div class="img"><img data-img="${esc(id)}" data-zoom="${esc(id)}" alt="attached image"><button class="x ed" data-annot="${esc(id)}" title="Draw on it" aria-label="Draw on this image">✏️</button><button class="x" data-rm="${esc(id)}" aria-label="Remove image">×</button></div>`).join('');
  hydrate(el);
}

function renderAll(keepDetail) {
  renderList();
  if (!keepDetail) renderDetail();
}

// ---------- toast ----------
let toastTimer;
function toast(text, undo) {
  const t = $('#toast');
  t.innerHTML = esc(text) + (undo ? ' <button>Undo</button>' : '');
  t.hidden = false;
  if (undo) t.querySelector('button').onclick = () => { undo(); t.hidden = true; };
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), undo ? 6000 : 2400);
}

// ---------- actions ----------
function openItem(id) {
  ui.drafting = false;
  ui.open = id;
  renderDetail();
  renderList();
}
function closeItem() {
  ui.open = null;
  renderDetail();
  renderList();
}

// What a new item gets when the line has no shorthand: the panel's choices, else the project on show.
function quickDefaults() {
  const d = ui.draftItem;
  return {
    project: d.project || (ui.project !== 'all' ? ui.project : ui.last || (projectsLive()[0] || {}).id || ''),
    type: d.type,
    priority: d.priority,
    effort: d.effort,
  };
}

const draftHasContent = () => !!(ui.draftItem.notes || ui.draftItem.build || ui.draftItem.images.length);
function startDraft() {
  if (ui.drafting) return;
  ui.drafting = true;
  ui.open = null;
  renderDetail();
  renderList();
}
function endDraft() {
  ui.drafting = false;
  renderDetail();
}
// The panel opens as soon as there is something typed (or pasted) and closes again if there is nothing to keep.
function syncDraft() {
  if (isNotesView()) return; // notes have no side panel
  if ($('#quickInput').value.trim() !== '') ui.drafting ? paintDraft() : startDraft();
  else if (ui.drafting && !draftHasContent()) endDraft();
  else paintDraft();
}
function commitDraft() {
  const input = $('#quickInput');
  const defaults = quickDefaults();
  const r = L.parseQuick(input.value, projectsLive(), defaults);
  if (!r.title) {
    toast('Type a title first');
    input.focus();
    return false;
  }
  const d = ui.draftItem;
  const gp = galleryProject();
  const it = L.createItem(
    gp
      ? { project: gp.id, gallery: true, slot: d.slot, title: r.title, notes: d.notes, images: d.images.slice() }
      : { project: r.project || defaults.project, type: r.type, priority: r.priority, effort: r.effort, title: r.title, build: d.build, notes: d.notes, images: d.images.slice() }
  );
  state.items.push(it);
  ui.last = it.project;
  ui.draftItem = blankDraft();
  ui.drafting = false;
  input.value = '';
  saveUi();
  save();
  renderDetail();
  renderList();
  const p = project(it.project);
  toast('Added' + (gp ? ' to ' + gp.gallery : p ? ' to ' + p.name : ''));
  input.focus();
  return true;
}
function clearDraft() {
  $('#quickInput').value = '';
  ui.draftItem = blankDraft();
  endDraft();
}

function setField(it, field, val) {
  it[field] = val;
  if (field === 'status') it.doneAt = val === 'done' ? Date.now() : 0;
  if (it === ui.draftItem) return; // a new item is only saved by Add
  touch(it);
  save();
}

function toggleDone(id) {
  const it = state.items.find((i) => i.id === id);
  if (!it) return;
  const card = document.querySelector(`.card[data-id="${CSS.escape(id)}"], .gcard[data-id="${CSS.escape(id)}"]`);
  setField(it, 'status', it.status === 'done' ? 'open' : 'done');
  if (it.status === 'done') celebrate(card, !galleryProject() && L.countOpen(state.items, 'all') === 0);
  if (it.status === 'done' && ui.status === 'active' && card && !galleryProject()) {
    card.classList.add('done', 'sparkle');
    setTimeout(() => renderAll(true), 450);
  } else renderList();
  if (ui.open === id) renderDetail();
}

function deleteItem(id) {
  const it = state.items.find((i) => i.id === id);
  if (!it) return;
  it.deleted = true;
  touch(it);
  save();
  if (ui.open === id) ui.open = null;
  renderAll();
  toast('Deleted', () => { it.deleted = false; touch(it); save(); renderAll(); });
}

// ---------- project dialog ----------
let editingProject = null, pickedColor = L.COLORS[0];
function openProjectDlg(id) {
  editingProject = id ? project(id) : null;
  $('#projectDlgTitle').textContent = editingProject ? 'Edit project' : 'New project';
  $('#pName').value = editingProject ? editingProject.name : '';
  $('#pEmoji').value = editingProject ? editingProject.emoji : '🌟';
  $('#pRepo').value = editingProject ? editingProject.repo || '' : '';
  $('#pGallery').value = editingProject ? editingProject.gallery || '' : '';
  $('#pSlots').value = editingProject ? editingProject.slots || '' : '';
  $('#pDelete').hidden = !editingProject;
  $('#pMsg').textContent = '';
  pickedColor = editingProject ? editingProject.color : L.COLORS[projectsLive().length % L.COLORS.length];
  drawSwatches();
  $('#projectDlg').showModal();
  $('#pName').focus();
}
function drawSwatches() {
  $('#pColors').innerHTML = L.COLORS.map((c) => `<button type="button" data-color="${c}" class="${c === pickedColor ? 'on' : ''}" style="background:${c}" aria-label="Colour ${c}"></button>`).join('');
}
function saveProject() {
  const name = $('#pName').value.trim();
  if (!name) return;
  const fields = { name, emoji: $('#pEmoji').value.trim() || '🌟', color: pickedColor, repo: $('#pRepo').value.trim(), gallery: $('#pGallery').value.trim(), slots: $('#pSlots').value.trim() };
  if (editingProject) {
    Object.assign(editingProject, fields);
    touch(editingProject);
  } else {
    let id = L.slug(name) || L.uid();
    while (state.projects.some((p) => p.id === id)) id += '2';
    const p = Object.assign({ id }, fields);
    touch(p);
    state.projects.push(p);
    ui.project = id;
    saveUi();
  }
  if (!isNotesView() && !galleryProject()) ui.view = 'list';
  save();
  renderAll();
}
function deleteProject() {
  if (!editingProject) return;
  if (L.countOpen(state.items, editingProject.id) || state.items.some((i) => !i.deleted && i.project === editingProject.id)) {
    $('#pMsg').textContent = 'Move or delete its items first.';
    $('#pMsg').classList.add('err');
    return;
  }
  editingProject.deleted = true;
  touch(editingProject);
  if (ui.project === editingProject.id) { ui.project = 'all'; ui.view = 'list'; }
  saveUi();
  save();
  $('#projectDlg').close();
  renderAll();
}

// ---------- wiring ----------
function wire() {
  const qi = $('#quickInput');
  $('#quick').addEventListener('submit', (e) => {
    e.preventDefault();
    if (isNotesView()) addNote();
    else commitDraft();
  });
  qi.addEventListener('input', syncDraft);
  qi.addEventListener('focus', syncDraft);
  qi.addEventListener('keydown', (e) => {
    if (e.key === 'Tab' && !e.shiftKey && ui.drafting && $('#dNotes')) { e.preventDefault(); $('#dNotes').focus(); }
  });
  $('#projects').addEventListener('click', (e) => {
    const ed = e.target.closest('[data-edit]');
    if (ed) return openProjectDlg(ed.dataset.edit);
    const g = e.target.closest('[data-gallery]');
    if (g) return showView(g.dataset.gallery, 'gallery');
    const p = e.target.closest('[data-project]');
    if (p) showView(p.dataset.project, 'list');
  });
  $('#projects').addEventListener('keydown', (e) => {
    const row = e.target.closest('[data-project], [data-gallery]');
    if (row && e.target === row && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      if (row.dataset.gallery) showView(row.dataset.gallery, 'gallery');
      else showView(row.dataset.project, 'list');
    }
  });
  $('#addProject').onclick = () => openProjectDlg(null);
  $('#typeChips').addEventListener('click', (e) => {
    const slot = e.target.closest('[data-slot]');
    if (slot) { ui.slot = slot.dataset.slot; renderList(); return; }
    const b = e.target.closest('[data-type]');
    if (b) { ui.type = b.dataset.type; saveUi(); renderList(); }
  });
  $('#effortSel').onchange = (e) => { ui.effort = e.target.value; saveUi(); renderList(); };
  $('#statusSel').onchange = (e) => { ui.status = e.target.value; saveUi(); renderList(); };
  $('#search').oninput = (e) => { ui.q = e.target.value; renderList(); };
  $('#copyBtn').onclick = async () => {
    try { await navigator.clipboard.writeText(L.copyForClaude(state, ui.project, !!galleryProject())); toast('Copied. Paste it into a Claude session.'); }
    catch { toast('Could not copy'); }
  };

  $('#list').addEventListener('click', (e) => {
    const card = e.target.closest('.card, .gcard');
    if (!card) return;
    if (e.target.closest('[data-check]')) return toggleDone(card.dataset.id);
    openItem(card.dataset.id);
  });
  $('#list').addEventListener('keydown', (e) => {
    const card = e.target.closest('.card, .gcard');
    if (card && e.target === card && !e.altKey && e.key === 'Enter') openItem(card.dataset.id);
  });
  const d = $('#detail');
  d.addEventListener('click', (e) => {
    const it = current();
    if (!it) return;
    if (e.target.closest('#dClose')) return ui.drafting ? endDraft() : closeItem();
    if (e.target.closest('#dAdd')) return commitDraft();
    if (e.target.closest('#dClear')) return clearDraft();
    if (e.target.closest('#dDelete')) return deleteItem(it.id);
    if (e.target.closest('#dPick')) return $('#dFile').click();
    const sb = e.target.closest('[data-seg] [data-val]');
    if (sb) {
      const field = sb.parentElement.dataset.seg;
      setField(it, field, (field === 'slot' || field === 'effort') && it[field] === sb.dataset.val ? '' : sb.dataset.val);
      if (ui.drafting) {
        qi.value = L.stripToken(qi.value, projectsLive(), field); // a typed #tag or !word would override the click
        paintDraft();
      } else {
        sb.parentElement.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.val === it[field]));
        renderList();
      }
      return;
    }
    const rm = e.target.closest('[data-rm]');
    if (rm) {
      it.images = it.images.filter((i) => i !== rm.dataset.rm);
      if (!ui.drafting) { touch(it); save(); renderList(); }
      renderImages();
      return;
    }
    const an = e.target.closest('[data-annot]');
    if (an) return openAnnotate(it, an.dataset.annot);
    const z = e.target.closest('[data-zoom]');
    if (z && z.src) { $('#lightImg').src = z.src; $('#lightbox').showModal(); }
  });
  d.addEventListener('input', (e) => {
    const it = current();
    if (!it) return;
    if (e.target.id === 'dTitle' || e.target.id === 'dNotes') growTitle();
    if (e.target.id === 'dTitle') { setField(it, 'title', e.target.value.replace(/\s*\n\s*/g, ' ')); }
    else if (e.target.id === 'dNotes') setField(it, 'notes', e.target.value);
    else if (e.target.id === 'dBuild') setField(it, 'build', e.target.value.trim());
    else return;
    if (!ui.drafting) renderList();
  });
  d.addEventListener('change', (e) => {
    const it = current();
    if (!it) return;
    if (e.target.id === 'dProject') {
      setField(it, 'project', e.target.value);
      if (ui.drafting) { qi.value = L.stripToken(qi.value, projectsLive(), 'project'); paintDraft(); } else renderList();
    }
    if (e.target.id === 'dFile') { addFiles(e.target.files, it); e.target.value = ''; }
  });
  d.addEventListener('keydown', (e) => {
    if (e.target.id === 'dTitle' && e.key === 'Enter' && !e.ctrlKey && !e.metaKey) { e.preventDefault(); e.target.blur(); return; }
    if (!ui.drafting) return;
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); commitDraft(); }
    else if (e.key === 'Tab' && e.shiftKey && e.target.id === 'dNotes') { e.preventDefault(); qi.focus(); }
  });

  // clicking anywhere outside the open details panel closes it (cards open their own item; dialogs and toasts don't count)
  document.addEventListener('click', (e) => {
    if (!ui.open || !e.target.isConnected) return;
    if (e.target.closest('#detail, .card, .gcard, dialog, #toast, #cmpBar')) return;
    closeItem();
  });

  // paste and drop: inside the panel they go to its item, anywhere else to a new item
  document.addEventListener('paste', (e) => {
    if (isNotesView()) return;
    const files = Array.from(e.clipboardData ? e.clipboardData.files : []);
    if (!files.some((f) => f.type.startsWith('image/'))) return;
    e.preventDefault();
    addFiles(files, imageTarget(e.target.closest && e.target.closest('#detail')));
  });
  document.addEventListener('dragover', (e) => {
    e.preventDefault();
    const z = $('#dDrop');
    if (z) z.classList.toggle('over', !!(e.target.closest && e.target.closest('#detail')));
  });
  document.addEventListener('dragleave', () => { const z = $('#dDrop'); if (z) z.classList.remove('over'); });
  document.addEventListener('drop', (e) => {
    e.preventDefault();
    const z = $('#dDrop');
    if (z) z.classList.remove('over');
    if (!Array.from(e.dataTransfer.files).some((f) => f.type.startsWith('image/'))) return;
    addFiles(e.dataTransfer.files, imageTarget(e.target.closest && e.target.closest('#detail')));
  });

  document.addEventListener('keydown', (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
    if (e.key === 'Escape' && !document.querySelector('dialog[open]')) {
      if (typing) e.target.blur();
      else if (ui.open) closeItem();
      return;
    }
    if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'n' || e.key === 'N') { e.preventDefault(); $('#quickInput').focus(); }
    else if (e.key === '/') { e.preventDefault(); $('#search').focus(); }
    else if (e.key === '?') { e.preventDefault(); $('#helpDlg').showModal(); }
  });

  // dialogs
  $('#lightClose').onclick = () => $('#lightbox').close();
  $('#lightbox').addEventListener('click', (e) => { if (e.target.id === 'lightbox') $('#lightbox').close(); });
  $('#pColors').addEventListener('click', (e) => {
    const b = e.target.closest('[data-color]');
    if (b) { pickedColor = b.dataset.color; drawSwatches(); }
  });
  $('#projectForm').addEventListener('submit', (e) => {
    if (e.submitter && e.submitter.value === 'save') saveProject();
  });
  $('#pDelete').onclick = deleteProject;

  const openSettings = () => {
    const c = Sync.config() || {};
    $('#syncRepo').value = c.repo || '';
    $('#syncToken').value = c.token || '';
    $('#syncMsg').textContent = '';
    $('#settingsDlg').showModal();
  };
  $('#settingsBtn').onclick = openSettings;
  $('#helpBtn').onclick = () => $('#helpDlg').showModal();
  $('#helpClose').onclick = () => $('#helpDlg').close();
  $('#syncPill').onclick = () => (Sync.config() ? doSync() : openSettings());
  $('#syncSave').onclick = () => {
    const repo = $('#syncRepo').value.trim().replace(/^https:\/\/github\.com\//, '').replace(/\/$/, '');
    const token = $('#syncToken').value.trim();
    if (!/^[\w.-]+\/[\w.-]+$/.test(repo) || !token) {
      $('#syncMsg').textContent = 'Fill in the repo as owner/name and paste the token.';
      $('#syncMsg').classList.add('err');
      return;
    }
    Sync.setConfig({ repo, token });
    $('#syncMsg').classList.remove('err');
    $('#syncMsg').textContent = 'Syncing…';
    doSync();
  };
  $('#syncOff').onclick = () => { Sync.setConfig(null); initPill(); $('#syncMsg').textContent = 'Disconnected. Your board stays in this browser.'; $('#syncMsg').classList.remove('err'); };
  $('#exportBtn').onclick = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }));
    a.download = 'varken-board-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
  };
  $('#importBtn').onclick = () => $('#importFile').click();
  $('#importFile').onchange = async (e) => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    try {
      const incoming = L.validateState(JSON.parse(await f.text()));
      if (!incoming) throw new Error('bad');
      state = L.mergeStates(state, incoming);
      save();
      renderAll();
      $('#syncMsg').textContent = 'Imported and merged.';
      $('#syncMsg').classList.remove('err');
    } catch { $('#syncMsg').textContent = 'That file is not a Varken board export.'; $('#syncMsg').classList.add('err'); }
  };
  window.addEventListener('online', () => Sync.config() && doSync());
}

// ---------- start ----------
async function start() {
  loadUi();
  wire();
  initPill();
  try {
    const saved = await Store.loadState();
    const clean = saved && L.validateState(saved);
    if (clean) state = clean;
    else await Store.saveState(state);
    Store.persist();
  } catch {
    setPill('bad', '⚠ Browser storage is blocked');
    toast('Your browser is blocking storage, so nothing will be saved.');
  }
  const ps = state.projects.find((p) => p.id === 'petshopper' && !p.deleted);
  if (ps && ps.gallery === undefined) { ps.gallery = 'Cosmetics'; touch(ps); save(); } // Pet Shopper's cosmetics gallery
  if (ps && ps.slots === undefined) { ps.slots = L.DEFAULT_SLOTS; touch(ps); save(); }
  if (!project(ui.project) && ui.project !== 'all') ui.project = 'all';
  if (ui.view === 'gnotes' && !(project(ui.project) || {}).gallery) ui.view = 'list';
  else if (ui.view !== 'notes' && ui.view !== 'gnotes' && !galleryProject()) ui.view = 'list';
  ready = true;
  renderAll();
  refreshHints();
  doSync();
}
