/* ============================================================
   firebase-service.js — single data layer for the whole site
   ------------------------------------------------------------
   BS.fb.* ka same interface teen modes mein chalta hai:
     • "rtdb"      : Realtime Database + Storage + Auth (databaseURL set ho)
     • "firebase"  : Firestore + Storage + Auth (sirf projectId set ho)
     • "demo"      : localStorage (Firebase ke baghair testing ke liye)

   Realtime Database tree
     /products/{id}   /orders/{id}   /expenses/{id}

   Firestore collections
     products · orders · expenses

   Uploads -> Storage folder "products/" aur "payment-proofs/"
   ============================================================ */
(function () {
  'use strict';

  var cfg = window.BS_FIREBASE_CONFIG || {};
  var S = window.BS_SETTINGS || {};

  var LS = {
    products: 'bsh_products_v1',
    orders: 'bsh_orders_v1',
    expenses: 'bsh_expenses_v1',
    seeded: 'bsh_seeded_v1',
    admin: 'bsh_admin_session',
    fbSeeded: 'bsh_fb_seeded_v1'
  };

  var state = {
    mode: 'demo',
    ready: false,
    app: null, db: null, auth: null, storage: null,
    lastError: ''
  };

  /* ---------------- helpers ---------------- */
  function hasRtdbUrl() {
    return !!(cfg && cfg.databaseURL &&
      String(cfg.databaseURL).indexOf('PASTE_') !== 0 &&
      /^https?:\/\//.test(String(cfg.databaseURL)));
  }

  function isLive() {
    return state.mode === 'firebase' || state.mode === 'rtdb' || state.mode === 'supabase';
  }

  /* ---- session flag that survives blocked storage ----
     Private windows, sandboxed iframes and some file:// setups block
     sessionStorage. The admin session must keep working there, so fall back to
     localStorage and finally to an in-memory value. */
  var memStore = {};
  var NAME_TAG = 'bsh_store:';

  /* window.name survives page navigation even when both storages are blocked
     (sandboxed iframes, private windows), so the flag is mirrored there. */
  function nameWrite() {
    try { window.name = NAME_TAG + JSON.stringify(memStore); } catch (e) {}
  }
  function nameRead() {
    try {
      if (window.name && String(window.name).indexOf(NAME_TAG) === 0) {
        var o = JSON.parse(String(window.name).slice(NAME_TAG.length));
        if (o && typeof o === 'object') return o;
      }
    } catch (e) {}
    return null;
  }

  function sessionSet(key, val) {
    try { sessionStorage.setItem(key, val); } catch (e) {}
    try { localStorage.setItem(key, val); } catch (e) {}
    memStore[key] = val;
    nameWrite();
  }
  function sessionGet(key) {
    try { var v = sessionStorage.getItem(key); if (v !== null) return v; } catch (e) {}
    try { var w = localStorage.getItem(key); if (w !== null) return w; } catch (e) {}
    if (key in memStore) return memStore[key];
    var n = nameRead();
    return (n && key in n) ? n[key] : null;
  }
  function sessionDel(key) {
    try { sessionStorage.removeItem(key); } catch (e) {}
    try { localStorage.removeItem(key); } catch (e) {}
    delete memStore[key];
    nameWrite();
  }

  /* ---- Realtime Database helpers ---- */
  function rref(path) { return state.rtdb.ref(path); }

  function rOnce(path) {
    return rref(path).once('value').then(function (snap) { return snap.val(); });
  }

  /* { key: {...} } -> [ {...}, ... ] with id filled in */
  function objToArr(val) {
    if (!val || typeof val !== 'object') return [];
    return Object.keys(val).map(function (k) {
      var o = val[k] && typeof val[k] === 'object' ? val[k] : { value: val[k] };
      if (!o.id) o.id = k;
      return o;
    });
  }

  function isConfigured() {
    return !!(cfg && cfg.apiKey && cfg.projectId &&
      String(cfg.apiKey).indexOf('PASTE_') !== 0 &&
      String(cfg.projectId).indexOf('PASTE_') !== 0);
  }

  function readLS(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }

  function writeLS(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); return true; }
    catch (e) {
      console.warn('[BS] localStorage full:', e);
      return false;
    }
  }

  function uid(prefix) {
    return (prefix || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function slug(str) {
    return String(str || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  }

  function deepCopy(obj) { return JSON.parse(JSON.stringify(obj)); }

  function seedDemoProducts(force) {
    var seeded = null;
    try { seeded = localStorage.getItem(LS.seeded); } catch (e) {}
    var existing = readLS(LS.products, []);
    if (!force && seeded && existing.length) return existing;
    var list = deepCopy((window.BS.data.products || []));
    list.forEach(function (p) { p.createdAt = p.createdAt || new Date().toISOString(); });
    writeLS(LS.products, list);
    try { localStorage.setItem(LS.seeded, '1'); } catch (e) {}
    return list;
  }

  function sortByDateDesc(list) {
    return list.slice().sort(function (a, b) {
      var da = a.createdAt && a.createdAt.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
      var db = b.createdAt && b.createdAt.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
      return db - da;
    });
  }

  function toMillis(v) {
    if (!v) return 0;
    if (typeof v.toMillis === 'function') return v.toMillis();
    if (v.seconds) return v.seconds * 1000;
    var t = new Date(v).getTime();
    return isNaN(t) ? 0 : t;
  }

  function mapDoc(d) {
    var o = d.data() || {};
    o.id = d.id;
    return o;
  }

  /* ---------------- init ---------------- */
  function init() {
    if (state.ready) return state;
    state.ready = true;

    /* Supabase wins when its URL + anon key are filled in */
    if (hasSupabase()) {
      state.mode = 'supabase';
      console.info('[BS] Supabase connected —', sbBase());
      return state;
    }

    if (isConfigured() && typeof firebase !== 'undefined' && firebase.initializeApp) {
      try {
        state.app = firebase.initializeApp(cfg);
        state.auth = firebase.auth();
        if (firebase.storage) state.storage = firebase.storage();

        var want = (window.BS_CONFIG && window.BS_CONFIG.backend) || 'auto';
        var hasRtdb = hasRtdbUrl();
        var useRtdb = firebase.database && hasRtdb && (want === 'rtdb' || want === 'auto');

        if (useRtdb) {
          state.rtdb = firebase.database();
          state.mode = 'rtdb';
          console.info('[BS] Realtime Database connected —', cfg.databaseURL);
        } else {
          if (want === 'rtdb' && !hasRtdb) {
            console.warn('[BS] backend:"rtdb" set hai magar databaseURL khali hai — Firestore par ja rahe hain.');
          }
          state.db = firebase.firestore();
          state.mode = 'firebase';
          console.info('[BS] Firestore connected —', cfg.projectId);
        }
      } catch (e) {
        state.lastError = e.message;
        state.mode = 'demo';
        console.warn('[BS] Firebase init failed, demo mode on:', e);
      }
    } else {
      state.mode = 'demo';
      if (isConfigured()) {
        state.lastError = 'Firebase SDK did not load (check your internet / CDN).';
        console.warn('[BS] ' + state.lastError);
      }
      console.info('[BS] DEMO MODE — data lives in browser localStorage.');
    }

    if (state.mode === 'demo') seedDemoProducts(false);
    return state;
  }

  /* ---------------- image compression ---------------- */
  function compressImage(file, maxSize, quality) {
    return new Promise(function (resolve) {
      if (!file || !/^image\//.test(file.type)) return resolve(file);
      var img = new Image();
      var url = URL.createObjectURL(file);
      img.onload = function () {
        try {
          var scale = Math.min(1, maxSize / Math.max(img.width, img.height));
          var w = Math.round(img.width * scale), h = Math.round(img.height * scale);
          var c = document.createElement('canvas');
          c.width = w; c.height = h;
          c.getContext('2d').drawImage(img, 0, 0, w, h);
          c.toBlob(function (blob) {
            URL.revokeObjectURL(url);
            if (!blob) return resolve(file);
            resolve(new File([blob], (file.name || 'image').replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }));
          }, 'image/jpeg', quality || 0.82);
        } catch (e) {
          URL.revokeObjectURL(url);
          resolve(file);
        }
      };
      img.onerror = function () { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  }

  function fileToDataURL(file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  /* ---------------- storage / uploads ---------------- */
  /**
   * uploadFile(file, folder, onProgress) -> Promise<url>
   * Firebase mode: Storage URL. Demo mode: compressed data-URL.
   */
  function uploadFile(file, folder, onProgress) {
    folder = folder || 'uploads';
    return compressImage(file, 1500, 0.82).then(function (compressed) {
      if (isLive() && state.storage) {
        var path = folder + '/' + Date.now() + '-' + slug((file.name || 'file').replace(/\.\w+$/, '')) + '.jpg';
        var ref = state.storage.ref().child(path);
        var task = ref.put(compressed, { contentType: 'image/jpeg' });
        return new Promise(function (resolve, reject) {
          task.on('state_changed',
            function (snap) {
              if (onProgress) onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100));
            },
            reject,
            function () {
              ref.getDownloadURL().then(resolve).catch(reject);
            });
        });
      }

      /* Demo mode — chhota data-URL taake localStorage mein fit ho jaye */
      return compressImage(file, 1100, 0.6).then(function (small) {
        if (onProgress) onProgress(100);
        return fileToDataURL(small);
      });
    });
  }

  /* ---------------- products ---------------- */
  function getProducts() {
    init();
    if (state.mode === 'rtdb') {
      return rOnce('products').then(function (v) { return sortByDateDesc(objToArr(v)); });
    }
    if (state.mode === 'firebase') {
      return state.db.collection('products').get().then(function (snap) {
        var list = [];
        snap.forEach(function (d) { list.push(mapDoc(d)); });
        list.sort(function (a, b) { return toMillis(b.createdAt) - toMillis(a.createdAt); });
        return list;
      });
    }
    return Promise.resolve(sortByDateDesc(readLS(LS.products, [])));
  }

  function getProduct(id) {
    init();
    if (state.mode === 'rtdb') {
      return rOnce('products/' + id).then(function (v) { return v ? Object.assign({ id: id }, v) : null; });
    }
    if (state.mode === 'firebase') {
      return state.db.collection('products').doc(id).get().then(function (d) {
        return d.exists ? mapDoc(d) : null;
      });
    }
    var list = readLS(LS.products, []);
    return Promise.resolve(list.filter(function (p) { return p.id === id; })[0] || null);
  }

  function saveProduct(data, id) {
    init();
    var now = new Date().toISOString();
    data.updatedAt = now;
    if (state.mode === 'rtdb') {
      if (id) return rref('products/' + id).update(data).then(function () { return id; });
      var ref = rref('products').push();
      data.createdAt = now;
      data.id = ref.key;
      return ref.set(data).then(function () { return ref.key; });
    }
    if (state.mode === 'firebase') {
      var col = state.db.collection('products');
      if (id) {
        return col.doc(id).set(data, { merge: true }).then(function () { return id; });
      }
      data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      return col.add(data).then(function (ref) { return ref.id; });
    }
    var list = readLS(LS.products, []);
    if (id) {
      list = list.map(function (p) { return p.id === id ? Object.assign({}, p, data, { id: id }) : p; });
    } else {
      data.id = uid('p');
      data.createdAt = now;
      list.unshift(data);
    }
    writeLS(LS.products, list);
    return Promise.resolve(id || data.id);
  }

  function deleteProduct(id) {
    init();
    if (state.mode === 'rtdb') return rref('products/' + id).remove();
    if (state.mode === 'firebase') {
      return state.db.collection('products').doc(id).delete();
    }
    var list = readLS(LS.products, []).filter(function (p) { return p.id !== id; });
    writeLS(LS.products, list);
    return Promise.resolve();
  }

  function updateStock(id, stock) {
    return saveProduct({ stock: Number(stock) || 0 }, id);
  }

  /* ---------------- orders ---------------- */
  function makeOrderNumber() {
    var d = new Date();
    var stamp = String(d.getFullYear()).slice(2) +
      String(d.getMonth() + 1).padStart(2, '0') +
      String(d.getDate()).padStart(2, '0');
    return 'BS-' + stamp + '-' + Math.floor(1000 + Math.random() * 9000);
  }

  function createOrder(order) {
    init();
    order.status = 'pending';
    order.statusHistory = [{ status: 'pending', at: new Date().toISOString(), by: 'customer' }];
    if (!order.orderNumber) order.orderNumber = makeOrderNumber();

    if (state.mode === 'rtdb') {
      order.createdAt = new Date().toISOString();
      var ref = rref('orders').push();
      order.id = ref.key;
      return ref.set(order).then(function () {
        return { id: ref.key, orderNumber: order.orderNumber };
      });
    }
    if (state.mode === 'firebase') {
      order.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      return state.db.collection('orders').add(order).then(function (ref) {
        return { id: ref.id, orderNumber: order.orderNumber };
      });
    }
    order.id = uid('ord');
    order.createdAt = new Date().toISOString();
    var list = readLS(LS.orders, []);
    list.unshift(order);
    var saved = writeLS(LS.orders, list);
    if (!saved) {
      return Promise.reject(new Error('Browser storage is full. Clear old orders or connect Firebase.'));
    }
    return Promise.resolve({ id: order.id, orderNumber: order.orderNumber });
  }

  function getOrders() {
    init();
    if (state.mode === 'rtdb') {
      return rOnce('orders').then(function (v) { return sortByDateDesc(objToArr(v)); });
    }
    if (state.mode === 'firebase') {
      return state.db.collection('orders').get().then(function (snap) {
        var list = [];
        snap.forEach(function (d) { list.push(mapDoc(d)); });
        list.sort(function (a, b) { return toMillis(b.createdAt) - toMillis(a.createdAt); });
        return list;
      });
    }
    var list = readLS(LS.orders, []);
    list.sort(function (a, b) { return new Date(b.createdAt || 0) - new Date(a.createdAt || 0); });
    return Promise.resolve(list);
  }

  function getOrderByNumber(orderNumber) {
    init();
    var no = String(orderNumber || '').trim().toUpperCase();
    if (!no) return Promise.resolve(null);

    if (state.mode === 'rtdb') {
      return rref('orders').orderByChild('orderNumber').equalTo(no).limitToFirst(1).once('value')
        .then(function (snap) {
          var v = snap.val();
          var list = objToArr(v);
          return list[0] || null;
        });
    }
    if (state.mode === 'firebase') {
      return state.db.collection('orders').where('orderNumber', '==', no).limit(1).get()
        .then(function (snap) {
          var found = null;
          snap.forEach(function (d) { if (!found) found = mapDoc(d); });
          return found;
        });
    }
    var list = readLS(LS.orders, []);
    return Promise.resolve(list.filter(function (o) {
      return String(o.orderNumber).toUpperCase() === no;
    })[0] || null);
  }

  function updateOrderStatus(id, status, note) {
    init();
    var entry = { status: status, at: new Date().toISOString(), by: 'admin' };
    if (note) entry.note = note;

    if (state.mode === 'rtdb') {
      return rOnce('orders/' + id).then(function (o) {
        o = o || {};
        var hist = (o.statusHistory || []).concat([entry]);
        return rref('orders/' + id).update({
          status: status,
          updatedAt: new Date().toISOString(),
          statusHistory: hist
        });
      });
    }
    if (state.mode === 'firebase') {
      return state.db.collection('orders').doc(id).update({
        status: status,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        statusHistory: firebase.firestore.FieldValue.arrayUnion(entry)
      });
    }
    var list = readLS(LS.orders, []);
    list = list.map(function (o) {
      if (o.id !== id) return o;
      o.status = status;
      o.statusHistory = (o.statusHistory || []).concat([entry]);
      return o;
    });
    writeLS(LS.orders, list);
    return Promise.resolve();
  }

  function deleteOrder(id) {
    init();
    if (state.mode === 'rtdb') return rref('orders/' + id).remove();
    if (state.mode === 'firebase') return state.db.collection('orders').doc(id).delete();
    var list = readLS(LS.orders, []).filter(function (o) { return o.id !== id; });
    writeLS(LS.orders, list);
    return Promise.resolve();
  }

  /* ---------------- expenses (kharchay) ---------------- */
  function getExpenses() {
    init();
    if (state.mode === 'rtdb') {
      return rOnce('expenses').then(function (v) {
        return objToArr(v).sort(function (a, b) {
          return new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0);
        });
      });
    }
    if (state.mode === 'firebase') {
      return state.db.collection('expenses').get().then(function (snap) {
        var list = [];
        snap.forEach(function (d) { list.push(mapDoc(d)); });
        list.sort(function (a, b) { return toMillis(b.date || b.createdAt) - toMillis(a.date || a.createdAt); });
        return list;
      });
    }
    var list = readLS(LS.expenses, []);
    list.sort(function (a, b) { return new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0); });
    return Promise.resolve(list);
  }

  function addExpense(data) {
    init();
    data.amount = Number(data.amount) || 0;
    data.date = data.date || new Date().toISOString().slice(0, 10);
    if (state.mode === 'rtdb') {
      data.createdAt = new Date().toISOString();
      var ref = rref('expenses').push();
      data.id = ref.key;
      return ref.set(data).then(function () { return ref.key; });
    }
    if (state.mode === 'firebase') {
      data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      return state.db.collection('expenses').add(data).then(function (ref) { return ref.id; });
    }
    data.id = uid('exp');
    data.createdAt = new Date().toISOString();
    var list = readLS(LS.expenses, []);
    list.unshift(data);
    writeLS(LS.expenses, list);
    return Promise.resolve(data.id);
  }

  function deleteExpense(id) {
    init();
    if (state.mode === 'rtdb') return rref('expenses/' + id).remove();
    if (state.mode === 'firebase') return state.db.collection('expenses').doc(id).delete();
    writeLS(LS.expenses, readLS(LS.expenses, []).filter(function (e) { return e.id !== id; }));
    return Promise.resolve();
  }

  function seedDemoExpenses() {
    init();
    var demo = [
      { title: 'Shop rent', category: 'Rent', amount: 25000, date: new Date().toISOString().slice(0, 10) },
      { title: 'Delivery fuel', category: 'Delivery', amount: 4200, date: new Date().toISOString().slice(0, 10) },
      { title: 'Packing material', category: 'Packaging', amount: 1350, date: new Date().toISOString().slice(0, 10) },
      { title: 'Electricity bill', category: 'Utilities', amount: 6800, date: new Date().toISOString().slice(0, 10) }
    ];
    if (state.mode === 'demo') {
      var existing = readLS(LS.expenses, []);
      if (existing.length) return Promise.resolve(existing.length);
      demo.forEach(function (d, i) { d.id = 'exp_demo_' + i; d.createdAt = new Date().toISOString(); });
      writeLS(LS.expenses, demo);
      return Promise.resolve(demo.length);
    }
    return Promise.all(demo.map(function (d) { return addExpense(d); })).then(function () { return demo.length; });
  }

  /* ---------------- auth (admin) ---------------- */
  function loginAdmin(email, password) {
    init();
    if (isLive() && state.auth) {
      return state.auth.signInWithEmailAndPassword(email || S.adminEmail, password).then(function (cred) {
        sessionSet(LS.admin, '1');
        return { ok: true, user: cred.user };
      });
    }
    if (password === S.adminDemoPassword) {
      sessionSet(LS.admin, '1');
      return Promise.resolve({ ok: true, demo: true });
    }
    return Promise.reject(new Error('That password is incorrect. (Demo mode)'));
  }

  function logoutAdmin() {
    sessionDel(LS.admin);
    if (isLive() && state.auth) return state.auth.signOut();
    return Promise.resolve();
  }

  function isAdminLoggedIn() {
    return sessionGet(LS.admin) === '1';
  }

  function onAuthChange(cb) {
    init();
    if (isLive() && state.auth) {
      return state.auth.onAuthStateChanged(cb);
    }
    cb(isAdminLoggedIn() ? { email: S.adminEmail, demo: true } : null);
    return function () {};
  }

  function resetDemoData() {
    [LS.products, LS.orders, LS.seeded, LS.expenses].forEach(function (k) {
      try { localStorage.removeItem(k); } catch (e) {}
    });
    seedDemoProducts(true);
    return Promise.resolve();
  }

  /* ============================================================
     SUPABASE LAYER
     ------------------------------------------------------------
     Same BS.fb interface, implemented over the Supabase REST API
     (no SDK, no build step). Active when window.BS_SUPABASE.url and
     .anonKey are filled in — otherwise the site ignores it.

     Tables: public.products / public.orders / public.expenses
     Each row: { id uuid, data jsonb, created_at }
     Created by supabase-setup.sql.
     ============================================================ */
  var SB = window.BS_SUPABASE || {};
  var SB_TOKEN_KEY = 'bsh_sb_session';

  function hasSupabase() {
    return !!(SB.url && SB.anonKey &&
      String(SB.url).indexOf('PASTE_') !== 0 && /^https?:\/\//.test(String(SB.url)));
  }

  function sbBase() { return String(SB.url).replace(/\/+$/, ''); }

  function sbSession() {
    try { return JSON.parse(localStorage.getItem(SB_TOKEN_KEY) || 'null'); } catch (e) { return null; }
  }

  function sbToken() {
    var s = sbSession();
    if (!s || !s.access_token) return '';
    if (s.expires_at && Date.now() > s.expires_at) return '';
    return s.access_token;
  }

  function sbSaveSession(payload) {
    var rec = {
      access_token: payload.access_token,
      refresh_token: payload.refresh_token,
      email: (payload.user && payload.user.email) || S.adminEmail,
      expires_at: Date.now() + ((payload.expires_in || 3600) - 60) * 1000
    };
    try { localStorage.setItem(SB_TOKEN_KEY, JSON.stringify(rec)); } catch (e) {}
    sessionSet(LS.admin, '1');
    return rec;
  }

  function sbRequest(path, opts) {
    opts = opts || {};
    var headers = {
      apikey: SB.anonKey,
      Authorization: 'Bearer ' + (sbToken() || SB.anonKey)
    };
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
    if (opts.headers) Object.keys(opts.headers).forEach(function (k) { headers[k] = opts.headers[k]; });

    return fetch(sbBase() + path, {
      method: opts.method || 'GET',
      headers: headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body)
    }).then(function (res) {
      return res.text().then(function (txt) {
        var body = null;
        try { body = txt ? JSON.parse(txt) : null; } catch (e) { body = txt; }
        if (!res.ok) {
          var msg = (body && (body.message || body.error_description || body.error || body.msg)) || ('HTTP ' + res.status);
          var err = new Error(msg);
          err.status = res.status;
          err.code = body && body.code;
          err.body = body;
          throw err;
        }
        return body;
      });
    });
  }

  function sbRows(res) {
    return (res || []).map(function (row) {
      var o = Object.assign({}, row.data || {});
      o.id = (row.data && row.data.id) || row.id;   /* keep the readable slug id */
      o._rowId = row.id;                            /* uuid used by the API */
      return o;
    });
  }

  function sbOrderOf(col) {
    return 'order=' + col + '.desc';
  }

  function sbAll(table) {
    return sbRequest('/rest/v1/' + table + '?select=id,data,created_at').then(function (r) { return r || []; });
  }

  /* find one row by uuid OR by the readable id kept inside data.id (product slugs,
     expense ids). Avoids depending on PostgREST arrow operators. */
  function sbFind(table, id) {
    var key = String(id);
    return sbAll(table).then(function (rows) {
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i];
        if (r.id === key || (r.data && String(r.data.id) === key)) return r;
      }
      return null;
    });
  }

  function sbPatchRow(table, rowId, data) {
    return sbRequest('/rest/v1/' + table + '?id=eq.' + encodeURIComponent(rowId), {
      method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: { data: data }
    });
  }

  function sbDeleteRow(table, rowId) {
    return sbRequest('/rest/v1/' + table + '?id=eq.' + encodeURIComponent(rowId), {
      method: 'DELETE', headers: { Prefer: 'return=minimal' }
    });
  }

  var sb = {
    /* ---------- products ---------- */
    getProducts: function () {
      return sbRequest('/rest/v1/products?select=id,data,created_at&' + sbOrderOf('created_at'))
        .then(function (rows) {
          return sbRows(rows).sort(function (a, b) {
            return new Date(b.createdAt || b.created_at || 0) - new Date(a.createdAt || 0);
          });
        });
    },

    getProduct: function (id) {
      return sbFind('products', id).then(function (row) {
        return row ? sbRows([row])[0] : null;
      });
    },

    saveProduct: function (data, id) {
      var now = new Date().toISOString();
      data.updatedAt = now;
      var clean = Object.assign({}, data);
      delete clean._rowId;

      if (id) {
        return sbFind('products', id).then(function (row) {
          if (!row) throw new Error('Product not found.');
          var merged = Object.assign({}, row.data || {}, clean);
          return sbPatchRow('products', row.id, merged).then(function () { return id; });
        });
      }

      clean.createdAt = clean.createdAt || now;
      return sbRequest('/rest/v1/products', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: { data: clean }
      }).then(function (rows) {
        var row = (rows && rows[0]) || {};
        return (row.data && row.data.id) || row.id;
      });
    },

    deleteProduct: function (id) {
      return sbFind('products', id).then(function (row) {
        if (!row) throw new Error('Product not found.');
        return sbDeleteRow('products', row.id);
      });
    },

    updateStock: function (id, stock) { return sb.saveProduct({ stock: Number(stock) || 0 }, id); },

    /* ---------- orders ---------- */
    createOrder: function (order) {
      order.status = 'pending';
      order.statusHistory = [{ status: 'pending', at: new Date().toISOString(), by: 'customer' }];
      if (!order.orderNumber) order.orderNumber = makeOrderNumber();
      order.createdAt = new Date().toISOString();
      order.orderNumber = String(order.orderNumber).toUpperCase();

      return sbRequest('/rest/v1/orders', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: { data: order }
      }).then(function (rows) {
        var row = (rows && rows[0]) || {};
        order.id = (row.data && row.data.id) || row.id;
        return { id: order.id, orderNumber: order.orderNumber };
      });
    },

    getOrders: function () {
      return sbRequest('/rest/v1/orders?select=id,data,created_at&' + sbOrderOf('created_at'))
        .then(function (rows) { return sbRows(rows); });
    },

    getOrderByNumber: function (orderNumber) {
      var no = String(orderNumber || '').trim().toUpperCase();
      if (!no) return Promise.resolve(null);
      return sbAll('orders').then(function (rows) {
        for (var i = 0; i < rows.length; i++) {
          var d = rows[i].data || {};
          if (String(d.orderNumber || '').toUpperCase() === no) return sbRows([rows[i]])[0];
        }
        return null;
      });
    },

    updateOrderStatus: function (id, status, note) {
      return sbFind('orders', id).then(function (cur) {
        if (!cur) throw new Error('Order not found.');
        var data = Object.assign({}, cur.data || {});
        var entry = { status: status, at: new Date().toISOString(), by: 'admin' };
        if (note) entry.note = note;
        data.status = status;
        data.updatedAt = new Date().toISOString();
        data.statusHistory = (data.statusHistory || []).concat([entry]);
        return sbPatchRow('orders', cur.id, data);
      });
    },

    deleteOrder: function (id) {
      return sbFind('orders', id).then(function (row) {
        if (!row) return null;
        return sbDeleteRow('orders', row.id);
      });
    },

    /* ---------- expenses ---------- */
    getExpenses: function () {
      return sbRequest('/rest/v1/expenses?select=id,data&' + sbOrderOf('created_at'))
        .then(function (rows) {
          return sbRows(rows).sort(function (a, b) {
            return new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0);
          });
        });
    },

    addExpense: function (data) {
      data.amount = Number(data.amount) || 0;
      data.date = data.date || new Date().toISOString().slice(0, 10);
      data.createdAt = new Date().toISOString();
      data.by = 'admin';
      return sbRequest('/rest/v1/expenses', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: { data: data }
      }).then(function (rows) {
        var row = (rows && rows[0]) || {};
        return (row.data && row.data.id) || row.id;
      });
    },

    deleteExpense: function (id) {
      return sbFind('expenses', id).then(function (row) {
        if (!row) return null;
        return sbDeleteRow('expenses', row.id);
      });
    },

    seedDemoExpenses: function () {
      var demo = [
        { title: 'Shop rent', category: 'Rent', amount: 25000, date: new Date().toISOString().slice(0, 10) },
        { title: 'Delivery fuel', category: 'Delivery', amount: 4200, date: new Date().toISOString().slice(0, 10) },
        { title: 'Packing material', category: 'Packaging', amount: 1350, date: new Date().toISOString().slice(0, 10) },
        { title: 'Electricity bill', category: 'Utilities', amount: 6800, date: new Date().toISOString().slice(0, 10) }
      ];
      return sb.getExpenses().then(function (existing) {
        if (existing.length) return existing.length;
        return Promise.all(demo.map(function (d) { return sb.addExpense(d); })).then(function () { return demo.length; });
      });
    },

    /* ---------- storage ---------- */
    uploadFile: function (file, folder, onProgress) {
      folder = folder || 'uploads';
      return compressImage(file, 1500, 0.82).then(function (compressed) {
        var name = Date.now() + '-' + slug((file && file.name || 'file').replace(/\.\w+$/, '')) + '.jpg';
        var path = folder + '/' + name;
        var headers = { 'x-upsert': 'true', 'cache-control': '3600' };
        if (compressed && compressed.type) headers['Content-Type'] = compressed.type || 'image/jpeg';
        headers.apikey = SB.anonKey;
        headers.Authorization = 'Bearer ' + (sbToken() || SB.anonKey);

        return fetch(sbBase() + '/storage/v1/object/' + path, {
          method: 'POST',
          headers: headers,
          body: compressed
        }).then(function (res) {
          if (onProgress) onProgress(100);
          if (!res.ok) {
            return res.text().then(function (t) {
              throw new Error((function () { try { return JSON.parse(t).message; } catch (e) { return 'Upload failed'; } })());
            });
          }
          return sbBase() + '/storage/v1/object/public/' + path;
        });
      });
    },

    /* ---------- auth ---------- */
    loginAdmin: function (email, password) {
      var mail = email || S.adminEmail;
      return fetch(sbBase() + '/auth/v1/token?grant_type=password', {
        method: 'POST',
        headers: { apikey: SB.anonKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: mail, password: password })
      }).then(function (res) {
        return res.text().then(function (txt) {
          var body = null;
          try { body = JSON.parse(txt); } catch (e) {}
          if (!res.ok) {
            var err = new Error((body && (body.error_description || body.msg || body.message)) || 'Could not log in.');
            err.code = (body && (body.error_code || body.error)) || ('auth/' + res.status);
            throw err;
          }
          sbSaveSession(body);
          return { ok: true, user: body.user };
        });
      });
    },

    logoutAdmin: function () {
      var tok = sbToken();
      try { localStorage.removeItem(SB_TOKEN_KEY); } catch (e) {}
      sessionDel(LS.admin);
      if (!tok) return Promise.resolve();
      return fetch(sbBase() + '/auth/v1/logout', {
        method: 'POST',
        headers: { apikey: SB.anonKey, Authorization: 'Bearer ' + tok }
      }).catch(function () {}).then(function () {});
    },

    isAdminLoggedIn: function () { return !!sbToken() && sessionGet(LS.admin) === '1'; },

    onAuthChange: function (cb) {
      var s = sbSession();
      var ok = sb.isAdminLoggedIn();
      cb(ok ? { email: (s && s.email) || S.adminEmail } : null);
      return function () {};
    },

    resetDemoData: function () { return Promise.resolve(); }
  };

  /* ---------------- public API ---------------- */
  window.BS = window.BS || {};
  /* every data call goes through here: Supabase when configured, otherwise the
     Firebase / demo implementation above */
  function pick(sbFn, fbFn) {
    return function () {
      init();
      if (state.mode === 'supabase') return sbFn.apply(null, arguments);
      return fbFn.apply(null, arguments);
    };
  }

  window.BS.fb = {
    init: init,
    /* Lazy init — chips/UI can read the backend before the first data call */
    get mode() { init(); return state.mode; },
    get backend() {
      init();
      return state.mode === 'supabase' ? 'Supabase'
        : state.mode === 'rtdb' ? 'Realtime Database'
          : state.mode === 'firebase' ? 'Firestore' : 'Demo';
    },
    get rtdb() { init(); return state.rtdb; },
    get error() { init(); return state.lastError; },
    isConfigured: isConfigured,
    hasSupabase: hasSupabase,
    uploadFile: pick(sb.uploadFile, uploadFile),
    getProducts: pick(sb.getProducts, getProducts),
    getProduct: pick(sb.getProduct, getProduct),
    saveProduct: pick(sb.saveProduct, saveProduct),
    deleteProduct: pick(sb.deleteProduct, deleteProduct),
    updateStock: pick(sb.updateStock, updateStock),
    createOrder: pick(sb.createOrder, createOrder),
    getOrders: pick(sb.getOrders, getOrders),
    getOrderByNumber: pick(sb.getOrderByNumber, getOrderByNumber),
    updateOrderStatus: pick(sb.updateOrderStatus, updateOrderStatus),
    getExpenses: pick(sb.getExpenses, getExpenses),
    addExpense: pick(sb.addExpense, addExpense),
    deleteExpense: pick(sb.deleteExpense, deleteExpense),
    seedDemoExpenses: pick(sb.seedDemoExpenses, seedDemoExpenses),
    deleteOrder: pick(sb.deleteOrder, deleteOrder),
    makeOrderNumber: makeOrderNumber,
    loginAdmin: pick(sb.loginAdmin, loginAdmin),
    logoutAdmin: pick(sb.logoutAdmin, logoutAdmin),
    isAdminLoggedIn: pick(sb.isAdminLoggedIn, isAdminLoggedIn),
    onAuthChange: pick(sb.onAuthChange, onAuthChange),
    resetDemoData: pick(sb.resetDemoData, resetDemoData),
    toMillis: toMillis
  };
})();
