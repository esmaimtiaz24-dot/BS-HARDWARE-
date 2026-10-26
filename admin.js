/* ============================================================
   admin.js — dashboard, inventory CRUD, orders + payment proof
   ============================================================ */
(function () {
  'use strict';

  var products = [];
  var orders = [];
  var expenses = [];
  var expenseModal = null;
  var rep = { range: '7', from: null, to: null };
  var productModal, orderModal, proofModal;
  var currentOrder = null;
  var currentProductId = null;
  var pendingImage = null;
  var started = false;
  var FALLBACK = 'assets/img/products/placeholder.svg';

  function $id(id) { return document.getElementById(id); }

  /* ---------------- shell ---------------- */
  function boot() {
    BS.fb.init();

    var chip = $id('modeChip');
    var liveNow = BS.fb.mode === 'firebase' || BS.fb.mode === 'rtdb' || BS.fb.mode === 'supabase';
    if (liveNow) document.body.classList.add('is-live');
    if (chip) {
      var live = BS.fb.mode === 'firebase' || BS.fb.mode === 'rtdb' || BS.fb.mode === 'supabase';
      chip.textContent = live ? (BS.fb.backend + ' live') : '';
      chip.style.borderColor = live ? 'var(--green)' : 'var(--amber)';
      chip.style.color = live ? 'var(--green)' : 'var(--amber)';
    }

    /* Firebase fires an initial (null) auth event while it restores the saved
       session, so a redirect on that first tick would bounce a signed-in admin
       straight back to the login page. Wait a moment before giving up. */
    var authFallback = setTimeout(function () {
      if (!started) window.location.replace('admin-login.html');
    }, 2500);

    BS.fb.onAuthChange(function (user) {
      if (!user) return;                 /* wait for the restored session */
      if (started) return;
      started = true;
      clearTimeout(authFallback);
      init(user);
    });
  }

  function init(user) {
    var u = $id('adminUser');
    if (u) u.textContent = user.email || 'admin';

    productModal = new bootstrap.Modal($id('productModal'));
    orderModal = new bootstrap.Modal($id('orderModal'));
    proofModal = new bootstrap.Modal($id('proofModal'));
    expenseModal = new bootstrap.Modal($id('expenseModal'));

    fillCategorySelects();
    bindUI();
    refreshAll();
  }

  function fillCategorySelects() {
    var cats = (window.BS.data && BS.data.categories) || [];
    var pf = $id('pfCategory');
    if (pf) pf.innerHTML = cats.map(function (c) {
      return '<option value="' + c.id + '">' + BS.esc(c.name) + '</option>';
    }).join('');

    var filter = $id('productCatFilter');
    if (filter) {
      filter.innerHTML = '<option value="all">All categories</option>' + cats.map(function (c) {
        return '<option value="' + c.id + '">' + BS.esc(c.name) + '</option>';
      }).join('');
    }
  }

  /* ---------------- data ---------------- */
  function refreshAll() {
    Promise.all([BS.fb.getProducts(), BS.fb.getOrders(), BS.fb.getExpenses()]).then(function (res) {
      products = res[0];
      orders = res[1];
      expenses = res[2] || [];
      renderDashboard();
      renderProducts();
      renderOrders();
      renderReports();
      renderExpenses();
    }).catch(function (err) {
      console.error(err);
      BS.ui.toast('Data could not load: ' + (err.message || ''), 'error');
    });
  }

  function refreshOrders() {
    BS.fb.getOrders().then(function (list) {
      orders = list;
      renderDashboard();
      renderOrders();
      BS.ui.toast('Orders refreshed.', 'success');
    });
  }

  /* ---------------- dashboard ---------------- */

  /* ============================================================
     ANALYTICS ENGINE
     ============================================================ */
  function productMap() {
    var m = {};
    products.forEach(function (p) { m[p.id] = p; });
    return m;
  }

  function itemCost(it, map) {
    if (it.cost != null && !isNaN(Number(it.cost))) return Number(it.cost);
    var p = map[it.id];
    if (p && p.costPrice != null) return Number(p.costPrice);
    return Math.round(Number(it.price) * 0.65);   /* estimate agar cost missing */
  }

  function orderDate(o) {
    return BS.fb.toMillis(o.createdAt);
  }

  function inRange(ms, from, to) {
    if (!ms) return false;
    return ms >= from && ms <= to;
  }

  function rangeBounds() {
    var now = new Date();
    var end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
    var start;
    switch (rep.range) {
      case 'today': start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime(); break;
      case '7': start = end - 6 * 864e5; start = new Date(start); start.setHours(0, 0, 0, 0); break;
      case '30': start = end - 29 * 864e5; start = new Date(start); start.setHours(0, 0, 0, 0); break;
      case 'month': start = new Date(now.getFullYear(), now.getMonth(), 1).getTime(); break;
      case 'custom':
        start = rep.from ? new Date(rep.from + 'T00:00:00').getTime() : 0;
        end = rep.to ? new Date(rep.to + 'T23:59:59').getTime() : end;
        break;
      default: start = 0;
    }
    return { from: typeof start === 'number' ? start : start.getTime(), to: end };
  }

  function rangeLabelText(b) {
    if (!b.from) return 'All time';
    var f = new Date(b.from).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    var t = new Date(b.to).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    return f + ' → ' + t;
  }

  /**
   * compute(bounds) -> poora P&L + sales + breakdown
   */
  function compute(bounds) {
    var map = productMap();
    var from = bounds.from, to = bounds.to;

    var stats = {
      orders: 0, pending: 0, cancelled: 0, units: 0,
      grossSales: 0, discounts: 0, netSales: 0, deliveryCollected: 0,
      cogs: 0, grossProfit: 0, expenses: 0, expenseBreakdown: {},
      netProfit: 0, ordersList: [], byPayment: {}, byCategory: {}, byProduct: {}
    };

    orders.forEach(function (o) {
      if (!inRange(orderDate(o), from, to)) return;
      if (o.status === 'cancelled') { stats.cancelled++; return; }

      stats.orders++;
      if (o.status === 'pending') stats.pending++;
      stats.ordersList.push(o);

      var subtotal = Number(o.subtotal) || 0;
      var disc = Number(o.discount) || 0;
      var del = Number(o.delivery) || 0;
      stats.grossSales += subtotal;
      stats.discounts += disc;
      stats.netSales += (subtotal - disc);
      stats.deliveryCollected += del;

      var cogs = 0;
      (o.items || []).forEach(function (it) {
        var qty = Number(it.qty) || 0;
        var line = Number(it.line) || (Number(it.price) || 0) * qty;
        var cost = itemCost(it, map) * qty;
        cogs += cost;
        stats.units += qty;

        var pid = it.id || it.name;
        if (!stats.byProduct[pid]) {
          stats.byProduct[pid] = { name: it.name, qty: 0, sales: 0, cost: 0, profit: 0 };
        }
        stats.byProduct[pid].qty += qty;
        stats.byProduct[pid].sales += line;
        stats.byProduct[pid].cost += cost;
        stats.byProduct[pid].profit += (line - cost);

        var cat = it.category || (map[it.id] && map[it.id].category) || 'other';
        if (!stats.byCategory[cat]) stats.byCategory[cat] = { sales: 0, qty: 0 };
        stats.byCategory[cat].sales += line;
        stats.byCategory[cat].qty += qty;
      });

      if (o.cogs != null && !isNaN(Number(o.cogs))) cogs = Number(o.cogs);
      stats.cogs += cogs;

      var pm = (o.payment || {}).method || 'Unknown';
      if (!stats.byPayment[pm]) stats.byPayment[pm] = { count: 0, amount: 0 };
      stats.byPayment[pm].count++;
      stats.byPayment[pm].amount += Number(o.total) || 0;

      o.__cogs = cogs;
      o.__profit = (subtotal - disc) - cogs;
    });

    expenses.forEach(function (e) {
      var ms = new Date(e.date || e.createdAt).getTime();
      if (!inRange(ms, from, to)) return;
      var amt = Number(e.amount) || 0;
      stats.expenses += amt;
      var cat = e.category || 'Other';
      stats.expenseBreakdown[cat] = (stats.expenseBreakdown[cat] || 0) + amt;
    });

    stats.grossProfit = stats.netSales - stats.cogs;
    stats.netProfit = stats.grossProfit + stats.deliveryCollected - stats.expenses;
    stats.aov = stats.orders ? stats.netSales / stats.orders : 0;
    stats.grossMargin = stats.netSales ? (stats.grossProfit / stats.netSales) * 100 : 0;
    stats.netMargin = stats.netSales ? (stats.netProfit / stats.netSales) * 100 : 0;
    return stats;
  }

  function inventoryStats() {
    var units = 0, costValue = 0, retailValue = 0, low = 0, out = 0, potential = 0;
    products.forEach(function (p) {
      var st = Number(p.stock) || 0;
      var cost = Number(p.costPrice) || 0;
      var price = Number(p.price) || 0;
      units += st;
      costValue += cost * st;
      retailValue += price * st;
      potential += (price - cost) * st;
      if (st === 0) out++;
      else if (st <= 8) low++;
    });
    return { units: units, cost: costValue, retail: retailValue, potential: potential, low: low, out: out };
  }

  function pct(n) {
    return (isFinite(n) ? n.toFixed(1) : '0.0') + '%';
  }

  function renderDashboard() {
    var b30 = { from: Date.now() - 29 * 864e5, to: Date.now() + 864e5 };
    var st = compute(b30);
    var inv = inventoryStats();
    var pending = orders.filter(function (o) { return o.status === 'pending'; });
    var low = products.filter(function (p) { return Number(p.stock) <= 8; });

    var set = function (id, val) { var n = $id(id); if (n) n.textContent = val; };
    set('statRevenue', BS.money(st.netSales));
    set('statRevenueSub', st.orders + ' orders · 30 days');
    set('statGrossProfit', BS.money(st.grossProfit));
    set('statGrossMargin', 'Margin ' + pct(st.grossMargin));
    set('statNetProfit', BS.money(st.netProfit));
    set('statNetMargin', 'Margin ' + pct(st.netMargin));
    set('statStockValue', BS.money(inv.cost));
    set('statStockRetail', 'Retail ' + BS.money(inv.retail));
    set('statOrders', orders.length);
    set('statPending', pending.length);
    set('statAOV', BS.money(st.aov));
    set('statUnits', st.units);
    set('statLowStock', inv.low + ' low' + (inv.out ? ', ' + inv.out + ' out' : ''));
    set('modeText', BS.fb.backend + ' (live)');
    set('feeText', BS.money((window.BS_SETTINGS || {}).deliveryFee || 250));

    var badge = $id('pendingBadge');
    if (badge) {
      badge.style.display = pending.length ? 'inline-block' : 'none';
      badge.textContent = pending.length;
    }

    /* recent orders */
    var recent = orders.slice(0, 6);
    var body = $id('recentOrdersBody');
    if (body) {
      body.innerHTML = recent.length ? recent.map(function (o) {
        var c = compute({ from: orderDate(o), to: orderDate(o) + 1 });
        return '<tr>' +
          '<td><strong>' + BS.esc(o.orderNumber || '—') + '</strong></td>' +
          '<td>' + BS.esc((o.customer || {}).name || '—') + '</td>' +
          '<td>' + BS.money(o.total) + '</td>' +
          '<td>' + BS.orderView.pill(o.status) + '</td>' +
          '</tr>';
      }).join('') : '<tr><td colspan="4">No orders yet.</td></tr>';
    }

    /* low stock */
    var lowBody = $id('lowStockBody');
    var lowCount = $id('lowStockCount');
    if (lowCount) lowCount.textContent = low.length;
    if (lowBody) {
      lowBody.innerHTML = low.length ? low.slice(0, 6).map(function (p) {
        var cls = Number(p.stock) === 0 ? 'out' : 'low';
        return '<tr>' +
          '<td><div style="font-weight:700;font-size:.8rem">' + BS.esc(p.name) + '</div>' +
            '<div class="cart-sku">' + BS.esc(p.sku || '') + '</div></td>' +
          '<td><span class="stock-pill ' + cls + '">' + (Number(p.stock) || 0) + '</span></td>' +
          '<td><button class="tbl-btn" data-edit="' + BS.esc(p.id) + '" title="Edit">' + bsIcon('edit', 14) + '</button></td>' +
          '</tr>';
      }).join('') : '<tr><td colspan="3">All stock levels are healthy. 👍</td></tr>';
    }

    renderChart(14);
  }

  /* ---------- daily series (sales + profit) ---------- */
  function dailySeries(days) {
    var map = productMap();
    var series = [];
    for (var i = days - 1; i >= 0; i--) {
      var d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      series.push({
        date: d, label: d.toLocaleDateString('en-GB', { weekday: 'short' }),
        full: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
        sales: 0, profit: 0, orders: 0
      });
    }
    orders.forEach(function (o) {
      if (o.status === 'cancelled') return;
      var ms = orderDate(o);
      if (!ms) return;
      var od = new Date(ms); od.setHours(0, 0, 0, 0);
      series.forEach(function (day) {
        if (day.date.getTime() !== od.getTime()) return;
        var subtotal = Number(o.subtotal) || 0;
        var disc = Number(o.discount) || 0;
        var cogs = Number(o.cogs);
        if (isNaN(cogs)) {
          cogs = 0;
          (o.items || []).forEach(function (it) {
            cogs += itemCost(it, map) * (Number(it.qty) || 0);
          });
        }
        day.sales += subtotal - disc;
        day.profit += (subtotal - disc) - cogs;
        day.orders++;
      });
    });
    return series;
  }

  function renderChart(days) {
    var bars = $id('chartBars');
    var legend = $id('chartLegend');
    if (!bars) return;

    var series = dailySeries(days || 14);
    var max = Math.max.apply(null, series.map(function (d) { return Math.max(d.sales, d.profit); }).concat([1]));

    bars.innerHTML = series.map(function (d) {
      var hs = Math.max(2, Math.round((d.sales / max) * 100));
      var hp = Math.max(1, Math.round((d.profit / max) * 100));
      return '<span class="bar-pair" title="' + d.full + ' — Sales ' + BS.money(d.sales) +
        ', Profit ' + BS.money(d.profit) + ', ' + d.orders + ' orders">' +
        '<i class="bar-sales" style="height:' + hs + '%"></i>' +
        '<i class="bar-profit" style="height:' + hp + '%"></i></span>';
    }).join('');

    if (legend) legend.innerHTML = series.map(function (d) {
      return '<span>' + d.label + '</span>';
    }).join('');
  }

  /* ---------------- products ---------------- */
  function filteredProducts() {
    var q = ($id('productSearch') || {}).value || '';
    var cat = ($id('productCatFilter') || {}).value || 'all';
    q = q.trim().toLowerCase();

    return products.filter(function (p) {
      if (cat !== 'all' && p.category !== cat) return false;
      if (!q) return true;
      return [p.name, p.sku, p.brand].join(' ').toLowerCase().indexOf(q) >= 0;
    });
  }

  function renderProducts() {
    var body = $id('productRows');
    var count = $id('productCount');
    if (!body) return;

    var list = filteredProducts();
    if (count) count.textContent = '(' + products.length + ')';

    if (!list.length) {
      body.innerHTML = '<tr><td colspan="9">No products matched. Use “Add product” to create one.</td></tr>';
      return;
    }

    body.innerHTML = list.map(function (p) {
      var s2 = Number(p.stock) || 0;
      var cls = s2 === 0 ? 'out' : (s2 <= 8 ? 'low' : 'ok');
      var label = s2 === 0 ? 'Out of stock' : (s2 <= 8 ? 'Low stock' : 'In stock');
      var cost = Number(p.costPrice) || 0;
      var price = Number(p.price) || 0;
      var margin = price > 0 ? ((price - cost) / price * 100) : 0;
      var stockValue = cost * s2;

      return '<tr data-pid="' + BS.esc(p.id) + '">' +
        '<td><img class="thumb" src="' + BS.esc(p.image || FALLBACK) + '" alt="" ' +
          'onerror="this.onerror=null;this.src=\'' + FALLBACK + '\'"></td>' +
        '<td><div style="font-weight:700;max-width:230px">' + BS.esc(p.name) + '</div>' +
          '<div class="cart-sku">' + BS.esc(p.sku || '—') + (p.featured ? ' · ⭐ featured' : '') + '</div></td>' +
        '<td>' + BS.esc(BS.data.categoryName(p.category)) + '</td>' +
        '<td><strong>' + BS.money(p.price) + '</strong>' +
          (Number(p.oldPrice) > Number(p.price) ? '<div class="cart-sku" style="text-decoration:line-through">' + BS.money(p.oldPrice) + '</div>' : '') + '</td>' +
        '<td><div class="cart-sku">Cost ' + (cost ? BS.money(cost) : '<span style="color:#a1140c">not set</span>') + '</div>' +
          '<span class="stock-pill ' + (margin >= 30 ? 'ok' : (margin >= 15 ? 'low' : 'out')) + '">' + pct(margin) + ' margin</span></td>' +
        '<td><div class="d-flex gap-1 align-items-center">' +
          '<input class="input-bs" type="number" min="0" step="1" value="' + s2 + '" data-stock-input ' +
            'style="width:76px;padding:6px 8px;font-size:.8rem" aria-label="Stock quantity">' +
          '<button class="tbl-btn" type="button" data-stock-save title="Update stock">' + bsIcon('check', 14) + '</button>' +
          '</div></td>' +
        '<td><strong style="font-size:.8rem">' + BS.money(stockValue) + '</strong>' +
          '<div class="cart-sku">retail ' + BS.money(price * s2) + '</div></td>' +
        '<td><span class="stock-pill ' + cls + '">' + label + '</span></td>' +
        '<td><div class="actions">' +
          '<button class="tbl-btn" type="button" data-edit="' + BS.esc(p.id) + '" title="Edit product">' + bsIcon('edit', 14) + '</button>' +
          '<button class="tbl-btn danger" type="button" data-del="' + BS.esc(p.id) + '" title="Delete product">' + bsIcon('trash', 14) + '</button>' +
          '<a class="tbl-btn" href="product.html?id=' + encodeURIComponent(p.id) + '" target="_blank" rel="noopener" title="View product">' + bsIcon('eye', 14) + '</a>' +
          '</div></td>' +
        '</tr>';
    }).join('');
  }

  /* ---------------- product modal ---------------- */
  function openProductModal(id) {
    var p = id ? products.filter(function (x) { return x.id === id; })[0] : null;
    currentProductId = p ? p.id : null;
    pendingImage = null;

    $id('productModalTitle').textContent = p ? 'Edit product' : 'Add product';
    $id('pfId').value = p ? p.id : '';
    $id('pfName').value = p ? p.name : '';
    $id('pfCategory').value = p ? p.category : ((BS.data.categories[0] || {}).id || '');
    $id('pfPrice').value = p ? p.price : '';
    $id('pfCostPrice').value = p && p.costPrice != null ? p.costPrice : '';
    $id('pfOldPrice').value = p && p.oldPrice ? p.oldPrice : '';
    $id('pfStock').value = p ? p.stock : 0;
    $id('pfUnit').value = p ? (p.unit || 'piece') : 'piece';
    $id('pfBrand').value = p ? (p.brand || '') : '';
    $id('pfSku').value = p ? (p.sku || '') : '';
    $id('pfBadge').value = p ? (p.badge || '') : '';
    $id('pfFeatured').checked = !!(p && p.featured);
    $id('pfShort').value = p ? (p.shortDesc || '') : '';
    $id('pfDesc').value = p ? (p.description || '') : '';
    $id('pfHighlights').value = p && Array.isArray(p.highlights) ? p.highlights.join('\n') : '';
    $id('pfSpecs').value = p && Array.isArray(p.specs) ? p.specs.map(function (r) { return r[0] + ': ' + r[1]; }).join('\n') : '';
    $id('pfImageUrl').value = p ? (p.image || '') : '';
    $id('pfImage').value = '';
    $id('pfImagePreview').src = p && p.image ? p.image : FALLBACK;
    $id('pfProgressWrap').classList.add('hidden');
    $id('pfProgress').style.width = '0%';
    $id('pfErr').classList.remove('show');
    updateMarginHint();

    productModal.show();
  }

  function updateMarginHint() {
    var price = Number($id('pfPrice').value) || 0;
    var cost = Number($id('pfCostPrice').value) || 0;
    var hint = $id('pfMarginHint');
    if (!hint) return;
    if (!price) { hint.textContent = 'Profit margin —'; return; }
    var profit = price - cost;
    var margin = price ? (profit / price * 100) : 0;
    hint.innerHTML = 'Profit <strong>' + BS.money(profit) + '</strong> · margin <strong>' +
      pct(margin) + '</strong>';
    hint.style.color = profit < 0 ? 'var(--red)' : 'var(--green)';
  }

  function parseLines(text) {
    return String(text || '').split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
  }

  function parseSpecs(text) {
    return parseLines(text).map(function (line) {
      var i = line.indexOf(':');
      if (i < 0) return [line, ''];
      return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
    });
  }

  function saveProduct() {
    var name = $id('pfName').value.trim();
    var price = Number($id('pfPrice').value);
    var stock = Number($id('pfStock').value);
    var err = $id('pfErr');

    if (name.length < 3 || !(price >= 0) || isNaN(price) || isNaN(stock) || stock < 0) {
      err.textContent = 'Fill in name, category, price and stock correctly.';
      err.classList.add('show');
      return;
    }
    err.classList.remove('show');

    var data = {
      name: name,
      category: $id('pfCategory').value,
      price: price,
      costPrice: Number($id('pfCostPrice').value) || 0,
      oldPrice: Number($id('pfOldPrice').value) || 0,
      stock: stock,
      unit: $id('pfUnit').value.trim() || 'piece',
      brand: $id('pfBrand').value.trim(),
      sku: $id('pfSku').value.trim(),
      badge: $id('pfBadge').value,
      featured: $id('pfFeatured').checked,
      shortDesc: $id('pfShort').value.trim(),
      description: $id('pfDesc').value.trim(),
      highlights: parseLines($id('pfHighlights').value),
      specs: parseSpecs($id('pfSpecs').value),
      image: $id('pfImageUrl').value || FALLBACK
    };

    var btn = $id('saveProductBtn');
    btn.disabled = true;
    var old = btn.innerHTML;
    btn.innerHTML = 'Saving…';

    var chain = Promise.resolve(data.image);

    if (pendingImage) {
      btn.innerHTML = 'Uploading image…';
      $id('pfProgressWrap').classList.remove('hidden');
      chain = BS.fb.uploadFile(pendingImage, 'products', function (pct) {
        var bar = $id('pfProgress');
        if (bar) bar.style.width = pct + '%';
      });
    }

    chain.then(function (url) {
      data.image = url || data.image;
      return BS.fb.saveProduct(data, currentProductId);
    }).then(function () {
      BS.ui.toast(currentProductId ? 'Product updated.' : 'New product added.', 'success');
      productModal.hide();
      refreshAll();
    }).catch(function (e) {
      console.error(e);
      BS.ui.toast('Could not save: ' + (e.message || e.code || 'error'), 'error');
    }).finally(function () {
      btn.disabled = false;
      btn.innerHTML = old;
    });
  }

  /* ---------------- orders ---------------- */
  function filteredOrders() {
    var q = (($id('orderSearch') || {}).value || '').trim().toLowerCase();
    var st = ($id('orderStatusFilter') || {}).value || 'all';

    return orders.filter(function (o) {
      if (st !== 'all' && o.status !== st) return false;
      if (!q) return true;
      var c = o.customer || {};
      return [o.orderNumber, c.name, c.phone, (o.payment || {}).transactionId]
        .join(' ').toLowerCase().indexOf(q) >= 0;
    });
  }

  function renderOrders() {
    var body = $id('orderRows');
    var count = $id('orderCount');
    if (!body) return;

    var list = filteredOrders();
    if (count) count.textContent = '(' + orders.length + ')';

    if (!list.length) {
      body.innerHTML = '<tr><td colspan="11">No orders matched.</td></tr>';
      return;
    }

    body.innerHTML = list.map(function (o) {
      var c = o.customer || {};
      var pay = o.payment || {};
      var map = productMap();
      var cogs = Number(o.cogs);
      if (isNaN(cogs)) {
        cogs = 0;
        (o.items || []).forEach(function (it) { cogs += itemCost(it, map) * (Number(it.qty) || 0); });
      }
      var profit = (Number(o.subtotal) || 0) - (Number(o.discount) || 0) - cogs;
      var proof = pay.screenshotUrl
        ? '<button class="tbl-btn" type="button" data-proof="' + BS.esc(pay.screenshotUrl) + '" title="View payment screenshot">' +
          '<img src="' + BS.esc(pay.screenshotUrl) + '" alt="" style="width:26px;height:26px;object-fit:cover"></button>'
        : '<span class="proof-empty">—</span>';

      return '<tr data-oid="' + BS.esc(o.id) + '">' +
        '<td><strong>' + BS.esc(o.orderNumber || '—') + '</strong></td>' +
        '<td style="white-space:nowrap">' + BS.fmtDate(o.createdAt, true) + '</td>' +
        '<td><div style="font-weight:600">' + BS.esc(c.name || '—') + '</div>' +
          '<div class="cart-sku">' + BS.esc(c.phone || '') + '</div></td>' +
        '<td>' + (o.itemCount || (o.items || []).length) + '</td>' +
        '<td><strong>' + BS.money(o.total) + '</strong></td>' +
        '<td><strong style="font-size:.78rem;color:' + (profit >= 0 ? '#116b3a' : '#a1140c') + '">' +
          (profit >= 0 ? '+' : '−') + BS.money(Math.abs(profit)) + '</strong></td>' +
        '<td><div style="font-weight:700;font-size:.76rem">' + BS.esc(pay.method || '—') + '</div>' +
          '<div class="cart-sku">' + BS.esc(pay.status || '') + '</div></td>' +
        '<td><span style="font-family:monospace;font-size:.76rem">' + BS.esc(pay.transactionId || '—') + '</span></td>' +
        '<td>' + proof + '</td>' +
        '<td><select class="status-select ' + BS.esc(o.status) + '" data-status-select aria-label="Order status">' +
          ['pending', 'confirmed', 'delivered', 'cancelled'].map(function (s) {
            return '<option value="' + s + '"' + (o.status === s ? ' selected' : '') + '>' +
              s.charAt(0).toUpperCase() + s.slice(1) + '</option>';
          }).join('') + '</select></td>' +
        '<td><button class="tbl-btn link" type="button" data-view-order="' + BS.esc(o.id) + '">View</button></td>' +
        '</tr>';
    }).join('');
  }

  function openOrderModal(id) {
    var o = orders.filter(function (x) { return x.id === id; })[0];
    if (!o) return;
    currentOrder = o;
    $id('orderModalTitle').textContent = 'Order ' + (o.orderNumber || '');
    BS.orderView.render(o, 'orderModalBody');
    $id('modalStatus').value = o.status || 'pending';
    $id('modalStatus').className = 'status-select ' + (o.status || 'pending');
    orderModal.show();
  }

  function changeStatus(id, status) {
    if (!id || !status) return;
    BS.fb.updateOrderStatus(id, status).then(function () {
      BS.ui.toast('Order status update: ' + status, 'success');
      return BS.fb.getOrders();
    }).then(function (list) {
      orders = list;
      renderDashboard();
      renderOrders();
      if (currentOrder && currentOrder.id === id) {
        currentOrder = orders.filter(function (x) { return x.id === id; })[0] || currentOrder;
      }
    }).catch(function (e) {
      console.error(e);
      BS.ui.toast('Status could not be updated: ' + (e.message || ''), 'error');
    });
  }

  /* ============================================================
     REPORTS & P&L
     ============================================================ */
  function renderReports() {
    var bounds = rangeBounds();
    var st = compute(bounds);
    var inv = inventoryStats();
    var label = rangeLabelText(bounds);

    var set = function (id, val) { var n = $id(id); if (n) n.textContent = val; };
    set('rangeLabel', label);
    set('pnlPeriod', label);
    set('rpSales', BS.money(st.netSales));
    set('rpSalesSub', st.orders + ' orders · ' + st.units + ' units');
    set('rpCogs', BS.money(st.cogs));
    set('rpCogsSub', 'COGS');
    set('rpGross', BS.money(st.grossProfit));
    set('rpGrossSub', 'Margin ' + pct(st.grossMargin));
    set('rpNet', BS.money(st.netProfit));
    set('rpNetSub', 'Margin ' + pct(st.netMargin));

    /* ---------- P&L statement ---------- */
    var pnl = $id('pnlBody');
    if (pnl) {
      var rows = [
        { label: 'Sales revenue (gross)', value: st.grossSales, cls: '' },
        { label: 'Less: discounts', value: -st.discounts, cls: 'neg' },
        { label: 'Net sales', value: st.netSales, cls: 'sub' },
        { label: 'Cost of goods sold (COGS)', value: -st.cogs, cls: 'neg' },
        { label: 'Gross profit', value: st.grossProfit, cls: 'total', margin: st.grossMargin },
        { label: 'Add: delivery charges collected', value: st.deliveryCollected, cls: '' },
        { label: 'Less: expenses', value: -st.expenses, cls: 'neg' }
      ];
      Object.keys(st.expenseBreakdown).forEach(function (cat) {
        rows.push({ label: '   · ' + cat, value: -st.expenseBreakdown[cat], cls: 'muted' });
      });
      rows.push({ label: 'Net profit / (loss)', value: st.netProfit, cls: 'grand', margin: st.netMargin });

      pnl.innerHTML = rows.map(function (r) {
        var neg = r.value < 0;
        var val = neg ? '− ' + BS.money(Math.abs(r.value)) : BS.money(r.value);
        return '<tr class="pnl-row ' + (r.cls || '') + '">' +
          '<td>' + BS.esc(r.label) +
            (r.margin != null ? ' <span class="pnl-margin">' + pct(r.margin) + '</span>' : '') + '</td>' +
          '<td style="text-align:right;color:' + (neg ? '#a1140c' : 'inherit') + '"><strong>' + val + '</strong></td>' +
          '</tr>';
      }).join('');
    }

    /* ---------- chart (range ke hisaab se din) ---------- */
    var days = 7;
    if (rep.range === '30') days = 30;
    else if (rep.range === 'month') days = Math.min(31, new Date().getDate());
    else if (rep.range === 'all') days = 14;
    else if (rep.range === 'today') days = 1;
    else if (rep.range === 'custom') {
      var d0 = new Date(bounds.from), d1 = new Date(bounds.to);
      days = Math.max(1, Math.min(31, Math.ceil((d1 - d0) / 864e5) + 1));
    }
    var bars = $id('reportChart');
    var legend = $id('reportChartLegend');
    if (bars) {
      var series = dailySeries(days);
      var max = Math.max.apply(null, series.map(function (d) { return Math.max(d.sales, d.profit); }).concat([1]));
      bars.innerHTML = series.map(function (d) {
        return '<span class="bar-pair" title="' + d.full + ' — Sales ' + BS.money(d.sales) +
          ', Profit ' + BS.money(d.profit) + '">' +
          '<i class="bar-sales" style="height:' + Math.max(2, Math.round(d.sales / max * 100)) + '%"></i>' +
          '<i class="bar-profit" style="height:' + Math.max(1, Math.round(d.profit / max * 100)) + '%"></i></span>';
      }).join('');
      if (legend) legend.innerHTML = series.map(function (d, i) {
        return (days <= 14 || i % Math.ceil(days / 10) === 0) ? '<span>' + d.label + '</span>' : '<span></span>';
      }).join('');
    }

    /* ---------- top products ---------- */
    var topBody = $id('topProductsBody');
    if (topBody) {
      var byProd = Object.keys(st.byProduct).map(function (k) { return st.byProduct[k]; })
        .sort(function (a, b) { return b.sales - a.sales; }).slice(0, 8);
      topBody.innerHTML = byProd.length ? byProd.map(function (p) {
        var margin = p.sales ? (p.profit / p.sales * 100) : 0;
        return '<tr><td><div style="font-weight:700;font-size:.8rem">' + BS.esc(p.name) + '</div></td>' +
          '<td>' + p.qty + '</td><td><strong>' + BS.money(p.sales) + '</strong></td>' +
          '<td class="cart-sku">' + BS.money(p.cost) + '</td>' +
          '<td><strong style="color:' + (p.profit >= 0 ? '#116b3a' : '#a1140c') + '">' + BS.money(p.profit) + '</strong></td>' +
          '<td><span class="stock-pill ' + (margin >= 30 ? 'ok' : (margin >= 15 ? 'low' : 'out')) + '">' + pct(margin) + '</span></td></tr>';
      }).join('') : '<tr><td colspan="6">No sales in this period.</td></tr>';
    }

    /* ---------- breakdown: payment + category ---------- */
    var bd = $id('breakdownBody');
    if (bd) {
      var payKeys = Object.keys(st.byPayment);
      var totalPay = payKeys.reduce(function (n, k) { return n + st.byPayment[k].amount; }, 0) || 1;
      var payHTML = payKeys.length ? payKeys.map(function (k) {
        var v = st.byPayment[k];
        var w = (v.amount / totalPay * 100).toFixed(1);
        return '<div class="meter"><div class="meter-top"><span>' + BS.esc(k) + ' <span class="cart-sku">(' + v.count + ')</span></span>' +
          '<strong>' + BS.money(v.amount) + '</strong></div>' +
          '<div class="meter-track"><i style="width:' + w + '%"></i></div></div>';
      }).join('') : '<div class="cart-sku">No orders.</div>';

      var catKeys = Object.keys(st.byCategory);
      var totalCat = catKeys.reduce(function (n, k) { return n + st.byCategory[k].sales; }, 0) || 1;
      var catHTML = catKeys.length ? catKeys.sort(function (a, b) { return st.byCategory[b].sales - st.byCategory[a].sales; })
        .map(function (k) {
          var v = st.byCategory[k];
          var w = (v.sales / totalCat * 100).toFixed(1);
          return '<div class="meter"><div class="meter-top"><span>' + BS.esc(BS.data.categoryName(k)) +
            ' <span class="cart-sku">(' + v.qty + ' units)</span></span><strong>' + BS.money(v.sales) + '</strong></div>' +
            '<div class="meter-track"><i class="alt" style="width:' + w + '%"></i></div></div>';
        }).join('') : '<div class="cart-sku">—</div>';

      bd.innerHTML = '<div class="mk-label">Payment methods</div>' + payHTML +
        '<div class="mk-label mt-3">Categories</div>' + catHTML;
    }

    /* ---------- inventory valuation ---------- */
    var invB = $id('inventoryBody');
    var invU = $id('invUnits');
    if (invU) invU.textContent = inv.units + ' units';
    if (invB) {
      var rows2 = [
        ['Units in stock', inv.units + ' pcs'],
        ['Value at cost', BS.money(inv.cost)],
        ['Value at retail', BS.money(inv.retail)],
        ['Potential profit', BS.money(inv.potential)],
        ['Low stock (≤8)', inv.low + (inv.low === 1 ? ' item' : ' items')],
        ['Out of stock', inv.out + (inv.out === 1 ? ' item' : ' items')],
        ['Missing cost price', products.filter(function (p) { return !Number(p.costPrice); }).length + (products.filter(function (p) { return !Number(p.costPrice); }).length === 1 ? ' item' : ' items')]
      ];
      invB.innerHTML = rows2.map(function (r) {
        return '<div class="detail-row"><span>' + r[0] + '</span><strong>' + r[1] + '</strong></div>';
      }).join('') + '<button class="btn-bs btn-bs-sm w-100 mt-3" type="button" id="exportInventory">Export inventory CSV</button>';
      var ei = $id('exportInventory');
      if (ei) ei.addEventListener('click', exportInventoryCSV);
    }

    /* ---------- expenses summary ---------- */
    var es = $id('expenseSummaryBody');
    if (es) {
      var keys = Object.keys(st.expenseBreakdown);
      es.innerHTML = keys.length ? keys.map(function (k) {
        return '<div class="detail-row"><span>' + BS.esc(k) + '</span><strong>' + BS.money(st.expenseBreakdown[k]) + '</strong></div>';
      }).join('') + '<div class="detail-row" style="border-top:2px solid var(--ink);margin-top:6px">' +
        '<span style="font-weight:800;color:var(--ink)">Total</span><strong>' + BS.money(st.expenses) + '</strong></div>'
        : '<p class="cart-sku mb-2">No expenses in this period.</p>' +
          '<button class="btn-bs btn-bs-sm w-100" type="button" data-goto="expenses">Add expense</button>';
    }
  }

  /* ============================================================
     EXPENSES
     ============================================================ */
  function renderExpenses() {
    var body = $id('expenseRows');
    var count = $id('expenseCount');
    if (!body) return;

    var filter = ($id('expenseCatFilter') || {}).value || 'all';
    var list = expenses.filter(function (e) { return filter === 'all' || e.category === filter; });

    var monthKey = new Date().toISOString().slice(0, 7);
    var total = expenses.reduce(function (n, e) { return n + (Number(e.amount) || 0); }, 0);
    var monthTotal = expenses.filter(function (e) {
      return String(e.date || e.createdAt || '').slice(0, 7) === monthKey;
    }).reduce(function (n, e) { return n + (Number(e.amount) || 0); }, 0);

    var byCat = {};
    expenses.forEach(function (e) {
      var c = e.category || 'Other';
      byCat[c] = (byCat[c] || 0) + (Number(e.amount) || 0);
    });
    var topCat = Object.keys(byCat).sort(function (a, b) { return byCat[b] - byCat[a]; })[0] || '—';

    var set = function (id, val) { var n = $id(id); if (n) n.textContent = val; };
    set('expTotal', BS.money(total));
    set('expMonth', BS.money(monthTotal));
    set('expTopCat', topCat);
    set('expRecords', expenses.length);
    if (count) count.textContent = '(' + expenses.length + ')';

    /* category filter options (dynamic) */
    var sel = $id('expenseCatFilter');
    if (sel) {
      var cats = {};
      expenses.forEach(function (e) { cats[e.category || 'Other'] = 1; });
      var cur = sel.value;
      sel.innerHTML = '<option value="all">All categories</option>' +
        Object.keys(cats).sort().map(function (c) { return '<option value="' + BS.esc(c) + '">' + BS.esc(c) + '</option>'; }).join('');
      sel.value = cur && (cur === 'all' || cats[cur]) ? cur : 'all';
    }

    body.innerHTML = list.length ? list.map(function (e) {
      return '<tr data-eid="' + BS.esc(e.id) + '">' +
        '<td style="white-space:nowrap">' + BS.fmtDate(e.date || e.createdAt) + '</td>' +
        '<td><strong>' + BS.esc(e.title || '—') + '</strong></td>' +
        '<td><span class="stock-pill">' + BS.esc(e.category || 'Other') + '</span></td>' +
        '<td><strong>' + BS.money(e.amount) + '</strong></td>' +
        '<td class="cart-sku">' + BS.esc(e.by || 'admin') + '</td>' +
        '<td><button class="tbl-btn danger" type="button" data-del-expense="' + BS.esc(e.id) + '" title="Delete">' +
          bsIcon('trash', 14) + '</button></td>' +
        '</tr>';
    }).join('') : '<tr><td colspan="6">No expenses recorded. Use “Add expense” to enter the first one.</td></tr>';
  }

  /* ---------- expense modal actions ---------- */
  function openExpenseModal() {
    $id('expTitle').value = '';
    $id('expAmount').value = '';
    $id('expDate').value = new Date().toISOString().slice(0, 10);
    $id('expCategory').value = 'Rent';
    $id('expErr').classList.remove('show');
    expenseModal.show();
  }

  function saveExpense() {
    var title = $id('expTitle').value.trim();
    var amount = Number($id('expAmount').value);
    var err = $id('expErr');
    if (title.length < 2 || !(amount > 0)) { err.classList.add('show'); return; }
    err.classList.remove('show');

    var btn = $id('saveExpenseBtn');
    btn.disabled = true;
    BS.fb.addExpense({
      title: title,
      amount: amount,
      date: $id('expDate').value || new Date().toISOString().slice(0, 10),
      category: $id('expCategory').value,
      by: 'admin'
    }).then(function () {
      BS.ui.toast('Expense saved.', 'success');
      expenseModal.hide();
      return BS.fb.getExpenses();
    }).then(function (list) {
      expenses = list;
      renderExpenses();
      renderReports();
      renderDashboard();
    }).catch(function (e) {
      console.error(e);
      BS.ui.toast('Expense could not be saved: ' + (e.message || ''), 'error');
    }).finally(function () { btn.disabled = false; });
  }

  /* ============================================================
     CSV EXPORTS
     ============================================================ */
  function csvCell(v) {
    var s2 = String(v == null ? '' : v).replace(/"/g, '""');
    return '"' + s2 + '"';
  }

  function downloadCSV(filename, rows) {
    var csv = rows.map(function (r) { return r.map(csvCell).join(','); }).join('\r\n');
    var blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1500);
    BS.ui.toast('CSV downloaded: ' + filename, 'success');
  }

  function exportOrdersCSV() {
    var map = productMap();
    var rows = [['Order', 'Date', 'Status', 'Customer', 'Phone', 'City', 'Items', 'Subtotal', 'Discount',
      'Delivery', 'Total', 'COGS', 'Profit', 'Payment', 'Txn ID']];
    orders.forEach(function (o) {
      var c = o.customer || {}, pay = o.payment || {};
      var cogs = Number(o.cogs);
      if (isNaN(cogs)) {
        cogs = 0;
        (o.items || []).forEach(function (it) { cogs += itemCost(it, map) * (Number(it.qty) || 0); });
      }
      rows.push([o.orderNumber, BS.fmtDate(o.createdAt, true), o.status, c.name, c.phone, c.city,
        (o.items || []).map(function (i) { return i.qty + 'x ' + i.name; }).join(' | '),
        o.subtotal, o.discount, o.delivery, o.total, cogs,
        (Number(o.subtotal) || 0) - (Number(o.discount) || 0) - cogs,
        pay.method, pay.transactionId]);
    });
    downloadCSV('bs-orders-' + new Date().toISOString().slice(0, 10) + '.csv', rows);
  }

  function exportInventoryCSV() {
    var rows = [['Product', 'SKU', 'Category', 'Price', 'Cost', 'Margin %', 'Stock', 'Stock value (cost)', 'Stock value (retail)', 'Status']];
    products.forEach(function (p) {
      var price = Number(p.price) || 0, cost = Number(p.costPrice) || 0, st2 = Number(p.stock) || 0;
      rows.push([p.name, p.sku, BS.data.categoryName(p.category), price, cost,
        price ? ((price - cost) / price * 100).toFixed(1) : '0', st2, cost * st2, price * st2,
        st2 === 0 ? 'Out of stock' : (st2 <= 8 ? 'Low stock' : 'In stock')]);
    });
    downloadCSV('bs-inventory-' + new Date().toISOString().slice(0, 10) + '.csv', rows);
  }

  function exportPnLCSV() {
    var bounds = rangeBounds();
    var st = compute(bounds);
    var rows = [['Profit & Loss — ' + rangeLabelText(bounds)], []];
    rows.push(['Sales revenue (gross)', st.grossSales]);
    rows.push(['Discounts', -st.discounts]);
    rows.push(['Net sales', st.netSales]);
    rows.push(['COGS', -st.cogs]);
    rows.push(['Gross profit', st.grossProfit]);
    rows.push(['Gross margin %', st.grossMargin.toFixed(1)]);
    rows.push(['Delivery collected', st.deliveryCollected]);
    rows.push(['Expenses', -st.expenses]);
    Object.keys(st.expenseBreakdown).forEach(function (k) { rows.push(['  · ' + k, -st.expenseBreakdown[k]]); });
    rows.push(['Net profit', st.netProfit]);
    rows.push(['Net margin %', st.netMargin.toFixed(1)]);
    rows.push([]);
    rows.push(['Orders', st.orders, 'Units sold', st.units, 'AOV', st.aov.toFixed(0)]);
    downloadCSV('bs-profit-loss-' + new Date().toISOString().slice(0, 10) + '.csv', rows);
  }

  /* ---------------- events ---------------- */
  function bindUI() {
    /* nav panes */
    document.querySelectorAll('.admin-nav button[data-pane]').forEach(function (b) {
      b.addEventListener('click', function () {
        document.querySelectorAll('.admin-nav button').forEach(function (x) { x.classList.remove('active'); });
        document.querySelectorAll('.admin-pane').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        var pane = $id('pane-' + b.dataset.pane);
        if (pane) pane.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });

    /* data-goto: delegation — dynamically rendered buttons bhi kaam karein */
    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-goto]');
      if (!b) return;
      var target = document.querySelector('.admin-nav button[data-pane="' + b.dataset.goto + '"]');
      if (target) target.click();
      if (b.dataset.goto === 'expenses' && b.textContent.indexOf('Add') >= 0) {
        setTimeout(function () { if (typeof openExpenseModal === 'function') openExpenseModal(); }, 320);
      }
    });

    /* ---------- reports: range buttons ---------- */
    document.querySelectorAll('#rangeBtns button').forEach(function (b) {
      b.addEventListener('click', function () {
        document.querySelectorAll('#rangeBtns button').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        rep.range = b.dataset.range;
        rep.from = null; rep.to = null;
        renderReports();
      });
    });

    var applyRange = $id('applyRange');
    if (applyRange) applyRange.addEventListener('click', function () {
      var f = $id('rangeFrom').value, t = $id('rangeTo').value;
      if (!f || !t) { BS.ui.toast('Choose both a From and a To date.', 'warn'); return; }
      if (new Date(f) > new Date(t)) { BS.ui.toast('The From date must be before the To date.', 'error'); return; }
      rep.range = 'custom'; rep.from = f; rep.to = t;
      document.querySelectorAll('#rangeBtns button').forEach(function (x) { x.classList.remove('active'); });
      renderReports();
    });

    ['refreshReports'].forEach(function (id) {
      var b = $id(id);
      if (b) b.addEventListener('click', function () {
        BS.fb.getOrders().then(function (list) {
          orders = list; renderDashboard(); renderOrders(); renderReports(); renderExpenses();
          BS.ui.toast('Reports refreshed.', 'success');
        });
      });
    });

    if ($id('exportOrders')) $id('exportOrders').addEventListener('click', exportOrdersCSV);
    if ($id('exportPnL')) $id('exportPnL').addEventListener('click', exportPnLCSV);

    /* ---------- expenses ---------- */
    if ($id('addExpenseBtn')) $id('addExpenseBtn').addEventListener('click', openExpenseModal);
    if ($id('saveExpenseBtn')) $id('saveExpenseBtn').addEventListener('click', saveExpense);
    if ($id('expenseCatFilter')) $id('expenseCatFilter').addEventListener('change', renderExpenses);

    if ($id('seedExpenses')) $id('seedExpenses').addEventListener('click', function () {
      BS.fb.seedDemoExpenses().then(function () {
        BS.ui.toast('Sample expenses added.', 'success');
        return BS.fb.getExpenses();
      }).then(function (list) {
        expenses = list; renderExpenses(); renderReports(); renderDashboard();
      });
    });

    /* ---------- products ---------- */
    $id('addProductBtn').addEventListener('click', function () { openProductModal(null); });

    ['pfPrice', 'pfCostPrice'].forEach(function (id) {
      var elm = $id(id);
      if (elm) elm.addEventListener('input', updateMarginHint);
    });
    $id('saveProductBtn').addEventListener('click', saveProduct);

    $id('productSearch').addEventListener('input', renderProducts);
    $id('productCatFilter').addEventListener('change', renderProducts);

    $id('pfImage').addEventListener('change', function () {
      var f = this.files && this.files[0];
      if (!f) return;
      if (!/^image\//.test(f.type)) { BS.ui.toast('Please upload an image file only.', 'error'); return; }
      if (f.size > 5 * 1024 * 1024) { BS.ui.toast('The image must be under 5MB.', 'error'); return; }
      pendingImage = f;
      $id('pfImagePreview').src = URL.createObjectURL(f);
    });

    document.addEventListener('click', function (e) {
      var edit = e.target.closest('[data-edit]');
      if (edit) { openProductModal(edit.dataset.edit); return; }

      var del = e.target.closest('[data-del]');
      if (del) {
        var p = products.filter(function (x) { return x.id === del.dataset.del; })[0];
        if (window.confirm('Delete this product?\n\n' + (p ? p.name : ''))) {
          BS.fb.deleteProduct(del.dataset.del).then(function () {
            BS.ui.toast('Product deleted.', 'info');
            refreshAll();
          }).catch(function (err) {
            BS.ui.toast('Could not delete: ' + (err.message || ''), 'error');
          });
        }
        return;
      }

      var stockBtn = e.target.closest('[data-stock-save]');
      if (stockBtn) {
        var row = stockBtn.closest('[data-pid]');
        var input = row.querySelector('[data-stock-input]');
        var val = Number(input.value);
        if (isNaN(val) || val < 0) { BS.ui.toast('Enter a valid stock quantity.', 'error'); return; }
        stockBtn.disabled = true;
        BS.fb.updateStock(row.dataset.pid, val).then(function () {
          BS.ui.toast('Stock updated: ' + val, 'success');
          refreshAll();
        }).catch(function (err) {
          BS.ui.toast('Stock could not be updated: ' + (err.message || ''), 'error');
          stockBtn.disabled = false;
        });
        return;
      }

      var view = e.target.closest('[data-view-order]');
      if (view) { openOrderModal(view.dataset.viewOrder); return; }

      var delExp = e.target.closest('[data-del-expense]');
      if (delExp) {
        if (window.confirm('Delete this expense?')) {
          BS.fb.deleteExpense(delExp.dataset.delExpense).then(function () {
            BS.ui.toast('Expense deleted.', 'info');
            return BS.fb.getExpenses();
          }).then(function (list) {
            expenses = list; renderExpenses(); renderReports(); renderDashboard();
          });
        }
        return;
      }

      var proof = e.target.closest('[data-proof]');
      if (proof) {
        $id('proofImg').src = proof.dataset.proof;
        proofModal.show();
        return;
      }
    });

    /* orders */
    $id('orderSearch').addEventListener('input', renderOrders);
    $id('orderStatusFilter').addEventListener('change', renderOrders);
    $id('refreshOrders').addEventListener('click', refreshOrders);

    document.addEventListener('change', function (e) {
      var sel = e.target.closest('[data-status-select]');
      if (!sel) return;
      var row = sel.closest('[data-oid]');
      sel.className = 'status-select ' + sel.value;
      changeStatus(row.dataset.oid, sel.value);
    });

    $id('modalStatusSave').addEventListener('click', function () {
      if (!currentOrder) return;
      var val = $id('modalStatus').value;
      changeStatus(currentOrder.id, val);
      orderModal.hide();
    });

    /* dashboard utility buttons */
    if ($id('seedBtn')) $id('seedBtn').addEventListener('click', function () {
      if (BS.fb.mode === 'demo') {
        if (!window.confirm('The sample catalogue will be reset and imported again. Continue?')) return;
        BS.fb.resetDemoData().then(function () {
          BS.ui.toast('Products imported.', 'success');
          refreshAll();
        });
        return;
      }
      var seed = (BS.data.products || []);
      var existingSkus = products.map(function (p) { return p.sku; });
      var fresh = seed.filter(function (p) { return existingSkus.indexOf(p.sku) < 0; });
      if (!fresh.length) { BS.ui.toast('All sample products are already in place.', 'info'); return; }
      if (!window.confirm(fresh.length + ' sample products will be imported. Continue?')) return;

      Promise.all(fresh.map(function (p) {
        var data = Object.assign({}, p);
        delete data.id;
        data.createdAt = new Date().toISOString();
        return BS.fb.saveProduct(data);
      })).then(function () {
        BS.ui.toast(fresh.length + ' products imported.', 'success');
        refreshAll();
      }).catch(function (err) {
        BS.ui.toast('Import failed: ' + (err.message || ''), 'error');
      });
    });

    if ($id('resetBtn')) $id('resetBtn').addEventListener('click', function () {
      if (BS.fb.mode !== 'demo') {
        BS.ui.toast('Reset is only available before the store is connected.', 'info');
        return;
      }
      if (!window.confirm('Reset the sample data (products + orders)?')) return;
      BS.fb.resetDemoData().then(function () {
        return BS.fb.seedDemoExpenses();
      }).then(function () {
        BS.ui.toast('Demo data reset (products + expenses).', 'success');
        refreshAll();
      });
    });

    $id('logoutBtn').addEventListener('click', function () {
      BS.fb.logoutAdmin().then(function () {
        window.location.replace('admin-login.html');
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
