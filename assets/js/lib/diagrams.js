/**
 * Labelled diagrams as SVG strings: triangles (drawn to scale), sketches of solids
 * and Venn diagrams. Unknown quantities are highlighted with the d-unknown class.
 */
import { unavailableSvg } from './plot.js';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const r = (v) => Math.round(v * 10) / 10;
const svgOpen = (w, h, title) => `<svg class="diagram" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title>`;
const text = (x, y, s, cls = 'd-label', anchor = 'middle') => `<text class="${cls}" x="${r(x)}" y="${r(y)}" text-anchor="${anchor}">${esc(s)}</text>`;
const lbl = (l) => (typeof l === 'string' ? { t: l } : l || { t: '' });
const lblText = (x, y, l, anchor = 'middle') => { const o = lbl(l); return o.t ? text(x, y, o.t, o.unknown ? 'd-label d-unknown' : 'd-label', anchor) : ''; };

/**
 * Triangle with vertices A, B, C drawn to scale from side lengths a = BC, b = CA, c = AB.
 * labels: { a, b, c, A, B, C } — each a string or { t, unknown }.
 */
export function triangle({ a, b, c, labels = {}, rightAt = null, title = 'Triangle diagram' }) {
  const big = Math.max(a, b, c);
  if (!(big > 0) || !Number.isFinite(big)) return unavailableSvg(340, 120, title);
  a /= big; b /= big; c /= big; // only the shape matters, so work at unit scale
  const cosA = (b * b + c * c - a * a) / (2 * b * c);
  const A0 = Math.acos(Math.max(-1, Math.min(1, cosA)));
  const pts = { A: [0, 0], B: [c, 0], C: [b * Math.cos(A0), b * Math.sin(A0)] };
  const xs = Object.values(pts).map((p) => p[0]), ys = Object.values(pts).map((p) => p[1]);
  const minx = Math.min(...xs), maxx = Math.max(...xs), maxy = Math.max(...ys);
  const W = 340, H = 240, m = 42;
  const s = Math.min((W - 2 * m) / (maxx - minx || 1), (H - 2 * m) / (maxy || 1));
  const P = {};
  for (const k of ['A', 'B', 'C']) P[k] = [m + (pts[k][0] - minx) * s + ((W - 2 * m) - (maxx - minx) * s) / 2, H - m - pts[k][1] * s];
  const cx = (P.A[0] + P.B[0] + P.C[0]) / 3, cy = (P.A[1] + P.B[1] + P.C[1]) / 3;
  const out = [svgOpen(W, H, title)];
  out.push(`<polygon class="d-fill" points="${['A', 'B', 'C'].map((k) => P[k].map(r).join(',')).join(' ')}"/>`);
  if (rightAt) {
    const V = P[rightAt];
    const others = ['A', 'B', 'C'].filter((k) => k !== rightAt).map((k) => P[k]);
    const u = others.map((O) => { const dx = O[0] - V[0], dy = O[1] - V[1], d = Math.hypot(dx, dy) || 1; return [dx / d * 12, dy / d * 12]; });
    out.push(`<path class="d-edge" d="M${r(V[0] + u[0][0])} ${r(V[1] + u[0][1])} L${r(V[0] + u[0][0] + u[1][0])} ${r(V[1] + u[0][1] + u[1][1])} L${r(V[0] + u[1][0])} ${r(V[1] + u[1][1])}"/>`);
  }
  // vertex names (outside) and angle labels (inside)
  for (const k of ['A', 'B', 'C']) {
    const [x, y] = P[k];
    const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy) || 1;
    out.push(text(x + (dx / d) * 14, y + (dy / d) * 14 + 4, k, 'd-label'));
    const angle = lbl(labels[k]);
    if (angle.t) out.push(lblText(x - (dx / d) * 30, y - (dy / d) * 30 + 4, angle));
  }
  // side labels at midpoints, pushed outward
  const side = (p, q, l) => {
    const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
    const dx = mx - cx, dy = my - cy, d = Math.hypot(dx, dy) || 1;
    return lblText(mx + (dx / d) * 16, my + (dy / d) * 16 + 4, l);
  };
  out.push(side(P.B, P.C, labels.a), side(P.C, P.A, labels.b), side(P.A, P.B, labels.c));
  out.push('</svg>');
  const svg = out.join('');
  return /NaN|Infinity/.test(svg) ? unavailableSvg(340, 120, title) : svg;
}

