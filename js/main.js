// Main Application Entry Point - QUERY FIX FOR COMMENT BADGES + GENERAL PARSHA CHAT
import { TORAH_PARSHAS } from './config.js';
import { fetchCurrentParsha, fetchParshaText, loadCommentaryData, loadMitzvahChallenges, getCachedCurrentParsha, cacheCurrentParsha } from './api.js';
import { state, setState } from './state.js';
import { isImportantVerse, getImportantVerseData } from './important-verses.js';
import { getDisplayNameFromEmail } from './name-utils.js';
import {
    showLoading,
    hideLoading,
    showError,
    hideError,
    updateParshaHeader,
    highlightCurrentParsha,
    updateNavigationButtons,
    populateParshaSelector,
    hideInfoPanel,
    showInfoPanel,
    showKeywordDefinition,
    showCommentary,
    showVerseSignificance,
    openCommentsPanel,
    closeCommentsPanel,
    displayComments,
    updateCommentInputState,
    showCommentStatus,
    getSavedUsername,
    updateUsernameDisplay,
    setCurrentUserEmail,
    displayOnlineUsers,
    hideOnlineUsers,
    displayLastLogin,
    hideLastLogin,
    resolveDisplayName,
    formatRelativeTime
} from './ui.js';

import {
    initAuth,
    getCurrentUserId,
    getCurrentUserEmail,
    signInWithEmail,
    createAccountWithEmail,
    signOutUser,
    hideLoginModal,
    sendPasswordReset,
    submitComment,
    listenForComments,
    stopListeningForComments,
    db,
    submitReaction,
    getUserReactions,
    getReactionCountsForBook,
    getBookmarkCountsForBook,
    getBookmarkCountsForVerses,
    getVerseInteractors,
    addBookmark,
    removeBookmark,
    isVerseBookmarked,
    getUserBookmarks,
    addDailyQuoteBookmark,
    removeDailyQuoteBookmark,
    isDailyQuoteBookmarked,
    getUserDailyQuoteBookmarks,
    getCommunityQuoteBookmarks,
    getDailyQuoteBookmarkCount,
    getDailyQuoteInteractors,
    recordUserLogin,
    updateUserPresence,
    markUserOffline,
    listenForOnlineUsers,
    stopListeningForOnlineUsers,
    getUserInfo,
    getUsersWithinThreeWeeks,
    listenForMitzvahReflections,
    stopListeningForMitzvahReflections,
    submitMitzvahReflection,
    submitMitzvahReflectionReaction,
    getMitzvahCompletionStatus,
    setMitzvahCompletionStatus,
    updateMitzvahLeaderboard,
    recalculateMitzvahLeaderboard,
    getMitzvahLeaderboard,
    formatTimeAgo,
    getActiveChavrutaId
} from './firebase.js';

import { collection, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let verseCommentCounts = {};
let verseReactionCounts = {};
let userReactions = {};
let isAuthReady = false;
let bookmarkedVerses = new Set();
let verseBookmarkCounts = {};
let bookmarkedQuoteIds = new Set();
let cachedQuoteBookmarks = [];
let currentQuoteBookmarkCount = 0;
const verseDisplayTexts = {};

// Cache for verse interactor data (to avoid redundant fetches)
const verseInteractorsCache = new Map(); // key: `${verseRef}__${interactionType}`
const INTERACTORS_CACHE_TTL = 60000; // 1 minute cache
let activeTooltipFetch = null;

// User presence tracking
let lastUserId = null;
let presenceIntervalId = null;
const PRESENCE_UPDATE_INTERVAL = 30000; // Update every 30 seconds
let currentUserProfile = null;
const FRIEND_LOGINS_REFRESH_INTERVAL = 90000; // Update every 90 seconds for 3-week window
let friendLoginsRefreshIntervalId = null;
const FRIEND_PRESENCE_WINDOW_MS = 21 * 24 * 60 * 60 * 1000; // 3 weeks
let trackedOnlineFriends = [];
let trackedRecentFriendLogins = [];

// Weekly mitzvah challenge tracking
let currentMitzvahChallengeId = null;
let currentMitzvahCompletion = false;
let mitzvahChatMessages = [];
let isSubmittingMitzvahReflection = false;
let mitzvahCountdownIntervalId = null;
let mitzvahModalWasShown = false;
const MITZVAH_MODAL_DISMISS_KEY_PREFIX = 'mitzvahModalDismissed:';
const MITZVAH_LEADERBOARD_LIMIT = 10;
let isLoadingMitzvahLeaderboard = false;
let currentMitzvahChallengeMode = 'none';
const WEEKLY_PARSHA_CHECK_INTERVAL = 15 * 60 * 1000; // 15 minutes
let weeklyParshaCheckIntervalId = null;
let isWeeklyParshaCheckRunning = false;
let pendingWeeklyParshaCheck = false;
let pendingWeeklyParshaForceAdvance = false;

function escapeForAttributeSelector(value) {
    if (typeof value !== 'string') {
        return '';
    }
    if (window.CSS && typeof window.CSS.escape === 'function') {
        return window.CSS.escape(value);
    }
    return value.replace(/["\\]/g, '\\$&');
}

function findVerseElement(verseRef) {
    if (!verseRef) {
        return null;
    }
    const escaped = escapeForAttributeSelector(verseRef);
    return document.querySelector(`[data-ref="${escaped}"]`);
}

function getVerseTextSnippet(verseRef) {
    if (!verseRef) {
        return '';
    }

    if (verseDisplayTexts[verseRef] && verseDisplayTexts[verseRef].english) {
        return verseDisplayTexts[verseRef].english;
    }

    const verseElement = findVerseElement(verseRef);
    if (verseElement) {
        const englishElement = verseElement.querySelector('.english-text');
        if (englishElement) {
            const text = englishElement.textContent.trim();
            verseDisplayTexts[verseRef] = { english: text };
            return text;
        }
    }

    return '';
}

function getCurrentDailyQuotePayload() {
    const container = document.getElementById('daily-inspiration');
    const quoteFromWindow = typeof window !== 'undefined' ? window.currentDailyQuote : null;
    const quoteId = quoteFromWindow && (quoteFromWindow.id ?? quoteFromWindow.quoteId);

    if (quoteFromWindow && quoteId != null) {
        return {
            ...quoteFromWindow,
            id: String(quoteId),
            quoteId: String(quoteId),
            displayDate: quoteFromWindow.displayDate || container?.dataset?.quoteDate || null
        };
    }

    if (container && container.dataset.quoteId) {
        return {
            id: String(container.dataset.quoteId),
            quoteId: String(container.dataset.quoteId),
            displayDate: container.dataset.quoteDate || null,
            hebrew: container.querySelector('[data-quote-hebrew]')?.textContent?.trim() || '',
            translation: container.querySelector('[data-quote-translation]')?.textContent?.trim() || '',
            source: container.querySelector('[data-quote-source]')?.textContent?.trim() || '',
            reflection: container.querySelector('[data-quote-reflection]')?.textContent?.trim() || ''
        };
    }

    return null;
}

function interpolateHexColor(hex1, hex2, t) {
    const r1 = parseInt(hex1.slice(1, 3), 16), g1 = parseInt(hex1.slice(3, 5), 16), b1 = parseInt(hex1.slice(5, 7), 16);
    const r2 = parseInt(hex2.slice(1, 3), 16), g2 = parseInt(hex2.slice(3, 5), 16), b2 = parseInt(hex2.slice(5, 7), 16);
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    return `rgb(${r},${g},${b})`;
}

function applyDailyQuoteCommunityTint(count) {
    const content = document.querySelector('.daily-inspiration-content');
    if (!content) return;
    // Linear scale: 1 bookmark = 20%, 5 bookmarks = 100%
    const intensity = count > 0 ? Math.min(count / 5, 1) : 0;
    if (intensity === 0) {
        content.style.background = '';
        content.style.borderColor = '';
        content.style.boxShadow = '';
        return;
    }
    // Warm cream → rich blue (dbeafe / bfdbfe family — clearly visible even at 1 bookmark)
    const bg1 = interpolateHexColor('#fefcf7', '#dbeafe', intensity);
    const bg2 = interpolateHexColor('#faf8f3', '#c7d9f7', intensity);
    const border = interpolateHexColor('#ebe7df', '#93b4e4', intensity);
    content.style.background = `linear-gradient(135deg, ${bg1} 0%, ${bg2} 100%)`;
    content.style.borderColor = border;
    // Blue glow that scales with intensity
    const glowOpacity = (0.2 * intensity).toFixed(3);
    content.style.boxShadow = `0 1px 3px rgba(0,0,0,0.06), 0 3px 16px rgba(59,130,246,${glowOpacity})`;
}

async function fetchAndApplyDailyQuoteTint() {
    const payload = getCurrentDailyQuotePayload();
    const quoteId = payload ? String(payload.quoteId || payload.id) : null;
    if (!quoteId) return;
    try {
        currentQuoteBookmarkCount = await getDailyQuoteBookmarkCount(quoteId);
        applyDailyQuoteCommunityTint(currentQuoteBookmarkCount);
        updateDailyQuoteBookmarkCountBadge(currentQuoteBookmarkCount);
        setupDailyQuoteBookmarkTooltip(quoteId);
    } catch (_) {
        // Tint is cosmetic — fail silently
    }
}

let dailyQuoteTooltipAttached = false;

function setupDailyQuoteBookmarkTooltip(quoteId) {
    if (dailyQuoteTooltipAttached) return;
    const button = document.querySelector('[data-quote-bookmark]');
    if (!button || !isDesktopHoverTooltipEnabled()) return;

    dailyQuoteTooltipAttached = true;
    let hoverTimeout = null;
    let cachedTooltip = null;

    button.addEventListener('mouseenter', () => {
        if (!isDesktopHoverTooltipEnabled()) return;
        // Show cached tooltip instantly if available
        if (cachedTooltip) {
            button.classList.add('status-tooltip');
            button.setAttribute('data-tooltip', cachedTooltip);
            return;
        }
        hoverTimeout = setTimeout(async () => {
            const currentPayload = getCurrentDailyQuotePayload();
            const currentId = currentPayload ? String(currentPayload.quoteId || currentPayload.id) : null;
            if (!currentId) return;
            try {
                // Show loading state
                button.classList.add('status-tooltip');
                button.setAttribute('data-tooltip', 'Loading...');
                const interactors = await getDailyQuoteInteractors(currentId);
                if (!interactors || interactors.length === 0) {
                    button.removeAttribute('data-tooltip');
                    button.classList.remove('status-tooltip');
                    cachedTooltip = null;
                    return;
                }
                const tooltip = buildInteractorsTooltipContent(interactors, 'bookmark');
                cachedTooltip = tooltip;
                if (button.matches(':hover')) {
                    button.setAttribute('data-tooltip', tooltip);
                }
            } catch (_) {
                button.removeAttribute('data-tooltip');
                button.classList.remove('status-tooltip');
            }
        }, 200);
    });

    button.addEventListener('mouseleave', () => {
        if (hoverTimeout) {
            clearTimeout(hoverTimeout);
            hoverTimeout = null;
        }
    });
}

function invalidateDailyQuoteTooltipCache() {
    dailyQuoteTooltipAttached = false;
    const button = document.querySelector('[data-quote-bookmark]');
    if (button) {
        button.removeAttribute('data-tooltip');
        button.classList.remove('status-tooltip');
    }
}

function updateDailyQuoteBookmarkCountBadge(count) {
    const badge = document.querySelector('.daily-quote-bookmark-count');
    if (!badge) return;
    if (count > 0) {
        badge.textContent = count;
        badge.classList.add('has-count');
    } else {
        badge.textContent = '';
        badge.classList.remove('has-count');
    }
}

function updateDailyQuoteBookmarkButtonState() {
    const button = document.querySelector('[data-quote-bookmark]');
    if (!button) {
        return;
    }

    const payload = getCurrentDailyQuotePayload();
    const quoteId = payload ? String(payload.quoteId || payload.id) : null;
    const isActive = quoteId ? bookmarkedQuoteIds.has(quoteId) : false;

    button.classList.toggle('is-active', Boolean(isActive));
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    const label = isActive ? 'Remove this quote from your bookmarks' : 'Bookmark this quote';
    button.setAttribute('aria-label', label);

    // Update count badge
    updateDailyQuoteBookmarkCountBadge(currentQuoteBookmarkCount);
}

function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

function getWeekStartForDate(referenceDate = new Date()) {
    const weekStart = new Date(referenceDate);
    weekStart.setHours(0, 0, 0, 0);
    const day = weekStart.getDay(); // 0 = Sunday
    weekStart.setDate(weekStart.getDate() - day);
    return weekStart;
}

function getStoredWeeklyWeekWindow() {
    if (state.weeklyParshaWeekStart) {
        const weekStart = new Date(state.weeklyParshaWeekStart);
        if (!Number.isNaN(weekStart.getTime())) {
            const deadline = addDays(weekStart, 7);
            return { weekStart, deadline };
        }
    }
    return calculateMitzvahWeekWindow();
}

function getNextWeeklyParshaInfo() {
    if (!Array.isArray(state.allParshas) || state.allParshas.length === 0) {
        return null;
    }
    const currentIndex = (typeof state.weeklyParshaIndex === 'number' && state.weeklyParshaIndex >= 0)
        ? state.weeklyParshaIndex
        : (typeof state.currentParshaIndex === 'number' && state.currentParshaIndex >= 0
            ? state.currentParshaIndex
            : 0);
    const nextIndex = (currentIndex + 1) % state.allParshas.length;
    const parsha = state.allParshas[nextIndex];
    if (!parsha) {
        return null;
    }
    return { parsha, index: nextIndex };
}

function parseVerseReference(verseRef) {
    if (!verseRef || typeof verseRef !== 'string') {
        return null;
    }

    const match = verseRef.trim().match(/^([A-Za-z]+)\s+(\d+):(\d+)$/);
    if (!match) {
        return null;
    }

    return {
        bookName: match[1],
        chapter: parseInt(match[2], 10),
        verse: parseInt(match[3], 10)
    };
}

function isVerseWithinParshaRange(verseDetails, parshaRange) {
    if (!verseDetails || !parshaRange) {
        return false;
    }

    if (verseDetails.bookName !== parshaRange.bookName) {
        return false;
    }

    const startChapter = parshaRange.startChapter;
    const startVerse = parshaRange.startVerse;
    const endChapter = parshaRange.endChapter ?? parshaRange.startChapter;
    const endVerse = parshaRange.endVerse ?? parshaRange.startVerse;

    if (verseDetails.chapter < startChapter || verseDetails.chapter > endChapter) {
        return false;
    }

    if (verseDetails.chapter === startChapter && verseDetails.verse < startVerse) {
        return false;
    }

    if (verseDetails.chapter === endChapter && verseDetails.verse > endVerse) {
        return false;
    }

    return true;
}

function findParshaForVerse(verseRef) {
    const verseDetails = parseVerseReference(verseRef);
    if (!verseDetails || !Array.isArray(state.allParshas)) {
        return null;
    }

    for (const parsha of state.allParshas) {
        const range = parseParshaReference(parsha.reference);
        if (isVerseWithinParshaRange(verseDetails, range)) {
            return parsha;
        }
    }

    return state.allParshas.find((parsha) => parsha.reference.startsWith(`${verseDetails.bookName} `)) || null;
}

function highlightVerseAndScroll(verseRef, attempt = 0) {
    const target = findVerseElement(verseRef);
    if (!target) {
        if (attempt < 12) {
            setTimeout(() => highlightVerseAndScroll(verseRef, attempt + 1), 120);
        }
        return;
    }

    document.querySelectorAll('.bookmark-highlight').forEach((el) => {
        el.classList.remove('bookmark-highlight');
    });

    target.classList.add('bookmark-highlight');
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });

    setTimeout(() => {
        target.classList.remove('bookmark-highlight');
    }, 2600);
}

function isStudyPagePath() {
    const normalizedPath = window.location.pathname.replace(/\/+$/, '') || '/';
    return normalizedPath === '/study' || normalizedPath === '/study/index.html';
}

function closeStudyRoomPickerModal() {
    const modal = document.getElementById('study-room-picker-modal');
    if (!modal || modal.classList.contains('hidden')) {
        return;
    }
    modal.classList.add('hidden');
    document.body.style.overflow = '';
}

function openStudyRoomPickerModal(chavrutas = []) {
    const modal = document.getElementById('study-room-picker-modal');
    const options = document.getElementById('study-room-picker-options');
    const cancelBtn = document.getElementById('study-room-picker-cancel');

    if (!modal || !options) {
        return;
    }

    const roomList = Array.isArray(chavrutas) ? chavrutas : [];
    options.innerHTML = roomList.map((room) => {
        const name = escapeHtml(room?.name || 'Study Room');
        const membersCount = Array.isArray(room?.members) ? room.members.length : 0;
        const maxMembers = Number(room?.maxMembers) > 0 ? Number(room.maxMembers) : 8;
        return `
            <button type="button"
                    data-chavruta-id="${escapeHtml(room.id)}"
                    class="w-full text-left rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-100 transition-colors px-4 py-3">
                <div class="text-sm font-bold text-slate-800">${name}</div>
                <div class="text-xs text-slate-500 mt-0.5">${membersCount}/${maxMembers} members</div>
            </button>
        `;
    }).join('');

    options.onclick = (event) => {
        const pickButton = event.target.closest('button[data-chavruta-id]');
        if (!pickButton) {
            return;
        }
        const selectedId = pickButton.getAttribute('data-chavruta-id');
        if (!selectedId) {
            return;
        }
        sessionStorage.setItem('activeChavrutaId', selectedId);
        document.documentElement.removeAttribute('data-readonly');
        const targetUrl = new URL('/study', window.location.origin);
        targetUrl.searchParams.set('chavruta', selectedId);
        window.location.assign(targetUrl.toString());
    };

    if (cancelBtn) {
        cancelBtn.onclick = closeStudyRoomPickerModal;
    }

    modal.onclick = (event) => {
        if (event.target === modal) {
            closeStudyRoomPickerModal();
        }
    };

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

async function enforceStudyRoomSelection(user) {
    if (!user || !isStudyPagePath()) {
        return false;
    }

    try {
        const membershipsQuery = query(
            collection(db, 'chavrutas'),
            where('members', 'array-contains', user.uid)
        );
        const membershipsSnapshot = await getDocs(membershipsQuery);
        const chavrutas = membershipsSnapshot.docs.map((docSnapshot) => ({
            id: docSnapshot.id,
            ...docSnapshot.data()
        }));

        if (!chavrutas.length) {
            sessionStorage.removeItem('activeChavrutaId');
            document.documentElement.setAttribute('data-readonly', 'true');
            closeStudyRoomPickerModal();
            return false;
        }

        const params = new URLSearchParams(window.location.search);
        const requestedChavrutaId = params.get('chavruta');
        const chavrutaIds = new Set(chavrutas.map((room) => room.id));

        if (requestedChavrutaId && chavrutaIds.has(requestedChavrutaId)) {
            sessionStorage.setItem('activeChavrutaId', requestedChavrutaId);
            document.documentElement.removeAttribute('data-readonly');
            closeStudyRoomPickerModal();
            return false;
        }

        if (chavrutas.length === 1) {
            const onlyRoomId = chavrutas[0].id;
            sessionStorage.setItem('activeChavrutaId', onlyRoomId);
            document.documentElement.removeAttribute('data-readonly');
            closeStudyRoomPickerModal();

            if (requestedChavrutaId !== onlyRoomId) {
                const targetUrl = new URL('/study', window.location.origin);
                targetUrl.searchParams.set('chavruta', onlyRoomId);
                window.location.replace(targetUrl.toString());
                return true;
            }
            return false;
        }

        // Multiple rooms and no explicit selection: require user choice.
        sessionStorage.removeItem('activeChavrutaId');
        document.documentElement.setAttribute('data-readonly', 'true');
        openStudyRoomPickerModal(chavrutas);
        return false;
    } catch (error) {
        console.error('Error resolving study room selection:', error);
        return false;
    }
}

async function init() {
    try {
        // ── Phase 1: Instant UI — render cached parsha text before auth ──
        setState({ allParshas: TORAH_PARSHAS });

        const cachedWeeklyParsha = getCachedCurrentParsha();
        if (cachedWeeklyParsha) {
            const cachedMatch = TORAH_PARSHAS.find(p => p.reference === cachedWeeklyParsha.ref);
            if (cachedMatch) {
                const idx = TORAH_PARSHAS.indexOf(cachedMatch);
                const initialWeekStart = getWeekStartForDate();
                setState({
                    currentParshaRef: cachedMatch.reference,
                    currentParshaIndex: idx,
                    weeklyParshaRef: cachedMatch.reference,
                    weeklyParshaIndex: idx,
                    weeklyParshaWeekStart: initialWeekStart.toISOString()
                });
                console.log('⚡ Using cached parsha:', cachedMatch.name);
            }
        }

        // If no cache, don't fall back to Genesis 1:1 — wait for the API
        // so the correct weekly parsha is always shown on page load.
        if ((state.weeklyParshaIndex == null || state.weeklyParshaIndex < 0) && state.currentParshaRef) {
            const fallbackIndex = state.currentParshaIndex >= 0 ? state.currentParshaIndex : 0;
            const initialWeekStart = getWeekStartForDate();
            setState({
                weeklyParshaRef: state.currentParshaRef,
                weeklyParshaIndex: fallbackIndex,
                weeklyParshaWeekStart: state.weeklyParshaWeekStart || initialWeekStart.toISOString()
            });
        }

        populateParshaSelector();
        updateNavigationButtons();
        setupEventListeners();
        fetchAndApplyDailyQuoteTint();

        // ── Launch ALL async work in parallel immediately ──
        const parshaNamePromise = fetchCurrentParsha();

        const authPromise = new Promise((resolve) => {
            let initialResolved = false;
            initAuth(async (user) => {
                isAuthReady = true;
                try {
                    await handleAuthStateChange(user);
                } catch (error) {
                    console.error('Error in auth state change handler:', error);
                }
                if (!initialResolved) {
                    initialResolved = true;
                    resolve();
                }
            });
        });

        const dataPromise = Promise.all([
            loadCommentaryData(),
            loadMitzvahChallenges()
        ]);

        // ── Fast path: cached weekly parsha → render instantly ──
        const earlyRef = state.currentParshaRef;
        if (earlyRef) {
            await loadParsha(earlyRef);
            console.log('⚡ Rendered cached parsha:', earlyRef);
        } else {
            // ── No cache: get parsha from API ASAP, don't wait for auth ──
            showLoading();
            console.log('⚡ No cached parsha — fetching from API...');
            const currentParshaName = await parshaNamePromise;
            if (currentParshaName) {
                const matchingParsha = TORAH_PARSHAS.find(p =>
                    p.name.toLowerCase() === currentParshaName.toLowerCase() ||
                    currentParshaName.toLowerCase().includes(p.name.toLowerCase())
                );
                if (matchingParsha) {
                    const matchingIndex = TORAH_PARSHAS.indexOf(matchingParsha);
                    const initialWeekStart = getWeekStartForDate();
                    cacheCurrentParsha(currentParshaName, matchingParsha.reference);
                    setState({
                        currentParshaRef: matchingParsha.reference,
                        currentParshaIndex: matchingIndex,
                        weeklyParshaRef: matchingParsha.reference,
                        weeklyParshaIndex: matchingIndex,
                        weeklyParshaWeekStart: initialWeekStart.toISOString()
                    });
                    document.querySelectorAll('select#parsha-selector').forEach(s => {
                        s.value = matchingParsha.reference;
                    });
                    updateNavigationButtons();
                    await loadParsha(matchingParsha.reference);
                    console.log('✅ Loaded weekly parsha from API:', matchingParsha.name);
                } else {
                    setState({ currentParshaRef: TORAH_PARSHAS[0].reference, currentParshaIndex: 0 });
                    await loadParsha(TORAH_PARSHAS[0].reference);
                }
            } else {
                // API failed — fall back to first parsha as last resort
                setState({ currentParshaRef: TORAH_PARSHAS[0].reference, currentParshaIndex: 0 });
                await loadParsha(TORAH_PARSHAS[0].reference);
            }
        }

        // ── Wait for auth + data (may already be done while parsha loaded) ──
        const [, [commentaryData, mitzvahChallengeData]] = await Promise.all([authPromise, dataPromise]);

        console.log('✅ Auth + data ready');

        setState({
            commentaryData,
            mitzvahChallenges: (mitzvahChallengeData && Array.isArray(mitzvahChallengeData.challenges))
                ? mitzvahChallengeData.challenges
                : []
        });

        // Commentary data just arrived — re-enable the significance button if
        // renderParsha ran before this data was available (the common case).
        refreshSignificanceButtons();

        // ── Post-auth: reload counts + confirm weekly parsha from API ──
        const activeRef = state.currentParshaRef;
        if (activeRef) {
            await Promise.all([
                loadCommentCounts(activeRef),
                loadReactionCounts(activeRef),
                loadBookmarkCounts(activeRef)
            ]);
        }

        // If we had a cache hit, confirm/update the weekly parsha from the API
        if (earlyRef) {
            const currentParshaName = await parshaNamePromise;
            console.log('✅ Current parsha fetched:', currentParshaName);

            if (currentParshaName) {
                const matchingParsha = TORAH_PARSHAS.find(p =>
                    p.name.toLowerCase() === currentParshaName.toLowerCase() ||
                    currentParshaName.toLowerCase().includes(p.name.toLowerCase())
                );

                if (matchingParsha) {
                    const matchingIndex = TORAH_PARSHAS.indexOf(matchingParsha);
                    const initialWeekStart = getWeekStartForDate();

                    cacheCurrentParsha(currentParshaName, matchingParsha.reference);

                    setState({
                        currentParshaRef: matchingParsha.reference,
                        currentParshaIndex: matchingIndex,
                        weeklyParshaRef: matchingParsha.reference,
                        weeklyParshaIndex: matchingIndex,
                        weeklyParshaWeekStart: initialWeekStart.toISOString()
                    });

                    if (cachedWeeklyParsha?.ref !== matchingParsha.reference) {
                        // Cache was stale — switch to the correct weekly parsha
                        document.querySelectorAll('select#parsha-selector').forEach(s => {
                            s.value = matchingParsha.reference;
                        });
                        updateNavigationButtons();
                        await loadParsha(matchingParsha.reference);
                    } else {
                        updateMitzvahChallengeForParsha(matchingParsha.name);
                    }
                }
            }
        }

        startWeeklyParshaMonitor();

        const hash = window.location.hash;
        if (hash === '#bookmarks') {
            window.history.replaceState(null, '', window.location.pathname);
            openBookmarksPanel('verses');
        } else if (hash === '#bookmarks-quotes') {
            window.history.replaceState(null, '', window.location.pathname);
            openBookmarksPanel('quotes');
        }

        console.log('✅ Application initialized successfully');

    } catch (error) {
        console.error('❌ Initialization error:', error);
        showError('Failed to initialize the application. Please refresh the page.');
        hideLoading();
    }
}

function setupEventListeners() {
    setupMitzvahChallengeEventListeners();

    // Add change listener to ALL parsha selector elements (desktop and mobile)
    document.querySelectorAll('select#parsha-selector').forEach((selector) => {
        selector.addEventListener('change', async (e) => {
            const selectedRef = e.target.value;
            const index = state.allParshas.findIndex(p => p.reference === selectedRef);
            setState({
                currentParshaIndex: index,
                currentParshaRef: selectedRef
            });
            await loadParsha(selectedRef);
            updateNavigationButtons();
            // Update the selected value in ALL select elements to keep them in sync
            document.querySelectorAll('select#parsha-selector').forEach((s) => {
                s.value = selectedRef;
            });
        });
    });
    
    document.getElementById('prev-parsha').addEventListener('click', async () => {
        if (state.currentParshaIndex > 0) {
            const newIndex = state.currentParshaIndex - 1;
            const prevParsha = state.allParshas[newIndex];
            setState({
                currentParshaIndex: newIndex,
                currentParshaRef: prevParsha.reference
            });
            // Update ALL select elements to keep them in sync
            document.querySelectorAll('select#parsha-selector').forEach((s) => {
                s.value = prevParsha.reference;
            });
            await loadParsha(prevParsha.reference);
            updateNavigationButtons();
        }
    });

    document.getElementById('next-parsha').addEventListener('click', async () => {
        if (state.currentParshaIndex < state.allParshas.length - 1) {
            const newIndex = state.currentParshaIndex + 1;
            const nextParsha = state.allParshas[newIndex];
            setState({
                currentParshaIndex: newIndex,
                currentParshaRef: nextParsha.reference
            });
            // Update ALL select elements to keep them in sync
            document.querySelectorAll('select#parsha-selector').forEach((s) => {
                s.value = nextParsha.reference;
            });
            await loadParsha(nextParsha.reference);
            updateNavigationButtons();
        }
    });
    
    const weeklyButton = document.getElementById('go-to-weekly');
    if (weeklyButton) {
        weeklyButton.addEventListener('click', async (event) => {
            if (event && typeof event.preventDefault === 'function') {
                event.preventDefault();
            }
            const weeklyRef = state.weeklyParshaRef || state.currentParshaRef;
            if (!weeklyRef) {
                return;
            }
            const index = state.allParshas.findIndex(p => p.reference === weeklyRef);
            if (index < 0) {
                return;
            }
            setState({
                currentParshaIndex: index,
                currentParshaRef: weeklyRef
            });
            // Update ALL select elements to keep them in sync
            document.querySelectorAll('select#parsha-selector').forEach((s) => {
                s.value = weeklyRef;
            });
            await loadParsha(weeklyRef);
            updateNavigationButtons();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    const significanceButton = document.getElementById('show-significance');
    if (significanceButton) {
        significanceButton.addEventListener('click', openParshaSignificanceModal);
    }

    // Significance Button (Mobile)
    const significanceButtonMobile = document.getElementById('show-significance-mobile');
    if (significanceButtonMobile) {
        significanceButtonMobile.addEventListener('click', openParshaSignificanceModal);
    }

    // General Parsha Chat Button (Desktop)
    const parshaChatButton = document.getElementById('general-parsha-chat');
    if (parshaChatButton) {
        parshaChatButton.addEventListener('click', () => {
            const parshaRef = state.currentParshaRef || 'Genesis 1:1';
            const parshaName = state.allParshas[state.currentParshaIndex]?.name || 'Torah Portion';
            const generalChatRef = `PARSHA:${parshaRef}`;
            openCommentsPanel(generalChatRef, (ref) => {
                listenForComments(ref, displayComments);
            }, parshaName);
        });
    }

    // General Parsha Chat Button (Mobile)
    const parshaChatButtonMobile = document.getElementById('general-parsha-chat-mobile');
    if (parshaChatButtonMobile) {
        parshaChatButtonMobile.addEventListener('click', () => {
            const parshaRef = state.currentParshaRef || 'Genesis 1:1';
            const parshaName = state.allParshas[state.currentParshaIndex]?.name || 'Torah Portion';
            const generalChatRef = `PARSHA:${parshaRef}`;
            openCommentsPanel(generalChatRef, (ref) => {
                listenForComments(ref, displayComments);
            }, parshaName);
        });
    }
    
    document.getElementById('close-panel-button').addEventListener('click', hideInfoPanel);
    
    document.getElementById('info-panel').addEventListener('click', (e) => {
        if (e.target.id === 'info-panel') {
            hideInfoPanel();
        }
    });
    
    document.getElementById('parsha-text').addEventListener('click', handleTextClick);

    // Hebrew word selection → Sefaria definition
    const parshaTextEl = document.getElementById('parsha-text');
    parshaTextEl.addEventListener('mouseup', handleHebrewWordSelection);
    parshaTextEl.addEventListener('touchend', () => {
        setTimeout(handleHebrewWordSelection, 120);
    });

    setupCommentPanelListeners();
    setupLoginListeners();

    window.addEventListener('focus', () => scheduleImmediateWeeklyParshaCheck());

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideInfoPanel();
            closeCommentsPanel(stopListeningForComments);
        }
        
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT' && e.target.tagName !== 'TEXTAREA') {
            if (e.key === 'ArrowLeft' && state.currentParshaIndex > 0) {
                document.getElementById('prev-parsha').click();
            } else if (e.key === 'ArrowRight' && state.currentParshaIndex < state.allParshas.length - 1) {
                document.getElementById('next-parsha').click();
            }
        }
    });

    document.addEventListener('dailyQuoteBookmarkToggle', (event) => {
        if (!event || !event.detail) {
            return;
        }
        handleDailyQuoteBookmarkToggle(event.detail);
    });

    document.addEventListener('dailyQuoteRendered', () => {
        updateDailyQuoteBookmarkButtonState();
        fetchAndApplyDailyQuoteTint();
    });
}

function setupMitzvahChallengeEventListeners() {
    const checklistInput = document.getElementById('mitzvah-challenge-checkbox');
    if (checklistInput) {
        checklistInput.addEventListener('click', handleMitzvahChecklistToggle);
        checklistInput.addEventListener('change', handleMitzvahChecklistToggle);
    }

    const chatSubmitButton = document.getElementById('mitzvah-chat-submit');
    if (chatSubmitButton) {
        chatSubmitButton.addEventListener('click', handleMitzvahChatSubmit);
    }

    const chatInput = document.getElementById('mitzvah-chat-input');
    if (chatInput) {
        chatInput.addEventListener('keydown', (event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                event.preventDefault();
                handleMitzvahChatSubmit();
            }
        });
    }

    const modalClose = document.getElementById('mitzvah-modal-close');
    if (modalClose) {
        modalClose.addEventListener('click', () => dismissMitzvahModal(true));
    }

    const modalOverlay = document.getElementById('mitzvah-modal-overlay');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', () => dismissMitzvahModal(false));
    }

    const modalRemind = document.getElementById('mitzvah-modal-remind');
    if (modalRemind) {
        modalRemind.addEventListener('click', () => dismissMitzvahModal(false));
    }

    const modalOpen = document.getElementById('mitzvah-modal-open');
    if (modalOpen) {
        modalOpen.addEventListener('click', () => {
            scrollToMitzvahChallenge();
            dismissMitzvahModal(true);
        });
    }
}

