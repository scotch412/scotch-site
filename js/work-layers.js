/**
 * SCOTCH — Home page work layers
 * 1. Hover preview: hovering a work layer plays its film (muted) over the thumbnail.
 *    - Local file (data-preview-src) or muted YouTube embed (data-preview-youtube).
 *    - Speed: as a layer scrolls near the screen its YouTube player loads and starts
 *      playing muted and hidden, so hovering simply reveals it (instant, and YouTube's
 *      play/pause indicator never appears because no play command is sent on hover).
 *      Players are unloaded again when their layer scrolls far away.
 *    - Mouse/trackpad: plays on hover. Touch screens (no hover): plays while the
 *      layer fills most of the screen, and only appears once it's really playing.
 * 2. Back-to-top button: appears after the first layer, smooth-scrolls to the top.
 * 3. Background videos (reel, TV) are nudged to autoplay on mobile.
 */
document.addEventListener('DOMContentLoaded', () => {
  // ---------- 1. Hover previews ----------
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const YT_ORIGIN = 'https://www.youtube-nocookie.com';
  const players = new Map(); // iframe.contentWindow -> controller (for YouTube messages)

  function makeController(layer) {
    const src = layer.getAttribute('data-preview-src');
    const yt = layer.getAttribute('data-preview-youtube');
    const media = layer.querySelector('.plane-media');
    const c = { el: null, frame: null, ready: false, playing: false, wantPlay: false, hideTimer: null };

    const reveal = () => c.el && c.el.classList.add('is-visible');

    c.load = () => {
      if (c.el) return;
      if (src) {
        const v = document.createElement('video');
        v.className = 'work-preview';
        v.src = src;
        v.muted = true;
        v.loop = true;
        v.playsInline = true;
        v.preload = 'auto';
        v.addEventListener('playing', () => { if (c.wantPlay) reveal(); });
        media.appendChild(v);
        c.el = v;
      } else if (yt) {
        const wrap = document.createElement('div');
        wrap.className = 'work-preview work-preview--yt';
        const f = document.createElement('iframe');
        f.src = `${YT_ORIGIN}/embed/${yt}?enablejsapi=1&autoplay=1&mute=1&controls=0&loop=1&playlist=${yt}` +
          `&modestbranding=1&rel=0&playsinline=1&disablekb=1&iv_load_policy=3&cc_load_policy=0&origin=${encodeURIComponent(location.origin)}`;
        f.title = '';
        f.tabIndex = -1;
        f.setAttribute('aria-hidden', 'true');
        f.allow = 'autoplay; encrypted-media';
        // Ask the player to send us its state changes once it has loaded
        f.addEventListener('load', () => {
          f.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: yt }), YT_ORIGIN);
        });
        wrap.appendChild(f);
        media.appendChild(wrap);
        c.el = wrap;
        c.frame = f;
        // contentWindow exists right after insertion
        players.set(f.contentWindow, c);
      }
    };

    c.command = (func, args = []) => {
      if (c.frame && c.frame.contentWindow) {
        c.frame.contentWindow.postMessage(JSON.stringify({ event: 'command', func, args }), YT_ORIGIN);
      }
    };

    // Previews are visual only: turn captions off (YouTube can ignore cc_load_policy
    // if the viewer has captions on in their account, so unload the module too)
    c.hideCaptions = () => {
      c.command('unloadModule', ['captions']);
      c.command('unloadModule', ['cc']);
    };

    c.play = () => {
      c.load();
      c.wantPlay = true;
      clearTimeout(c.hideTimer);
      if (c.el.tagName === 'VIDEO') {
        c.el.play().catch(() => {});
        if (!c.el.paused && c.el.readyState >= 3) reveal();
      } else if (c.playing) {
        reveal(); // already running in the background: just show it
      } else {
        // Still loading: it reveals itself when the "playing" message arrives.
        if (c.ready) c.command('playVideo');
        // Safety net (mouse only): reveal anyway if that message never comes.
        if (!c.strict) c.hideTimer = setTimeout(() => { if (c.wantPlay) reveal(); }, 2500);
      }
    };

    c.pause = () => {
      c.wantPlay = false;
      if (!c.el) return;
      c.el.classList.remove('is-visible');
      // Local files pause; YouTube keeps playing hidden so the next hover is instant
      // (pausing/resuming would flash YouTube's play/pause indicator). On touch
      // screens there's no hover to wait for, so YouTube pauses too (saves battery).
      c.hideTimer = setTimeout(() => {
        if (!c.el) return;
        if (c.el.tagName === 'VIDEO') c.el.pause();
        else if (c.strict) c.command('pauseVideo');
      }, 350);
    };

    c.unload = () => {
      if (!c.el || c.wantPlay) return;
      if (c.frame) players.delete(c.frame.contentWindow);
      c.el.remove();
      c.el = null; c.frame = null; c.ready = false; c.playing = false;
    };

    // Messages from this layer's YouTube player
    c.onMessage = (data) => {
      if (data.event === 'onReady') {
        c.ready = true;
        c.command('mute');
        c.hideCaptions();
        c.command('playVideo'); // in case the browser ignored autoplay (still hidden here)
      }
      const state = data.event === 'onStateChange' ? data.info
        : (data.event === 'infoDelivery' && data.info ? data.info.playerState : undefined);
      if (state === 1) {          // 1 = playing
        if (!c.playing) c.hideCaptions(); // captions module loads with playback
        c.playing = true;
        // let YouTube's start-up overlay fade (the mobile player shows its controls for ~3s)
        if (c.wantPlay) setTimeout(() => { if (c.wantPlay) reveal(); }, c.strict ? 3200 : 600);
      } else if (state === 0 || state === 2) {
        c.playing = false;
      }
    };

    return c;
  }

  {
    window.addEventListener('message', (e) => {
      if (e.origin !== YT_ORIGIN) return;
      const c = players.get(e.source);
      if (!c) return;
      let data;
      try { data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; } catch { return; }
      if (data) c.onMessage(data);
    });

    const controllers = new Map();
    document.querySelectorAll('.work-layer').forEach((layer) => {
      if (!layer.hasAttribute('data-preview-src') && !layer.hasAttribute('data-preview-youtube')) return;
      const c = makeController(layer);
      // Touch screens: only reveal once the film is really playing (never show a
      // paused YouTube frame with its big play button)
      c.strict = !canHover;
      controllers.set(layer, c);
      if (canHover) {
        // Hover target is the card's untransformed hit area (falls back to the layer)
        const hit = layer.querySelector('.work-card') || layer;
        hit.addEventListener('mouseenter', c.play);
        hit.addEventListener('mouseleave', c.pause);
      }
    });

    // Pre-load players for layers on or near the screen; unload far-away ones
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const c = controllers.get(entry.target);
        if (!c) return;
        if (entry.isIntersecting) c.load();
        else c.unload();
      });
    }, { rootMargin: '60% 0px 60% 0px' });
    controllers.forEach((_, layer) => io.observe(layer));

    // Touch screens (no hover): the film plays while its layer fills most of the screen
    if (!canHover) {
      const playIO = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          const c = controllers.get(entry.target);
          if (!c) return;
          if (entry.intersectionRatio >= 0.6) c.play();
          else if (c.wantPlay) c.pause();
        });
      }, { threshold: [0, 0.6] });
      controllers.forEach((_, layer) => playIO.observe(layer));
    }
  }

  // ---------- 1a. Glass cards: hover tilt ----------
  // Under a mouse, a work card tilts so the spot under the cursor is "pressed back"
  // into the page (no idle floating). Springs for smoothness; the rAF loop only runs
  // while a card is moving, and only `transform` is written.
  {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const TILT = 4;        // max degrees
    const PRESS = 14;      // px pushed back (translateZ) while hovered
    const STIFF = 170, DAMP = 20;       // spring (per second)
    const PILL_H = 55;                  // px the title pill "hovers" above the card

    const cards = [...document.querySelectorAll('.work-layer')].map((layer, i) => {
      const hit = layer.querySelector('.work-card');
      const float = layer.querySelector('.work-card-float');
      const glass = layer.querySelector('.work-card-glass');
      const pill = layer.querySelector('.work-pill');
      if (!hit || !float) return null;
      const k = {
        layer, hit, float, glass, pill, visible: false, hover: false,
        // spring state: tiltX, tiltY, press (current + velocity), and targets
        s: { rx: 0, ry: 0, z: 0 }, v: { rx: 0, ry: 0, z: 0 }, t: { rx: 0, ry: 0, z: 0 },
        hoverAmt: 0,
      };
      if (canHover && !reduceMotion) {
        hit.addEventListener('pointerenter', () => { k.hover = true; layer.classList.add('is-hovered'); });
        hit.addEventListener('pointerleave', () => {
          k.hover = false; layer.classList.remove('is-hovered');
          k.t.rx = k.t.ry = k.t.z = 0;
        });
        hit.addEventListener('pointermove', (e) => {
          const r = hit.getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * 2 - 1;  // -1 … 1
          const py = ((e.clientY - r.top) / r.height) * 2 - 1;
          k.t.ry = px * TILT;     // right side goes back when the cursor is on the right
          k.t.rx = -py * TILT;    // bottom goes back when the cursor is at the bottom
          k.t.z = -PRESS;
        });
      } else if (canHover) {
        hit.addEventListener('pointerenter', () => layer.classList.add('is-hovered'));
        hit.addEventListener('pointerleave', () => layer.classList.remove('is-hovered'));
      }
      return k;
    }).filter(Boolean);

    if (cards.length && !reduceMotion) {
      const vis = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          const k = cards.find((c) => c.layer === en.target);
          if (k) k.visible = en.isIntersecting;
        });
      }, { rootMargin: '10% 0px' });
      cards.forEach((k) => vis.observe(k.layer));

      // The loop only runs while a card is moving (hovered or springing back), then sleeps.
      let last = 0, running = false;
      const frame = (now) => {
        const dt = Math.min(0.05, last ? (now - last) / 1000 : 1 / 60); // clamp after tab switches
        last = now;
        let busy = false;
        for (const k of cards) {
          if (!k.visible) continue;
          // springs toward the target tilt/press
          for (const key of ['rx', 'ry', 'z']) {
            const a = STIFF * (k.t[key] - k.s[key]) - DAMP * k.v[key];
            k.v[key] += a * dt;
            k.s[key] += k.v[key] * dt;
            if (Math.abs(k.t[key] - k.s[key]) > 0.01 || Math.abs(k.v[key]) > 0.01) busy = true;
          }
          const target = k.hover ? 1 : 0;
          k.hoverAmt += (target - k.hoverAmt) * Math.min(1, dt * 4);
          if (Math.abs(target - k.hoverAmt) > 0.002) busy = true;
          if (k.hover) busy = true;
          k.float.style.transform =
            `translate3d(0, 0, ${k.s.z.toFixed(2)}px) ` +
            `rotateX(${k.s.rx.toFixed(3)}deg) rotateY(${k.s.ry.toFixed(3)}deg)`;
          // Title pill floats above the card: as the card tilts, the raised pill shifts
          // (parallax) and its shadow stays behind on the video, so they visibly separate.
          if (k.pill && canHover) {
            const lift = PILL_H * (1 + 0.6 * k.hoverAmt);
            const dx = Math.sin(k.s.ry * Math.PI / 180) * lift;
            const dy = -Math.sin(k.s.rx * Math.PI / 180) * lift;
            const sc = 1 + 0.035 * k.hoverAmt;
            k.pill.style.transform = `translate3d(${dx.toFixed(2)}px, ${dy.toFixed(2)}px, 0) scale(${sc.toFixed(4)})`;
            const sy = 4 + 4 * k.hoverAmt, blur = 12 + 8 * k.hoverAmt, a = 0.14 + 0.06 * k.hoverAmt;
            k.pill.style.setProperty('--pill-shadow',
              `${(-dx * 1.4).toFixed(1)}px ${(sy - dy * 1.4).toFixed(1)}px ${blur.toFixed(0)}px rgba(0, 0, 0, ${a.toFixed(3)})`);
          }
        }
        if (busy) requestAnimationFrame(frame);
        else { running = false; last = 0; }
      };
      const wake = () => { if (!running) { running = true; requestAnimationFrame(frame); } };
      cards.forEach((k) => ['pointerenter', 'pointermove', 'pointerleave'].forEach((ev) =>
        k.hit.addEventListener(ev, wake, { passive: true })));
    }
  }

  // ---------- 1b. Background videos (reel, TV) ----------
  // iOS sometimes skips autoplay (e.g. Low Power Mode); nudge muted videos to play
  // on load and again on the first touch / scroll.
  const bgVideos = [...document.querySelectorAll('video[autoplay]')];
  const kick = () => bgVideos.forEach((v) => {
    v.muted = true;
    v.playsInline = true;
    if (v.paused) v.play().catch(() => {});
  });
  kick();
  ['touchstart', 'scroll', 'click'].forEach((ev) =>
    window.addEventListener(ev, kick, { once: true, passive: true }));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });

  // ---------- 2. Back to top ----------
  const toTop = document.getElementById('back-to-top');
  if (toTop) {
    const toggle = () => toTop.classList.toggle('is-visible', window.scrollY > window.innerHeight * 0.8);
    window.addEventListener('scroll', toggle, { passive: true });
    toggle();
    toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }
});
