/* ============================================================
   main.js — preloader, hero entrance, counters
   ------------------------------------------------------------
   • Preloader (logo + "BS Hardware & Sanitary") one page load par
     1.9s chalta hai, skip button + Esc/Enter se band ho jata hai.
     Session ke andar dobara nahi aata (sessionStorage flag) aur
     page load block nahi karta — content peeche render hota hai.
   • Motion CSS keyframes se hoti hai, is liye GSAP na ho to bhi
     waisi hi chalti hai.
   • ?intro=1 se preloader dobara force ho jata hai.
   ============================================================ */
(function () {
  'use strict';

  var intro;
  var hasGSAP = function () { return typeof window.gsap !== 'undefined'; };

  function finishIntro() {
    if (!intro || intro.dataset.done === '1') return;
    intro.dataset.done = '1';
    if (introTimer) { clearTimeout(introTimer); introTimer = null; }
    intro.classList.add('is-done');
    document.body.classList.remove('intro-lock');
    try { sessionStorage.setItem('bsh_intro_seen', '1'); } catch (e) {}
    setTimeout(function () {
      if (intro && intro.parentNode) intro.parentNode.removeChild(intro);
    }, 900);
    heroEntrance();
  }

  /* ---------- preloader: CSS handles the motion, JS the timing ---------- */
  var introTimer = null;

  function clearIntroTimer() { if (introTimer) { clearTimeout(introTimer); introTimer = null; } }

  function runPreloader() {
    intro.classList.add('is-live');

    /* small GSAP flourish on top of the CSS (optional) */
    if (hasGSAP()) {
      gsap.from('.pl-logo', { scale: .86, opacity: 0, duration: .6, ease: 'power3.out', delay: .04 });
    }

    /* progress bar is ~1.35s; hold a beat, then lift the curtain */
    introTimer = setTimeout(finishIntro, 1900);

    var skip = intro.querySelector('.intro-skip');
    if (skip) skip.addEventListener('click', function () { clearIntroTimer(); finishIntro(); });
    document.addEventListener('keydown', function onKey(e) {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        if (intro && intro.dataset.done !== '1') { clearIntroTimer(); finishIntro(); }
        document.removeEventListener('keydown', onKey);
      }
    });
  }

  function startIntro() {
    intro = document.getElementById('intro');
    if (!intro) { heroEntrance(); return; }

    var force = new URLSearchParams(location.search).get('intro') === '1';
    var seen = false;
    try { seen = sessionStorage.getItem('bsh_intro_seen') === '1'; } catch (e) {}
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduce || (seen && !force)) {
      intro.classList.add('is-done');
      document.body.classList.remove('intro-lock');
      setTimeout(function () { if (intro && intro.parentNode) intro.parentNode.removeChild(intro); }, 60);
      heroEntrance();
      return;
    }

    document.body.classList.add('intro-lock');
    runPreloader();
  }

  /* ---------------- hero + scroll entrance ---------------- */
  function heroEntrance() {
    if (!hasGSAP()) return;
    var tl = gsap.timeline({ delay: .12 });
    var targets = document.querySelectorAll('[data-hero]');
    if (targets.length) {
      tl.from(targets, {
        y: 34, opacity: 0, duration: .8, stagger: .09, ease: 'power3.out'
      });
    }
    var heroImg = document.querySelector('.hero-frame');
    if (heroImg) {
      tl.from(heroImg, { opacity: 0, scale: .94, duration: 1, ease: 'power3.out' }, .1);
    }
    var marquee = document.querySelector('.ticker');
    if (marquee) tl.from(marquee, { opacity: 0, y: 12, duration: .5 }, '-=.4');
    countUp();
  }

  function countUp() {
    document.querySelectorAll('[data-count]').forEach(function (node) {
      var target = parseFloat(node.dataset.count);
      if (isNaN(target)) return;
      var suffix = node.dataset.suffix || '';
      var dur = 1200, start = null;
      function step(ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / dur, 1);
        var val = Math.round(target * (1 - Math.pow(1 - p, 3)));
        node.textContent = val.toLocaleString('en-PK') + suffix;
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }

  /* ---------------- boot ---------------- */
  function boot() {
    /* Firebase layer ko jaldi init karo taake data ready rahe */
    if (window.BS && BS.fb) BS.fb.init();

    startIntro();

    /* header tick: pages that don't contain #intro should still animate hero */
    if (!document.getElementById('intro')) heroEntrance();

    /* demo-mode hint — sirf console mein, UI clean rehti hai */
    if (window.BS && BS.fb && BS.fb.mode === 'demo') {
      console.info('%c[BS Hardware] DEMO MODE', 'background:#a3130b;color:#fff;padding:2px 6px;border-radius:3px',
        'paste your Firebase config into js/firebase-config.js — data then runs through Firestore/Storage.');
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
