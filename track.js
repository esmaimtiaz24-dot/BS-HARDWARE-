/* ============================================================
   track.js — order lookup by order number
   ============================================================ */
(function () {
  'use strict';

  function show(el, yes) { if (el) el.classList.toggle('hidden', !yes); }

  function lookup(no) {
    var btn = document.querySelector('#trackForm button[type=submit]');
    var original = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.innerHTML = 'Checking…'; }

    BS.fb.getOrderByNumber(no).then(function (order) {
      var result = document.getElementById('trackResult');
      var notFound = document.getElementById('trackNotFound');

      if (!order) {
        show(result, false);
        show(notFound, true);
        return;
      }
      show(notFound, false);
      show(result, true);
      BS.orderView.render(order, 'trackResult');
      result.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }).catch(function (err) {
      console.error(err);
      var code = String((err && (err.code || err.message)) || '');
      var msg = /permission_denied|PERMISSION_DENIED/.test(code)
        ? 'This store keeps order details private. Send us your order number on WhatsApp and we will check it for you.'
        : 'Could not check that order. Please try again.';
      BS.ui.toast(msg, 'error');
    }).finally(function () {
      if (btn) { btn.disabled = false; btn.innerHTML = original; }
    });
  }

  function boot() {
    var form = document.getElementById('trackForm');
    var input = document.getElementById('orderNumber');
    var err = document.getElementById('trackErr');
    var pre;
    try { pre = (BS.qs('no') || sessionStorage.getItem('bsh_last_order_no') || '').trim(); }
    catch (e) { pre = (BS.qs('no') || '').trim(); }

    if (pre && input) {
      input.value = pre;
      lookup(pre);
    }

    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var no = (input.value || '').trim().toUpperCase();
      if (no.length < 4) {
        err.classList.add('show');
        input.classList.add('field-error');
        return;
      }
      err.classList.remove('show');
      input.classList.remove('field-error');
      history.replaceState(null, '', '?no=' + encodeURIComponent(no));
      lookup(no);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
