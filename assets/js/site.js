/* Solver Hub — site-wide behaviour: theme, navigation, search, math rendering, TOC, copy helpers. */
(function () {
  'use strict';

  var root = document.documentElement;

  // ------------------------------------------------------------ theme
  function setTheme(mode) {
    root.classList.toggle('dark', mode === 'dark');
    try { localStorage.setItem('theme', mode); } catch (e) { /* storage unavailable: keep in-memory only */ }
    updateThemeButtons();
  }
  function updateThemeButtons() {
    var dark = root.classList.contains('dark');
    document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
      btn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
      btn.setAttribute('aria-pressed', dark ? 'true' : 'false');
    });
  }
  document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
    btn.addEventListener('click', function () { setTheme(root.classList.contains('dark') ? 'light' : 'dark'); });
  });
  updateThemeButtons();
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    var onChange = function (e) {
      var saved = null;
      try { saved = localStorage.getItem('theme'); } catch (err) { saved = null; }
      if (!saved) { root.classList.toggle('dark', e.matches); updateThemeButtons(); }
    };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
  }

  // ------------------------------------------------------------ mobile menu
  var menuBtn = document.querySelector('[data-menu-toggle]');
  var mobileNav = document.getElementById('mobile-nav');
  if (menuBtn && mobileNav) {
    menuBtn.addEventListener('click', function () {
      var open = menuBtn.getAttribute('aria-expanded') === 'true';
      menuBtn.setAttribute('aria-expanded', String(!open));
      menuBtn.setAttribute('aria-label', open ? 'Open menu' : 'Close menu');
      mobileNav.hidden = open;
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') {
        menuBtn.click();
        menuBtn.focus();
      }
    });
  }

  // ------------------------------------------------------------ active navigation link
  function normalisePath(p) { return p.replace(/index\.html$/, '').replace(/\.html$/, '').replace(/\/+$/, '/'); }
  var here = normalisePath(location.pathname);
  var brand = document.querySelector('.brand');
  var homePath = brand ? normalisePath(new URL(brand.getAttribute('href'), location.href).pathname) : '/';
  document.querySelectorAll('.nav-link, .mobile-link').forEach(function (a) {
    var target = normalisePath(new URL(a.getAttribute('href'), location.href).pathname);
    // Home only matches itself; section links (e.g. /calculators/) also match their sub-pages.
    var match = here === target || (target !== homePath && here.indexOf(target) === 0 && /\/$/.test(target));
    if (match) a.setAttribute('aria-current', 'page');
  });

  // ------------------------------------------------------------ toast + clipboard
  var toastEl;
  function toast(message) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      toastEl.setAttribute('role', 'status');
      toastEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = message;
    toastEl.classList.add('is-visible');
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(function () { toastEl.classList.remove('is-visible'); }, 2200);
  }
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy') ? resolve() : reject(new Error('copy failed')); }
      catch (e) { reject(e); }
      finally { document.body.removeChild(ta); }
    });
  }
  window.SolverHub = { toast: toast, copyText: copyText };

  // Static formulas are rendered to MathML at build time; see assets/js/math-render.js for the rest.

  // ------------------------------------------------------------ search and category filter
  var searchInput = document.querySelector('[data-search-input]');
  var list = document.querySelector('[data-search-list]');
  if (searchInput && list) {
    var items = Array.prototype.slice.call(list.querySelectorAll('.calc-card-item'));
    var sections = Array.prototype.slice.call(list.querySelectorAll('[data-directory-section]'));
    var chips = Array.prototype.slice.call(document.querySelectorAll('[data-category-filter]'));
    var countEl = document.querySelector('[data-search-count]');
    var emptyEl = document.querySelector('[data-search-empty]');
    var activeCategory = 'all';
    // On the homepage only "featured" cards show until the visitor searches or picks a subject.
    var featuredOnly = list.hasAttribute('data-featured-only');

    // Small typos still match: a word of 4+ letters may differ from a word on the card by one
    // edit (two for 8+ letters), so "volumne" finds "volume" and "pythagorus" finds "pythagoras".
    var within = function (a, b, max) {
      if (Math.abs(a.length - b.length) > max) return false;
      var prev = [];
      for (var j = 0; j <= b.length; j++) prev[j] = j;
      for (var i = 1; i <= a.length; i++) {
        var cur = [i], best = i;
        for (var k = 1; k <= b.length; k++) {
          cur[k] = Math.min(prev[k] + 1, cur[k - 1] + 1, prev[k - 1] + (a.charAt(i - 1) === b.charAt(k - 1) ? 0 : 1));
          if (cur[k] < best) best = cur[k];
        }
        if (best > max) return false;
        prev = cur;
      }
      return prev[b.length] <= max;
    };
    var wordsOf = {};
    var tokenMatches = function (item, hay, t) {
      if (hay.indexOf(t) !== -1) return true;
      if (t.length < 4) return false;
      var key = item.getAttribute('data-category') + (item.querySelector('a') || {}).href;
      var words = wordsOf[key] || (wordsOf[key] = hay.split(/[^a-z0-9]+/).filter(function (w) { return w.length >= 3; }));
      var max = t.length >= 8 ? 2 : 1;
      return words.some(function (w) { return within(t, w, max) || (w.length > t.length && within(t, w.slice(0, t.length), max)); });
    };

    var apply = function () {
      var tokens = searchInput.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
      var visible = 0;
      var browsing = !tokens.length && activeCategory === 'all';
      items.forEach(function (item) {
        var hay = item.getAttribute('data-search') || '';
        var catOk = activeCategory === 'all' || item.getAttribute('data-category') === activeCategory;
        var ok = catOk && tokens.every(function (t) { return tokenMatches(item, hay, t); });
        if (featuredOnly && browsing && item.getAttribute('data-featured') !== 'true') ok = false;
        item.hidden = !ok;
        if (ok) visible++;
      });
      sections.forEach(function (sec) {
        var cards = sec.querySelectorAll('.calc-card-item');
        if (!tokens.length) { sec.hidden = false; return; }
        if (cards.length) {
          sec.hidden = !sec.querySelector('.calc-card-item:not([hidden])');
        } else {
          var text = (sec.textContent || '').toLowerCase();
          sec.hidden = !tokens.every(function (t) { return text.indexOf(t) !== -1; });
        }
      });
      var plannedMatch = !visible && sections.some(function (s) { return !s.hidden; });
      if (countEl) {
        countEl.textContent = plannedMatch
          ? 'No calculators match yet — related subjects are shown below.'
          : !browsing
            ? visible + ' calculator' + (visible === 1 ? '' : 's') + ' found'
            : featuredOnly
              ? 'Popular picks — search or choose a subject to see all ' + items.length + ' calculators'
              : items.length + ' calculator' + (items.length === 1 ? '' : 's') + ' available';
      }
      if (emptyEl) emptyEl.hidden = visible !== 0 || (sections.length && sections.some(function (s) { return !s.hidden; }));
    };

    searchInput.addEventListener('input', apply);
    searchInput.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && searchInput.value) {
        e.preventDefault();
        searchInput.value = '';
        apply();
      } else if (e.key === 'Enter') {
        // Enter opens the first matching calculator
        var first = items.filter(function (it) { return !it.hidden; })[0];
        var link = first && first.querySelector('a');
        if (link && searchInput.value.trim()) { e.preventDefault(); location.href = link.href; }
      }
    });
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        activeCategory = chip.getAttribute('data-category-filter');
        chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c === chip)); });
        apply();
      });
    });
    var q = new URLSearchParams(location.search).get('q');
    if (q) searchInput.value = q.slice(0, 100);
    apply();

    document.addEventListener('keydown', function (e) {
      var tag = (document.activeElement && document.activeElement.tagName) || '';
      if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(tag)) {
        e.preventDefault();
        searchInput.focus();
      }
    });
  }

  // ------------------------------------------------------------ table of contents scrollspy
  var toc = document.querySelector('[data-toc]');
  if (toc && 'IntersectionObserver' in window) {
    var links = Array.prototype.slice.call(toc.querySelectorAll('a[href^="#"]'));
    var map = {};
    links.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          links.forEach(function (l) { l.classList.remove('is-active'); });
          var link = map[entry.target.id];
          if (link) link.classList.add('is-active');
        }
      });
    }, { rootMargin: '-15% 0px -70% 0px' });
    Object.keys(map).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) observer.observe(el);
    });
  }
})();
