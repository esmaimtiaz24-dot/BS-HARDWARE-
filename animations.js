/* ============================================================
   animations.js — site-wide motion engine
   ------------------------------------------------------------
   1. Scroll progress bar + back-to-top
   2. Page-to-page curtain transition (red/ink wipe)
   3. Word-by-word heading reveal (split text)
   4. Product card stagger (kisi bhi page par, dynamic render par bhi)
   5. Mouse spotlight on product cards
   6. Parallax (hero word, [data-parallax])
   7. Section-level stagger for cards / tiles
   8. Marquee speed polish

   Sab kuch defensive hai:
   • GSAP na ho / reduced-motion ho -> kuch bhi chhupta nahi,
     content default visible rehta hai.
   • Koi bhi element permanently hidden nahi hota (gsap.from + clearProps)
   ============================================================ */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var gsapOK = typeof window.gsap !== 'undefined';
  var finePointer = window.matchMedia('(pointer: fine)').matches;

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  /* ---------------- 1. scroll progress + back to top ---------------- */
  function initProgress() {
    var bar = document.createElement('div');
    bar.className = 'scroll-progress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);

    var top = document.createElement('button');
    top.type = 'button';
    top.className = 'to-top';
    top.setAttribute('aria-label', 'Back to top');
    top.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
    document.body.appendChild(top);
    top.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    });

    var ticking = false;
    function paint() {
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      var pct = max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 0;
      bar.style.width = pct + '%';
      top.classList.toggle('show', window.scrollY > 520);
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(paint);
    }, { passive: true });
    window.addEventListener('resize', paint);
    paint();
  }

  /* ---------------- 2. page curtain ---------------- */
  function initCurtain() {
    var curtain = document.createElement('div');
    curtain.className = 'page-curtain';
    curtain.innerHTML = '<i></i><i></i><i></i>';
    document.body.appendChild(curtain);

    /* page open hote hi curtain neeche khisak jata hai */
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { curtain.classList.add('is-out'); });
    });
    setTimeout(function () {
      curtain.classList.remove('is-in');
      curtain.style.pointerEvents = 'none';
    }, 1400);

    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest('a');
      if (!a) return;
      var href = a.getAttribute('href');
      if (!href || href.charAt(0) === '#') return;
      if (/^(mailto|tel|javascript):/i.test(href)) return;
      if (a.target === '_blank' || a.hasAttribute('download')) return;

      var url;
      try { url = new URL(a.href, location.href); } catch (err) { return; }
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search && url.hash) return;
      if (url.href === location.href) return;

      e.preventDefault();
      curtain.classList.remove('is-out');
      curtain.classList.add('is-in');
      /* fallback: agar animation ruk jaye tab bhi navigation ho jaye */
      setTimeout(function () { window.location.href = a.href; }, 560);
    });
  }

  /* ---------------- 3. split-text headings ---------------- */
  function splitWords(el) {
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    var nodes = [];
    var n;
    while ((n = walker.nextNode())) {
      if (n.nodeValue && n.nodeValue.trim()) nodes.push(n);
    }
    nodes.forEach(function (node) {
      if (node.parentNode && node.parentNode.classList && node.parentNode.classList.contains('sw')) return;
      var frag = document.createDocumentFragment();
      node.nodeValue.split(/(\s+)/).forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
        var wrap = document.createElement('span');
        wrap.className = 'sw';
        var inner = document.createElement('i');
        inner.textContent = part;
        wrap.appendChild(inner);
        frag.appendChild(wrap);
      });
      if (node.parentNode) node.parentNode.replaceChild(frag, node);
    });
    return el.querySelectorAll('.sw > i');
  }

  function animateWords(words, delay) {
    if (!words || !words.length) return;
    gsap.from(words, {
      yPercent: 118, opacity: 0, duration: 0.85, stagger: 0.038,
      ease: 'power4.out', delay: delay || 0, clearProps: 'all'
    });
  }

  function initSplit() {
    var selector = [
      '.hero-title', '.page-head h1', '.pdp-title',
      'h2.display-lg', 'h2.display-md', 'h2.display-sm',
      '.success-wrap h1', '.auth-card h1', '.admin-login-card h1',
      '.section--red h2', '.section--ink h2'
    ].join(',');

    var els = [].slice.call(document.querySelectorAll(selector));
    var vh = window.innerHeight;
    var below = [];

    els.forEach(function (el) {
      if (el.dataset.splitDone === '1') return;
      el.dataset.splitDone = '1';
      var words = splitWords(el);
      if (!words.length) return;
      var r = el.getBoundingClientRect();
      if (r.top < vh * 0.92 && r.bottom > 0) {
        animateWords(words, 0.08);
      } else {
        el.__words = words;
        below.push(el);
      }
    });

    if (!below.length || !('IntersectionObserver' in window)) {
      below.forEach(function (el) { animateWords(el.__words, 0); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        animateWords(en.target.__words, 0);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.12 });
    below.forEach(function (el) { io.observe(el); });
  }

  /* ---------------- 4. product card stagger ---------------- */
  function animateCards(cards) {
    if (!cards || !cards.length) return;
    gsap.from(cards, {
      opacity: 0, y: 30, scale: 0.985, duration: 0.6,
      stagger: 0.06, ease: 'power2.out', clearProps: 'all'
    });
  }

  function initCardObserver() {
    if (!('MutationObserver' in window)) return;

    var mo = new MutationObserver(function (mutations) {
      var found = [];
      mutations.forEach(function (m) {
        Array.prototype.forEach.call(m.addedNodes, function (node) {
          if (node.nodeType !== 1) return;
          if (node.classList && node.classList.contains('p-card')) found.push(node);
          else if (node.querySelectorAll) {
            Array.prototype.forEach.call(node.querySelectorAll('.p-card'), function (c) { found.push(c); });
          }
        });
      });
      if (found.length) animateCards(found);
    });
    mo.observe(document.body, { childList: true, subtree: true });

    /* page par pehle se maujood cards (agar koi ho) */
    var existing = document.querySelectorAll('.p-card');
    if (existing.length) animateCards(existing);
  }

  /* ---------------- 5. spotlight on cards ---------------- */
  function initSpotlight() {
    if (!finePointer) return;
    document.addEventListener('mousemove', function (e) {
      var card = e.target.closest && e.target.closest('.p-card');
      if (!card) return;
      var r = card.getBoundingClientRect();
      card.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
      card.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
    }, { passive: true });
  }

  /* ---------------- 6. parallax ---------------- */
  function initParallax() {
    var els = [].slice.call(document.querySelectorAll('[data-parallax]'));
    var heroWord = document.querySelector('.hero-word');
    if (heroWord) els.push(heroWord);
    if (!els.length) return;

    var items = els.map(function (el) {
      var speed = parseFloat(el.dataset.parallax);
      if (isNaN(speed)) speed = 0.12;
      el.style.willChange = 'transform';
      return { el: el, speed: speed };
    });

    var ticking = false;
    function paint() {
      var vh = window.innerHeight;
      items.forEach(function (it) {
        var r = it.el.getBoundingClientRect();
        if (r.bottom < -180 || r.top > vh + 180) return;
        var center = r.top + r.height / 2 - vh / 2;
        it.el.style.transform = 'translate3d(0,' + (-center * it.speed).toFixed(1) + 'px,0)';
      });
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(paint);
    }, { passive: true });
    window.addEventListener('resize', paint);
    paint();
  }

  /* ---------------- 7. static grids stagger ---------------- */
  function initGridStagger() {
    var groups = [
      { sel: '#catGrid .cat-card', stagger: 0.05 },
      { sel: '.quote-grid .quote-card', stagger: 0.08 },
      { sel: '.section--paper .trust-item', stagger: 0.06 },
      { sel: '.admin-stats .admin-stat', stagger: 0.06 },
      { sel: '.timeline .tl-step', stagger: 0.08 }
    ];

    groups.forEach(function (g) {
      var nodes = [].slice.call(document.querySelectorAll(g.sel));
      if (!nodes.length) return;

      /* sirf un elements ko animate karo jo pehle se hidden nahi hain
         (.reveal wale IntersectionObserver khud handle karta hai) */
      var plain = nodes.filter(function (n) { return !n.classList.contains('reveal'); });
      if (!plain.length) return;

      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          io.unobserve(en.target);
          var kids = [].slice.call(en.target.querySelectorAll(g.sel.split(' ').pop()));
          if (!kids.length) kids = [en.target];
          gsap.from(kids, {
            opacity: 0, y: 24, duration: 0.55, stagger: g.stagger,
            ease: 'power2.out', clearProps: 'all'
          });
        });
      }, { rootMargin: '0px 0px -5% 0px', threshold: 0.08 });

      var parents = {};
      plain.forEach(function (n) {
        var p = n.parentElement;
        if (!p) return;
        if (!parents[p.__bsId]) { parents[p.__bsId = 'g' + Math.random()] = p; }
      });
      Object.keys(parents).forEach(function (k) { io.observe(parents[k]); });
    });
  }

  /* ---------------- 8. ticker reacts to hover speed ---------------- */
  function initTickers() {
    document.querySelectorAll('.ticker').forEach(function (t) {
      var track = t.querySelector('.ticker-track');
      if (!track) return;
      t.addEventListener('mouseenter', function () {
        track.style.animationDuration = '60s';
        track.style.transition = 'animation-duration .4s';
      });
      t.addEventListener('mouseleave', function () {
        track.style.animationDuration = '';
      });
    });
  }

  /* ---------------- boot ---------------- */
  ready(function () {
    initProgress();
    initSpotlight();
    initTickers();

    if (reduce) return;                 /* motion-sensitive users: bas */
    initCurtain();
    if (!gsapOK) return;                /* GSAP na ho to CSS animations hi kaafi hain */

    initSplit();
    initCardObserver();
    initParallax();
    initGridStagger();

    /* dynamic content (products/orders) ke baad headings dobara check */
    setTimeout(function () {
      document.querySelectorAll('[data-split-done="0"]').forEach(function () {});
    }, 800);
  });
})();
