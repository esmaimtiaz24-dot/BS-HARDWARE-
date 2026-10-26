/* ============================================================
   order-view.js — order detail + status timeline renderer
   (order-success.html aur track.html dono use karte hain)
   ============================================================ */
(function () {
  'use strict';

  var STEPS = [
    { key: 'pending', title: 'Order placed', desc: 'We have received your order.' },
    { key: 'confirmed', title: 'Confirmed', desc: 'Payment verified and order confirmed.' },
    { key: 'delivered', title: 'Delivered', desc: 'Your order has been delivered.' }
  ];

  function pill(status) {
    var s = String(status || 'pending').toLowerCase();
    var cls = ['pending', 'confirmed', 'delivered', 'cancelled'].indexOf(s) >= 0 ? s : 'pending';
    return '<span class="status-pill ' + cls + '">' + s.charAt(0).toUpperCase() + s.slice(1) + '</span>';
  }

  function timeline(order) {
    var status = String(order.status || 'pending').toLowerCase();

    if (status === 'cancelled') {
      return '<div class="timeline">' +
        '<div class="tl-step active"><span class="tl-dot">' + bsIcon('close', 15) + '</span>' +
          '<div><h4>Order cancelled</h4><p>This order has been cancelled. Message us on WhatsApp for details.</p></div></div>' +
        '</div>';
    }

    var idx = STEPS.findIndex(function (s) { return s.key === status; });
    if (idx < 0) idx = 0;

    return '<div class="timeline">' + STEPS.map(function (s, i) {
      var cls = i < idx ? 'done' : (i === idx ? 'active' : '');
      var icon = i < idx ? bsIcon('check', 15) : (i === idx ? bsIcon('clock', 15) : bsIcon('box', 14));
      return '<div class="tl-step ' + cls + '">' +
        '<span class="tl-dot">' + icon + '</span>' +
        '<div><h4>' + s.title + '</h4><p>' + s.desc + '</p></div></div>';
    }).join('') + '</div>';
  }

  function itemsHTML(items) {
    return (items || []).map(function (it) {
      return '<div class="mini-item" style="align-items:flex-start">' +
        '<img src="' + BS.esc(it.image || 'assets/img/products/placeholder.svg') + '" alt="" ' +
          'onerror="this.onerror=null;this.src=\'assets/img/products/placeholder.svg\'">' +
        '<div><div class="mi-name">' + BS.esc(it.name) + '</div>' +
          '<div class="mi-qty">' + (it.sku ? BS.esc(it.sku) + ' · ' : '') + 'Qty ' + it.qty +
          ' × ' + BS.money(it.price) + '</div></div>' +
        '<div class="mi-price">' + BS.money(it.line || (it.price * it.qty)) + '</div></div>';
    }).join('');
  }

  function paymentHTML(order) {
    var pay = order.payment || {};
    var rows = '';
    rows += '<div class="detail-row"><span>Method</span><strong>' + BS.esc(pay.method || '—') + '</strong></div>';
    if (pay.type !== 'cod') {
      if (pay.accountNumber) rows += '<div class="detail-row"><span>Account number</span><strong>' + BS.esc(pay.accountNumber) + '</strong></div>';
      if (pay.accountName) rows += '<div class="detail-row"><span>Account name</span><strong>' + BS.esc(pay.accountName) + '</strong></div>';
      rows += '<div class="detail-row"><span>Transaction ID</span><strong>' + BS.esc(pay.transactionId || '—') + '</strong></div>';
      rows += '<div class="detail-row"><span>Verification</span><strong>' +
        (pay.status === 'verified' ? 'Verified' : 'Pending — admin check karega') + '</strong></div>';

      if (pay.screenshotUrl) {
        rows += '<div class="mt-3"><div class="form-label-bs mb-2">Payment screenshot</div>' +
          '<a href="' + BS.esc(pay.screenshotUrl) + '" target="_blank" rel="noopener">' +
          '<img class="proof-thumb" src="' + BS.esc(pay.screenshotUrl) + '" alt="Payment screenshot"></a></div>';
      } else {
        rows += '<div class="mt-3 proof-empty">No screenshot attached.</div>';
      }
    } else {
      rows += '<div class="detail-row"><span>Payment</span><strong>Cash on delivery</strong></div>';
    }
    return rows;
  }

  function totalsHTML(order) {
    var html = '<div class="detail-row"><span>Subtotal</span><strong>' + BS.money(order.subtotal) + '</strong></div>';
    if (Number(order.discount)) {
      html += '<div class="detail-row"><span>Discount' +
        (order.coupon ? ' (' + BS.esc(order.coupon.code) + ')' : '') + '</span><strong>− ' +
        BS.money(order.discount) + '</strong></div>';
    }
    html += '<div class="detail-row"><span>Delivery charges</span><strong>' +
      (Number(order.delivery) === 0 ? 'Free' : BS.money(order.delivery)) + '</strong></div>';
    html += '<div class="detail-row" style="border-top:2px solid var(--ink);margin-top:6px;padding-top:12px">' +
      '<span style="font-weight:800;color:var(--ink);text-transform:uppercase;letter-spacing:.08em;font-size:.72rem">Total</span>' +
      '<strong style="font-family:var(--font-display);font-size:1.1rem">' + BS.money(order.total) + '</strong></div>';
    return html;
  }

  function detailCard(title, body, icon) {
    return '<div class="detail-card">' +
      '<h3 class="d-flex align-items-center gap-2">' + (icon ? bsIcon(icon, 17) : '') + title + '</h3>' +
      body + '</div>';
  }

  function render(order, target) {
    var wrap = typeof target === 'string' ? document.getElementById(target) : target;
    if (!wrap || !order) return;

    var c = order.customer || {};
    var dateStr = BS.fmtDate(order.createdAt, true);

    var html = '';

    /* summary strip */
    html += '<div class="detail-card" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:16px">' +
      '<div><small class="form-label-bs">Order number</small><strong style="font-family:var(--font-display);font-size:1.05rem">' +
        BS.esc(order.orderNumber || '—') + '</strong></div>' +
      '<div><small class="form-label-bs">Placed on</small><strong style="font-size:.86rem">' + dateStr + '</strong></div>' +
      '<div><small class="form-label-bs">Status</small><div>' + pill(order.status) + '</div></div>' +
      '<div><small class="form-label-bs">Items</small><strong style="font-size:.86rem">' + (order.itemCount || (order.items || []).length) + '</strong></div>' +
      '</div>';

    /* timeline */
    html += detailCard('Order status', timeline(order), 'clock');

    /* items */
    html += detailCard('Items', '<div class="mini-summary" style="max-height:none">' + itemsHTML(order.items) + '</div>', 'box');

    html += '<div class="row g-3">' +
      '<div class="col-md-6">' + detailCard('Delivery to',
        '<div class="detail-row"><span>Name</span><strong>' + BS.esc(c.name || '—') + '</strong></div>' +
        '<div class="detail-row"><span>Phone</span><strong>' + BS.esc(c.phone || '—') + '</strong></div>' +
        (c.email ? '<div class="detail-row"><span>Email</span><strong>' + BS.esc(c.email) + '</strong></div>' : '') +
        '<div class="detail-row"><span>Address</span><strong style="max-width:60%">' +
          BS.esc([c.address, c.landmark, c.city].filter(Boolean).join(', ')) + '</strong></div>' +
        (c.note ? '<div class="detail-row"><span>Note</span><strong style="max-width:60%">' + BS.esc(c.note) + '</strong></div>' : ''),
        'location') + '</div>' +
      '<div class="col-md-6">' + detailCard('Payment', paymentHTML(order), 'cash') + '</div>' +
      '</div>';

    html += detailCard('Totals', totalsHTML(order), 'tag');

    wrap.innerHTML = html;
  }

  window.BS = window.BS || {};
  window.BS.orderView = { render: render, pill: pill, timeline: timeline, itemsHTML: itemsHTML };
})();