function normalizeParshaName(rawName) {
    if (!rawName || typeof rawName !== 'string') {
        return '';
    }
    return rawName
        .toLowerCase()
        .replace(/parashat|parshat|parasha|parshah|parsha/gi, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

function findMatchingParshaByName(rawName) {
    if (!rawName || !Array.isArray(state.allParshas) || state.allParshas.length === 0) {
        return null;
    }
    const normalizedTarget = normalizeParshaName(rawName);
    if (!normalizedTarget) {
        return null;
    }

    let fallbackMatch = null;

    for (let i = 0; i < state.allParshas.length; i++) {
        const parsha = state.allParshas[i];
        if (!parsha?.name) continue;
        const normalizedCandidate = normalizeParshaName(parsha.name);
        if (!normalizedCandidate) continue;

        if (normalizedCandidate === normalizedTarget) {
            return { parsha, index: i };
        }

        if (!fallbackMatch && (normalizedTarget.includes(normalizedCandidate) || normalizedCandidate.includes(normalizedTarget))) {
            fallbackMatch = { parsha, index: i };
        }
    }

    return fallbackMatch;
}

function startWeeklyParshaMonitor() {
    stopWeeklyParshaMonitor();
    weeklyParshaCheckIntervalId = setInterval(() => {
        runWeeklyParshaCheck();
    }, WEEKLY_PARSHA_CHECK_INTERVAL);
    runWeeklyParshaCheck();
}

function stopWeeklyParshaMonitor() {
    if (weeklyParshaCheckIntervalId) {
        clearInterval(weeklyParshaCheckIntervalId);
        weeklyParshaCheckIntervalId = null;
    }
}

function scheduleImmediateWeeklyParshaCheck(options = {}) {
    const forceAdvance = Boolean(options.forceAdvance);
    if (forceAdvance) {
        pendingWeeklyParshaForceAdvance = true;
    }
    if (isWeeklyParshaCheckRunning) {
        pendingWeeklyParshaCheck = true;
        return;
    }
    runWeeklyParshaCheck({ forceAdvance: forceAdvance || pendingWeeklyParshaForceAdvance });
}

async function runWeeklyParshaCheck(options = {}) {
    const pendingForce = pendingWeeklyParshaForceAdvance;
    pendingWeeklyParshaForceAdvance = false;
    const forceAdvance = Boolean(options.forceAdvance || pendingForce);

    if (isWeeklyParshaCheckRunning) {
        pendingWeeklyParshaCheck = true;
        pendingWeeklyParshaForceAdvance = pendingWeeklyParshaForceAdvance || forceAdvance;
        return;
    }
    isWeeklyParshaCheckRunning = true;
    try {
        await checkAndApplyWeeklyParsha({ forceAdvance });
    } catch (error) {
        console.warn('Unable to refresh weekly parsha from calendar:', error);
    } finally {
        isWeeklyParshaCheckRunning = false;
        if (pendingWeeklyParshaCheck) {
            const shouldForce = pendingWeeklyParshaForceAdvance;
            pendingWeeklyParshaCheck = false;
            pendingWeeklyParshaForceAdvance = false;
            runWeeklyParshaCheck({ forceAdvance: shouldForce });
        }
    }
}

async function checkAndApplyWeeklyParsha({ forceAdvance = false } = {}) {
    if (!Array.isArray(state.allParshas) || state.allParshas.length === 0) {
        return;
    }

    const storedWeekStart = state.weeklyParshaWeekStart ? new Date(state.weeklyParshaWeekStart) : null;
    const hasStoredWeekStart = storedWeekStart instanceof Date && !Number.isNaN(storedWeekStart.getTime());
    const expectedNextWeekStart = hasStoredWeekStart ? addDays(storedWeekStart, 7) : null;
    const hasWeekExpired = expectedNextWeekStart ? Date.now() >= expectedNextWeekStart.getTime() : false;

    const prevWeeklyRef = state.weeklyParshaRef;

    let latestParshaName = null;
    try {
        latestParshaName = await fetchCurrentParsha();
    } catch (error) {
        latestParshaName = null;
    }

    let match = null;
    if (latestParshaName) {
        match = findMatchingParshaByName(latestParshaName);
        if (!match) {
            console.warn('Calendar parsha not found in local list:', latestParshaName);
        }
    }

    if (match && (forceAdvance || hasWeekExpired) && prevWeeklyRef && match.parsha.reference === prevWeeklyRef) {
        const nextMatch = getNextWeeklyParshaInfo();
        if (nextMatch) {
            match = nextMatch;
        }
    }

    if (!match && (forceAdvance || hasWeekExpired)) {
        match = getNextWeeklyParshaInfo();
    }

    if (!match) {
        return;
    }

    const alreadyCurrent = prevWeeklyRef === match.parsha.reference && state.weeklyParshaIndex === match.index;
    if (alreadyCurrent && !hasWeekExpired && !forceAdvance) {
        return;
    }

    const wasViewingWeekly = Boolean(prevWeeklyRef && state.currentParshaRef === prevWeeklyRef);

    let newWeekStart = null;
    const shouldUpdateWeekStart = !alreadyCurrent || !state.weeklyParshaWeekStart;
    if (shouldUpdateWeekStart) {
        if ((forceAdvance || hasWeekExpired) && hasStoredWeekStart) {
            newWeekStart = addDays(storedWeekStart, 7);
        } else {
            newWeekStart = getWeekStartForDate();
        }
    }

    setState({
        weeklyParshaRef: match.parsha.reference,
        weeklyParshaIndex: match.index,
        ...(newWeekStart ? { weeklyParshaWeekStart: newWeekStart.toISOString() } : {})
    });

    if (wasViewingWeekly || !state.currentParshaRef) {
        await goToParshaAfterWeeklyChange(match.parsha.reference, match.index);
    } else {
        const activeParshaName = state.allParshas[state.currentParshaIndex]?.name || null;
        if (activeParshaName) {
            updateMitzvahChallengeForParsha(activeParshaName);
        }
    }
}

async function goToParshaAfterWeeklyChange(reference, index) {
    if (!reference) {
        return;
    }

    const resolvedIndex = (typeof index === 'number' && index >= 0)
        ? index
        : state.allParshas.findIndex(p => p.reference === reference);

    if (resolvedIndex < 0) {
        return;
    }

    setState({
        currentParshaIndex: resolvedIndex,
        currentParshaRef: reference
    });

    document.querySelectorAll('select#parsha-selector').forEach((selector) => {
        selector.value = reference;
    });

    await loadParsha(reference);
    updateNavigationButtons();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function getMitzvahChallengeId(parshaName) {
    if (!parshaName || typeof parshaName !== 'string') {
        return null;
    }
    return `mitzvah-${parshaName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

function getMitzvahChallengeByParsha(parshaName) {
    if (!parshaName || !state.mitzvahChallenges || !Array.isArray(state.mitzvahChallenges)) {
        return null;
    }
    return state.mitzvahChallenges.find((challenge) => {
        return challenge?.parsha && challenge.parsha.toLowerCase() === parshaName.toLowerCase();
    }) || null;
}

function updateMitzvahChallengeForParsha(parshaName) {
    if (!parshaName) {
        teardownMitzvahChallenge();
        setState({
            currentMitzvahChallenge: null,
            currentMitzvahChallengeId: null
        });
        return;
    }
    renderMitzvahChallengeSection(parshaName);
}

function startMitzvahReflectionsListener(challengeId) {
    stopListeningForMitzvahReflections();
    mitzvahChatMessages = [];
    renderMitzvahChatMessages([]);

    if (!challengeId) {
        return;
    }

    listenForMitzvahReflections(challengeId, (reflections) => {
        mitzvahChatMessages = Array.isArray(reflections) ? reflections : [];
        renderMitzvahChatMessages(mitzvahChatMessages);
        // Re-render leaderboard so tie-breaking by earliest reflection applies
        if (Array.isArray(state.mitzvahLeaderboard) && state.mitzvahLeaderboard.length > 0) {
            renderMitzvahLeaderboard(state.mitzvahLeaderboard);
        }
    });
}

async function renderMitzvahChallengeSection(parshaName, providedChallenge = null) {
    const section = document.getElementById('mitzvah-challenge-section');
    const lockedContainer = document.getElementById('mitzvah-challenge-locked');
    const lockedHeading = document.getElementById('mitzvah-locked-heading');
    const lockedMessage = document.getElementById('mitzvah-locked-message');
    if (!section) {
        return;
    }

    const challenge = providedChallenge || getMitzvahChallengeByParsha(parshaName);

    if (!challenge) {
        teardownMitzvahChallenge();
        if (lockedContainer) {
            lockedContainer.classList.add('hidden');
        }
        return;
    }

    if (lockedContainer) {
        lockedContainer.classList.add('hidden');
    }

    const parshaIndex = state.allParshas.findIndex((parsha) => parsha.name === parshaName);
    const weeklyIndex = (typeof state.weeklyParshaIndex === 'number' && state.weeklyParshaIndex >= 0)
        ? state.weeklyParshaIndex
        : ((typeof state.currentParshaIndex === 'number' && state.currentParshaIndex >= 0)
            ? state.currentParshaIndex
            : parshaIndex);

    let challengeMode = 'current';
    if (weeklyIndex != null && weeklyIndex >= 0 && parshaIndex >= 0) {
        if (parshaIndex > weeklyIndex) {
            challengeMode = 'future';
        } else if (parshaIndex < weeklyIndex) {
            challengeMode = 'past';
        }
    }

    if (challengeMode === 'future') {
        teardownMitzvahChallenge();
        currentMitzvahChallengeMode = 'future';
        if (lockedContainer) {
            if (lockedHeading) {
                lockedHeading.textContent = `${parshaName} Challenge Unlocks Soon`;
            }
            if (lockedMessage) {
                lockedMessage.textContent = 'Return during this parsha’s week to read the mitzvah challenge and share reflections.';
            }
            lockedContainer.classList.remove('hidden');
        }
        return;
    }

    const challengeId = getMitzvahChallengeId(parshaName);
    currentMitzvahChallengeId = challengeId;
    currentMitzvahCompletion = false;
    currentMitzvahChallengeMode = challengeMode;

    const titleEl = document.getElementById('mitzvah-challenge-heading');
    const mitzvahEl = document.getElementById('mitzvah-challenge-mitzvah');
    const explanationEl = document.getElementById('mitzvah-challenge-explanation');
    const connectionEl = document.getElementById('mitzvah-challenge-connection');
    const actionEl = document.getElementById('mitzvah-challenge-action');
    const countdownEl = document.getElementById('mitzvah-countdown');
    const chatStatusEl = document.getElementById('mitzvah-chat-status');

    if (chatStatusEl) {
        chatStatusEl.textContent = '';
        chatStatusEl.classList.remove('mitzvah-chat-status--success');
    }

    if (countdownEl) {
        countdownEl.textContent = '';
        countdownEl.classList.remove('is-closed');
    }

    if (titleEl) {
        titleEl.textContent = `Weekly Mitzvah Challenge — ${parshaName}`;
    }
    if (mitzvahEl) {
        mitzvahEl.innerHTML = buildMitzvahLabel(challenge);
    }
    if (explanationEl) {
        explanationEl.innerHTML = formatText(challenge.explanation || '');
    }
    if (connectionEl) {
        connectionEl.innerHTML = formatText(challenge.connection || '');
    }
    if (actionEl) {
        actionEl.innerHTML = formatText(challenge.challenge || '');
    }

    const weekWindow = getWeekWindowForParsha(parshaIndex);
    const weekStart = weekWindow.weekStart;
    const deadline = weekWindow.deadline;

    setState({
        currentMitzvahChallenge: { ...challenge, parsha: parshaName },
        currentMitzvahChallengeId: challengeId,
        currentMitzvahWeekStart: weekStart ? weekStart.toISOString() : null,
        currentMitzvahDeadline: deadline ? deadline.toISOString() : null
    });

    mitzvahModalWasShown = false;

    section.classList.remove('hidden');

    const card = section.querySelector('.mitzvah-card');
    if (card) {
        card.classList.toggle('mitzvah-card--closed', challengeMode !== 'current');
    }

    clearMitzvahCountdown();
    startMitzvahCountdown(deadline);

    startMitzvahReflectionsListener(challengeId);

    await refreshMitzvahCompletionStatus(challengeId);
    updateMitzvahAuthState();
    await refreshMitzvahLeaderboardDisplay();

    // Self-heal: if this user completed the challenge but is missing from the
    // leaderboard (e.g. a prior write was blocked by a rules mismatch), silently
    // recalculate their total from their stored progress and refresh the display.
    if (currentMitzvahCompletion) {
        const selfHealUserId = getCurrentUserId();
        if (selfHealUserId) {
            const selfHealCanonicalId = resolveCanonicalLeaderboardUserId(selfHealUserId);
            const alreadyOnBoard = Array.isArray(state.mitzvahLeaderboard)
                && state.mitzvahLeaderboard.some(
                    (e) => e && (e.userId === selfHealCanonicalId || e.userId === selfHealUserId)
                );
            if (!alreadyOnBoard) {
                const selfHealUsername = resolveLeaderboardUsernameForDisplay(null);
                const selfHealEmail = (currentUserProfile && typeof currentUserProfile.email === 'string')
                    ? currentUserProfile.email
                    : null;
                recalculateMitzvahLeaderboard(selfHealUserId, selfHealUsername, selfHealEmail)
                    .then(() => refreshMitzvahLeaderboardDisplay())
                    .catch(console.error);
            }
        }
    }

    if (challengeMode === 'current') {
        populateMitzvahModalContent(challenge, parshaName);
        maybeShowMitzvahModal();
    } else {
        hideMitzvahModal(false);
    }
}

function buildMitzvahLabel(challenge) {
    if (!challenge || typeof challenge !== 'object') {
        return '';
    }
    const heb = challenge.mitzvahHebrew;
    const translit = challenge.mitzvahTransliteration;
    const english = challenge.mitzvahEnglish;
    const legacy = challenge.mitzvah;

    if (heb || translit || english) {
        const hebrewLine = heb
            ? `<span class=\"mitzvah-label__he\" dir=\"rtl\" lang=\"he\">${escapeHtml(heb)}</span>`
            : '';
        const subParts = [];
        if (translit) {
            subParts.push(`<span class=\"mitzvah-label__translit\">${escapeHtml(translit)}</span>`);
        }
        if (english) {
            subParts.push(`<span class=\"mitzvah-label__eng\">${escapeHtml(english)}</span>`);
        }
        const subLine = subParts.length
            ? `<span class=\"mitzvah-label__sub\">${subParts.join('<span class=\"mitzvah-label__divider\">•</span>')}</span>`
            : '';
        return `<span class=\"mitzvah-label\">${hebrewLine}${subLine}</span>`;
    }
    return escapeHtml(legacy || '');
}

function teardownMitzvahChallenge() {
    const section = document.getElementById('mitzvah-challenge-section');
    if (section) {
        section.classList.add('hidden');
    }
    stopListeningForMitzvahReflections();
    currentMitzvahChallengeId = null;
    currentMitzvahCompletion = false;
    mitzvahChatMessages = [];
    clearMitzvahCountdown();
    mitzvahModalWasShown = false;
    currentMitzvahChallengeMode = 'none';

    const chatContainer = document.getElementById('mitzvah-chat-messages');
    if (chatContainer) {
        chatContainer.innerHTML = '<p class="mitzvah-chat-empty">Weekly mitzvah reflections will appear here.</p>';
    }

    const chatStatus = document.getElementById('mitzvah-chat-status');
    if (chatStatus) {
        chatStatus.textContent = '';
        chatStatus.classList.remove('mitzvah-chat-status--success');
    }

    const checklistHelper = document.getElementById('mitzvah-checklist-helper');
    if (checklistHelper) {
        checklistHelper.textContent = '';
        checklistHelper.dataset.state = '';
    }

    const countdownEl = document.getElementById('mitzvah-countdown');
    if (countdownEl) {
        countdownEl.textContent = '';
        countdownEl.classList.remove('is-closed');
    }

    const modalCountdownEl = document.getElementById('mitzvah-modal-countdown');
    if (modalCountdownEl) {
        modalCountdownEl.textContent = '';
    }

    const leaderboardList = document.getElementById('mitzvah-leaderboard-list');
    if (leaderboardList) {
        leaderboardList.innerHTML = '<p class="mitzvah-leaderboard__empty">Complete mitzvah challenges to appear on the leaderboard.</p>';
    }

    hideMitzvahModal(false);

    const lockedContainer = document.getElementById('mitzvah-challenge-locked');
    if (lockedContainer) {
        lockedContainer.classList.add('hidden');
    }

    const card = section ? section.querySelector('.mitzvah-card') : null;
    if (card) {
        card.classList.remove('mitzvah-card--closed');
    }

    setState({
        currentMitzvahChallenge: null,
        currentMitzvahChallengeId: null,
        currentMitzvahWeekStart: null,
        currentMitzvahDeadline: null,
        mitzvahLeaderboard: []
    });
}

function updateMitzvahAuthState() {
    const checkbox = document.getElementById('mitzvah-challenge-checkbox');
    const chatInput = document.getElementById('mitzvah-chat-input');
    const chatSubmit = document.getElementById('mitzvah-chat-submit');
    const authMessage = document.getElementById('mitzvah-chat-auth');
    const chatStatus = document.getElementById('mitzvah-chat-status');
    const userId = getCurrentUserId();
    const windowOpen = isMitzvahWindowOpen();

    if (checkbox) {
        checkbox.disabled = true;
        checkbox.checked = Boolean(userId && currentMitzvahCompletion);
    }

    if (chatInput && chatSubmit) {
        if (!windowOpen) {
            chatInput.value = '';
            chatInput.placeholder = 'Reflection sharing for this mitzvah is closed.';
            chatInput.disabled = true;
            chatSubmit.disabled = true;
        } else if (!userId) {
            chatInput.value = '';
            chatInput.placeholder = 'Sign in to share how your mitzvah went.';
            chatInput.disabled = true;
            chatSubmit.disabled = true;
        } else {
            chatInput.disabled = false;
            chatSubmit.disabled = false;
            chatInput.placeholder = 'How did the mitzvah go for you this week?';
        }
    }

    if (authMessage) {
        if (!userId && windowOpen) {
            authMessage.classList.remove('hidden');
        } else {
            authMessage.classList.add('hidden');
        }
    }

    if (chatStatus && !isSubmittingMitzvahReflection) {
        if (!windowOpen) {
            chatStatus.textContent = 'The reflection window for this mitzvah has closed.';
            chatStatus.classList.remove('mitzvah-chat-status--success');
        } else if (!userId) {
            chatStatus.textContent = '';
            chatStatus.classList.remove('mitzvah-chat-status--success');
        }
    }

    updateMitzvahChecklistUI();
}

function updateMitzvahChecklistUI(statusMessage = null) {
    const checkbox = document.getElementById('mitzvah-challenge-checkbox');
    const helper = document.getElementById('mitzvah-checklist-helper');
    const userId = getCurrentUserId();
    const windowOpen = isMitzvahWindowOpen();

    if (!checkbox || !helper) {
        return;
    }

    checkbox.disabled = true;
    checkbox.checked = Boolean(userId && currentMitzvahCompletion);

    if (!windowOpen) {
        helper.textContent = 'This challenge window has closed. Join us for next week\'s mitzvah!';
        helper.dataset.state = 'status';
        return;
    }

    if (!userId) {
        checkbox.checked = false;
        helper.textContent = 'Sign in to track your challenge progress.';
        helper.dataset.state = '';
        return;
    }

    if (statusMessage) {
        helper.textContent = statusMessage;
        helper.dataset.state = 'status';
    } else if (currentMitzvahCompletion) {
        helper.textContent = 'Completed! Feel free to revisit or share how it went.';
        helper.dataset.state = 'success';
    } else {
        helper.textContent = 'Share your reflection below to mark this challenge complete.';
        helper.dataset.state = 'status';
    }
}

async function refreshMitzvahCompletionStatus(challengeId) {
    const checkbox = document.getElementById('mitzvah-challenge-checkbox');
    const helper = document.getElementById('mitzvah-checklist-helper');

    currentMitzvahCompletion = false;

    if (!challengeId || !checkbox || !helper) {
        updateMitzvahChecklistUI();
        return;
    }

    const userId = getCurrentUserId();
    if (!userId) {
        updateMitzvahAuthState();
        return;
    }

    checkbox.dataset.loading = 'true';
    checkbox.disabled = true;
    helper.textContent = 'Checking your progress...';
    helper.dataset.state = '';

    let hadError = false;
    try {
        const status = await getMitzvahCompletionStatus(userId, challengeId);
        currentMitzvahCompletion = Boolean(status.completed);
        console.log('[Mitzvah Completion] Status loaded:', {
            userId,
            challengeId,
            completed: status.completed,
            currentMitzvahCompletion
        });
    } catch (error) {
        console.error('Unable to load mitzvah completion status:', error);
        helper.textContent = 'Unable to load your progress right now.';
        helper.dataset.state = 'error';
        hadError = true;
    } finally {
        checkbox.dataset.loading = 'false';
        if (hadError) {
            checkbox.disabled = true;
        } else {
            updateMitzvahAuthState();
        }
    }
}

async function handleMitzvahChecklistToggle(event) {
    event.preventDefault();
    const checkbox = event.target;
    const helper = document.getElementById('mitzvah-checklist-helper');

    if (!checkbox) {
        return;
    }

    checkbox.checked = Boolean(currentMitzvahCompletion && getCurrentUserId());

    // Show red error if user tries to check without sharing reflection
    if (!currentMitzvahCompletion && getCurrentUserId()) {
        helper.textContent = 'You must first share the reflection to mark as complete';
        helper.dataset.state = 'error';
        // Clear the error after 3 seconds
        setTimeout(() => {
            updateMitzvahChecklistUI();
        }, 3000);
    } else {
        updateMitzvahChecklistUI(currentMitzvahCompletion
            ? 'You\'ve already marked this challenge complete by sharing a reflection.'
            : 'Share your reflection below to mark this challenge complete.');
    }
}

function sanitizeReflectionUsername(value) {
    if (typeof value !== 'string') {
        return '';
    }
    const trimmed = value.trim();
    if (!trimmed || trimmed.includes('@') || trimmed.toLowerCase() === 'friend') {
        return '';
    }
    return trimmed;
}

function candidateMatchesReflectionUser(candidate, userId) {
    if (!candidate || !userId) {
        return false;
    }
    if (candidate.userId && candidate.userId === userId) {
        return true;
    }
    if (candidate.canonicalUserId && candidate.canonicalUserId === userId) {
        return true;
    }
    if (Array.isArray(candidate.authUserIds) && candidate.authUserIds.includes(userId)) {
        return true;
    }
    return false;
}

function deriveDisplayNameFromCandidate(candidate) {
    const candidateUsername = sanitizeReflectionUsername(candidate?.username);
    if (candidateUsername) {
        return candidateUsername;
    }

    const emailCandidates = [];
    if (typeof candidate?.email === 'string') {
        emailCandidates.push(candidate.email);
    }
    if (Array.isArray(candidate?.emails)) {
        candidate.emails.forEach((value) => {
            if (typeof value === 'string') {
                emailCandidates.push(value);
            }
        });
    }

    for (const email of emailCandidates) {
        const trimmed = email && typeof email === 'string' ? email.trim() : '';
        if (!trimmed) {
            continue;
        }
        const displayName = getDisplayNameFromEmail(trimmed);
        if (displayName && displayName !== 'Anonymous' && displayName !== 'Friend') {
            return displayName;
        }
    }

    return '';
}

function findDisplayNameForReflectionUserId(userId) {
    if (!userId) {
        return '';
    }

    if (currentUserProfile && candidateMatchesReflectionUser(currentUserProfile, userId)) {
        const name = deriveDisplayNameFromCandidate(currentUserProfile);
        if (name) {
            return name;
        }
    }

    const presenceSources = [trackedOnlineFriends, trackedRecentFriendLogins];
    for (const list of presenceSources) {
        if (!Array.isArray(list)) {
            continue;
        }
        for (const candidate of list) {
            if (candidateMatchesReflectionUser(candidate, userId)) {
                const name = deriveDisplayNameFromCandidate(candidate);
                if (name) {
                    return name;
                }
            }
        }
    }

    return '';
}

function getMitzvahReflectionDisplayName(message) {
    if (!message || typeof message !== 'object') {
        return 'Friend';
    }

    const initialName = sanitizeReflectionUsername(message.username);
    if (initialName) {
        return initialName;
    }

    const userId = typeof message.userId === 'string' ? message.userId : '';
    if (userId) {
        const lookupName = findDisplayNameForReflectionUserId(userId);
        if (lookupName) {
            return lookupName;
        }
    }

    return 'Friend';
}

function renderMitzvahChatMessages(messages = []) {
    const messagesContainer = document.getElementById('mitzvah-chat-messages');
    if (!messagesContainer) {
        return;
    }

    messagesContainer.innerHTML = '';

    if (!messages || messages.length === 0) {
        const emptyMessage = currentMitzvahChallengeMode === 'past'
            ? 'No reflections were shared during this mitzvah week.'
            : 'Share how the mitzvah went this week.';
        messagesContainer.innerHTML = `<p class="mitzvah-chat-empty">${emptyMessage}</p>`;
        return;
    }

    const currentUserId = getCurrentUserId();
    messages.forEach((message) => {
        const wrapper = document.createElement('div');
        wrapper.classList.add('mitzvah-chat-message');
        if (message.userId && currentUserId && message.userId === currentUserId) {
            wrapper.classList.add('mitzvah-chat-message--self');
        }

        const meta = document.createElement('div');
        meta.classList.add('mitzvah-chat-message__meta');

        const author = document.createElement('span');
        author.classList.add('mitzvah-chat-message__author');
        author.textContent = getMitzvahReflectionDisplayName(message);

        const time = document.createElement('span');
        time.classList.add('mitzvah-chat-message__time');
        time.textContent = formatTimeAgo(message.createdAt || message.updatedAt);

        meta.appendChild(author);
        meta.appendChild(time);

        const body = document.createElement('div');
        body.classList.add('mitzvah-chat-message__body');
        body.innerHTML = convertMitzvahMessageText(message.message || '');

        wrapper.appendChild(meta);
        wrapper.appendChild(body);

        // Add reaction buttons for each reflection
        const reactionsSection = document.createElement('div');
        reactionsSection.classList.add('mitzvah-message-reactions');

        const reactions = message.reactions || {};
        const emphasizes = reactions.emphasize || [];
        const hearts = reactions.heart || [];

        // Emphasize reaction button (matching verse reaction style)
        const emphasizeBtn = document.createElement('button');
        emphasizeBtn.className = 'reaction-btn emphasize-btn';
        if (currentUserId && emphasizes.includes(currentUserId)) {
            emphasizeBtn.classList.add('active');
        }
        emphasizeBtn.setAttribute('aria-label', 'Emphasize this reflection');
        emphasizeBtn.innerHTML = `
            <span class="reaction-icon emphasize-icon"></span>
            <span class="reaction-count">${emphasizes.length > 0 ? emphasizes.length : ''}</span>
        `;
        emphasizeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (currentUserId && message.id) {
                handleMitzvahReflectionReaction(message.id, 'emphasize', currentUserId);
            }
        });

        // Heart reaction button (matching verse reaction style)
        const heartBtn = document.createElement('button');
        heartBtn.className = 'reaction-btn heart-btn';
        if (currentUserId && hearts.includes(currentUserId)) {
            heartBtn.classList.add('active');
        }
        heartBtn.setAttribute('aria-label', 'Heart this reflection');
        heartBtn.innerHTML = `
            <span class="reaction-icon heart-icon"></span>
            <span class="reaction-count">${hearts.length > 0 ? hearts.length : ''}</span>
        `;
        heartBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (currentUserId && message.id) {
                handleMitzvahReflectionReaction(message.id, 'heart', currentUserId);
            }
        });

        reactionsSection.appendChild(emphasizeBtn);
        reactionsSection.appendChild(heartBtn);
        wrapper.appendChild(reactionsSection);

        messagesContainer.appendChild(wrapper);
    });

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function convertMitzvahMessageText(text) {
    if (!text) {
        return '';
    }
    return escapeHtml(text).replace(/\n/g, '<br>');
}

