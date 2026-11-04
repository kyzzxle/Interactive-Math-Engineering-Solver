/*
 * Scroll-linked motion for the home page. Elements move with the scroll position, not on a timer:
 * the hero drifts back and shrinks a little as it leaves, headings and panels rise into place as
 * they come up the screen, and list items settle in a gentle wave, column by column.
 *
 * The page scrolls natively. Only the motion trails the scroll slightly (each value eases toward
 * its target every frame), which gives the smooth, weighty feel without taking over scrolling.
 * Skipped entirely when the visitor prefers reduced motion.
 */
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const easeOut = (t) => 1 - (1 - t) ** 3;

// Each effect maps a progress value p (0..1) to a vertical offset (px), a scale and an opacity.
// "leave" effects: p = 0 at the top of the page, 1 once the hero has scrolled away.
// "enter" effects: p = 0 when the element reaches the bottom of the screen, 1 once it is well inside.
const EFFECTS = {
  'hero-text': { kind: 'leave', fn: (p) => [p * 70, 1, 1 - p * 0.45] },
  'hero-figure': { kind: 'leave', fn: (p) => [p * 120, 1 - p * 0.07, 1 - p * 0.35] },
  rise: { kind: 'enter', fn: (p) => [(1 - p) * 56, 1, 0.15 + 0.85 * p] },
  grow: { kind: 'enter', fn: (p) => [(1 - p) * 80, 0.92 + 0.08 * p, 0.35 + 0.65 * p] },
  wave: { kind: 'enter', fn: (p, it) => [(1 - p) * (36 + it.col * 30), 1, 1] },
};

const TARGETS = [
  ['.hero-grid > :first-child', 'hero-text'],
  ['.hero-figure', 'hero-figure'],
  ['.home-section .section-head, .home-section > .section-title, .home-section > .section-sub, .home-section .prose-content > *, .home-section .callout', 'rise'],
  ['.demo-panel', 'grow'],
  ['.category-grid > li, .sequence > li, .facts > div', 'wave'],
];

// Page position ignoring transforms (offsetTop is layout-based), so moving an element never
// changes where we think it is.
function docTop(el) {
  let t = 0;
  for (let n = el; n; n = n.offsetParent) t += n.offsetTop;
  return t;
}

export function mountScrollMotion() {
  if (!window.matchMedia || !window.matchMedia('(prefers-reduced-motion: no-preference)').matches) return;
  const hero = document.querySelector('.hero');
  const items = [];
  const seen = new Set();
  for (const [selector, name] of TARGETS) {
    document.querySelectorAll(selector).forEach((el) => {
      if (seen.has(el)) return;
      seen.add(el);
      items.push({ el, effect: EFFECTS[name], top: 0, col: 0, cur: null, shown: null });
    });
  }
  if (!items.length) return;

  let vh = window.innerHeight;
  let maxScroll = 0;
  let heroEnd = 1;

  const measure = () => {
    vh = window.innerHeight;
    maxScroll = document.documentElement.scrollHeight - vh;
    heroEnd = hero ? Math.max(1, docTop(hero) + hero.offsetHeight) : 1;
    const lefts = new Map(); // column index of each list item among its siblings
    for (const it of items) {
      it.top = docTop(it.el);
      it.hidden = !it.el.offsetParent;
      if (it.effect === EFFECTS.wave) {
        const parent = it.el.parentElement;
        if (!lefts.has(parent)) lefts.set(parent, [...new Set([...parent.children].map((c) => c.offsetLeft))].sort((a, b) => a - b));
        it.col = Math.max(0, lefts.get(parent).indexOf(it.el.offsetLeft));
      }
    }
  };

  const target = (it, y) => {
    if (it.effect.kind === 'leave') return clamp01(y / heroEnd);
    if (y >= maxScroll - 4) return 1; // the end of the page: everything in place
    return easeOut(clamp01((y + vh - it.top) / (vh * 0.42)));
  };

  const apply = (it) => {
    const [dy, s, o] = it.effect.fn(it.cur, it);
    const settled = it.effect.kind === 'enter' ? it.cur >= 1 : it.cur <= 0;
    // once in place, drop the inline styles so text renders crisply and hover effects are untouched
    it.el.style.transform = settled ? '' : `translate3d(0, ${dy.toFixed(2)}px, 0)${s !== 1 ? ` scale(${s.toFixed(4)})` : ''}`;
    it.el.style.opacity = settled || o >= 1 ? '' : o.toFixed(3);
  };

  let raf = 0;
  let last = 0;
  const frame = (now) => {
    const dt = last ? Math.min(64, now - last) : 16.7;
    last = now;
    const k = 1 - (1 - 0.12) ** (dt / 16.7); // ease toward the target, independent of frame rate
    const y = window.scrollY;
    let moving = false;
    for (const it of items) {
      if (it.hidden) continue;
      const t = target(it, y);
      it.cur = it.cur === null ? t : it.cur + (t - it.cur) * k;
      if (Math.abs(t - it.cur) < 0.0008) it.cur = t; else moving = true;
      if (it.cur !== it.shown) { apply(it); it.shown = it.cur; }
    }
    if (moving) raf = requestAnimationFrame(frame);
    else { raf = 0; last = 0; }
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };

  measure();
  // first paint: put everything straight at its resting place for the current scroll position
  for (const it of items) if (!it.hidden) { it.cur = target(it, window.scrollY); apply(it); it.shown = it.cur; }

  window.addEventListener('scroll', kick, { passive: true });
  window.addEventListener('resize', () => { measure(); kick(); });
  if ('ResizeObserver' in window) new ResizeObserver(() => { measure(); kick(); }).observe(document.body);
  window.addEventListener('load', () => { measure(); kick(); });
  // print shows everything in place
  window.addEventListener('beforeprint', () => { for (const it of items) { it.el.style.transform = ''; it.el.style.opacity = ''; } });
  window.addEventListener('afterprint', () => { for (const it of items) it.shown = null; kick(); });
}
