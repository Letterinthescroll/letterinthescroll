/**
 * auth-gate.js — Lightweight auth check for pages that don't load firebase.js.
 * Dynamically loads Firebase Auth (compat) and redirects to / if not signed in.
 * Include a single <script src="/js/auth-gate.js"></script> anywhere on the page.
 */
(function () {
    'use strict';

    var FIREBASE_VERSION = '10.7.1';
    var CDN = 'https://www.gstatic.com/firebasejs/' + FIREBASE_VERSION;
    var path = window.location.pathname.replace(/\/+$/, '') || '/';
    var publicPaths = ['', '/', '/invite', '/join'];

    if (publicPaths.includes(path)) {
        return;
    }

    // If firebase is already loaded (e.g. dashboard, settings), reuse it
    if (window.firebase && window.firebase.auth) {
        checkAuth();
        return;
    }

    // Dynamically load Firebase compat SDKs
    var appScript = document.createElement('script');
    appScript.src = CDN + '/firebase-app-compat.js';
    appScript.onload = function () {
        var authScript = document.createElement('script');
        authScript.src = CDN + '/firebase-auth-compat.js';
        authScript.onload = function () {
            // Initialize only if not already initialized
            if (!firebase.apps.length) {
                firebase.initializeApp({
                    apiKey: 'AIzaSyCpDtcBpKvjLwihnL2bizxBFxXD6Qn8Lb4',
                    authDomain: 'letterinthescroll.firebaseapp.com',
                    projectId: 'letterinthescroll'
                });
            }
            checkAuth();
        };
        document.head.appendChild(authScript);
    };
    document.head.appendChild(appScript);

    function showLoginRequiredOverlayAndRedirect() {
        if (window.__loginRedirectPending) {
            return;
        }
        window.__loginRedirectPending = true;

        if (!document.getElementById('login-required-overlay-style')) {
            var style = document.createElement('style');
            style.id = 'login-required-overlay-style';
            style.textContent = [
                'body.login-required-pending > *:not(#login-required-overlay) {',
                '  filter: blur(6px);',
                '  pointer-events: none !important;',
                '  user-select: none !important;',
                '}',
                '#login-required-overlay {',
                '  position: fixed;',
                '  inset: 0;',
                '  z-index: 2147483647;',
                '  background: rgba(3, 10, 28, 0.58);',
                '  display: flex;',
                '  align-items: center;',
                '  justify-content: center;',
                '  padding: 1rem;',
                '}',
                '#login-required-overlay .login-required-card {',
                '  width: min(92vw, 480px);',
                '  background: linear-gradient(165deg, #ffffff 0%, #f8fbff 100%);',
                '  border: 1px solid rgba(37, 99, 235, 0.18);',
                '  border-radius: 16px;',
                '  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.28);',
                '  text-align: center;',
                '  padding: 1.2rem 1.25rem;',
                '}',
                '#login-required-overlay .login-required-title {',
                '  margin: 0 0 0.35rem 0;',
                '  color: #0f172a;',
                '  font-size: 1rem;',
                '  font-weight: 700;',
                '}',
                '#login-required-overlay .login-required-text {',
                '  margin: 0;',
                '  color: #1f3b75;',
                '  font-size: 0.93rem;',
                '  line-height: 1.45;',
                '}',
                '#login-required-overlay .login-required-btn {',
                '  margin-top: 0.95rem;',
                '  display: inline-flex;',
                '  align-items: center;',
                '  justify-content: center;',
                '  min-height: 42px;',
                '  padding: 0.62rem 1rem;',
                '  border: 1px solid rgba(25, 81, 190, 0.32);',
                '  border-radius: 999px;',
                '  background: linear-gradient(180deg, #2f6fe0 0%, #1d4ed8 100%);',
                '  color: #ffffff;',
                '  font-size: 0.9rem;',
                '  font-weight: 700;',
                '  letter-spacing: 0.01em;',
                '  cursor: pointer;',
                '  text-decoration: none;',
                '  box-shadow: 0 8px 18px rgba(37, 99, 235, 0.28);',
                '}',
                '#login-required-overlay .login-required-btn:hover {',
                '  background: linear-gradient(180deg, #2563eb 0%, #1e40af 100%);',
                '}',
                '#login-required-overlay .login-required-btn:focus-visible {',
                '  outline: 2px solid #1d4ed8;',
                '  outline-offset: 2px;',
                '}'
            ].join('\n');
            document.head.appendChild(style);
        }

        if (document.body) {
            document.body.classList.add('login-required-pending');
        }

        if (!document.getElementById('login-required-overlay')) {
            var overlay = document.createElement('div');
            overlay.id = 'login-required-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-live', 'assertive');
            overlay.innerHTML =
                '<div class="login-required-card">' +
                '  <p class="login-required-title">Welcome to A Letter in the Scroll</p>' +
                '  <p class="login-required-text">Login or create an account first.</p>' +
                '  <button type="button" id="login-required-cta" class="login-required-btn">Login / Create Account</button>' +
                '</div>';
            (document.body || document.documentElement).appendChild(overlay);
            var cta = overlay.querySelector('#login-required-cta');
            if (cta) {
                cta.addEventListener('click', function () {
                    window.location.assign('/');
                });
            }
        }
    }

    function checkAuth() {
        var auth = firebase.auth();
        // onAuthStateChanged fires once immediately with cached state
        var unsubscribe = auth.onAuthStateChanged(function (user) {
            unsubscribe(); // only need the first callback
            if (!user) {
                showLoginRequiredOverlayAndRedirect();
            }
        });
    }
})();
