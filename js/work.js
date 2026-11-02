/**
 * STRATA — Editorial Blog & Film Controller
 * Left sidebar navigation, master program monitor, NYT-style article with text wrapped around images
 */

document.addEventListener('DOMContentLoaded', () => {
  const video = document.getElementById('work-video');
  const playerScreen = document.getElementById('player-screen');
  const videoPauseOverlay = document.getElementById('video-pause-overlay');
  const pauseVideoTitle = document.getElementById('pause-video-title');
  const playerTitle = document.getElementById('player-title');
  const playerSubtitle = document.getElementById('player-subtitle');
  const filmItems = document.querySelectorAll('.thumb-item, .thumb-card, .film-item');

  // NYT Article Elements
  const editorialArticle = document.getElementById('editorial-article');
  const articleProse = document.getElementById('article-prose');

  // Lightbox Elements
  const lightbox = document.getElementById('bts-lightbox');
  const lightboxImg = document.getElementById('bts-lightbox-img');
  const lightboxCaption = document.getElementById('bts-lightbox-caption');
  const lightboxClose = document.getElementById('bts-lightbox-close');
  const lightboxBackdrop = document.querySelector('.bts-lightbox-backdrop');

  // Complete NYT / Blog Articles
  const articlesData = {
    'north-face': {
      headline: 'The North Face \u2014 Mothers',
      prose: '' // placeholder copy removed; layout reference in templates/work-article-template.html
    },

    'project-genie': {
      kicker: 'Google',
      headline: 'Project Genie',
      prose: `
        <footer class="nyt-credits-footer">
          <div class="nyt-credits-label">Production Credits</div>
          <dl class="nyt-credits-list">
            <div><dt>Client</dt><dd>Google</dd></div>
          </dl>
        </footer>
      `
    },

    'genie-3': {
      kicker: 'Google',
      headline: 'Genie 3',
      prose: `
        <footer class="nyt-credits-footer">
          <div class="nyt-credits-label">Production Credits</div>
          <dl class="nyt-credits-list">
            <div><dt>Client</dt><dd>Google</dd></div>
          </dl>
        </footer>
      `
    },

    'dickies': {
      kicker: 'Spec Campaign',
      headline: 'Dickies \u2014 Anywear',
      prose: `
        <footer class="nyt-credits-footer">
          <div class="nyt-credits-label">Production Credits</div>
          <dl class="nyt-credits-list">
            <div><dt>Brand</dt><dd>Dickies (Spec)</dd></div>
            <div><dt>Campaign</dt><dd>Anywear</dd></div>
            <div><dt>Spots</dt><dd>3</dd></div>
            <div><dt>Director</dt><dd>Scotch</dd></div>
          </dl>
        </footer>
      `
    },

    'ibis': {
      kicker: 'Spec Ad',
      headline: 'Ibis \u2014 Strength in Motion',
      prose: `
        <footer class="nyt-credits-footer">
          <div class="nyt-credits-label">Production Credits</div>
          <dl class="nyt-credits-list">
            <div><dt>Brand</dt><dd>Ibis Cycles (Spec)</dd></div>
            <div><dt>Director</dt><dd>Scotch</dd></div>
          </dl>
        </footer>
      `
    },

    'harrys': {
      kicker: 'Spec Ad',
      headline: 'Harry\u2019s',
      prose: `
        <footer class="nyt-credits-footer">
          <div class="nyt-credits-label">Production Credits</div>
          <dl class="nyt-credits-list">
            <div><dt>Brand</dt><dd>Harry&rsquo;s (Spec)</dd></div>
            <div><dt>Director</dt><dd>Scotch</dd></div>
          </dl>
        </footer>
      `
    },

    'byu-soccer': {
      kicker: 'Video',
      headline: 'BYU Women\u2019s Soccer \u2014 All In',
      prose: `
        <footer class="nyt-credits-footer">
          <div class="nyt-credits-label">Production Credits</div>
          <dl class="nyt-credits-list">
            <div><dt>Client</dt><dd>BYU Women&rsquo;s Soccer</dd></div>
            <div><dt>Director</dt><dd>Scotch</dd></div>
          </dl>
        </footer>
      `
    },

    'loophole': {
      kicker: 'Event Recap',
      headline: 'Loophole',
      prose: `
        <footer class="nyt-credits-footer">
          <div class="nyt-credits-label">Production Credits</div>
          <dl class="nyt-credits-list">
            <div><dt>Event</dt><dd>Loophole</dd></div>
            <div><dt>Director</dt><dd>Scotch</dd></div>
          </dl>
        </footer>
      `
    },

    'tillamook': {
      headline: 'Tillamook \u2014 All In',
      prose: '' // placeholder copy removed; layout reference in templates/work-article-template.html
    },

    'pentax': {
      headline: 'Pentax \u2014 Precision &amp; Soul',
      prose: '' // placeholder copy removed; layout reference in templates/work-article-template.html
    }
  };

  function updateArticle(filmKey) {
    const data = articlesData[filmKey] || { prose: '' };
    if (!editorialArticle) return;

    // Crossfade article
    editorialArticle.style.opacity = '0.2';
    editorialArticle.style.transform = 'translateY(6px)';

    setTimeout(() => {
      if (articleProse) articleProse.innerHTML = data.prose;

      // Re-attach lightbox listeners to the newly rendered figures
      attachLightboxListeners();

      editorialArticle.style.opacity = '1';
      editorialArticle.style.transform = 'translateY(0)';
    }, 150);
  }

  function selectFilm(btn, autoPlay = true, scrollOnMobile = true) {
    const videoSrc = btn.getAttribute('data-video-src');
    const poster = btn.getAttribute('data-poster');
    const title = btn.getAttribute('data-title');
    const subtitle = btn.getAttribute('data-subtitle');
    const filmKey = btn.getAttribute('data-film-key') || 'north-face';

    // Update active class on sidebar items
    filmItems.forEach(item => item.classList.remove('is-active'));
    btn.classList.add('is-active');

    // Update title metadata
    if (playerTitle) playerTitle.innerHTML = title;
    if (pauseVideoTitle) pauseVideoTitle.innerHTML = title;
    if (playerSubtitle) playerSubtitle.innerHTML = subtitle;

    // Update NYT Article with wrapped text and images
    updateArticle(filmKey);

    // YouTube-hosted film: swap the native player for an embed.
    // data-youtube-id may hold several comma-separated IDs (a campaign) -> spot switcher.
    const youtubeIds = (btn.getAttribute('data-youtube-id') || '')
      .split(',').map(s => s.trim()).filter(Boolean);
    const ytFrame = document.getElementById('work-youtube');
    const spotsEl = document.getElementById('player-spots');

    const playYouTube = (id, play) => {
      ytFrame.src = `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1${play ? '&autoplay=1' : ''}`;
    };

    if (spotsEl) {
      spotsEl.innerHTML = '';
      spotsEl.hidden = youtubeIds.length < 2;
    }

    if (youtubeIds.length && ytFrame) {
      if (video) video.pause();
      playYouTube(youtubeIds[0], autoPlay);
      if (playerScreen) playerScreen.classList.add('is-youtube');

      if (spotsEl && youtubeIds.length > 1) {
        youtubeIds.forEach((id, i) => {
          const spot = document.createElement('button');
          spot.type = 'button';
          spot.className = 'spot-btn' + (i === 0 ? ' is-active' : '');
          spot.setAttribute('role', 'tab');
          spot.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
          spot.innerHTML = `<img class="spot-thumb" src="https://i.ytimg.com/vi/${id}/mqdefault.jpg" alt="" loading="lazy"><span>Spot ${String(i + 1).padStart(2, '0')}</span>`;
          spot.addEventListener('click', () => {
            spotsEl.querySelectorAll('.spot-btn').forEach(b => {
              b.classList.remove('is-active');
              b.setAttribute('aria-selected', 'false');
            });
            spot.classList.add('is-active');
            spot.setAttribute('aria-selected', 'true');
            playYouTube(id, true);
          });
          spotsEl.appendChild(spot);
        });
      }

      if (scrollOnMobile && window.innerWidth < 860) {
        document.querySelector('.player-container')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }
    if (ytFrame) ytFrame.removeAttribute('src'); // stop any playing embed
    if (playerScreen) playerScreen.classList.remove('is-youtube');

    // Load and auto play video
    if (video) {
      if (poster) video.poster = poster;
      if (video.src !== videoSrc && !video.src.endsWith(videoSrc)) {
        video.src = videoSrc;
        video.load();
      }
      if (autoPlay) {
        const promise = video.play();
        if (promise !== undefined) {
          promise.catch(err => {
            console.log('Autoplay policy caught, attempting muted playback:', err);
            video.muted = true;
            video.play().catch(() => {});
          });
        }
      }
    }

    // On mobile / tablet, scroll to top of player
    if (scrollOnMobile && window.innerWidth < 860) {
      const playerEl = document.querySelector('.player-container');
      if (playerEl) {
        playerEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }

  // Video State & Click Controllers
  if (video) {
    // When video starts playing, hide the pause title popup
    video.addEventListener('play', () => {
      if (playerScreen) playerScreen.classList.remove('is-paused');
      if (videoPauseOverlay) videoPauseOverlay.classList.remove('is-paused');
    });

    // When video is paused, pop up the video title overlay
    video.addEventListener('pause', () => {
      if (playerScreen) playerScreen.classList.add('is-paused');
      if (videoPauseOverlay) videoPauseOverlay.classList.add('is-paused');
    });

    // Clicking the video screen pauses playback
    video.addEventListener('click', (e) => {
      const rect = video.getBoundingClientRect();
      // Ignore clicks on bottom 46px (native scrubber / control bar)
      if (e.clientY < rect.bottom - 46) {
        e.preventDefault();
        if (video.paused) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      }
    });

    // Clicking the paused title overlay resumes playback
    if (videoPauseOverlay) {
      videoPauseOverlay.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        video.play().catch(() => {});
      });

      videoPauseOverlay.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          video.play().catch(() => {});
        }
      });
    }
  }

  // Handle click on sidebar thumbnails (auto-plays selected film)
  filmItems.forEach(btn => {
    btn.addEventListener('click', () => {
      selectFilm(btn, true);
    });
  });

  // Initialise player + article from whichever film is marked active (may be a YouTube film)
  const initialFilm = document.querySelector('.thumb-item.is-active') || filmItems[0];
  if (initialFilm) selectFilm(initialFilm, false, false);

  // Lightbox Handlers for Photos
  function openLightbox(src, caption) {
    if (!lightbox || !lightboxImg) return;
    lightboxImg.src = src;
    if (lightboxCaption) lightboxCaption.textContent = caption || '';
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function attachLightboxListeners() {
    const figures = document.querySelectorAll('.nyt-figure');
    figures.forEach(figure => {
      figure.addEventListener('click', () => {
        const fullSrc = figure.getAttribute('data-full') || figure.querySelector('img')?.src;
        const caption = figure.getAttribute('data-caption') || figure.querySelector('figcaption')?.textContent;
        if (fullSrc) {
          openLightbox(fullSrc, caption);
        }
      });
    });
  }

  if (lightboxClose) {
    lightboxClose.addEventListener('click', closeLightbox);
  }

  if (lightboxBackdrop) {
    lightboxBackdrop.addEventListener('click', closeLightbox);
  }

  // Initialize lightbox on initial figures
  attachLightboxListeners();

  // Keyboard Navigation: numbers 1, 2, 3 switch films; Escape closes lightbox
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (lightbox && lightbox.classList.contains('is-open')) {
        closeLightbox();
        return;
      }
    }

    if (['input', 'textarea'].includes(document.activeElement.tagName.toLowerCase())) return;

    if (e.key === ' ' || e.code === 'Space') {
      if (playerScreen && playerScreen.classList.contains('is-youtube')) return;
      if (video) {
        e.preventDefault();
        if (video.paused) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      }
      return;
    }

    const num = parseInt(e.key, 10);
    if (!isNaN(num) && num >= 1 && num <= filmItems.length) {
      const idx = num - 1;
      if (filmItems[idx]) {
        selectFilm(filmItems[idx], true);
      }
    }
  });

  // Page Exit Transitions (Narrative Homepage, Photography, Experiments)
  function navigateTo(url) {
    document.body.style.transition = 'opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1)';
    document.body.style.opacity = '0';
    setTimeout(() => {
      window.location.href = url;
    }, 160);
  }

  const exitLinks = document.querySelectorAll('.work-back-link, .work-header-logo, .work-nav-link:not(.is-active)');
  exitLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetUrl = link.getAttribute('href');
      if (targetUrl) navigateTo(targetUrl);
    });
  });

  // Global Page Shortcuts (P for Photography, E for Experiments, N for Narrative)
  window.addEventListener('keydown', (e) => {
    if (['input', 'textarea'].includes(document.activeElement.tagName.toLowerCase())) return;
    if ((e.key === 'p' || e.key === 'P') && document.querySelector('a[href="photography.html"]:not([hidden])')) {
      e.preventDefault();
      navigateTo('photography.html');
    } else if ((e.key === 'e' || e.key === 'E') && document.querySelector('a[href="experiments.html"]:not([hidden])')) {
      e.preventDefault();
      navigateTo('experiments.html');
    } else if (e.key === 'n' || e.key === 'N') {
      e.preventDefault();
      navigateTo('index.html');
    }
  });

  window.addEventListener('pageshow', () => {
    document.body.style.opacity = '1';
  });
});
