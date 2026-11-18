/**
 * SCOTCH — Portrait layer depth (layer 2)
 * Scotch is cut out of the photo and sits on his own layer (.portrait-fg) over a
 * clean plate of the room (.portrait-bg). While the layer scrolls through the screen
 * he drifts a little faster than the room, so he looks separated from the background.
 * Transform-only, rAF-throttled, only while the layer is on screen.
 */
(() => {
  const layer = document.getElementById('layer-portrait');
  if (!layer) return;
  const fg = layer.querySelector('.portrait-fg');
  const bg = layer.querySelector('.portrait-bg');
  if (!fg || !bg) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const small = () => window.innerWidth <= 760;
  let visible = false, ticking = false;

  function update() {
    ticking = false;
    const r = layer.getBoundingClientRect();
    const vh = window.innerHeight;
    // -1 when the layer is just below the screen, 0 centred, +1 just above
    const p = Math.max(-1.2, Math.min(1.2, (vh / 2 - (r.top + r.height / 2)) / vh));
    const amp = small() ? 16 : 26;               // px Scotch moves relative to the page
    fg.style.transform = `translate3d(0, ${(-p * amp).toFixed(2)}px, 0)`;
    bg.style.transform = `translate3d(0, ${(p * amp * 0.35).toFixed(2)}px, 0)`;
  }
  const onScroll = () => {
    if (visible && !ticking) { ticking = true; requestAnimationFrame(update); }
  };

  new IntersectionObserver((es) => {
    visible = es[0].isIntersecting;
    if (visible) onScroll();
  }, { rootMargin: '20% 0px' }).observe(layer);
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
})();
