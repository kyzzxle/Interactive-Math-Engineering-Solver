/*
 * Solver Hub — math rendering for content created in the browser (calculator results).
 * Static formulas in the HTML are already converted to MathML by tools/build.mjs.
 *
 * SolverMath.tex(source, display) returns MathML (drawn natively by the browser) using the
 * self-hosted KaTeX library. If KaTeX is unavailable it returns readable plain text such as
 * "(πh)/3 · (R² + Rr + r²)" — never raw LaTeX commands.
 */
(function () {
  'use strict';

  var GREEK = {
    alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', varepsilon: 'ε', theta: 'θ', lambda: 'λ', mu: 'μ',
    pi: 'π', rho: 'ρ', sigma: 'σ', tau: 'τ', phi: 'φ', varphi: 'φ', omega: 'ω', Delta: 'Δ', Sigma: 'Σ', Omega: 'Ω', Theta: 'Θ', Phi: 'Φ',
  };
  var SYMBOLS = {
    cdot: '·', times: '×', div: '÷', pm: '±', mp: '∓', le: '≤', leq: '≤', ge: '≥', geq: '≥', ne: '≠', neq: '≠', approx: '≈',
    infty: '∞', to: '→', rightarrow: '→', Rightarrow: '⇒', implies: '⇒', iff: '⇔', checkmark: '✓', circ: '∘', degree: '°',
    int: '∫', sum: 'Σ', prod: 'Π', partial: '∂', in: '∈', cup: '∪', cap: '∩', emptyset: '∅', ldots: '…', cdots: '⋯', dots: '…',
    angle: '∠', triangle: '△', perp: '⊥', parallel: '∥', lvert: '|', rvert: '|', vert: '|', mid: '|', quad: '  ', qquad: '    ',
    sin: 'sin', cos: 'cos', tan: 'tan', sec: 'sec', csc: 'csc', cot: 'cot', ln: 'ln', log: 'log', exp: 'exp', lim: 'lim',
    arcsin: 'arcsin', arccos: 'arccos', arctan: 'arctan', sinh: 'sinh', cosh: 'cosh', tanh: 'tanh', det: 'det', max: 'max', min: 'min',
  };
  var SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻', '+': '⁺', n: 'ⁿ', i: 'ⁱ' };
  var SUB = { '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉', '-': '₋', '+': '₊' };

  /** Read a {...} group (or a single token) starting at position i. Returns [content, nextIndex]. */
  function group(s, i) {
    while (s[i] === ' ') i++;
    if (s[i] === '{') {
      var depth = 0, j = i;
      for (; j < s.length; j++) {
        if (s[j] === '{') depth++;
        else if (s[j] === '}') { depth--; if (depth === 0) break; }
      }
      return [s.slice(i + 1, j), j + 1];
    }
    if (s[i] === '\\') {
      var m = /^\\[a-zA-Z]+/.exec(s.slice(i));
      if (m) return [m[0], i + m[0].length];
    }
    return [s[i] || '', i + 1];
  }
  function wrap(t) { return /^[\w.²³]+$/.test(t) || t.length <= 1 ? t : '(' + t + ')'; }
  function script(t, map, fallbackPrefix) {
    var out = '';
    for (var k = 0; k < t.length; k++) { if (!map[t[k]]) return fallbackPrefix + wrap(t); out += map[t[k]]; }
    return out;
  }

  /** Convert TeX to readable plain text (best effort, used only as a fallback). */
  function texToText(src) {
    var s = String(src);
    s = s.replace(/\\(?:left|right|big|Big|bigg|Bigg|displaystyle|textstyle|limits|nolimits)\b\s*\.?/g, '')
         .replace(/\\begin\{[bp]?matrix\}([\s\S]*?)\\end\{[bp]?matrix\}/g, function (_, body) {
           return '[' + body.split('\\\\').map(function (r) { return r.split('&').map(function (c) { return c.trim(); }).join(', '); }).join('; ') + ']';
         })
         .replace(/\\begin\{array\}\{[^}]*\}([\s\S]*?)\\end\{array\}/g, function (_, body) {
           return '[' + body.split('\\\\').map(function (r) { return r.split('&').map(function (c) { return c.trim(); }).join(', '); }).join('; ') + ']';
         })
         .replace(/\\(?:text|mathrm|textbf|mathbf|operatorname|mathit|textit)\s*\{([^{}]*)\}/g, '$1')
         .replace(/\\(?:hline|cline\{[^}]*\})/g, '')
         .replace(/\\[,;:! ]/g, ' ')
         .replace(/\\cancel\s*\{([^{}]*)\}/g, '$1')
         .replace(/\^\s*\{?\\circ\}?/g, '°');
    var out = '', i = 0;
    while (i < s.length) {
      var c = s[i];
      if (c === '\\') {
        var m = /^\\([a-zA-Z]+)/.exec(s.slice(i));
        if (!m) { out += s[i + 1] || ''; i += 2; continue; }
        var name = m[1];
        i += m[0].length;
        if (name === 'frac' || name === 'dfrac' || name === 'tfrac') {
          var a = group(s, i); var b = group(s, a[1]); i = b[1];
          out += wrap(texToText(a[0])) + '/' + wrap(texToText(b[0]));
        } else if (name === 'binom') {
          var p = group(s, i); var q = group(s, p[1]); i = q[1];
          out += 'C(' + texToText(p[0]) + ', ' + texToText(q[0]) + ')';
        } else if (name === 'sqrt') {
          var idx = '';
          if (s[i] === '[') { var close = s.indexOf(']', i); idx = s.slice(i + 1, close); i = close + 1; }
          var g = group(s, i); i = g[1];
          out += (idx ? script(idx, SUP, '') : '') + '√' + wrap(texToText(g[0]));
        } else if (GREEK[name]) out += GREEK[name];
        else if (SYMBOLS[name] !== undefined) out += SYMBOLS[name];
        else out += name;
      } else if (c === '^' || c === '_') {
        var gg = group(s, i + 1); i = gg[1];
        var t = texToText(gg[0]);
        out += c === '^' ? script(t, SUP, '^') : script(t, SUB, '_');
      } else if (c === '{' || c === '}') { i++; }
      else if (c === '&') { out += ' '; i++; }
      else { out += c; i++; }
    }
    return out.replace(/\s+/g, ' ').trim();
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /** TeX -> HTML string (MathML when KaTeX is loaded, readable text otherwise). */
  function tex(source, display) {
    var k = window.katex;
    if (k && typeof k.renderToString === 'function') {
      try {
        var html = k.renderToString(String(source), { output: 'mathml', displayMode: !!display, throwOnError: true, strict: 'ignore' });
        html = html.replace(/<annotation[^>]*>[\s\S]*?<\/annotation>/g, '');
        return display ? '<span class="math-display">' + html + '</span>' : html;
      } catch (e) { /* fall through to the readable fallback */ }
    }
    var text = '<span class="math-fallback">' + escapeHtml(texToText(source)) + '</span>';
    return display ? '<span class="math-display">' + text + '</span>' : text;
  }

  /** Safety net: convert any \( \) or \[ \] left in text nodes (e.g. if the build was not run). */
  function renderIn(root) {
    if (!root) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        return /\\[([]/.test(n.nodeValue) && !n.parentNode.closest('script, style, textarea, code, .math, .math-display') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    });
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (node) {
      var html = escapeHtml(node.nodeValue)
        .replace(/\\\[([\s\S]+?)\\\]/g, function (_, t) { return tex(unescape(t), true); })
        .replace(/\\\(([\s\S]+?)\\\)/g, function (_, t) { return tex(unescape(t), false); });
      var span = document.createElement('span');
      span.innerHTML = html;
      node.parentNode.replaceChild(span, node);
    });
    function unescape(t) { return t.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&'); }
  }

  window.SolverMath = { tex: tex, texToText: texToText, renderIn: renderIn };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { renderIn(document.querySelector('main')); });
  } else {
    renderIn(document.querySelector('main'));
  }
})();
