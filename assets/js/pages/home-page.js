/* Homepage "Try it now" card: switch between small live demos (assets/js/explore/home.js). */
import { mountExplorer } from '../lib/learn.js';
import { HOME_DEMOS } from '../explore/home.js';

const root = document.querySelector('[data-demo-root]');
const tabs = document.querySelectorAll('[data-demo]');
const link = document.querySelector('[data-demo-link]');

function show(key) {
  const demo = HOME_DEMOS[key];
  if (!demo || !root) return;
  tabs.forEach((t) => t.setAttribute('aria-pressed', String(t.getAttribute('data-demo') === key)));
  mountExplorer(root, demo.spec);
  if (link) {
    link.href = `./${demo.href}`;
    link.firstChild.textContent = `${demo.link} `;
  }
}

tabs.forEach((t) => t.addEventListener('click', () => show(t.getAttribute('data-demo'))));
show('projectile');

// Hero sketch: it plays once on load (pure CSS). "Replay" restarts it, and only appears
// when motion is welcome, because with reduced motion the sketch is shown finished.
const figure = document.querySelector('[data-hero-figure]');
const replay = document.querySelector('[data-hero-replay]');
if (figure && replay && window.matchMedia && window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
  replay.hidden = false;
  replay.addEventListener('click', () => {
    figure.classList.remove('is-playing');
    void figure.offsetWidth; // restart the CSS animations
    figure.classList.add('is-playing');
  });
}
