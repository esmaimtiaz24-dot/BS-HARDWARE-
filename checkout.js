/* ============================================================
   checkout.js
   ------------------------------------------------------------
   • Payment method select  -> account number + account name show
   • Online payment         -> Transaction ID + screenshot REQUIRED
   • Order payload (items, customer, payment proof, totals)
     Firestore collection "orders" mein save hota hai (demo mode:
     localStorage), screenshot Storage folder "payment-proofs/".
   ============================================================ */
(function () {
  'use strict';

  var S = window.BS_SETTINGS || {};
  var payments = (window.BS.data && window.BS.data.payments) || [];
  var lines = [];
  var totals = {};
  var allProducts = [];
  var proofs = {};          /* methodId -> {file, url} */
  var submitting = false;
  var FALLBACK = 'assets/img/products/placeholder.svg';

  /* ---------------- payment UI ---------------- */
  function payOptionHTML(pay) {
    var isCod = pay.type === 'cod';
    var head =
      '<label class="pay-head" for="pay-' + pay.id + '">' +
        '<span class="pay-badge ' + pay.color + '" style="border:0;background:transparent;padding:0">' +
          '<i style="width:32px;height:32px">' + (pay.color === 'ep' ? 'EP' : pay.color === 'np' ? 'NP' : pay.color === 'jc' ? 'JC' : '₹') + '</i>' +
        '</span>' +
        '<span><span class="pay-name">' + BS.esc(pay.label) + '</span>' +
          '<span class="pay-tag" style="display:block">' + BS.esc(pay.sub) + '</span></span>' +
        '<span class="radio-dot"></span>' +
      '</label>';

    var details = '';
    if (isCod) {
      details =
        '<div class="pay-details">' +
          '<div class="pay-warning">' + bsIcon('cash', 18) +
            '<div>Pay the courier <strong data-amount-due>Rs 0</strong> — this includes the products plus ' +
            'Rs ' + (Number(S.deliveryFee) || 250) + ' delivery. Please keep the cash ready.</div>' +
          '</div>' +
          '<p style="font-size:.78rem;color:var(--muted);margin:0">To confirm a COD order we may call or message you on WhatsApp.</p>' +
        '</div>';
    } else {
      details =
        '<div class="pay-details">' +
          '<div class="acct-grid">' +
            '<div class="acct-box"><small>Account number</small><strong>' + BS.esc(pay.number) + '</strong>' +
              '<button class="copy-btn" type="button" data-copy="' + BS.esc(pay.number) + '" aria-label="Copy account number">' +
                bsIcon('copy', 14) + '</button></div>' +
            '<div class="acct-box"><small>Account name</small><strong>' + BS.esc(pay.name) + '</strong></div>' +
          '</div>' +
          '<div class="pay-warning">' + bsIcon('alert', 18) +
            '<div>Transfer <strong data-amount-due>Rs 0</strong> to exactly this account. ' +
            'After the transfer enter the <strong>transaction ID</strong> and <strong>upload the screenshot</strong> — ' +
            'that is how the order gets verified.</div>' +
          '</div>' +
          '<div class="mb-3">' +
            '<label class="form-label-bs" for="txn-' + pay.id + '">Transaction ID *</label>' +
            '<input class="input-bs" type="text" id="txn-' + pay.id + '" data-txn ' +
              'placeholder="TID / reference number" autocomplete="off" inputmode="text">' +
            '<div class="err-msg" data-txn-err>A transaction ID is required (at least 4 characters).</div>' +
          '</div>' +
          '<div class="form-label-bs">Payment screenshot *</div>' +
          '<label class="upload-drop" data-drop>' +
            '<input type="file" accept="image/png,image/jpeg,image/jpg,image/webp" data-file>' +
            bsIcon('upload', 26) +
            '<strong>Upload payment screenshot</strong>' +
            '<span>PNG / JPG · max 6MB · click or drag the file in</span>' +
          '</label>' +
          '<div class="upload-preview" data-preview></div>' +
          '<div class="progress mt-2 hidden" data-progress-wrap style="background:#fff">' +
            '<div class="progress-bar" data-progress style="width:0%"></div></div>' +
          '<div class="err-msg" data-file-err>A payment screenshot is required.</div>' +
        '</div>';
    }

    return '<div class="pay-option" data-pay="' + pay.id + '">' +
      '<input type="radio" name="payment" id="pay-' + pay.id + '" value="' + pay.id + '">' +
      head + details + '</div>';
  }

  function renderPayments() {
    var wrap = document.getElementById('payOptions');
    if (!wrap) return;
    wrap.innerHTML = payments.map(payOptionHTML).join('');
    updateAmounts();
    bindPayments();
  }

  function updateAmounts() {
    var t = totals.total || 0;
    document.querySelectorAll('[data-amount-due]').forEach(function (n) {
      n.textContent = BS.money(t);
    });
    var feeEl = document.getElementById('agreeFee');
    if (feeEl) feeEl.textContent = Number(S.deliveryFee) || 250;
  }

  function selectedOption() {
    var radio = document.querySelector('input[name="payment"]:checked');
    return radio ? radio.closest('.pay-option') : null;
  }

  function selectedPayment() {
    var radio = document.querySelector('input[name="payment"]:checked');
    if (!radio) return null;
    return payments.filter(function (p) { return p.id === radio.value; })[0] || null;
  }

  function bindPayments() {
    var wrap = document.getElementById('payOptions');
    if (!wrap) return;

    wrap.addEventListener('change', function (e) {
      if (e.target.name === 'payment') {
        wrap.querySelectorAll('.pay-option').forEach(function (o) {
          o.classList.toggle('selected', o.querySelector('input').checked);
        });
        clearError('payment');
      }
      if (e.target.matches('[data-file]')) handleFile(e.target);
    });

    wrap.addEventListener('click', function (e) {
      var copyBtn = e.target.closest('[data-copy]');
      if (copyBtn) {
        e.preventDefault();
        copyText(copyBtn.dataset.copy, copyBtn);
        return;
      }
      var rm = e.target.closest('[data-remove-file]');
      if (rm) {
        e.preventDefault();
        var opt = rm.closest('.pay-option');
        clearProof(opt);
      }
    });

    /* drag & drop */
    wrap.querySelectorAll('[data-drop]').forEach(function (drop) {
      ['dragenter', 'dragover'].forEach(function (ev) {
        drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('dragover'); });
      });
      ['dragleave', 'drop'].forEach(function (ev) {
        drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('dragover'); });
      });
      drop.addEventListener('drop', function (e) {
        var f = e.dataTransfer.files && e.dataTransfer.files[0];
        if (f) handleFileObject(f, drop.closest('.pay-option'));
      });
    });
  }

  function handleFile(input) {
    var opt = input.closest('.pay-option');
    var file = input.files && input.files[0];
    if (!file) return;
    handleFileObject(file, opt);
  }

  function handleFileObject(file, opt) {
    if (!opt) return;
    if (!/^image\//.test(file.type)) {
      BS.ui.toast('Please upload an image file only (PNG/JPG).', 'error');
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      BS.ui.toast('The screenshot must be under 6MB.', 'error');
      return;
    }

    var methodId = opt.dataset.pay;
    if (proofs[methodId] && proofs[methodId].url) URL.revokeObjectURL(proofs[methodId].url);

    var url = URL.createObjectURL(file);
    proofs[methodId] = { file: file, url: url };

    var preview = opt.querySelector('[data-preview]');
    if (preview) {
      preview.classList.add('show');
      preview.innerHTML =
        '<img src="' + url + '" alt="Payment screenshot preview">' +
        '<div class="meta"><strong>' + BS.esc(file.name) + '</strong>' +
          '<span>' + (file.size / 1024).toFixed(0) + ' KB · ready to upload</span></div>' +
        '<button class="icon-btn" type="button" data-remove-file aria-label="Remove screenshot" style="width:34px;height:34px">' +
          bsIcon('trash', 15) + '</button>';
    }
    clearError('file');
  }

  function clearProof(opt) {
    var id = opt.dataset.pay;
    if (proofs[id] && proofs[id].url) URL.revokeObjectURL(proofs[id].url);
    delete proofs[id];
    var preview = opt.querySelector('[data-preview]');
    if (preview) { preview.classList.remove('show'); preview.innerHTML = ''; }
    var fileInput = opt.querySelector('[data-file]');
    if (fileInput) fileInput.value = '';
  }

  function copyText(text, btn) {
    function done() {
      BS.ui.toast('Copied: ' + text, 'success');
      var old = btn.innerHTML;
      btn.innerHTML = bsIcon('check', 14);
      setTimeout(function () { btn.innerHTML = old; }, 1400);
    }
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { BS.ui.toast('Copy failed — please type it manually.', 'error'); }
      ta.remove();
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done).catch(fallback);
    } else fallback();
  }

  /* ---------------- summary ---------------- */
  function renderSummary() {
    lines = BS.cart.detailed(allProducts);
    totals = BS.cart.totals(lines);

    var mini = document.getElementById('miniItems');
    if (mini) {
      mini.innerHTML = lines.map(function (l) {
        return '<div class="mini-item">' +
          '<img src="' + BS.esc(l.product.image || FALLBACK) + '" alt="" ' +
            'onerror="this.onerror=null;this.src=\'' + FALLBACK + '\'">' +
          '<div><div class="mi-name">' + BS.esc(l.product.name) + '</div>' +
            '<div class="mi-qty">Qty: ' + l.qty + ' × ' + BS.money(l.product.price) + '</div></div>' +
          '<div class="mi-price">' + BS.money(l.line) + '</div></div>';
      }).join('');
    }

    var set = function (id, txt) { var n = document.getElementById(id); if (n) n.textContent = txt; };
    set('coSubtotal', BS.money(totals.subtotal));
    set('coDelivery', totals.delivery === 0 ? 'Free' : BS.money(totals.delivery));
    set('coTotal', BS.money(totals.total));
    set('coDiscount', '− ' + BS.money(totals.discount));
    var dRow = document.getElementById('coDiscountRow');
    if (dRow) dRow.classList.toggle('hidden', !totals.discount);

    updateAmounts();

    var empty = document.getElementById('checkoutEmpty');
    var layout = document.getElementById('checkoutLayout');
    if (!lines.length) {
      if (empty) empty.classList.remove('hidden');
      if (layout) layout.classList.add('hidden');
    } else {
      if (empty) empty.classList.add('hidden');
      if (layout) layout.classList.remove('hidden');
    }
  }

  /* ---------------- validation ---------------- */
  function clearError(key) {
    if (key === 'txn' || key === 'file') {
      var scope = selectedOption();
      var node = scope ? scope.querySelector(key === 'txn' ? '[data-txn-err]' : '[data-file-err]') : null;
      if (node) node.classList.remove('show');
      var fld = scope ? scope.querySelector(key === 'txn' ? '[data-txn]' : '[data-file]') : null;
      if (fld) fld.classList.remove('field-error');
      return;
    }
    var msg = document.querySelector('[data-err="' + key + '"], #agreeErr');
    if (key === 'agree') {
      var a = document.getElementById('agreeErr'); if (a) a.classList.remove('show');
      return;
    }
    if (key === 'payment') {
      var p = document.getElementById('paymentErr'); if (p) p.classList.remove('show');
      return;
    }
    if (msg) msg.classList.remove('show');
    var field = document.getElementById(key);
    if (field) field.classList.remove('field-error');
  }

  function showError(key) {
    if (key === 'agree') {
      var a = document.getElementById('agreeErr'); if (a) a.classList.add('show');
      return;
    }
    if (key === 'file') {
      var optF = selectedOption();
      var f = optF ? optF.querySelector('[data-file-err]') : document.querySelector('[data-file-err]');
      if (f) f.classList.add('show');
      return;
    }
    if (key === 'txn') {
      var optT = selectedOption();
      var t = optT ? optT.querySelector('[data-txn-err]') : document.querySelector('[data-txn-err]');
      if (t) t.classList.add('show');
      var ti = optT ? optT.querySelector('[data-txn]') : document.querySelector('[data-txn]');
      if (ti) ti.classList.add('field-error');
      return;
    }
    var msg = document.querySelector('[data-err="' + key + '"]');
    if (msg) msg.classList.add('show');
    var field = document.getElementById(key);
    if (field) field.classList.add('field-error');
  }

  function validate() {
    var ok = true;
    var name = document.getElementById('fullName').value.trim();
    var phone = document.getElementById('phone').value.replace(/\D/g, '');
    var email = document.getElementById('email').value.trim();
    var city = document.getElementById('city').value.trim();
    var address = document.getElementById('address').value.trim();

    ['fullName', 'phone', 'email', 'city', 'address'].forEach(clearError);
    clearError('txn'); clearError('file'); clearError('agree'); clearError('payment');

    if (name.length < 3) { showError('fullName'); ok = false; }
    if (!(phone.length >= 10 && phone.length <= 13)) { showError('phone'); ok = false; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { showError('email'); ok = false; }
    if (city.length < 2) { showError('city'); ok = false; }
    if (address.length < 10) { showError('address'); ok = false; }

    var pay = selectedPayment();
    if (!pay) {
      var p = document.getElementById('paymentErr');
      if (p) p.classList.add('show');
      BS.ui.toast('Payment method chunein.', 'warn');
      ok = false;
    }

    if (pay && pay.requiresProof) {
      var opt = selectedOption();
      var txn = opt ? (opt.querySelector('[data-txn]').value || '').trim() : '';
      if (txn.length < 4) { showError('txn'); ok = false; }
      if (!proofs[pay.id] || !proofs[pay.id].file) { showError('file'); ok = false; }
    }

    if (!document.getElementById('agree').checked) { showError('agree'); ok = false; }

    if (!ok) {
      var firstErr = document.querySelector('.err-msg.show');
      if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
      BS.ui.toast('Some details are missing — check the red notes below.', 'error');
    }
    return ok;
  }

  /* ---------------- place order ---------------- */
  function setLoading(on, text) {
    submitting = on;
    var btn = document.getElementById('placeOrder');
    if (!btn) return;
    btn.disabled = on;
    if (on) {
      btn.dataset.html = btn.dataset.html || btn.innerHTML;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> ' + (text || 'Processing…');
    } else if (btn.dataset.html) {
      btn.innerHTML = btn.dataset.html;
    }
  }

  function progress(percent) {
    var opt = selectedOption();
    if (!opt) return;
    var wrap = opt.querySelector('[data-progress-wrap]');
    var bar = opt.querySelector('[data-progress]');
    if (wrap) wrap.classList.remove('hidden');
    if (bar) bar.style.width = Math.min(100, Math.max(2, percent)) + '%';
  }

  function placeOrder() {
    if (submitting) return;
    if (!lines.length) { BS.ui.toast('Your cart is empty.', 'error'); return; }
    if (!validate()) return;

    var pay = selectedPayment();
    var opt = selectedOption();
    var txn = (pay.requiresProof && opt) ? (opt.querySelector('[data-txn]').value || '').trim() : '';

    setLoading(true, 'Placing your order…');

    var proofPromise = Promise.resolve('');
    if (pay.requiresProof) {
      setLoading(true, 'Uploading screenshot…');
      proofPromise = BS.fb.uploadFile(proofs[pay.id].file, 'payment-proofs', progress);
    }

    proofPromise.then(function (proofUrl) {
      setLoading(true, 'Saving your order…');

      var orderNumber = BS.fb.makeOrderNumber();
      var payload = {
        orderNumber: orderNumber,
        customer: {
          name: document.getElementById('fullName').value.trim(),
          phone: document.getElementById('phone').value.trim(),
          email: document.getElementById('email').value.trim(),
          city: document.getElementById('city').value.trim(),
          address: document.getElementById('address').value.trim(),
          landmark: document.getElementById('landmark').value.trim(),
          note: document.getElementById('note').value.trim()
        },
        items: lines.map(function (l) {
          var cost = Number(l.product.costPrice) || 0;
          return {
            id: l.id, name: l.product.name, sku: l.product.sku || '',
            price: Number(l.product.price), qty: l.qty, line: l.line,
            cost: cost, costLine: cost * l.qty,
            category: l.product.category || '',
            image: l.product.image || ''
          };
        }),
        cogs: lines.reduce(function (sum, l) {
          return sum + (Number(l.product.costPrice) || 0) * l.qty;
        }, 0),
        subtotal: totals.subtotal,
        discount: totals.discount,
        delivery: totals.delivery,
        total: totals.total,
        coupon: totals.coupon || null,
        itemCount: totals.count,
        payment: {
          methodId: pay.id,
          method: pay.label,
          type: pay.type,
          accountNumber: pay.number || '',
          accountName: pay.name || '',
          transactionId: txn,
          screenshotUrl: proofUrl,
          proofUploaded: !!proofUrl,
          status: pay.type === 'cod' ? 'cod-pending' : 'pending-verification'
        },
        source: 'website',
        firebaseMode: BS.fb.mode
      };

      return BS.fb.createOrder(payload).then(function (res) {
        /* customer details yaad rakho (agli dafa ke liye) */
        try {
          localStorage.setItem('bsh_customer_v1', JSON.stringify({
            name: payload.customer.name, phone: payload.customer.phone,
            email: payload.customer.email, city: payload.customer.city,
            address: payload.customer.address, landmark: payload.customer.landmark
          }));
        } catch (e) {}

        var full = Object.assign({}, payload, { id: res.id || '', status: 'pending' });
        try { sessionStorage.setItem('bsh_last_order', JSON.stringify(full)); } catch (e) {}

        BS.cart.clear();
        window.location.href = 'order-success.html?no=' + encodeURIComponent(res.orderNumber || orderNumber);
      });
    }).catch(function (err) {
      console.error(err);
      setLoading(false);
      BS.ui.toast(err.message || 'Order could not be placed. Check your connection and try again.', 'error');
    });
  }

  /* ---------------- prefill ---------------- */
  function prefill() {
    try {
      var c = JSON.parse(localStorage.getItem('bsh_customer_v1') || 'null');
      if (!c) return;
      ['name:fullName', 'phone:phone', 'email:email', 'city:city', 'address:address', 'landmark:landmark'].forEach(function (pair) {
        var k = pair.split(':');
        var elm = document.getElementById(k[1]);
        if (elm && c[k[0]]) elm.value = c[k[0]];
      });
    } catch (e) {}
  }

  /* ---------------- boot ---------------- */
  function boot() {
    prefill();
    document.getElementById('placeOrder').addEventListener('click', placeOrder);

    document.getElementById('agree').addEventListener('change', function () {
      if (this.checked) clearError('agree');
    });

    /* delivery method required message container */
    var payBlock = document.getElementById('payOptions');
    if (payBlock && !document.getElementById('paymentErr')) {
      payBlock.insertAdjacentHTML('afterend',
        '<div class="err-msg" id="paymentErr">Please choose a payment method.</div>');
    }

    BS.fb.getProducts().then(function (products) {
      allProducts = products;
      renderSummary();
      renderPayments();
      if (!lines.length) BS.ui.toast('Your cart is empty — add a few products first.', 'warn');
    }).catch(function (err) {
      console.error(err);
      BS.ui.toast('Products could not load. Please refresh.', 'error');
    });

    document.addEventListener('bs:cart', function () { renderSummary(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
