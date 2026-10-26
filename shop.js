/* ============================================================
   shop.js — product listing: filters, search, sort, URL state
   URL params: ?cat=  &q=  &sort=  &badge=sale  &min=  &max=  &stock=1
   ============================================================ */
(function () {
  'use strict';

  var all = [];
  var state = {
    cat: 'all', q: '', sort: 'featured',
    min: null, max: null, inStock: false, sale: false
  };

  var CAT_ICONS = {
    'tap-fittings': 'water', 'sanitary': 'shower', 'hand-tools': 'tools', 'pipes': 'pipe',
    'paint': 'paint', 'electrical': 'bolt', 'door-hardware': 'lock', 'safety': 'helmet'
  };

  function readURL() {
    var p = new URLSearchParams(location.search);
    state.cat = p.get('cat') || 'all';
    state.q = (p.get('q') || '').trim();
    state.sort = p.get('sort') || 'featured';
    state.min = p.get('min') ? Number(p.get('min')) : null;
    state.max = p.get('max') ? Number(p.get('max')) : null;
    state.inStock = p.get('stock') === '1';
    state.sale = p.get('badge') === 'sale';
  }

  function writeURL() {
    var p = new URLSearchParams();
    if (state.cat !== 'all') p.set('cat', state.cat);
    if (state.q) p.set('q', state.q);
    if (state.sort !== 'featured') p.set('sort', state.sort);
    if (state.min != null) p.set('min', state.min);
    if (state.max != null) p.set('max', state.max);
    if (state.inStock) p.set('stock', '1');
    if (state.sale) p.set('badge', 'sale');
    var qs = p.toString();
    history.replaceState(null, '', qs ? '?' + qs : location.pathname);
  }

  function matches(p) {
    if (state.cat !== 'all' && p.category !== state.cat) return false;
    if (state.inStock && !(Number(p.stock) > 0)) return false;
    if (state.sale && !(Number(p.oldPrice) > Number(p.price) || p.badge === 'sale')) return false;

    var price = Number(p.price) || 0;
    if (state.min != null && !isNaN(state.min) && price < state.min) return false;
    if (state.max != null && !isNaN(state.max) && price > state.max) return false;

    if (state.q) {
      var hay = [p.name, p.brand, p.sku, p.shortDesc, p.description,
        (window.BS.data.categoryName || function () { return ''; })(p.category)]
        .join(' ').toLowerCase();
      if (hay.indexOf(state.q.toLowerCase()) < 0) return false;
    }
    return true;
  }

  function sortList(list) {
    var l = list.slice();
    switch (state.sort) {
      case 'price-low': l.sort(function (a, b) { return a.price - b.price; }); break;
      case 'price-high': l.sort(function (a, b) { return b.price - a.price; }); break;
      case 'name': l.sort(function (a, b) { return a.name.localeCompare(b.name); }); break;
      case 'new': l.sort(function (a, b) { return BS.fb.toMillis(b.createdAt) - BS.fb.toMillis(a.createdAt); }); break;
      default:
        l.sort(function (a, b) {
          var f = (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
          if (f !== 0) return f;
          return (Number(b.stock) > 0 ? 1 : 0) - (Number(a.stock) > 0 ? 1 : 0);
        });
    }
    return l;
  }

  function renderCats() {
    var wrap = document.getElementById('filterCats');
    if (!wrap) return;
    var counts = { all: all.length };
    all.forEach(function (p) { counts[p.category] = (counts[p.category] || 0) + 1; });

    var html = '<li><button class="filter-link ' + (state.cat === 'all' ? 'active' : '') +
      '" type="button" data-cat="all">All products <span>' + counts.all + '</span></button></li>';

    (window.BS.data.categories || []).forEach(function (c) {
      var n = counts[c.id] || 0;
      html += '<li><button class="filter-link ' + (state.cat === c.id ? 'active' : '') +
        '" type="button" data-cat="' + c.id + '">' + BS.esc(c.name) +
        ' <span>' + n + '</span></button></li>';
    });
    wrap.innerHTML = html;
  }

  function renderHead() {
    var title = 'All products';
    var sub = 'Hardware, sanitary, tools and electrical — all under one roof.';
    if (state.cat !== 'all') {
      var c = (window.BS.data.categories || []).filter(function (x) { return x.id === state.cat; })[0];
      if (c) {
        title = c.name;
        sub = c.short + ' — genuine stock, seedhi price.';
      }
    }
    if (state.q) {
      title = '“' + state.q + '”';
      sub = 'Search results for your query.';
    }
    document.title = title + ' — BS Hardware And Sanitary';
    var t = document.getElementById('shopTitle');
    var s = document.getElementById('shopSub');
    var crumb = document.getElementById('crumbCurrent');
    if (t) t.innerHTML = '<span>' + BS.esc(title) + '</span>';
    if (s) s.textContent = sub;
    if (crumb) crumb.textContent = state.cat !== 'all' ? title : 'Shop';
  }

  function syncControls() {
    var sortSel = document.getElementById('sortSelect');
    if (sortSel) sortSel.value = state.sort;

    var minI = document.getElementById('minPrice');
    var maxI = document.getElementById('maxPrice');
    if (minI) minI.value = state.min != null ? state.min : '';
    if (maxI) maxI.value = state.max != null ? state.max : '';

    var stockC = document.getElementById('inStockOnly');
    var saleC = document.getElementById('saleOnly');
    if (stockC) stockC.checked = state.inStock;
    if (saleC) saleC.checked = state.sale;

    document.querySelectorAll('#quickChips .chip').forEach(function (b) {
      var k = b.dataset.chip;
      var active = (k === 'all' && !state.sale && !state.inStock && state.sort === 'featured') ||
        (k === 'sale' && state.sale) ||
        (k === 'stock' && state.inStock) ||
        (k === 'new' && state.sort === 'new');
      b.classList.toggle('active', active);
    });

    document.querySelectorAll('#filterCats .filter-link').forEach(function (b) {
      b.classList.toggle('active', b.dataset.cat === state.cat);
    });
  }

  function render() {
    var grid = document.getElementById('shopGrid');
    var empty = document.getElementById('shopEmpty');
    var countEl = document.getElementById('resultCount');
    if (!grid) return;

    var list = sortList(all.filter(matches));

    grid.innerHTML = list.map(BS.ui.cardHTML).join('');
    if (empty) empty.classList.toggle('hidden', list.length > 0);
    grid.classList.toggle('hidden', list.length === 0);
    if (countEl) {
      countEl.textContent = list.length + (list.length === 1 ? ' product' : ' products') +
        (state.q ? ' for “' + state.q + '”' : '');
    }
    BS.ui.initReveal();
    renderHead();
    syncControls();
  }

  function bind() {
    document.addEventListener('click', function (e) {
      var catBtn = e.target.closest('[data-cat]');
      if (catBtn) {
        state.cat = catBtn.dataset.cat;
        writeURL(); renderCats(); render();
        return;
      }
      var chip = e.target.closest('[data-chip]');
      if (chip) {
        var k = chip.dataset.chip;
        if (k === 'all') { state.sale = false; state.inStock = false; state.sort = 'featured'; }
        if (k === 'sale') { state.sale = !state.sale; if (state.sale) state.inStock = false; }
        if (k === 'stock') { state.inStock = !state.inStock; if (state.inStock) state.sale = false; }
        if (k === 'new') { state.sort = state.sort === 'new' ? 'featured' : 'new'; }
        writeURL(); render();
        return;
      }
    });

    var sortSel = document.getElementById('sortSelect');
    if (sortSel) sortSel.addEventListener('change', function () {
      state.sort = this.value; writeURL(); render();
    });

    var applyBtn = document.getElementById('applyPrice');
    if (applyBtn) applyBtn.addEventListener('click', function () {
      var min = document.getElementById('minPrice').value;
      var max = document.getElementById('maxPrice').value;
      state.min = min !== '' ? Number(min) : null;
      state.max = max !== '' ? Number(max) : null;
      writeURL(); render();
    });

    ['minPrice', 'maxPrice'].forEach(function (id) {
      var elm = document.getElementById(id);
      if (elm) elm.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); var b = document.getElementById('applyPrice'); if (b) b.click(); }
      });
    });

    var stock = document.getElementById('inStockOnly');
    if (stock) stock.addEventListener('change', function () {
      state.inStock = this.checked; writeURL(); render();
    });
    var sale = document.getElementById('saleOnly');
    if (sale) sale.addEventListener('change', function () {
      state.sale = this.checked; writeURL(); render();
    });

    var reset = document.getElementById('resetFilters');
    if (reset) reset.addEventListener('click', function () {
      state = { cat: 'all', q: '', sort: 'featured', min: null, max: null, inStock: false, sale: false };
      history.replaceState(null, '', location.pathname);
      renderCats(); render();
    });

    var ft = document.getElementById('filterToggle');
    if (ft) ft.addEventListener('click', function () {
      document.getElementById('filters').classList.toggle('show-mobile');
    });
  }

  function boot() {
    readURL();
    bind();
    BS.fb.getProducts().then(function (products) {
      all = products;
      renderCats();
      render();
    }).catch(function (err) {
      console.error(err);
      document.getElementById('resultCount').textContent = 'Products could not load';
      BS.ui.toast('Products could not load. Please refresh the page.', 'error');
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
