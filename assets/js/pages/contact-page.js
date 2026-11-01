/*
 * Contact form for a static site. Configure ONE of these in site.config.json -> contact:
 *   formEndpoint — an HTTPS form-handling endpoint (for example a Formspree form URL).
 *                  Messages are POSTed there and forwarded to your inbox.
 *   email        — your public contact address. The form then opens the visitor's
 *                  email app with the message pre-filled (mailto:).
 * With neither set, the form is disabled and explains that it is not connected yet.
 */
import { showFieldErrors, clearFieldErrors, escapeHtml } from '../lib/ui.js';

const cfg = (window.SITE_CONFIG && window.SITE_CONFIG.contact) || {};
const form = document.getElementById('contact-form');
const result = document.getElementById('contact-result');
const submit = form.querySelector('[data-submit]');
const endpoint = /^https:\/\/\S+$/.test(cfg.formEndpoint || '') ? cfg.formEndpoint : '';
const email = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(cfg.email || '') ? cfg.email : '';

if (email) {
  const box = document.getElementById('contact-email-box');
  const link = document.getElementById('contact-email-link');
  link.href = `mailto:${email}`;
  link.textContent = email;
  box.hidden = false;
}

if (!endpoint && !email) {
  document.getElementById('contact-unconfigured').hidden = false;
  submit.disabled = true;
  submit.title = 'The contact form has not been connected yet';
  form.querySelectorAll('input, textarea, select').forEach((el) => { el.disabled = true; });
}

function validate(data) {
  const errors = [];
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.push({ field: 'email', message: 'Enter a valid email address so a reply can reach you.' });
  if (data.message.trim().length < 10) errors.push({ field: 'message', message: 'Please write a message of at least 10 characters.' });
  return errors;
}

function message(kind, text) {
  result.innerHTML = `<div class="alert alert-${kind}">${escapeHtml(text)}</div>`;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(form);
  const data = {
    name: String(fd.get('name') || '').trim(),
    email: String(fd.get('email') || '').trim(),
    topic: String(fd.get('topic') || ''),
    message: String(fd.get('message') || ''),
  };
  const errors = validate(data);
  if (errors.length) { showFieldErrors(form, errors); message('error', 'Please fix the highlighted fields.'); return; }
  clearFieldErrors(form);

  if (fd.get('_gotcha')) { form.reset(); message('info', 'Thank you — your message has been sent.'); return; }

  if (endpoint) {
    submit.disabled = true;
    submit.textContent = 'Sending…';
    try {
      const res = await fetch(endpoint, { method: 'POST', body: fd, headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      form.reset();
      message('info', 'Thank you — your message has been sent. You should receive a reply by email.');
    } catch (err) {
      message('error', email
        ? `Sorry, the message could not be sent. Please email ${email} directly.`
        : 'Sorry, the message could not be sent. Please try again later.');
    } finally {
      submit.disabled = false;
      submit.textContent = 'Send message';
    }
    return;
  }

  // mailto fallback: opens the visitor's email app with the message filled in.
  const subject = `[Solver Hub] ${data.topic}`;
  const body = `${data.message}\n\n— ${data.name || 'Anonymous'} (${data.email})`;
  window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  message('info', 'Your email app should open with the message ready to send. If nothing happens, email us directly at the address shown on this page.');
});
