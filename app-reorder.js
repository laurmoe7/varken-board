// Drag to reorder: cards in the list (also into another priority group) and pictures in the gallery.
// Alt+arrow keys move a focused card. The rules are L.reorder; this file is the page side.
let dragId = null;
let dropAt = null; // { beforeId, priority, el, mark }

function clearDropMarks() {
  document.querySelectorAll('.drop-before, .drop-after, .drop-end, .dragging').forEach((el) => el.classList.remove('drop-before', 'drop-after', 'drop-end', 'dragging'));
}

const cardsIn = (container) => Array.from(container.children).filter((c) => c.dataset.id);

// Where a drop would land: before which card (null = the end) and in which priority group.
function dropPlace(e) {
  const card = e.target.closest('.card, .gcard');
  const group = e.target.closest('.group');
  const priority = group ? group.dataset.priority : null;
  if (card && card.dataset.id !== dragId) {
    const r = card.getBoundingClientRect();
    const before = card.classList.contains('gcard') ? e.clientX < r.left + r.width / 2 : e.clientY < r.top + r.height / 2;
    const sibs = cardsIn(card.parentElement);
    const next = sibs.slice(sibs.indexOf(card) + 1).find((c) => c.dataset.id !== dragId);
    const beforeEl = before ? card : next;
    return { el: card, mark: before ? 'drop-before' : 'drop-after', beforeId: beforeEl ? beforeEl.dataset.id : null, priority };
  }
  if (!card && group) return { el: group, mark: 'drop-end', beforeId: null, priority };
  if (!card && e.target.closest('.gallery')) return { el: null, mark: null, beforeId: null, priority: null };
  return null;
}

// Moves one item and renumbers the cards on show in its target group (or the whole gallery).
function applyMove(id, beforeId, priority) {
  const moved = state.items.find((i) => i.id === id);
  if (!moved) return;
  pigSay('reorder', { p: 0.35 });
  const gp = galleryProject();
  const shown = gp ? galleryItems(gp) : L.sortItems(L.filterItems(state.items, ui)).filter((i) => i.priority === priority);
  const changes = L.reorder(shown, moved, beforeId, gp ? null : priority);
  changes.forEach((c) => {
    const it = state.items.find((i) => i.id === c.id);
    it.order = c.order;
    if (c.priority) it.priority = c.priority;
    touch(it);
  });
  if (changes.length) { save(); renderList(); }
}

(function wireReorder() {
  const list = $('#list');
  list.addEventListener('dragstart', (e) => {
    const card = e.target.closest('.card, .gcard');
    if (!card) return;
    dragId = card.dataset.id;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', dragId);
    card.classList.add('dragging');
  });
  list.addEventListener('dragover', (e) => {
    if (!dragId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    document.querySelectorAll('.drop-before, .drop-after, .drop-end').forEach((el) => el.classList.remove('drop-before', 'drop-after', 'drop-end'));
    dropAt = dropPlace(e);
    if (dropAt && dropAt.el) dropAt.el.classList.add(dropAt.mark);
  });
  list.addEventListener('drop', (e) => {
    if (!dragId) return;
    e.preventDefault();
    const at = dropAt;
    const id = dragId;
    dragId = null;
    dropAt = null;
    clearDropMarks();
    if (at) applyMove(id, at.beforeId, at.priority);
  });
  list.addEventListener('dragend', () => {
    dragId = null;
    dropAt = null;
    clearDropMarks();
  });
  list.addEventListener('keydown', (e) => {
    const card = e.target.closest('.card, .gcard');
    if (!card || e.target !== card || !e.altKey) return;
    const dir = { ArrowUp: -1, ArrowLeft: -1, ArrowDown: 1, ArrowRight: 1 }[e.key];
    if (!dir) return;
    e.preventDefault();
    const sibs = cardsIn(card.parentElement);
    const j = sibs.indexOf(card) + dir;
    if (j < 0 || j >= sibs.length) return;
    const beforeId = dir < 0 ? sibs[j].dataset.id : sibs[j + 1] ? sibs[j + 1].dataset.id : null;
    const group = card.closest('.group');
    applyMove(card.dataset.id, beforeId, group ? group.dataset.priority : null);
    const again = document.querySelector(`[data-id="${CSS.escape(card.dataset.id)}"]`);
    if (again) again.focus();
  });
})();
