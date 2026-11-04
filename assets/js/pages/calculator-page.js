/*
 * Generic calculator page controller used by every generated calculator page.
 * The form HTML is generated at build time from the calculator's `fields`; this file
 * wires it up and renders the result object returned by `calculator.solve(values)`:
 *
 *   { ok: false, errors: [{ field, message }] }
 *   { ok: true, final, answers, visual: { svg, caption, legend }, notes, formula, steps, tables }
 */
import {
  resultCard, stepsBlock, alertBlock, notesBlock, finalAnswerBlock, tableBlock, showFieldErrors, clearFieldErrors,
  wireCalculator, fillForm, tex, escapeHtml,
} from '../lib/ui.js';
import { mountExplorer, mountPractice } from '../lib/learn.js';

function isVisible(form, name) {
  const el = form.elements.namedItem(name);
  const node = el && (el instanceof RadioNodeList ? el[0] : el);
  return !node || !node.closest('[hidden]');
}

export function mountCalculator(calc) {
  const form = document.getElementById('calc-form');
  const output = document.getElementById('calc-output');
  const status = document.getElementById('calc-status');
  const copyAllBtn = document.querySelector('[data-copy-all]');
  if (!form || !output) return;
  const placeholder = output.innerHTML;
  const names = calc.fields.map((f) => f.name);

  // ---------------------------------------------------------- conditional fields and unit suffixes
  const syncVisibility = () => {
    form.querySelectorAll('[data-show-when]').forEach((el) => {
      // "field=a|b;other=c": shown only when every condition holds
      el.hidden = !el.getAttribute('data-show-when').split(';').every((cond) => {
        const [field, list] = cond.split('=');
        const ctrl = form.elements.namedItem(field);
        const value = ctrl ? ctrl.value : '';
        return list.split('|').includes(value);
      });
    });
    const unitCtrl = form.elements.namedItem('unit');
    const unit = unitCtrl ? unitCtrl.value : '';
    form.querySelectorAll('[data-unit-affix]').forEach((el) => {
      const kind = el.getAttribute('data-unit-affix');
      el.textContent = !unit ? '' : kind === 'area' ? `${unit}²` : kind === 'volume' ? `${unit}³` : unit;
    });
  };
  form.addEventListener('change', syncVisibility);
  syncVisibility();

  // ---------------------------------------------------------- rendering
  let lastOk = false;
  const render = (values, { live = false } = {}) => {
    let res;
    try {
      res = calc.solve(values);
    } catch (e) {
      res = { ok: false, errors: [{ message: `This input could not be processed: ${e.message}` }] };
    }
    if (!res.ok) {
      showFieldErrors(form, res.errors, { focus: !live });
      output.innerHTML = alertBlock('error', 'Please check your inputs', [...new Set(res.errors.map((e) => e.message))]);
      status.textContent = `Error: ${res.errors[0].message}`;
      copyAllBtn.hidden = true;
      lastOk = false;
      return false;
    }
    clearFieldErrors(form);
    const parts = [];
    parts.push(finalAnswerBlock(res.final));
    if (res.answers && res.answers.length) parts.push(`<div class="result-grid">${res.answers.map(resultCard).join('')}</div>`);
    if (res.visual) {
      parts.push(`<figure class="visual">${res.visual.svg}${res.visual.legend || ''}${res.visual.caption ? `<figcaption class="diagram-caption">${escapeHtml(res.visual.caption)}</figcaption>` : ''}</figure>`);
    }
    parts.push(notesBlock(res.notes));
    if (res.formula && res.formula.length) {
      parts.push(`<div class="formula-box mt-4"><p class="text-sm font-semibold">Formula used</p>${res.formula.map((f) => tex(f, true)).join('')}</div>`);
    }
    if (res.steps && res.steps.length) parts.push(stepsBlock(res.steps));
    for (const t of res.tables || []) parts.push(tableBlock(t));
    if (res.rounding !== false) {
      parts.push(`<p class="mt-3 text-xs text-slate-500 dark:text-slate-400">${escapeHtml(res.rounding || 'Decimals are rounded to 6 decimal places; values marked "exact" are not rounded.')}</p>`);
    }
    output.innerHTML = parts.join('');
    const lines = (res.answers || []).map((a) => a.copy || `${a.label}: ${a.value ?? ''}`);
    copyAllBtn.hidden = !lines.length;
    copyAllBtn.setAttribute('data-copy', lines.join('\n'));
    status.textContent = `Results updated. ${res.final && res.final.text ? res.final.text : lines[0] || ''}`;
    lastOk = true;
    return true;
  };

  const examples = calc.examples || [];
  const api = wireCalculator({
    form,
    output,
    fields: names,
    example: examples[0] && examples[0].values,
    onCalculate: (values) => render(values),
    onReset: () => {
      output.innerHTML = placeholder;
      status.textContent = 'Form cleared.';
      copyAllBtn.hidden = true;
      lastOk = false;
      syncVisibility();
    },
    urlFilter: (values) => Object.fromEntries(Object.entries(values).filter(([k]) => isVisible(form, k))),
  });

  // additional worked examples
  document.querySelectorAll('[data-example-index]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const ex = examples[Number(btn.getAttribute('data-example-index'))];
      if (!ex) return;
      form.reset();
      setTimeout(() => {
        fillForm(form, ex.values);
        syncVisibility();
        api.run();
        output.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 0);
    });
  });

  // live update: once a result is showing, recalculate when an input is changed
  let timer;
  form.addEventListener('change', (e) => {
    if (!lastOk || e.target.type === 'submit') return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      const values = Object.fromEntries(names.map((n) => [n, form.elements.namedItem(n) ? form.elements.namedItem(n).value : '']));
      render(values, { live: true });
    }, 150);
  });

  if (calc.explore) mountExplorer(document.querySelector('[data-explore-root]'), calc.explore);
  if (calc.practice) mountPractice(document.querySelector('[data-practice-root]'), calc.practice);

  copyAllBtn.addEventListener('click', () => {
    const t = copyAllBtn.getAttribute('data-copy') || '';
    window.SolverHub.copyText(t).then(() => window.SolverHub.toast('All results copied'), () => window.SolverHub.toast('Copy failed'));
  });
}
