/**
 * footer-loader.js — Shared footer loader with sessionStorage caching.
 *
 * Usage: add <div id="shared-footer-mount"></div> before </body>,
 * then include <script src="/js/footer-loader.js"></script>.
 *
 * Features:
 *  - Fetches /includes/footer.html and caches in sessionStorage
 *  - Replaces __YEAR__ with the current year
 *  - Cycles inspirational Jewish quotes every 5 seconds
 *  - Dispatches 'shared-footer:ready' when mounted
 */
(function () {
    'use strict';

    var FOOTER_TEMPLATE_URL = '/includes/footer.html';
    var CACHE_KEY = 'cachedFooterTemplate';
    var CACHE_VER_KEY = 'cachedFooterVersion';
    var CACHE_VERSION = '10';
    var YEAR_TOKEN = '__YEAR__';

    /* ── Inspirational quotes ─────────────────────────────────────────── */
    var QUOTES = [
        { text: 'The world is a very narrow bridge, and the main thing is not to be afraid at all.', author: 'Rabbi Nachman of Breslov' },
        { text: 'In a place where there are no worthy people, strive to be a worthy person.', author: 'Pirkei Avot 2:5' },
        { text: 'It is not your duty to finish the work, but neither are you free to neglect it.', author: 'Pirkei Avot 2:16' },
        { text: 'Every blade of grass has its angel that bends over it and whispers, "Grow, grow."', author: 'The Talmud, Bereishit Rabbah 10:6' },
        { text: 'Who is wise? One who learns from every person.', author: 'Pirkei Avot 4:1' },
        { text: 'Whoever saves a single life, it is as if they saved an entire world.', author: 'Mishnah Sanhedrin 4:5' },
        { text: 'The Torah was given to make peace in the world.', author: 'Rambam, Mishneh Torah' },
        { text: 'Do not be daunted by the enormity of the world\u2019s grief. Walk humbly now. Do justly now. Love mercy now.', author: 'Rabbi Rami Shapiro' },
        { text: 'Begin with yourself, but do not end with yourself.', author: 'Rabbi Hillel, Pirkei Avot 1:14' },
        { text: 'Wherever you go, there you are. And that is exactly where God needs you.', author: 'The Kotzker Rebbe' },
        { text: 'A little light dispels a great deal of darkness.', author: 'Rabbi Schneur Zalman of Liadi' },
        { text: 'The highest form of wisdom is kindness.', author: 'The Talmud, Berachot 17a' },
        { text: 'If I am not for myself, who will be for me? But if I am only for myself, what am I?', author: 'Rabbi Hillel, Pirkei Avot 1:14' },
        { text: 'We do not see things as they are. We see things as we are.', author: 'The Talmud' },
        { text: 'Despair is not an option. There is always hope, always a new beginning.', author: 'The Lubavitcher Rebbe' },
        { text: 'When you have learned how to walk, you have learned how to dance. And learning Torah is learning the dance of life.', author: 'The Baal Shem Tov' },
        { text: 'What comes from the heart, enters the heart.', author: 'Rabbi Moses ibn Ezra' },
        { text: 'The righteous promise little and do much.', author: 'The Talmud, Bava Metzia 87a' },
        { text: 'Make for yourself a teacher, acquire for yourself a friend.', author: 'Pirkei Avot 1:6' },
        { text: 'The purpose of Torah is not information but transformation.', author: 'Rabbi Jonathan Sacks' }
    ];

    /* ── Template loading with sessionStorage cache ───────────────────── */
    function loadTemplate() {
        try {
            var ver = sessionStorage.getItem(CACHE_VER_KEY);
            if (ver === CACHE_VERSION) {
                var cached = sessionStorage.getItem(CACHE_KEY);
                if (cached && cached.indexOf(YEAR_TOKEN) !== -1) return cached;
            }
        } catch (_) {}

        try {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', FOOTER_TEMPLATE_URL, false);
            xhr.send(null);
            var ok = (xhr.status >= 200 && xhr.status < 300) || xhr.status === 0;
            if (ok && xhr.responseText && xhr.responseText.indexOf('shared-footer') !== -1) {
                try {
                    sessionStorage.setItem(CACHE_KEY, xhr.responseText);
                    sessionStorage.setItem(CACHE_VER_KEY, CACHE_VERSION);
                } catch (_) {}
                return xhr.responseText;
            }
        } catch (_) {}

        return '<footer class="shared-footer"><div class="footer-container"><div class="footer-bottom"><p class="footer-copyright">&copy; ' + YEAR_TOKEN + ' A Letter in the Scroll</p></div></div></footer>';
    }

    /* ── Quote cycler ─────────────────────────────────────────────────── */
    function startQuoteCycler() {
        var el = document.getElementById('footer-quote');
        if (!el) return;

        var idx = Math.floor(Math.random() * QUOTES.length);

        function render() {
            var q = QUOTES[idx];
            el.style.opacity = '0';
            setTimeout(function () {
                el.innerHTML = '\u201C' + q.text + '\u201D<span class="footer-quote-author"> \u2014 ' + q.author + '</span>';
                el.style.opacity = '1';
            }, 400);
        }

        render();
        setInterval(function () {
            idx = (idx + 1) % QUOTES.length;
            render();
        }, 12000);
    }

    /* ── Mount ──────────────────────────────────────────────────────────── */
    function mountFooter() {
        var mount = document.getElementById('shared-footer-mount');
        if (!mount) return;

        var year = new Date().getFullYear();
        var html = loadTemplate().replace(YEAR_TOKEN, year);
        mount.outerHTML = html;

        startQuoteCycler();

        try {
            document.dispatchEvent(new CustomEvent('shared-footer:ready'));
        } catch (_) {
            var evt = document.createEvent('Event');
            evt.initEvent('shared-footer:ready', true, true);
            document.dispatchEvent(evt);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mountFooter);
    } else {
        mountFooter();
    }

})();
