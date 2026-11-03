/**
 * Tiny 3D renderer for convex solids, returning an SVG string (no DOM, no WebGL).
 * Solids are lists of polygon faces in 3D (y is up). Only faces that point towards the
 * viewer are drawn (correct for convex solids), shaded by a fixed light.
 */
const r2 = (v) => Math.round(v * 100) / 100;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Frustum of a cone/pyramid with n sides: bottom radius R, top radius r (0 = apex), height h. */
export function frustumMesh(R, r, h, n, { smooth = false, phase = 0 } = {}) {
  const ring = (rad, y) => Array.from({ length: n }, (_, i) => {
    const t = phase + (2 * Math.PI * i) / n;
    return [rad * Math.cos(t), y, rad * Math.sin(t)];
  });
  const bottom = ring(R, -h / 2);
  const faces = [{ pts: bottom.slice().reverse(), cap: true }];
  if (r > 1e-9) {
    const top = ring(r, h / 2);
    faces.push({ pts: top, cap: true });
    for (let i = 0; i < n; i++) faces.push({ pts: [bottom[i], bottom[(i + 1) % n], top[(i + 1) % n], top[i]], side: true });
  } else {
    const apex = [0, h / 2, 0];
    for (let i = 0; i < n; i++) faces.push({ pts: [bottom[i], bottom[(i + 1) % n], apex], side: true });
  }
  return { faces, smooth };
}

export function sphereMesh(R, lat = 14, lon = 28) {
  const faces = [];
  const P = (i, j) => {
    const th = (Math.PI * i) / lat, ph = (2 * Math.PI * j) / lon;
    return [R * Math.sin(th) * Math.cos(ph), R * Math.cos(th), R * Math.sin(th) * Math.sin(ph)];
  };
  for (let i = 0; i < lat; i++) {
    for (let j = 0; j < lon; j++) {
      const pts = [P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1)];
      faces.push({ pts: i === 0 ? [pts[0], pts[1], pts[2]] : i === lat - 1 ? [pts[0], pts[1], pts[3]] : pts, side: true });
    }
  }
  return { faces, smooth: true };
}

/** Ellipsoid with semi-axes a (x), b (y, vertical) and c (z). */
export function ellipsoidMesh(a, b, c, lat = 14, lon = 28) {
  const m = sphereMesh(1, lat, lon);
  return { ...m, faces: m.faces.map((f) => ({ ...f, pts: f.pts.map(([x, y, z]) => [a * x, b * y, c * z]) })) };
}

/** Spherical cap of a sphere with radius R, height h, flat base facing down. */
export function capMesh(R, h, lat = 10, lon = 32) {
  const th0 = Math.acos(Math.max(-1, Math.min(1, (R - h) / R))); // polar angle of the base rim
  const faces = [];
  const P = (i, j) => {
    const th = (th0 * i) / lat, ph = (2 * Math.PI * j) / lon;
    return [R * Math.sin(th) * Math.cos(ph), R * Math.cos(th) - (R - h / 2), R * Math.sin(th) * Math.sin(ph)];
  };
  for (let i = 0; i < lat; i++) for (let j = 0; j < lon; j++) {
    const pts = [P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1)];
    faces.push({ pts: i === 0 ? [pts[0], pts[1], pts[2]] : pts, side: true });
  }
  faces.push({ pts: Array.from({ length: lon }, (_, j) => P(lat, lon - j)), cap: true });
  return { faces, smooth: true };
}