function calculateMitzvahWeekWindow(referenceDate = new Date()) {
    const weekStart = getWeekStartForDate(referenceDate);
    const deadline = addDays(weekStart, 7);
    return { weekStart, deadline };
}

function getWeekWindowForParsha(parshaIndex) {
    const baseWindow = getStoredWeeklyWeekWindow();
    const weekStart = new Date(baseWindow.weekStart);
    const deadline = new Date(baseWindow.deadline);
    const weeklyIndex = (typeof state.weeklyParshaIndex === 'number' && state.weeklyParshaIndex >= 0)
        ? state.weeklyParshaIndex
        : ((typeof state.currentParshaIndex === 'number' && state.currentParshaIndex >= 0)
            ? state.currentParshaIndex
            : parshaIndex);

    if (weeklyIndex == null || weeklyIndex < 0 || parshaIndex == null || parshaIndex < 0) {
        return { weekStart, deadline };
    }

    const diff = weeklyIndex - parshaIndex;
    if (diff !== 0) {
        weekStart.setDate(weekStart.getDate() - diff * 7);
        deadline.setDate(deadline.getDate() - diff * 7);
    }

    return { weekStart, deadline };
}

function isMitzvahWindowOpen() {
    const deadline = state.currentMitzvahDeadline;
    if (!deadline) {
        return true;
    }
    return Date.now() < new Date(deadline).getTime();
}

function startMitzvahCountdown(deadline) {
    clearMitzvahCountdown();
    if (!deadline) {
        updateCountdownDisplays('', false, null);
        return;
    }

    const target = new Date(deadline);

    const update = () => {
        const now = Date.now();
        const diff = target.getTime() - now;
        if (diff <= 0) {
            updateCountdownDisplays('', true, target);
            handleMitzvahWindowClosed();
            clearMitzvahCountdown();
            return;
        }

        updateCountdownDisplays(`Time remaining: ${formatCountdown(diff)}`, false, target);
    };

    update();
    mitzvahCountdownIntervalId = setInterval(update, 1000);
}

function clearMitzvahCountdown() {
    if (mitzvahCountdownIntervalId) {
        clearInterval(mitzvahCountdownIntervalId);
        mitzvahCountdownIntervalId = null;
    }
}

function updateCountdownDisplays(text, isClosed, deadlineDate) {
    const countdownEl = document.getElementById('mitzvah-countdown');
    const displayText = isClosed
        ? (deadlineDate ? `Challenge window closed on ${formatDeadlineDisplay(deadlineDate)}` : 'Challenge window closed')
        : text;
    if (countdownEl) {
        countdownEl.textContent = displayText || '';
        countdownEl.classList.toggle('is-closed', Boolean(displayText && isClosed));
    }

    const modalCountdownEl = document.getElementById('mitzvah-modal-countdown');
    if (modalCountdownEl) {
        if (isClosed) {
            modalCountdownEl.textContent = deadlineDate ? `Closed ${formatDeadlineDisplayShort(deadlineDate)}` : 'Closed';
        } else {
            modalCountdownEl.textContent = text ? text.replace('Time remaining: ', '') : '';
        }
    }
}

function formatCountdown(diffMs) {
    const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const segments = [];
    if (days > 0) {
        segments.push(`${days}d`);
    }
    if (hours > 0 || days > 0) {
        segments.push(`${hours}h`);
    }
    if (minutes > 0 || hours > 0 || days > 0) {
        segments.push(`${minutes}m`);
    }
    segments.push(`${seconds}s`);

    return segments.join(' ');
}

function formatDeadlineDisplay(date) {
    return date.toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
}

function formatDeadlineDisplayShort(date) {
    return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
}

function handleMitzvahWindowClosed() {
    if (currentMitzvahChallengeMode === 'current') {
        hideMitzvahModal(true);
        scheduleImmediateWeeklyParshaCheck({ forceAdvance: true });
    }
    updateMitzvahAuthState();
}

function maybeShowMitzvahModal(force = false) {
    return; // auto-popup disabled
    const modal = document.getElementById('mitzvah-modal');
    const challenge = state.currentMitzvahChallenge;
    const challengeId = currentMitzvahChallengeId;
    const windowOpen = isMitzvahWindowOpen();
    const userId = getCurrentUserId();

    if (currentMitzvahChallengeMode !== 'current') {
        return;
    }

    if (!modal || !challenge || !challengeId || !windowOpen || !userId) {
        return;
    }

    if (!force) {
        if (mitzvahModalWasShown) {
            return;
        }
        const dismissedKey = localStorage.getItem(`${MITZVAH_MODAL_DISMISS_KEY_PREFIX}${challengeId}`);
        if (dismissedKey) {
            return;
        }
    }

    populateMitzvahModalContent(challenge, challenge.parsha || state.allParshas[state.currentParshaIndex]?.name || 'This Week');
    showMitzvahModal();
}

