// Startup: runs last, once every script above has loaded.
start();
// The sticky header sticks from its filter row down: its offset is how far that row is from the header's top.
(() => {
  const head = document.getElementById('stickyTop'), tools = head.querySelector('.tools'), card = head.querySelector('.top');
  const pad = parseFloat(getComputedStyle(head.parentElement).paddingTop) || 0; // sticky counts from inside the scroller's padding
  const place = () => { head.style.top = -(card.offsetTop + tools.offsetTop - 10) - pad + 'px'; };
  place();
  new ResizeObserver(place).observe(card);
  addEventListener('resize', place);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);
})();
