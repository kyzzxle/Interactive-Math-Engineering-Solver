/**
 * Pigeonhole principle. If n items go into k boxes, some box holds at least ⌈n/k⌉ items.
 * Reverse form: to guarantee that some box holds at least m items you need k(m − 1) + 1 items.
 * The diagram shows the most even distribution, which is the worst case.
 */
import { validator, answer } from '../lib/calc-kit.js';
import { randInt, pick } from '../lib/learn.js';

function boxes(n, k) {
  const show = Math.min(k, 12), base = Math.floor(n / k), extra = n % k;
  const counts = Array.from({ length: show }, (_, i) => base + (i < extra ? 1 : 0));
  const max = Math.max(...counts, 1), cell = 12, perRow = 4;
  const bh = Math.ceil(Math.min(max, 40) / perRow) * cell + 22, bw = perRow * cell + 14, W = show * (bw + 8) + 10, H = bh + 34;
  const parts = counts.map((c, i) => {
    const x0 = 10 + i * (bw + 8);
    const dots = Array.from({ length: Math.min(c, 40) }, (_, j) => `<circle class="${c === max ? 'd-point3' : 'd-point'}" cx="${x0 + 9 + (j % perRow) * cell}" cy="${bh - 8 - Math.floor(j / perRow) * cell}" r="4.5"/>`).join('');
    return `<rect class="d-body" x="${x0}" y="4" width="${bw}" height="${bh}" rx="4"/>${dots}<text class="d-label" x="${x0 + bw / 2}" y="${bh + 22}" text-anchor="middle">${c}${c > 40 ? '' : ''}</text>`;
  }).join('');
  return `<svg class="diagram" viewBox="0 0 ${W} ${H}" role="img" aria-label="Items spread as evenly as possible"><title>Items spread as evenly as possible</title>${parts}</svg>`;
}

export const calculator = {
  id: 'pigeonhole-principle',
  explore: {
    title: 'Spread the pigeons out',
    intro: 'Even the most even spread cannot avoid a crowded box once there are more pigeons than holes. Orange boxes are the fullest.',
    controls: [{ name: 'n', label: 'Pigeons n', min: 1, max: 60, step: 1, value: 13 }, { name: 'k', label: 'Holes k', min: 1, max: 12, step: 1, value: 4 }],
    render({ n, k }) {
      return { html: boxes(n, k), readouts: [{ label: 'Guaranteed', tex: `\\left\\lceil \\frac{${n}}{${k}} \\right\\rceil = ${Math.ceil(n / k)}`, tone: 'good' }, { label: 'Pigeons needed to force ' + (Math.ceil(n / k) + 1) + ' in a hole', tex: `${k}(${Math.ceil(n / k)}) + 1 = ${k * Math.ceil(n / k) + 1}` }] };
    },
  },
  practice: {
    title: 'Socks in the dark',
    generate(rand) {
      const colours = randInt(rand, 2, 6), m = pick(rand, [2, 3]);
      const need = colours * (m - 1) + 1;
      return {
        prompt: `<p>A drawer has socks in <strong>${colours} colours</strong>. In the dark, what is the smallest number of socks you must take to be sure of getting <strong>${m}</strong> of the same colour?</p>`,
        answers: [{ label: 'Socks', value: need, int: true }],
        hint: 'Imagine the worst case: you keep getting different colours for as long as possible.',
        hintTex: 'k(m - 1) + 1',
        steps: [{ title: 'Worst case', text: `You could take ${m - 1} of each of the ${colours} colours (${colours * (m - 1)} socks) without ${m} matching.` }, { title: 'One more forces it', tex: `${colours}(${m} - 1) + 1 = ${need}` }],
      };
    },
  },
  fields: [
    { name: 'mode', label: 'Question', type: 'radio', options: [['least', 'n items in k boxes: how full must some box be?'], ['need', 'How many items guarantee m in one box?']] },
    { name: 'n', label: 'Number of items n', type: 'number', inputmode: 'numeric', placeholder: 'e.g. 13', showWhen: { mode: ['least'] } },
    { name: 'k', label: 'Number of boxes k', type: 'number', inputmode: 'numeric', placeholder: 'e.g. 12' },
    { name: 'm', label: 'Items wanted in one box m', type: 'number', inputmode: 'numeric', placeholder: 'e.g. 3', showWhen: { mode: ['need'] } },
  ],
  examples: [
    { label: '13 people, 12 birth months', values: { mode: 'least', n: '13', k: '12' } },
    { label: '100 items in 7 boxes', values: { mode: 'least', n: '100', k: '7' } },
    { label: 'Socks: 3 of a colour from 4 colours', values: { mode: 'need', k: '4', m: '3' } },
    { label: 'Invalid: zero boxes', values: { mode: 'least', n: '5', k: '0' }, expectError: true },
  ],
  solve(values) {
    const v = validator(values);
    const need = values.mode === 'need';
    const k = v.whole('k', 'the number of boxes', 1e9, 1);
    const n = need ? null : v.whole('n', 'the number of items', 1e12, 1);
    const m = need ? v.whole('m', 'm', 1e9, 1) : null;
    if (!v.ok()) return v.result();
    if (need) {
      const N = k * (m - 1) + 1;
      return {
        ok: true,
        final: { tex: `${k}(${m} - 1) + 1 = ${N}` },
        answers: [answer('Items needed', N, { primary: true, decimals: 0 })],
        visual: { svg: boxes(k * (m - 1), k), caption: `The worst case with ${k * (m - 1)} items: ${m - 1} in every box and still no box with ${m}. One more item must make a box reach ${m}.` },
        formula: ['N = k(m - 1) + 1'],
        steps: [
          { title: 'Worst case: fill every box up to one less than m', tex: `k(m - 1) = ${k}(${m} - 1) = ${k * (m - 1)}` },
          { title: 'One more item must go into a box that already has m − 1', tex: `N = ${k * (m - 1)} + 1 = ${N}` },
          { title: 'And fewer is not enough', text: `With ${k * (m - 1)} items the even spread shown has no box with ${m}, so ${N} is the smallest number that guarantees it.` },
        ],
        notes: [{ kind: 'info', text: 'The principle guarantees existence; it does not say which box is full.' }],
      };
    }
    const g = Math.ceil(n / k);
    return {
      ok: true,
      final: { tex: `\\left\\lceil \\frac{${n}}{${k}} \\right\\rceil = ${g}` },
      answers: [answer('Some box has at least', g, { primary: true, decimals: 0 }), answer('Boxes with that many in the most even spread', n % k === 0 ? k : n % k, { decimals: 0 })],
      visual: { svg: boxes(n, k), caption: k > 12 ? 'Only the first 12 boxes are drawn.' : 'The most even way to place the items. Even so, some box holds ⌈n/k⌉.' },
      formula: ['\\text{some box holds at least } \\left\\lceil \\frac{n}{k} \\right\\rceil'],
      steps: [
        { title: 'Average per box', tex: `\\frac{n}{k} = \\frac{${n}}{${k}}${n % k ? ` \\approx ${(n / k).toFixed(4)}` : ` = ${n / k}`}` },
        { title: 'Not every box can be below the average', text: 'If every box held fewer than the average, the total would be less than n.' },
        { title: 'Round up (boxes hold whole items)', tex: `\\left\\lceil \\frac{${n}}{${k}} \\right\\rceil = ${g}` },
      ],
      notes: [{ kind: 'info', text: g === 1 ? 'With no more items than boxes, the principle only guarantees 1 per box: every item could have its own box.' : `Example: among ${n} items in ${k} boxes, at least one box has ${g} or more.` }],
    };
  },
};
