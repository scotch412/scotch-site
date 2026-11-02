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


  // 5. Drop Shadow Continuous Color Shift Controller
  function randomizeLayerPhase(statementEl) {
    // Clear any inline textShadow so CSS @keyframes slowShadowShift runs freely
    statementEl.style.textShadow = '';
    // Randomize the animation phase delay within the 16s cycle
    const randomOffset = -(Math.random() * 16).toFixed(2);
    statementEl.style.animationDelay = `${randomOffset}s`;

    const wrap = statementEl.closest('.statement-wrap');
    if (wrap) {
      const action = wrap.querySelector('.statement-action');
      if (action) {
        action.style.textShadow = '';
        action.style.borderBottomColor = '';
        action.style.animationDelay = `${randomOffset}s`;
      }
    }
  }

  const statementElements = document.querySelectorAll('.statement-text');
  statementElements.forEach((el) => {
    // Ensure inline textShadow is cleared so CSS slow color shift is 100% active
    el.style.textShadow = '';

    // Click to cycle to a new color phase
    el.addEventListener('click', () => {
      randomizeLayerPhase(el);
    });
  });

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
      navigateToPage(targetUrl);
    });
  });

  window.addEventListener('pageshow', () => {
    document.body.style.opacity = '1';
  });

  // 7. Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    if (['input', 'textarea'].includes(document.activeElement.tagName.toLowerCase())) return;

    if (e.key === 'w' || e.key === 'W') {
      e.preventDefault();
      navigateToPage('work.html');
    } else if ((e.key === 'p' || e.key === 'P') && document.querySelector('a[href="photography.html"]:not([hidden])')) {
      e.preventDefault();
      navigateToPage('photography.html');
    } else if ((e.key === 'e' || e.key === 'E') && document.querySelector('a[href="experiments.html"]:not([hidden])')) {
      e.preventDefault();
      navigateToPage('experiments.html');
    } else if (e.key === 'r' || e.key === 'R') {
      statementElements.forEach((el) => randomizeLayerPhase(el));
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
