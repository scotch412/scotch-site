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
  const RADIUS = isTouch ? 46 : 60;      // px: width of the "brush"
  const BRUSH = 0.95;                    // how hard a pass flicks the grains
  const SPREAD = 1.15;                   // sideways dispersion (0 = all straight ahead)
  const SLIDE = 0.87;                    // per-frame friction while sliding (sand on a table)
  const GRIT = 0.035;                    // extra constant friction: grains come to a dead stop
  const REST = [30, 80];                 // frames a grain lies where it landed before drifting back
  const RETURN = 0.032;                  // fraction of the way home per frame (slow drift)
  const MAX_RETURN = 2.2;                // px/frame cap while drifting back (calm, no snapping)

  const canvas = document.createElement('canvas');
  canvas.className = 'sand-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  layer.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  let n = 0, hx, hy, x, y, vx, vy, grain, bucket, cool, rest;
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
    cool = new Float32Array(n); rest = new Float32Array(n);
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

    // the brush stroke since the last frame: segment (ax,ay) -> (px,py)
    let ax = px, ay = py;
    if (lastPx !== null) { ax = lastPx; ay = lastPy; }
    lastPx = px; lastPy = py;
    let sx = px - ax, sy = py - ay;
    const speed = Math.hypot(sx, sy);
    const sweeping = speed > 0.4;
    const ux = sweeping ? sx / speed : 0, uy = sweeping ? sy / speed : 0; // stroke direction
    const nx = -uy, ny = ux;                                             // its normal
    const kick = Math.min(speed, 45) * BRUSH;
    const len2 = speed * speed || 1;

    const fr = Math.pow(SLIDE, dt);
    const R2 = RADIUS * RADIUS;
    let energy = 0;
    for (let i = 0; i < n; i++) {
      if (cool[i] > 0) cool[i] -= dt;

      // 1. Brush: grains near the stroke get one flick (forward + random sideways), then
      //    a short cooldown so they're knocked away instead of carried along.
      if (sweeping && cool[i] <= 0) {
        let t = ((x[i] - ax) * sx + (y[i] - ay) * sy) / len2;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const dx = x[i] - (ax + sx * t), dy = y[i] - (ay + sy * t);
        const d2 = dx * dx + dy * dy;
        if (d2 < R2) {
          const d = Math.sqrt(d2);
          const f = 1 - d / RADIUS;
          const g = grain[i];
          const fwd = (0.25 + Math.random() * 0.95) * g;
          // push sideways away from the stroke line, with randomness, so the sand fans out
          const side = Math.sign(dx * nx + dy * ny || Math.random() - 0.5);
          const lat = (side * 0.35 + (Math.random() - 0.5)) * SPREAD;
          vx[i] += (ux * fwd + nx * lat) * kick * f;
          vy[i] += (uy * fwd + ny * lat) * kick * f;
          cool[i] = 10 + Math.random() * 10;
          rest[i] = REST[0] + Math.random() * (REST[1] - REST[0]);
        }
      }

      // 2. Slide and stop (viscous + constant friction)
      vx[i] *= fr; vy[i] *= fr;
      const sp = Math.hypot(vx[i], vy[i]);
      if (sp > 0) {
        const ns = Math.max(0, sp - GRIT * dt);
        vx[i] *= ns / sp; vy[i] *= ns / sp;
      }

      // 3. After resting a moment, drift slowly back home
      if (rest[i] > 0) rest[i] -= dt;
      else {
        let rx = (hx[i] - x[i]) * RETURN * grain[i];
        let ry = (hy[i] - y[i]) * RETURN * grain[i];
        const rs = Math.hypot(rx, ry);
        if (rs > MAX_RETURN) { rx *= MAX_RETURN / rs; ry *= MAX_RETURN / rs; }
        x[i] += rx * dt; y[i] += ry * dt;
      }

      x[i] += vx[i] * dt; y[i] += vy[i] * dt;
      energy += sp + Math.abs(hx[i] - x[i]) * 0.02 + Math.abs(hy[i] - y[i]) * 0.02 + (rest[i] > 0 ? 0.05 : 0);
    }
    draw();

    // Go to sleep once everything has settled
    if (!sweeping && now - lastMove > 250 && energy / Math.max(1, n) < 0.004) {
      for (let i = 0; i < n; i++) { x[i] = hx[i]; y[i] = hy[i]; vx[i] = vy[i] = 0; rest[i] = cool[i] = 0; }
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