/* ---------------------------------------------------------------- solids (labelled sketches) */
export function sphereSketch(labels = {}) {
  return `${svgOpen(300, 220, 'Sphere with radius r')}
    <circle class="d-fill" cx="150" cy="110" r="80"/>
    <ellipse class="d-hidden" cx="150" cy="110" rx="80" ry="22"/>
    <line class="d-dim" x1="150" y1="110" x2="230" y2="110"/><circle class="d-foot" cx="150" cy="110" r="3"/>
    ${lblText(190, 102, labels.r || 'r')}</svg>`;
}

export function cylinderSketch(labels = {}) {
  return `${svgOpen(300, 230, 'Cylinder with radius r and height h')}
    <path class="d-fill" d="M80 50 L80 180 A70 18 0 0 0 220 180 L220 50 Z"/>
    <ellipse class="d-solid-face" cx="150" cy="50" rx="70" ry="18"/>
    <path class="d-hidden" d="M80 180 A70 18 0 0 1 220 180"/>
    <line class="d-dim" x1="150" y1="50" x2="220" y2="50"/>${lblText(185, 44, labels.r || 'r')}
    <line class="d-dim" x1="238" y1="50" x2="238" y2="180"/>${lblText(252, 120, labels.h || 'h', 'start')}</svg>`;
}

export function coneSketch(labels = {}) {
  return `${svgOpen(300, 240, 'Right circular cone with radius r, height h and slant height s')}
    <path class="d-fill" d="M150 30 L80 190 A70 18 0 0 0 220 190 Z"/>
    <path class="d-hidden" d="M80 190 A70 18 0 0 1 220 190"/>
    <line class="d-hidden" x1="150" y1="30" x2="150" y2="190"/>${lblText(158, 120, labels.h || 'h', 'start')}
    <line class="d-dim" x1="150" y1="190" x2="220" y2="190"/>${lblText(185, 224, labels.r || 'r')}
    ${lblText(200, 104, labels.s || 's', 'start')}</svg>`;
}

/** Rectangular box l × w × h. */
export function boxSketch(labels = {}) {
  return `${svgOpen(320, 230, 'Rectangular prism with length l, width w and height h')}
    <polygon class="d-fill" points="60,90 200,90 200,200 60,200"/>
    <polygon class="d-solid-face" points="60,90 110,45 250,45 200,90"/>
    <polygon class="d-solid-face" points="200,90 250,45 250,155 200,200"/>
    <path class="d-hidden" d="M60 200 L110 155 L250 155 M110 155 L110 45"/>
    ${lblText(130, 220, labels.l || 'l')}${lblText(238, 190, labels.w || 'w', 'start')}${lblText(48, 150, labels.h || 'h', 'end')}</svg>`;
}

/** Prism with a regular n-gon or triangular base, drawn obliquely. */
export function prismSketch(n = 3, labels = {}) {
  const base = polygonPoints(n, 150, 175, 75, 26);
  const top = base.map(([x, y]) => [x, y - 120]);
  const out = [svgOpen(300, 230, `Prism with a ${n}-sided base`)];
  out.push(`<polygon class="d-fill" points="${base.map((p) => p.map(r).join(',')).join(' ')}"/>`);
  for (let i = 0; i < n; i++) out.push(`<line class="d-edge" x1="${r(base[i][0])}" y1="${r(base[i][1])}" x2="${r(top[i][0])}" y2="${r(top[i][1])}"/>`);
  out.push(`<polygon class="d-solid-face" points="${top.map((p) => p.map(r).join(',')).join(' ')}"/>`);
  out.push(lblText(276, 120, labels.h || 'h', 'start'), `<line class="d-dim" x1="268" y1="55" x2="268" y2="175"/>`);
  out.push(lblText((base[0][0] + base[1][0]) / 2, Math.max(base[0][1], base[1][1]) + 18, labels.s || 'base'));
  out.push('</svg>');
  return out.join('');
}

