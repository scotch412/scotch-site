/**
 * STRATA — Filmmaker Portfolio Main Application Controller
 * Handles 3D Scene Planes, Audio Drone, Scene Layer Triggers, and Inquiries
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Sub-systems
  const canvasBackdrop = new AmbientCanvas('ambient-canvas');
  const soundscape = new AmbientSoundscape();
  const strata = new StrataEngine();

  // 2. 3D Cinema Planes Mode Controller
  const btnDepthToggle = document.getElementById('btn-depth-toggle');
  let is3DActive = false;

  if (btnDepthToggle) {
    btnDepthToggle.addEventListener('click', () => {
      is3DActive = !is3DActive;
      document.body.classList.toggle('depth-mode-active', is3DActive);
      btnDepthToggle.classList.toggle('active', is3DActive);

      const label = btnDepthToggle.querySelector('.btn-label');
      if (label) {
        label.textContent = is3DActive ? '3D PLANES: ON' : 'EXPLORE 3D';
      }

      strata.update();
    });
  }

  // 3. Audio Controller
  const btnSoundToggle = document.getElementById('btn-sound-toggle');
  if (btnSoundToggle) {
    btnSoundToggle.addEventListener('click', () => {
      const playing = soundscape.toggle();
      btnSoundToggle.classList.toggle('is-playing', playing);
      btnSoundToggle.classList.toggle('active', playing);
      
      const label = btnSoundToggle.querySelector('.btn-label');
      if (label) {
        label.textContent = playing ? 'AUDIO: ON' : 'AUDIO: OFF';
      }
    });
  }

  // 4. Hero Action Buttons
  const btnExplore = document.getElementById('btn-explore');
  if (btnExplore) {
    btnExplore.addEventListener('click', () => {
      strata.scrollToLayer(1);
    });
  }

  const btnHero3D = document.getElementById('btn-hero-3d');
  if (btnHero3D && btnDepthToggle) {
    btnHero3D.addEventListener('click', () => {
      btnDepthToggle.click();
    });
  }


  // 6. Direct Email Copy Feedback
  const btnCopyEmail = document.getElementById('btn-copy-email');
  const copyFeedback = document.getElementById('copy-feedback');

  if (btnCopyEmail && copyFeedback) {
    btnCopyEmail.addEventListener('click', async () => {
      const email = btnCopyEmail.getAttribute('data-email') || 'lifeofscotch@gmail.com';
      try {
        await navigator.clipboard.writeText(email);
        copyFeedback.classList.add('show');
        setTimeout(() => {
          copyFeedback.classList.remove('show');
        }, 2400);
      } catch (err) {
        console.error('Clipboard copy failed:', err);
      }
    });
  }

  // 8. Page Transitions to Subpages (Work, Photography, Experiments)
  function navigateToPage(url) {
    document.body.style.transition = 'opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1)';
    document.body.style.opacity = '0';
    setTimeout(() => {
      window.location.href = url;
    }, 160);
  }

  const navTabLinks = document.querySelectorAll('.nav-tab-item, .nav-tab-work');
  navTabLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetUrl = link.getAttribute('href') || 'work.html';
      // In-page anchors (e.g. #work -> the work layers) scroll instead of fading out
      if (targetUrl.startsWith('#')) {
        document.querySelector(targetUrl)?.scrollIntoView({ behavior: 'smooth' });
        return;
      }
      navigateToPage(targetUrl);
    });
  });

  // Work layers: fade out before opening a project page
  document.querySelectorAll('.work-layer-link').forEach(link => {
    link.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey) return; // allow open-in-new-tab
      e.preventDefault();
      navigateToPage(link.getAttribute('href'));
    });
  });

  window.addEventListener('pageshow', () => {
    document.body.style.opacity = '1';
  });

  // 7a. Arrow keys jump a whole layer at a time (↓ / → next, ↑ / ← previous)
  const allLayers = Array.from(document.querySelectorAll('.strata-layer'));
  let pendingLayer = null;      // target index while a smooth scroll is in flight
  let pendingUntil = 0;

  function jumpLayer(dir) {
    const now = performance.now();
    const y = window.scrollY;
    const tops = allLayers.map((el) => el.getBoundingClientRect().top + y);
    let idx;
    if (pendingLayer !== null && now < pendingUntil) {
      idx = pendingLayer;       // keep stepping from where we're already heading
    } else {
      // Current layer = the last one whose top is at (or just above) the viewport top
      idx = 0;
      tops.forEach((t, i) => { if (t <= y + 4) idx = i; });
      // If we're partway into a layer, "previous" should first snap to its top
      if (dir < 0 && y - tops[idx] > 4) idx += 1;
    }
    const target = Math.max(0, Math.min(allLayers.length - 1, idx + dir));
    pendingLayer = target;
    pendingUntil = now + 700;
    window.scrollTo({ top: tops[target], behavior: 'smooth' });
  }

  // 7. Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    if (['input', 'textarea'].includes(document.activeElement.tagName.toLowerCase())) return;

    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      jumpLayer(1);
      return;
    }
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      jumpLayer(-1);
      return;
    }

    if (e.key === 'w' || e.key === 'W') {
      e.preventDefault();
      document.getElementById('work')?.scrollIntoView({ behavior: 'smooth' });
    } else if ((e.key === 'p' || e.key === 'P') && document.querySelector('a[href="photography.html"]:not([hidden])')) {
      e.preventDefault();
      navigateToPage('photography.html');
    } else if ((e.key === 'e' || e.key === 'E') && document.querySelector('a[href="experiments.html"]:not([hidden])')) {
      e.preventDefault();
      navigateToPage('experiments.html');
    } else if (e.key === '3' || e.key === 'd' || e.key === 'D') {
      if (btnDepthToggle) btnDepthToggle.click();
    } else if (e.key === 'm' || e.key === 'M') {
      if (btnSoundToggle) btnSoundToggle.click();
    } else if (e.key >= '0' && e.key <= '5') {
      const idx = parseInt(e.key, 10);
      strata.scrollToLayer(idx);
    }
  });
});