function showMitzvahModal() {
    const modal = document.getElementById('mitzvah-modal');
    if (!modal) {
        return;
    }
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    mitzvahModalWasShown = true;
    // Prevent background scroll while modal is open
    try {
        document.documentElement.classList.add('no-scroll');
        document.body.classList.add('no-scroll');
    } catch (e) {
        // noop
    }
}

function hideMitzvahModal(persist = false) {
    const modal = document.getElementById('mitzvah-modal');
    if (!modal) {
        return;
    }
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');

    if (persist && currentMitzvahChallengeId) {
        localStorage.setItem(`${MITZVAH_MODAL_DISMISS_KEY_PREFIX}${currentMitzvahChallengeId}`, '1');
    }

    mitzvahModalWasShown = persist;

    // Restore background scroll
    try {
        document.documentElement.classList.remove('no-scroll');
        document.body.classList.remove('no-scroll');
    } catch (e) {
        // noop
    }
}

function dismissMitzvahModal(persist) {
    hideMitzvahModal(persist);
}

function populateMitzvahModalContent(challenge, parshaName) {
    const titleEl = document.getElementById('mitzvah-modal-title');
    const mitzvahEl = document.getElementById('mitzvah-modal-mitzvah');
    const summaryEl = document.getElementById('mitzvah-modal-summary');

    if (titleEl) {
        titleEl.textContent = `${parshaName || 'This Week'} — Weekly Challenge`;
    }
    if (mitzvahEl) {
        mitzvahEl.innerHTML = buildMitzvahLabel(challenge || {});
    }
    if (summaryEl) {
        const pieces = [];
        if (challenge?.explanation) {
            pieces.push(`<div class="mitzvah-modal__paragraph">${formatText(challenge.explanation)}</div>`);
        }
        if (challenge?.connection) {
            pieces.push(`<div class="mitzvah-modal__paragraph">${formatText(challenge.connection)}</div>`);
        }
        if (challenge?.challenge) {
            pieces.push(`<div class="mitzvah-modal__paragraph mitzvah-modal__callout">${formatText(challenge.challenge)}</div>`);
        }
        summaryEl.innerHTML = pieces.join('');
    }
}

function scrollToMitzvahChallenge() {
    const section = document.getElementById('mitzvah-challenge-section');
    if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function resolveCanonicalLeaderboardUserId(userId) {
    if (!userId) {
        return null;
    }

    if (currentUserProfile && typeof currentUserProfile.canonicalUserId === 'string' && currentUserProfile.canonicalUserId.trim()) {
        return currentUserProfile.canonicalUserId.trim();
    }

    return userId;
}

function resolveLeaderboardUsernameForDisplay(preferredUsername) {
    const preferred = sanitizeReflectionUsername(preferredUsername);
    if (preferred) {
        return preferred;
    }

    const profileName = sanitizeReflectionUsername(currentUserProfile && currentUserProfile.username);
    if (profileName) {
        return profileName;
    }

    const savedName = sanitizeReflectionUsername(getSavedUsername());
    if (savedName) {
        return savedName;
    }

    const profileEmail = (currentUserProfile && typeof currentUserProfile.email === 'string' && currentUserProfile.email.trim())
        ? currentUserProfile.email
        : (currentUserProfile && Array.isArray(currentUserProfile.emails)
            ? currentUserProfile.emails.find((value) => typeof value === 'string' && value.trim())
            : null);

    if (profileEmail) {
        return getDisplayNameFromEmail(profileEmail);
    }

    return 'Friend';
}

function applyLocalMitzvahLeaderboardIncrement(userId, username, delta = 1) {
    const canonicalUserId = resolveCanonicalLeaderboardUserId(userId);
    const deltaNumber = Number(delta);

    if (!canonicalUserId || !Number.isFinite(deltaNumber) || deltaNumber === 0) {
        return;
    }

    const leaderboard = Array.isArray(state.mitzvahLeaderboard)
        ? [...state.mitzvahLeaderboard]
        : [];
    const existingIndex = leaderboard.findIndex((entry) => entry && entry.userId === canonicalUserId);
    const existingEntry = existingIndex >= 0 ? leaderboard[existingIndex] : null;
    const baseTotal = (existingEntry && typeof existingEntry.totalCompleted === 'number')
        ? existingEntry.totalCompleted
        : 0;
    const newTotal = Math.max(0, baseTotal + deltaNumber);
    const resolvedUsername = resolveLeaderboardUsernameForDisplay(username)
        || (existingEntry ? existingEntry.username : null)
        || 'Friend';

    const nextEntry = {
        ...(existingEntry || {}),
        userId: canonicalUserId,
        username: resolvedUsername,
        totalCompleted: newTotal
    };

    if (existingIndex >= 0) {
        leaderboard[existingIndex] = nextEntry;
    } else {
        leaderboard.push(nextEntry);
    }

    setState({ mitzvahLeaderboard: leaderboard });
    renderMitzvahLeaderboard(leaderboard);
}

function mergeLeaderboardWithLocalState(fetched = []) {
    const serverList = Array.isArray(fetched) ? fetched : [];
    const localList = Array.isArray(state.mitzvahLeaderboard) ? state.mitzvahLeaderboard : [];

    const byUser = new Map();

    const upsert = (entry, isLocal = false) => {
        if (!entry || !entry.userId) {
            return;
        }
        const existing = byUser.get(entry.userId) || {};
        const existingTotal = typeof existing.totalCompleted === 'number' ? existing.totalCompleted : 0;
        const newTotal = typeof entry.totalCompleted === 'number' ? entry.totalCompleted : 0;
        const mergedTotal = Math.max(existingTotal, newTotal);

        const merged = {
            ...existing,
            ...(isLocal ? {} : entry),
            ...(isLocal ? entry : {})
        };
        merged.totalCompleted = mergedTotal;
        merged.userId = entry.userId;
        merged.username = entry.username || existing.username || 'Friend';

        byUser.set(entry.userId, merged);
    };

    serverList.forEach((entry) => upsert(entry, false));
    localList.forEach((entry) => upsert(entry, true));

    return Array.from(byUser.values());
}

function renderMitzvahLeaderboard(leaderboard = []) {
    const listEl = document.getElementById('mitzvah-leaderboard-list');
    if (!listEl) {
        return;
    }

    if (!leaderboard || leaderboard.length === 0) {
        const emptyText = currentMitzvahChallengeMode === 'past'
            ? 'No completions were recorded during this mitzvah week.'
            : 'Be the first to complete this week’s mitzvah!';
        listEl.innerHTML = `<p class="mitzvah-leaderboard__empty">${emptyText}</p>`;
        return;
    }

    const currentUserId = getCurrentUserId();
    const currentCanonicalUserId = (currentUserProfile && currentUserProfile.userId) || null;
    listEl.innerHTML = '';

    // For tie-breaking: earliest reflection in the current challenge wins
    const earliestReflectionByUser = {};
    if (Array.isArray(mitzvahChatMessages) && mitzvahChatMessages.length > 0) {
        mitzvahChatMessages.forEach((msg) => {
            const uid = msg && msg.userId;
            const ts = msg && msg.createdAt;
            const t = ts && typeof ts.toMillis === 'function' ? ts.toMillis() : (ts ? new Date(ts).getTime() : NaN);
            if (uid && Number.isFinite(t)) {
                if (!(uid in earliestReflectionByUser)) {
                    earliestReflectionByUser[uid] = t;
                } else if (t < earliestReflectionByUser[uid]) {
                    earliestReflectionByUser[uid] = t;
                }
            }
        });
    }

    // Sort by total desc, then earliest reflection asc, then username for stability
    const sorted = [...leaderboard].sort((a, b) => {
        const aScore = Number(a?.totalCompleted) || 0;
        const bScore = Number(b?.totalCompleted) || 0;
        if (bScore !== aScore) return bScore - aScore;

        const aTie = earliestReflectionByUser[a?.userId] ?? (a?.firstCompletedAt?.toMillis ? a.firstCompletedAt.toMillis() : (a?.firstCompletedAt ? new Date(a.firstCompletedAt).getTime() : Number.POSITIVE_INFINITY));
        const bTie = earliestReflectionByUser[b?.userId] ?? (b?.firstCompletedAt?.toMillis ? b.firstCompletedAt.toMillis() : (b?.firstCompletedAt ? new Date(b.firstCompletedAt).getTime() : Number.POSITIVE_INFINITY));
        if (aTie !== bTie) return aTie - bTie;

        const an = (a?.username || '').toLowerCase();
        const bn = (b?.username || '').toLowerCase();
        if (an < bn) return -1;
        if (an > bn) return 1;
        return (a?.userId || '').localeCompare(b?.userId || '');
    });

    sorted.forEach((entry, index) => {
        const item = document.createElement('div');
        item.className = 'mitzvah-leaderboard__item';
        if (entry.userId && ((currentUserId && entry.userId === currentUserId) || (currentCanonicalUserId && entry.userId === currentCanonicalUserId))) {
            item.classList.add('is-self');
        }

        const rank = document.createElement('span');
        rank.className = 'mitzvah-leaderboard__rank';
        const displayRank = index + 1;
        rank.textContent = `#${displayRank}`;

        // Create a flex container for name and badge to keep them together
        const nameContainer = document.createElement('div');
        nameContainer.className = 'mitzvah-leaderboard__name-container';

        const name = document.createElement('span');
        name.className = 'mitzvah-leaderboard__name';
        name.textContent = entry.username || 'Friend';
        nameContainer.appendChild(name);

        const count = document.createElement('span');
        count.className = 'mitzvah-leaderboard__count';
        count.textContent = `${entry.totalCompleted}`;

        item.appendChild(rank);
        item.appendChild(nameContainer);
        item.appendChild(count);

        listEl.appendChild(item);
    });
}

async function refreshMitzvahLeaderboardDisplay() {
    const listEl = document.getElementById('mitzvah-leaderboard-list');
    const challengeActive = Boolean(state.currentMitzvahChallengeId);
    if (!listEl || !challengeActive) {
        return;
    }

    if (isLoadingMitzvahLeaderboard) {
        return;
    }

    isLoadingMitzvahLeaderboard = true;
    listEl.innerHTML = '<p class="mitzvah-leaderboard__empty">Loading leaderboard…</p>';

    try {
        const leaderboard = await getMitzvahLeaderboard(MITZVAH_LEADERBOARD_LIMIT);
        const merged = mergeLeaderboardWithLocalState(leaderboard);
        setState({ mitzvahLeaderboard: merged });
        renderMitzvahLeaderboard(merged);
    } catch (error) {
        console.error('Unable to load mitzvah leaderboard:', error);
        listEl.innerHTML = '<p class="mitzvah-leaderboard__error">Unable to load leaderboard right now.</p>';
    } finally {
        isLoadingMitzvahLeaderboard = false;
    }
}

async function handleMitzvahChatSubmit() {
    const input = document.getElementById('mitzvah-chat-input');
    const statusEl = document.getElementById('mitzvah-chat-status');
    const submitButton = document.getElementById('mitzvah-chat-submit');

    if (!input || !statusEl) {
        return;
    }

    const challengeId = currentMitzvahChallengeId;
    const userId = getCurrentUserId();
    const windowOpen = isMitzvahWindowOpen();

    if (!challengeId) {
        statusEl.textContent = 'Select a parsha with a mitzvah challenge to share reflections.';
        statusEl.classList.remove('mitzvah-chat-status--success');
        return;
    }

    if (!windowOpen) {
        statusEl.textContent = 'The reflection window for this mitzvah has closed.';
        statusEl.classList.remove('mitzvah-chat-status--success');
        return;
    }

    if (!userId) {
        statusEl.textContent = 'Sign in to share your reflection.';
        statusEl.classList.remove('mitzvah-chat-status--success');
        return;
    }

    const message = input.value.trim();
    if (!message) {
        statusEl.textContent = 'Please write a reflection before sharing.';
        statusEl.classList.remove('mitzvah-chat-status--success');
        return;
    }

    if (isSubmittingMitzvahReflection) {
        return;
    }

    isSubmittingMitzvahReflection = true;
    statusEl.textContent = '';
    statusEl.classList.remove('mitzvah-chat-status--success');

    if (submitButton) {
        submitButton.disabled = true;
    }
    input.disabled = true;

    const wasCompleted = currentMitzvahCompletion;

    try {
        const username = (currentUserProfile && currentUserProfile.username && !currentUserProfile.username.includes('@'))
            ? currentUserProfile.username
            : getSavedUsername();

        const profilePrimaryEmail = (currentUserProfile && typeof currentUserProfile.email === 'string')
            ? currentUserProfile.email
            : null;
        const profileAlternateEmail = (currentUserProfile && Array.isArray(currentUserProfile.emails))
            ? currentUserProfile.emails.find((value) => typeof value === 'string' && value.trim())
            : null;
        const accountEmail = typeof getCurrentUserEmail === 'function' ? getCurrentUserEmail() : null;
        const submissionEmail = profilePrimaryEmail || profileAlternateEmail || accountEmail || null;

        console.log('[Mitzvah Reflection] Submitting reflection:', {
            challengeId,
            userId,
            username,
            submissionEmail,
            wasCompleted,
            currentMitzvahCompletion
        });

        await submitMitzvahReflection(challengeId, message, userId, username, submissionEmail);
        input.value = '';

        if (!wasCompleted) {
            try {
                console.log('[Mitzvah Reflection] First completion! Updating leaderboard...', {
                    userId,
                    challengeId,
                    username,
                    submissionEmail
                });
                await setMitzvahCompletionStatus(userId, challengeId, true);
                currentMitzvahCompletion = true;
                updateMitzvahChecklistUI('Challenge marked as completed!');
                await updateMitzvahLeaderboard(userId, username, 1, submissionEmail);
                applyLocalMitzvahLeaderboardIncrement(userId, username, 1);
                console.log('[Mitzvah Reflection] Leaderboard incremented successfully');
            } catch (error) {
                console.error('Error finalizing mitzvah completion:', error);
                updateMitzvahChecklistUI('Reflection saved, but we could not update completion status. Please try again later.');
            }
        } else {
            console.log('[Mitzvah Reflection] Already completed this challenge - skipping increment', {
                challengeId,
                currentMitzvahCompletion
            });
            updateMitzvahChecklistUI();
        }

        // Ensure leaderboard total is accurate by recalculating from progress
        try {
            console.log('[Mitzvah Reflection] Recalculating leaderboard total...');
            const recalcResult = await recalculateMitzvahLeaderboard(userId, username, submissionEmail);
            console.log('[Mitzvah Reflection] Recalculation result:', recalcResult);

            // Add a small delay to ensure Firestore propagation
            await new Promise(resolve => setTimeout(resolve, 500));

            console.log('[Mitzvah Reflection] Refreshing leaderboard display...');
            await refreshMitzvahLeaderboardDisplay();
            console.log('[Mitzvah Reflection] Leaderboard display refreshed successfully');
        } catch (e) {
            console.error('Unable to recalculate leaderboard:', e);
        }

        statusEl.textContent = 'Reflection shared!';
        statusEl.classList.add('mitzvah-chat-status--success');
    } catch (error) {
        console.error('Error sharing mitzvah reflection:', error);
        statusEl.textContent = 'Could not share reflection. Please try again.';
    } finally {
        isSubmittingMitzvahReflection = false;
        if (submitButton) {
            submitButton.disabled = false;
        }
        input.disabled = false;
        input.focus();
        updateMitzvahAuthState();
        setTimeout(() => {
            if (statusEl.classList.contains('mitzvah-chat-status--success')) {
                statusEl.textContent = '';
                statusEl.classList.remove('mitzvah-chat-status--success');
            }
        }, 2500);
    }
}

async function handleMitzvahReflectionReaction(reflectionId, reactionType, userId) {
    if (!userId) {
        return;
    }

    try {
        await submitMitzvahReflectionReaction(reflectionId, reactionType, userId);
    } catch (error) {
        console.error('Error submitting reflection reaction:', error);
        // Optionally, show an error to the user
    }
}

function setupCommentPanelListeners() {
    document.getElementById('close-comment-panel').addEventListener('click', () => {
        closeCommentsPanel(stopListeningForComments);
    });
    
    document.getElementById('comment-overlay').addEventListener('click', () => {
        closeCommentsPanel(stopListeningForComments);
    });
    
    document.getElementById('submit-comment-btn').addEventListener('click', handleCommentSubmit);
    
    document.getElementById('comment-input').addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaCmd) && e.key === 'Enter') {
            handleCommentSubmit();
        }
    });
}

function setupLoginListeners() {
    const loginBtn = document.getElementById('login-btn');
    const loginEmail = document.getElementById('login-email');
    const loginPassword = document.getElementById('login-password');
    const loginError = document.getElementById('login-error');
    const myBookmarksBtn = document.getElementById('my-bookmarks-btn');
    const logoutBtn = document.getElementById('logout-btn');

    // Password reset modal elements
    const forgotPasswordBtn = document.getElementById('forgot-password-btn');
    const resetPasswordModal = document.getElementById('reset-password-modal');
    const resetEmail = document.getElementById('reset-email');
    const sendResetBtn = document.getElementById('send-reset-btn');
    const backToLoginBtn = document.getElementById('back-to-login-btn');
    const resetError = document.getElementById('reset-error');
    const resetSuccess = document.getElementById('reset-success');

    if (loginBtn) {
        loginBtn.addEventListener('click', async () => {
            const email = loginEmail.value.trim();
            const password = loginPassword.value.trim();

            if (!email || !password) {
                showLoginError(loginError, 'Please enter email and password');
                return;
            }

            try {
                loginBtn.disabled = true;
                loginBtn.textContent = 'Signing In...';

                await signInWithEmail(email, password);
                hideLoginModal();
                loginEmail.value = '';
                loginPassword.value = '';
                loginError.classList.add('hidden');
            } catch (error) {
                console.error('Sign-in error:', error);
                let errorMessage = 'Sign-in failed. Check your credentials.';
                if (error.code === 'auth/user-not-found') {
                    errorMessage = 'No account found with this email. Click "Create Account" to sign up.';
                } else if (error.code === 'auth/wrong-password') {
                    errorMessage = 'Incorrect password. Please try again.';
                } else if (error.code === 'auth/invalid-email') {
                    errorMessage = 'Please enter a valid email address.';
                }
                showLoginError(loginError, errorMessage);
            } finally {
                loginBtn.disabled = false;
                loginBtn.textContent = 'Sign In';
            }
        });

        // Enter key to sign in
        [loginEmail, loginPassword].forEach(field => {
            field.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    loginBtn.click();
                }
            });
        });
    }

    // Forgot Password Button
    if (forgotPasswordBtn) {
        forgotPasswordBtn.addEventListener('click', () => {
            // Reset the password reset form
            resetEmail.value = '';
            resetError.classList.add('hidden');
            resetSuccess.classList.add('hidden');
            resetPasswordModal.classList.remove('hidden');
        });
    }

    // Send Reset Email Button
    if (sendResetBtn) {
        sendResetBtn.addEventListener('click', async () => {
            const email = resetEmail.value.trim();

            if (!email) {
                resetError.textContent = 'Please enter your email address';
                resetError.classList.remove('hidden');
                resetSuccess.classList.add('hidden');
                return;
            }

            try {
                sendResetBtn.disabled = true;
                sendResetBtn.textContent = 'Sending...';

                const result = await sendPasswordReset(email);

                if (result.success) {
                    resetSuccess.innerHTML = 'Password reset email sent!<br><strong>Please check your spam folder</strong> if you don\'t see it in your inbox.';
                    resetSuccess.classList.remove('hidden');
                    resetError.classList.add('hidden');
                    resetEmail.value = '';
                } else {
                    resetError.textContent = result.error || 'Failed to send reset email';
                    resetError.classList.remove('hidden');
                    resetSuccess.classList.add('hidden');
                }
            } catch (error) {
                console.error('Error sending password reset:', error);
                resetError.textContent = 'Error sending reset email. Please try again.';
                resetError.classList.remove('hidden');
                resetSuccess.classList.add('hidden');
            } finally {
                sendResetBtn.disabled = false;
                sendResetBtn.textContent = 'Send Reset Email';
            }
        });
    }

    // Back to Login Button
    if (backToLoginBtn) {
        backToLoginBtn.addEventListener('click', () => {
            resetPasswordModal.classList.add('hidden');
            resetEmail.value = '';
            resetError.classList.add('hidden');
            resetSuccess.classList.add('hidden');
        });
    }

    // Enter key to send reset email
    if (resetEmail) {
        resetEmail.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && sendResetBtn) {
                sendResetBtn.click();
            }
        });
    }

    if (myBookmarksBtn && myBookmarksBtn.tagName === 'BUTTON') {
        myBookmarksBtn.addEventListener('click', openBookmarksPanel);
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await signOutUser();
                closeCommentsPanel(stopListeningForComments);
                hideInfoPanel();
                // Clear chavruta context and redirect to login
                sessionStorage.removeItem('activeChavrutaId');
                window.location.href = '/';
            } catch (error) {
                console.error('Sign-out error:', error);
            }
        });
    }
}

function showLoginError(element, message) {
    element.textContent = message;
    element.classList.remove('hidden');
}

async function handleCommentSubmit() {
    const commentInput = document.getElementById('comment-input');
    const verseRefInput = document.getElementById('current-comment-verse-ref');
    const submitButton = document.getElementById('submit-comment-btn');

    const text = commentInput.value.trim();
    const verseRef = verseRefInput.value;
    const userId = getCurrentUserId();
    const username = getSavedUsername();

    if (!userId) {
        showCommentStatus('Please wait, connecting...', true);
        return;
    }

    if (!username) {
        showCommentStatus('Please set your name first', true);
        document.getElementById('username-setup').classList.remove('hidden');
        return;
    }

    if (!text) {
        showCommentStatus('Please enter a comment', true);
        return;
    }

    if (!verseRef) {
        showCommentStatus('Error: No verse selected', true);
        return;
    }

    submitButton.disabled = true;
    commentInput.disabled = true;
    showCommentStatus('Submitting...', false);

    try {
        await submitComment(verseRef, text, userId, username);
        commentInput.value = '';
        showCommentStatus('Comment added!', false);

        await updateCommentCount(verseRef);

    } catch (error) {
        console.error('Error submitting comment:', error);
        showCommentStatus('Error submitting comment. Please try again.', true);
    } finally {
        submitButton.disabled = false;
        commentInput.disabled = false;
    }
}

