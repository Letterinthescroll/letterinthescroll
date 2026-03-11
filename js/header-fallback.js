/**
 * Minimal navigation helpers for pages that reuse the global header
 * without loading the full interactive Torah experience.
 */
(function() {
    'use strict';

    function redirectTo(url) {
        window.location.href = url;
    }

    function wireRedirect(selector, url) {
        document.querySelectorAll(selector).forEach(element => {
            if (!element) return;
            element.addEventListener('click', event => {
                event.preventDefault();
                redirectTo(url);
            });
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        const fallbackEnabled = document.body && document.body.dataset && document.body.dataset.headerFallback === 'true';
        if (!fallbackEnabled) {
            return;
        }

        const redirectMap = [
            { selector: '#home-branding', url: '/dashboard' },
            { selector: '#go-to-weekly', url: '/study' },
            { selector: '#my-bookmarks-btn', url: '/bookmarks' },
            { selector: '#logout-btn', url: '/' },
            { selector: '#general-parsha-chat', url: '/study#general-parsha-chat' },
            { selector: '#general-parsha-chat-mobile', url: '/study#general-parsha-chat' },
            { selector: '#show-significance', url: '/study#significance' },
            { selector: '#show-significance-mobile', url: '/study#significance' },
            { selector: '#prev-parsha', url: '/study' },
            { selector: '#next-parsha', url: '/study' }
        ];

        redirectMap.forEach(item => wireRedirect(item.selector, item.url));

        document.querySelectorAll('#parsha-selector').forEach(select => {
            select.addEventListener('change', event => {
                event.preventDefault();
                redirectTo('study.html');
            });
        });
    });
})();
