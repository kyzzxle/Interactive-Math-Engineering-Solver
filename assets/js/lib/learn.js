/**
 * Guided-learning widgets shared by calculator pages (browser only).
 *
 *   mountExplorer(root, spec)  "Explore": sliders (each paired with a number box), optional
 *                              draggable points, optional Play / Pause / Reset animation.
 *   mountPractice(root, spec)  "Try it": a generated problem with Hint, Check, Show solution
 *                              and New problem.
 *
 * Specs are plain objects defined in assets/js/explore/*.js. They contain no DOM code, so the
 * Node tests can call spec.render() and spec.generate() directly.
 *
 * Explorer spec:
 *   { title, intro?, controls: [Control], presets?: [{ label, values }],
 *     drag?: { A: { x: 'x1', y: 'y1' } },        // data-drag="A" points move these controls
 *     rotate?: { yaw: 'yaw' },                   // dragging the figure changes this control
 *     animate?: { control: 't', seconds: 4 },    // Play moves this control from min to max
 *     render(values) => { svg?, html?, readouts?: [{ label, tex?, text?, tone? }], caption?, note? } }
 * Control: { name, label, min, max (number or values => number), step, value, unit?, type?: 'select', options? }
 *
 * Practice spec:
 *   { title?, generate(rand) => { prompt (HTML), promptTex?, answers: [{ label, value, decimals?, unit?, int? }],
 *       unordered?: boolean, hint, hintTex?, steps: [step], final? } }
 */
import { tex, escapeHtml, stepsBlock } from './ui.js';

const reduceMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
let seq = 0;

function decimalsOf(step) {
  const s = String(step);
  return s.includes('e-') ? Number(s.split('e-')[1]) : (s.split('.')[1] || '').length;
}
const roundTo = (v, step, min) => {
  const k = Math.round((v - min) / step);
  return Number((min + k * step).toFixed(decimalsOf(step)));
};

function readoutHtml(r) {
  const val = r.tex !== undefined ? tex(r.tex) : escapeHtml(r.text ?? '');
  return `<div class="readout${r.tone ? ` is-${r.tone}` : ''}"><span class="readout-label">${escapeHtml(r.label)}</span><span class="readout-value">${val}</span></div>`;
}