async function loadCommentCounts(parshaRef) {
    if (!isAuthReady) {
        return;
    }
    const chavrutaId = getActiveChavrutaId();
    if (!chavrutaId) {
        return; // No chavruta — skip comment counts (read-only mode)
    }

    const { bookName, startChapter, startVerse, endChapter, endVerse } = parseParshaReference(parshaRef);

    // Query full book range (lexicographic safe) and filter to parsha client-side
    const startRef = `${bookName} `;
    const endRef = `${bookName}~`;

    try {
        const commentsQuery = query(
            collection(db, 'chavrutas', chavrutaId, 'comments'),
            where('verseRef', '>=', startRef),
            where('verseRef', '<=', endRef)
        );
        const querySnapshot = await getDocs(commentsQuery);
        const counts = {};
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const verseRef = data.verseRef;
            
            // Additional client-side filtering to ensure verse is in our exact range
            const match = verseRef.match(/^(\w+)\s+(\d+):(\d+)$/);
            if (match) {
                const [, book, chapter, verse] = match;
                const chapterNum = parseInt(chapter);
                const verseNum = parseInt(verse);
                
                // Check if this verse is within our parsha range
                if (book === bookName) {
                    let isInRange = false;
                    
                    if (!endChapter) {
                        // Single chapter parsha
                        isInRange = chapterNum === startChapter;
                    } else {
                        // Multi-chapter parsha
                        if (chapterNum > startChapter && chapterNum < endChapter) {
                            // Middle chapters - include all verses
                            isInRange = true;
                        } else if (chapterNum === startChapter && verseNum >= startVerse) {
                            // First chapter - only verses >= startVerse
                            isInRange = true;
                        } else if (chapterNum === endChapter && verseNum <= endVerse) {
                            // Last chapter - only verses <= endVerse
                            isInRange = true;
                        }
                    }
                    
                    if (isInRange) {
                        counts[verseRef] = (counts[verseRef] || 0) + 1;
                    }
                }
            }
        });
        
        verseCommentCounts = counts;
        
        // Use requestAnimationFrame for better DOM sync
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                updateAllCommentBadges();
            });
        });
        
    } catch (error) {
        console.error('❌ Error loading comment counts:', error);
        console.error('❌ Error details:', error.message);
        if (error.code) {
            console.error('❌ Error code:', error.code);
        }
    }
}

async function updateCommentCount(verseRef) {
    const chavrutaId = getActiveChavrutaId();
    if (!chavrutaId) return;
    try {
        const commentsQuery = query(
            collection(db, 'chavrutas', chavrutaId, 'comments'),
            where('verseRef', '==', verseRef)
        );

        const querySnapshot = await getDocs(commentsQuery);
        verseCommentCounts[verseRef] = querySnapshot.size;

        const verseContainer = document.querySelector(`[data-ref="${verseRef}"]`);
        if (verseContainer) {
            updateCommentBadge(verseContainer, verseRef);
        }

    } catch (error) {
        console.error('Error updating comment count:', error);
    }
}

// ========================================
// BOOKMARK COUNTING FUNCTIONS
// ========================================

async function loadBookmarkCounts(parshaRef) {
    if (!getActiveChavrutaId()) return;
    const { bookName } = parseParshaReference(parshaRef);

    try {
        const counts = await getBookmarkCountsForBook(bookName);

        // Remove stale counts for this book before merging
        Object.keys(verseBookmarkCounts).forEach((ref) => {
            if (ref.startsWith(`${bookName} `)) {
                delete verseBookmarkCounts[ref];
            }
        });

        Object.entries(counts).forEach(([ref, value]) => {
            verseBookmarkCounts[ref] = Math.max(0, value || 0);
        });

        applyBookmarkStateToVisibleVerses();
    } catch (error) {
        console.error('Error loading bookmark counts:', error);
    }
}

// ========================================
// REACTION FUNCTIONS
// ========================================

async function loadReactionCounts(parshaRef) {
    if (!isAuthReady || !getActiveChavrutaId()) {
        return;
    }

    const { bookName } = parseParshaReference(parshaRef);

    try {
        // Load all reaction counts for this book
        verseReactionCounts = await getReactionCountsForBook(bookName);

        // Load current user's reactions
        const userId = getCurrentUserId();
        if (userId) {
            const allVerseRefs = Object.keys(verseReactionCounts);

            // Process in batches of 30 (Firestore 'in' query limit)
            for (let i = 0; i < allVerseRefs.length; i += 30) {
                const batch = allVerseRefs.slice(i, i + 30);
                const batchUserReactions = await getUserReactions(userId, batch);
                userReactions = { ...userReactions, ...batchUserReactions };
            }
        }

        // Update all verse UI with reactions
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                updateAllReactionUI();
            });
        });

    } catch (error) {
        console.error('Error loading reaction counts:', error);
    }
}

async function handleReactionClick(verseRef, reactionType) {
    const userId = getCurrentUserId();

    if (!userId) {
        alert('Please wait, connecting...');
        return;
    }

    try {
        const result = await submitReaction(verseRef, reactionType, userId);

        // Update local state
        if (!verseReactionCounts[verseRef]) {
            verseReactionCounts[verseRef] = { emphasize: 0, heart: 0 };
        }

        if (!userReactions[verseRef]) {
            userReactions[verseRef] = [];
        }

        if (result.action === 'added') {
            verseReactionCounts[verseRef][reactionType]++;
            userReactions[verseRef].push(reactionType);
        } else {
            verseReactionCounts[verseRef][reactionType] = Math.max(0, verseReactionCounts[verseRef][reactionType] - 1);
            userReactions[verseRef] = userReactions[verseRef].filter(r => r !== reactionType);
        }

        // Invalidate tooltip cache for this interaction
        const cacheKey = `${verseRef}__${reactionType}`;
        verseInteractorsCache.delete(cacheKey);

        // Update UI for this verse
        const verseContainer = document.querySelector(`[data-ref="${verseRef}"]`);
        if (verseContainer) {
            updateVerseReactionUI(verseContainer, verseRef);
        }

    } catch (error) {
        console.error('Error submitting reaction:', error);
        alert('Error submitting reaction. Please try again.');
    }
}

function updateHeaderUserDropdown(user, userProfile) {
    const headerActions = document.getElementById('header-actions');
    if (!headerActions) return;

    let dropdownContainer = document.getElementById('header-user-dropdown-container');
    const oldLogoutBtn = document.getElementById('logout-btn');

    if (user) {
        if (!dropdownContainer) {
            // Remove the old logout button if it exists and hasn't been replaced
            if (oldLogoutBtn && oldLogoutBtn.parentElement === headerActions) {
                oldLogoutBtn.remove();
            }

            dropdownContainer = document.createElement('div');
            dropdownContainer.id = 'header-user-dropdown-container';
            dropdownContainer.className = 'relative flex items-center ml-2';
            
            // Get user's first name — prefer displayName (set in Settings)
            let firstName = 'Account';
            if (userProfile && userProfile.displayName && userProfile.displayName !== 'Friend') {
                firstName = userProfile.displayName.split(' ')[0];
            } else if (userProfile && userProfile.firstName) {
                firstName = userProfile.firstName;
            } else if (user.displayName) {
                firstName = user.displayName.split(' ')[0];
            }

            const initial = firstName.charAt(0).toUpperCase();
            const safeEmail = user.email || '';

            // Pill button stays inside the header
            dropdownContainer.innerHTML = `
                <button id="header-user-menu-btn"
                        class="header-user-pill"
                        title="Account Menu"
                        aria-haspopup="true"
                        aria-expanded="false">
                    <div class="header-user-avatar" aria-hidden="true">${initial}</div>
                    <span class="header-btn-text">${firstName}</span>
                    <svg class="header-user-chevron" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/>
                    </svg>
                </button>
            `;
            headerActions.appendChild(dropdownContainer);

            // Dropdown panel + backdrop live on document.body so NO parent overflow can clip them
            const backdrop = document.createElement('div');
            backdrop.id = 'header-dropdown-backdrop';
            backdrop.className = 'header-dropdown-backdrop';
            document.body.appendChild(backdrop);

            const dropdown = document.createElement('div');
            dropdown.id = 'header-user-dropdown';
            dropdown.className = 'header-dropdown';
            dropdown.setAttribute('role', 'menu');
            dropdown.setAttribute('aria-hidden', 'true');
            dropdown.innerHTML = `
                    <div class="header-dropdown-header">
                        <div class="header-dropdown-avatar-lg" aria-hidden="true">${initial}</div>
                        <div class="header-dropdown-user-info">
                            <p class="header-dropdown-display-name">${firstName}</p>
                            <p class="header-dropdown-email" title="${safeEmail}">${safeEmail}</p>
                        </div>
                    </div>
                    <div class="header-dropdown-section">
                        <a href="/about" class="header-dropdown-item" role="menuitem">
                            <svg class="header-dropdown-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            About
                        </a>
                        <a href="/bookmarks" id="my-bookmarks-btn" class="header-dropdown-item" role="menuitem">
                            <svg class="header-dropdown-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
                            </svg>
                            Bookmarks
                        </a>
                        <a href="/settings" class="header-dropdown-item" role="menuitem">
                            <svg class="header-dropdown-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                            </svg>
                            Account Settings
                        </a>
                    </div>
                    <div class="header-dropdown-section">
                        <button id="dropdown-logout-btn" class="header-dropdown-item header-dropdown-item--danger" role="menuitem">
                            <svg class="header-dropdown-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                            </svg>
                            Sign Out
                        </button>
                    </div>
            `;
            document.body.appendChild(dropdown);

            // Bind events
            const menuBtn = dropdownContainer.querySelector('#header-user-menu-btn');
            const newLogoutBtn = dropdown.querySelector('#dropdown-logout-btn');

            function positionDropdown() {
                const rect = menuBtn.getBoundingClientRect();
                dropdown.style.top = (rect.bottom + 8) + 'px';
                dropdown.style.right = Math.max(8, window.innerWidth - rect.right) + 'px';
            }

            function openDrop() {
                positionDropdown();
                dropdown.classList.add('open');
                backdrop.classList.add('open');
                menuBtn.setAttribute('aria-expanded', 'true');
                dropdown.setAttribute('aria-hidden', 'false');
            }
            function closeDrop() {
                dropdown.classList.remove('open');
                backdrop.classList.remove('open');
                menuBtn.setAttribute('aria-expanded', 'false');
                dropdown.setAttribute('aria-hidden', 'true');
            }

            menuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.classList.contains('open') ? closeDrop() : openDrop();
            });

            backdrop.addEventListener('click', closeDrop);

            document.addEventListener('click', (e) => {
                if (!dropdownContainer.contains(e.target) && !dropdown.contains(e.target)) closeDrop();
            });

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') closeDrop();
            });

            newLogoutBtn.addEventListener('click', async () => {
                try {
                    if (typeof signOutUser === 'function') {
                        await signOutUser();
                        closeCommentsPanel(stopListeningForComments);
                        hideInfoPanel();
                        sessionStorage.removeItem('activeChavrutaId');
                        window.location.href = '/';
                    }
                } catch (error) {
                    console.error('Sign-out error:', error);
                }
            });
        }
    } else {
        if (dropdownContainer) {
            dropdownContainer.remove();
        }
    }
}

async function handleAuthStateChange(user) {
    updateCommentInputState(Boolean(user));

    if (user) {
        const didRedirectForSingleRoom = await enforceStudyRoomSelection(user);
        if (didRedirectForSingleRoom) {
            return;
        }

        // Set the user's email so display name can be extracted from it
        setCurrentUserEmail(user.email);
        updateUsernameDisplay();
        await refreshBookmarkedVerses();
        await refreshBookmarkedQuotes();

        let userProfile = null;

        // Record user login activity
        try {
            await recordUserLogin(user.uid, user.email);
        } catch (error) {
            console.error('Error recording login:', error);
        }

        // Fetch the latest user profile (captures Firestore timestamps)
        try {
            userProfile = await getUserInfo(user.uid);
        } catch (error) {
            console.error('Error loading user profile:', error);
        }

        currentUserProfile = userProfile;

        // Upgrade the header with a user profile dropdown
        updateHeaderUserDropdown(user, userProfile);

        // Reflect latest login status in UI
        updateCurrentUserStatusDisplay(userProfile, user.email);

        // Set up presence tracking
        startPresenceTracking(user.uid);

        // Re-fetch shortly after login so server timestamps resolve
        setTimeout(() => {
            refreshCurrentUserProfile();
        }, 2000);

        if (currentMitzvahChallengeId) {
            await refreshMitzvahCompletionStatus(currentMitzvahChallengeId);
        }
        updateMitzvahAuthState();
        if (currentMitzvahChallengeId) {
            startMitzvahReflectionsListener(currentMitzvahChallengeId);
        }
        refreshMitzvahLeaderboardDisplay();
        maybeShowMitzvahModal();

    } else {
        setCurrentUserEmail(null);
        updateUsernameDisplay();
        bookmarkedVerses.clear();
        clearBookmarkUIState();
        clearQuoteBookmarkUIState();
        currentUserProfile = null;

        // Mark user as offline
        if (lastUserId) {
            try {
                await markUserOffline(lastUserId);
            } catch (error) {
                console.error('Error marking offline:', error);
            }
        }

        // Stop presence tracking
        stopPresenceTracking();

        currentMitzvahCompletion = false;
        updateMitzvahAuthState();
        hideMitzvahModal(false);
        startMitzvahReflectionsListener(null);
    }
}

async function refreshBookmarkedVerses(options = {}) {
    const userId = getCurrentUserId();

    if (!userId) {
        bookmarkedVerses.clear();
        clearBookmarkUIState();
        return options.returnList ? [] : undefined;
    }

    try {
        const bookmarks = await getUserBookmarks(userId);
        bookmarkedVerses = new Set(bookmarks.map((bookmark) => bookmark.verseRef));

        bookmarks.forEach((bookmark) => {
            if (bookmark.verseText && (!verseDisplayTexts[bookmark.verseRef] || !verseDisplayTexts[bookmark.verseRef].english)) {
                verseDisplayTexts[bookmark.verseRef] = {
                    english: bookmark.verseText
                };
            }
        });

        if (bookmarks.length > 0) {
            const uniqueRefs = Array.from(new Set(bookmarks.map((bookmark) => bookmark.verseRef)));
            const bookmarkCounts = await getBookmarkCountsForVerses(uniqueRefs);
            Object.entries(bookmarkCounts).forEach(([ref, value]) => {
                verseBookmarkCounts[ref] = Math.max(0, value || 0);
            });
        }

        applyBookmarkStateToVisibleVerses();
        return options.returnList ? bookmarks : undefined;
    } catch (error) {
        console.error('Error refreshing bookmarks:', error);
        if (options.returnList) {
            throw error;
        }
        return undefined;
    }
}

async function refreshBookmarkedQuotes(options = {}) {
    const userId = getCurrentUserId();

    if (!userId) {
        bookmarkedQuoteIds.clear();
        cachedQuoteBookmarks = [];
        updateDailyQuoteBookmarkButtonState();
        return options.returnList ? [] : undefined;
    }

    try {
        const quoteBookmarks = await getUserDailyQuoteBookmarks(userId);
        cachedQuoteBookmarks = quoteBookmarks;
        bookmarkedQuoteIds = new Set(
            quoteBookmarks
                .map((bookmark) => bookmark.quoteId)
                .filter((value) => value !== undefined && value !== null)
                .map((value) => String(value))
        );
        updateDailyQuoteBookmarkButtonState();
        return options.returnList ? quoteBookmarks : undefined;
    } catch (error) {
        console.error('Error refreshing quote bookmarks:', error);
        if (options.returnList) {
            throw error;
        }
        return undefined;
    }
}

function applyBookmarkStateToVisibleVerses() {
    const buttons = document.querySelectorAll('.bookmark-btn');
    buttons.forEach((btn) => {
        const verseRef = btn.getAttribute('data-verse-ref');
        const isActive = verseRef && bookmarkedVerses.has(verseRef);
        const baseCount = verseRef ? (verseBookmarkCounts[verseRef] || 0) : 0;
        const displayCount = Math.max(baseCount, isActive ? 1 : 0);
        btn.classList.toggle('active', Boolean(isActive));
        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        const countSpan = btn.querySelector('.bookmark-count');
        if (countSpan) {
            countSpan.textContent = displayCount > 0 ? displayCount : '';
            countSpan.style.display = displayCount > 0 ? 'inline-flex' : 'none';
        }
        if (verseRef) {
            const countText = displayCount > 0
                ? `${displayCount} ${displayCount === 1 ? 'person has' : 'people have'} bookmarked this verse`
                : 'No bookmarks yet';

            // Only set title on mobile - desktop uses custom tooltip
            if (!isDesktopHoverTooltipEnabled()) {
                btn.setAttribute(
                    'title',
                    isActive ? `Remove bookmark • ${countText}` : `Bookmark this verse • ${countText}`
                );
            } else {
                // Remove title on desktop to prevent interference with custom tooltip
                btn.removeAttribute('title');
            }

            btn.setAttribute(
                'aria-label',
                `${isActive ? 'Remove your bookmark.' : 'Bookmark this verse.'} ${countText}.`
            );
        }
    });
}

function clearBookmarkUIState() {
    applyBookmarkStateToVisibleVerses();
}

function clearQuoteBookmarkUIState() {
    bookmarkedQuoteIds.clear();
    cachedQuoteBookmarks = [];
    updateDailyQuoteBookmarkButtonState();
}

async function handleBookmarkClick(verseRef, bookmarkBtn) {
    const userId = getCurrentUserId();

    if (!userId) {
        alert('Please sign in to bookmark verses');
        return;
    }

    try {
        const isBookmarked = bookmarkedVerses.has(verseRef)
            ? true
            : await isVerseBookmarked(userId, verseRef);

        if (isBookmarked) {
            // Remove bookmark
            await removeBookmark(userId, verseRef);
            bookmarkBtn.classList.remove('active');
            bookmarkBtn.setAttribute('aria-pressed', 'false');
            bookmarkedVerses.delete(verseRef);
            if (verseBookmarkCounts[verseRef]) {
                verseBookmarkCounts[verseRef] = Math.max(0, verseBookmarkCounts[verseRef] - 1);
            }
        } else {
            // Add bookmark
            const verseText = getVerseTextSnippet(verseRef);
            await addBookmark(userId, verseRef, { verseText });
            bookmarkBtn.classList.add('active');
            bookmarkBtn.setAttribute('aria-pressed', 'true');
            bookmarkedVerses.add(verseRef);
            verseBookmarkCounts[verseRef] = (verseBookmarkCounts[verseRef] || 0) + 1;
        }

        // Invalidate tooltip cache for bookmark interaction
        const cacheKey = `${verseRef}__bookmark`;
        verseInteractorsCache.delete(cacheKey);

        // Ensure all instances stay in sync (e.g., if verse appears twice)
        applyBookmarkStateToVisibleVerses();

    } catch (error) {
        console.error('Error toggling bookmark:', error);
        alert('Error saving bookmark. Please try again.');
    }
}

async function handleDailyQuoteBookmarkToggle(quotePayload) {
    const userId = getCurrentUserId();

    if (!userId) {
        alert('Please sign in to bookmark quotes');
        return;
    }

    const quoteId = quotePayload && (quotePayload.quoteId ?? quotePayload.id);
    if (quoteId == null) {
        showError('Unable to save this quote right now.');
        return;
    }

    const normalizedQuote = {
        hebrew: quotePayload.hebrew || '',
        translation: quotePayload.translation || '',
        source: quotePayload.source || '',
        reflection: quotePayload.reflection || '',
        displayDate: quotePayload.displayDate || null,
        id: String(quoteId),
        quoteId: String(quoteId)
    };

    try {
        const isBookmarked = bookmarkedQuoteIds.has(String(quoteId))
            ? true
            : await isDailyQuoteBookmarked(userId, String(quoteId));

        if (isBookmarked) {
            await removeDailyQuoteBookmark(userId, String(quoteId));
            bookmarkedQuoteIds.delete(String(quoteId));
            currentQuoteBookmarkCount = Math.max(0, currentQuoteBookmarkCount - 1);
        } else {
            await addDailyQuoteBookmark(userId, String(quoteId), normalizedQuote);
            bookmarkedQuoteIds.add(String(quoteId));
            currentQuoteBookmarkCount++;
        }

        applyDailyQuoteCommunityTint(currentQuoteBookmarkCount);
        updateDailyQuoteBookmarkButtonState();
        invalidateDailyQuoteTooltipCache();
        setupDailyQuoteBookmarkTooltip(String(quoteId));
        await refreshBookmarkedQuotes();
    } catch (error) {
        console.error('Error toggling quote bookmark:', error);
        alert('Error saving quote. Please try again.');
    }
}

function updateAllReactionUI() {
    const containers = document.querySelectorAll('.verse-container');

    containers.forEach(container => {
        const verseRef = container.dataset.ref;
        if (verseRef) {
            updateVerseReactionUI(container, verseRef);
        }
    });
}

function updateVerseReactionUI(container, verseRef) {
    if (!container) return;

    const counts = verseReactionCounts[verseRef] || { emphasize: 0, heart: 0 };
    const userReacted = userReactions[verseRef] || [];

    // Update data attributes for CSS styling
    container.setAttribute('data-emphasize', counts.emphasize);
    container.setAttribute('data-heart', counts.heart);

    // Update button states and counts
    const emphasizeBtn = container.querySelector('.emphasize-btn');
    const heartBtn = container.querySelector('.heart-btn');

    if (emphasizeBtn) {
        const countSpan = emphasizeBtn.querySelector('.reaction-count');
        if (countSpan) {
            countSpan.textContent = counts.emphasize || '';
        }

        if (userReacted.includes('emphasize')) {
            emphasizeBtn.classList.add('active');
        } else {
            emphasizeBtn.classList.remove('active');
        }
    }

    if (heartBtn) {
        const countSpan = heartBtn.querySelector('.reaction-count');
        if (countSpan) {
            countSpan.textContent = counts.heart || '';
        }

        if (userReacted.includes('heart')) {
            heartBtn.classList.add('active');
        } else {
            heartBtn.classList.remove('active');
        }
    }
}