/** Pyramid with an n-gon base (n = 4 for square/rectangular). */
export function pyramidSketch(n = 4, labels = {}) {
  const base = polygonPoints(n, 150, 185, 90, 28);
  const apex = [150, 30];
  const out = [svgOpen(300, 230, `Pyramid with a ${n}-sided base`)];
  out.push(`<polygon class="d-fill" points="${base.map((p) => p.map(r).join(',')).join(' ')}"/>`);
  for (const p of base) out.push(`<line class="d-edge" x1="${r(p[0])}" y1="${r(p[1])}" x2="${apex[0]}" y2="${apex[1]}"/>`);
  out.push(`<line class="d-hidden" x1="150" y1="30" x2="150" y2="185"/>${lblText(157, 120, labels.h || 'h', 'start')}`);
  out.push(lblText((base[0][0] + base[1][0]) / 2, Math.max(base[0][1], base[1][1]) + 18, labels.s || 'base'));
  if (labels.l) out.push(lblText(225, 105, labels.l, 'start'));
  out.push('</svg>');
  return out.join('');
}

/** Frustum of a pyramid with an n-gon base. */
export function frustumPyramidSketch(n = 4, labels = {}) {
  const base = polygonPoints(n, 150, 190, 95, 28);
  const top = polygonPoints(n, 150, 60, 45, 13);
  const out = [svgOpen(300, 235, `Frustum of a pyramid with ${n}-sided bases`)];
  out.push(`<polygon class="d-fill" points="${base.map((p) => p.map(r).join(',')).join(' ')}"/>`);
  for (let i = 0; i < n; i++) out.push(`<line class="d-edge" x1="${r(base[i][0])}" y1="${r(base[i][1])}" x2="${r(top[i][0])}" y2="${r(top[i][1])}"/>`);
  out.push(`<polygon class="d-solid-face" points="${top.map((p) => p.map(r).join(',')).join(' ')}"/>`);
  out.push(`<line class="d-hidden" x1="150" y1="60" x2="150" y2="190"/>${lblText(157, 130, labels.h || 'h', 'start')}`);
  out.push(lblText(150, 225, labels.a || 'a (bottom edge)'), lblText(150, 38, labels.b || 'b (top edge)'));
  out.push('</svg>');
  return out.join('');
}

function polygonPoints(n, cx, cy, rx, ry) {
  // flattened regular polygon (perspective-like); first edge at the front
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = Math.PI / 2 + (Math.PI / n) + (2 * Math.PI * i) / n;
    pts.push([cx + rx * Math.cos(t), cy + ry * Math.sin(t)]);
  }
  return pts;
}

/* ---------------------------------------------------------------- Venn diagrams */
/** regions: object of region-name → count, e.g. { A: 3, B: 4, AB: 2, none: 5 } or 3-set names A, B, C, AB, AC, BC, ABC. */
export function venn(sets, regions, title = 'Venn diagram') {
  const W = 340, H = 250;
  const out = [svgOpen(W, H, title), `<rect class="d-grid" x="6" y="6" width="${W - 12}" height="${H - 12}" fill="none" rx="10"/>`];
  const v = (k) => (regions[k] === undefined ? '' : String(regions[k]));
  if (sets.length === 2) {
    out.push('<circle class="d-shade" cx="130" cy="125" r="80"/><circle class="d-shade2" cx="210" cy="125" r="80"/>');
    out.push('<circle class="d-edge" cx="130" cy="125" r="80"/><circle class="d-edge" cx="210" cy="125" r="80"/>');
    out.push(text(80, 40, sets[0]), text(260, 40, sets[1]));
    out.push(text(95, 130, v('A')), text(170, 130, v('AB')), text(245, 130, v('B')));
  } else {
    out.push('<circle class="d-shade" cx="135" cy="100" r="68"/><circle class="d-shade2" cx="205" cy="100" r="68"/><circle class="d-shade" cx="170" cy="160" r="68"/>');
    out.push('<circle class="d-edge" cx="135" cy="100" r="68"/><circle class="d-edge" cx="205" cy="100" r="68"/><circle class="d-edge" cx="170" cy="160" r="68"/>');
    out.push(text(70, 30, sets[0]), text(272, 30, sets[1]), text(170, 246, sets[2]));
    out.push(text(105, 85, v('A')), text(235, 85, v('B')), text(170, 200, v('C')));
    out.push(text(170, 75, v('AB')), text(132, 150, v('AC')), text(208, 150, v('BC')), text(170, 122, v('ABC')));
  }
  if (regions.none !== undefined) out.push(text(W - 18, H - 16, `outside: ${regions.none}`, 'd-text-muted', 'end'));
  out.push('</svg>');
  return out.join('');
}