/** Explore panel: controls on one side, live figure and readouts on the other. */
export function mountExplorer(root, spec) {
  if (!root || !spec) return null;
  const id = `ex${++seq}`;
  const ctrls = spec.controls;
  if (root.__explorer) root.__explorer.destroy();
  const ac = new AbortController(); // removes window/document listeners when the explorer is replaced
  const opt = { signal: ac.signal };
  const values = Object.fromEntries(ctrls.map((c) => [c.name, c.value]));
  const maxOf = (c) => (typeof c.max === 'function' ? c.max(values) : c.max);
  const minOf = (c) => (typeof c.min === 'function' ? c.min(values) : c.min);

  const controlHtml = (c) => {
    const cid = `${id}-${c.name}`;
    if (c.type === 'select') {
      return `<div class="ex-control"><label class="field-label" for="${cid}">${escapeHtml(c.label)}</label>
        <select id="${cid}" class="select" data-ctrl="${c.name}">${c.options.map(([v, l]) => `<option value="${escapeHtml(v)}"${String(v) === String(c.value) ? ' selected' : ''}>${escapeHtml(l)}</option>`).join('')}</select></div>`;
    }
    const unit = c.unit ? `<span class="ex-unit">${escapeHtml(c.unit)}</span>` : '';
    return `<div class="ex-control">
        <div class="ex-control-head"><label class="field-label" for="${cid}">${escapeHtml(c.label)}</label>
          <span class="ex-num"><input class="input" type="number" inputmode="decimal" data-num="${c.name}" step="${c.step}" aria-label="${escapeHtml(c.label)} value">${unit}</span></div>
        <input id="${cid}" class="range" type="range" data-ctrl="${c.name}" step="${c.step}">
      </div>`;
  };

  const anim = spec.animate;
  const motionOk = !reduceMotion();
  const animHtml = anim ? `<div class="ex-player">
      <button type="button" class="btn btn-primary btn-sm" data-play aria-pressed="false">▶ Play</button>
      <button type="button" class="btn btn-secondary btn-sm" data-anim-reset>Reset</button>
      <p class="field-hint w-full">${motionOk ? 'Or drag the time slider to step through it yourself.' : 'Your device asks for reduced motion, so nothing moves until you press Play. You can also drag the time slider instead.'}</p>
    </div>` : '';
  const presets = spec.presets && spec.presets.length
    ? `<div class="example-row"><span>Try:</span>${spec.presets.map((p, i) => `<button type="button" class="chip" data-preset="${i}">${escapeHtml(p.label)}</button>`).join('')}</div>` : '';
  const dragHint = spec.drag || spec.rotate ? `<p class="field-hint mt-3">${spec.rotate ? 'Drag the figure to turn it.' : 'Drag the points on the graph, or type exact values.'}</p>` : '';

  root.innerHTML = `<div class="explore">
      <div class="explore-controls">
        ${spec.intro ? `<p class="explore-intro">${escapeHtml(spec.intro)}</p>` : ''}
        ${ctrls.map(controlHtml).join('')}
        ${animHtml}${presets}
        <div class="form-actions mt-4"><button type="button" class="btn btn-ghost btn-sm" data-ex-reset>Reset values</button></div>
        ${dragHint}
      </div>
      <div class="explore-stage">
        <figure class="explore-figure" data-figure></figure>
        <div class="readouts" data-readouts aria-live="polite"></div>
        <p class="explore-note" data-note hidden></p>
      </div>
    </div>`;

  const fig = root.querySelector('[data-figure]');
  const out = root.querySelector('[data-readouts]');
  const note = root.querySelector('[data-note]');

  const sync = () => {
    for (const c of ctrls) {
      if (c.type === 'select') { root.querySelector(`[data-ctrl="${c.name}"]`).value = values[c.name]; continue; }
      const lo = minOf(c), hi = maxOf(c);
      if (values[c.name] > hi) values[c.name] = hi;
      if (values[c.name] < lo) values[c.name] = lo;
      const range = root.querySelector(`[data-ctrl="${c.name}"]`);
      range.min = lo; range.max = hi; range.value = values[c.name];
      const shown = Number(values[c.name].toFixed(decimalsOf(c.step)));
      range.setAttribute('aria-valuetext', `${shown}${c.unit ? ` ${c.unit}` : ''}`);
      const num = root.querySelector(`[data-num="${c.name}"]`);
      if (document.activeElement !== num) num.value = shown;
      num.min = lo; num.max = hi;
    }
  };

  let frame = 0;
  const draw = () => {
    frame = 0;
    let res;
    try { res = spec.render({ ...values }); } catch (e) { res = { html: `<p class="alert alert-error">This combination cannot be drawn: ${escapeHtml(e.message)}</p>` }; }
    fig.innerHTML = (res.svg || '') + (res.html || '') + (res.caption ? `<figcaption class="diagram-caption">${escapeHtml(res.caption)}</figcaption>` : '');
    out.innerHTML = (res.readouts || []).map(readoutHtml).join('');
    note.hidden = !res.note;
    note.textContent = res.note || '';
  };
  const update = () => { sync(); if (!frame) frame = requestAnimationFrame(draw); };

  root.addEventListener('input', (e) => {
    const name = e.target.getAttribute('data-ctrl') || e.target.getAttribute('data-num');
    if (!name) return;
    const c = ctrls.find((x) => x.name === name);
    if (c.type === 'select') { values[name] = e.target.value; update(); return; }
    const v = Number(e.target.value);
    if (e.target.value === '' || !Number.isFinite(v)) return;
    values[name] = Math.min(maxOf(c), Math.max(minOf(c), v));
    if (anim && name !== anim.control) stop();
    update();
  });
  root.addEventListener('change', (e) => { if (e.target.hasAttribute('data-num')) sync(); });

  const reset = (vals) => {
    stop();
    for (const c of ctrls) values[c.name] = c.value;
    Object.assign(values, vals || {});
    update();
  };
  root.querySelector('[data-ex-reset]').addEventListener('click', () => reset());
  root.querySelectorAll('[data-preset]').forEach((b) => b.addEventListener('click', () => reset(spec.presets[Number(b.getAttribute('data-preset'))].values)));

  // ------------------------------------------------ animation (always user-started)
  let raf = 0, last = 0;
  const playBtn = root.querySelector('[data-play]');
  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (playBtn) { playBtn.textContent = '▶ Play'; playBtn.setAttribute('aria-pressed', 'false'); }
  }
  if (anim) {
    const c = ctrls.find((x) => x.name === anim.control);
    const tick = (now) => {
      const hi = maxOf(c), lo = minOf(c);
      const dt = last ? (now - last) / 1000 : 0;
      last = now;
      let v = values[c.name] + ((hi - lo) / (anim.seconds || 4)) * dt;
      if (v >= hi) { if (anim.loop) v = lo + (v - hi); else { values[c.name] = hi; update(); stop(); return; } }
      values[c.name] = v;
      update();
      raf = requestAnimationFrame(tick);
    };
    if (playBtn) {
      playBtn.addEventListener('click', () => {
        if (raf) { stop(); return; }
        if (!anim.loop && values[c.name] >= maxOf(c)) values[c.name] = minOf(c);
        last = 0;
        playBtn.textContent = '❚❚ Pause';
        playBtn.setAttribute('aria-pressed', 'true');
        raf = requestAnimationFrame(tick);
      });
    }
    root.querySelector('[data-anim-reset]').addEventListener('click', () => { stop(); values[c.name] = minOf(c); update(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); }, opt);
  }

  // ------------------------------------------------ dragging points / rotating
  const toGraph = (svg, clientX, clientY) => {
    const view = (svg.getAttribute('data-view') || '').split(' ').map(Number);
    const pt = svg.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    const m = svg.getScreenCTM();
    if (!m || view.length < 8) return null;
    const p = pt.matrixTransform(m.inverse());
    const [xmin, xmax, ymin, ymax, l, t, pw, ph] = view;
    return { x: xmin + ((p.x - l) / pw) * (xmax - xmin), y: ymax - ((p.y - t) / ph) * (ymax - ymin) };
  };
  let dragging = null;
  fig.addEventListener('pointerdown', (e) => {
    const svg = fig.querySelector('svg');
    if (!svg) return;
    const handle = e.target.closest('[data-drag]');
    if (handle && spec.drag && spec.drag[handle.getAttribute('data-drag')]) {
      dragging = { kind: 'point', key: handle.getAttribute('data-drag') };
    } else if (spec.rotate) {
      dragging = { kind: 'rotate', x: e.clientX, y: e.clientY, start: { ...values } };
    } else return;
    e.preventDefault();
    stop();
    fig.classList.add('is-dragging');
  });
  window.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    if (dragging.kind === 'rotate') {
      const yaw = spec.rotate.yaw, pitch = spec.rotate.pitch;
      const cy = ctrls.find((c) => c.name === yaw);
      let v = dragging.start[yaw] + (e.clientX - dragging.x) * 0.6;
      while (v > cy.max) v -= cy.max - cy.min;
      while (v < cy.min) v += cy.max - cy.min;
      values[yaw] = Math.round(v);
      if (pitch) {
        const cp = ctrls.find((c) => c.name === pitch);
        values[pitch] = Math.round(Math.max(cp.min, Math.min(cp.max, dragging.start[pitch] - (e.clientY - dragging.y) * 0.4)));
      }
      update();
      return;
    }
    const svg = fig.querySelector('svg');
    const g = svg && toGraph(svg, e.clientX, e.clientY);
    if (!g) return;
    const map = spec.drag[dragging.key];
    const target = typeof map === 'function' ? map(g, { ...values }) : Object.fromEntries(Object.entries(map).map(([axis, name]) => [name, g[axis]]));
    for (const [name, raw] of Object.entries(target)) {
      const c = ctrls.find((x) => x.name === name);
      if (!c || !Number.isFinite(raw)) continue;
      values[name] = roundTo(Math.min(maxOf(c), Math.max(minOf(c), raw)), c.step, minOf(c));
    }
    update();
  }, opt);
  const endDrag = () => { if (dragging) { dragging = null; fig.classList.remove('is-dragging'); } };
  window.addEventListener('pointerup', endDrag, opt);
  window.addEventListener('pointercancel', endDrag, opt);

  sync();
  draw();
  const api = { values, update, reset, destroy: () => { stop(); ac.abort(); } };
  root.__explorer = api;
  return api;
}

