/**
 * SCOTCH — Sand headline (layer 0)
 * At rest the first-layer headline looks like normal solid text. Brushing the
 * mouse (or a finger) through it knocks grains of "sand" out of the letters:
 * they fan out, slide and slow to a stop, then accelerate back home (ease-in, like
 * being pulled by gravity) and merge back into the solid text.
 *
 * How it's drawn: a crisp copy of the text is painted on a canvas; every grain that
 * has left home punches a small hole in that copy and is drawn as a particle
 * instead. When it lands, the hole closes and the text is solid again.
 *
 * - The real <h1> stays in the page (SEO, screen readers, text selection) but is
 *   transparent; its layout places the grains, so wrapping/size always match the CSS.
 * - The loop sleeps when everything is home or the layer is off screen.
 * - Skipped entirely for prefers-reduced-motion.
 */
(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  // Layers whose headline becomes sand
  // (per-layer tweaks: the portrait layer's sand comes home faster)
  [['layer-0', {}], ['layer-portrait', { back: [16, 28], backPerPx: 0.05, hang: [0, 4] }]].forEach(([id, opts]) => {
    const layer = document.getElementById(id);
    const heading = layer && layer.querySelector('.statement-text');
    if (layer && heading) sand(layer, heading, opts);
  });
})();

function sand(layer, heading, opts = {}) {

  const isTouch = window.matchMedia('(hover: none)').matches;
  const STEP = isTouch ? 1.15 : 1.0;     // px between grains (finer = more grains)
  const MAX_GRAINS = isTouch ? 8000 : 22000;
  const RADIUS = isTouch ? 46 : 60;      // px: width of the "brush"
  const BRUSH = 0.95;                    // how hard a pass flicks the grains
  const SPREAD = 1.15;                   // sideways dispersion (0 = all straight ahead)
  const SLIDE = 0.87;                    // per-frame friction while sliding
  const GRIT = 0.035;                    // extra constant friction so grains come to a stop
  const HANG = opts.hang || [2, 10];                  // frames a grain hangs (stopped) before heading back
  const BACK = opts.back || [30, 50];                 // frames for the trip home (plus a little per px of distance)
  const BACK_PER_PX = opts.backPerPx ?? 0.1;
  const easeIn = (u) => u * u * u;       // slow start, accelerating into place

  const canvas = document.createElement('canvas');
  canvas.className = 'sand-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  layer.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  let solid = null; // crisp text at device resolution

  // state: 0 = home (part of the solid text), 1 = sliding, 2 = returning
  let n = 0, hx, hy, x, y, vx, vy, grain, bucket, cool, state, timer, sx, sy, dur;
  let size = 1, hole = 2, dpr = 1, W = 0, H = 0, away = 0;
  let running = false, visible = true;
  let px = -1e4, py = -1e4, lastPx = null, lastPy = null, lastMove = 0;

  // ---------- paint the heading exactly where the browser laid it out ----------
  function paintText(c, scale, lr) {
    c.setTransform(scale, 0, 0, scale, 0, 0);
    c.fillStyle = '#fff';
    c.textBaseline = 'alphabetic';
    const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      // each text run uses its own element's font (e.g. a bigger emphasised word)
      const cs = getComputedStyle(node.parentElement);
      c.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const ascent = c.measureText('Hg').fontBoundingBoxAscent ?? parseFloat(cs.fontSize) * 0.8;
      const t = node.textContent;
      for (let i = 0; i < t.length; i++) {
        if (/\s/.test(t[i])) continue;
        range.setStart(node, i); range.setEnd(node, i + 1);
        const r = range.getBoundingClientRect();
        if (r.width) c.fillText(t[i], r.left - lr.left, r.top - lr.top + ascent);
      }
    }
  }

  function build() {
    const lr = layer.getBoundingClientRect();
    W = lr.width; H = lr.height;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);

    solid = document.createElement('canvas');
    solid.width = canvas.width; solid.height = canvas.height;
    paintText(solid.getContext('2d'), dpr, lr);

    // Sample grain positions from an oversampled copy
    const S = 2;
    const off = document.createElement('canvas');
    off.width = Math.ceil(W * S); off.height = Math.ceil(H * S);
    const o = off.getContext('2d');
    paintText(o, S, lr);
    const img = o.getImageData(0, 0, off.width, off.height).data;
    let filled = 0;
    for (let i = 3; i < img.length; i += 16) if (img[i] > 128) filled++;
    const area = (filled * 4) / (S * S);
    const step = Math.max(STEP, Math.sqrt(area / MAX_GRAINS));
    size = Math.max(1, step * 1.05);
    hole = step * 1.9; // hole each missing grain leaves in the solid text

    const list = [];
    for (let gy = 0; gy < H; gy += step) {
      for (let gx = 0; gx < W; gx += step) {
        const jx = gx + (Math.random() - 0.5) * step, jy = gy + (Math.random() - 0.5) * step;
        const ix = Math.round(jx * S), iy = Math.round(jy * S);
        if (ix < 0 || iy < 0 || ix >= off.width || iy >= off.height) continue;
        if (img[(iy * off.width + ix) * 4 + 3] > 90) list.push(jx, jy);
      }
    }

    n = list.length / 2;
    const F = () => new Float32Array(n);
    hx = F(); hy = F(); x = F(); y = F(); vx = F(); vy = F();
    grain = F(); cool = F(); timer = F(); sx = F(); sy = F(); dur = F();
    bucket = new Uint8Array(n); state = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      hx[i] = x[i] = list[i * 2];
      hy[i] = y[i] = list[i * 2 + 1];
      grain[i] = 0.55 + Math.random() * 0.9;   // each grain moves a bit differently
      bucket[i] = Math.random() < 0.25 ? 0 : Math.random() < 0.5 ? 1 : 2; // brightness variation
    }
    away = 0;
    heading.classList.add('is-sand');
    draw();
  }

  // ---------- draw ----------
  const ALPHA = [0.62, 0.84, 1];
  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (solid) ctx.drawImage(solid, 0, 0);
    if (!away) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // holes where grains have left
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    const ho = (hole - size) / 2;
    for (let i = 0; i < n; i++) if (state[i]) ctx.rect(hx[i] - ho, hy[i] - ho, hole, hole);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    // the loose grains
    ctx.fillStyle = '#fff';
    for (let b = 0; b < 3; b++) {
      ctx.globalAlpha = ALPHA[b];
      ctx.beginPath();
      for (let i = 0; i < n; i++) if (state[i] && bucket[i] === b) ctx.rect(x[i], y[i], size, size);
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

    // the brush stroke since the last frame: segment (ax,ay) -> (px,py)
    let ax = px, ay = py;
    if (lastPx !== null) { ax = lastPx; ay = lastPy; }
    lastPx = px; lastPy = py;
    const bx = px - ax, by = py - ay;
    const speed = Math.hypot(bx, by);
    const sweeping = speed > 0.4;
    const ux = sweeping ? bx / speed : 0, uy = sweeping ? by / speed : 0;
    const nx = -uy, ny = ux;
    const kick = Math.min(speed, 45) * BRUSH;
    const len2 = speed * speed || 1;
    const fr = Math.pow(SLIDE, dt);
    const R2 = RADIUS * RADIUS;

    away = 0;
    for (let i = 0; i < n; i++) {
      if (cool[i] > 0) cool[i] -= dt;

      // 1. Brush: one flick per pass (forward + fanned sideways), then a short cooldown
      if (sweeping && cool[i] <= 0) {
        let t = ((x[i] - ax) * bx + (y[i] - ay) * by) / len2;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const dx = x[i] - (ax + bx * t), dy = y[i] - (ay + by * t);
        const d2 = dx * dx + dy * dy;
        if (d2 < R2) {
          const f = 1 - Math.sqrt(d2) / RADIUS;
          const fwd = (0.25 + Math.random() * 0.95) * grain[i];
          const side = Math.sign(dx * nx + dy * ny || Math.random() - 0.5);
          const lat = (side * 0.35 + (Math.random() - 0.5)) * SPREAD;
          vx[i] += (ux * fwd + nx * lat) * kick * f;
          vy[i] += (uy * fwd + ny * lat) * kick * f;
          cool[i] = 10 + Math.random() * 10;
          state[i] = 1;
          timer[i] = HANG[0] + Math.random() * (HANG[1] - HANG[0]);
        }
      }

      const st = state[i];
      if (st === 1) {
        // 2. Slide and slow to a stop
        vx[i] *= fr; vy[i] *= fr;
        const sp = Math.hypot(vx[i], vy[i]);
        if (sp > 0) { const ns = Math.max(0, sp - GRIT * dt); vx[i] *= ns / sp; vy[i] *= ns / sp; }
        x[i] += vx[i] * dt; y[i] += vy[i] * dt;
        if (sp < 0.12) {
          timer[i] -= dt;
          if (timer[i] <= 0) {
            // 3. Start the trip home from a standstill
            state[i] = 2; vx[i] = vy[i] = 0;
            sx[i] = x[i]; sy[i] = y[i]; timer[i] = 0;
            const dist = Math.hypot(hx[i] - x[i], hy[i] - y[i]);
            dur[i] = (BACK[0] + Math.random() * (BACK[1] - BACK[0]) + dist * BACK_PER_PX) / (0.75 + grain[i] * 0.3);
          }
        }
        away++;
      } else if (st === 2) {
        // 4. Accelerate back into place (ease-in), then rejoin the solid text
        timer[i] += dt;
        const u = Math.min(1, timer[i] / dur[i]);
        const e = easeIn(u);
        x[i] = sx[i] + (hx[i] - sx[i]) * e;
        y[i] = sy[i] + (hy[i] - sy[i]) * e;
        if (u >= 1) { state[i] = 0; x[i] = hx[i]; y[i] = hy[i]; }
        else away++;
      }
    }
    draw();

    // Sleep once every grain is home and the pointer has stopped
    if (!away && now - lastMove > 250) { running = false; last = 0; return; }
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
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    if (mx < -RADIUS || my < -RADIUS || mx > r.width + RADIUS || my > r.height + RADIUS) {
      lastPx = null; return;
    }
    if (lastPx === null) { lastPx = mx; lastPy = my; }
    px = mx; py = my;
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
  new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(build, 150); }).observe(layer);
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(build);
}
