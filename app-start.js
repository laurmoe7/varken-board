// Startup: runs last, once every script above has loaded.
start();
// Shrink the sticky header once the list has scrolled (two thresholds, so it doesn't flicker at the edge).
(() => {
  const main = document.querySelector('.main'), top = document.getElementById('stickyTop');
  main.addEventListener('scroll', () => {
    const y = main.scrollTop;
    if (y > 90) top.classList.add('compact');
    else if (y < 10) top.classList.remove('compact');
  }, { passive: true });
})();