// ------------------------------------------------------------------------------------ practice

/** Parse a typed answer: decimals, fractions like 3/4, a leading minus, commas as decimal point. */
export function parseAnswer(raw) {
  const s = String(raw ?? '').trim().replace(/\s+/g, '').replace(/−/g, '-').replace(/,(?=\d{1,2}$)/, '.');
  if (!s) return null;
  const frac = s.match(/^(-?\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
  if (frac) { const d = Number(frac[2]); return d === 0 ? null : Number(frac[1]) / d; }
  if (!/^-?(\d+\.?\d*|\.\d+)(e-?\d+)?$/i.test(s)) return null;
  return Number(s);
}

/** 'correct' | 'close' | 'wrong' for a typed value against the expected answer. */
export function judge(user, expected, decimals = 2) {
  if (user === null || !Number.isFinite(user)) return 'invalid';
  const err = Math.abs(user - expected);
  const tol = 0.5 * 10 ** -decimals * 1.05 + 1e-9;
  if (err <= tol || err <= Math.abs(expected) * 5e-4) return 'correct';
  if (err <= Math.max(Math.abs(expected) * 0.05, tol * 4)) return 'close';
  return 'wrong';
}

export function mountPractice(root, spec) {
  if (!root || !spec) return null;
  const id = `pr${++seq}`;
  let problem, attempts = 0;

  const build = () => {
    problem = spec.generate(Math.random);
    attempts = 0;
    const inputs = problem.answers.map((a, i) => `<div class="field">
        <label class="field-label" for="${id}-a${i}">${escapeHtml(a.label)}</label>
        <div class="input-affix"><input id="${id}-a${i}" class="input" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" data-answer="${i}" aria-describedby="${id}-h${i}">${a.unit ? `<span class="affix">${escapeHtml(a.unit)}</span>` : ''}</div>
        <p class="field-hint" id="${id}-h${i}">${a.int ? 'A whole number' : `Round to ${a.decimals ?? 2} decimal places`}</p>
      </div>`).join('');
    root.innerHTML = `<form class="practice" novalidate>
        <div class="practice-prompt">${problem.prompt}${problem.promptTex ? `<div class="step-math">${tex(problem.promptTex, true)}</div>` : ''}</div>
        <div class="field-row mt-4">${inputs}</div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">Check answer</button>
          <button type="button" class="btn btn-secondary" data-hint>Hint</button>
          <button type="button" class="btn btn-ghost" data-solution>Show solution</button>
          <button type="button" class="btn btn-ghost" data-new>New problem</button>
        </div>
        <div class="practice-feedback" data-feedback role="status" aria-live="polite"></div>
        <div data-hint-box hidden></div>
        <div data-solution-box hidden></div>
      </form>`;
    const form = root.querySelector('form');
    const fb = root.querySelector('[data-feedback]');
    const hintBox = root.querySelector('[data-hint-box]');
    const solBox = root.querySelector('[data-solution-box]');
    const showHint = () => {
      hintBox.hidden = false;
      hintBox.innerHTML = `<div class="alert alert-info"><p class="alert-title">Hint</p><p>${escapeHtml(problem.hint)}</p>${problem.hintTex ? `<div class="step-math">${tex(problem.hintTex, true)}</div>` : ''}</div>`;
    };
    const showSolution = () => {
      solBox.hidden = false;
      const final = problem.answers.map((a) => `${a.label}: ${a.int ? a.value : Number(a.value.toFixed(a.decimals ?? 2))}${a.unit ? ` ${a.unit}` : ''}`).join(' · ');
      solBox.innerHTML = stepsBlock(problem.steps, { title: 'Worked solution' }) + `<p class="practice-final">Answer — ${escapeHtml(final)}</p>`;
    };
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const typed = problem.answers.map((_, i) => parseAnswer(form.querySelector(`[data-answer="${i}"]`).value));
      if (typed.some((v) => v === null)) {
        fb.className = 'practice-feedback is-wrong';
        fb.textContent = 'Enter a number in every box (decimals or fractions such as 3/4).';
        return;
      }
      let verdicts;
      if (problem.unordered) {
        const exp = problem.answers.map((a) => a.value).sort((x, y) => x - y);
        const got = typed.slice().sort((x, y) => x - y);
        verdicts = got.map((g, i) => judge(g, exp[i], problem.answers[i].decimals ?? 2));
      } else {
        verdicts = typed.map((g, i) => judge(g, problem.answers[i].value, problem.answers[i].int ? 0 : problem.answers[i].decimals ?? 2));
      }
      problem.answers.forEach((_, i) => {
        const el = form.querySelector(`[data-answer="${i}"]`);
        el.setAttribute('aria-invalid', verdicts[i] === 'correct' || problem.unordered ? 'false' : 'true');
      });
      attempts++;
      if (verdicts.every((v) => v === 'correct')) {
        fb.className = 'practice-feedback is-correct';
        fb.textContent = attempts === 1 ? 'Correct — well done!' : `Correct after ${attempts} tries. Open the worked solution to compare your method.`;
        form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
      } else if (verdicts.some((v) => v === 'close')) {
        fb.className = 'practice-feedback is-close';
        fb.textContent = 'Very close. Check your rounding, or a sign or unit in the last step.';
      } else {
        fb.className = 'practice-feedback is-wrong';
        fb.textContent = attempts >= 2 ? 'Not yet. Take the hint, or open the worked solution and compare it step by step.' : 'Not quite. Check your working and try again.';
        if (attempts >= 2 && hintBox.hidden) showHint();
      }
    });
    root.querySelector('[data-hint]').addEventListener('click', showHint);
    root.querySelector('[data-solution]').addEventListener('click', showSolution);
    root.querySelector('[data-new]').addEventListener('click', () => { build(); root.querySelector('input').focus(); });
  };
  build();
  return { next: build };
}

/** Random helpers for problem generators (pass the generator's rand). */
export const pick = (rand, list) => list[Math.floor(rand() * list.length)];
export const randInt = (rand, lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));
