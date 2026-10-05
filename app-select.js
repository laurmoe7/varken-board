// Cute dropdowns: every <select> is swapped for a pill button and a pastel list (the browser's own list can't be
// themed). The real select stays in the page, hidden, so the rest of the code keeps reading and setting its value.
function enhanceSelect(sel) {
  if (sel.dataset.dd) return;
  sel.dataset.dd = '1';
  const wrap = document.createElement('div');
  wrap.className = 'dd';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'dd-btn';
  btn.setAttribute('aria-haspopup', 'listbox');
  btn.setAttribute('aria-label', sel.getAttribute('aria-label') || sel.closest('label')?.textContent.trim() || 'Choose');
  const list = document.createElement('div');
  list.className = 'dd-list';
  list.setAttribute('role', 'listbox');
  list.hidden = true;
  sel.after(wrap);
  wrap.append(sel, btn, list);
  sel.classList.add('dd-native');
  let hi = -1;
  const opts = () => [...sel.options];
  const paint = () => {
    btn.textContent = sel.options[sel.selectedIndex] ? sel.options[sel.selectedIndex].textContent : '';
  };
  const close = () => { list.hidden = true; btn.classList.remove('open'); };
  const choose = (i) => {
    close();
    if (i < 0 || i === sel.selectedIndex) return;
    sel.selectedIndex = i;
    paint();
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  };
  const mark = (i) => {
    hi = i;
    [...list.children].forEach((c, k) => c.classList.toggle('hi', k === i));
    if (list.children[i]) list.children[i].scrollIntoView({ block: 'nearest' });
  };
  const open = () => {
    list.innerHTML = '';
    opts().forEach((o, i) => {
      const row = document.createElement('div');
      row.className = 'dd-opt' + (i === sel.selectedIndex ? ' on' : '');
      row.setAttribute('role', 'option');
      row.textContent = o.textContent;
      row.addEventListener('mousedown', (e) => { e.preventDefault(); choose(i); });
      row.addEventListener('mousemove', () => mark(i));
      list.append(row);
    });
    list.hidden = false;
    btn.classList.add('open');
    mark(sel.selectedIndex);
  };
  btn.addEventListener('click', () => (list.hidden ? open() : close()));
  btn.addEventListener('blur', close);
  btn.addEventListener('keydown', (e) => {
    const n = sel.options.length;
    if (e.key === 'Escape' && !list.hidden) { e.preventDefault(); e.stopPropagation(); close(); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (list.hidden) return open();
      mark((hi + (e.key === 'ArrowDown' ? 1 : -1) + n) % n);
    } else if ((e.key === 'Enter' || e.key === ' ') && !list.hidden) { e.preventDefault(); e.stopPropagation(); choose(hi); }
  });
  // keep the label right when the app sets the value itself
  const proto = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
  Object.defineProperty(sel, 'value', { get() { return proto.get.call(sel); }, set(v) { proto.set.call(sel, v); paint(); }, configurable: true });
  paint();
}
function enhanceSelects(root) { (root || document).querySelectorAll('select').forEach(enhanceSelect); }
enhanceSelects();
new MutationObserver(() => enhanceSelects()).observe(document.body, { childList: true, subtree: true });
