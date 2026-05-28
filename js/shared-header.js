/**
 * shared-header.js — Single source of truth for the site header.
 *
 * Usage: add <div id="shared-header-mount"></div> where the <header> used to be,
 * then include <script src="/js/shared-header.js"></script> (before page-auth.js / main.js).
 *
 * The script auto-highlights the current page's nav button.
 * The user-dropdown pill is still injected separately by main.js or page-auth.js.
 *
 * Also handles:
 *  - Prefetching pages on hover for instant navigation
 *  - Smooth page transitions (fade-out on leave, fade-in on arrive)
 */
(function () {
    'use strict';

    var HEADER_TEMPLATE_URL = '/header.html';
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

    /* Optional nav item, shown only when the user enables Daily Prayers in Settings.
       Inserted just before About so it sits with the content pages. */
    try {
        if (localStorage.getItem('alits_daily_prayers') === 'true') {
            NAV.splice(NAV.length - 1, 0, {
                href: '/daily-prayer-guidelines',
                label: 'Daily',
                title: 'Daily prayer guidelines',
                icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3c-1.1 2.2-2.5 3.6-4 4.5C6.2 8.6 5 10.6 5 13a7 7 0 0014 0c0-2.4-1.2-4.4-3-5.5-1.5-.9-2.9-2.3-4-4.5z"/>'
            });
        }
    } catch (_) {}

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
                '<span class="header-btn-text">' + item.label + '</span>' +
                '</a>';
        }).join('\n                ');
    }

    function fallbackTemplate() {
        return '' +
            '<header class="header-main relative z-30">' +
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

    function loadTemplateSync() {
        try {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', HEADER_TEMPLATE_URL, false);
            xhr.send(null);

            var okStatus = (xhr.status >= 200 && xhr.status < 300) || xhr.status === 0;
            if (okStatus && xhr.responseText) {
                return xhr.responseText;
            }
        } catch (_) {
            // Fall through to inline fallback
        }
        return null;
    }

    function getHeaderTemplate() {
        var template = loadTemplateSync();
        if (!template || template.indexOf(NAV_TOKEN) === -1) {
            template = fallbackTemplate();
        }
        return template;
    }

    function dispatchHeaderReady() {
        window.__sharedHeaderReady = true;
        try {
            document.dispatchEvent(new CustomEvent('shared-header:ready'));
        } catch (_) {
            var event = document.createEvent('Event');
            event.initEvent('shared-header:ready', true, true);
            document.dispatchEvent(event);
        }
    }

    function mountHeader() {
        var mount = document.getElementById('shared-header-mount');
        if (!mount) return;

        var navHtml = buildNavHtml();
        var headerHtml = getHeaderTemplate().replace(NAV_TOKEN, navHtml);
        mount.outerHTML = headerHtml;
        dispatchHeaderReady();
    }

    /* ── Mount ──────────────────────────────────────────────────────────── */
    mountHeader();

    /* ══════════════════════════════════════════════════════════════════════
       Page Transitions — prefetch on hover + smooth fade between pages
       ══════════════════════════════════════════════════════════════════════ */

    /* ── Inject transition styles ─────────────────────────────────────── */
    var style = document.createElement('style');
    style.textContent =
        '@keyframes shPageIn{from{opacity:0}to{opacity:1}}' +
        '.sh-page-ready{animation:shPageIn .18s ease-out both}' +
        '.sh-page-leaving{opacity:0!important;transition:opacity .12s ease-in!important}' +
        '.sh-page-leaving .header-main{opacity:1!important;transition:none!important}';
    document.head.appendChild(style);

    /* ── Fade-in on arrival ───────────────────────────────────────────── */
    document.documentElement.classList.add('sh-page-ready');

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

    /* ── Smooth exit on internal nav clicks ───────────────────────────── */
    document.addEventListener('click', function (e) {
        var a = e.target.closest && e.target.closest('a[href]');
        if (!a) return;

        var href = a.getAttribute('href');
        if (!href || href.charAt(0) === '#' || href.indexOf('://') !== -1 || href.indexOf('mailto:') === 0) return;

        // Skip if modifier keys (new tab, etc.)
        if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
        // Skip if target="_blank"
        if (a.target === '_blank') return;
        // Skip if already on this page
        if (a.getAttribute('aria-current') === 'page') {
            e.preventDefault();
            return;
        }
        // Only apply transition to header/sidebar nav links
        if (!a.closest('.header-actions, .header-branding-section, .site-sidebar')) return;

        e.preventDefault();
        document.documentElement.classList.remove('sh-page-ready');
        document.documentElement.classList.add('sh-page-leaving');
        setTimeout(function () {
            window.location.href = href;
        }, 120);
    });
})();
