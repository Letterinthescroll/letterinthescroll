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
            { selector: '#home-branding', url: 'dashboard.html' },
            { selector: '#go-to-weekly', url: 'study.html' },
            { selector: '#my-bookmarks-btn', url: 'bookmarks.html' },
            { selector: '#logout-btn', url: 'index.html' },
            { selector: '#general-parsha-chat', url: 'study.html#general-parsha-chat' },
            { selector: '#general-parsha-chat-mobile', url: 'study.html#general-parsha-chat' },
            { selector: '#show-significance', url: 'study.html#significance' },
            { selector: '#show-significance-mobile', url: 'study.html#significance' },
            { selector: '#prev-parsha', url: 'study.html' },
            { selector: '#next-parsha', url: 'study.html' }
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
