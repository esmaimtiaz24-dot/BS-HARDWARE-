/* ============================================================
   admin-login.js — admin authentication (Firebase Auth / demo)
   ============================================================ */
(function () {
  'use strict';

  function boot() {
    BS.fb.init();

    var mode = BS.fb.mode;
    var live = mode === 'firebase' || mode === 'rtdb' || mode === 'supabase';
    var chip = document.getElementById('modeChip');
    var emailWrap = document.getElementById('emailWrap');

    if (live) document.body.classList.add('is-live');
    if (chip) {
      chip.textContent = live ? (BS.fb.backend + ' live') : '';
      chip.style.borderColor = live ? 'var(--green)' : 'var(--amber)';
      chip.style.color = live ? 'var(--green)' : '#8a6a00';
    }

    if (live) {
      if (emailWrap) emailWrap.classList.remove('hidden');
      var em = document.getElementById('adminEmail');
      if (em) em.value = (window.BS_SETTINGS || {}).adminEmail || '';
    } else if (emailWrap) {
      emailWrap.classList.add('hidden');
    }

    /* already logged in? seedha dashboard */
    BS.fb.onAuthChange(function (user) {
      if (user) window.location.replace('admin.html');
    });

    var form = document.getElementById('loginForm');
    var pass = document.getElementById('adminPass');
    var err = document.getElementById('loginErr');
    var btn = document.getElementById('loginBtn');

    if (!form) return;

    /* password show/hide */
    var toggle = document.getElementById('pwToggle');
    if (toggle) toggle.addEventListener('click', function () {
      var show = pass.type === 'password';
      pass.type = show ? 'text' : 'password';
      toggle.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      err.classList.remove('show');
      var email = (document.getElementById('adminEmail') || {}).value || '';
      var password = pass.value;

      if (!password) {
        err.textContent = 'Enter your password.';
        err.classList.add('show');
        return;
      }
      if (live && !email) {
        err.textContent = 'Enter the admin email.';
        err.classList.add('show');
        return;
      }

      btn.disabled = true;
      var old = btn.innerHTML;
      btn.innerHTML = 'Checking…';

      BS.fb.loginAdmin(email, password).then(function () {
        window.location.replace('admin.html');
      }).catch(function (e2) {
        console.warn(e2);
        var code = (e2 && e2.code) || '';
        var demoPass = (window.BS_SETTINGS || {}).adminDemoPassword || '';
        var usedDemoPass = demoPass && password === demoPass;

        /* the built-in password only exists before the store is connected — say so
           instead of a generic "wrong password" */
        if (live && usedDemoPass) {
          var where = BS.fb.backend === 'Supabase'
            ? 'Supabase → the account created by supabase-setup.sql'
            : 'Firebase → Authentication → Users';
          err.textContent = 'This store is connected to ' + BS.fb.backend + ', so the built-in password no longer works. '
            + 'Sign in with ' + where + '.';
          err.classList.add('show');
          btn.disabled = false;
          btn.innerHTML = old;
          return;
        }

        var msg =
          (code === 'invalid_grant' || code === 'auth/wrong-password' || code === 'auth/invalid-credential' || code === 'auth/invalid-login-credentials')
            ? 'That email and password do not match. Use the account you created in Firebase → Authentication → Users.'
          : (code === 'auth/user-not-found')
            ? 'No account exists for that email. Add it in Firebase → Authentication → Users.'
          : (code === 'auth/invalid-email')
            ? 'That email address is not valid.'
          : (code === 'auth/too-many-requests')
            ? 'Too many attempts — try again in a little while.'
          : (code === 'auth/operation-not-allowed')
            ? 'Email/Password sign-in is switched off. Enable it in Firebase → Authentication → Sign-in method.'
          : (code === 'auth/unauthorized-domain')
            ? 'This domain is not allowed. Add it in Firebase → Authentication → Settings → Authorized domains.'
          : (code === 'auth/network-request-failed')
            ? 'Could not reach Firebase. Check your internet connection and try again.'
          : (e2 && e2.message) || 'Could not log in.';
        err.textContent = msg;
        err.classList.add('show');
        btn.disabled = false;
        btn.innerHTML = old;
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
