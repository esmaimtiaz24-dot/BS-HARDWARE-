/* ============================================================
   cart.js — cart page: qty update, remove, coupon, totals
   ============================================================ */
(function () {
  'use strict';

  var allProducts = [];
  var lines = [];
  var FALLBACK = 'assets/img/products/placeholder.svg';

  function rowHTML(line) {
    var p = line.product;
    var s = Number(p.stock) || 0;
    var lowNote = (s > 0 && line.qty >= s) ? '<div style="font-size:.68rem;color:#a1140c;font-weight:700;margin-top:4px">Max stock reached (' + s + ')</div>' : '';
    return '' +
      '<div class="cart-row" data-row="' + BS.esc(p.id) + '">' +
        '<a class="cart-thumb" href="product.html?id=' + encodeURIComponent(p.id) + '">' +
          '<img src="' + BS.esc(p.image || FALLBACK) + '" alt="' + BS.esc(p.name) + '" ' +
            'onerror="this.onerror=null;this.src=\'' + FALLBACK + '\'"></a>' +
        '<div class="cart-info">' +
          '<a class="cart-name" href="product.html?id=' + encodeURIComponent(p.id) + '">' + BS.esc(p.name) + '</a>' +
          '<span class="cart-sku">' + BS.esc(p.sku || '') + (p.brand ? ' · ' + BS.esc(p.brand) : '') + '</span>' +
          '<div style="font-size:.74rem;color:var(--muted);margin-top:2px">' + BS.money(p.price) + ' / ' + BS.esc(p.unit || 'piece') + '</div>' +
          lowNote +
        '</div>' +
        '<div class="cart-qty">' +
          '<div class="qty-stepper">' +
            '<button type="button" data-dec aria-label="Decrease quantity">−</button>' +
            '<input type="number" value="' + line.qty + '" min="1" max="' + (s || 1) + '" data-qty aria-label="Quantity">' +
            '<button type="button" data-inc aria-label="Increase quantity">+</button>' +
          '</div>' +
        '</div>' +
        '<div class="cart-line">' + BS.money(line.line) + '</div>' +
        '<div class="cart-rm">' +
          '<button class="cart-remove" type="button" data-remove aria-label="Remove ' + BS.esc(p.name) + ' from cart">' +
            '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>' +
          '</button>' +
        '</div>' +
      '</div>';
  }

  function renderTotals() {
    var t = BS.cart.totals(lines);
    var q = function (id) { return document.getElementById(id); };

    if (q('sumSubtotal')) q('sumSubtotal').textContent = BS.money(t.subtotal);
    if (q('sumDelivery')) q('sumDelivery').textContent = t.delivery === 0 ? 'Free' : BS.money(t.delivery);
    if (q('sumTotal')) q('sumTotal').textContent = BS.money(t.total);

    var dRow = q('discountRow');
    if (dRow) {
      dRow.classList.toggle('hidden', !t.discount);
      if (t.discount) {
        q('sumDiscount').textContent = '− ' + BS.money(t.discount);
        q('couponLabel').textContent = t.coupon ? '(' + t.coupon.code + ' · ' + t.coupon.percent + '%)' : '';
      }
    }

    var hint = q('couponHint');
    if (hint && t.coupon) {
      hint.textContent = 'Coupon ' + t.coupon.code + ' applied — ' + t.coupon.percent + '% off.';
      hint.style.color = 'var(--green)';
    }

    var btn = q('checkoutBtn');
    if (btn) {
      btn.classList.toggle('hidden', lines.length === 0);
    }
  }

  function render() {
    lines = BS.cart.detailed(allProducts);
    var wrap = document.getElementById('cartRows');
    var empty = document.getElementById('cartEmpty');
    var list = document.getElementById('cartList');

    if (!lines.length) {
      if (wrap) wrap.innerHTML = '';
      if (list) list.classList.add('hidden');
      if (empty) empty.classList.remove('hidden');
    } else {
      if (list) list.classList.remove('hidden');
      if (empty) empty.classList.add('hidden');
      if (wrap) wrap.innerHTML = lines.map(rowHTML).join('');
    }
    renderTotals();
    BS.ui.paintCartBadge();
    renderSuggestions();
  }

  function renderSuggestions() {
    var grid = document.getElementById('suggestGrid');
    if (!grid) return;
    var inCart = {};
    lines.forEach(function (l) { inCart[l.id] = true; });
    var picks = allProducts.filter(function (p) { return !inCart[p.id] && Number(p.stock) > 0; }).slice(0, 4);
    if (!picks.length) {
      var sec = document.getElementById('suggestSection');
      if (sec) sec.classList.add('hidden');
      return;
    }
    grid.innerHTML = picks.map(BS.ui.cardHTML).join('');
    BS.ui.initReveal();
  }

  function findLine(id) {
    return lines.filter(function (l) { return l.id === id; })[0];
  }

  function update(id, qty) {
    var line = findLine(id);
    if (!line) return;
    var stock = Number(line.product.stock) || 0;
    if (qty > stock) {
      BS.ui.toast('Stock limit: only ' + stock + ' available.', 'warn');
      qty = stock;
    }
    BS.cart.setQty(id, qty);
    render();
  }

  function bind() {
    var rows = document.getElementById('cartRows');
    if (rows) {
      rows.addEventListener('click', function (e) {
        var row = e.target.closest('[data-row]');
        if (!row) return;
        var id = row.dataset.row;
        var line = findLine(id);
        if (!line) return;

        if (e.target.closest('[data-inc]')) update(id, line.qty + 1);
        else if (e.target.closest('[data-dec]')) update(id, line.qty - 1);
        else if (e.target.closest('[data-remove]')) {
          BS.cart.remove(id);
          BS.ui.toast('Item removed from your cart.', 'info');
          render();
        }
      });

      rows.addEventListener('change', function (e) {
        var inp = e.target.closest('[data-qty]');
        if (!inp) return;
        var row = inp.closest('[data-row]');
        update(row.dataset.row, Number(inp.value) || 1);
      });
    }

    var clearBtn = document.getElementById('clearCart');
    if (clearBtn) clearBtn.addEventListener('click', function () {
      if (!lines.length) { BS.ui.toast('Your cart is already empty.', 'info'); return; }
      if (window.confirm('Clear the whole cart?')) {
        BS.cart.clear();
        render();
        BS.ui.toast('Cart cleared.', 'info');
      }
    });

    var apply = document.getElementById('applyCoupon');
    if (apply) apply.addEventListener('click', function () {
      var input = document.getElementById('couponInput');
      var res = BS.cart.applyCoupon(input.value);
      var hint = document.getElementById('couponHint');
      if (!res.ok) {
        if (hint) { hint.textContent = res.message; hint.style.color = 'var(--red)'; }
        BS.ui.toast(res.message, 'error');
        return;
      }
      if (res.cleared) {
        if (hint) { hint.textContent = 'Coupon removed.'; hint.style.color = 'var(--muted)'; }
      } else {
        BS.ui.toast('Coupon applied: ' + res.coupon.percent + '% off', 'success');
        if (hint) { hint.textContent = res.coupon.code + ' applied — ' + res.coupon.percent + '% off.'; hint.style.color = 'var(--green)'; }
      }
      input.value = '';
      renderTotals();
    });

    /* ---------- WhatsApp order (pre-filled message) ---------- */
    var waBtn = document.getElementById('waOrderBtn');
    if (waBtn) waBtn.addEventListener('click', function () {
      if (!lines.length) { BS.ui.toast('Your cart is empty — add a few products first.', 'warn'); return; }
      if (!window.BS.wa) { BS.ui.toast('WhatsApp helper did not load.', 'error'); return; }

      var saved = null;
      try { saved = JSON.parse(localStorage.getItem('bsh_customer_v1') || 'null'); } catch (e) {}
      var msg = BS.wa.cartMessage(lines, BS.cart.totals(lines), saved);
      BS.wa.open(msg);
      BS.ui.toast('Opening WhatsApp — just press Send.', 'success');
    });

    var couponInput = document.getElementById('couponInput');
    if (couponInput) couponInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); var b = document.getElementById('applyCoupon'); if (b) b.click(); }
    });
  }

  function boot() {
    bind();
    BS.fb.getProducts().then(function (products) {
      allProducts = products;
      render();
    }).catch(function (err) {
      console.error(err);
      document.getElementById('cartRows').innerHTML =
        '<div class="p-4 text-center">Cart could not load. Please refresh.</div>';
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