/** Ring torus: distance R from the centre to the tube centre, tube radius r (R > r). */
export function torusMesh(R, r, nu = 36, nv = 16) {
  const P = (i, j) => {
    const u = (2 * Math.PI * i) / nu, v = (2 * Math.PI * j) / nv;
    return [(R + r * Math.cos(v)) * Math.cos(u), r * Math.sin(v), (R + r * Math.cos(v)) * Math.sin(u)];
  };
  const faces = [];
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
    const u = (2 * Math.PI * (i + 0.5)) / nu, v = (2 * Math.PI * (j + 0.5)) / nv;
    // outward normal of the tube at the face centre
    faces.push({ pts: [P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1)], side: true, normal: [Math.cos(v) * Math.cos(u), Math.sin(v), Math.cos(v) * Math.sin(u)] });
  }
  return { faces, smooth: true, convex: false };
}

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a) => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

/**
 * opts: { yaw, pitch (degrees), scale (px per unit), width, height, title, lines: [{ a, b, cls, label }] }
 * lines are 3D segments drawn on top (dimension lines), dashed when cls = 'd-dim'.
 */
export function renderSolid(mesh, opts = {}) {
  const W = opts.width || 360, H = opts.height || 300;
  const yaw = ((opts.yaw ?? 30) * Math.PI) / 180, pitch = ((opts.pitch ?? 20) * Math.PI) / 180;
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const rot = ([x, y, z]) => {
    const x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
    return [x1, y * cp - z1 * sp, y * sp + z1 * cp];
  };
  const s = opts.scale || 10;
  const proj = (p) => [W / 2 + s * p[0], H / 2 - s * p[1]];
  const light = norm([-0.45, 0.75, 0.6]);
  const all = mesh.faces.flatMap((f) => f.pts);
  const centre = all.reduce((acc, p) => [acc[0] + p[0] / all.length, acc[1] + p[1] / all.length, acc[2] + p[2] / all.length], [0, 0, 0]);
  const C = rot(centre);
  const polys = [];
  for (const f of mesh.faces) {
    if (f.pts.length < 3) continue; // degenerate (e.g. a band on the axis)
    const pts = f.pts.map(rot);
    let n = norm(cross(sub(pts[1], pts[0]), sub(pts[2], pts[0])));
    const fc = pts.reduce((a, p) => [a[0] + p[0] / pts.length, a[1] + p[1] / pts.length, a[2] + p[2] / pts.length], [0, 0, 0]);
    if (f.normal) { const fn = rot(f.normal); if (dot(n, fn) < 0) n = n.map((v) => -v); } else if (dot(n, sub(fc, C)) < 0) n = n.map((v) => -v);
    if (n[2] <= 1e-6) continue; // faces away from the viewer (drawn back to front, so non-convex solids work too)
    const b = Math.max(0, dot(n, light));
    const mix = Math.round(62 - 40 * b);
    const fill = `color-mix(in srgb, var(--primary) ${mix}%, var(--surface))`;
    const stroke = mesh.smooth && f.side ? fill : 'var(--primary)';
    const sw = mesh.smooth && f.side ? 0.8 : 1.6;
    const d = pts.map((p) => proj(p).map(r2).join(',')).join(' ');
    polys.push({ z: fc[2], svg: `<polygon class="d-face" points="${d}" style="fill:${fill};stroke:${stroke};stroke-width:${sw}"/>` });
  }
  polys.sort((a, b) => a.z - b.z);
  const lines = (opts.lines || []).map((l) => {
    const [x1, y1] = proj(rot(l.a)), [x2, y2] = proj(rot(l.b));
    const label = l.label ? `<text class="d-label" x="${r2((x1 + x2) / 2 + 6)}" y="${r2((y1 + y2) / 2 - 4)}">${esc(l.label)}</text>` : '';
    return `<line class="${l.cls || 'd-dim'}" x1="${r2(x1)}" y1="${r2(y1)}" x2="${r2(x2)}" y2="${r2(y2)}" stroke-dasharray="5 4"/>${label}`;
  });
  const svg = `<svg class="diagram" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.title || '3D solid')}"><title>${esc(opts.title || '3D solid')}</title>${polys.map((p) => p.svg).join('')}${lines.join('')}</svg>`;
  return /NaN|Infinity/.test(svg) ? '' : svg;
}

