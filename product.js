/* ============================================================
   product.js — product detail page (gallery, qty, tabs, related)
   ============================================================ */
(function () {
  'use strict';

  var product = null;
  var maxQty = 1;
  var FALLBACK = 'assets/img/products/placeholder.svg';

  function setText(id, txt) {
    var n = document.getElementById(id);
    if (n) n.textContent = txt;
  }

  function show(id) { var n = document.getElementById(id); if (n) n.classList.remove('hidden'); }
  function hide(id) { var n = document.getElementById(id); if (n) n.classList.add('hidden'); }

  function renderGallery(p) {
    var imgs = [p.image || FALLBACK].concat(Array.isArray(p.images) ? p.images : []).filter(Boolean);
    var main = document.getElementById('pdpImage');
    var thumbs = document.getElementById('pdpThumbs');

    main.src = imgs[0];
    main.alt = p.name;
    main.onerror = function () { this.onerror = null; this.src = FALLBACK; };

    if (imgs.length > 1 && thumbs) {
      thumbs.innerHTML = imgs.map(function (src, i) {
        return '<button class="pdp-thumb ' + (i === 0 ? 'active' : '') + '" type="button" data-src="' +
          BS.esc(src) + '" aria-label="Image ' + (i + 1) + '"><img src="' + BS.esc(src) + '" alt=""></button>';
      }).join('');
      thumbs.querySelectorAll('.pdp-thumb').forEach(function (b) {
        b.addEventListener('click', function () {
          main.src = b.dataset.src;
          thumbs.querySelectorAll('.pdp-thumb').forEach(function (x) { x.classList.remove('active'); });
          b.classList.add('active');
        });
      });
    } else if (thumbs) {
      thumbs.innerHTML = '';
    }
  }

  function renderInfo(p) {
    var catName = (window.BS.data.categoryName || function () { return p.category; })(p.category);

    document.title = p.name + ' — BS Hardware And Sanitary';
    setText('crumbCat', catName);
    setText('pdpBreadcrumbTitle', p.name);
    setText('pdpCat', catName);
    setText('pdpName', p.name);
    setText('pdpPrice', BS.money(p.price));
    setText('pdpShort', p.shortDesc || '');
    setText('pdpBrand', (p.brand || '—') + (p.sku ? ' · ' + p.sku : ''));
    setText('pdpSku', p.sku ? 'SKU: ' + p.sku : '');
    setText('pdpDeliveryFee', (window.BS_SETTINGS || {}).deliveryFee || 250);

    var stockEl = document.getElementById('pdpStock');
    var s = Number(p.stock) || 0;
    if (stockEl) {
      stockEl.className = 'p-stock' + (s === 0 ? ' out' : (s <= 8 ? ' low' : ''));
      stockEl.textContent = s === 0 ? 'Out of stock' : (s <= 8 ? 'Only ' + s + ' left in stock' : 'In stock (' + s + ' available)');
    }

    var old = document.getElementById('pdpOld');
    var save = document.getElementById('pdpSave');
    if (Number(p.oldPrice) > Number(p.price)) {
      old.textContent = BS.money(p.oldPrice);
      var pct = Math.round((1 - p.price / p.oldPrice) * 100);
      save.textContent = 'Save ' + pct + '%';
      save.classList.remove('hidden');
    } else {
      old.textContent = '';
      save.classList.add('hidden');
    }

    setText('pdpDescText', p.description || p.shortDesc || 'This product has no description yet.');
    var hl = document.getElementById('pdpHighlights');
    if (hl) {
      var list = Array.isArray(p.highlights) ? p.highlights : [];
      hl.innerHTML = list.map(function (h) { return '<li>' + BS.esc(h) + '</li>'; }).join('');
      if (!list.length) hl.style.display = 'none';
    }

    var specs = document.getElementById('pdpSpecs');
    if (specs) {
      var rows = Array.isArray(p.specs) ? p.specs.slice() : [];
      if (!rows.length) {
        rows = [
          ['Brand', p.brand || '—'],
          ['SKU', p.sku || '—'],
          ['Category', catName],
          ['Unit', p.unit || 'piece'],
          ['Stock', s + ' available']
        ];
      }
      specs.innerHTML = rows.map(function (r) {
        return '<tr><th style="width:38%;background:var(--cream);color:var(--ink);border-bottom:1px solid rgba(13,13,13,.12)">' +
          BS.esc(r[0]) + '</th><td>' + BS.esc(r[1]) + '</td></tr>';
      }).join('');
    }

    /* qty limits */
    maxQty = s > 0 ? s : 0;
    var qty = document.getElementById('pdpQty');
    if (qty) { qty.value = maxQty > 0 ? 1 : 0; qty.max = maxQty || 1; qty.disabled = maxQty === 0; }

    var addBtn = document.getElementById('pdpAdd');
    var buyBtn = document.getElementById('pdpBuyNow');
    if (maxQty === 0) {
      addBtn.disabled = true; buyBtn.disabled = true;
      addBtn.innerHTML = 'Out of stock';
    }
  }

  function bindQty() {
    var input = document.getElementById('pdpQty');
    function clamp(v) {
      v = Math.round(Number(v) || 1);
      if (v < 1) v = 1;
      if (maxQty > 0 && v > maxQty) v = maxQty;
      input.value = v;
      return v;
    }
    document.getElementById('qtyMinus').addEventListener('click', function () { clamp(Number(input.value) - 1); });
    document.getElementById('qtyPlus').addEventListener('click', function () { clamp(Number(input.value) + 1); });
    input.addEventListener('change', function () { clamp(input.value); });
  }

  function addToCart(goCheckout) {
    if (!product) return;
    var qty = Number(document.getElementById('pdpQty').value) || 1;
    var res = BS.cart.add(product, qty);
    if (!res.ok) {
      BS.ui.toast(res.message, 'error');
      return;
    }
    if (goCheckout) {
      location.href = 'checkout.html';
      return;
    }
    BS.ui.toast(product.name + ' added to cart', 'success');
    var btn = document.getElementById('pdpAdd');
    var html = btn.innerHTML;
    btn.classList.add('added');
    btn.innerHTML = '✓ Added to cart';
    setTimeout(function () { btn.classList.remove('added'); btn.innerHTML = html; }, 1500);
  }

  function bindTabs() {
    document.querySelectorAll('.tabs-nav button').forEach(function (b) {
      b.addEventListener('click', function () {
        document.querySelectorAll('.tabs-nav button').forEach(function (x) { x.classList.remove('active'); });
        document.querySelectorAll('.tab-pane-bs').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        var pane = document.getElementById('tab-' + b.dataset.tab);
        if (pane) pane.classList.add('active');
      });
    });
  }

  function renderRelated(all) {
    var grid = document.getElementById('relatedGrid');
    if (!grid || !product) return;
    var picks = all.filter(function (p) {
      return p.id !== product.id && p.category === product.category;
    });
    if (picks.length < 4) {
      picks = picks.concat(all.filter(function (p) {
        return p.id !== product.id && p.category !== product.category && picks.indexOf(p) < 0;
      }));
    }
    picks = picks.slice(0, 4);
    if (!picks.length) {
      var sec = document.getElementById('relatedSection');
      if (sec) sec.classList.add('hidden');
      return;
    }
    grid.innerHTML = picks.map(BS.ui.cardHTML).join('');
    BS.ui.initReveal();
  }

  function boot() {
    var id = BS.qs('id');
    if (!id) {
      setText('pdpBreadcrumbTitle', 'Product');
      document.title = 'Product — BS Hardware And Sanitary';
      hide('pdpLoading'); show('pdpNotFound'); return;
    }

    Promise.all([BS.fb.getProduct(id), BS.fb.getProducts()]).then(function (res) {
      var p = res[0], all = res[1];
      hide('pdpLoading');

      if (!p) {
        setText('pdpBreadcrumbTitle', 'Product');
        document.title = 'Product not found — BS Hardware And Sanitary';
        show('pdpNotFound');
        return;
      }

      product = p;
      renderGallery(p);
      renderInfo(p);
      show('pdpWrap');
      show('pdpTabs');
      bindQty();
      bindTabs();

      document.getElementById('pdpAdd').addEventListener('click', function () { addToCart(false); });
      document.getElementById('pdpBuyNow').addEventListener('click', function () { addToCart(true); });

      renderRelated(all);
    }).catch(function (err) {
      console.error(err);
      hide('pdpLoading');
      show('pdpNotFound');
      BS.ui.toast('Product could not load.', 'error');
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