function updateCommentBadge(container, verseRef) {
    if (!container) {
        return;
    }
    
    const indicatorsSection = container.querySelector('.verse-indicators');
    if (!indicatorsSection) {
        return;
    }
    
    const count = verseCommentCounts[verseRef] || 0;
    let badge = indicatorsSection.querySelector('.comment-count-badge');
    
    if (!badge) {
        badge = document.createElement('div');
        badge.className = 'comment-count-badge';
        badge.dataset.verseRef = verseRef;
        indicatorsSection.appendChild(badge);
    }
    
    if (count > 0) {
        badge.textContent = `${count} ${count === 1 ? 'comment' : 'comments'}`;
        badge.style.display = 'inline-flex';
        badge.style.visibility = 'visible';
        badge.style.opacity = '1';
    } else {
        badge.style.display = 'none';
    }
}

function updateAllCommentBadges() {
    const containers = document.querySelectorAll('.verse-container');
    
    let visibleCount = 0;
    containers.forEach(container => {
        const verseRef = container.dataset.ref;
        if (verseRef) {
            updateCommentBadge(container, verseRef);
            if (verseCommentCounts[verseRef] > 0) {
                visibleCount++;
            }
        }
    });
}

// ========================================
// TOOLTIP FUNCTIONS FOR VERSE INTERACTIONS
// ========================================

function isDesktopHoverTooltipEnabled() {
    return window.matchMedia('(hover: hover) and (pointer: fine)').matches
        && window.matchMedia('(min-width: 768px)').matches;
}

function attachInteractionTooltips(container, verseRef) {
    if (!container || !verseRef) return;

    // Only attach on desktop - check if hover is supported
    if (!isDesktopHoverTooltipEnabled()) return;

    const emphasizeBtn = container.querySelector('.emphasize-btn');
    const heartBtn = container.querySelector('.heart-btn');
    const bookmarkBtn = container.querySelector('.bookmark-btn');

    if (emphasizeBtn) {
        setupTooltipBehavior(emphasizeBtn, verseRef, 'emphasize');
    }

    if (heartBtn) {
        setupTooltipBehavior(heartBtn, verseRef, 'heart');
    }

    if (bookmarkBtn) {
        setupTooltipBehavior(bookmarkBtn, verseRef, 'bookmark');
    }
}

function setupTooltipBehavior(button, verseRef, interactionType) {
    let hoverTimeout = null;

    // Remove native title attribute to prevent interference with custom tooltip
    button.removeAttribute('title');

    // Use mouseenter instead of mouseover to avoid bubbling issues
    button.addEventListener('mouseenter', () => {
        if (!isDesktopHoverTooltipEnabled()) {
            return;
        }

        // Check button position and adjust tooltip alignment to prevent cutoff
        const rect = button.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const buttonCenter = rect.left + (rect.width / 2);

        // Remove any existing alignment classes
        button.classList.remove('tooltip-align-left', 'tooltip-align-right');

        // If button is in the left 30% of viewport, align tooltip to the left
        if (buttonCenter < viewportWidth * 0.3) {
            button.classList.add('tooltip-align-left');
        }
        // If button is in the right 30% of viewport, align tooltip to the right
        else if (buttonCenter > viewportWidth * 0.7) {
            button.classList.add('tooltip-align-right');
        }

        // Clear any existing timeout
        if (hoverTimeout) {
            clearTimeout(hoverTimeout);
        }

        // Debounce: only fetch after 300ms of hover
        hoverTimeout = setTimeout(() => {
            loadAndShowInteractorTooltip(button, verseRef, interactionType);
            hoverTimeout = null;
        }, 300);
    });

    button.addEventListener('mouseleave', () => {
        // Cancel pending fetch if user moves away quickly
        if (hoverTimeout) {
            clearTimeout(hoverTimeout);
            hoverTimeout = null;
        }
        // Note: We don't remove the tooltip here - CSS :hover handles visibility
        // The data-tooltip attribute stays on the button for instant display on next hover
    });
}

async function loadAndShowInteractorTooltip(button, verseRef, interactionType) {
    if (!button || !verseRef) return;

    // Check cache first
    const cacheKey = `${verseRef}__${interactionType}`;
    const cached = verseInteractorsCache.get(cacheKey);
    const now = Date.now();

    if (cached && (now - cached.fetchedAt < INTERACTORS_CACHE_TTL)) {
        // Use cached data - instant display
        applyTooltipToButton(button, cached.users, interactionType);
        return;
    }

    // Prevent duplicate fetches
    if (activeTooltipFetch === cacheKey) {
        return;
    }

    // Don't show loading state immediately to avoid flicker
    // Only show if button is still hovered after a brief delay
    let loadingShown = false;
    const loadingTimeout = setTimeout(() => {
        if (button.matches(':hover')) {
            button.classList.add('status-tooltip');
            button.setAttribute('data-tooltip', 'Loading...');
            loadingShown = true;
        }
    }, 100);

    try {
        activeTooltipFetch = cacheKey;

        const interactors = await getVerseInteractors(verseRef, interactionType);

        // Clear loading timeout
        clearTimeout(loadingTimeout);

        // Cache the result
        verseInteractorsCache.set(cacheKey, {
            users: interactors,
            fetchedAt: now
        });

        // Only apply tooltip if button is still being hovered
        if (button.matches(':hover')) {
            applyTooltipToButton(button, interactors, interactionType);
        }

    } catch (error) {
        clearTimeout(loadingTimeout);
        console.error('Error loading interactors:', error);
        if (button.matches(':hover')) {
            button.setAttribute('data-tooltip', 'Error loading data');
        }
    } finally {
        activeTooltipFetch = null;
    }
}

function applyTooltipToButton(button, interactors, interactionType) {
    if (!button) return;

    button.classList.add('status-tooltip');

    // Handle empty state
    if (!interactors || interactors.length === 0) {
        button.removeAttribute('data-tooltip');
        button.classList.remove('status-tooltip');
        return;
    }

    // Build tooltip content
    const tooltipHTML = buildInteractorsTooltipContent(interactors, interactionType);
    button.setAttribute('data-tooltip', tooltipHTML);
}

function buildInteractorsTooltipContent(interactors, interactionType) {
    if (!interactors || interactors.length === 0) {
        return '';
    }

    // Get verb for interaction type
    const verbs = {
        'emphasize': 'exclaimed',
        'heart': 'liked',
        'bookmark': 'bookmarked'
    };
    const verb = verbs[interactionType] || 'interacted with';

    // Build list of users with timestamps
    const lines = interactors.slice(0, 10).map(({ user, timestamp }) => {
        const displayName = resolveDisplayName(user);
        const timeAgo = formatRelativeTime(timestamp);
        return `${displayName} • ${timeAgo}`;
    });

    // Handle "and X more" case
    const remaining = interactors.length - 10;
    if (remaining > 0) {
        lines.push(`and ${remaining} more...`);
    }

    // Join with line breaks
    const usersList = lines.join('\n');

    // Add header if multiple users
    if (interactors.length === 1) {
        return usersList;
    } else {
        return `${interactors.length} ${verb} this:\n${usersList}`;
    }
}

async function loadParsha(parshaRef) {
    if (parshaRef && state.currentParshaRef !== parshaRef) {
        setState({ currentParshaRef: parshaRef });
    }

    // Clear tooltip cache when loading new content
    verseInteractorsCache.clear();

    showLoading();
    hideError();

    try {
        console.log('Fetching parsha text for:', parshaRef);
        const data = await fetchParshaText(parshaRef);
        console.log('Parsha text received');

        console.log('Rendering parsha...');
        renderParsha(data, parshaRef);
        console.log('Parsha rendered');

        highlightCurrentParsha(parshaRef);

        console.log('Loading counts (comments, reactions, bookmarks)...');
        // Load social data — failures should not block verse display
        try {
            await Promise.all([
                loadCommentCounts(parshaRef),
                loadReactionCounts(parshaRef),
                loadBookmarkCounts(parshaRef)
            ]);
            console.log('✅ Counts loaded');
        } catch (countError) {
            console.warn('Social counts unavailable (read-only mode):', countError.message);
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });

        console.log('✅ Parsha fully loaded');

    } catch (error) {
        console.error('❌ Error loading parsha:', error, error.stack);
        showError('Failed to load the Torah text. Please try again later.');
    } finally {
        hideLoading();
    }
}

function parseParshaReference(parshaRef) {
    const match = parshaRef.match(/^(\w+)\s+(\d+):(\d+)(?:-(\d+):(\d+))?$/);

    if (!match) {
        const simpleMatch = parshaRef.match(/^(\w+)\s+(\d+):(\d+)$/);
        if (simpleMatch) {
            return {
                bookName: simpleMatch[1],
                startChapter: parseInt(simpleMatch[2]),
                startVerse: parseInt(simpleMatch[3]),
                endChapter: null,
                endVerse: null
            };
        }
        return { bookName: 'Torah', startChapter: 1, startVerse: 1, endChapter: null, endVerse: null };
    }
    
    return {
        bookName: match[1],
        startChapter: parseInt(match[2]),
        startVerse: parseInt(match[3]),
        endChapter: match[4] ? parseInt(match[4]) : null,
        endVerse: match[5] ? parseInt(match[5]) : null
    };
}

function refreshSignificanceButtons() {
    const ref = state.currentParshaRef;
    if (!ref || !state.commentaryData || !Array.isArray(state.commentaryData.parshas)) return;
    const activeParsha = (state.allParshas || []).find(p => p.reference === ref);
    if (!activeParsha) return;
    const parshaEntry = state.commentaryData.parshas.find(p => p.name === activeParsha.name);
    const significanceText = parshaEntry?.significance || null;
    setState({ currentParshaSignificance: significanceText, currentParshaSignificanceName: activeParsha.name });
    [document.getElementById('show-significance'), document.getElementById('show-significance-mobile')].forEach(btn => {
        if (!btn) return;
        const enabled = Boolean(significanceText);
        btn.disabled = !enabled;
        btn.classList.toggle('opacity-40', !enabled);
        btn.classList.toggle('cursor-not-allowed', !enabled);
        btn.classList.toggle('pointer-events-none', !enabled);
    });
}

function openParshaSignificanceModal() {
    const significance = state.currentParshaSignificance;
    if (!significance) return;

    const parshaName = state.currentParshaSignificanceName || state.allParshas[state.currentParshaIndex]?.name || 'Torah Portion';
    const infoContent = document.getElementById('info-content');
    infoContent.innerHTML = `
        <div class="text-xl font-bold mb-3 text-blue-900">${escapeHtml(parshaName)} — Significance</div>
        <div class="text-gray-800 leading-relaxed">${formatText(significance)}</div>
    `;
    showInfoPanel();
}

function renderParsha(data, parshaRef) {
    const textContainer = document.getElementById('parsha-text');
    
    updateParshaHeader(data.book || 'Torah Portion', parshaRef);
    textContainer.innerHTML = '';

    let significanceText = null;
    let significanceParshaName = null;
    let activeParsha = null;
    try {
        activeParsha = state.allParshas.find(p => p.reference === parshaRef);
        if (activeParsha && state.commentaryData && Array.isArray(state.commentaryData.parshas)) {
            const parshaEntry = state.commentaryData.parshas.find(p => p.name === activeParsha.name);
            if (parshaEntry && parshaEntry.significance) {
                significanceText = parshaEntry.significance;
                significanceParshaName = activeParsha.name;
                // Significance will only display in modal when button is clicked
            }
        }
    } catch (e) {
        console.warn('Unable to render significance for parsha:', e);
    }

    setState({
        currentParshaSignificance: significanceText,
        currentParshaSignificanceName: significanceParshaName
    });

    // Update both desktop and mobile significance buttons
    const significanceButton = document.getElementById('show-significance');
    if (significanceButton) {
        const enabled = Boolean(significanceText);
        significanceButton.disabled = !enabled;
        significanceButton.classList.toggle('opacity-40', !enabled);
        significanceButton.classList.toggle('cursor-not-allowed', !enabled);
        significanceButton.classList.toggle('pointer-events-none', !enabled);
    }

    const significanceButtonMobile = document.getElementById('show-significance-mobile');
    if (significanceButtonMobile) {
        const enabled = Boolean(significanceText);
        significanceButtonMobile.disabled = !enabled;
        significanceButtonMobile.classList.toggle('opacity-40', !enabled);
        significanceButtonMobile.classList.toggle('cursor-not-allowed', !enabled);
        significanceButtonMobile.classList.toggle('pointer-events-none', !enabled);
    }

    updateMitzvahChallengeForParsha(activeParsha?.name || null);
    
    const englishText = Array.isArray(data.text) ? data.text : [data.text];
    const hebrewText = Array.isArray(data.he) ? data.he : [data.he];
    
    const { bookName, startChapter, startVerse, endChapter, endVerse } = parseParshaReference(parshaRef);
    
    if (Array.isArray(englishText[0])) {
        let currentChapterNumber = startChapter;
        let isFirstChapter = true;
        
        englishText.forEach((chapterVerses, chapterIndex) => {
            if (!Array.isArray(chapterVerses)) {
                chapterVerses = [chapterVerses];
            }
            
            const hebrewChapterVerses = Array.isArray(hebrewText[chapterIndex]) ? 
                hebrewText[chapterIndex] : [hebrewText[chapterIndex] || ''];
            
            const isStartChapter = currentChapterNumber === startChapter;
            const isEndChapter = endChapter ? currentChapterNumber === endChapter : false;
            const chapterStartVerse = isStartChapter ? startVerse : 1;
            const chapterEndVerse = isEndChapter ? endVerse : null;
            
            if (!isFirstChapter) {
                const chapterHeader = document.createElement('div');
                chapterHeader.className = 'chapter-header';
                chapterHeader.textContent = `${bookName} Chapter ${currentChapterNumber}`;
                textContainer.appendChild(chapterHeader);
            }
            isFirstChapter = false;
            
            for (let localIndex = 0; localIndex < chapterVerses.length; localIndex++) {
                const verseText = chapterVerses[localIndex];
                if (!verseText || verseText.trim() === '') continue;
                
                const verseNumber = chapterStartVerse + localIndex;
                
                if (chapterEndVerse && verseNumber > chapterEndVerse) {
                    break;
                }
                
                const hebrewVerseText = hebrewChapterVerses[localIndex] || '';
                const verseRef = `${bookName} ${currentChapterNumber}:${verseNumber}`;
                
                const verseElement = createVerseElement(verseText, hebrewVerseText, verseRef, verseNumber);
                textContainer.appendChild(verseElement);
            }
            
            currentChapterNumber++;
        });
    } else {
        const flatEnglish = flattenTextArray(englishText);
        const flatHebrew = flattenTextArray(hebrewText);
        
        flatEnglish.forEach((verseText, index) => {
            if (!verseText || verseText.trim() === '') return;
            
            const hebrewVerseText = flatHebrew[index] || '';
            const verseNumber = startVerse + index;
            const verseRef = `${bookName} ${startChapter}:${verseNumber}`;
            
            const verseElement = createVerseElement(verseText, hebrewVerseText, verseRef, verseNumber);
            textContainer.appendChild(verseElement);
        });
    }

    applyBookmarkStateToVisibleVerses();
}

function createVerseElement(englishText, hebrewText, verseRef, verseNumber) {
    const container = document.createElement('div');
    container.className = 'verse-container';
    container.dataset.ref = verseRef;
    
    const hasCommentary = checkForCommentary(verseRef);
    const hasKeywords = checkForKeywords(verseRef);
    const isImportant = isImportantVerse(verseRef);

    if (hasCommentary || hasKeywords || isImportant) {
        container.classList.add('has-content');
        if (hasCommentary) container.classList.add('has-commentary');
        if (hasKeywords) container.classList.add('has-keywords');
        if (isImportant) container.classList.add('has-important');
    }
    
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'verse-content-wrapper';
    
    const verseNumSpan = document.createElement('div');
    verseNumSpan.className = 'verse-number';
    verseNumSpan.textContent = verseNumber;
    contentWrapper.appendChild(verseNumSpan);
    
    const textContainer = document.createElement('div');
    textContainer.className = 'verse-text-container';
    
    const hebrewDiv = document.createElement('div');
    hebrewDiv.className = 'hebrew-text';
    hebrewDiv.setAttribute('lang', 'he');
    hebrewDiv.setAttribute('dir', 'rtl');
    hebrewDiv.innerHTML = hebrewText;

    const englishDiv = document.createElement('div');
    englishDiv.className = 'english-text';
    const cleanedEnglish = cleanSefariaAnnotationsFromText(englishText);
    const processedEnglish = processKeywords(cleanedEnglish, verseRef);
    englishDiv.innerHTML = processedEnglish;
    verseDisplayTexts[verseRef] = {
        english: cleanedEnglish.trim()
    };

    textContainer.appendChild(hebrewDiv);
    textContainer.appendChild(englishDiv);

    contentWrapper.appendChild(textContainer);
    
    container.appendChild(contentWrapper);
    
    const indicatorsSection = document.createElement('div');
    indicatorsSection.className = 'verse-indicators';
    
    if (hasCommentary) {
        const commentaryIndicator = document.createElement('div');
        commentaryIndicator.className = 'content-indicator commentary-indicator';
        commentaryIndicator.textContent = 'Commentary Available';
        commentaryIndicator.title = 'Click to view commentary';
        indicatorsSection.appendChild(commentaryIndicator);
    }
    
    if (hasKeywords) {
        const keywordIndicator = document.createElement('div');
        keywordIndicator.className = 'content-indicator keyword-indicator';
        keywordIndicator.textContent = 'Definitions Available';
        keywordIndicator.title = 'Click highlighted words for definitions';
        indicatorsSection.appendChild(keywordIndicator);
    }
    
    // Create badge element (will be updated by loadCommentCounts)
    const commentBadge = document.createElement('div');
    commentBadge.className = 'comment-count-badge';
    commentBadge.style.display = 'none';
    commentBadge.dataset.verseRef = verseRef;
    indicatorsSection.appendChild(commentBadge);

    container.appendChild(indicatorsSection);

    // Add reaction buttons section
    const reactionsSection = document.createElement('div');
    reactionsSection.className = 'verse-reactions';

    // Emphasize button
    const emphasizeBtn = document.createElement('button');
    emphasizeBtn.className = 'reaction-btn emphasize-btn';
    emphasizeBtn.setAttribute('aria-label', 'Emphasize this verse');
    emphasizeBtn.innerHTML = `
        <span class="reaction-icon emphasize-icon"></span>
        <span class="reaction-count"></span>
    `;
    emphasizeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleReactionClick(verseRef, 'emphasize');
    });

    // Heart button
    const heartBtn = document.createElement('button');
    heartBtn.className = 'reaction-btn heart-btn';
    heartBtn.setAttribute('aria-label', 'Heart this verse');
    heartBtn.innerHTML = `
        <span class="reaction-icon heart-icon"></span>
        <span class="reaction-count"></span>
    `;
    heartBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleReactionClick(verseRef, 'heart');
    });

    // Bookmark button
    const bookmarkBtn = document.createElement('button');
    bookmarkBtn.type = 'button';
    bookmarkBtn.className = 'reaction-btn bookmark-btn';
    bookmarkBtn.setAttribute('aria-label', 'Bookmark this verse');
    bookmarkBtn.setAttribute('data-verse-ref', verseRef);
    bookmarkBtn.setAttribute('aria-pressed', 'false');
    bookmarkBtn.setAttribute('title', 'Bookmark this verse');
    bookmarkBtn.innerHTML = `
        <svg class="bookmark-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" fill="currentColor"></path>
        </svg>
        <span class="bookmark-count"></span>
    `;
    bookmarkBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleBookmarkClick(verseRef, bookmarkBtn);
    });

    reactionsSection.appendChild(emphasizeBtn);
    reactionsSection.appendChild(heartBtn);
    reactionsSection.appendChild(bookmarkBtn);
    container.appendChild(reactionsSection);

    // Add purple asterisk for extremely important verses (bottom right of container)
    if (isImportantVerse(verseRef)) {
        const asterisk = document.createElement('div');
        asterisk.className = 'important-verse-asterisk';
        asterisk.innerHTML = '*';
        asterisk.setAttribute('title', 'Click to see why this verse is extremely important');
        asterisk.setAttribute('data-verse-ref', verseRef);
        asterisk.addEventListener('click', (e) => {
            e.stopPropagation();
            const verseData = getImportantVerseData(verseRef);
            if (verseData) {
                showVerseSignificance(verseRef, verseData.explanation);
            }
        });
        container.appendChild(asterisk);
    }

    // Store bookmark button reference for later updates
    container.dataset.bookmarkBtn = true;

    // Attach hover tooltips to reaction buttons (desktop only)
    attachInteractionTooltips(container, verseRef);

    return container;
}

function cleanSefariaAnnotationsFromText(text) {
    if (!text || typeof text !== 'string') return text;
    
    let cleaned = text;
    
    const temp = document.createElement('textarea');
    temp.innerHTML = cleaned;
    cleaned = temp.value;
    
    cleaned = cleaned.replace(/<[^>]+>/g, '');
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    return cleaned;
}

function checkForKeywords(verseRef) {
    if (!state.commentaryData || !state.commentaryData.parshas) return false;
    
    for (const parsha of state.commentaryData.parshas) {
        if (parsha.verses) {
            const verse = parsha.verses.find(v => v.ref === verseRef);
            if (verse && verse.keywords && verse.keywords.length > 0) {
                return true;
            }
        }
    }
    return false;
}

function flattenTextArray(arr) {
    const result = [];
    arr.forEach(item => {
        if (Array.isArray(item)) {
            result.push(...item);
        } else {
            result.push(item);
        }
    });
    return result;
}

function checkForCommentary(verseRef) {
    if (!state.commentaryData || !state.commentaryData.parshas) return false;
    
    for (const parsha of state.commentaryData.parshas) {
        if (parsha.verses) {
            const verse = parsha.verses.find(v => v.ref === verseRef);
            if (verse && verse.commentary && verse.commentary.length > 0) {
                return true;
            }
        }
    }
    return false;
}

function processKeywords(text, verseRef) {
    if (!state.commentaryData || !state.commentaryData.parshas) return text;
    
    let keywords = [];
    for (const parsha of state.commentaryData.parshas) {
        if (parsha.verses) {
            const verse = parsha.verses.find(v => v.ref === verseRef);
            if (verse && verse.keywords) {
                keywords = verse.keywords;
                break;
            }
        }
    }
    
    if (keywords.length === 0) return text;
    
    let processedText = text;
    keywords.forEach(keyword => {
        const regex = new RegExp(`\\b(${escapeRegex(keyword.word)})\\b`, 'gi');
        processedText = processedText.replace(regex, 
            `<span class="keyword" data-definition="${escapeHtml(keyword.definition)}">$1</span>`
        );
    });
    
    return processedText;
}

