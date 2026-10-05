'use strict';
// Page code: sidebar, list, detail panel, images, sync button. Rules live in logic.js.
const L = BoardLogic;
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let state = L.defaultState();
const ui = { project: 'all', type: 'all', status: 'active', q: '', open: null, pending: [], last: '' };
let ready = false;

// ---------- saving ----------
let saveTimer, syncTimer, syncing = false, changedDuringSync = false;
function touch(obj) { obj.updated = Date.now(); }
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => Store.saveState(state).catch(() => setPill('bad', 'Could not save in this browser')), 150);
  changedDuringSync = true;
  scheduleSync();
}
function loadUi() {
  try { Object.assign(ui, JSON.parse(localStorage.getItem('varken-ui')) || {}, { open: null, pending: [], q: '' }); } catch { /* fresh */ }
}
function saveUi() { try { localStorage.setItem('varken-ui', JSON.stringify({ project: ui.project, type: ui.type, status: ui.status, last: ui.last })); } catch { /* ignore */ } }

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
  if (!Sync.config() || syncing || !ready) return;
  syncing = true;
  changedDuringSync = false;
  setPill('busy', '⏳ Syncing…');
  try {
    const merged = await Sync.run(state, { hasImage: Store.hasImage, getImage: Store.getImage, putImage: Store.putImage });
    state = L.mergeStates(state, merged);
    await Store.saveState(state);
    setPill('ok', '✓ Synced ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    renderAll(true);
    $('#syncMsg').textContent = 'Synced.';
    $('#syncMsg').classList.remove('err');
  } catch (e) {
    const offline = !navigator.onLine || /fetch/i.test(e.message);
    setPill('bad', offline ? '⚠ Offline' : '⚠ Sync problem');
    $('#syncPill').title = e.message;
    $('#syncMsg').textContent = offline ? 'Could not reach GitHub. Your board is safe in this browser.' : e.message;
    $('#syncMsg').classList.add('err');
  }
  syncing = false;
  if (changedDuringSync) scheduleSync();
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
async function addFiles(files, toItem) {
  const pics = Array.from(files).filter((f) => f.type.startsWith('image/'));
  if (!pics.length) return;
  for (const f of pics) {
    try {
      const id = await processImage(f);
      if (toItem) { toItem.images.push(id); touch(toItem); } else ui.pending.push(id);
    } catch { toast('Could not read that image'); }
  }
  save();
  if (toItem) { renderImages(); renderList(); } else renderPending();
}

// ---------- rendering ----------
const project = (id) => state.projects.find((p) => p.id === id && !p.deleted);
const projectsLive = () => L.liveProjects(state);

function renderSide() {
  const rows = [{ id: 'all', name: 'All projects', emoji: '🌈', color: '#f4eeff' }].concat(projectsLive());
  $('#projects').innerHTML = rows
    .map(
      (p) => `<div class="proj ${ui.project === p.id ? 'on' : ''}" data-project="${esc(p.id)}" role="button" tabindex="0">
        <span class="badge" style="background:${esc(p.color)}">${esc(p.emoji)}</span>
        <span class="name">${esc(p.name)}</span>
        <span class="count">${L.countOpen(state.items, p.id)}</span>
        ${p.id === 'all' ? '' : '<button class="edit" data-edit="' + esc(p.id) + '" title="Edit project" aria-label="Edit project">✎</button>'}
      </div>`
    )
    .join('');
}

function renderHead() {
  const p = project(ui.project);
  $('#viewTitle').textContent = p ? p.emoji + ' ' + p.name : '🌈 All projects';
  const n = L.countOpen(state.items, ui.project);
  const now = L.countNow(state.items);
  const sub = $('#viewSub');
  sub.className = 'sub';
  if (now > L.NOW_CAP) {
    sub.classList.add('warn');
    sub.textContent = `${now} things marked Now. That's a lot, pick the real top ${L.NOW_CAP}. 🐷`;
  } else {
    sub.textContent = n === 1 ? '1 thing to do' : n + ' things to do';
  }
  $('#typeChips').innerHTML = [{ id: 'all', label: 'All' }]
    .concat(L.TYPES.map((t) => ({ id: t.id, label: t.emoji + ' ' + t.label })))
    .map((t) => `<button data-type="${t.id}" class="${ui.type === t.id ? 'on' : ''}">${esc(t.label)}</button>`)
    .join('');
  $('#statusSel').value = ui.status;
  $('#copyBtn').hidden = ui.status === 'done';
}

function cardHtml(it) {
  const p = project(it.project);
  const pics = it.images
    .slice(0, 4)
    .map((id) => `<img data-img="${esc(id)}" alt="">`)
    .join('');
  return `<article class="card ${it.status} ${ui.open === it.id ? 'sel' : ''}" data-id="${esc(it.id)}" tabindex="0">
    <button class="check" data-check aria-label="${it.status === 'done' ? 'Mark not done' : 'Mark done'}">✓</button>
    <div class="card-body">
      <div class="card-title">${L.typeOf(it.type).emoji} ${esc(it.title)}</div>
      <div class="meta">
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

function renderList() {
  const items = L.sortItems(L.filterItems(state.items, ui));
  const groups = L.groupByPriority(items);
  const el = $('#list');
  if (!groups.length) {
    const searching = ui.q || ui.type !== 'all' || ui.status !== 'active';
    el.innerHTML = `<div class="empty">${$('.logo .pig').outerHTML}<b>${searching ? 'Nothing matches' : 'All clear!'}</b>${
      searching ? 'Try a different filter.' : 'Add an idea or a fix above and Varken will keep it safe.'
    }</div>`;
  } else {
    el.innerHTML = groups
      .map(
        (g) => `<section class="group"><h2><span class="dot dot-${g.priority.id}"></span>${g.priority.label} <span>${g.items.length}</span></h2>
        <div class="cards">${g.items.map(cardHtml).join('')}</div></section>`
      )
      .join('');
    hydrate(el);
  }
  renderSide();
  renderHead();
}

function renderPending() {
  const el = $('#pending');
  el.innerHTML = ui.pending
    .map((id) => `<div class="img"><img data-img="${esc(id)}" alt=""><button class="x" data-unpend="${esc(id)}" aria-label="Remove image">×</button></div>`)
    .join('');
  el.querySelectorAll('img').forEach((i) => (i.style.cssText = 'height:52px;width:52px;object-fit:cover;border-radius:10px;border:1px solid var(--line)'));
  hydrate(el);
}

const item = () => state.items.find((i) => i.id === ui.open && !i.deleted);

function seg(field, list, cur) {
  return `<div class="seg" data-seg="${field}">${list.map((o) => `<button type="button" data-val="${o.id}" class="${cur === o.id ? 'on' : ''}">${o.emoji ? o.emoji + ' ' : ''}${o.label}</button>`).join('')}</div>`;
}

function renderDetail() {
  const d = $('#detail');
  const it = item();
  $('.app').classList.toggle('has-detail', !!it);
  d.hidden = !it;
  if (!it) { d.innerHTML = ''; return; }
  d.innerHTML = `
    <h3>Details <button class="ghost icon" id="dClose" aria-label="Close">✕</button></h3>
    <input id="dTitle" value="${esc(it.title)}" aria-label="Title">
    <label>Type ${seg('type', L.TYPES, it.type)}</label>
    <label>Priority ${seg('priority', L.PRIORITIES, it.priority)}</label>
    <label>Status ${seg('status', L.STATUSES, it.status)}</label>
    <label>Project <select id="dProject">${projectsLive().map((p) => `<option value="${esc(p.id)}" ${p.id === it.project ? 'selected' : ''}>${esc(p.emoji)} ${esc(p.name)}</option>`).join('')}</select></label>
    <label>Seen in build <input id="dBuild" value="${esc(it.build)}" placeholder="e.g. 212" autocomplete="off"></label>
    <label>Notes <textarea id="dNotes" placeholder="What is it, what should happen instead…">${esc(it.notes)}</textarea></label>
    <label>Images</label>
    <div class="imgs" id="dImgs"></div>
    <div class="drop" id="dDrop">Paste (Ctrl+V), drop images here, or <button type="button" id="dPick">pick files</button><input type="file" id="dFile" accept="image/*" multiple hidden></div>
    <div class="row"><button class="danger" id="dDelete">Delete</button></div>`;
  renderImages();
}

function renderImages() {
  const it = item();
  const el = $('#dImgs');
  if (!it || !el) return;
  el.innerHTML = it.images.map((id) => `<div class="img"><img data-img="${esc(id)}" data-zoom="${esc(id)}" alt="attached image"><button class="x" data-rm="${esc(id)}" aria-label="Remove image">×</button></div>`).join('');
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
  ui.open = id;
  renderDetail();
  renderList();
}
function closeItem() {
  ui.open = null;
  renderDetail();
  renderList();
}

function addFromQuick(text) {
  const defaults = { project: ui.project !== 'all' ? ui.project : ui.last || (projectsLive()[0] || {}).id || '' };
  const r = L.parseQuick(text, projectsLive(), defaults);
  if (!r.title) return false;
  const it = L.createItem({ project: r.project || defaults.project, type: r.type, priority: r.priority, title: r.title, images: ui.pending.slice() });
  state.items.push(it);
  ui.last = it.project;
  ui.pending = [];
  saveUi();
  save();
  renderPending();
  renderList();
  const p = project(it.project);
  toast('Added' + (p ? ' to ' + p.name : ''));
  return true;
}

function setField(it, field, val) {
  it[field] = val;
  touch(it);
  save();
}

function toggleDone(id) {
  const it = state.items.find((i) => i.id === id);
  if (!it) return;
  const card = document.querySelector(`.card[data-id="${CSS.escape(id)}"]`);
  setField(it, 'status', it.status === 'done' ? 'open' : 'done');
  if (it.status === 'done' && ui.status === 'active' && card) {
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
  const fields = { name, emoji: $('#pEmoji').value.trim() || '🌟', color: pickedColor, repo: $('#pRepo').value.trim() };
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
  if (ui.project === editingProject.id) ui.project = 'all';
  saveUi();
  save();
  $('#projectDlg').close();
  renderAll();
}

// ---------- wiring ----------
function wire() {
  $('#quick').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('#quickInput');
    if (addFromQuick(input.value)) input.value = '';
  });
  $('#projects').addEventListener('click', (e) => {
    const ed = e.target.closest('[data-edit]');
    if (ed) return openProjectDlg(ed.dataset.edit);
    const p = e.target.closest('[data-project]');
    if (p) { ui.project = p.dataset.project; saveUi(); renderList(); }
  });
  $('#projects').addEventListener('keydown', (e) => {
    const p = e.target.closest('[data-project]');
    if (p && e.target === p && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); ui.project = p.dataset.project; saveUi(); renderList(); }
  });
  $('#addProject').onclick = () => openProjectDlg(null);
  $('#typeChips').addEventListener('click', (e) => {
    const b = e.target.closest('[data-type]');
    if (b) { ui.type = b.dataset.type; saveUi(); renderList(); }
  });
  $('#statusSel').onchange = (e) => { ui.status = e.target.value; saveUi(); renderList(); };
  $('#search').oninput = (e) => { ui.q = e.target.value; renderList(); };
  $('#copyBtn').onclick = async () => {
    try { await navigator.clipboard.writeText(L.copyForClaude(state, ui.project)); toast('Copied. Paste it into a Claude session.'); }
    catch { toast('Could not copy'); }
  };

  $('#list').addEventListener('click', (e) => {
    const card = e.target.closest('.card');
    if (!card) return;
    if (e.target.closest('[data-check]')) return toggleDone(card.dataset.id);
    openItem(card.dataset.id);
  });
  $('#list').addEventListener('keydown', (e) => {
    const card = e.target.closest('.card');
    if (card && e.target === card && e.key === 'Enter') openItem(card.dataset.id);
  });
  $('#pending').addEventListener('click', (e) => {
    const b = e.target.closest('[data-unpend]');
    if (b) { ui.pending = ui.pending.filter((i) => i !== b.dataset.unpend); renderPending(); }
  });

  const d = $('#detail');
  d.addEventListener('click', (e) => {
    const it = item();
    if (!it) return;
    if (e.target.closest('#dClose')) return closeItem();
    if (e.target.closest('#dDelete')) return deleteItem(it.id);
    if (e.target.closest('#dPick')) return $('#dFile').click();
    const sb = e.target.closest('[data-seg] [data-val]');
    if (sb) {
      setField(it, sb.parentElement.dataset.seg, sb.dataset.val);
      sb.parentElement.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === sb));
      renderList();
      return;
    }
    const rm = e.target.closest('[data-rm]');
    if (rm) { it.images = it.images.filter((i) => i !== rm.dataset.rm); touch(it); save(); renderImages(); renderList(); return; }
    const z = e.target.closest('[data-zoom]');
    if (z && z.src) { $('#lightImg').src = z.src; $('#lightbox').showModal(); }
  });
  d.addEventListener('input', (e) => {
    const it = item();
    if (!it) return;
    if (e.target.id === 'dTitle') setField(it, 'title', e.target.value);
    else if (e.target.id === 'dNotes') setField(it, 'notes', e.target.value);
    else if (e.target.id === 'dBuild') setField(it, 'build', e.target.value.trim());
    else return;
    renderList();
  });
  d.addEventListener('change', (e) => {
    const it = item();
    if (!it) return;
    if (e.target.id === 'dProject') { setField(it, 'project', e.target.value); renderList(); }
    if (e.target.id === 'dFile') { addFiles(e.target.files, it); e.target.value = ''; }
  });

  // paste and drop: inside the detail panel they go to that item, anywhere else to the new-item line
  document.addEventListener('paste', (e) => {
    const files = Array.from(e.clipboardData ? e.clipboardData.files : []);
    if (!files.some((f) => f.type.startsWith('image/'))) return;
    e.preventDefault();
    const inDetail = e.target.closest && e.target.closest('#detail');
    addFiles(files, inDetail ? item() : null);
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
    const inDetail = e.target.closest && e.target.closest('#detail');
    addFiles(e.dataTransfer.files, inDetail ? item() : null);
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
  if (!project(ui.project) && ui.project !== 'all') ui.project = 'all';
  ready = true;
  renderAll();
  renderPending();
  doSync();
}
start();
