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

        // ── 2. Build the sidebar head (brand link + close btn)
        var sidebarHead = document.createElement('div');
        sidebarHead.className = 'site-sidebar-head';

        var brandLink = document.createElement('a');
        brandLink.href = '/dashboard';
        brandLink.className = 'site-sidebar-brand-link';
        brandLink.title = 'A Letter in the Scroll — Home';

        var brand = document.createElement('span');
        brand.className = 'site-sidebar-brand';
        brand.setAttribute('aria-hidden', 'true');
        var brandImg = document.createElement('img');
        brandImg.src = getAssetPath('IconOnly.png');
        brandImg.alt = '';
        brandImg.style.width = '28px';
        brandImg.style.height = '28px';
        brandImg.style.objectFit = 'contain';
        brandImg.style.display = 'block';
        brandImg.addEventListener('error', function () {
            this.src = getAssetPath('Icon.png');
        }, { once: true });
        brand.appendChild(brandImg);

        var sidebarTitle = document.createElement('span');
        sidebarTitle.className = 'site-sidebar-title';
        sidebarTitle.textContent = 'A Letter in the Scroll';

        brandLink.appendChild(brand);
        brandLink.appendChild(sidebarTitle);

        // Close button (X) inside the drawer
        var closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'site-sidebar-close-btn';
        closeBtn.setAttribute('aria-label', 'Close navigation');
        closeBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

        sidebarHead.appendChild(brandLink);
        sidebarHead.appendChild(closeBtn);
        sidebar.appendChild(sidebarHead);

        // ── 3. CLONE nav items into the drawer (original stays in header)
        var clonedActions = hActions.cloneNode(true);
        clonedActions.id = 'sidebar-nav-actions'; // unique ID to avoid conflicts
        clonedActions.className = 'header-actions';
        sidebar.appendChild(clonedActions);

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

        // ── Move user pill/dropdown to bottom of sidebar (above sign out) ──
        var userPill = clonedActions.querySelector('.header-user-pill');
        var userDropdownContainer = clonedActions.querySelector('#header-user-dropdown-container');
        var pillToMove = userDropdownContainer || (userPill ? userPill.parentElement : null);
        if (pillToMove && accountSection.contains(signOutBtn)) {
            accountSection.insertBefore(pillToMove, signOutBtn);
        }

        // ── Highlight the active page in the sidebar clone ──
        (function highlightActivePage() {
            var path = window.location.pathname.replace(/\/$/, '') || '/';
            var page = path.split('/').filter(Boolean).pop() || '';

            var pageMap = {
                'study':      '#go-to-weekly',
                '':           '#go-to-weekly',
                'dashboard':  'a[href$="/dashboard"]',
                'prayers':    'a[href$="/prayers"]',
                'songs':      'a[href$="/songs"]',
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

            var selector = pageMap[page];
            if (!selector) return;

            // Highlight in the sidebar clone (use clonedActions, not hActions)
            var activeEl = clonedActions.querySelector(selector);
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