function handleTextClick(e) {
    if (e.target.classList.contains('keyword')) {
        e.stopPropagation();
        e.preventDefault();
        const definition = e.target.dataset.definition;
        const word = e.target.textContent;
        showKeywordDefinition(word, definition);
        return;
    }
    
    if (e.target.closest('.keyword-indicator')) {
        e.stopPropagation();
        const verseContainer = e.target.closest('.verse-container');
        if (verseContainer) {
            const verseRef = verseContainer.dataset.ref;
            const keywords = getKeywordsForVerse(verseRef);
            showAllDefinitions(verseRef, keywords);
        }
        return;
    }
    
    if (e.target.closest('.commentary-indicator')) {
        e.stopPropagation();
        const verseContainer = e.target.closest('.verse-container');
        if (verseContainer) {
            const verseRef = verseContainer.dataset.ref;
            const commentaries = getCommentariesForVerse(verseRef);
            showCommentary(verseRef, commentaries);
        }
        return;
    }
    
    if (e.target.closest('.comment-count-badge')) {
        e.stopPropagation();
        const verseContainer = e.target.closest('.verse-container');
        if (verseContainer) {
            const verseRef = verseContainer.dataset.ref;
            openCommentsPanel(verseRef, (ref) => {
                listenForComments(ref, displayComments);
            });
        }
        return;
    }

    if (e.target.classList.contains('verse-indicators')) {
        return;
    }

    const verseContainer = e.target.closest('.verse-container');
    if (verseContainer && !e.target.closest('.verse-indicators')) {
        // Don't open comments panel if the user is selecting/highlighting text
        const selection = window.getSelection();
        if (selection && !selection.isCollapsed && selection.toString().trim().length > 0) {
            return;
        }
        const verseRef = verseContainer.dataset.ref;
        openCommentsPanel(verseRef, (ref) => {
            listenForComments(ref, displayComments);
        });
    }
}

/**
 * Approximate Hebrew → English transliteration (SBL-simplified).
 * Handles consonants, nikud vowels, dagesh in bgdkpt, shin/sin dots.
 * Cantillation marks and meteg are silently skipped.
 */
function transliterateHebrew(heb) {
    const consonants = {
        '\u05D0': '', '\u05D1': 'v', '\u05D2': 'g', '\u05D3': 'd', '\u05D4': 'h',
        '\u05D5': 'v', '\u05D6': 'z', '\u05D7': 'kh', '\u05D8': 't', '\u05D9': 'y',
        '\u05DA': 'kh', '\u05DB': 'kh', '\u05DC': 'l', '\u05DD': 'm', '\u05DE': 'm',
        '\u05DF': 'n', '\u05E0': 'n', '\u05E1': 's', '\u05E2': '', '\u05E3': 'f',
        '\u05E4': 'f', '\u05E5': 'ts', '\u05E6': 'ts', '\u05E7': 'q', '\u05E8': 'r',
        '\u05E9': 'sh', '\u05EA': 't',
    };
    const dagesh = {
        '\u05D1': 'b', '\u05D3': 'd', '\u05D4': 'h',
        '\u05DA': 'k', '\u05DB': 'k', '\u05E3': 'p', '\u05E4': 'p', '\u05EA': 't',
    };
    const vowels = {
        '\u05B0': 'e', '\u05B1': 'e', '\u05B2': 'a', '\u05B3': 'o',
        '\u05B4': 'i', '\u05B5': 'e', '\u05B6': 'e', '\u05B7': 'a',
        '\u05B8': 'a', '\u05B9': 'o', '\u05BA': 'o', '\u05BB': 'u',
    };

    const chars = [...heb.normalize('NFD')];
    let result = '';
    let i = 0;

    while (i < chars.length) {
        const ch = chars[i];
        const cp = ch.codePointAt(0);

        // Skip cantillation marks (U+0591–U+05AF) and meteg (U+05BD)
        if ((cp >= 0x0591 && cp <= 0x05AF) || cp === 0x05BD) { i++; continue; }

        if (cp >= 0x05D0 && cp <= 0x05EA) {
            let hasDagesh = false, shinDot = false, sinDot = false, vowel = '';

            let j = i + 1;
            while (j < chars.length) {
                const nc = chars[j];
                const ncp = nc.codePointAt(0);
                if ((ncp >= 0x0591 && ncp <= 0x05AF) || ncp === 0x05BD) { j++; continue; }
                if (ncp >= 0x05D0 && ncp <= 0x05EA) break;
                if (nc === '\u05BC') hasDagesh = true;
                else if (nc === '\u05C1') shinDot = true;
                else if (nc === '\u05C2') sinDot = true;
                else if (vowels[nc] !== undefined) vowel = vowels[nc];
                j++;
            }

            // Vav as vowel carrier
            if (ch === '\u05D5') {
                if (hasDagesh) { result += 'u'; i = j; continue; } // shuruk
                if (vowel === 'o') { result += 'o'; i = j; continue; } // holam vav
            }

            let con;
            if (ch === '\u05E9') {
                con = sinDot ? 's' : 'sh';
            } else if (hasDagesh && dagesh[ch]) {
                con = dagesh[ch];
            } else {
                con = consonants[ch] ?? '';
            }

            result += con + vowel;
            i = j;
        } else if (ch === '-' || ch === ' ') {
            result += ch; i++;
        } else {
            i++;
        }
    }

    return result;
}

function handleHebrewWordSelection() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const selectedText = selection.toString().trim();
    // Only act on a single word (no whitespace)
    if (!selectedText || /\s/.test(selectedText)) return;

    // Must be selected inside a Hebrew text element
    const anchorNode = selection.anchorNode;
    if (!anchorNode) return;
    const parentEl = anchorNode.nodeType === Node.TEXT_NODE ? anchorNode.parentElement : anchorNode;
    if (!parentEl || !parentEl.closest('.hebrew-text')) return;

    // Strip nikud (vowel points + cantillation marks) for the API query
    const baseWord = selectedText.replace(/[\u0591-\u05C7]/g, '');
    if (!baseWord) return;

    lookupHebrewWordSefaria(baseWord, selectedText);
}

function hebrewConsonantMatchScore(selectedConsonants, headword) {
    const headConsonants = headword.replace(/[\u0591-\u05C7]/g, '');
    if (!headConsonants) return 0;

    // Build candidate forms by progressively stripping up to 2 common
    // single-letter Hebrew prefixes (ו and/וֹ, הַ, לְ, בְּ, כְּ, מִ, שֶׁ).
    const PREFIXES = ['ו', 'ה', 'ל', 'ב', 'כ', 'מ', 'ש'];
    const candidates = [selectedConsonants];
    let s = selectedConsonants;
    for (let i = 0; i < 2; i++) {
        let stripped = false;
        for (const p of PREFIXES) {
            if (s.startsWith(p) && s.length > p.length) {
                s = s.slice(p.length);
                candidates.push(s);
                stripped = true;
                break;
            }
        }
        if (!stripped) break;
    }

    // Exact match — score decreases slightly for each prefix we had to strip
    for (let i = 0; i < candidates.length; i++) {
        if (candidates[i] === headConsonants) return 3 - i;
    }

    // Partial/prefix match on any candidate form
    for (const cand of candidates) {
        if (cand.length >= 2 && headConsonants.length >= 2) {
            if (cand.startsWith(headConsonants) || headConsonants.startsWith(cand)) return 0.5;
        }
    }

    return 0;
}

async function lookupHebrewWordSefaria(word, displayWord) {
    const titleEl = document.querySelector('.info-panel-title');
    if (titleEl) titleEl.textContent = 'Definition';
    showKeywordDefinition(displayWord, 'Loading definition...');

    try {
        const url = `https://www.sefaria.org/api/words/${encodeURIComponent(word)}?lookup_ref=&never_split=1&always_consonants=1`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        if (!Array.isArray(data) || data.length === 0) {
            showKeywordDefinition(displayWord, 'No definition found for this word.');
            return;
        }

        // Sort entries: exact consonant match first, then non-Jastrow, then rest
        const sorted = [...data].sort((a, b) => {
            const scoreA = hebrewConsonantMatchScore(word, a.headword || '');
            const scoreB = hebrewConsonantMatchScore(word, b.headword || '');
            if (scoreB !== scoreA) return scoreB - scoreA;
            const jA = a.parent_lexicon === 'Jastrow Dictionary' ? 1 : 0;
            const jB = b.parent_lexicon === 'Jastrow Dictionary' ? 1 : 0;
            return jA - jB;
        });

        const primary = sorted[0];
        const others = sorted.slice(1);

        if (titleEl) titleEl.textContent = 'Definition';
        const infoContent = document.getElementById('info-content');
        infoContent.classList.remove('info-content-bookmarks');

        // Word header: the actual selected word + its transliteration
        const headerTranslit = transliterateHebrew(displayWord);
        let html = `<div class="sdict-word-header">`;
        html += `<span class="sdict-word-display">${escapeHtmlLocal(displayWord)}</span>`;
        if (headerTranslit) html += `<span class="sdict-word-translit">· ${escapeHtmlLocal(headerTranslit)}</span>`;
        html += `</div>`;

        html += renderSefariaEntry(primary, displayWord, false);

        // "See other definitions" collapsible
        if (others.length > 0) {
            html += `<details class="sdict-other-wrap">`;
            html += `<summary class="sdict-other-toggle">See other definitions (${others.length})</summary>`;
            html += `<div class="sdict-other-entries">`;
            others.forEach(entry => {
                html += renderSefariaEntry(entry, displayWord, true);
            });
            html += `</div></details>`;
        }

        infoContent.innerHTML = html;
        showInfoPanel();
    } catch (err) {
        console.error('Sefaria lexicon lookup failed:', err);
        showKeywordDefinition(displayWord, 'Could not load definition. Please try again.');
    }
}

function renderSefariaEntry(entry, displayWord, showSource = false) {
    const headword = entry.headword || displayWord;
    const morphology = (entry.content && entry.content.morphology) ? entry.content.morphology.trim() : '';
    const senses = (entry.content && entry.content.senses) ? entry.content.senses : [];
    const translit = transliterateHebrew(headword);
    const source = entry.parent_lexicon || '';

    let html = `<div class="sefaria-dict">`;

    html += `<div class="sdict-header">`;
    html += `<span class="sdict-headword">${escapeHtmlLocal(headword)}</span>`;
    if (morphology) html += `<span class="sdict-pos">(${escapeHtmlLocal(morphology)})</span>`;
    html += `<span class="sdict-lang">heb</span>`;
    if (translit) html += `<span class="sdict-translit">· ${escapeHtmlLocal(translit)}</span>`;
    html += `</div>`;

    if (showSource && source) html += `<div class="sdict-source">${escapeHtmlLocal(source)}</div>`;

    if (senses.length > 0) {
        html += renderSefariaSenses(senses, 1);
    } else {
        html += `<p class="sdict-no-result">No senses available.</p>`;
    }

    html += `</div>`;
    return html;
}

function renderSefariaSenses(senses, level) {
    if (!senses || senses.length === 0 || level > 3) return '';

    let html = `<ol class="sdict-senses sdict-senses--l${level}">`;
    senses.forEach(sense => {
        html += `<li class="sdict-sense sdict-sense--l${level}">`;

        if (sense.definition) {
            const plain = sense.definition
                .replace(/<[^>]+>/g, '')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&nbsp;/g, ' ')
                .trim();
            html += escapeHtmlLocal(plain);
        }

        if (sense.senses && sense.senses.length > 0) {
            html += renderSefariaSenses(sense.senses, level + 1);
        }

        html += `</li>`;
    });
    html += `</ol>`;
    return html;
}

function escapeHtmlLocal(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getCommentariesForVerse(verseRef) {
    if (!state.commentaryData || !state.commentaryData.parshas) return [];
    
    for (const parsha of state.commentaryData.parshas) {
        if (parsha.verses) {
            const verse = parsha.verses.find(v => v.ref === verseRef);
            if (verse && verse.commentary) {
                return verse.commentary;
            }
        }
    }
    return [];
}

function getKeywordsForVerse(verseRef) {
    if (!state.commentaryData || !state.commentaryData.parshas) return [];
    
    for (const parsha of state.commentaryData.parshas) {
        if (parsha.verses) {
            const verse = parsha.verses.find(v => v.ref === verseRef);
            if (verse && verse.keywords) {
                return verse.keywords;
            }
        }
    }
    return [];
}

function showAllDefinitions(verseRef, keywords) {
    if (!keywords || keywords.length === 0) return;
    
    const infoContent = document.getElementById('info-content');
    let html = `<h4 class="text-lg font-bold mb-4 text-blue-900 border-b-2 border-blue-200 pb-2">Definitions for ${escapeHtml(verseRef)}</h4>`;
    
    keywords.forEach(keyword => {
        html += `
            <div class="definition-container mb-4">
                <div class="definition-word">${escapeHtml(keyword.word)}</div>
                <div class="definition-text">${formatText(keyword.definition)}</div>
            </div>
        `;
    });
    
    infoContent.innerHTML = html;
    showInfoPanel();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatText(text) {
    if (!text) return '';

    const blocks = text.split(/\n\s*\n/).map(block => block.trim()).filter(Boolean);
    const headerPatterns = [
        /Parsha Summary:/g,
        /Significance &amp; Takeaway:/g,
        /Name Meaning:/g,
        /Significance:/g,
        /Context:/g,
        /The takeaway:/gi
    ];
    const labelReplacements = [
        { regex: /<strong>Name Meaning:<\/strong>/g, replacement: '<span class="sig-label sig-label-name">Name Meaning</span>' },
        { regex: /<strong>Context:<\/strong>/g, replacement: '<span class="sig-label sig-label-context">Context</span>' },
        { regex: /<strong>Parsha Summary:<\/strong>/g, replacement: '<span class="sig-label sig-label-summary">Parsha Summary</span>' },
        { regex: /<strong>Significance:<\/strong>/g, replacement: '<span class="sig-label sig-label-core">Significance</span>' },
        { regex: /<strong>The takeaway:<\/strong>/gi, replacement: '<span class="sig-label sig-label-takeaway">The takeaway</span>' }
    ];

    const sectionHtml = blocks.map(block => {
        let escaped = escapeHtml(block);

        headerPatterns.forEach(pattern => {
            escaped = escaped.replace(pattern, match => `<strong>${match}</strong>`);
        });

        escaped = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        escaped = escaped.replace(/\*([^*]+)\*/g, '<strong>$1</strong>');

        labelReplacements.forEach(({ regex, replacement }) => {
            escaped = escaped.replace(regex, replacement);
        });

        const labelMatch = escaped.match(/^(<span class="sig-label [^>]+>.*?<\/span>)/);
        let label = '';
        if (labelMatch) {
            label = labelMatch[1];
            escaped = escaped.slice(label.length).trim();
        }

        escaped = escaped.replace(/\n/g, '<br>');

        return `
            <section class="sig-section">
                ${label ? `<div class="sig-section-label">${label}</div>` : ''}
                <div class="sig-section-text">${escaped}</div>
            </section>
        `;
    });

    return sectionHtml.join('');
}

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function openBookmarksPanel(defaultTab = 'verses') {
    const userId = getCurrentUserId();
    if (!userId) {
        showError('Please sign in to view bookmarks');
        return;
    }

    const safeDefault = defaultTab === 'quotes' ? 'quotes' : 'verses';

    // ── Open the panel IMMEDIATELY with a loading spinner ────────────────
    const infoContent = document.getElementById('info-content');
    if (infoContent) {
        infoContent.classList.add('info-content-bookmarks');
        infoContent.innerHTML = `
            <div class="bookmarks-loading">
                <div class="community-loading-spinner"></div>
                <p>Loading your bookmarks\u2026</p>
            </div>
        `;
    }
    showInfoPanel();

    const renderVerseBookmarks = (bookmarks = []) => {
        if (!bookmarks || bookmarks.length === 0) {
            return `
                <div class="text-center py-8">
                    <p class="text-gray-500">No verse bookmarks yet.</p>
                    <p class="text-sm text-gray-400 mt-2">Click the bookmark icon on any verse to save it.</p>
                </div>
            `;
        }

        let html = '<div class="bookmarks-list">';
        bookmarks.forEach((bookmark) => {
            const verseRef = bookmark.verseRef;
            const escapedRef = escapeHtml(verseRef);
            const verseText = getVerseTextSnippet(verseRef) || bookmark.verseText || '';
            const displayText = verseText
                ? escapeHtml(verseText)
                : 'Verse text will load when opened.';
            const count = Math.max(verseBookmarkCounts[verseRef] || 0, 1);
            const countLabel = count === 1 ? 'Saved by 1 reader' : `Saved by ${count} readers`;
            let savedDateLabel = 'Date unavailable';
            if (bookmark.timestamp && typeof bookmark.timestamp.toDate === 'function') {
                savedDateLabel = bookmark.timestamp.toDate().toLocaleDateString();
            }

            html += `
                <button type="button" class="bookmark-item" data-verse-ref="${escapedRef}" onclick="loadVerseFromBookmark('${escapedRef}')">
                    <div class="bookmark-item-header">
                        <span class="bookmark-item-ref">${escapedRef}</span>
                        <span class="bookmark-item-count">${escapeHtml(countLabel)}</span>
                    </div>
                    <div class="bookmark-item-text">${displayText}</div>
                    <div class="bookmark-item-meta">
                        <span class="bookmark-item-date">Saved ${escapeHtml(savedDateLabel)}</span>
                    </div>
                </button>
            `;
        });
        html += '</div>';
        return html;
    };

    const renderQuoteBookmarks = (bookmarks = []) => {
        if (!bookmarks || bookmarks.length === 0) {
            return `
                <div class="text-center py-8">
                    <p class="text-gray-500">No saved quotes yet.</p>
                    <p class="text-sm text-gray-400 mt-2">Tap the bookmark icon on today's quote to save it.</p>
                </div>
            `;
        }

        let html = '<div class="bookmarks-list quote-bookmarks-list">';
        bookmarks.forEach((bookmark) => {
            const quoteId = bookmark.quoteId != null ? String(bookmark.quoteId) : '';
            const savedDateLabel = bookmark.savedOn
                ? escapeHtml(bookmark.savedOn)
                : (bookmark.timestamp && typeof bookmark.timestamp.toDate === 'function'
                    ? bookmark.timestamp.toDate().toLocaleDateString()
                    : 'Saved');
            const fullReflection = bookmark.reflection ? escapeHtml(bookmark.reflection) : '';

            html += `
                <article class="quote-bookmark-item" data-quote-id="${quoteId}">
                    <div class="quote-bookmark-top">
                        <div class="quote-bookmark-source">
                            ${bookmark.source ? escapeHtml(bookmark.source) : 'Daily Inspiration'}
                            ${savedDateLabel ? ` • ${savedDateLabel}` : ''}
                        </div>
                        <button type="button" class="quote-remove-btn" data-quote-remove="true" data-quote-id="${quoteId}" title="Remove from saved quotes">
                            <span aria-hidden="true">&times;</span>
                            <span class="sr-only">Remove quote</span>
                        </button>
                    </div>
                    <div class="quote-bookmark-translation">"${escapeHtml(bookmark.translation || 'Teaching')}"</div>
                    ${bookmark.hebrew ? `<div class="quote-bookmark-hebrew">${escapeHtml(bookmark.hebrew)}</div>` : ''}
                    ${fullReflection ? `<div class="quote-bookmark-reflection is-clamped">${fullReflection}</div><button type="button" class="read-more-btn" data-read-more>Read more</button>` : ''}
                </article>
            `;
        });
        html += '</div>';
        return html;
    };

    const renderCommunityQuotes = (quotes = []) => {
        if (!quotes || quotes.length === 0) {
            return `
                <div class="community-quotes-empty">
                    <div class="community-quotes-empty-icon">*</div>
                    <p class="community-quotes-empty-title">No community quotes yet.</p>
                    <p class="community-quotes-empty-hint">Be the first to bookmark today's quote!</p>
                </div>
            `;
        }

        const GRADIENTS = [
            'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            'linear-gradient(135deg, #1FA2FF 0%, #12D8FA 100%)',
            'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            'linear-gradient(135deg, #F7971E 0%, #FFD200 100%)',
            'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
            'linear-gradient(135deg, #2D3561 0%, #C05C7E 100%)',
        ];
        const AVATAR_COLORS = ['#667eea', '#f5576c', '#F7971E', '#11998e', '#C05C7E', '#1FA2FF'];

        let html = '<div class="community-quotes-list">';
        quotes.forEach((quote, idx) => {
            const gradient = GRADIENTS[idx % GRADIENTS.length];
            const countLabel = quote.count === 1 ? '1 person saved this' : `${quote.count} people saved this`;
            const fullReflection = quote.reflection ? escapeHtml(quote.reflection) : '';

            const saverAvatars = (quote.savers || []).slice(0, 4).map((name, i) => {
                const initial = name && name !== 'A Friend' ? name[0].toUpperCase() : '?';
                const color = AVATAR_COLORS[i % AVATAR_COLORS.length];
                return `<span class="community-avatar" style="background:${color}" title="${escapeHtml(name)}">${initial}</span>`;
            }).join('');

            html += `
                <article class="community-quote-card">
                    <div class="community-quote-header" style="background:${gradient}">
                        <span class="community-quote-source">${quote.source ? escapeHtml(quote.source) : 'Daily Teaching'}</span>
                        <span class="community-quote-count-badge">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>
                            ${escapeHtml(countLabel)}
                        </span>
                    </div>
                    <div class="community-quote-body">
                        <div class="community-quote-translation">"${escapeHtml(quote.translation || 'Torah Teaching')}"</div>
                        ${quote.hebrew ? `<div class="community-quote-hebrew">${escapeHtml(quote.hebrew)}</div>` : ''}
                        ${fullReflection ? `<div class="community-quote-reflection is-clamped">${fullReflection}</div><button type="button" class="read-more-btn" data-read-more>Read more</button>` : ''}
                        ${saverAvatars ? `<div class="community-quote-savers"><div class="community-avatars-row">${saverAvatars}</div></div>` : ''}
                    </div>
                </article>
            `;
        });
        html += '</div>';
        return html;
    };

    const wireInteractiveHandlers = (container) => {
        container.querySelectorAll('[data-quote-remove]').forEach((btn) => {
            btn.addEventListener('click', async (event) => {
                event.stopPropagation();
                const quoteId = btn.getAttribute('data-quote-id');
                await removeQuoteBookmarkFromPanel(quoteId);
            });
        });
        container.querySelectorAll('[data-read-more]').forEach((btn) => {
            const reflection = btn.previousElementSibling;
            if (!reflection) return;

            // Hide button if text isn't actually overflowing the clamp
            if (reflection.scrollHeight <= reflection.clientHeight) {
                reflection.classList.remove('is-clamped');
                btn.remove();
                return;
            }

            btn.addEventListener('click', () => {
                const clamped = reflection.classList.toggle('is-clamped');
                btn.textContent = clamped ? 'Read more' : 'Show less';
            });
        });
    };

    try {
        const [verseBookmarks, quoteBookmarks] = await Promise.all([
            refreshBookmarkedVerses({ returnList: true }),
            refreshBookmarkedQuotes({ returnList: true })
        ]);

        const html = `
            <div class="bookmark-tabs" role="tablist" aria-label="Bookmarks">
                <button type="button" class="bookmark-tab ${safeDefault === 'verses' ? 'active' : ''}" data-tab="verses" role="tab" aria-selected="${safeDefault === 'verses'}">Verses</button>
                <button type="button" class="bookmark-tab ${safeDefault === 'quotes' ? 'active' : ''}" data-tab="quotes" role="tab" aria-selected="${safeDefault === 'quotes'}">
                    Quotes ${quoteBookmarks && quoteBookmarks.length ? `<span class="bookmark-tab-pill">${quoteBookmarks.length}</span>` : ''}
                </button>
                <button type="button" class="bookmark-tab" data-tab="community" role="tab" aria-selected="false">
                    Community
                </button>
            </div>
            <div class="bookmark-panels">
                <div class="bookmark-panel ${safeDefault === 'verses' ? 'active' : ''}" data-panel="verses" role="tabpanel">
                    ${renderVerseBookmarks(verseBookmarks || [])}
                </div>
                <div class="bookmark-panel ${safeDefault === 'quotes' ? 'active' : ''}" data-panel="quotes" role="tabpanel">
                    ${renderQuoteBookmarks(quoteBookmarks || [])}
                </div>
                <div class="bookmark-panel" data-panel="community" data-community-loaded="false" role="tabpanel">
                    <div class="community-quotes-empty">
                        <div class="community-quotes-empty-icon">*</div>
                        <p class="community-quotes-empty-title">Community quotes</p>
                        <p class="community-quotes-empty-hint">Click this tab to load quotes everyone has saved.</p>
                    </div>
                </div>
            </div>
        `;

        // Panel is already open — just swap in the content
        const infoContentEl = document.getElementById('info-content');
        if (infoContentEl) {
            infoContentEl.classList.add('info-content-bookmarks');
            infoContentEl.innerHTML = html;
            wireInteractiveHandlers(infoContentEl);

            setupBookmarkTabs(safeDefault, async (tabName) => {
                if (tabName !== 'community') return;
                const communityPanel = infoContentEl.querySelector('[data-panel="community"]');
                if (!communityPanel || communityPanel.dataset.communityLoaded === 'true') return;

                communityPanel.dataset.communityLoaded = 'true';
                communityPanel.innerHTML = `
                    <div class="community-quotes-empty">
                        <div class="community-loading-spinner"></div>
                        <p class="community-quotes-empty-hint" style="margin-top:0.6rem">Loading community quotes\u2026</p>
                    </div>
                `;

                try {
                    const communityQuotes = await getCommunityQuoteBookmarks();
                    communityPanel.innerHTML = renderCommunityQuotes(communityQuotes || []);
                    wireInteractiveHandlers(communityPanel);

                    const communityTab = infoContentEl.querySelector('[data-tab="community"]');
                    if (communityTab && communityQuotes && communityQuotes.length) {
                        communityTab.innerHTML = `Community <span class="bookmark-tab-pill community-tab-pill">${communityQuotes.length}</span>`;
                    }
                } catch (err) {
                    communityPanel.innerHTML = `<div class="community-quotes-empty"><p class="community-quotes-empty-hint">Could not load community quotes.</p></div>`;
                }
            });
        }
    } catch (error) {
        console.error('Error loading bookmarks:', error);
        showError('Failed to load bookmarks');
    }
}

function setupBookmarkTabs(defaultTab = 'verses', onActivate = null) {
    const infoContent = document.getElementById('info-content');
    if (!infoContent) {
        return;
    }

    const tabs = infoContent.querySelectorAll('.bookmark-tab');
    const panels = infoContent.querySelectorAll('.bookmark-panel');

    const activate = (tabName) => {
        tabs.forEach((tab) => {
            const isActive = tab.dataset.tab === tabName;
            tab.classList.toggle('active', isActive);
            tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });
        panels.forEach((panel) => {
            panel.classList.toggle('active', panel.dataset.panel === tabName);
        });
        if (onActivate) onActivate(tabName);
    };

    tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            activate(tab.dataset.tab);
        });
    });

    activate(defaultTab);
}

async function removeQuoteBookmarkFromPanel(quoteId) {
    const userId = getCurrentUserId();
    if (!userId || !quoteId) {
        return;
    }

    try {
        await removeDailyQuoteBookmark(userId, String(quoteId));
        bookmarkedQuoteIds.delete(String(quoteId));
        await refreshBookmarkedQuotes();
        updateDailyQuoteBookmarkButtonState();
        await openBookmarksPanel('quotes');
    } catch (error) {
        console.error('Error removing quote bookmark:', error);
        showError('Failed to remove quote bookmark');
    }
}

// Make this available globally for onclick
window.loadVerseFromBookmark = async function(verseRef) {
    if (!verseRef) {
        return;
    }

    hideInfoPanel();

    const parsha = findParshaForVerse(verseRef);

    if (!parsha) {
        showError('Unable to locate that verse. Please select the book manually.');
        return;
    }

    const parshaIndex = state.allParshas.indexOf(parsha);
    const needsLoad = state.currentParshaRef !== parsha.reference;

    setState({
        currentParshaIndex: parshaIndex,
        currentParshaRef: parsha.reference
    });

    document.querySelectorAll('select#parsha-selector').forEach((s) => {
        s.value = parsha.reference;
    });

    if (needsLoad) {
        await loadParsha(parsha.reference);
    }

    updateNavigationButtons();

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            highlightVerseAndScroll(verseRef);
        });
    });
};

