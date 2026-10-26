/* ============================================================
   ui.js — shared shell: header, footer, product cards, toasts,
           cart badge, WhatsApp float, reveal-on-scroll
   ============================================================ */
(function () {
  'use strict';

  var S = window.BS_SETTINGS || {};
  var WA = 'https://wa.me/' + (S.whatsapp || '923102902382');

  function el(id) { return document.getElementById(id); }

  /* ---------------- header ---------------- */
  function headerHTML() {
    var page = document.body.dataset.page || '';
    var links = [
      { href: 'index.html', label: 'Home', key: 'home' },
      { href: 'shop.html', label: 'Shop All', key: 'shop' },
      { href: 'shop.html?cat=sanitary', label: 'Sanitary', key: 'sanitary' },
      { href: 'shop.html?cat=hand-tools', label: 'Hardware', key: 'hardware' },
      { href: 'faqs.html', label: 'FAQs', key: 'faqs' },
      { href: 'track.html', label: 'Track Order', key: 'track' }
    ];
    var nav = links.map(function (l) {
      return '<li><a href="' + l.href + '" class="' + (page === l.key ? 'active' : '') + '">' + l.label + '</a></li>';
    }).join('');

    return '' +
      '<div class="topbar">' +
        '<div class="container-bs">' +
          '<div class="topbar-msg"><span class="dot"></span>' + escapeHTML(S.announce || '') + '</div>' +
          '<div class="topbar-right d-flex gap-3 align-items-center">' +
            '<a href="track.html">Track Order</a>' +
            '<a href="admin-login.html">Admin</a>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<header class="site-header" id="siteHeader">' +
        '<div class="container-bs">' +
          '<nav class="nav-bs" aria-label="Main navigation">' +
            brandLockup('index.html') +
            '<ul class="nav-links">' + nav + '</ul>' +
            '<div class="nav-actions">' +
              '<button class="icon-btn" id="searchToggle" type="button" aria-label="Search products" aria-expanded="false">' + bsIcon('search', 19) + '</button>' +
              '<a class="icon-btn" href="cart.html" aria-label="View cart">' + bsIcon('cart', 19) +
                '<span class="cart-count" data-cart-count>0</span></a>' +
              '<button class="icon-btn nav-toggle" id="menuToggle" type="button" aria-label="Open menu" aria-expanded="false">' + bsIcon('menu', 22) + '</button>' +
            '</div>' +
          '</nav>' +
        '</div>' +
        '<div class="search-drawer" id="searchDrawer">' +
          '<div class="container-bs">' +
            '<form class="inner" action="shop.html" method="get" role="search">' +
              '<input class="search-input" type="search" name="q" id="headerSearch" placeholder="What are you looking for? e.g. tap, hammer, basin…" aria-label="Search products">' +
              '<button class="btn-bs" type="submit">' + bsIcon('search', 16) + ' Search</button>' +
            '</form>' +
          '</div>' +
        '</div>' +
      '</header>' +
      '<div class="mobile-menu-backdrop" id="menuBackdrop"></div>' +
      '<aside class="mobile-menu" id="mobileMenu" aria-hidden="true">' +
        '<div class="d-flex justify-content-between align-items-center">' +
          brandLockup('index.html') +
          '<button class="icon-btn" id="menuClose" type="button" aria-label="Close menu">' + bsIcon('close', 20) + '</button>' +
        '</div>' +
        '<ul>' + nav +
          '<li><a href="cart.html">Cart</a></li>' +
          '<li><a href="faqs.html">FAQs</a></li>' +
          '<li><a href="track.html">Track Order</a></li>' +
          '<li><a href="admin-login.html">Admin Panel</a></li>' +
        '</ul>' +
        '<div class="mt-4 d-grid gap-2">' +
          '<a class="btn-bs-red btn-bs" href="' + WA + '" target="_blank" rel="noopener">' + bsIcon('whatsapp', 18) + ' Chat on WhatsApp</a>' +
          '<a class="btn-bs-ghost btn-bs" href="track.html">' + bsIcon('box', 16) + ' Track order</a>' +
        '</div>' +
      '</aside>';
  }


  /* ---------------- brand / logo lockup (premium) ---------------- */
  function brandMarkSVG(size) {
    var s2 = size || 40;
    return '<svg class="brand-glyph" viewBox="0 0 72 72" width="' + s2 + '" height="' + s2 + '" role="img" aria-label="BS Hardware And Sanitary logo">' +
      '<rect x="1" y="1" width="70" height="70" rx="13" fill="#a3130b" class="bm-tile"/>' +
      '<rect x="5.5" y="5.5" width="61" height="61" rx="9" fill="none" stroke="#e8d3a3" stroke-width="1" opacity=".9"/>' +
      '<rect x="9" y="9" width="54" height="54" rx="6" fill="none" stroke="#f7f3ec" stroke-width=".5" opacity=".28"/>' +
      '<text x="36" y="47" text-anchor="middle" class="bm-letters" font-family="Playfair Display, Georgia, serif" ' +
        'font-weight="700" font-size="29" letter-spacing="-1.2" fill="#fdfbf6">BS</text>' +
      '<rect x="30" y="53.5" width="12" height="2" fill="#e8d3a3"/>' +
    '</svg>';
  }

  function brandLockup(href) {
    return '<a class="brand" href="' + (href || 'index.html') + '" aria-label="' + escapeHTML(S.storeName) + ' — home">' +
      '<span class="brand-mark">' + brandMarkSVG(42) + '</span>' +
      '<span class="brand-text">' +
        '<strong>BS Hardware</strong>' +
        '<small><i></i>And Sanitary<span>Karachi</span></small>' +
      '</span>' +
    '</a>';
  }

  /* ---------------- footer ---------------- */
  function footerHTML() {
    var cats = (window.BS.data.categories || []).slice(0, 6).map(function (c) {
      return '<li><a href="shop.html?cat=' + c.id + '">' + c.name + '</a></li>';
    }).join('');

    return '' +
      '<footer class="footer" id="contact">' +

        /* ---------- 1. RED CTA BAND (alag section) ---------- */
        '<div class="footer-cta">' +
          '<div class="container-bs footer-cta-inner">' +
            '<div class="footer-cta-copy">' +
              '<span class="footer-cta-eyebrow">Order &amp; support</span>' +
              '<h2 class="footer-cta-title">Send the list,<br>get the rate.</h2>' +
              '<p>Hardware or sanitary, bulk or a single piece — send your list on WhatsApp, ' +
                'we come back with the rate and availability.</p>' +
            '</div>' +
            '<div class="footer-cta-actions">' +
              '<a class="footer-wa-btn" href="' + WA + '" target="_blank" rel="noopener" aria-label="Order on WhatsApp">' +
                bsIcon('whatsapp', 26) + '<span>Order on WhatsApp</span></a>' +
              '<a class="footer-cta-link" href="shop.html">Or browse the shop yourself ' +
                bsIcon('arrowRight', 16) + '</a>' +
            '</div>' +
          '</div>' +
          '<div class="footer-cta-strip" aria-hidden="true"></div>' +
        '</div>' +

        /* ---------- 2. CREAM BODY with pattern ---------- */
        '<div class="footer-body">' +
          '<div class="container-bs">' +
            '<div class="footer-grid">' +
              '<div class="footer-brand-col">' +
                brandLockup('index.html') +
                '<p class="footer-blurb">Hardware, sanitary, tools and electrical — the full range ' +
                  'under one roof. Genuine brands, honest prices, delivered across Karachi.</p>' +
                '<div class="footer-social">' +
                  '<a class="wa" href="' + WA + '" target="_blank" rel="noopener" aria-label="Chat on WhatsApp" title="WhatsApp">' + bsIcon('whatsapp', 22) + '</a>' +
                  '<a href="track.html" aria-label="Track your order" title="Track order">' + bsIcon('box', 19) + '</a>' +
                  '<a href="shop.html" aria-label="Shop all products" title="Shop">' + bsIcon('cart', 19) + '</a>' +
                '</div>' +
              '</div>' +

              '<div class="footer-col"><h4>Shop <i></i></h4><ul>' +
                '<li><a href="shop.html">All Products</a></li>' +
                '<li><a href="shop.html?sort=new">New Arrivals</a></li>' +
                '<li><a href="shop.html?badge=sale">On Sale</a></li>' +
                '<li><a href="cart.html">Your Cart</a></li>' +
                '<li><a href="track.html">Track Order</a></li>' +
                '<li><a href="faqs.html">FAQs</a></li>' +
              '</ul></div>' +

              '<div class="footer-col"><h4>Categories <i></i></h4><ul>' + cats + '</ul></div>' +

              '<div class="footer-col footer-contact"><h4>Visit <i></i></h4>' +
                '<div class="footer-address">' +
                  '<span class="footer-pin">' + bsIcon('location', 18) + '</span>' +
                  '<div><strong>Orangi Town</strong><br>Karachi, Pakistan</div>' +
                '</div>' +
                '<div class="footer-hours">' +
                  '<span class="footer-pin">' + bsIcon('clock', 18) + '</span>' +
                  '<div><strong>Mon – Sat</strong><br>9:00 AM – 9:00 PM</div>' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="footer-watermark" aria-hidden="true"><span>BS</span> HARDWARE</div>' +
        '</div>' +

        /* ---------- 3. INK BOTTOM BAR ---------- */
        '<div class="footer-bottom-wrap">' +
          '<div class="container-bs footer-bottom">' +
            '<span>© <span id="yr"></span> ' + escapeHTML(S.storeName) + ' · All rights reserved.</span>' +
            '<span class="footer-bottom-links">' +
              '<a href="faqs.html">FAQs</a>' +
              '<a href="track.html">Track Order</a>' +
              '<a href="admin-login.html">Admin Panel</a>' +
              '<span class="footer-sq"><i></i><i></i><i></i></span>' +
            '</span>' +
          '</div>' +
        '</div>' +
      '</footer>' +
      '<a class="wa-float" href="' + WA + '" target="_blank" rel="noopener" aria-label="Chat on WhatsApp">' +
        bsIcon('whatsapp', 30) + '<span class="wa-tip">Chat on WhatsApp</span>' +
      '</a>';
  }

  function escapeHTML(str) {
    return String(str == null ? '' : str).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ---------------- product card ---------------- */
  function badgeHTML(p) {
    var out = [];
    if (Number(p.stock) === 0) out.push('<span class="p-badge p-badge--out">Out of stock</span>');
    if (p.badge === 'sale' && p.oldPrice > p.price) out.push('<span class="p-badge p-badge--red">Sale</span>');
    if (p.badge === 'new') out.push('<span class="p-badge">New</span>');
    if (p.badge === 'bestseller') out.push('<span class="p-badge">Bestseller</span>');
    if (Number(p.stock) > 0 && Number(p.stock) <= 8) out.push('<span class="p-badge p-badge--red">Low stock</span>');
    return out.join('');
  }

  function stockHTML(p) {
    var s = Number(p.stock) || 0;
    if (s === 0) return '<span class="p-stock out">Out of stock</span>';
    if (s <= 8) return '<span class="p-stock low">Only ' + s + ' left</span>';
    return '<span class="p-stock">In stock</span>';
  }

  function cardHTML(p) {
    var catName = (window.BS.data.categoryName || function () { return ''; })(p.category);
    var href = 'product.html?id=' + encodeURIComponent(p.id);
    var img = p.image || 'assets/img/products/placeholder.svg';
    var hasOld = Number(p.oldPrice) > Number(p.price);
    return '' +
      '<article class="p-card reveal" data-product="' + escapeHTML(p.id) + '">' +
        '<a class="p-media" href="' + href + '" aria-label="' + escapeHTML(p.name) + '">' +
          '<img src="' + escapeHTML(img) + '" alt="' + escapeHTML(p.name) + '" loading="lazy" ' +
            'onerror="this.onerror=null;this.src=\'assets/img/products/placeholder.svg\'">' +
          '<div class="p-badges">' + badgeHTML(p) + '</div>' +
          '<span class="p-quick" aria-hidden="true">' + bsIcon('eye', 18) + '</span>' +
        '</a>' +
        '<div class="p-body">' +
          '<span class="p-cat">' + escapeHTML(catName) + '</span>' +
          '<h3 class="p-name"><a href="' + href + '">' + escapeHTML(p.name) + '</a></h3>' +
          '<div class="p-price-row">' +
            '<span class="p-price">' + BS.money(p.price) + '</span>' +
            (hasOld ? '<span class="p-old">' + BS.money(p.oldPrice) + '</span>' : '') +
            stockHTML(p) +
          '</div>' +
          '<button class="p-add" type="button" data-add="' + escapeHTML(p.id) + '" ' +
            (Number(p.stock) === 0 ? 'disabled' : '') + '>' +
            bsIcon('cart', 15) + '<span>' + (Number(p.stock) === 0 ? 'Out of stock' : 'Add to cart') + '</span>' +
          '</button>' +
        '</div>' +
      '</article>';
  }

  function skeletons(n, cols) {
    var out = '';
    for (var i = 0; i < (n || 4); i++) {
      out += '<div class="p-skeleton"><div class="sk-media"></div>' +
        '<div class="sk-line"></div><div class="sk-line short"></div></div>';
    }
    return out;
  }

  /* ---------------- toast ---------------- */
  /**
   * toast(message, type, opts)
   * opts = { actionText: 'WhatsApp order', actionFn: fn }  -> clickable action
   */
  function toast(message, type, opts) {
    var stack = document.querySelector('.toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'toast-stack';
      document.body.appendChild(stack);
    }
    var icons = { success: 'checkCircle', error: 'alert', warn: 'alert', info: 'box' };
    var t = document.createElement('div');
    t.className = 'toast-bs ' + (type || 'info');
    t.setAttribute('role', 'status');
    t.innerHTML = bsIcon(icons[type] || 'box', 18) + '<div>' + escapeHTML(message) +
      (opts && opts.actionText ? '<button type="button" class="toast-action">' + escapeHTML(opts.actionText) + '</button>' : '') +
      '</div>';
    stack.appendChild(t);

    if (opts && opts.actionText && typeof opts.actionFn === 'function') {
      var btn = t.querySelector('.toast-action');
      btn.addEventListener('click', function () {
        try { opts.actionFn(); } catch (e) { console.warn(e); }
        t.classList.add('hide');
        setTimeout(function () { t.remove(); }, 300);
      });
    }

    setTimeout(function () {
      t.classList.add('hide');
      setTimeout(function () { t.remove(); }, 300);
    }, opts && opts.actionText ? 8000 : 3800);
  }

  /* cart ko WhatsApp order message mein badal kar khol deta hai */
  function openWhatsAppOrder() {
    if (!window.BS.wa) { toast('WhatsApp helper did not load.', 'error'); return; }
    BS.fb.getProducts().then(function (list) {
      var lines = BS.cart.detailed(list);
      if (!lines.length) { toast('Your cart is empty — add a product first.', 'warn'); return; }
      var saved = null;
      try { saved = JSON.parse(localStorage.getItem('bsh_customer_v1') || 'null'); } catch (e) {}
      BS.wa.open(BS.wa.cartMessage(lines, BS.cart.totals(lines), saved));
      toast('Opening WhatsApp — press Send to confirm.', 'success');
    }).catch(function () {
      window.location.href = 'cart.html';
    });
  }

  /* ---------------- cart badge ---------------- */
  function paintCartBadge() {
    var n = BS.cart.count();
    document.querySelectorAll('[data-cart-count]').forEach(function (b) {
      b.textContent = n;
      b.style.display = n > 0 ? 'grid' : 'none';
      b.classList.remove('bump');
      void b.offsetWidth;
      b.classList.add('bump');
    });
  }

  /* ---------------- add-to-cart (delegated) ---------------- */
  function bindAddToCart() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-add]');
      if (!btn) return;
      e.preventDefault();
      if (btn.disabled) return;

      var id = btn.getAttribute('data-add');
      var label = btn.querySelector('span') || btn;
      var original = label.innerHTML;
      btn.disabled = true;

      BS.fb.getProduct(id).then(function (product) {
        if (!product) throw new Error('Product not found.');
        var res = BS.cart.add(product, 1);
        if (!res.ok) {
          toast(res.message, 'error');
          return;
        }
        toast(product.name + ' added to cart', 'success', {
          actionText: 'WhatsApp order →',
          actionFn: openWhatsAppOrder
        });
        btn.classList.add('added');
        label.innerHTML = bsIcon('check', 15) + ' Added';
        setTimeout(function () {
          btn.classList.remove('added');
          label.innerHTML = original;
          btn.disabled = Number(product.stock) === 0;
        }, 1600);
      }).catch(function (err) {
        toast(err.message || 'Something went wrong, please try again.', 'error');
      }).finally(function () {
        if (!btn.classList.contains('added')) btn.disabled = Number(btn.dataset.out) === 1;
      });
    });

    document.addEventListener('bs:cart', function () { paintCartBadge(); });
  }

  /* ---------------- reveal on scroll ---------------- */
  function initReveal() {
    var nodes = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
      nodes.forEach(function (n) { n.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('in');
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: '160px 0px -6% 0px', threshold: 0.05 });
    nodes.forEach(function (n) { io.observe(n); });

    /* Failsafe: agar kisi wajah se observer na chale / element viewport se
       pehle hi guzar jaye — 2.5s baad upar wale sab elements reveal kar do. */
    clearTimeout(initReveal._t);
    initReveal._t = setTimeout(function () {
      document.querySelectorAll('.reveal:not(.in)').forEach(function (n) {
        var r = n.getBoundingClientRect();
        if (r.top < window.innerHeight * 1.6) n.classList.add('in');
      });
    }, 2500);
  }

  /* scroll par bhi ek light check (fast scroll / bfcache cases) */
  window.addEventListener('scroll', function () {
    if (window.scrollY < 40) return;
    document.querySelectorAll('.reveal:not(.in)').forEach(function (n) {
      if (n.getBoundingClientRect().top < window.innerHeight * 1.2) n.classList.add('in');
    });
  }, { passive: true });

  /* ---------------- shell init ---------------- */
  function initShell() {
    var head = el('site-header');
    var foot = el('site-footer');
    if (head) head.innerHTML = headerHTML();
    if (foot) foot.innerHTML = footerHTML();
    else if (head) document.body.insertAdjacentHTML('beforeend', footerHTML());

    var yr = el('yr');
    if (yr) yr.textContent = new Date().getFullYear();

    /* search drawer */
    var drawer = el('searchDrawer');
    var searchToggle = el('searchToggle');
    if (searchToggle && drawer) {
      searchToggle.addEventListener('click', function () {
        var open = drawer.classList.toggle('open');
        searchToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (open) setTimeout(function () { var i = el('headerSearch'); if (i) i.focus(); }, 180);
      });
      var q = BS.qs('q');
      if (q && el('headerSearch')) el('headerSearch').value = q;
    }

    /* mobile menu */
    var menu = el('mobileMenu'), backdrop = el('menuBackdrop');
    function closeMenu() {
      if (!menu) return;
      menu.classList.remove('open');
      backdrop.classList.remove('open');
      menu.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('intro-lock');
    }
    if (el('menuToggle')) {
      el('menuToggle').addEventListener('click', function () {
        menu.classList.add('open');
        backdrop.classList.add('open');
        menu.setAttribute('aria-hidden', 'false');
      });
    }
    if (el('menuClose')) el('menuClose').addEventListener('click', closeMenu);
    if (backdrop) backdrop.addEventListener('click', closeMenu);
    if (menu) menu.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', closeMenu); });

    /* sticky header shadow */
    var siteHeader = el('siteHeader');
    if (siteHeader) {
      var onScroll = function () {
        siteHeader.classList.toggle('scrolled', window.scrollY > 12);
        document.body.classList.toggle('nav-compact', window.scrollY > 90);
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }

    /* newsletter */
    var news = el('newsletterForm');
    if (news) {
      news.addEventListener('submit', function (e) {
        e.preventDefault();
        var input = news.querySelector('input[type=email]');
        if (!input.value || input.value.indexOf('@') < 0) {
          toast('Enter a valid email address.', 'error');
          return;
        }
        toast('Thank you! You are on the offers list.', 'success');
        news.reset();
      });
    }

    paintCartBadge();
    bindAddToCart();
    initReveal();
  }

  window.BS = window.BS || {};
  window.BS.ui = {
    cardHTML: cardHTML, skeletons: skeletons, toast: toast,
    openWhatsAppOrder: openWhatsAppOrder,
    initReveal: initReveal, paintCartBadge: paintCartBadge,
    escapeHTML: escapeHTML, headerHTML: headerHTML, footerHTML: footerHTML,
    brandLockup: brandLockup, brandMarkSVG: brandMarkSVG
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initShell);
  } else {
    initShell();
  }
})();
