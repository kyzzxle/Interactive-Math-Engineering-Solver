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
