/**
 * SCOTCH — Contact window
 * Clicking the email on the last layer opens a small liquid-glass window where
 * visitors can write a message that's emailed straight to Scotch (via FormSubmit,
 * no server needed). If sending fails, the address is copied to the clipboard instead.
 */
(() => {
  const trigger = document.getElementById('btn-copy-email');
  if (!trigger) return;
  const EMAIL = trigger.getAttribute('data-email') || 'lifeofscotch@gmail.com';
  const ENDPOINT = `https://formsubmit.co/ajax/${EMAIL}`;
  const feedback = document.getElementById('copy-feedback');

  trigger.setAttribute('href', `mailto:${EMAIL}`); // fallback without JS
  trigger.setAttribute('role', 'button');
  trigger.title = 'Send me a message';

  const wrap = document.createElement('div');
  wrap.className = 'contact-modal';
  wrap.hidden = true;
  wrap.innerHTML = `
    <div class="contact-backdrop" data-close></div>
    <div class="contact-card" role="dialog" aria-modal="true" aria-labelledby="contact-title">
      <button class="contact-x" type="button" aria-label="Close" data-close>&times;</button>
      <form class="contact-form" novalidate>
        <h3 class="contact-title" id="contact-title">Send me a message</h3>
        <label class="contact-field"><span>Name</span><input name="name" type="text" autocomplete="name" required></label>
        <label class="contact-field"><span>Email</span><input name="email" type="email" autocomplete="email" required></label>
        <label class="contact-field"><span>Message</span><textarea name="message" rows="5" required></textarea></label>
        <input class="contact-honey" type="text" name="_honey" tabindex="-1" autocomplete="off" aria-hidden="true">
        <p class="contact-status" role="status" aria-live="polite"></p>
        <div class="contact-actions">
          <button class="contact-copy" type="button">Copy email instead</button>
          <button class="contact-send" type="submit">Send &rarr;</button>
        </div>
      </form>
      <div class="contact-done" hidden>
        <h3 class="contact-title">Sent. Thank you!</h3>
        <p>I'll get back to you soon.</p>
        <button class="contact-send" type="button" data-close>Close</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);

  const form = wrap.querySelector('.contact-form');
  const done = wrap.querySelector('.contact-done');
  const status = wrap.querySelector('.contact-status');
  const send = wrap.querySelector('.contact-form .contact-send');
  let lastFocus = null;

  function open(e) {
    if (e) e.preventDefault();
    lastFocus = document.activeElement;
    form.hidden = false; done.hidden = true; status.textContent = ''; status.className = 'contact-status';
    wrap.hidden = false;
    requestAnimationFrame(() => wrap.classList.add('is-open'));
    document.documentElement.classList.add('contact-lock');
    setTimeout(() => form.elements.name.focus(), 60);
  }
  function close() {
    wrap.classList.remove('is-open');
    document.documentElement.classList.remove('contact-lock');
    setTimeout(() => { wrap.hidden = true; }, 250);
    if (lastFocus) lastFocus.focus();
  }

  async function copyEmail(msg) {
    try {
      await navigator.clipboard.writeText(EMAIL);
      status.textContent = msg || `Copied ${EMAIL}`;
      status.className = 'contact-status is-ok';
      if (feedback) { feedback.classList.add('show'); setTimeout(() => feedback.classList.remove('show'), 2400); }
    } catch {
      status.textContent = `Email me at ${EMAIL}`;
    }
  }

  trigger.addEventListener('click', open);
  wrap.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); });
  wrap.querySelector('.contact-copy').addEventListener('click', () => copyEmail());
  document.addEventListener('keydown', (e) => {
    if (wrap.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') { // keep focus inside the window
      const f = [...wrap.querySelectorAll('input:not(.contact-honey), textarea, button')].filter((el) => el.offsetParent);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = form.elements.name.value.trim();
    const email = form.elements.email.value.trim();
    const message = form.elements.message.value.trim();
    if (!name || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      status.textContent = 'Please add your name, a valid email and a message.';
      status.className = 'contact-status is-err';
      return;
    }
    send.disabled = true; send.textContent = 'Sending…';
    status.textContent = ''; status.className = 'contact-status';
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          name, email, message,
          _replyto: email,
          _subject: `New message from scotchjohnson.com: ${name}`,
          _template: 'table',
          _captcha: 'false',
          _honey: form.elements._honey.value,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || String(j.success) !== 'true') throw new Error(j.message || 'send failed');
      form.reset();
      form.hidden = true; done.hidden = false;
      done.querySelector('button').focus();
    } catch (err) {
      await copyEmail(`Couldn't send right now, so I copied my email for you: ${EMAIL}`);
    } finally {
      send.disabled = false; send.innerHTML = 'Send &rarr;';
    }
  });
})();
