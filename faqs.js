/* ============================================================
   faqs.js — FAQ accordion, search aur category filter
   ============================================================ */
(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    var root = document.getElementById('faqGroups');
    if (!root) return;

    var items = Array.prototype.slice.call(root.querySelectorAll('.faq-item'));
    var groups = Array.prototype.slice.call(root.querySelectorAll('.faq-group'));
    var chips = Array.prototype.slice.call(document.querySelectorAll('#faqChips .chip'));
    var search = document.getElementById('faqSearch');
    var empty = document.getElementById('faqEmpty');
    var expandBtn = document.getElementById('faqExpand');
    var collapseBtn = document.getElementById('faqCollapse');

    var state = { q: '', cat: 'all' };

    /* ---------- accordion (one open at a time) ---------- */
    function closeItem(item) {
      item.classList.remove('open');
      var btn = item.querySelector('.faq-q');
      if (btn) btn.setAttribute('aria-expanded', 'false');
    }

    function openItem(item) {
      item.classList.add('open');
      var btn = item.querySelector('.faq-q');
      if (btn) btn.setAttribute('aria-expanded', 'true');
    }

    root.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('.faq-q') : null;
      if (!btn || !root.contains(btn)) return;
      var item = btn.closest('.faq-item');
      var wasOpen = item.classList.contains('open');

      items.forEach(closeItem);
      if (!wasOpen) openItem(item);
    });

    /* ---------- filter + search ---------- */
    function apply() {
      var q = state.q.trim().toLowerCase();
      var visible = 0;

      items.forEach(function (item) {
        var catOk = state.cat === 'all' || item.getAttribute('data-cat') === state.cat;
        var textOk = !q || (item.textContent || '').toLowerCase().indexOf(q) > -1;
        var show = catOk && textOk;
        item.style.display = show ? '' : 'none';
        if (show) visible++;
        else closeItem(item);
      });

      groups.forEach(function (g) {
        var has = g.querySelectorAll('.faq-item:not([style*="display: none"])').length > 0;
        g.style.display = has ? '' : 'none';
      });

      if (empty) empty.classList.toggle('hidden', visible > 0);
    }

    if (search) {
      search.addEventListener('input', function () {
        state.q = search.value || '';
        apply();
      });
    }

    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        chips.forEach(function (c) { c.classList.remove('active'); });
        chip.classList.add('active');
        state.cat = chip.getAttribute('data-cat') || 'all';
        apply();
      });
    });

    if (expandBtn) {
      expandBtn.addEventListener('click', function () {
        items.forEach(function (item) {
          if (item.style.display !== 'none') item.classList.add('open');
        });
      });
    }

    if (collapseBtn) {
      collapseBtn.addEventListener('click', function () {
        items.forEach(closeItem);
      });
    }

    /* ---------- deep links: #faq-payments etc ---------- */
    function openHashGroup() {
      var id = (window.location.hash || '').replace('#', '');
      if (!id) return;
      var group = document.getElementById(id);
      if (!group) return;
      var first = group.querySelector('.faq-item');
      if (first) {
        items.forEach(closeItem);
        openItem(first);
      }
      setTimeout(function () {
        group.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
    }

    /* first item open by default so the page never looks flat */
    if (items.length) openItem(items[0]);
    openHashGroup();
    apply();
    window.addEventListener('hashchange', openHashGroup);
  });
})();
