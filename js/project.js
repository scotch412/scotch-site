/**
 * SCOTCH — Project page helpers
 * 1. Campaign spot switcher: buttons with data-youtube-id or data-video-src swap the top player.
 * 2. Lightbox: click any image inside .project-body to view it full screen.
 */
document.addEventListener('DOMContentLoaded', () => {
  // (The page is a single centred column now — css/project.css re-orders the
  //  pieces: title → video → credits → writing / BTS. Nothing is pinned.)

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
