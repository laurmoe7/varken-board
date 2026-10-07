// Startup: runs last, once every script above has loaded.
start();
// The pig card shrinks as the list scrolls: --p goes from 0 to 1 over D pixels of scrolling, where D is how much
// shorter the header gets (measured). The spacer under the header gives that height back, so the list stays put.
(() => {
  const root = document.documentElement, main = document.querySelector('.main'), head = document.getElementById('stickyTop'), hint = document.getElementById('quickHint');
  let D = 0, raf = 0;
  const apply = () => { raf = 0; root.style.setProperty('--p', D > 0 ? Math.min(1, Math.max(0, main.scrollTop / D)).toFixed(4) : '0'); };
  const measure = () => {
    hint.style.height = 'auto';
    root.style.setProperty('--hintH', hint.offsetHeight + 'px');
    hint.style.height = '';
    root.style.setProperty('--p', '0');
    const full = head.offsetHeight;
    root.style.setProperty('--p', '1');
    D = full - head.offsetHeight;
    root.style.setProperty('--D', D + 'px');
    apply();
  };
  main.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(apply); }, { passive: true });
  addEventListener('resize', measure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  measure();
})();