// ========================================
// PRESENCE TRACKING FUNCTIONS
// ========================================

function timestampToMillis(timestamp) {
    if (!timestamp) {
        return null;
    }

    try {
        if (typeof timestamp.toMillis === 'function') {
            return timestamp.toMillis();
        }

        if (typeof timestamp.toDate === 'function') {
            const dateValue = timestamp.toDate();
            return dateValue instanceof Date ? dateValue.getTime() : null;
        }

        if (timestamp instanceof Date) {
            return timestamp.getTime();
        }

        if (typeof timestamp === 'number') {
            return Number.isFinite(timestamp) ? timestamp : null;
        }

        if (typeof timestamp === 'string') {
            const parsed = Date.parse(timestamp);
            return Number.isNaN(parsed) ? null : parsed;
        }
    } catch (error) {
        console.warn('Unable to convert timestamp to millis:', error, timestamp);
    }

    return null;
}

function pickMostRecentTimestamp(existing, candidate) {
    const existingMs = timestampToMillis(existing);
    const candidateMs = timestampToMillis(candidate);

    if (candidateMs !== null && (existingMs === null || candidateMs > existingMs)) {
        return candidate;
    }

    if (existingMs !== null) {
        return existing;
    }

    return candidateMs !== null ? candidate : null;
}

function normalizePresenceUser(user) {
    if (!user) {
        return null;
    }

    const rawEmails = [];
    if (Array.isArray(user.emails)) {
        rawEmails.push(...user.emails);
    }
    if (user.email) {
        rawEmails.push(user.email);
    }

    const normalizedEmails = [];
    const seenEmails = new Set();

    rawEmails.forEach((value) => {
        if (typeof value !== 'string') {
            return;
        }
        const trimmed = value.trim().toLowerCase();
        if (!trimmed || seenEmails.has(trimmed)) {
            return;
        }
        seenEmails.add(trimmed);
        normalizedEmails.push(trimmed);
    });

    const primaryEmail = normalizedEmails[0] || null;
    const username = user.username || (primaryEmail ? getDisplayNameFromEmail(primaryEmail) : null);
    const authIds = Array.isArray(user.authUserIds)
        ? Array.from(new Set(user.authUserIds.filter((value) => typeof value === 'string')))
        : [];
    const canonicalUserId = user.canonicalUserId || user.userId || (authIds.length > 0 ? authIds[0] : null);

    return {
        docId: user.docId || null,
        userId: canonicalUserId,
        canonicalUserId,
        authUserIds: authIds,
        email: primaryEmail,
        emails: normalizedEmails,
        username: username || 'Friend',
        lastLogin: user.lastLogin || null,
        lastSeen: user.lastSeen || null,
        isAlias: Boolean(user.isAlias)
    };
}

function preparePresenceCandidates(users = []) {
    if (!Array.isArray(users)) {
        return [];
    }

    const currentUserId = getCurrentUserId();
    let currentUserEmail = null;
    try {
        currentUserEmail = getCurrentUserEmail ? getCurrentUserEmail() : null;
    } catch {
        currentUserEmail = null;
    }
    const currentEmails = new Set();
    if (typeof currentUserEmail === 'string' && currentUserEmail.trim()) {
        currentEmails.add(currentUserEmail.trim().toLowerCase());
    }

    if (currentUserProfile && Array.isArray(currentUserProfile.emails)) {
        currentUserProfile.emails.forEach((value) => {
            if (typeof value !== 'string') {
                return;
            }
            const normalized = value.trim().toLowerCase();
            if (normalized) {
                currentEmails.add(normalized);
            }
        });
    }

    return users
        .map(normalizePresenceUser)
        .filter((user) => {
            if (!user) {
                return false;
            }
            if (user.isAlias) {
                return false;
            }
            if (currentUserId && user.userId && user.userId === currentUserId) {
                return false;
            }
            if (currentUserId && Array.isArray(user.authUserIds) && user.authUserIds.includes(currentUserId)) {
                return false;
            }
            if (currentEmails.size > 0) {
                const userEmails = Array.isArray(user.emails) && user.emails.length > 0
                    ? user.emails
                    : (user.email ? [user.email.toLowerCase()] : []);
                const overlaps = userEmails.some((email) => {
                    if (typeof email !== 'string') {
                        return false;
                    }
                    return currentEmails.has(email.toLowerCase());
                });
                if (overlaps) {
                    return false;
                }
            }
            return true;
        });
}

function combinePresenceSources(onlineUsers = [], recentUsers = []) {
    const presenceMap = new Map();

    [...onlineUsers, ...recentUsers].forEach((user) => {
        if (!user) {
            return;
        }
        const primaryEmail = Array.isArray(user.emails) && user.emails.length > 0
            ? user.emails[0]
            : (typeof user.email === 'string' ? user.email : null);
        const canonicalKey = user.canonicalUserId || user.userId || primaryEmail;
        const key = canonicalKey || primaryEmail;
        if (!key) {
            return;
        }

        const existing = presenceMap.get(key);
        if (!existing) {
            const emails = Array.isArray(user.emails) ? [...user.emails] : (primaryEmail ? [primaryEmail] : []);
            const authIds = Array.isArray(user.authUserIds)
                ? user.authUserIds.filter((value) => typeof value === 'string' && value.trim())
                : [];
            if (user.userId && typeof user.userId === 'string') {
                authIds.push(user.userId);
            }
            if (user.canonicalUserId && typeof user.canonicalUserId === 'string') {
                authIds.push(user.canonicalUserId);
            }
            const uniqueAuthIds = Array.from(new Set(authIds));
            presenceMap.set(key, {
                ...user,
                emails,
                authUserIds: uniqueAuthIds,
                canonicalUserId: user.canonicalUserId || user.userId
            });
            return;
        }

        const merged = {
            ...existing,
            ...user,
            lastLogin: pickMostRecentTimestamp(existing.lastLogin, user.lastLogin),
            lastSeen: pickMostRecentTimestamp(existing.lastSeen, user.lastSeen)
        };

        const mergedEmailsSet = new Set();
        if (Array.isArray(existing.emails)) {
            existing.emails.forEach((emailValue) => {
                if (typeof emailValue === 'string') {
                    mergedEmailsSet.add(emailValue);
                }
            });
        }
        if (Array.isArray(user.emails)) {
            user.emails.forEach((emailValue) => {
                if (typeof emailValue === 'string') {
                    mergedEmailsSet.add(emailValue);
                }
            });
        }
        if (typeof existing.email === 'string') {
            mergedEmailsSet.add(existing.email);
        }
        if (typeof user.email === 'string') {
            mergedEmailsSet.add(user.email);
        }

        const mergedEmails = Array.from(mergedEmailsSet);

        let resolvedEmail = user.email || existing.email || mergedEmails[0] || null;
        if (resolvedEmail) {
            resolvedEmail = resolvedEmail.trim().toLowerCase();
        }

        if (resolvedEmail) {
            mergedEmails.sort((a, b) => {
                if (a === resolvedEmail) {
                    return -1;
                }
                if (b === resolvedEmail) {
                    return 1;
                }
                return a.localeCompare(b);
            });
        } else {
            mergedEmails.sort();
        }

        merged.emails = mergedEmails;
        merged.email = resolvedEmail || null;
        merged.userId = user.canonicalUserId || user.userId || existing.userId;
        merged.canonicalUserId = user.canonicalUserId || existing.canonicalUserId || merged.userId;

        const mergedAuthIdsSet = new Set();
        if (Array.isArray(existing.authUserIds)) {
            existing.authUserIds.forEach((id) => {
                if (typeof id === 'string' && id.trim()) {
                    mergedAuthIdsSet.add(id);
                }
            });
        }
        if (Array.isArray(user.authUserIds)) {
            user.authUserIds.forEach((id) => {
                if (typeof id === 'string' && id.trim()) {
                    mergedAuthIdsSet.add(id);
                }
            });
        }
        if (typeof existing.userId === 'string') {
            mergedAuthIdsSet.add(existing.userId);
        }
        if (typeof user.userId === 'string') {
            mergedAuthIdsSet.add(user.userId);
        }
        if (merged.canonicalUserId) {
            mergedAuthIdsSet.add(merged.canonicalUserId);
        }
        const mergedAuthIds = Array.from(mergedAuthIdsSet);
        if (merged.canonicalUserId) {
            mergedAuthIds.sort((a, b) => {
                if (a === merged.canonicalUserId) {
                    return -1;
                }
                if (b === merged.canonicalUserId) {
                    return 1;
                }
                return a.localeCompare(b);
            });
        } else {
            mergedAuthIds.sort();
        }
        merged.authUserIds = mergedAuthIds;
        merged.isAlias = Boolean(existing.isAlias && user.isAlias);
        const candidateUsername = user.username || existing.username;
        const fallbackUsername = merged.email ? getDisplayNameFromEmail(merged.email) : candidateUsername;
        const sanitizedUsername = candidateUsername && typeof candidateUsername === 'string'
            ? candidateUsername.trim()
            : '';
        if (!sanitizedUsername || sanitizedUsername.includes('@') || sanitizedUsername.toLowerCase() === 'friend') {
            merged.username = fallbackUsername || sanitizedUsername || 'Friend';
        } else {
            merged.username = sanitizedUsername;
        }

        presenceMap.set(key, merged);
    });

    const now = Date.now();

    const combined = Array.from(presenceMap.values()).filter((user) => {
        const referenceTimestamp = user.lastLogin || user.lastSeen;
        const millis = timestampToMillis(referenceTimestamp);
        if (millis === null) {
            return false;
        }
        return (now - millis) <= FRIEND_PRESENCE_WINDOW_MS;
    }).sort((a, b) => {
        const aLogin = timestampToMillis(a.lastLogin);
        const aSeen = timestampToMillis(a.lastSeen);
        const bLogin = timestampToMillis(b.lastLogin);
        const bSeen = timestampToMillis(b.lastSeen);
        const aRecent = Math.max(aLogin ?? -Infinity, aSeen ?? -Infinity);
        const bRecent = Math.max(bLogin ?? -Infinity, bSeen ?? -Infinity);
        return bRecent - aRecent;
    });

    return combined.slice(0, 10);
}

function updateFriendPresenceView() {
    const combined = combinePresenceSources(trackedOnlineFriends, trackedRecentFriendLogins);
    if (combined.length === 0) {
        hideOnlineUsers();
        return;
    }
    displayOnlineUsers(combined);
}

function clearFriendPresence() {
    trackedOnlineFriends = [];
    trackedRecentFriendLogins = [];
    hideOnlineUsers();
}

// Start tracking user presence (updates every 30 seconds)
function startPresenceTracking(userId) {
    lastUserId = userId;

    // Clear existing interval if any
    if (presenceIntervalId) {
        clearInterval(presenceIntervalId);
    }

    // Update presence immediately
    updateUserPresence(userId).catch(error => console.error('Error updating presence:', error));

    // Then update every 30 seconds
    presenceIntervalId = setInterval(() => {
        if (getCurrentUserId() === userId) {
            updateUserPresence(userId).catch(error => console.error('Error updating presence:', error));
        }
    }, PRESENCE_UPDATE_INTERVAL);

    // Set up listener for online users
    listenForOnlineUsers((onlineUsers) => {
        trackedOnlineFriends = preparePresenceCandidates(onlineUsers);
        updateFriendPresenceView();
    });

    // Also fetch and display users from last 3 weeks
    startFriendLoginsPolling();
}

// Start polling for friend logins in last 3 weeks
function startFriendLoginsPolling() {
    stopFriendLoginsPolling();
    refreshFriendLogins();
    friendLoginsRefreshIntervalId = setInterval(() => {
        refreshFriendLogins();
    }, FRIEND_LOGINS_REFRESH_INTERVAL);
}

// Stop polling for friend logins
function stopFriendLoginsPolling() {
    if (friendLoginsRefreshIntervalId) {
        clearInterval(friendLoginsRefreshIntervalId);
        friendLoginsRefreshIntervalId = null;
    }
    trackedRecentFriendLogins = [];
    updateFriendPresenceView();
}

// Refresh and display friends who logged in within last 3 weeks (up to 10)
async function refreshFriendLogins() {
    const currentUserId = getCurrentUserId();
    if (!currentUserId) {
        trackedRecentFriendLogins = [];
        updateFriendPresenceView();
        return;
    }

    try {
        const users = await getUsersWithinThreeWeeks(10);
        if (!Array.isArray(users) || users.length === 0) {
            trackedRecentFriendLogins = [];
            updateFriendPresenceView();
            return;
        }

        const friendsList = preparePresenceCandidates(users);
        trackedRecentFriendLogins = friendsList;
        updateFriendPresenceView();
    } catch (error) {
        console.error('Error loading friends from last 3 weeks:', error);
        trackedRecentFriendLogins = [];
        updateFriendPresenceView();
    }
}

function updateCurrentUserStatusDisplay(userProfile, fallbackEmail) {
    const profileEmails = Array.isArray(userProfile?.emails) ? userProfile.emails : [];
    const primaryProfileEmail = profileEmails.length > 0
        ? profileEmails[0]
        : (typeof userProfile?.email === 'string' ? userProfile.email : null);
    const normalizedFallbackEmail = typeof fallbackEmail === 'string' && fallbackEmail.trim()
        ? fallbackEmail.trim().toLowerCase()
        : null;

    // Prefer displayName (user-chosen) over username (email-derived)
    let displayName = userProfile?.displayName;
    if (!displayName || displayName === 'Friend' || (typeof displayName === 'string' && displayName.includes('@'))) {
        displayName = userProfile?.username;
    }
    if (!displayName || displayName === 'Friend' || (typeof displayName === 'string' && displayName.includes('@'))) {
        if (primaryProfileEmail) {
            displayName = getDisplayNameFromEmail(primaryProfileEmail);
        } else if (normalizedFallbackEmail) {
            displayName = getDisplayNameFromEmail(normalizedFallbackEmail);
        } else {
            displayName = getSavedUsername() !== 'Anonymous' ? getSavedUsername() : 'Friend';
        }
    }
    const loginTime = userProfile?.lastLogin || userProfile?.lastSeen || new Date();

    displayLastLogin(displayName, loginTime);
}

async function refreshCurrentUserProfile() {
    const userId = getCurrentUserId();
    if (!userId) {
        return;
    }

    try {
        const profile = await getUserInfo(userId);
        if (profile) {
            currentUserProfile = profile;
            updateCurrentUserStatusDisplay(profile, getCurrentUserEmail());
        }
    } catch (error) {
        console.error('Error refreshing current user profile:', error);
    }
}

// Stop tracking user presence
function stopPresenceTracking() {
    if (presenceIntervalId) {
        clearInterval(presenceIntervalId);
        presenceIntervalId = null;
    }

    stopListeningForOnlineUsers();
    stopFriendLoginsPolling();
    clearFriendPresence();
    hideLastLogin();
}

// Handle user going offline when page is closed or navigated away
async function handleUserOffline() {
    const userId = lastUserId || getCurrentUserId();
    if (userId) {
        try {
            await markUserOffline(userId);
            console.log('[Presence] User marked offline on page unload');
        } catch (error) {
            console.error('[Presence] Error marking user offline:', error);
        }
    }
}

// Handle visibility change (tab switching) - update presence when tab becomes visible
function handleVisibilityChange() {
    const userId = getCurrentUserId();
    if (!userId) return;

    if (document.hidden) {
        console.log('[Presence] Tab hidden');
    } else {
        // Tab is visible again - update presence immediately
        console.log('[Presence] Tab visible - updating presence');
        updateUserPresence(userId).catch(error =>
            console.error('[Presence] Error updating presence on visibility:', error)
        );
    }
}

// Set up page lifecycle event handlers for presence tracking
window.addEventListener('beforeunload', handleUserOffline);
window.addEventListener('pagehide', handleUserOffline);
document.addEventListener('visibilitychange', handleVisibilityChange);

document.addEventListener('DOMContentLoaded', init);
