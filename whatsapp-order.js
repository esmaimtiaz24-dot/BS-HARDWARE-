/* ============================================================
   whatsapp-order.js — order confirmation WhatsApp par bhejna
   ------------------------------------------------------------
   Kaise kaam karta hai:
   • Button dabane par WhatsApp khulta hai store ke number ke saath
     aur poora order (items, address, payment, transaction ID)
     message mein PEHLE SE likha hota hai.
   • Customer sirf "Send" dabata hai -> store ko confirmation
     seedha WhatsApp par mil jati hai (koi number type nahi karna).

   Public API:
     BS.wa.cartMessage(lines, totals, customer)
     BS.wa.orderMessage(order)
     BS.wa.open(message)          -> naya tab WhatsApp
     BS.wa.url(message)
   ============================================================ */
(function () {
  'use strict';

  var S = window.BS_SETTINGS || {};
  var NUMBER = String(S.whatsapp || '923102902382').replace(/\D/g, '');

  function money(n) {
    return (window.BS.money ? BS.money(n) : 'Rs ' + (Number(n) || 0));
  }

  function lineItems(items) {
    return items.map(function (it, i) {
      var name = it.name || it.product && it.product.name || 'Item';
      var qty = it.qty;
      var price = Number(it.price != null ? it.price : (it.product && it.product.price) || 0);
      var line = Number(it.line != null ? it.line : price * qty);
      return (i + 1) + '. ' + name + ' — ' + qty + ' × ' + money(price) + ' = ' + money(line);
    }).join('\n');
  }

  function totalsBlock(t) {
    var out = '';
    out += 'Subtotal: ' + money(t.subtotal) + '\n';
    if (Number(t.discount)) out += 'Discount: - ' + money(t.discount) + '\n';
    out += 'Delivery: ' + (Number(t.delivery) === 0 ? 'Free' : money(t.delivery)) + '\n';
    out += '*TOTAL: ' + money(t.total) + '*';
    return out;
  }

  function customerBlock(c) {
    if (!c) return '';
    var rows = [];
    if (c.name) rows.push('Name: ' + c.name);
    if (c.phone) rows.push('Phone: ' + c.phone);
    if (c.city) rows.push('City: ' + c.city);
    if (c.address) rows.push('Address: ' + c.address + (c.landmark ? ' (' + c.landmark + ')' : ''));
    if (c.note) rows.push('Note: ' + c.note);
    return rows.length ? '\n\n*Customer*\n' + rows.join('\n') : '';
  }

  /* ---------------- cart se message (checkout se pehle) ---------------- */
  function cartMessage(lines, totals, customer) {
    var header = '*ORDER — ' + (S.storeName || 'BS Hardware And Sanitary') + '*';
    var body = 'I would like to place this order:\n\n' + lineItems(lines.map(function (l) {
      return { name: l.product.name, qty: l.qty, price: l.product.price, line: l.line };
    })) + '\n\n' + totalsBlock(totals);

    var pay = '\n\n*Payment:* Cash on Delivery / Easypaisa / JazzCash (please confirm)';
    return header + '\n\n' + body + customerBlock(customer) + pay + '\n\nPlease confirm this order. Thank you!';
  }

  /* ---------------- placed order ka message ---------------- */
  function orderMessage(order) {
    if (!order) return '';
    var pay = order.payment || {};
    var c = order.customer || {};

    var msg = '*ORDER CONFIRMATION — ' + (S.storeName || 'BS Hardware And Sanitary') + '*\n';
    msg += 'Order No: *' + (order.orderNumber || '—') + '*\n';
    msg += 'Status: ' + (order.status || 'pending').toUpperCase() + '\n\n';

    msg += '*Items*\n' + lineItems((order.items || []).map(function (it) {
      return { name: it.name, qty: it.qty, price: it.price, line: it.line };
    })) + '\n\n';

    msg += totalsBlock({
      subtotal: order.subtotal, discount: order.discount,
      delivery: order.delivery, total: order.total
    });

    msg += customerBlock(c);

    msg += '\n\n*Payment*\nMethod: ' + (pay.method || '—');
    if (pay.type !== 'cod') {
      if (pay.accountNumber) msg += '\nAccount: ' + pay.accountNumber + (pay.accountName ? ' (' + pay.accountName + ')' : '');
      if (pay.transactionId) msg += '\nTransaction ID: ' + pay.transactionId;
      msg += '\nScreenshot: ' + (pay.screenshotUrl ? 'uploaded ✓' : 'pending');
    } else {
      msg += '\nCash on delivery';
    }

    msg += '\n\n*This is my order confirmation — please verify.*';
    return msg;
  }

  function url(message) {
    return 'https://wa.me/' + NUMBER + '?text=' + encodeURIComponent(message || '');
  }

  function open(message) {
    var link = url(message);
    var w = null;
    try {
      /* 'noopener' feature na dein — warna window.open null deta hai
         aur hum ghalti se isi tab ko navigate kar dete hain. */
      w = window.open(link, '_blank');
      if (w) { try { w.opener = null; } catch (e) {} }
    } catch (e) { w = null; }

    if (!w) {
      /* Popup block hua: aik chhota anchor click se naya tab try karo,
         warna isi tab mein khol do (order data lost na ho is liye last). */
      var a = document.createElement('a');
      a.href = link; a.target = '_blank'; a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () {
        if (!document.hidden) window.location.href = link;
      }, 400);
    }
    return w;
  }

  window.BS = window.BS || {};
  window.BS.wa = {
    number: NUMBER,
    url: url,
    open: open,
    cartMessage: cartMessage,
    orderMessage: orderMessage
  };
})();
