// Compare view for gallery pictures: tick the ⚖ on two to four cards, then see them big and side by side.
const compare = new Set();
const COMPARE_MAX = 4;

function paintCompareBar() {
  const gp = galleryProject();
  const alive = new Set(galleryItems(gp || { id: '' }).map((i) => i.id));
  Array.from(compare).forEach((id) => alive.has(id) || compare.delete(id)); // cards that left the view
  const bar = $('#cmpBar');
  bar.hidden = !gp || !compare.size;
  $('#cmpCount').textContent = compare.size === 1 ? 'Pick one more to compare' : compare.size + ' picked';
  $('#cmpGo').disabled = compare.size < 2;
}

function openCompare() {
  const gp = galleryProject();
  if (!gp || compare.size < 2) return;
  pigSay('compare', { p: 0.5 });
  const picks = galleryItems(gp).filter((i) => compare.has(i.id));
  $('#cmpGrid').style.setProperty('--n', picks.length);
  $('#cmpGrid').innerHTML = picks
    .map(
      (it) => `<figure class="cmp-col">
      <div class="cmp-img">${it.images.length ? `<img data-img="${esc(it.images[0])}" alt="">` : '🎀'}</div>
      <figcaption><b>${esc(it.title)}</b>${it.slot ? ` <span class="tag slot">${esc(it.slot)}</span>` : ''}${it.notes ? `<p>${esc(it.notes)}</p>` : ''}</figcaption>
    </figure>`
    )
    .join('');
  hydrate($('#cmpGrid'));
  $('#compareDlg').showModal();
}

// Capture phase: the ⚖ button must not also open the card.
$('#list').addEventListener(
  'click',
  (e) => {
    const b = e.target.closest('[data-cmp]');
    if (!b) return;
    e.stopImmediatePropagation();
    const id = b.closest('.gcard').dataset.id;
    if (compare.has(id)) compare.delete(id);
    else if (compare.size >= COMPARE_MAX) { toast('Compare up to ' + COMPARE_MAX + ' at a time'); return; }
    else compare.add(id);
    b.closest('.gcard').classList.toggle('cmp-on', compare.has(id));
    b.setAttribute('aria-pressed', compare.has(id));
    paintCompareBar();
  },
  true
);
$('#cmpGo').onclick = openCompare;
$('#cmpClear').onclick = () => { compare.clear(); renderList(); };
$('#cmpClose').onclick = () => $('#compareDlg').close();
$('#compareDlg').addEventListener('click', (e) => { if (e.target.id === 'compareDlg') $('#compareDlg').close(); });
