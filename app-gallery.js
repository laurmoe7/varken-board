// Picture gallery: a project's gallery ideas (for example Pet Shopper's cosmetics) as big pictures.
// The data is ordinary items with `gallery: true`; list views never show them.

function galleryItems(gp) {
  return L.sortGallery(L.filterItems(state.items, { project: gp.id, status: 'all', gallery: true, q: ui.q, slot: ui.slot }));
}

function gcardHtml(it) {
  const first = it.images[0];
  const badge = it.status === 'done' ? '<span class="gbadge made">In the game ✓</span>' : it.status === 'doing' ? '<span class="gbadge doing">Making it</span>' : '';
  return `<article class="gcard ${it.status} ${ui.open === it.id ? 'sel' : ''}" data-id="${esc(it.id)}" tabindex="0" draggable="true">
    <div class="gimg ${first ? '' : 'none'}">${first ? `<img data-img="${esc(first)}" alt="">` : '🎀'}</div>
    ${badge}
    <button class="check" data-check aria-label="${it.status === 'done' ? 'Mark not in the game' : 'Mark in the game'}">✓</button>
    <div class="gbody">
      <div class="gtitle">${esc(it.title)}</div>
      ${it.slot || it.images.length > 1 ? `<div class="meta">${it.slot ? `<span class="tag slot">${esc(it.slot)}</span>` : ''}${it.images.length > 1 ? `<span class="tag">🖼 ${it.images.length}</span>` : ''}</div>` : ''}
      ${it.notes ? `<div class="gnotes">${esc(it.notes)}</div>` : ''}
    </div>
  </article>`;
}

function renderGallery(gp) {
  const used = L.slotCounts(state.items, gp.id, gp.slots).map((x) => x.slot);
  if (ui.slot !== 'all' && !used.includes(ui.slot)) ui.slot = 'all'; // the last card of a slot moved on
  const items = galleryItems(gp);
  const el = $('#list');
  if (!items.length) {
    el.innerHTML = `<div class="empty">${$('.logo .pig').outerHTML}<b>${ui.q ? 'Nothing matches' : 'No ' + esc(gp.gallery.toLowerCase()) + ' ideas yet'}</b>${
      ui.q ? 'Try a different search.' : 'Type a name above, then paste or drop a picture.'
    }</div>`;
    return;
  }
  el.innerHTML = `<div class="gallery">${items.map(gcardHtml).join('')}</div>`;
  hydrate(el);
}
