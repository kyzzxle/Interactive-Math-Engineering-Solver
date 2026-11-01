/* Permutations and combinations — page controller. */
import { solveCombinatorics, EXACT_DIGIT_LIMIT } from '../calculators/combinatorics.js';
import { stepsBlock, alertBlock, notesBlock, showFieldErrors, clearFieldErrors, wireCalculator, tex, escapeHtml } from '../lib/ui.js';

const form = document.getElementById('pc-form');
const output = document.getElementById('pc-output');
const status = document.getElementById('pc-status');
const copyAllBtn = document.querySelector('[data-copy-all]');
const placeholderHtml = output.innerHTML;
const FIELDS = ['n', 'r'];
const SHOW_INLINE_DIGITS = 30;

function sciText(d) {
  return `${d.sci.mantissa} × 10^${d.sci.exponent.toLocaleString('en-US')}`;
}

/** Card for a possibly enormous integer. */
function bigCard(label, d, { primary = false } = {}) {
  const digitsInfo = `${d.digits.toLocaleString('en-US')} digit${d.digits === 1 ? '' : 's'}`;
  let value;
  let extra = '';
  let tag;
  let copy;
  if (d.exact && d.digits <= SHOW_INLINE_DIGITS) {
    value = escapeHtml(d.grouped);
    tag = '<span class="result-tag tag-exact" title="Exact value">exact</span>';
    copy = d.full;
  } else if (d.exact) {
    value = `≈ ${tex(`${d.sci.mantissa} \\times 10^{${d.sci.exponent}}`)}`;
    tag = '<span class="result-tag tag-exact" title="The full exact value is available below">exact value below</span>';
    copy = d.full;
    extra = `<details class="mt-2"><summary class="cursor-pointer text-sm font-semibold text-indigo-600 dark:text-indigo-400">Show all ${digitsInfo}</summary><div class="big-number mt-2">${d.grouped}</div></details>`;
  } else {
    value = `≈ ${tex(`${d.sci.mantissa} \\times 10^{${d.sci.exponent.toLocaleString('en-US').replace(/,/g, '{,}')}}`)}`;
    tag = '<span class="result-tag tag-approx" title="Approximation">≈ approx.</span>';
    copy = sciText(d);
  }
  return `<div class="result-card${primary ? ' is-primary' : ''}">
      <div class="result-label">${escapeHtml(label)}</div>
      <button type="button" class="copy-btn" data-copy="${escapeHtml(copy)}" aria-label="Copy ${escapeHtml(label)}">Copy</button>
      <div class="result-value">${value}${tag}</div>
      <div class="result-exact">${digitsInfo}${d.exact ? '' : ` (more than ${EXACT_DIGIT_LIMIT.toLocaleString('en-US')} — shown approximately)`}</div>
      ${extra}
    </div>`;
}

function enumerationBlock(en, n, r) {
  if (!en) return '';
  const perms = en.perms.map((p) => `<li>${p}</li>`).join('');
  const combos = en.combos.map((c) => `<li>{${c.split('').join(', ')}}</li>`).join('');
  return `<details class="steps" open>
      <summary>See every outcome (items ${en.items.join(', ')})</summary>
      <div class="px-4 pb-4 text-sm">
        <p class="font-semibold">All ${en.perms.length} ordered arrangements of ${r} — P(${n}, ${r})</p>
        <ul class="enum-list">${perms}</ul>
        <p class="mt-4 font-semibold">All ${en.combos.length} unordered selections of ${r} — C(${n}, ${r})</p>
        <ul class="enum-list">${combos}</ul>
        <p class="mt-3 text-slate-500 dark:text-slate-400">Each selection appears ${en.perms.length / en.combos.length} times among the arrangements — once for each of its ${r}! orderings.</p>
      </div>
    </details>`;
}

function show(values) {
  const res = solveCombinatorics(values);
  if (!res.ok) {
    showFieldErrors(form, res.errors);
    output.innerHTML = alertBlock('error', 'Please check your inputs', [...new Set(res.errors.map((e) => e.message))]);
    status.textContent = `Error: ${res.errors[0].message}`;
    copyAllBtn.hidden = true;
    return false;
  }
  clearFieldErrors(form);
  const v = res.values;
  const { n, r } = v;
  const cards = [
    bigCard(`Permutations P(${n}, ${r})`, v.permutation, { primary: true }),
    bigCard(`Combinations C(${n}, ${r})`, v.combination, { primary: true }),
    bigCard(`${r}! (orderings of each selection)`, v.rFactorial),
  ];
  const formulas = `<div class="formula-box mt-4" aria-label="Formulas used">
      <p class="text-sm font-semibold">Formulas used</p>
      ${tex('P(n, r) = \\frac{n!}{(n - r)!} \\qquad C(n, r) = \\frac{n!}{r!\\,(n - r)!}', true)}
    </div>`;
  output.innerHTML = `<div class="result-grid">${cards.join('')}</div>
    ${notesBlock(res.notes)}
    ${formulas}
    ${stepsBlock(res.steps)}
    ${enumerationBlock(res.enumeration, n, r)}`;

  const line = (label, d) => `${label} = ${d.exact ? d.full : `≈ ${sciText(d)}`}`;
  copyAllBtn.hidden = false;
  copyAllBtn.setAttribute('data-copy', [`n = ${n}, r = ${r}`, line(`P(${n}, ${r})`, v.permutation), line(`C(${n}, ${r})`, v.combination)].join('\n'));
  const say = (d) => (d.exact && d.digits <= SHOW_INLINE_DIGITS ? d.grouped : `about ${sciText(d)}`);
  status.textContent = `Results updated. P(${n}, ${r}) is ${say(v.permutation)} and C(${n}, ${r}) is ${say(v.combination)}.`;
  return true;
}

wireCalculator({
  form,
  output,
  fields: FIELDS,
  example: { n: '10', r: '3' },
  onCalculate: show,
  onReset: () => {
    output.innerHTML = placeholderHtml;
    status.textContent = 'Form cleared.';
    copyAllBtn.hidden = true;
  },
});

copyAllBtn.addEventListener('click', () => {
  const text = copyAllBtn.getAttribute('data-copy') || '';
  window.SolverHub.copyText(text).then(() => window.SolverHub.toast('All results copied'), () => window.SolverHub.toast('Copy failed'));
});
