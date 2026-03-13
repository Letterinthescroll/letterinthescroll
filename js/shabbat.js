/* ============================================
   SHABBAT MODE
   Activates every Friday at 1:00 AM local time.
   Deactivates at 5:00 PM Saturday local time.
   ============================================ */

(function () {
    'use strict';

    const LYRICS = [
        `שָׁלוֹם עֲלֵיכֶם מַלְאֲכֵי הַשָּׁלוֹם [הַשָּׁרֵת] מַלְאֲכֵי עֶלְיוֹן
[מִ]מֶּלֶךְ מַלְכֵי הַמְּלָכִים הַקָּדוֹשׁ בָּרוּךְ הוּא`,
        `בּוֹאֲכֶם לְשָׁלוֹם מַלְאֲכֵי הַשָּׁלוֹם [הַשָּׁרֵת] מַלְאֲכֵי עֶלְיוֹן
[מִ]מֶּלֶךְ מַלְכֵי הַמְּלָכִים הַקָּדוֹשׁ בָּרוּךְ הוּא`,
        `בָּרְכוּנִי לְשָׁלוֹם מַלְאֲכֵי הַשָּׁלוֹם [הַשָּׁרֵת] מַלְאֲכֵי עֶלְיוֹן
[מִ]מֶּלֶךְ מַלְכֵי הַמְּלָכִים הַקָּדוֹשׁ בָּרוּךְ הוּא`,
        `צֵאתְכֶם לְשָׁלוֹם מַלְאֲכֵי הַשָּׁלוֹם [הַשָּׁרֵת] מַלְאֲכֵי עֶלְיוֹן
[מִ]מֶּלֶךְ מַלְכֵי הַמְּלָכִים הַקָּדוֹשׁ בָּרוּךְ הוּא`,
        `בְּשִׁבְתְּכֶם לְשָׁלוֹם מַלְאֲכֵי הַשָּׁלוֹם מַלְאֲכֵי עֶלְיוֹן
[מִ]מֶּלֶךְ מַלְכֵי הַמְּלָכִים הַקָּדוֹשׁ בָּרוּךְ הוּא`,
        `כִּי מַלְאָכָיו יְצַוֶּה לָךְ לִשְׁמָרְךָ בְּכָל דְּרָכֶיךָ
ה' יִשְׁמָר צֵאתְךָ וּבוֹאֶךָ מֵעַתָּה וְעַד־עוֹלָם`
    ];

    const BLESSINGS = [
        'Wishing your home warmth, peace, and song',
        'Wishing you joy and gratitude this Shabbat',
        'Wishing you deep happiness and calm',
        'Wishing you meaningful moments with loved ones',
        'Wishing you strength for good deeds and kind words',
        'Wishing you health, healing, and renewal',
        'Wishing you faith, hope, and trust',
        'Wishing you wisdom, clarity, and purpose',
        'Wishing you generous hearts and open doors',
        'Wishing you blessing, light, and sweet rest'
    ];

    const LYRIC_SWITCH_MS = 8200;
    const LYRIC_TRANSITION_MS = 1800;
    const BLESSING_SWITCH_MS = 9800;
    const BLESSING_TRANSITION_MS = 1400;
    const SHABBAT_CHECK_INTERVAL_MS = 60 * 1000;
    const SHABBAT_AUDIO_INTRO_SRC = '/media/audio/AudioShabbatShalom.m4a';
    const SHABBAT_AUDIO_SONG_SRC = '/media/audio/שלום עליכם  Shalom Aleichem.mp3';
    const AUDIO_PLAY_ICON_PATH = 'M8 6v12l10-6z';
    const AUDIO_PAUSE_ICON_PATH = 'M8 6h3v12H8zm5 0h3v12h-3';

    let currentLyricIndex = 0;
    let lyricIntervalId = null;
    let currentBlessingIndex = 0;
    let blessingIntervalId = null;
    let blessingSwapTimeoutId = null;
    let shabbatIntroAudio = null;
    let shabbatSongAudio = null;
    let isAudioPlaying = false;

    function isShabbatPreviewForced() {
        return Boolean(
            document.body &&
            document.body.dataset &&
            document.body.dataset.shabbatPreview === 'true'
        );
    }

    function isShabbatTime(now = new Date()) {
        const day = now.getDay(); // 0=Sun, 5=Fri, 6=Sat
        const hour = now.getHours();

        // Friday from 1:00 AM onward
        if (day === 5 && hour >= 1) {
            return true;
        }

        // Saturday until 5:00 PM local time
        if (day === 6) {
            return hour < 17;
        }

        return false;
    }

    function shouldEnableShabbatMode() {
        return isShabbatPreviewForced() || isShabbatTime();
    }

    function getAudioToggleElements() {
        const toggleButton = document.getElementById('shabbat-audio-toggle');
        const iconPath = toggleButton
            ? toggleButton.querySelector('.shabbat-audio-icon path')
            : null;

        return { toggleButton, iconPath };
    }

    function updateAudioToggleState(isPlaying) {
        const { toggleButton, iconPath } = getAudioToggleElements();
        if (!toggleButton || !iconPath) {
            return;
        }

        toggleButton.classList.toggle('is-playing', isPlaying);
        toggleButton.setAttribute('aria-pressed', isPlaying ? 'true' : 'false');
        toggleButton.setAttribute(
            'aria-label',
            isPlaying ? 'Pause Shabbat songs' : 'Play Shabbat songs'
        );
        iconPath.setAttribute('d', isPlaying ? AUDIO_PAUSE_ICON_PATH : AUDIO_PLAY_ICON_PATH);
    }

    function stopShabbatAudio(resetPosition = true) {
        [shabbatIntroAudio, shabbatSongAudio].forEach((audio) => {
            if (!audio) {
                return;
            }

            audio.pause();
            if (resetPosition) {
                try {
                    audio.currentTime = 0;
                } catch (error) {
                    // Ignore seek failures while metadata is loading.
                }
            }
        });

        isAudioPlaying = false;
        updateAudioToggleState(false);
    }

    function playSecondShabbatTrack() {
        if (!isAudioPlaying || !shabbatSongAudio) {
            return;
        }

        try {
            shabbatSongAudio.currentTime = 0;
        } catch (error) {
            // Ignore seek failures while metadata is loading.
        }

        const playPromise = shabbatSongAudio.play();
        if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(() => {
                stopShabbatAudio(false);
            });
        }
    }

    function initShabbatAudioPlayers() {
        if (shabbatIntroAudio && shabbatSongAudio) {
            return;
        }

        shabbatIntroAudio = new Audio(encodeURI(SHABBAT_AUDIO_INTRO_SRC));
        shabbatSongAudio = new Audio(encodeURI(SHABBAT_AUDIO_SONG_SRC));

        shabbatIntroAudio.preload = 'metadata';
        shabbatSongAudio.preload = 'metadata';

        shabbatIntroAudio.addEventListener('ended', playSecondShabbatTrack);
        shabbatSongAudio.addEventListener('ended', () => {
            isAudioPlaying = false;
            updateAudioToggleState(false);
        });

        const onAudioError = () => {
            stopShabbatAudio(false);
        };

        shabbatIntroAudio.addEventListener('error', onAudioError);
        shabbatSongAudio.addEventListener('error', onAudioError);
    }

    function startShabbatAudioSequence() {
        initShabbatAudioPlayers();
        if (!shabbatIntroAudio) {
            return;
        }

        stopShabbatAudio();
        isAudioPlaying = true;
        updateAudioToggleState(true);

        const playPromise = shabbatIntroAudio.play();
        if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(() => {
                stopShabbatAudio(false);
            });
        }
    }

    function handleShabbatAudioToggle() {
        if (isAudioPlaying) {
            stopShabbatAudio();
            return;
        }

        startShabbatAudioSequence();
    }

    function setupShabbatAudioButton(banner) {
        const toggleButton = banner.querySelector('#shabbat-audio-toggle');
        if (!toggleButton || toggleButton.dataset.bound === 'true') {
            return;
        }

        toggleButton.dataset.bound = 'true';
        toggleButton.addEventListener('click', handleShabbatAudioToggle);
        updateAudioToggleState(false);
    }

    function createLoginShabbatBanner() {
        const loginHeader = document.querySelector('.gradient-header');
        if (!loginHeader || document.getElementById('shabbat-banner')) {
            return;
        }

        const banner = document.createElement('div');
        banner.id = 'shabbat-banner';
        banner.className = 'shabbat-login-banner';
        banner.setAttribute('role', 'region');
        banner.setAttribute('aria-label', 'Shabbat greeting');

        banner.innerHTML =
            '<div class="shabbat-floating-icons" aria-hidden="true">' +
                '<div class="shabbat-icon shabbat-icon--challah-1"><img src="/media/images/Challah.png" alt=""></div>' +
                '<div class="shabbat-icon shabbat-icon--challah-2"><img src="/media/images/Challah.png" alt=""></div>' +
                '<div class="shabbat-icon shabbat-icon--candle-1"><img src="/media/images/shabbatcandle.png" alt=""></div>' +
                '<div class="shabbat-icon shabbat-icon--candle-2"><img src="/media/images/shabbatcandle.png" alt=""></div>' +
            '</div>' +
            '<div class="shabbat-greeting" style="font-size:clamp(1.1rem,3vw,1.4rem);margin:0;">שַׁבָּת שָׁלוֹם</div>' +
            '<div class="shabbat-greeting-sub" style="margin-bottom:0;">' +
                '<span class="shabbat-greeting-sub-prefix">Shabbat Shalom • </span>' +
                '<span id="shabbat-blessing-text" class="shabbat-blessing-text">' + BLESSINGS[0] + '</span>' +
            '</div>';

        loginHeader.appendChild(banner);
    }

    function createShabbatBanner() {
        if (document.getElementById('shabbat-banner')) {
            return;
        }

        // Skip banner on the about page
        if (document.body && document.body.dataset.noShabbatBanner === 'true') {
            return;
        }

        // Home/login page has .gradient-header — use the compact login banner
        if (document.querySelector('.gradient-header')) {
            createLoginShabbatBanner();
            return;
        }

        const headerMain = document.querySelector('.header-main');
        if (!headerMain) {
            return;
        }

        const banner = document.createElement('div');
        banner.id = 'shabbat-banner';
        banner.setAttribute('role', 'region');
        banner.setAttribute('aria-label', 'Shabbat greeting and song');

        banner.innerHTML =
            '<div class="shabbat-floating-icons" aria-hidden="true">' +
                '<div class="shabbat-icon shabbat-icon--challah-1"><img src="/media/images/Challah.png" alt=""></div>' +
                '<div class="shabbat-icon shabbat-icon--challah-2"><img src="/media/images/Challah.png" alt=""></div>' +
                '<div class="shabbat-icon shabbat-icon--candle-1"><img src="/media/images/shabbatcandle.png" alt=""></div>' +
                '<div class="shabbat-icon shabbat-icon--candle-2"><img src="/media/images/shabbatcandle.png" alt=""></div>' +
                '<div class="shabbat-icon shabbat-icon--note-1"><img src="/media/images/doublenote.png" alt=""></div>' +
                '<div class="shabbat-icon shabbat-icon--note-2"><img src="/media/images/note2.png" alt=""></div>' +
                '<div class="shabbat-icon shabbat-icon--note-3"><img src="/media/images/doublenote.png" alt=""></div>' +
                '<div class="shabbat-icon shabbat-icon--note-4"><img src="/media/images/note2.png" alt=""></div>' +
            '</div>' +
            '<div class="shabbat-greeting-row">' +
                '<div class="shabbat-audio-shell">' +
                    '<button type="button" id="shabbat-audio-toggle" class="shabbat-audio-toggle" aria-label="Play Shabbat songs" aria-pressed="false">' +
                        '<svg class="shabbat-audio-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
                            '<path d="M8 6v12l10-6z"></path>' +
                        '</svg>' +
                    '</button>' +
                '</div>' +
                '<div class="shabbat-greeting">שַׁבָּת שָׁלוֹם</div>' +
            '</div>' +
            '<div class="shabbat-greeting-sub">' +
                '<span class="shabbat-greeting-sub-prefix">Shabbat Shalom • </span>' +
                '<span id="shabbat-blessing-text" class="shabbat-blessing-text">' + BLESSINGS[0] + '</span>' +
            '</div>' +
            '<div class="shabbat-lyrics-container" id="shabbat-lyrics" aria-live="polite"></div>' +
            '<div class="shabbat-divider" aria-hidden="true"></div>';

        const dailyInspiration = document.getElementById('daily-inspiration');
        if (dailyInspiration && dailyInspiration.parentNode === headerMain) {
            headerMain.insertBefore(banner, dailyInspiration);
        } else {
            headerMain.appendChild(banner);
        }

        setupShabbatAudioButton(banner);

        const lyricsContainer = banner.querySelector('#shabbat-lyrics');
        if (!lyricsContainer) {
            return;
        }

        LYRICS.forEach((lyric, index) => {
            const line = document.createElement('div');
            line.className = 'shabbat-lyric-line';
            line.innerHTML = lyric.replace(/\n/g, '<br>');
            if (index === 0) {
                line.classList.add('active');
            }
            lyricsContainer.appendChild(line);
        });
    }

    function startLyricCarousel() {
        if (lyricIntervalId) {
            return;
        }

        const lines = document.querySelectorAll('.shabbat-lyric-line');
        if (lines.length === 0) {
            return;
        }

        currentLyricIndex = 0;

        lyricIntervalId = window.setInterval(() => {
            const currentLine = lines[currentLyricIndex];
            if (currentLine) {
                currentLine.classList.remove('active');
                currentLine.classList.add('exiting');
                window.setTimeout(() => {
                    currentLine.classList.remove('exiting');
                }, LYRIC_TRANSITION_MS);
            }

            currentLyricIndex = (currentLyricIndex + 1) % lines.length;

            const nextLine = lines[currentLyricIndex];
            if (nextLine) {
                nextLine.classList.add('active');
            }
        }, LYRIC_SWITCH_MS);
    }

    function stopLyricCarousel() {
        if (!lyricIntervalId) {
            return;
        }

        window.clearInterval(lyricIntervalId);
        lyricIntervalId = null;
    }

    function startBlessingCarousel() {
        if (blessingIntervalId) {
            return;
        }

        const blessingElement = document.getElementById('shabbat-blessing-text');
        if (!blessingElement || BLESSINGS.length === 0) {
            return;
        }

        currentBlessingIndex = 0;
        blessingElement.textContent = BLESSINGS[0];

        blessingIntervalId = window.setInterval(() => {
            if (blessingSwapTimeoutId) {
                return;
            }

            const nextBlessingIndex = (currentBlessingIndex + 1) % BLESSINGS.length;

            blessingElement.classList.add('is-exiting');
            blessingSwapTimeoutId = window.setTimeout(() => {
                blessingElement.classList.remove('is-exiting');
                blessingElement.classList.add('is-entering');
                blessingElement.textContent = BLESSINGS[nextBlessingIndex];

                window.requestAnimationFrame(() => {
                    window.requestAnimationFrame(() => {
                        blessingElement.classList.remove('is-entering');
                    });
                });

                currentBlessingIndex = nextBlessingIndex;
                blessingSwapTimeoutId = null;
            }, BLESSING_TRANSITION_MS);
        }, BLESSING_SWITCH_MS);
    }

    function stopBlessingCarousel() {
        if (blessingIntervalId) {
            window.clearInterval(blessingIntervalId);
            blessingIntervalId = null;
        }

        if (blessingSwapTimeoutId) {
            window.clearTimeout(blessingSwapTimeoutId);
            blessingSwapTimeoutId = null;
        }

        const blessingElement = document.getElementById('shabbat-blessing-text');
        if (blessingElement) {
            blessingElement.classList.remove('is-exiting', 'is-entering');
        }
    }

    function isShabbatDisabledOnPage() {
        return Boolean(
            document.body &&
            document.body.dataset &&
            document.body.dataset.noShabbatBanner === 'true'
        );
    }

    function activateShabbat() {
        if (!document.body) {
            return;
        }

        // Pages that opt out of shabbat mode entirely
        if (isShabbatDisabledOnPage()) {
            return;
        }

        if (!document.body.classList.contains('shabbat-mode')) {
            document.body.classList.add('shabbat-mode');
        }

        createShabbatBanner();
        startLyricCarousel();
        startBlessingCarousel();
    }

    function deactivateShabbat() {
        if (!document.body || !document.body.classList.contains('shabbat-mode')) {
            return;
        }

        document.body.classList.remove('shabbat-mode');
        stopLyricCarousel();
        stopBlessingCarousel();
        stopShabbatAudio();

        const banner = document.getElementById('shabbat-banner');
        if (banner) {
            banner.remove();
        }
    }

    function checkShabbatMode() {
        if (shouldEnableShabbatMode()) {
            activateShabbat();
        } else {
            deactivateShabbat();
        }
    }

    function initShabbatMode() {
        checkShabbatMode();

        if (!isShabbatPreviewForced()) {
            window.setInterval(checkShabbatMode, SHABBAT_CHECK_INTERVAL_MS);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initShabbatMode);
    } else {
        initShabbatMode();
    }
})();
