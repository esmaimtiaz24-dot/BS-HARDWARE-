/* ============================================================
   order-success.js — confirmation page
   Pehle sessionStorage ka snapshot dikhata hai, phir Firebase
   se fresh status fetch karke update karta hai.
   ============================================================ */
(function () {
  'use strict';

  var orderNumber = '';
  var lastOrder = null;
  var waOpened = false;

  function setNo(no) {
    orderNumber = no || '';
    var el = document.getElementById('orderNoText');
    if (el) el.textContent = orderNumber || '—';
  }

  function render(order) {
    lastOrder = order;
    BS.orderView.render(order, 'orderDetails');
    paintWaCard();
  }

  /* ---------- WhatsApp confirmation ---------- */
  function paintWaCard() {
    var card = document.getElementById('waConfirmCard');
    var btn = document.getElementById('waConfirmBtn');
    if (!card || !btn || !lastOrder || !window.BS.wa) return;

    var msg = BS.wa.orderMessage(lastOrder);
    btn.dataset.msg = msg;

    /* auto-open (agar settings mein on hai) — sirf ek dafa */
    var S = window.BS_SETTINGS || {};
    if (S.waAutoConfirmAfterOrder && !waOpened) {
      waOpened = true;
      setTimeout(function () { BS.wa.open(btn.dataset.msg); }, 900);
    }
  }

  function bindWa() {
    var btn = document.getElementById('waConfirmBtn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      if (!window.BS.wa) { BS.ui.toast('WhatsApp helper did not load.', 'error'); return; }
      var msg = btn.dataset.msg || (lastOrder ? BS.wa.orderMessage(lastOrder) : '');
      if (!msg) { BS.ui.toast('Order details are still loading — wait a moment and try again.', 'warn'); return; }
      BS.wa.open(msg);
      BS.ui.toast('Opening WhatsApp — press Send and the order is confirmed.', 'success');
    });
  }

  function showNotFound() {
    var wrap = document.getElementById('orderDetails');
    if (!wrap) return;
    wrap.innerHTML = '<div class="detail-card text-center">' +
      '<h3>We could not find this order in your browser</h3>' +
      '<p style="font-size:.88rem;color:var(--muted)">Check again using your order number.</p>' +
      '<a class="btn-bs btn-bs-sm" href="track.html?no=' + encodeURIComponent(orderNumber) + '">Track order</a>' +
      '</div>';
  }

  function boot() {
    bindWa();
    var no = (BS.qs('no') || '').trim().toUpperCase();
    setNo(no);

    var cached = null;
    try { cached = JSON.parse(sessionStorage.getItem('bsh_last_order') || 'null'); } catch (e) {}

    if (!no) {
      /* agar ?no nahi to cached order dikhado */
      if (cached && cached.orderNumber) {
        setNo(cached.orderNumber);
        render(cached);
        history.replaceState(null, '', '?no=' + encodeURIComponent(cached.orderNumber));
      } else {
        showNotFound();
      }
      return;
    }

    if (cached && String(cached.orderNumber).toUpperCase() === no) render(cached);

    /* fresh status (Firebase / demo store) */
    BS.fb.getOrderByNumber(no).then(function (fresh) {
      if (fresh) render(fresh);
      else if (!(cached && String(cached.orderNumber).toUpperCase() === no)) showNotFound();
    }).catch(function () {
      if (!(cached && String(cached.orderNumber).toUpperCase() === no)) showNotFound();
    });

    var copyBtn = document.getElementById('copyOrderNo');
    if (copyBtn) copyBtn.addEventListener('click', function () {
      var txt = orderNumber;
      function done() { BS.ui.toast('Order number copied: ' + txt, 'success'); }
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(txt).then(done).catch(done);
      } else done();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
