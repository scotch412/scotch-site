/**
 * SCOTCH — Sand headline (layer 0)
 * The first-layer headline is redrawn as thousands of sand grains on a canvas.
 * Moving the mouse (or a finger) through it sweeps the grains along in the
 * direction of travel; they then slowly drift back into the letters.
 *
 * - The real <h1> stays in the page (SEO, screen readers, text selection) but is
 *   made transparent once the canvas is ready; its layout is used to place grains,
 *   so wrapping, size and letter-spacing always match the CSS.
 * - Typed arrays + one batched draw per alpha bucket; the loop sleeps when
 *   everything is at rest or the layer is off screen.
 * - Skipped entirely for prefers-reduced-motion.
 */
(() => {
  const layer = document.getElementById('layer-0');
  const heading = layer && layer.querySelector('.statement-text');
  if (!layer || !heading) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const isTouch = window.matchMedia('(hover: none)').matches;
  const TARGET = isTouch ? 5000 : 9500;  // approx. number of grains
  const RADIUS = isTouch ? 60 : 85;      // px: how far the sweep reaches
  const SWEEP = 0.3;                     // how much of the pointer's motion is passed on
  const SCATTER = 0.9;                   // random spray
  const RETURN = 0.0032;                 // spring back home (slow)
  const FRICTION = 0.885;                // per frame at 60fps (sand stops quickly)

  const canvas = document.createElement('canvas');
  canvas.className = 'sand-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  layer.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  let n = 0, hx, hy, x, y, vx, vy, grain, bucket;
  let size = 1, dpr = 1, W = 0, H = 0;
  let running = false, visible = true;
  let px = -1e4, py = -1e4, lastPx = null, lastPy = null, lastMove = 0;

  // ---------- sample the heading into grain positions ----------
  function build() {
    const lr = layer.getBoundingClientRect();
    W = lr.width; H = lr.height;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);

    // Draw every character exactly where the browser laid it out
    const S = 2; // oversample for cleaner edges
    const off = document.createElement('canvas');
    off.width = Math.ceil(W * S); off.height = Math.ceil(H * S);
    const o = off.getContext('2d');
    const cs = getComputedStyle(heading);
    o.scale(S, S);
    o.fillStyle = '#fff';
    o.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    o.textBaseline = 'alphabetic';
    const ascent = o.measureText('Hg').fontBoundingBoxAscent ?? parseFloat(cs.fontSize) * 0.8;

    const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const t = node.textContent;
      for (let i = 0; i < t.length; i++) {
        if (/\s/.test(t[i])) continue;
        range.setStart(node, i); range.setEnd(node, i + 1);
        const r = range.getBoundingClientRect();
        if (!r.width) continue;
        o.fillText(t[i], r.left - lr.left, r.top - lr.top + ascent);
      }
    }

    // Pick a grid step that gives roughly TARGET grains
    const img = o.getImageData(0, 0, off.width, off.height).data;
    let filled = 0;
    for (let i = 3; i < img.length; i += 4 * 4) if (img[i] > 128) filled++;
    const area = (filled * 4) / (S * S); // filled CSS px²
    const step = Math.max(0.7, Math.sqrt(area / TARGET));
    size = Math.max(1, step * 1.05);

    const list = [];
    for (let gy = 0; gy < H; gy += step) {
      for (let gx = 0; gx < W; gx += step) {
        const jx = gx + (Math.random() - 0.5) * step, jy = gy + (Math.random() - 0.5) * step;
        const ix = Math.round(jx * S), iy = Math.round(jy * S);
        if (ix < 0 || iy < 0 || ix >= off.width || iy >= off.height) continue;
        if (img[(iy * off.width + ix) * 4 + 3] > 110) list.push(jx, jy);
      }
    }

    n = list.length / 2;
    hx = new Float32Array(n); hy = new Float32Array(n);
    x = new Float32Array(n); y = new Float32Array(n);
    vx = new Float32Array(n); vy = new Float32Array(n);
    grain = new Float32Array(n); bucket = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      hx[i] = x[i] = list[i * 2];
      hy[i] = y[i] = list[i * 2 + 1];
      grain[i] = 0.55 + Math.random() * 0.9;        // each grain moves/returns a bit differently
      bucket[i] = Math.random() < 0.25 ? 0 : Math.random() < 0.5 ? 1 : 2; // brightness variation
    }

    heading.classList.add('is-sand');
    draw();
  }

  // ---------- draw ----------
  const ALPHA = [0.62, 0.84, 1];
  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    for (let b = 0; b < 3; b++) {
      ctx.globalAlpha = ALPHA[b];
      ctx.beginPath();
      for (let i = 0; i < n; i++) if (bucket[i] === b) ctx.rect(x[i], y[i], size, size);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ---------- simulate ----------
  let last = 0;
  function frame(now) {
    if (!visible) { running = false; return; }
    const dt = Math.min(2.5, last ? (now - last) / 16.667 : 1); // in 60fps frames
    last = now;

    // pointer motion since the last frame
    let mvx = 0, mvy = 0;
    if (lastPx !== null) { mvx = px - lastPx; mvy = py - lastPy; }
    lastPx = px; lastPy = py;
    const speed = Math.hypot(mvx, mvy);
    if (speed > 60) { mvx *= 60 / speed; mvy *= 60 / speed; }
    const sweeping = speed > 0.3;

    const fr = Math.pow(FRICTION, dt);
    const R2 = RADIUS * RADIUS;
    let energy = 0;
    for (let i = 0; i < n; i++) {
      const g = grain[i];
      if (sweeping) {
        const dx = x[i] - px, dy = y[i] - py, d2 = dx * dx + dy * dy;
        if (d2 < R2) {
          const d = Math.sqrt(d2) || 1;
          const f = (1 - d / RADIUS); const f2 = f * f;
          // drag each grain toward the pointer's velocity (never faster than the pointer),
          // plus a little outward push and random spray so it scatters like sand
          const k = Math.min(1, f2 * SWEEP * 2 * g);
          vx[i] += (mvx * 0.8 - vx[i]) * k + ((dx / d) * 0.35 + (Math.random() - 0.5) * SCATTER * Math.min(speed, 20) * 0.08) * f2;
          vy[i] += (mvy * 0.8 - vy[i]) * k + ((dy / d) * 0.35 + (Math.random() - 0.5) * SCATTER * Math.min(speed, 20) * 0.08) * f2;
        }
      }
      vx[i] += (hx[i] - x[i]) * RETURN * g * dt;
      vy[i] += (hy[i] - y[i]) * RETURN * g * dt;
      vx[i] *= fr; vy[i] *= fr;
      x[i] += vx[i] * dt; y[i] += vy[i] * dt;
      energy += Math.abs(vx[i]) + Math.abs(vy[i]) + Math.abs(hx[i] - x[i]) * 0.02 + Math.abs(hy[i] - y[i]) * 0.02;
    }
    draw();

    // Go to sleep once everything has settled
    if (!sweeping && now - lastMove > 250 && energy / Math.max(1, n) < 0.004) {
      for (let i = 0; i < n; i++) { x[i] = hx[i]; y[i] = hy[i]; vx[i] = vy[i] = 0; }
      draw();
      running = false; last = 0;
      return;
    }
    requestAnimationFrame(frame);
  }
  function wake() {
    if (running || !visible || !n) return;
    running = true; last = 0;
    requestAnimationFrame(frame);
  }

  // ---------- input ----------
  function onMove(e) {
    const r = layer.getBoundingClientRect();
    const nx = e.clientX - r.left, ny = e.clientY - r.top;
    if (nx < -RADIUS || ny < -RADIUS || nx > r.width + RADIUS || ny > r.height + RADIUS) {
      lastPx = null; return;
    }
    if (lastPx === null) { lastPx = nx; lastPy = ny; }
    px = nx; py = ny;
    lastMove = performance.now();
    wake();
  }
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerdown', onMove, { passive: true });
  window.addEventListener('pointerup', () => { lastPx = null; }, { passive: true });
  document.addEventListener('pointerleave', () => { lastPx = null; });

  new IntersectionObserver((es) => {
    visible = es[0].isIntersecting;
    if (visible && n) wake();
  }).observe(layer);

  let rt;
  const rebuild = () => { clearTimeout(rt); rt = setTimeout(build, 150); };
  new ResizeObserver(rebuild).observe(layer);

  (document.fonts ? document.fonts.ready : Promise.resolve()).then(build);
})();
