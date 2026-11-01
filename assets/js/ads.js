/*
 * Solver Hub — Google AdSense loader.
 *
 * Nothing is loaded unless site.config.json has adsense.enabled = true AND a valid
 * publisher ID (ca-pub- followed by 16 digits). Values reach this file through
 * assets/js/site-config.js, which tools/build.mjs generates.
 *
 * Modes:
 *   "manual" — fills each <aside class="ad-slot" data-ad-slot-key="..."> that has an ad-unit ID
 *              in adsense.slots. Slots without an ID stay hidden (they take no space).
 *   "auto"   — loads only the AdSense script so Auto ads can choose placements;
 *              the manual slots stay hidden.
 *
 * Layout preview: add ?ads=preview to any URL (or set adsense.showPlaceholders = true)
 * to see where the slots are, without loading any advertising code.
 */
(function () {
  'use strict';
  var cfg = (window.SITE_CONFIG && window.SITE_CONFIG.adsense) || {};
  var slots = Array.prototype.slice.call(document.querySelectorAll('.ad-slot'));
  var preview = /[?&]ads=preview(?:&|$)/.test(location.search);
  var validPublisher = /^ca-pub-\d{16}$/.test(cfg.publisherId || '');

  if (cfg.enabled && validPublisher) {
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(cfg.publisherId);
    script.crossOrigin = 'anonymous';
    document.head.appendChild(script);
    window.adsbygoogle = window.adsbygoogle || [];

    if (cfg.mode !== 'auto') {
      slots.forEach(function (slot) {
        var key = slot.getAttribute('data-ad-slot-key');
        var unitId = cfg.slots && cfg.slots[key];
        if (!unitId || !/^\d{6,}$/.test(String(unitId))) return;
        var ins = document.createElement('ins');
        ins.className = 'adsbygoogle';
        ins.style.display = 'block';
        ins.setAttribute('data-ad-client', cfg.publisherId);
        ins.setAttribute('data-ad-slot', String(unitId));
        if (key === 'inArticle') {
          ins.style.textAlign = 'center';
          ins.setAttribute('data-ad-layout', 'in-article');
          ins.setAttribute('data-ad-format', 'fluid');
        } else {
          ins.setAttribute('data-ad-format', 'auto');
          ins.setAttribute('data-full-width-responsive', 'true');
        }
        slot.appendChild(ins);
        slot.classList.add('is-active');
        try { window.adsbygoogle.push({}); } catch (e) { /* AdSense reports its own errors */ }
      });
    }

    // Google's consent message (AdSense > Privacy & messaging) supports a "revisit choices" link.
    document.querySelectorAll('[data-privacy-choices]').forEach(function (btn) {
      btn.hidden = false;
      btn.addEventListener('click', function () {
        window.googlefc = window.googlefc || {};
        window.googlefc.callbackQueue = window.googlefc.callbackQueue || [];
        window.googlefc.callbackQueue.push(function () {
          if (window.googlefc && typeof window.googlefc.showRevocationMessage === 'function') {
            window.googlefc.showRevocationMessage();
          }
        });
      });
    });
  } else if (preview || cfg.showPlaceholders) {
    slots.forEach(function (slot) {
      slot.classList.add('is-preview');
      slot.setAttribute('aria-hidden', 'true');
    });
  }
})();
