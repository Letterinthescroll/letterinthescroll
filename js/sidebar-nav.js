/*
 * Mobile-only hamburger navigation for the global header.
 * - Desktop: header stays exactly as-is (inline buttons)
 * - Mobile (≤960px): hamburger button reveals a slide-in drawer
 *
 * This script CLONES the header actions into a separate drawer
 * so the original header is never modified on desktop.
 */
(function initMobileNav() {
    'use strict';

    var MOBILE_BREAKPOINT = 960;

    function onReady(fn) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', fn, { once: true });
        } else {
            fn();
        }
    }

    onReady(function () {
        var body        = document.body;
        var header      = document.querySelector('.header-main');
        var hContainer  = header ? header.querySelector('.header-container') : null;
        var actionsWrap = hContainer ? hContainer.querySelector('.header-actions-wrapper') : null;
        var hActions    = actionsWrap ? actionsWrap.querySelector('#header-actions') : null;
        var scriptEl    = document.currentScript || Array.prototype.find.call(document.scripts, function (s) {
            return s && s.src && /sidebar-nav\.js(?:$|\?)/.test(s.src);
        });
        var srcAttr = scriptEl && scriptEl.getAttribute ? scriptEl.getAttribute('src') : '';
        var srcMatch = srcAttr && srcAttr.match(/^(.*)js\/sidebar-nav\.js(?:[?#].*)?$/);
        var siteBasePath = srcMatch ? srcMatch[1] : '';

        function getSitePath(relativePath) {
            return siteBasePath + relativePath;
        }

        function getAssetPath(fileName) {
            return getSitePath('media/images/' + fileName);
        }

        // Bail if the required header structure is missing on this page
        if (!body || !header || !hContainer || !actionsWrap || !hActions) {
            return;
        }

        // Prevent double-init
        if (body.classList.contains('sidebar-nav-enabled')) return;
        body.classList.add('sidebar-nav-enabled');

        // ── 1. Build the mobile drawer (separate from original header)
        var sidebar = document.createElement('div');
        sidebar.className = 'site-sidebar';
        sidebar.id = 'site-sidebar';
        sidebar.setAttribute('role', 'navigation');
        sidebar.setAttribute('aria-label', 'Mobile navigation');

        // ── 2. Build the sidebar head (brand + close btn)
        var sidebarHead = document.createElement('div');
        sidebarHead.className = 'site-sidebar-head';

        var brandLink = document.createElement('a');
        brandLink.href = '/dashboard';
        brandLink.className = 'site-sidebar-brand-link';
        brandLink.setAttribute('aria-label', 'Go to dashboard home');
        brandLink.title = 'A Letter in the Scroll';

        var logoMark = document.createElement('span');
        logoMark.className = 'site-sidebar-logo-mark';
        var logoImg = document.createElement('img');
        logoImg.src = getAssetPath('logonew.png');
        logoImg.alt = 'A Letter in the Scroll';
        logoImg.className = 'site-sidebar-logo';
        logoImg.width = 40;
        logoImg.height = 40;
        logoImg.decoding = 'async';
        logoImg.addEventListener('error', function () {
            this.src = getAssetPath('IconOnly.png');
        }, { once: true });
        logoMark.appendChild(logoImg);

        brandLink.appendChild(logoMark);

        // Close button (X) inside the drawer
        var closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'site-sidebar-close-btn';
        closeBtn.setAttribute('aria-label', 'Close navigation');
        closeBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

        sidebarHead.appendChild(brandLink);
        sidebarHead.appendChild(closeBtn);
        sidebar.appendChild(sidebarHead);

        // ── 3. Build nav items directly with icons (not cloned from header)
        var sidebarNav = document.createElement('div');
        sidebarNav.id = 'sidebar-nav-actions';
        sidebarNav.className = 'header-actions';

        var navItems = [
            { href: '/dashboard', label: 'Home',     icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10.5L12 3l9 7.5M5 9.5V21h14V9.5"/>' },
            { href: '/study',     label: 'Study',    icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>' },
            { href: '/holidays',  label: 'Holidays', icon: '<rect x="3" y="5" width="18" height="16" rx="2" ry="2" stroke-width="2"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 3v4M8 3v4M3 11h18"/>' },
            { href: '/prayers',   label: 'Prayers',  icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3l2.4 4.9L20 9l-4 3.9.9 5.6L12 16l-4.9 2.5.9-5.6L4 9l5.6-1.1L12 3z"/>' },
            { href: '/songs',     label: 'Songs',    icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-2v13"/><circle cx="6" cy="18" r="3" stroke-width="2"/><circle cx="18" cy="16" r="3" stroke-width="2"/>' },
            { href: '/food',      label: 'Food',     icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 2v7c0 1.1.9 2 2 2h4c1.1 0 2-.9 2-2V2M7 2v20M21 15V2a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3m0 0v7"/>' },
            { href: '/about',     label: 'About',    icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>' }
        ];

        navItems.forEach(function (item) {
            var a = document.createElement('a');
            a.href = item.href;
            a.className = 'header-btn header-btn-secondary';
            a.title = item.label;
            a.innerHTML = '<span class="header-btn-text">' + item.label + '</span>';
            sidebarNav.appendChild(a);
        });

        sidebar.appendChild(sidebarNav);

        // ── 3b. Add Account section (Bookmarks, Account Settings, Sign Out)
        var accountSection = document.createElement('div');
        accountSection.className = 'site-sidebar-account-section';
        accountSection.id = 'sidebar-account-section';

        var accountDivider = document.createElement('div');
        accountDivider.className = 'site-sidebar-divider';
        accountSection.appendChild(accountDivider);

        var bookmarkBtn = document.createElement('a');
        bookmarkBtn.href = '/bookmarks';
        bookmarkBtn.className = 'header-btn header-btn-secondary';
        bookmarkBtn.title = 'My bookmarks';
        bookmarkBtn.innerHTML = '<svg class="header-btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg><span class="header-btn-text">Bookmarks</span>';
        accountSection.appendChild(bookmarkBtn);

        var flashcardsBtn = document.createElement('a');
        flashcardsBtn.href = '/flashcards';
        flashcardsBtn.className = 'header-btn header-btn-secondary';
        flashcardsBtn.title = 'My flashcards';
        flashcardsBtn.innerHTML = '<svg class="header-btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="6" width="15" height="11" rx="1.5" stroke-width="2"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 4h13a1.5 1.5 0 011.5 1.5V15"/></svg><span class="header-btn-text">Flashcards</span>';
        flashcardsBtn.addEventListener('click', function (e) {
            if (localStorage.getItem('alits_hebrew_study_mode') === 'true') return;
            e.preventDefault();
            closeDrawer();
            if (document.getElementById('study-mode-gate-modal')) return;
            var ov = document.createElement('div');
            ov.id = 'study-mode-gate-modal';
            ov.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.45);backdrop-filter:blur(4px)';
            ov.innerHTML =
                '<div style="background:#fff;border-radius:1.35rem;padding:2rem 2rem 1.6rem;max-width:380px;width:90%;box-shadow:0 24px 60px rgba(0,0,0,.18);text-align:center">' +
                '<div style="width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#f0f7ff,#ede9fe);display:flex;align-items:center;justify-content:center;margin:0 auto 1rem"><svg width="22" height="22" fill="none" stroke="#6d28d9" viewBox="0 0 24 24"><rect x="3" y="6" width="15" height="11" rx="1.5" stroke-width="2"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 4h13a1.5 1.5 0 011.5 1.5V15"/></svg></div>' +
                '<div style="font-size:1.1rem;font-weight:700;color:#1a1a2e;margin-bottom:.45rem">Hebrew Study Mode is off</div>' +
                '<div style="font-size:.82rem;color:#6b7280;line-height:1.6;margin-bottom:1.4rem">Flashcards are part of Hebrew Study Mode — a feature that lets you save words as you read and review them with spaced repetition.<br><br>Turn it on in Settings to get started.</div>' +
                '<div style="display:flex;gap:.55rem;justify-content:center">' +
                '<button id="smg-close2" style="padding:.52rem 1.2rem;border-radius:2rem;font-size:.78rem;font-weight:600;cursor:pointer;border:none;background:#f3f4f6;color:#374151">Maybe later</button>' +
                '<button id="smg-settings2" style="padding:.52rem 1.2rem;border-radius:2rem;font-size:.78rem;font-weight:600;cursor:pointer;border:none;background:#1a1a2e;color:#fff">Go to Settings</button>' +
                '</div></div>';
            document.body.appendChild(ov);
            ov.addEventListener('click', function (ev) { if (ev.target === ov) ov.remove(); });
            ov.querySelector('#smg-close2').addEventListener('click', function () { ov.remove(); });
            ov.querySelector('#smg-settings2').addEventListener('click', function () { window.location.href = '/settings#sec-hebrew-study'; });
        });
        accountSection.appendChild(flashcardsBtn);

        var journalBtn = document.createElement('a');
        journalBtn.href = '/journal';
        journalBtn.className = 'header-btn header-btn-secondary';
        journalBtn.title = 'Spiritual journal';
        journalBtn.innerHTML = '<svg class="header-btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg><span class="header-btn-text">Journal</span>';
        accountSection.appendChild(journalBtn);

        var settingsBtn = document.createElement('a');
        settingsBtn.href = '/settings';
        settingsBtn.className = 'header-btn header-btn-secondary';
        settingsBtn.title = 'Account settings';
        settingsBtn.innerHTML = '<svg class="header-btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg><span class="header-btn-text">Account</span>';
        accountSection.appendChild(settingsBtn);

        var signOutBtn = document.createElement('button');
        signOutBtn.type = 'button';
        signOutBtn.className = 'header-btn header-btn-secondary site-sidebar-signout';
        signOutBtn.title = 'Sign out';
        signOutBtn.innerHTML = '<svg class="header-btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg><span class="header-btn-text">Sign Out</span>';
        signOutBtn.addEventListener('click', function () {
            sessionStorage.removeItem('headerUserCache');
            sessionStorage.setItem('justSignedOut', '1');
            if (window.firebase && window.firebase.auth) {
                window.firebase.auth().signOut().then(function () {
                    window.location.href = '/';
                }).catch(function () {
                    window.location.href = '/';
                });
            } else {
                window.location.href = '/';
            }
        });
        accountSection.appendChild(signOutBtn);

        sidebar.appendChild(accountSection);

        document.body.appendChild(sidebar);

        // ── Highlight the active page in the sidebar ──
        (function highlightActivePage() {
            var path = window.location.pathname.replace(/\/$/, '') || '/';
            var page = path.split('/').filter(Boolean).pop() || '';

            var pageMap = {
                'study':      'a[href$="/study"]',
                '':           'a[href$="/study"]',
                'dashboard':  'a[href$="/dashboard"]',
                'holidays':   'a[href$="/holidays"]',
                'prayers':    'a[href$="/prayers"]',
                'songs':      'a[href$="/songs"]',
                'food':       'a[href$="/food"]',
                'about':      'a[href$="/about"]',
                'bookmarks':  'a[href$="/bookmarks"]',
                'settings':   'a[href$="/settings"]',
                'song-detail':'a[href$="/songs"]'
            };

            var holidayPages = [
                'hanukkah', 'rosh-hashanah', 'yom-kippur',
                'lag-baomer', 'shavuot', 'sukkot',
                'tu-bishvat', 'yom-haatzmaut', 'yom-hazikaron',
                'shabbat-preview', 'passover', 'purim'
            ];
            var isHolidayPage = path.indexOf('/holidays') !== -1 ||
                holidayPages.some(function(h) { return page === h || path.indexOf(h) !== -1; });
            if (isHolidayPage) {
                page = '__holidays__';
                pageMap['__holidays__'] = 'a[href$="/holidays"]';
            }

            // Food sub-pages (e.g. /food/recipes/...)
            if (path.indexOf('/food') === 0 && page !== 'food') {
                page = 'food';
            }

            var selector = pageMap[page];
            if (!selector) return;

            var activeEl = sidebarNav.querySelector(selector) || accountSection.querySelector(selector);
            if (activeEl) {
                activeEl.classList.add('header-btn--active');
                activeEl.setAttribute('aria-current', 'page');
            }
        })();

        // ── 4. Hamburger button — appended to body for z-index safety
        var hamburger = document.createElement('button');
        hamburger.type = 'button';
        hamburger.id = 'site-hamburger';
        hamburger.className = 'site-header-nav-toggle';
        hamburger.setAttribute('aria-controls', 'site-sidebar');
        hamburger.setAttribute('aria-expanded', 'false');
        hamburger.setAttribute('aria-label', 'Open navigation menu');
        hamburger.innerHTML =
            '<span class="site-header-nav-toggle-icon" aria-hidden="true">' +
            '<span></span><span></span><span></span>' +
            '</span>';
        document.body.appendChild(hamburger);

        // ── 5. Backdrop
        var backdrop = document.createElement('div');
        backdrop.className = 'site-sidebar-backdrop';
        backdrop.setAttribute('aria-hidden', 'true');
        document.body.appendChild(backdrop);

        // ── 6. State helpers (mobile only)
        var mql = window.matchMedia('(max-width: ' + MOBILE_BREAKPOINT + 'px)');

        function isMobile() { return mql.matches; }
        function isOpen()   { return body.classList.contains('sidebar-nav-mobile-open'); }

        function openDrawer() {
            body.classList.add('sidebar-nav-mobile-open');
            hamburger.setAttribute('aria-expanded', 'true');
            hamburger.setAttribute('aria-label', 'Close navigation menu');
            body.style.overflow = 'hidden';
        }

        function closeDrawer() {
            body.classList.remove('sidebar-nav-mobile-open');
            hamburger.setAttribute('aria-expanded', 'false');
            hamburger.setAttribute('aria-label', 'Open navigation menu');
            body.style.overflow = '';
        }

        function sync() {
            if (!isMobile()) {
                closeDrawer();
            }
        }

        // ── 7. Event listeners
        hamburger.addEventListener('click', function (e) {
            e.stopPropagation();
            isOpen() ? closeDrawer() : openDrawer();
        });

        closeBtn.addEventListener('click', function () {
            closeDrawer();
        });

        backdrop.addEventListener('click', function () {
            closeDrawer();
        });

        // Close when user taps a nav link inside the drawer
        sidebar.addEventListener('click', function (e) {
            if (e.target.closest('.site-sidebar-close-btn')) return;
            if (e.target.closest('.text-size-control')) return;
            if (e.target.closest('a') || e.target.closest('button')) {
                closeDrawer();
            }
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && isOpen()) closeDrawer();
        });

        if (typeof mql.addEventListener === 'function') {
            mql.addEventListener('change', sync);
        } else if (typeof mql.addListener === 'function') {
            mql.addListener(sync);
        }

        sync();
    });
})();
