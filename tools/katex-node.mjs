/**
 * Loads the vendored KaTeX build (assets/vendor/katex/katex.min.js) in Node and renders
 * TeX to MathML. MathML is drawn natively by modern browsers, so build-time rendered
 * formulas need no JavaScript, CSS or web fonts and can never appear as raw LaTeX.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const code = readFileSync(join(ROOT, 'assets/vendor/katex/katex.min.js'), 'utf8');
const mod = { exports: {} };
new Function('module', 'exports', code)(mod, mod.exports);
const katex = mod.exports.default || mod.exports;

/** TeX -> MathML string (annotation removed so old browsers never print the TeX source). */
export function texToMathML(tex, display = false) {
  const html = katex.renderToString(tex, { output: 'mathml', displayMode: display, throwOnError: true, strict: 'ignore' });
  return html.replace(/<annotation[^>]*>[\s\S]*?<\/annotation>/g, '');
}

export { katex };