// ---------------------------------------------------------------- more meshes

/**
 * Convex hull of a small set of 3D points (up to a few dozen), as polygon faces.
 * Used for polyhedra, wedges, obelisks and truncated prisms. Coplanar points are merged
 * into one face and ordered around the face centre.
 */
export function hullMesh(points, { tol = 1e-9 } = {}) {
  const n = points.length, faces = [], seen = new Set();
  const scale = Math.max(1e-12, ...points.flat().map(Math.abs));
  const eps = tol * scale;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) for (let k = j + 1; k < n; k++) {
    const nrm = cross(sub(points[j], points[i]), sub(points[k], points[i]));
    const len = Math.hypot(...nrm);
    if (len < eps * scale) continue;
    const u = nrm.map((v) => v / len), d = dot(u, points[i]);
    let pos = 0, neg = 0;
    const on = [];
    points.forEach((p, idx) => { const s = dot(u, p) - d; if (s > eps) pos++; else if (s < -eps) neg++; else on.push(idx); });
    if (pos && neg) continue;
    const key = on.slice().sort((a, b) => a - b).join(',');
    if (seen.has(key)) continue;
    seen.add(key);
    const outward = pos ? u.map((v) => -v) : u;
    const c = on.reduce((a, idx) => [a[0] + points[idx][0] / on.length, a[1] + points[idx][1] / on.length, a[2] + points[idx][2] / on.length], [0, 0, 0]);
    const e1 = norm(sub(points[on[0]], c)), e2 = cross(outward, e1);
    const pts = on.map((idx) => points[idx]).sort((p, q) => Math.atan2(dot(sub(p, c), e2), dot(sub(p, c), e1)) - Math.atan2(dot(sub(q, c), e2), dot(sub(q, c), e1)));
    faces.push({ pts, normal: outward });
  }
  return { faces, smooth: false };
}

/**
 * Solid of revolution about the vertical axis. profile: [[radius, y], ...] from bottom to top.
 * Each band gets its outward normal, so non-convex profiles (a pipe, a sector) draw correctly.
 */
export function latheMesh(profile, n = 40, { smooth = true, closeEnds = true } = {}) {
  const faces = [];
  const ring = (rad, y, t) => [rad * Math.cos(t), y, rad * Math.sin(t)];
  for (let k = 0; k + 1 < profile.length; k++) {
    const [r1, y1] = profile[k], [r2, y2] = profile[k + 1];
    const dr = r2 - r1, dy = y2 - y1;
    if (Math.hypot(dr, dy) < 1e-12) continue;
    for (let i = 0; i < n; i++) {
      const a = (2 * Math.PI * i) / n, b = (2 * Math.PI * (i + 1)) / n, m = (a + b) / 2;
      const pts = [ring(r1, y1, a), ring(r1, y1, b), ring(r2, y2, b), ring(r2, y2, a)].filter((p, idx, arr) => idx === 0 || Math.hypot(...sub(p, arr[idx - 1])) > 1e-12);
      // outward normal: rotate the profile tangent (dr, dy) by −90° in the (radius, y) plane
      const nr = dy, ny = -dr;
      if (pts.length >= 3) faces.push({ pts, side: true, normal: [nr * Math.cos(m), ny, nr * Math.sin(m)] });
    }
  }
  if (closeEnds) {
    const [rb, yb] = profile[0], [rt, yt] = profile[profile.length - 1];
    if (rb > 1e-9) faces.push({ pts: Array.from({ length: n }, (_, i) => ring(rb, yb, -(2 * Math.PI * i) / n)), cap: true, normal: [0, -1, 0] });
    if (rt > 1e-9) faces.push({ pts: Array.from({ length: n }, (_, i) => ring(rt, yt, (2 * Math.PI * i) / n)), cap: true, normal: [0, 1, 0] });
  }
  return { faces, smooth };
}

