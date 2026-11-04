/**
 * SCOTCH — Project page helpers
 * 1. Campaign spot switcher: buttons with data-youtube-id or data-video-src swap the top player.
 * 2. Lightbox: click any image inside .project-body to view it full screen.
 */
document.addEventListener('DOMContentLoaded', () => {
  // 0. Fixed left panel (video + credits) on desktop.
  //    The <aside> stays in the grid as a placeholder; its contents are wrapped and
  //    pinned with position:fixed at the column's exact position. Falls back to normal
  //    flow on narrow screens or if the panel is taller than the window.
  const media = document.querySelector('.project-media');
  if (media) {
    const inner = document.createElement('div');
    inner.className = 'project-media-inner';
    while (media.firstChild) inner.appendChild(media.firstChild);
    media.appendChild(inner);

    const HEADER = 68, GAP = 24;
    const pin = () => {
      inner.classList.remove('is-fixed');
      inner.style.left = inner.style.width = '';
      media.style.minHeight = '';
      const fits = inner.offsetHeight <= window.innerHeight - HEADER - GAP - 110; // keep clear of the footer
      if (window.innerWidth > 760 && fits) {
        const r = media.getBoundingClientRect();
        media.style.minHeight = `${inner.offsetHeight}px`;
        inner.style.left = `${r.left}px`;
        inner.style.width = `${r.width}px`;
        inner.classList.add('is-fixed');
      }
    };
    window.addEventListener('resize', pin);
    window.addEventListener('load', pin); // re-measure once images/fonts load
    pin();
  }

  // 1. Spot switcher
  const player = document.getElementById('project-video');
  const spots = document.querySelectorAll('.project-spot');

  const ytEmbed = (id, autoplay) =>
    `<iframe src="https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1${autoplay ? '&autoplay=1' : ''}" title="Film" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;

  spots.forEach((btn) => {
    btn.addEventListener('click', () => {
      spots.forEach((b) => { b.classList.remove('is-active'); b.setAttribute('aria-selected', 'false'); });
      btn.classList.add('is-active');
      btn.setAttribute('aria-selected', 'true');

      const yt = btn.getAttribute('data-youtube-id');
      const src = btn.getAttribute('data-video-src');
      if (!player) return;
      if (yt) {
        player.innerHTML = ytEmbed(yt, true);
      } else if (src) {
        const poster = btn.getAttribute('data-poster') || '';
        player.innerHTML = `<video src="${src}" poster="${poster}" controls autoplay playsinline></video>`;
      }
    });
  });

  // 2. Lightbox
  const lightbox = document.createElement('div');
  lightbox.className = 'project-lightbox';
  lightbox.setAttribute('role', 'dialog');
  lightbox.setAttribute('aria-label', 'Image preview');
  lightbox.innerHTML = '<img alt="">';
  document.body.appendChild(lightbox);
  const lbImg = lightbox.querySelector('img');

  document.querySelectorAll('.project-body img, .project-images img').forEach((img) => {
    img.addEventListener('click', () => {
      lbImg.src = img.getAttribute('data-full') || img.currentSrc || img.src;
      lbImg.alt = img.alt || '';
      lightbox.classList.add('is-open');
    });
  });
  const close = () => lightbox.classList.remove('is-open');
  lightbox.addEventListener('click', close);
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
});
