// The Notebook: a big free-text page you can type into like a notepad, with tabs along the top for more pages.
// Pages live in `state.pages` (see L.createPage, L.livePages). `ui.page` is the page on show (kept in localStorage `varken-page`).

try { ui.page = localStorage.getItem('varken-page') || ''; } catch { ui.page = ''; }

function currentPage() {
  const pages = L.livePages(state);
  return pages.find((p) => p.id === ui.page) || pages[0] || null;
}

function selectPage(id) {
  ui.page = id;
  try { localStorage.setItem('varken-page', id); } catch { /* ignore */ }
}

function renderNotebookHead(poke) {
  const n = L.livePages(state).length;
  $('#viewTitle').textContent = '📓 Notebook';
  const sub = $('#viewSub');
  sub.className = 'sub';
  sub.textContent = n === 1 ? '1 page' : n + ' pages';
  paintHero('notes', n, 0, poke === true);
}

function renderNotebook() {
  if (!L.livePages(state).length) { state.pages.push(L.createPage({ title: 'Page 1' })); save(); }
  const pages = L.livePages(state);
  const cur = currentPage();
  selectPage(cur.id);
  $('#list').innerHTML = `<div id="notebook">
    <div class="nb-tabs" role="tablist">${pages
      .map((p) => `<button class="nb-tab ${p.id === cur.id ? 'on' : ''}" role="tab" data-page="${esc(p.id)}" title="Double-click to rename">${esc(p.title || 'Page')}${p.id === cur.id && pages.length > 1 ? '<span class="nb-x" data-page-del title="Delete this page">×</span>' : ''}</button>`)
      .join('')}<button class="nb-add" data-page-add title="New page" aria-label="New page">＋</button></div>
    <textarea id="nbText" class="nb-text" spellcheck="true" placeholder="Write anything here…">${esc(cur.text)}</textarea>
  </div>`;
  const t = $('#nbText');
  t.focus({ preventScroll: true });
  t.setSelectionRange(t.value.length, t.value.length);
}

function renamePage(btn) {
  const p = L.livePages(state).find((x) => x.id === btn.dataset.page);
  if (!p) return;
  const input = document.createElement('input');
  input.className = 'nb-rename';
  input.value = p.title;
  input.maxLength = 40;
  btn.replaceWith(input);
  input.focus();
  input.select();
  let done = false;
  const finish = (ok) => {
    if (done) return;
    done = true;
    if (ok && input.value.trim() && input.value.trim() !== p.title) { p.title = input.value.trim(); touch(p); save(); }
    renderList();
  };
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') finish(true); else if (e.key === 'Escape') finish(false); });
  input.addEventListener('blur', () => finish(true));
}

function addPage() {
  const n = L.livePages(state).length + 1;
  const p = L.createPage({ title: 'Page ' + n });
  state.pages.push(p);
  selectPage(p.id);
  save();
  renderList();
}

function deletePage(p) {
  p.deleted = true;
  touch(p);
  const next = currentPage();
  if (next) selectPage(next.id);
  save();
  renderList();
  toast('Page deleted', () => { p.deleted = false; touch(p); selectPage(p.id); save(); renderList(); });
}

(function wireNotebook() {
  const list = $('#list');
  list.addEventListener('input', (e) => {
    if (e.target.id !== 'nbText') return;
    const p = currentPage();
    if (!p) return;
    p.text = e.target.value;
    touch(p);
    save();
  });
  list.addEventListener('click', (e) => {
    if (!isNotebook()) return;
    if (e.target.closest('[data-page-add]')) return addPage();
    const del = e.target.closest('[data-page-del]');
    if (del) {
      const p = currentPage();
      if (p) deletePage(p);
      return;
    }
    const tab = e.target.closest('[data-page]');
    if (tab && tab.dataset.page !== (currentPage() || {}).id) { selectPage(tab.dataset.page); renderList(); }
  });
  list.addEventListener('dblclick', (e) => {
    const tab = e.target.closest && e.target.closest('.nb-tab');
    if (tab && isNotebook()) renamePage(tab);
  });
  $('#projects').addEventListener('click', (e) => {
    if (!e.target.closest('[data-notebook]')) return;
    showView('all', 'notebook');
  });
  $('#projects').addEventListener('keydown', (e) => {
    const row = e.target.closest('[data-notebook]');
    if (row && e.target === row && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); showView('all', 'notebook'); }
  });
})();