/** Oblique circular cylinder (or cone when rTop = 0): the top is shifted sideways by `shift`. */
export function obliqueMesh(r, rTop, h, shift, n = 40) {
  const faces = [];
  const P = (rad, y, t, dx) => [dx + rad * Math.cos(t), y, rad * Math.sin(t)];
  const bottom = Array.from({ length: n }, (_, i) => P(r, -h / 2, (2 * Math.PI * i) / n, -shift / 2));
  const top = Array.from({ length: n }, (_, i) => P(rTop, h / 2, (2 * Math.PI * i) / n, shift / 2));
  faces.push({ pts: bottom.slice().reverse(), cap: true, normal: [0, -1, 0] });
  if (rTop > 1e-9) faces.push({ pts: top, cap: true, normal: [0, 1, 0] });
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const pts = rTop > 1e-9 ? [bottom[i], bottom[j], top[j], top[i]] : [bottom[i], bottom[j], top[0]];
    faces.push({ pts, side: true }); // convex, so the renderer orients the face itself
  }
  return { faces, smooth: true };
}

/** Spherical wedge: the part of a sphere of radius R between two half-planes θ apart (degrees). */
export function sphereWedgeMesh(R, thetaDeg, lat = 14, lonPerTurn = 36) {
  const th = (Math.min(360, Math.max(1, thetaDeg)) * Math.PI) / 180;
  const lon = Math.max(2, Math.round((lonPerTurn * th) / (2 * Math.PI)));
  const P = (i, j) => { const a = (Math.PI * i) / lat, b = (th * j) / lon; return [R * Math.sin(a) * Math.cos(b), R * Math.cos(a), R * Math.sin(a) * Math.sin(b)]; };
  const faces = [];
  for (let i = 0; i < lat; i++) for (let j = 0; j < lon; j++) {
    const a = (Math.PI * (i + 0.5)) / lat, b = (th * (j + 0.5)) / lon;
    faces.push({ pts: [P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1)], side: true, normal: [Math.sin(a) * Math.cos(b), Math.cos(a), Math.sin(a) * Math.sin(b)] });
  }
  if (thetaDeg < 360) {
    const half = (angle, flip) => {
      const pts = [[0, R, 0], ...Array.from({ length: lat - 1 }, (_, i) => { const a = (Math.PI * (i + 1)) / lat; return [R * Math.sin(a) * Math.cos(angle), R * Math.cos(a), R * Math.sin(a) * Math.sin(angle)]; }), [0, -R, 0]];
      return { pts, cap: true, normal: [flip * Math.sin(angle), 0, -flip * Math.cos(angle)] };
    };
    faces.push(half(0, 1), half(th, -1));
  }
  return { faces, smooth: true, convex: false };
}

/** Cylindrical wedge (ungula): cut from a cylinder of radius r by a plane through a diameter of the base, rising to height h. */
export function ungulaMesh(r, h, n = 32) {
  const faces = [];
  const base = (t) => [r * Math.cos(t), -h / 2, r * Math.sin(t)];
  const top = (t) => [r * Math.cos(t), -h / 2 + (h * Math.sin(t)), r * Math.sin(t)];
  const ts = Array.from({ length: n + 1 }, (_, i) => (Math.PI * i) / n);
  faces.push({ pts: ts.map(base).reverse(), cap: true, normal: [0, -1, 0] });
  faces.push({ pts: ts.map(top), cap: true, normal: [0, r, -h] });
  for (let i = 0; i < n; i++) {
    const m = (ts[i] + ts[i + 1]) / 2;
    faces.push({ pts: [base(ts[i]), base(ts[i + 1]), top(ts[i + 1]), top(ts[i])].filter((p, idx, arr) => idx === 0 || Math.hypot(...sub(p, arr[idx - 1])) > 1e-12), side: true, normal: [Math.cos(m), 0, Math.sin(m)] });
  }
  return { faces, smooth: true };
}
