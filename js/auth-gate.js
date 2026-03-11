/**
 * auth-gate.js — Lightweight auth check for pages that don't load firebase.js.
 * Dynamically loads Firebase Auth (compat) and redirects to / if not signed in.
 * Include a single <script src="/js/auth-gate.js"></script> anywhere on the page.
 */
(function () {
    'use strict';

    var FIREBASE_VERSION = '10.7.1';
    var CDN = 'https://www.gstatic.com/firebasejs/' + FIREBASE_VERSION;

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
                '  <p class="login-required-title">Login Required</p>' +
                '  <p class="login-required-text">please first login or create an account</p>' +
                '</div>';
            (document.body || document.documentElement).appendChild(overlay);
        }

        window.setTimeout(function () {
            window.location.replace('/');
        }, 1100);
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
