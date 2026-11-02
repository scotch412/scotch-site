/**
 * STRATA — Cycling Headline Word
 * Any element with class "cycle-word" and a data-words="A,B,C" attribute
 * hard-cuts through the list forever (instant swap, no fade or movement).
 * Optional: data-interval="1600" (ms per word).
 */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.cycle-word[data-words]').forEach((el) => {
    const words = el.dataset.words.split(',').map((w) => w.trim()).filter(Boolean);
    if (words.length < 2) return;

    const interval = Math.max(600, parseInt(el.dataset.interval, 10) || 1600);
    let i = Math.max(0, words.indexOf(el.textContent.trim()));

    // Screen readers: announce the static phrase, not every swap
    el.setAttribute('aria-hidden', 'true');
    const heading = el.closest('.statement-text');
    if (heading && !heading.hasAttribute('aria-label')) {
      heading.setAttribute('aria-label', heading.textContent.replace(/\s+/g, ' ').trim());
    }

    setInterval(() => {
      // Pause while the tab is hidden
      if (document.hidden) return;
      i = (i + 1) % words.length;
      el.textContent = words[i]; // hard cut
    }, interval);
  });
});
