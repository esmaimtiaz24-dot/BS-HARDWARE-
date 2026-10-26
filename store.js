/* ============================================================
   store.js — cart engine + shared helpers
   ------------------------------------------------------------
   Cart localStorage mein rehta hai:  [{id, qty}, ...]
   Har change par window event "bs:cart" fire hota hai,
   jisse header ka counter aur totals live update hote hain.
   ============================================================ */
(function () {
  'use strict';

  var KEY = 'bsh_cart_v1';
  var CK = 'bsh_coupon_v1';
  var S = window.BS_SETTINGS || {};

  /* ---------------- helpers ---------------- */
  function money(n) {
    var num = Number(n) || 0;
    return 'Rs ' + num.toLocaleString('en-PK', { maximumFractionDigits: 0 });
  }

  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function fmtDate(value, withTime) {
    if (!value) return '—';
    var d;
    if (value.toMillis) d = new Date(value.toMillis());
    else if (value.seconds) d = new Date(value.seconds * 1000);
    else d = new Date(value);
    if (isNaN(d.getTime())) return '—';
    var opts = withTime
      ? { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
      : { day: '2-digit', month: 'short', year: 'numeric' };
    return d.toLocaleDateString('en-GB', opts).replace(',', ' ·');
  }

  function qs(name) {
    var p = new URLSearchParams(window.location.search);
    return p.get(name);
  }

  function readRaw() {
    try {
      var v = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(v) ? v : [];
    } catch (e) { return []; }
  }

  function writeRaw(items) {
    try { localStorage.setItem(KEY, JSON.stringify(items)); }
    catch (e) { console.warn('[BS] cart save failed', e); }
    emit(items);
  }

  function emit(items) {
    items = items || readRaw();
    var count = items.reduce(function (s, i) { return s + (Number(i.qty) || 0); }, 0);
    var detail = { items: items, count: count };
    document.dispatchEvent(new CustomEvent('bs:cart', { detail: detail }));
    return detail;
  }

  /* ---------------- coupon ---------------- */
  function getCoupon() {
    try { return JSON.parse(localStorage.getItem(CK) || 'null'); } catch (e) { return null; }
  }

  function applyCoupon(code) {
    code = String(code || '').trim().toUpperCase();
    var table = S.coupons || {};
    if (!code) { try { localStorage.removeItem(CK); } catch (e) {} return { ok: true, cleared: true }; }
    if (!table[code]) return { ok: false, message: 'That coupon code is not valid.' };
    try { localStorage.setItem(CK, JSON.stringify({ code: code, percent: table[code] })); } catch (e) {}
    return { ok: true, coupon: { code: code, percent: table[code] } };
  }

  function clearCoupon() { try { localStorage.removeItem(CK); } catch (e) {} }

  /* ---------------- cart core ---------------- */
  function items() { return readRaw(); }

  function count() {
    return readRaw().reduce(function (s, i) { return s + (Number(i.qty) || 0); }, 0);
  }

  /**
   * add(product, qty)  — stock ke against validate karta hai
   * returns {ok, message, qty}
   */
  function add(product, qty) {
    qty = Math.max(1, Number(qty) || 1);
    if (!product) return { ok: false, message: 'Product not found.' };

    var stock = Number(product.stock);
    if (!isNaN(stock) && stock <= 0) {
      return { ok: false, message: 'This product is out of stock right now.' };
    }

    var list = readRaw();
    var found = list.filter(function (i) { return i.id === product.id; })[0];

    if (found) {
      var next = found.qty + qty;
      if (!isNaN(stock) && next > stock) {
        if (found.qty >= stock) return { ok: false, message: 'Stock limit: only ' + stock + ' available.' };
        found.qty = stock;
        writeRaw(list);
        return { ok: true, qty: stock, message: 'The maximum available quantity is already in your cart.' };
      }
      found.qty = next;
    } else {
      if (!isNaN(stock) && qty > stock) qty = stock;
      list.push({ id: product.id, qty: qty });
    }
    writeRaw(list);
    return { ok: true, qty: qty, message: 'Added to cart.' };
  }

  function setQty(id, qty) {
    qty = Math.max(0, Number(qty) || 0);
    var list = readRaw();
    if (qty === 0) {
      list = list.filter(function (i) { return i.id !== id; });
    } else {
      list = list.map(function (i) { return i.id === id ? { id: i.id, qty: qty } : i; });
    }
    writeRaw(list);
    return qty;
  }

  function remove(id) {
    writeRaw(readRaw().filter(function (i) { return i.id !== id; }));
  }

  function clear() { writeRaw([]); clearCoupon(); }

  /**
   * detailed(products) — cart lines + product info + stock clamp
   */
  function detailed(products) {
    var map = {};
    (products || []).forEach(function (p) { map[p.id] = p; });
    return readRaw().map(function (i) {
      var p = map[i.id];
      if (!p) return null;
      var stock = Number(p.stock);
      var max = isNaN(stock) ? 999 : stock;
      return {
        id: i.id,
        qty: Math.min(i.qty, Math.max(max, 0)),
        product: p,
        line: (Number(p.price) || 0) * Math.min(i.qty, Math.max(max, 0))
      };
    }).filter(Boolean);
  }

  function totals(lines) {
    var subtotal = (lines || []).reduce(function (s, l) { return s + l.line; }, 0);
    var coupon = getCoupon();
    var discount = coupon ? Math.round(subtotal * (Number(coupon.percent) || 0) / 100) : 0;
    var settings = window.BS_SETTINGS || {};
    var fee = Number(settings.deliveryFee) || 0;
    var freeOver = Number(settings.freeDeliveryOver) || 0;
    var delivery = (freeOver > 0 && subtotal >= freeOver) ? 0 : fee;
    var total = Math.max(0, subtotal - discount) + delivery;
    return {
      subtotal: subtotal, discount: discount, delivery: delivery, total: total,
      coupon: coupon, count: (lines || []).reduce(function (s, l) { return s + l.qty; }, 0)
    };
  }

  /* ---------------- expose ---------------- */
  window.BS = window.BS || {};
  window.BS.money = money;
  window.BS.esc = esc;
  window.BS.fmtDate = fmtDate;
  window.BS.qs = qs;
  window.BS.cart = {
    items: items, count: count, add: add, setQty: setQty, remove: remove, clear: clear,
    detailed: detailed, totals: totals, emit: emit,
    applyCoupon: applyCoupon, getCoupon: getCoupon, clearCoupon: clearCoupon
  };
})();
