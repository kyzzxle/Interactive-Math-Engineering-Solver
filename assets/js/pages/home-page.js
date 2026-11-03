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

// On phones and tablets the hero is a single column, so the demo would push the search
// results far below the search box. There it moves below the calculator list instead.
const card = document.querySelector('.hero-demo');
const heroGrid = document.querySelector('.hero-grid');
const slot = document.querySelector('[data-demo-slot]');
if (card && heroGrid && slot && window.matchMedia) {
  const wide = window.matchMedia('(min-width: 1024px)');
  const place = () => {
    const target = wide.matches ? heroGrid : slot;
    if (card.parentElement !== target) target.appendChild(card);
    slot.hidden = wide.matches;
  };
  place();
  if (wide.addEventListener) wide.addEventListener('change', place);
}
