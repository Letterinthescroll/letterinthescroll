/**
 * header-loader.js — Modular header loader with sessionStorage caching.
 *
 * Usage: add <div id="shared-header-mount" style="background:linear-gradient(135deg,#0c1a3e 0%,#16285e 45%,#1e3a8a 100%);min-height:64px"></div>
 * then include <script src="/js/header-loader.js"></script> (before page-auth.js / main.js).
 *
 * Features:
 *  - Fetches /includes/header.html and caches it in sessionStorage
 *  - Auto-highlights the current page's nav button (including holiday sub-pages)
 *  - Dispatches 'shared-header:ready' + 'headerLoaded' events when the header is in the DOM
 *  - Prefetches pages on hover for instant navigation
 *  - Smooth page transitions (fade-out on leave, fade-in on arrive)
 *  - The user-dropdown pill is still injected separately by main.js or page-auth.js
 */
(function () {
    'use strict';

    var HEADER_TEMPLATE_URL = '/includes/header.html';
    var CACHE_KEY = 'cachedHeaderTemplate';
    var NAV_TOKEN = '__NAV_ITEMS__';

    /* ── Nav items ──────────────────────────────────────────────────────── */
    var NAV = [
        {
            href: '/dashboard',
            label: 'Home',
            title: 'Dashboard home',
            icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10.5L12 3l9 7.5M5 9.5V21h14V9.5"/>'
        },
        {
            href: '/study',
            label: 'Study',
            title: 'Open study room',
            icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>'
        },
        {
            href: '/holidays',
            label: 'Holidays',
            title: 'Jewish holidays',
            icon: '<rect x="3" y="5" width="18" height="16" rx="2" ry="2" stroke-width="2"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 3v4M8 3v4M3 11h18"/>'
        },
        {
            href: '/prayers',
            label: 'Prayers',
            title: 'Important prayers',
            icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3l2.4 4.9L20 9l-4 3.9.9 5.6L12 16l-4.9 2.5.9-5.6L4 9l5.6-1.1L12 3z"/>'
        },
        {
            href: '/songs',
            label: 'Songs',
            title: 'Songs and poems',
            icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-2v13"/><circle cx="6" cy="18" r="3" stroke-width="2"/><circle cx="18" cy="16" r="3" stroke-width="2"/>'
        },
        {
            href: '/about',
            label: 'About',
            title: 'About this project',
            icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>'
        }
    ];

    /* ── Detect active page ─────────────────────────────────────────────── */
    var path = window.location.pathname
        .replace(/\/index\.html$/, '/')
        .replace(/\/$/, '') || '/dashboard';

    function isActive(navHref) {
        var clean = navHref.replace(/\/$/, '');
        if (path === clean) return true;

        // Sub-page match (e.g. /holidays/purim → /holidays is active)
        if (clean !== '/dashboard' && path.indexOf(clean + '/') === 0) return true;

        // Holiday individual pages at root level (e.g. /rosh-hashanah, /hanukkah)
        var holidaySlugs = [
            'rosh-hashanah', 'yom-kippur', 'sukkot', 'hanukkah', 'tu-bishvat',
            'purim', 'passover', 'shavuot', 'lag-baomer', 'yom-hazikaron', 'yom-haatzmaut'
        ];

        if (clean === '/holidays') {
            var slug = path.split('/')[1];
            if (holidaySlugs.indexOf(slug) !== -1) return true;
        }

        return false;
    }

    function buildNavHtml() {
        return NAV.map(function (item) {
            var active = isActive(item.href);
            var cls = active ? 'header-btn header-btn-primary' : 'header-btn header-btn-secondary';
            var aria = active ? ' aria-current="page"' : '';
            var id = item.href === '/study' ? ' id="go-to-weekly"' : '';
            return '<a' + id + ' href="' + item.href + '" class="' + cls + '" title="' + item.title + '"' + aria + '>' +
                '<svg class="header-btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">' + item.icon + '</svg>' +
                '<span class="header-btn-text">' + item.label + '</span>' +
                '</a>';
        }).join('\n                ');
    }

    /* ── Inline fallback (used if fetch + cache both miss) ────────────── */
    function fallbackTemplate() {
        return '' +
            '<header class="header-main relative z-30" style="background:linear-gradient(135deg,#0c1a3e 0%,#16285e 45%,#1e3a8a 100%)">' +
            '  <div class="header-container">' +
            '    <div class="header-branding-section">' +
            '      <a id="home-branding" href="/dashboard" aria-label="Go to dashboard home" class="header-branding-button" style="text-decoration:none">' +
            '        <div class="header-text">' +
            '          <h1 class="header-title">A Letter in the Scroll</h1>' +
            '          <p class="header-subtitle">Interactive Weekly Portion Study &amp; Discussion</p>' +
            '        </div>' +
            '      </a>' +
            '    </div>' +
            '    <div class="header-actions-wrapper">' +
            '      <div id="header-actions" class="header-actions">' +
                         NAV_TOKEN +
            '        <!-- User dropdown injected by main.js / page-auth.js -->' +
            '      </div>' +
            '    </div>' +
            '  </div>' +
            '</header>';
    }

    /* ── Template loading with sessionStorage cache ───────────────────── */
    function loadTemplate() {
        // 1. Try sessionStorage cache first (instant)
        try {
            var cached = sessionStorage.getItem(CACHE_KEY);
            if (cached && cached.indexOf(NAV_TOKEN) !== -1) return cached;
        } catch (_) { /* storage unavailable */ }

        // 2. Synchronous fetch (keeps header render blocking to avoid layout shift)
        try {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', HEADER_TEMPLATE_URL, false);
            xhr.send(null);

            var okStatus = (xhr.status >= 200 && xhr.status < 300) || xhr.status === 0;
            if (okStatus && xhr.responseText && xhr.responseText.indexOf(NAV_TOKEN) !== -1) {
                try { sessionStorage.setItem(CACHE_KEY, xhr.responseText); } catch (_) { /* quota */ }
                return xhr.responseText;
            }
        } catch (_) { /* network error */ }

        // 3. Inline fallback
        return fallbackTemplate();
    }

    /* ── Dispatch ready events ────────────────────────────────────────── */
    function dispatchHeaderReady() {
        window.__sharedHeaderReady = true;
        try {
            document.dispatchEvent(new CustomEvent('shared-header:ready'));
            document.dispatchEvent(new CustomEvent('headerLoaded'));
        } catch (_) {
            var evt = document.createEvent('Event');
            evt.initEvent('shared-header:ready', true, true);
            document.dispatchEvent(evt);
            var evt2 = document.createEvent('Event');
            evt2.initEvent('headerLoaded', true, true);
            document.dispatchEvent(evt2);
        }
    }

    /* ── Mount ──────────────────────────────────────────────────────────── */
    function mountHeader() {
        var mount = document.getElementById('shared-header-mount');
        if (!mount) return;

        var navHtml = buildNavHtml();
        var headerHtml = loadTemplate().replace(NAV_TOKEN, navHtml);
        mount.outerHTML = headerHtml;
        dispatchHeaderReady();
    }

    mountHeader();

    /* ── Pre-render user pill from cache (prevents layout shift) ──────
       page-auth.js / main.js are ES modules (deferred), so they run
       after DOM parse — too late for the first paint.  We read the same
       sessionStorage cache they write to and render the pill now, inside
       the synchronous header-loader script.  When the auth module runs
       later it tears down this container and rebuilds it identically,
       so there is zero visual change.
       ─────────────────────────────────────────────────────────────────── */
    (function preRenderUserPill() {
        var ha = document.getElementById('header-actions');
        if (!ha) return;

        var cached = null;
        try { cached = JSON.parse(sessionStorage.getItem('headerUserCache')); } catch (_) { return; }
        if (!cached || !cached.firstName) return;

        var initial = cached.firstName.charAt(0).toUpperCase();
        var container = document.createElement('div');
        container.id = 'header-user-dropdown-container';
        container.style.cssText = 'position:relative;display:flex;align-items:center;';
        container.innerHTML =
            '<button id="header-user-menu-btn" class="header-user-pill" title="Account Menu" aria-haspopup="true" aria-expanded="false">' +
                '<div class="header-user-avatar" aria-hidden="true">' + initial + '</div>' +
                '<span class="header-btn-text">' + cached.firstName + '</span>' +
                '<svg class="header-user-chevron" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">' +
                    '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/>' +
                '</svg>' +
            '</button>';
        ha.appendChild(container);
    })();

    /* ══════════════════════════════════════════════════════════════════════
       Navigation helpers — prefetch on hover + prevent re-navigation
       Page transitions are handled by the CSS View Transitions API
       (see style.css @view-transition). No manual fade needed.
       ══════════════════════════════════════════════════════════════════════ */

    /* ── Prefetch pages on hover ──────────────────────────────────────── */
    var prefetched = {};
    function prefetchHref(href) {
        if (prefetched[href]) return;
        prefetched[href] = true;
        var link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = href;
        document.head.appendChild(link);
    }

    document.addEventListener('mouseover', function (e) {
        var a = e.target.closest && e.target.closest('a[href]');
        if (!a) return;
        var href = a.getAttribute('href');
        if (!href || href.charAt(0) === '#' || href.indexOf('://') !== -1 || href.indexOf('mailto:') === 0) return;
        prefetchHref(href);
    }, { passive: true });

    /* ── Prevent re-navigation to the current page ────────────────────── */
    document.addEventListener('click', function (e) {
        var a = e.target.closest && e.target.closest('a[href]');
        if (!a) return;
        if (a.getAttribute('aria-current') === 'page') {
            e.preventDefault();
        }
    });
})();
