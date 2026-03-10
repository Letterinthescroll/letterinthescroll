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
            { selector: '#home-branding', url: 'index.html' },
            { selector: '#go-to-weekly', url: 'index.html' },
            { selector: '#my-bookmarks-btn', url: 'index.html#bookmarks' },
            { selector: '#logout-btn', url: 'index.html#account' },
            { selector: '#general-parsha-chat', url: 'index.html#general-parsha-chat' },
            { selector: '#general-parsha-chat-mobile', url: 'index.html#general-parsha-chat' },
            { selector: '#show-significance', url: 'index.html#significance' },
            { selector: '#show-significance-mobile', url: 'index.html#significance' },
            { selector: '#prev-parsha', url: 'index.html' },
            { selector: '#next-parsha', url: 'index.html' }
        ];

        redirectMap.forEach(item => wireRedirect(item.selector, item.url));

        document.querySelectorAll('#parsha-selector').forEach(select => {
            select.addEventListener('change', event => {
                event.preventDefault();
                redirectTo('index.html');
            });
        });
    });
})();
