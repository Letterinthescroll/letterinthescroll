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
    var publicPaths = ['', '/', '/invite', '/join', '/about'];

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

    function updateLoginRequiredOverlayOffset() {
        var header = document.querySelector('header, .header-main');
        var overlayTop = 0;

        if (header) {
            var rect = header.getBoundingClientRect();
            overlayTop = Math.max(0, Math.round(rect.bottom || 0));
            if (!overlayTop) {
                overlayTop = Math.max(0, Math.round(header.offsetHeight || 0));
            }
        }

        document.documentElement.style.setProperty('--login-required-overlay-top', overlayTop + 'px');
    }

    function showLoginRequiredOverlayAndRedirect() {
        if (window.__loginRedirectPending) {
            return;
        }
        window.__loginRedirectPending = true;

        if (!document.getElementById('login-required-overlay-style')) {
            var style = document.createElement('style');
            style.id = 'login-required-overlay-style';
            style.textContent = `
                body.login-required-pending {
                  --login-required-overlay-top: 0px;
                }
                body.login-required-pending #shabbat-banner {
                  display: none !important;
                }
                @media (min-width: 961px) {
                  body.login-required-pending header,
                  body.login-required-pending .header-main {
                    z-index: 10001 !important;
                    filter: none !important;
                    -webkit-filter: none !important;
                  }
                  body.login-required-pending .header-container {
                    padding: 1.25rem 1.5rem !important;
                  }
                  body.shabbat-mode.login-required-pending .header-main {
                    background: linear-gradient(138deg, #16285e 0%, #203a82 50%, #2b4e9e 100%) !important;
                    box-shadow: 0 4px 20px rgba(15, 23, 42, 0.45) !important;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
                  }
                  body.shabbat-mode.login-required-pending .header-main::before,
                  body.shabbat-mode.login-required-pending .header-main::after {
                    display: none !important;
                  }
                  body.shabbat-mode.login-required-pending .header-title {
                    color: #fff !important;
                    text-shadow: none !important;
                  }
                  body.shabbat-mode.login-required-pending .header-subtitle {
                    color: rgba(255, 255, 255, 0.85) !important;
                    text-shadow: none !important;
                  }
                  body.shabbat-mode.login-required-pending .header-btn-primary {
                    color: #fff !important;
                    background: rgba(255, 255, 255, 0.15) !important;
                    border-color: rgba(255, 255, 255, 0.3) !important;
                    box-shadow: none !important;
                  }
                  body.shabbat-mode.login-required-pending .header-btn-secondary {
                    color: rgba(255, 255, 255, 0.9) !important;
                    background: rgba(255, 255, 255, 0.08) !important;
                    border-color: rgba(255, 255, 255, 0.2) !important;
                    box-shadow: none !important;
                  }
                  body.shabbat-mode.login-required-pending .header-user-pill {
                    color: #fff !important;
                    background: rgba(255, 255, 255, 0.12) !important;
                    border-color: rgba(255, 255, 255, 0.25) !important;
                  }
                  body.shabbat-mode.login-required-pending .header-user-chevron,
                  body.shabbat-mode.login-required-pending .header-user-avatar {
                    color: #fff !important;
                  }
                  body.shabbat-mode.login-required-pending #community-status-bar {
                    background: rgba(0, 0, 0, 0.15) !important;
                  }
                  body.shabbat-mode.login-required-pending #community-status-bar * {
                    color: rgba(255, 255, 255, 0.85) !important;
                  }
                }
                @media (max-width: 960px) {
                  body.login-required-pending .header-main {
                    z-index: auto !important;
                  }
                  #login-required-overlay {
                    top: 0 !important;
                  }
                }
                #login-required-overlay {
                  position: fixed;
                  top: var(--login-required-overlay-top, 0px);
                  left: 0;
                  right: 0;
                  bottom: 0;
                  z-index: 10000;
                  background: radial-gradient(circle at 15% 15%, rgba(59, 130, 246, 0.22), transparent 36%), rgba(3, 10, 28, 0.62);
                  backdrop-filter: blur(4px);
                  -webkit-backdrop-filter: blur(4px);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  padding: 1rem;
                }
                #login-required-overlay .login-required-card {
                  position: relative;
                  overflow: hidden;
                  width: min(92vw, 520px);
                  background: linear-gradient(160deg, #ffffff 0%, #f4f8ff 46%, #eef5ff 100%);
                  border: 1px solid rgba(37, 99, 235, 0.2);
                  border-radius: 22px;
                  box-shadow: 0 26px 80px rgba(15, 23, 42, 0.34);
                  text-align: center;
                  padding: 1.35rem 1.3rem 1.4rem;
                  animation: loginRequiredPopIn 220ms ease-out;
                }
                #login-required-overlay .login-required-card::before {
                  content: '';
                  position: absolute;
                  top: -110px;
                  left: -40px;
                  width: 270px;
                  height: 220px;
                  background: radial-gradient(circle, rgba(191, 219, 254, 0.72) 0%, rgba(191, 219, 254, 0.08) 72%, transparent 100%);
                  pointer-events: none;
                }
                #login-required-overlay .login-required-logo-wrap {
                  position: relative;
                  z-index: 1;
                  margin: 0 auto 0.75rem;
                  width: 82px;
                  height: 82px;
                  border-radius: 20px;
                  background: linear-gradient(165deg, #fefefe 0%, #edf4ff 100%);
                  border: 1px solid rgba(37, 99, 235, 0.2);
                  box-shadow: 0 12px 28px rgba(37, 99, 235, 0.2);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                }
                #login-required-overlay .login-required-logo {
                  width: 56px;
                  height: 56px;
                  object-fit: contain;
                }
                #login-required-overlay .login-required-kicker {
                  margin: 0;
                  color: #1d4ed8;
                  font-size: 0.72rem;
                  letter-spacing: 0.13em;
                  text-transform: uppercase;
                  font-weight: 700;
                }
                #login-required-overlay .login-required-title {
                  margin: 0.34rem 0 0.46rem 0;
                  color: #0a1f46;
                  font-size: clamp(1.16rem, 2.8vw, 1.48rem);
                  font-weight: 700;
                  line-height: 1.28;
                }
                #login-required-overlay .login-required-text {
                  margin: 0 auto;
                  max-width: 35ch;
                  color: #1e3a8a;
                  font-size: 0.95rem;
                  line-height: 1.52;
                }
                #login-required-overlay .login-required-subtext {
                  margin: 0.58rem 0 0;
                  color: #334155;
                  font-size: 0.9rem;
                }
                #login-required-overlay .login-required-btn {
                  margin-top: 1rem;
                  display: inline-flex;
                  align-items: center;
                  justify-content: center;
                  min-height: 45px;
                  min-width: 220px;
                  padding: 0.68rem 1.08rem;
                  border: 1px solid rgba(30, 64, 175, 0.32);
                  border-radius: 999px;
                  background: linear-gradient(180deg, #2463de 0%, #1d4ed8 46%, #1e40af 100%);
                  color: #ffffff;
                  font-size: 0.92rem;
                  font-weight: 700;
                  letter-spacing: 0.012em;
                  cursor: pointer;
                  text-decoration: none;
                  box-shadow: 0 12px 24px rgba(29, 78, 216, 0.3);
                }
                #login-required-overlay .login-required-btn:hover {
                  transform: translateY(-1px);
                  background: linear-gradient(180deg, #2b6ef0 0%, #1e5cf0 46%, #1d4ed8 100%);
                }
                #login-required-overlay .login-required-btn:focus-visible {
                  outline: 3px solid rgba(29, 78, 216, 0.35);
                  outline-offset: 2px;
                }
                @keyframes loginRequiredPopIn {
                  from {
                    opacity: 0;
                    transform: translateY(8px) scale(0.985);
                  }
                  to {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                  }
                }
            `;
            document.head.appendChild(style);
        }

        if (document.body) {
            document.body.classList.add('login-required-pending');
        }
        updateLoginRequiredOverlayOffset();
        if (!window.__loginOverlayOffsetBound) {
            window.__loginOverlayOffsetBound = true;
            window.addEventListener('resize', updateLoginRequiredOverlayOffset);
        }
        window.requestAnimationFrame(updateLoginRequiredOverlayOffset);
        window.setTimeout(updateLoginRequiredOverlayOffset, 120);

        if (!document.getElementById('login-required-overlay')) {
            var overlay = document.createElement('div');
            overlay.id = 'login-required-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-live', 'assertive');
            overlay.innerHTML =
                '<div class="login-required-card">' +
                '  <div class="login-required-logo-wrap">' +
                '    <img class="login-required-logo" src="/media/images/Icon.png" alt="A Letter in the Scroll logo" />' +
                '  </div>' +
                '  <p class="login-required-kicker">Welcome Home</p>' +
                '  <p class="login-required-title">Welcome to A Letter in the Scroll</p>' +
                '  <p class="login-required-text">Study Torah with heart, wisdom, and community.</p>' +
                '  <p class="login-required-subtext">Please login or create an account first to continue.</p>' +
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
        updateLoginRequiredOverlayOffset();
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
