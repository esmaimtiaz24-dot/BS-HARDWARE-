/* ============================================================
   home.js — home page rendering (categories + featured products)
   ============================================================ */
(function () {
  'use strict';

  var ICONS = {
    'tap-fittings': 'water',
    'sanitary': 'shower',
    'hand-tools': 'tools',
    'pipes': 'pipe',
    'paint': 'paint',
    'electrical': 'bolt',
    'door-hardware': 'lock',
    'safety': 'helmet'
  };

  var allProducts = [];

  function renderCategories(products) {
    var wrap = document.getElementById('catGrid');
    if (!wrap) return;
    var cats = (window.BS.data.categories || []);
    var counts = {};
    products.forEach(function (p) { counts[p.category] = (counts[p.category] || 0) + 1; });

    wrap.innerHTML = cats.map(function (c, idx) {
      var count = counts[c.id] || 0;
      return '' +
        '<a class="cat-card reveal ' + (idx === 0 ? 'cat-card--wide' : '') + '" href="shop.html?cat=' + c.id + '">' +
          '<div class="cat-arrow">' + bsIcon('arrowUpRight', 18) + '</div>' +
          '<span class="cat-icon">' + bsIcon(ICONS[c.id] || 'box', idx === 0 ? 40 : 30) + '</span>' +
          '<div class="cat-num mt-3">' + String(idx + 1).padStart(2, '0') + '</div>' +
          '<h3>' + BS.esc(c.name) + '</h3>' +
          '<p>' + BS.esc(c.short) + ' · ' + count + (count === 1 ? ' item' : ' items') + '</p>' +
        '</a>';
    }).join('');
  }

  function renderFeatured(products) {
    var wrap = document.getElementById('featuredGrid');
    if (!wrap) return;
    var picks = products.filter(function (p) { return p.featured; });
    if (!picks.length) picks = products.slice(0, 4);
    picks = picks.slice(0, 8);

    if (!picks.length) {
      wrap.innerHTML = '<div class="empty-state" style="grid-column:1/-1">' +
        '<h3 class="display-md">No products yet</h3>' +
        '<p>Add products from the admin panel and they appear here instantly.</p>' +
        '<a class="btn-bs" href="admin-login.html">Open Admin</a></div>';
      return;
    }
    wrap.innerHTML = picks.map(BS.ui.cardHTML).join('');
    BS.ui.initReveal();
  }

  function renderNewArrivals(products) {
    var wrap = document.getElementById('newGrid');
    if (!wrap) return;
    var latest = products.slice().sort(function (a, b) {
      return BS.fb.toMillis(b.createdAt) - BS.fb.toMillis(a.createdAt);
    }).slice(0, 4);
    wrap.innerHTML = latest.map(BS.ui.cardHTML).join('');
    BS.ui.initReveal();
  }

  function boot() {
    /* categories turant render (static data) */
    renderCategories((window.BS.data.products || []));

    BS.fb.getProducts().then(function (products) {
      allProducts = products;
      renderCategories(products);
      renderFeatured(products);
      renderNewArrivals(products);

      var stat = document.getElementById('statProducts');
      if (stat) stat.textContent = products.length + '+';
    }).catch(function (err) {
      console.error(err);
      BS.ui.toast('Products could not load: ' + (err.message || ''), 'error');
      renderFeatured([]);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
