// Daily Psalms (Tehillim) page module
import { fetchDailyPsalms, fetchParshaText, getPsalmsPortionForDay, getAllPsalmsPortions } from './api.js';
import {
    getCurrentUserId,
    submitGlobalReaction,
    getUserGlobalReactions,
    getGlobalReactionCountsForBook,
    getGlobalBookmarkCountsForVerses,
    addGlobalBookmark,
    removeGlobalBookmark,
    isGlobalVerseBookmarked,
    getUserGlobalBookmarks,
    getGlobalVerseInteractors,
    getUserBirthday,
    recordUserLogin,
    updateUserPresence,
    markUserOffline
} from './firebase.js';
import {
    showInfoPanel,
    showKeywordDefinition,
    resolveDisplayName,
    formatRelativeTime
} from './ui.js';

// ─── State ───────────────────────────────────────────────────────────────────
let verseReactionCounts = {};
let userReactions = {};
let bookmarkedVerses = new Set();
let verseBookmarkCounts = {};
let currentUserId = null;
const verseDisplayTexts = {};
let authResolvedAtLeastOnce = false;

// Verse refs pending interactions load (if auth fires after data loads)
let pendingVerseRefs = null;

// Tooltip cache for "who reacted" hover dropdowns
const verseInteractorsCache = new Map(); // key: `${verseRef}__${interactionType}`
const INTERACTORS_CACHE_TTL = 60000; // 1 minute
let activeTooltipFetch = null;

// Portion selector state
let todayHebrewDay = null;  // set once on init
let currentPortionDay = null; // day currently displayed
let userBirthdayDob = null;  // YYYY-MM-DD from Firestore profile

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parsePsalmsRef(ref) {
    if (!ref) return { startChapter: 1, endChapter: null };
    const rangeMatch = ref.match(/Psalms\s+(\d+)-(\d+)/i);
    if (rangeMatch) return { startChapter: parseInt(rangeMatch[1]), endChapter: parseInt(rangeMatch[2]) };
    const chapterVerseMatch = ref.match(/Psalms\s+(\d+):/i);
    if (chapterVerseMatch) return { startChapter: parseInt(chapterVerseMatch[1]), endChapter: parseInt(chapterVerseMatch[1]) };
    const singleMatch = ref.match(/Psalms\s+(\d+)/i);
    if (singleMatch) return { startChapter: parseInt(singleMatch[1]), endChapter: null };
    return { startChapter: 1, endChapter: null };
}

function cleanText(text) {
    if (!text || typeof text !== 'string') return text || '';
    const t = document.createElement('textarea');
    t.innerHTML = text;
    return t.value.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function setVisible(id, visible) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('hidden', !visible);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/** Returns current userId, waiting for auth restoration when needed. */
async function requireUserId() {
    if (currentUserId) return currentUserId;

    const immediate = getCurrentUserId();
    if (immediate) {
        currentUserId = immediate;
        return immediate;
    }

    // Auth is managed by page-auth.js. Poll getCurrentUserId() briefly
    // in case auth is still restoring (e.g. user clicked very fast on load).
    const timeoutMs = 5000;
    const startedAt = Date.now();
    while ((Date.now() - startedAt) < timeoutMs) {
        const uid = getCurrentUserId();
        if (uid) {
            currentUserId = uid;
            dbg('requireUserId resolved via poll:', uid);
            return uid;
        }
        await sleep(200);
    }
    dbg('requireUserId timed out — user not authenticated');
    return null;
}

// ─── Daily Tehillim significance ──────────────────────────────────────────────

async function loadDailyTehilimSummary(hebrewDay) {
    try {
        const resp = await fetch('/data/dailytehilim.json');
        if (!resp.ok) return null;
        const data = await resp.json();
        const cycle = data.cycle;
        if (!Array.isArray(cycle) || cycle.length === 0) return null;
        const idx = Math.min(Math.max((hebrewDay || 1) - 1, 0), cycle.length - 1);
        return cycle[idx] || null;
    } catch { return null; }
}

function showSignificanceCard(entry) {
    const modal = document.getElementById('psalms-significance-modal');
    if (!modal || !entry) return;

    const essenceEl  = document.getElementById('psalms-sig-essence');
    const summaryEl  = document.getElementById('psalms-sig-summary');
    const takeawayEl = document.getElementById('psalms-sig-takeaway');

    if (essenceEl)  essenceEl.textContent  = entry.thematic_essence   || '';
    if (summaryEl)  summaryEl.textContent  = entry.summary             || '';
    if (takeawayEl) takeawayEl.textContent = entry.rabbinical_takeaway || '';

    // Wire up the hero button to open the modal
    const sigBtn = document.getElementById('psalms-significance-btn');
    if (sigBtn) {
        sigBtn.addEventListener('click', () => {
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        });
    }

    // Close modal handlers
    const closeBtn = document.getElementById('psalms-sig-modal-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        });
    }
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }
    });
}

// ─── Reaction tooltip helpers ─────────────────────────────────────────────────

function isDesktopHoverEnabled() {
    return window.matchMedia('(hover: hover) and (pointer: fine)').matches
        && window.matchMedia('(min-width: 768px)').matches;
}

function buildInteractorsTooltipText(interactors, interactionType) {
    if (!interactors || interactors.length === 0) return '';
    const verbs = { emphasize: 'exclaimed', heart: 'liked', bookmark: 'bookmarked' };
    const verb = verbs[interactionType] || 'interacted with';
    const lines = interactors.slice(0, 10).map(({ user, timestamp }) => {
        return `${resolveDisplayName(user)} • ${formatRelativeTime(timestamp)}`;
    });
    if (interactors.length > 10) lines.push(`and ${interactors.length - 10} more...`);
    return interactors.length === 1 ? lines[0] : `${interactors.length} ${verb} this:\n${lines.join('\n')}`;
}

async function loadAndShowInteractorTooltip(button, verseRef, interactionType) {
    if (!button || !verseRef) return;
    const cacheKey = `${verseRef}__${interactionType}`;
    const cached = verseInteractorsCache.get(cacheKey);
    const now = Date.now();

    if (cached && (now - cached.fetchedAt < INTERACTORS_CACHE_TTL)) {
        applyTooltipToButton(button, cached.users, interactionType);
        return;
    }

    if (activeTooltipFetch === cacheKey) return;

    const loadingTimeout = setTimeout(() => {
        if (button.matches(':hover')) {
            button.classList.add('status-tooltip');
            button.setAttribute('data-tooltip', 'Loading...');
        }
    }, 100);

    try {
        activeTooltipFetch = cacheKey;
        const interactors = await getGlobalVerseInteractors(verseRef, interactionType);
        clearTimeout(loadingTimeout);
        verseInteractorsCache.set(cacheKey, { users: interactors, fetchedAt: now });
        if (button.matches(':hover')) {
            applyTooltipToButton(button, interactors, interactionType);
        }
    } catch (error) {
        clearTimeout(loadingTimeout);
        console.error('Error loading interactors:', error);
    } finally {
        activeTooltipFetch = null;
    }
}

function applyTooltipToButton(button, interactors, interactionType) {
    if (!button) return;
    if (!interactors || interactors.length === 0) {
        button.removeAttribute('data-tooltip');
        button.classList.remove('status-tooltip');
        return;
    }
    button.classList.add('status-tooltip');
    button.setAttribute('data-tooltip', buildInteractorsTooltipText(interactors, interactionType));
}

function setupTooltipBehavior(button, verseRef, interactionType) {
    let hoverTimeout = null;
    button.removeAttribute('title');

    button.addEventListener('mouseenter', () => {
        if (!isDesktopHoverEnabled()) return;
        const rect = button.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        button.classList.remove('tooltip-align-left', 'tooltip-align-right');
        if (cx < window.innerWidth * 0.3) button.classList.add('tooltip-align-left');
        else if (cx > window.innerWidth * 0.7) button.classList.add('tooltip-align-right');

        if (hoverTimeout) clearTimeout(hoverTimeout);
        hoverTimeout = setTimeout(() => {
            loadAndShowInteractorTooltip(button, verseRef, interactionType);
            hoverTimeout = null;
        }, 300);
    });

    button.addEventListener('mouseleave', () => {
        if (hoverTimeout) { clearTimeout(hoverTimeout); hoverTimeout = null; }
    });
}

function attachInteractionTooltips(container, verseRef) {
    if (!container || !verseRef || !isDesktopHoverEnabled()) return;
    const emphasizeBtn = container.querySelector('.emphasize-btn');
    const heartBtn = container.querySelector('.heart-btn');
    const bookmarkBtn = container.querySelector('.bookmark-btn');
    if (emphasizeBtn) setupTooltipBehavior(emphasizeBtn, verseRef, 'emphasize');
    if (heartBtn) setupTooltipBehavior(heartBtn, verseRef, 'heart');
    if (bookmarkBtn) setupTooltipBehavior(bookmarkBtn, verseRef, 'bookmark');
}

// ─── Verse element ────────────────────────────────────────────────────────────

function createVerseElement(englishText, hebrewText, verseRef, verseNumber) {
    const container = document.createElement('div');
    container.className = 'verse-container';
    container.dataset.ref = verseRef;

    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'verse-content-wrapper';

    const numSpan = document.createElement('div');
    numSpan.className = 'verse-number';
    numSpan.textContent = verseNumber;
    contentWrapper.appendChild(numSpan);

    const textContainer = document.createElement('div');
    textContainer.className = 'verse-text-container';

    const hebrewDiv = document.createElement('div');
    hebrewDiv.className = 'hebrew-text';
    hebrewDiv.setAttribute('lang', 'he');
    hebrewDiv.setAttribute('dir', 'rtl');
    hebrewDiv.innerHTML = hebrewText || '';

    const englishDiv = document.createElement('div');
    englishDiv.className = 'english-text';
    englishDiv.innerHTML = cleanText(englishText);
    verseDisplayTexts[verseRef] = englishDiv.textContent;

    textContainer.appendChild(hebrewDiv);
    textContainer.appendChild(englishDiv);
    contentWrapper.appendChild(textContainer);
    container.appendChild(contentWrapper);

    // Reaction buttons
    const reactionsSection = document.createElement('div');
    reactionsSection.className = 'verse-reactions';

    const emphasizeBtn = document.createElement('button');
    emphasizeBtn.className = 'reaction-btn emphasize-btn';
    emphasizeBtn.setAttribute('aria-label', 'Emphasize this verse');
    emphasizeBtn.innerHTML = `<span class="reaction-icon emphasize-icon"></span><span class="reaction-count"></span>`;
    emphasizeBtn.addEventListener('click', e => { e.stopPropagation(); handleReactionClick(verseRef, 'emphasize', emphasizeBtn); });

    const heartBtn = document.createElement('button');
    heartBtn.className = 'reaction-btn heart-btn';
    heartBtn.setAttribute('aria-label', 'Heart this verse');
    heartBtn.innerHTML = `<span class="reaction-icon heart-icon"></span><span class="reaction-count"></span>`;
    heartBtn.addEventListener('click', e => { e.stopPropagation(); handleReactionClick(verseRef, 'heart', heartBtn); });

    const bookmarkBtn = document.createElement('button');
    bookmarkBtn.type = 'button';
    bookmarkBtn.className = 'reaction-btn bookmark-btn';
    bookmarkBtn.setAttribute('aria-label', 'Bookmark this verse');
    bookmarkBtn.setAttribute('data-verse-ref', verseRef);
    bookmarkBtn.setAttribute('aria-pressed', 'false');
    bookmarkBtn.innerHTML = `
        <svg class="bookmark-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" fill="currentColor"></path>
        </svg>
        <span class="bookmark-count"></span>
    `;
    bookmarkBtn.addEventListener('click', e => { e.stopPropagation(); handleBookmarkClick(verseRef, bookmarkBtn); });

    reactionsSection.appendChild(emphasizeBtn);
    reactionsSection.appendChild(heartBtn);
    reactionsSection.appendChild(bookmarkBtn);
    container.appendChild(reactionsSection);

    // Attach hover tooltips showing who reacted (desktop only)
    attachInteractionTooltips(container, verseRef);

    return container;
}

function updateVerseReactionUI(container, verseRef) {
    if (!container) return;
    const counts = verseReactionCounts[verseRef] || { emphasize: 0, heart: 0 };
    const reacted = userReactions[verseRef] || [];

    container.setAttribute('data-emphasize', counts.emphasize);
    container.setAttribute('data-heart', counts.heart);

    const emphasizeBtn = container.querySelector('.emphasize-btn');
    const heartBtn = container.querySelector('.heart-btn');

    if (emphasizeBtn) {
        const cs = emphasizeBtn.querySelector('.reaction-count');
        if (cs) cs.textContent = counts.emphasize || '';
        emphasizeBtn.classList.toggle('active', reacted.includes('emphasize'));
    }
    if (heartBtn) {
        const cs = heartBtn.querySelector('.reaction-count');
        if (cs) cs.textContent = counts.heart || '';
        heartBtn.classList.toggle('active', reacted.includes('heart'));
    }
}

function applyBookmarkStateToAll() {
    document.querySelectorAll('.bookmark-btn[data-verse-ref]').forEach(btn => {
        const ref = btn.dataset.verseRef;
        const active = bookmarkedVerses.has(ref);
        const baseCount = ref ? (verseBookmarkCounts[ref] || 0) : 0;
        const displayCount = Math.max(baseCount, active ? 1 : 0);
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
        const countSpan = btn.querySelector('.bookmark-count');
        if (countSpan) {
            countSpan.textContent = displayCount > 0 ? displayCount : '';
            countSpan.style.display = displayCount > 0 ? 'inline-flex' : 'none';
        }
    });
}

// ─── Debug logging ────────────────────────────────────────────────────────────
function dbg(...args) { console.log('%c[Psalms]', 'color:#0f7b8f;font-weight:bold', ...args); }

// ─── Reaction handlers ────────────────────────────────────────────────────────

async function handleReactionClick(verseRef, reactionType, btn) {
    dbg('handleReactionClick', { verseRef, reactionType, currentUserId, authResolvedAtLeastOnce });
    const uid = await requireUserId();
    dbg('requireUserId resolved:', uid);
    if (!uid) { alert('Please sign in to react to verses.'); return; }

    try {
        dbg('Calling submitGlobalReaction…', { verseRef, reactionType, uid });
        const result = await submitGlobalReaction(verseRef, reactionType, uid);
        dbg('submitGlobalReaction result:', result);
        if (!verseReactionCounts[verseRef]) verseReactionCounts[verseRef] = { emphasize: 0, heart: 0 };
        if (!userReactions[verseRef]) userReactions[verseRef] = [];

        if (result?.action === 'added') {
            verseReactionCounts[verseRef][reactionType]++;
            if (!userReactions[verseRef].includes(reactionType)) {
                userReactions[verseRef].push(reactionType);
            }
        } else {
            verseReactionCounts[verseRef][reactionType] = Math.max(0, verseReactionCounts[verseRef][reactionType] - 1);
            userReactions[verseRef] = userReactions[verseRef].filter(r => r !== reactionType);
        }

        // Invalidate tooltip cache for this reaction type
        verseInteractorsCache.delete(`${verseRef}__${reactionType}`);

        const el = document.querySelector(`[data-ref="${CSS.escape(verseRef)}"]`);
        if (el) updateVerseReactionUI(el, verseRef);
    } catch (err) {
        console.error('Reaction error:', err);
        alert('Error submitting reaction. Please try again.');
    }
}

async function handleBookmarkClick(verseRef, bookmarkBtn) {
    dbg('handleBookmarkClick', { verseRef, currentUserId, authResolvedAtLeastOnce });
    const uid = await requireUserId();
    dbg('requireUserId resolved:', uid);
    if (!uid) { alert('Please sign in to bookmark verses.'); return; }

    try {
        const isBookmarked = bookmarkedVerses.has(verseRef)
            ? true
            : await isGlobalVerseBookmarked(uid, verseRef);
        dbg('isBookmarked:', isBookmarked, 'for', verseRef);

        if (isBookmarked) {
            await removeGlobalBookmark(uid, verseRef);
            bookmarkBtn.classList.remove('active');
            bookmarkBtn.setAttribute('aria-pressed', 'false');
            bookmarkedVerses.delete(verseRef);
            if (verseBookmarkCounts[verseRef]) {
                verseBookmarkCounts[verseRef] = Math.max(0, verseBookmarkCounts[verseRef] - 1);
            }
            dbg('Bookmark removed:', verseRef);
        } else {
            await addGlobalBookmark(uid, verseRef, { verseText: verseDisplayTexts[verseRef] || '' });
            bookmarkBtn.classList.add('active');
            bookmarkBtn.setAttribute('aria-pressed', 'true');
            bookmarkedVerses.add(verseRef);
            verseBookmarkCounts[verseRef] = (verseBookmarkCounts[verseRef] || 0) + 1;
            dbg('Bookmark added:', verseRef);
        }

        // Invalidate tooltip cache for bookmark
        verseInteractorsCache.delete(`${verseRef}__bookmark`);

        applyBookmarkStateToAll();
    } catch (err) {
        console.error('Bookmark error:', err);
        alert('Error saving bookmark. Please try again.');
    }
}

// ─── Rendering ────────────────────────────────────────────────────────────────

function renderVerses(data, psalmRef, ps119Part) {
    const container = document.getElementById('psalms-verses');
    if (!container) return [];
    container.innerHTML = '';

    const { startChapter } = parsePsalmsRef(psalmRef);
    const englishText = Array.isArray(data.text) ? data.text : [data.text];
    const hebrewText = Array.isArray(data.he) ? data.he : [data.he];
    const allVerseRefs = [];

    if (ps119Part) {
        const header = document.createElement('div');
        header.className = 'psalms-chapter-header';
        const label = ps119Part === 'a' ? 'Psalm 119 — א through ל' : 'Psalm 119 — מ through ת';
        header.innerHTML = `
            <div class="psalms-chapter-decoration" aria-hidden="true"></div>
            <span class="psalms-chapter-label">${label}</span>
            <div class="psalms-chapter-decoration" aria-hidden="true"></div>
        `;
        container.appendChild(header);

        const flat = Array.isArray(englishText[0]) ? englishText.flat() : englishText;
        const flatHe = Array.isArray(hebrewText[0]) ? hebrewText.flat() : hebrewText;
        const verseOffset = ps119Part === 'b' ? 96 : 0;
        flat.forEach((verseText, idx) => {
            if (!verseText || String(verseText).trim() === '') return;
            const verseNum = idx + 1 + verseOffset;
            const verseRef = `Psalms 119:${verseNum}`;
            allVerseRefs.push(verseRef);
            container.appendChild(createVerseElement(verseText, flatHe[idx] || '', verseRef, verseNum));
        });
        return allVerseRefs;
    }

    if (Array.isArray(englishText[0])) {
        englishText.forEach((chapterVerses, chapterIdx) => {
            const chapterNum = startChapter + chapterIdx;
            const heChapter = Array.isArray(hebrewText[chapterIdx]) ? hebrewText[chapterIdx] : [hebrewText[chapterIdx] || ''];

            const header = document.createElement('div');
            header.className = 'psalms-chapter-header';
            header.innerHTML = `
                <div class="psalms-chapter-decoration" aria-hidden="true"></div>
                <span class="psalms-chapter-label">Psalm ${chapterNum}</span>
                <div class="psalms-chapter-decoration" aria-hidden="true"></div>
            `;
            container.appendChild(header);

            (Array.isArray(chapterVerses) ? chapterVerses : [chapterVerses]).forEach((verseText, verseIdx) => {
                if (!verseText || String(verseText).trim() === '') return;
                const verseNum = verseIdx + 1;
                const verseRef = `Psalms ${chapterNum}:${verseNum}`;
                allVerseRefs.push(verseRef);
                container.appendChild(createVerseElement(verseText, heChapter[verseIdx] || '', verseRef, verseNum));
            });
        });
    } else {
        const header = document.createElement('div');
        header.className = 'psalms-chapter-header';
        header.innerHTML = `
            <div class="psalms-chapter-decoration" aria-hidden="true"></div>
            <span class="psalms-chapter-label">Psalm ${startChapter}</span>
            <div class="psalms-chapter-decoration" aria-hidden="true"></div>
        `;
        container.appendChild(header);

        const flat = Array.isArray(englishText[0]) ? englishText.flat() : englishText;
        const flatHe = Array.isArray(hebrewText[0]) ? hebrewText.flat() : hebrewText;
        flat.forEach((verseText, idx) => {
            if (!verseText || String(verseText).trim() === '') return;
            const verseNum = idx + 1;
            const verseRef = `Psalms ${startChapter}:${verseNum}`;
            allVerseRefs.push(verseRef);
            container.appendChild(createVerseElement(verseText, flatHe[idx] || '', verseRef, verseNum));
        });
    }

    return allVerseRefs;
}

// ─── Load reactions & bookmarks ───────────────────────────────────────────────

async function loadInteractions(verseRefs) {
    dbg('loadInteractions called', { currentUserId, verseRefCount: verseRefs?.length });
    if (!currentUserId || !verseRefs || verseRefs.length === 0) {
        dbg('loadInteractions skipped — no userId or verseRefs');
        return;
    }

    // Run each query independently so a single failure doesn't block the rest
    const [reactionCounts, bookmarkCounts, userReactionData, userBookmarkData] = await Promise.all([
        getGlobalReactionCountsForBook('Psalms').catch(e => { dbg('getGlobalReactionCountsForBook error:', e.message); return {}; }),
        getGlobalBookmarkCountsForVerses(verseRefs).catch(e => { dbg('getGlobalBookmarkCountsForVerses error:', e.message); return {}; }),
        getUserGlobalReactions(currentUserId, verseRefs).catch(e => { dbg('getUserGlobalReactions error:', e.message); return {}; }),
        getUserGlobalBookmarks(currentUserId).catch(e => { dbg('getUserGlobalBookmarks error:', e.message); return []; })
    ]);
    dbg('loadInteractions results', {
        reactionCountKeys: Object.keys(reactionCounts).length,
        bookmarkCountKeys: Object.keys(bookmarkCounts).length,
        userReactionKeys: Object.keys(userReactionData).length,
        userBookmarkCount: Array.isArray(userBookmarkData) ? userBookmarkData.length : 'not-array'
    });

    Object.assign(verseReactionCounts, reactionCounts);

    // Store bookmark counts for use in applyBookmarkStateToAll
    if (bookmarkCounts && typeof bookmarkCounts === 'object') {
        Object.assign(verseBookmarkCounts, bookmarkCounts);
    }

    if (userReactionData && typeof userReactionData === 'object') {
        Object.assign(userReactions, userReactionData);
    }

    if (Array.isArray(userBookmarkData)) {
        userBookmarkData.forEach(b => { if (b.verseRef) bookmarkedVerses.add(b.verseRef); });
    }

    document.querySelectorAll('.verse-container[data-ref]').forEach(el => {
        updateVerseReactionUI(el, el.dataset.ref);
    });
    applyBookmarkStateToAll();
}

// ─── Portion selector ─────────────────────────────────────────────────────────

// ─── Birthday helpers (module-level so waitForAuth can call them) ─────────────

function getBirthdayPsalmNumberFromDob(dob) {
    const today = new Date();
    const birth = new Date(dob + 'T12:00:00'); // noon to avoid timezone issues
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return ((Math.max(0, age) % 150) + 1); // psalm = year of life currently being lived
}

function renderBirthdayPopoverContent(popover, dob, psalmNum) {
    if (dob && psalmNum) {
        const dobFormatted = new Date(dob + 'T12:00:00').toLocaleDateString(undefined, {
            month: 'long', day: 'numeric', year: 'numeric'
        });
        popover.innerHTML = `
            <div class="bday-pop-glow" aria-hidden="true"></div>
            <div class="bday-pop-inner">
                <div class="bday-pop-eyebrow">
                    <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/>
                    </svg>
                    Your Birthday Portion
                </div>
                <div class="bday-pop-psalm-label">Psalm</div>
                <div class="bday-pop-psalm-num">${psalmNum}</div>
                <div class="bday-pop-desc">Read every day during your current year of life</div>
                <button class="bday-pop-read-btn" id="psalms-birthday-read-btn">
                    <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                    </svg>
                    Read Psalm ${psalmNum}
                </button>
                <div class="bday-pop-footer">${dobFormatted} · <a href="/settings#birthday" class="bday-pop-settings-link">Edit in Settings</a></div>
            </div>
        `;
        popover.querySelector('#psalms-birthday-read-btn').addEventListener('click', () => {
            popover.style.display = 'none';
            document.getElementById('psalms-birthday-btn')?.classList.remove('open');
            loadBirthdayPortion(psalmNum);
        });
    } else {
        // Birthday not in profile — direct them to settings
        popover.innerHTML = `
            <div class="bday-pop-inner">
                <div class="bday-pop-eyebrow">
                    <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/>
                    </svg>
                    Birthday Portion
                </div>
                <div class="bday-pop-desc" style="margin:0.9rem 0 1rem;">Add your date of birth in Settings to unlock the Psalm for your current year of life.</div>
                <a href="/settings#birthday" class="bday-pop-read-btn" style="text-decoration:none;display:flex;align-items:center;justify-content:center;gap:0.4rem;">
                    <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                    Go to Settings
                </a>
            </div>
        `;
    }
}

function buildPortionSelector(todayDay) {
    const wrap = document.getElementById('psalms-portion-selector-wrap');
    if (!wrap) return;

    const portions = getAllPsalmsPortions(); // array of 30, index 0 = day 1

    // "Daily Portion" button — always navigates to today's day
    const dailyBtn = document.createElement('button');
    dailyBtn.type = 'button';
    dailyBtn.id = 'psalms-daily-btn';
    dailyBtn.className = 'psalms-daily-btn';
    dailyBtn.innerHTML = `
        <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
        Daily Portion
    `;
    dailyBtn.addEventListener('click', () => {
        closeSelector();
        closeBirthdayPopover();
        if (currentPortionDay !== todayHebrewDay) loadPortion(todayHebrewDay);
    });
    wrap.appendChild(dailyBtn);

    // Birthday Portion button
    const birthdayBtn = document.createElement('button');
    birthdayBtn.type = 'button';
    birthdayBtn.id = 'psalms-birthday-btn';
    birthdayBtn.className = 'psalms-birthday-btn';
    birthdayBtn.innerHTML = `
        <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
        </svg>
        Birthday Portion
    `;
    birthdayBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Close the portion dropdown if open
        dropdown.style.display = 'none';
        btn.classList.remove('open');
        openBirthdayPopover();
    });
    wrap.appendChild(birthdayBtn);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'psalms-portion-btn';
    btn.className = 'psalms-portion-btn';
    btn.setAttribute('aria-haspopup', 'listbox');
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = `
        <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
        </svg>
        Browse Portions
        <svg class="psalms-portion-chevron" width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/>
        </svg>
    `;
    wrap.appendChild(btn);

    // Dropdown lives on body to escape hero's overflow:hidden
    const dropdown = document.createElement('div');
    dropdown.id = 'psalms-portion-dropdown';
    dropdown.className = 'psalms-portion-dropdown';
    dropdown.setAttribute('role', 'listbox');
    dropdown.style.cssText = 'display:none;position:fixed;z-index:9000;';
    document.body.appendChild(dropdown);

    portions.forEach((portion, idx) => {
        const day = idx + 1;
        const opt = document.createElement('button');
        opt.type = 'button';
        opt.className = 'psalms-portion-option' + (day === todayDay ? ' today' : '') + (day === currentPortionDay ? ' active' : '');
        opt.setAttribute('role', 'option');
        opt.setAttribute('aria-selected', day === currentPortionDay ? 'true' : 'false');
        opt.dataset.day = day;
        opt.innerHTML = `<span class="psalms-portion-option-day">Day ${day}</span><span class="psalms-portion-option-ref">${portion.display}</span>${day === todayDay ? '<span class="psalms-portion-today-badge">Today</span>' : ''}`;
        opt.addEventListener('click', () => {
            closeSelector();
            if (day !== currentPortionDay) loadPortion(day);
        });
        dropdown.appendChild(opt);
    });

    function positionDropdown() {
        const rect = btn.getBoundingClientRect();
        dropdown.style.top = (rect.bottom + 8) + 'px';
        // Wide enough for "Day XX | Psalms XXX–XXX | Today" on one line
        const dropW = 310;
        let left = rect.left + rect.width / 2 - dropW / 2;
        left = Math.max(8, Math.min(left, window.innerWidth - dropW - 8));
        dropdown.style.left = left + 'px';
        dropdown.style.width = dropW + 'px';
    }

    function openSelector() {
        positionDropdown();
        dropdown.style.display = 'block';
        btn.setAttribute('aria-expanded', 'true');
        btn.classList.add('open');
        // Scroll active option into view
        setTimeout(() => {
            const activeOpt = dropdown.querySelector('.psalms-portion-option.active');
            if (activeOpt) activeOpt.scrollIntoView({ block: 'nearest' });
        }, 0);
    }

    function closeSelector() {
        dropdown.style.display = 'none';
        btn.setAttribute('aria-expanded', 'false');
        btn.classList.remove('open');
    }

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeBirthdayPopover();
        dropdown.style.display === 'none' ? openSelector() : closeSelector();
    });

    document.addEventListener('click', (e) => {
        if (!wrap.contains(e.target) && !dropdown.contains(e.target)) closeSelector();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeSelector();
    });

    window.addEventListener('scroll', () => {
        if (dropdown.style.display !== 'none') positionDropdown();
    }, { passive: true });

    // ── Birthday popover ───────────────────────────────────────────────────
    const birthdayPopover = document.createElement('div');
    birthdayPopover.id = 'psalms-birthday-popover';
    birthdayPopover.className = 'psalms-birthday-popover';
    birthdayPopover.style.cssText = 'display:none;position:fixed;z-index:9000;';
    document.body.appendChild(birthdayPopover);

    function positionBirthdayPopover() {
        const rect = birthdayBtn.getBoundingClientRect();
        birthdayPopover.style.top = (rect.bottom + 10) + 'px';
        const popW = 280;
        let left = rect.left + rect.width / 2 - popW / 2;
        left = Math.max(8, Math.min(left, window.innerWidth - popW - 8));
        birthdayPopover.style.left = left + 'px';
        birthdayPopover.style.width = popW + 'px';
    }

    function openBirthdayPopover() {
        // Use profile birthday (fetched at auth time), no localStorage
        renderBirthdayPopoverContent(birthdayPopover, userBirthdayDob,
            userBirthdayDob ? getBirthdayPsalmNumberFromDob(userBirthdayDob) : null);
        positionBirthdayPopover();
        birthdayPopover.style.display = 'block';
        birthdayBtn.classList.add('open');
    }

    function closeBirthdayPopover() {
        birthdayPopover.style.display = 'none';
        birthdayBtn.classList.remove('open');
    }

    document.addEventListener('click', (e) => {
        if (!wrap.contains(e.target) && !birthdayPopover.contains(e.target)) {
            closeBirthdayPopover();
        }
    });

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeBirthdayPopover();
    });

    window.addEventListener('scroll', () => {
        if (birthdayPopover.style.display !== 'none') positionBirthdayPopover();
    }, { passive: true });
}

function updatePortionSelectorActive(day) {
    document.querySelectorAll('.psalms-portion-option').forEach(opt => {
        const isActive = parseInt(opt.dataset.day) === day;
        opt.classList.toggle('active', isActive);
        opt.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
    // Dim the Daily Portion button when already on today's day
    const dailyBtn = document.getElementById('psalms-daily-btn');
    if (dailyBtn) {
        dailyBtn.style.opacity = day === todayHebrewDay ? '0.45' : '1';
        dailyBtn.style.pointerEvents = day === todayHebrewDay ? 'none' : '';
    }
}

async function loadBirthdayPortion(psalmNumber) {
    // Clear state
    verseReactionCounts = {};
    userReactions = {};
    bookmarkedVerses = new Set();
    verseBookmarkCounts = {};
    verseInteractorsCache.clear();
    pendingVerseRefs = null;
    currentPortionDay = null; // not a standard 30-day portion

    history.pushState({ birthdayPsalm: psalmNumber }, '', `${window.location.pathname}?birthday=${psalmNumber}`);

    const refDisplay = document.getElementById('psalms-ref-display');
    const dayEl = document.getElementById('psalms-hero-day');
    const combEl = document.getElementById('psalms-hero-combined');
    if (refDisplay) refDisplay.textContent = `Psalm ${psalmNumber} — Birthday Portion`;
    if (dayEl) dayEl.style.display = 'none';
    if (combEl) combEl.style.display = 'none';

    // Deactivate all portion options since this is outside the 30-day cycle
    updatePortionSelectorActive(null);

    setVisible('psalms-content', false);
    setVisible('psalms-loading', true);
    setVisible('psalms-error', false);

    try {
        const textData = await fetchParshaText(`Psalms ${psalmNumber}`);
        if (!textData) throw new Error('Could not load Psalm text.');

        setVisible('psalms-loading', false);
        setVisible('psalms-content', true);

        const verseRefs = renderVerses(textData, `Psalms ${psalmNumber}`, null);
        setupHebrewWordSelection();

        getGlobalReactionCountsForBook('Psalms').then(counts => {
            Object.assign(verseReactionCounts, counts);
            document.querySelectorAll('.verse-container[data-ref]').forEach(el => {
                updateVerseReactionUI(el, el.dataset.ref);
            });
        }).catch(() => {});

        if (currentUserId && verseRefs.length > 0) {
            await loadInteractions(verseRefs);
        } else if (verseRefs.length > 0) {
            pendingVerseRefs = verseRefs;
        }
    } catch (err) {
        console.error('Birthday portion load error:', err);
        setVisible('psalms-loading', false);
        setVisible('psalms-error', true);
        const errText = document.getElementById('psalms-error-text');
        if (errText) errText.textContent = err.message || 'Could not load this Psalm. Please try again.';
    }
}

async function loadPortion(portionDay) {
    const portion = getPsalmsPortionForDay(portionDay);
    if (!portion) return;

    currentPortionDay = portionDay;

    // Update URL without page reload so back button / sharing works
    const url = portionDay === todayHebrewDay
        ? window.location.pathname
        : `${window.location.pathname}?day=${portionDay}`;
    history.pushState({ portionDay }, '', url);

    // Update hero display
    const refDisplay = document.getElementById('psalms-ref-display');
    const heRefDisplay = document.getElementById('psalms-ref-display-he');
    const dayEl = document.getElementById('psalms-hero-day');
    const combEl = document.getElementById('psalms-hero-combined');
    if (refDisplay) refDisplay.textContent = portion.display;
    if (heRefDisplay) heRefDisplay.textContent = '';
    if (dayEl) { dayEl.textContent = `Day ${portionDay}`; dayEl.style.display = ''; }
    if (combEl) combEl.style.display = 'none';

    // Update selector UI
    updatePortionSelectorActive(portionDay);

    // Clear state and show loading
    verseReactionCounts = {};
    userReactions = {};
    bookmarkedVerses = new Set();
    verseBookmarkCounts = {};
    verseInteractorsCache.clear();
    pendingVerseRefs = null;

    setVisible('psalms-content', false);
    setVisible('psalms-loading', true);
    setVisible('psalms-error', false);

    try {
        const textData = await fetchParshaText(portion.ref);
        if (!textData) throw new Error('Could not load Psalms text.');

        setVisible('psalms-loading', false);
        setVisible('psalms-content', true);

        const verseRefs = renderVerses(textData, portion.ref, portion.ps119 || null);
        setupHebrewWordSelection();

        // Load community counts
        getGlobalReactionCountsForBook('Psalms').then(counts => {
            Object.assign(verseReactionCounts, counts);
            document.querySelectorAll('.verse-container[data-ref]').forEach(el => {
                updateVerseReactionUI(el, el.dataset.ref);
            });
        }).catch(() => {});

        if (currentUserId && verseRefs.length > 0) {
            await loadInteractions(verseRefs);
        } else if (verseRefs.length > 0) {
            pendingVerseRefs = verseRefs;
        }
    } catch (err) {
        console.error('Portion load error:', err);
        setVisible('psalms-loading', false);
        setVisible('psalms-error', true);
        const errText = document.getElementById('psalms-error-text');
        if (errText) errText.textContent = err.message || 'Could not load this portion. Please try again.';
    }
}

// ─── Main init ────────────────────────────────────────────────────────────────

async function init() {
    const refDisplay   = document.getElementById('psalms-ref-display');
    const heRefDisplay = document.getElementById('psalms-ref-display-he');

    // Auth is handled by page-auth.js (loaded on this page).
    // We just watch for the userId via getCurrentUserId() without registering
    // a competing onAuthStateChanged listener that would race with page-auth.
    (async function waitForAuth() {
        dbg('Waiting for auth (getCurrentUserId polling)…');
        const maxWait = 10000;
        const start = Date.now();
        while ((Date.now() - start) < maxWait) {
            const uid = getCurrentUserId();
            if (uid) {
                currentUserId = uid;
                authResolvedAtLeastOnce = true;
                dbg('Auth resolved via polling', { uid });
                try { recordUserLogin(uid); updateUserPresence(); } catch { /* non-critical */ }
                // Fetch birthday from Firestore profile (used by Birthday Portion button)
                getUserBirthday(uid).then(dob => {
                    if (dob) {
                        userBirthdayDob = dob;
                        // If the birthday popover is already open, re-render it with the real data
                        const popover = document.getElementById('psalms-birthday-popover');
                        if (popover && popover.style.display !== 'none') {
                            const psalmNum = getBirthdayPsalmNumberFromDob(dob);
                            renderBirthdayPopoverContent(popover, dob, psalmNum);
                        }
                    }
                }).catch(() => {});
                if (pendingVerseRefs) {
                    dbg('Loading interactions for', pendingVerseRefs.length, 'pending verses');
                    const refs = pendingVerseRefs;
                    pendingVerseRefs = null;
                    await loadInteractions(refs);
                }
                return;
            }
            await sleep(200);
        }
        dbg('Auth polling timed out — user not signed in');
        authResolvedAtLeastOnce = true;
    })();

    setVisible('psalms-loading', true);
    setVisible('psalms-content', false);
    setVisible('psalms-error', false);

    // Handle browser back/forward navigation between portions
    window.addEventListener('popstate', (e) => {
        if (e.state?.birthdayPsalm) {
            loadBirthdayPortion(e.state.birthdayPsalm);
        } else {
            const day = e.state?.portionDay || todayHebrewDay;
            if (day && day !== currentPortionDay) loadPortion(day);
        }
    });

    try {
        const psalmsInfo = await fetchDailyPsalms();
        if (!psalmsInfo || !psalmsInfo.ref) {
            throw new Error("Could not determine today's Psalms portion.");
        }

        todayHebrewDay = psalmsInfo.hebrewDay || 1;

        // Check URL params: ?birthday=N or ?day=N
        const urlParams = new URLSearchParams(window.location.search);
        const urlBirthday = parseInt(urlParams.get('birthday'));
        const urlDay = parseInt(urlParams.get('day'));
        const startDay = (urlDay >= 1 && urlDay <= 30) ? urlDay : todayHebrewDay;
        currentPortionDay = startDay;

        // Build the portion selector dropdown now that we know today's day
        buildPortionSelector(todayHebrewDay);

        // If URL has a birthday psalm, load it
        if (urlBirthday >= 1 && urlBirthday <= 150) {
            await loadBirthdayPortion(urlBirthday);
            return;
        }

        // If user requested a non-today portion, load it via loadPortion
        if (startDay !== todayHebrewDay) {
            await loadPortion(startDay);
            return;
        }

        // ── Load today's portion ──────────────────────────────────────────
        const display = psalmsInfo.display || psalmsInfo.ref;
        if (refDisplay) refDisplay.textContent = display;

        if (psalmsInfo.hebrewDay) {
            const dayEl = document.getElementById('psalms-hero-day');
            if (dayEl) { dayEl.textContent = `Day ${psalmsInfo.hebrewDay}`; dayEl.style.display = ''; }
        }
        if (psalmsInfo.combined) {
            const combEl = document.getElementById('psalms-hero-combined');
            if (combEl) { combEl.textContent = '29th & 30th portions combined'; combEl.style.display = ''; }
        }
        if (heRefDisplay && psalmsInfo.displayHe) heRefDisplay.textContent = psalmsInfo.displayHe;

        updatePortionSelectorActive(todayHebrewDay);

        // Load significance and wire up the modal
        if (psalmsInfo.hebrewDay) {
            loadDailyTehilimSummary(psalmsInfo.hebrewDay).then(entry => {
                if (entry) {
                    showSignificanceCard(entry);
                    const sigBtn = document.getElementById('psalms-significance-btn');
                    if (sigBtn) sigBtn.classList.remove('hidden');
                }
            });
        }

        const textData = await fetchParshaText(psalmsInfo.ref);
        if (!textData) throw new Error('Could not load Psalms text.');

        setVisible('psalms-loading', false);
        setVisible('psalms-content', true);

        const verseRefs = renderVerses(textData, psalmsInfo.ref, psalmsInfo.ps119);

        // Set up Hebrew word selection → Sefaria definition lookup
        setupHebrewWordSelection();

        // Load community reaction counts (visible even without personal data)
        getGlobalReactionCountsForBook('Psalms').then(counts => {
            Object.assign(verseReactionCounts, counts);
            document.querySelectorAll('.verse-container[data-ref]').forEach(el => {
                updateVerseReactionUI(el, el.dataset.ref);
            });
        }).catch(() => {});

        // Load personal interactions
        if (currentUserId && verseRefs && verseRefs.length > 0) {
            await loadInteractions(verseRefs);
        } else if (verseRefs && verseRefs.length > 0) {
            pendingVerseRefs = verseRefs;
        }

    } catch (err) {
        console.error('Psalms load error:', err);
        setVisible('psalms-loading', false);
        setVisible('psalms-error', true);
        const errText = document.getElementById('psalms-error-text');
        if (errText) errText.textContent = err.message || 'Could not load today\'s Psalms. Please try again later.';
    }
}

// ─── Hebrew word definition lookup (Sefaria) ─────────────────────────────────

function escapeHtmlLocal(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function transliterateHebrew(word) {
    const MAP = {'א':'','ב':'v','ג':'g','ד':'d','ה':'h','ו':'v','ז':'z','ח':'ch','ט':'t','י':'y','כ':'kh','ך':'kh','ל':'l','מ':'m','ם':'m','נ':'n','ן':'n','ס':'s','ע':'','פ':'f','ף':'f','צ':'ts','ץ':'ts','ק':'k','ר':'r','ש':'sh','ת':'t'};
    const base = word.replace(/[\u0591-\u05C7]/g, '');
    let result = '';
    for (const ch of base) result += MAP[ch] || '';
    return result || null;
}

function handleHebrewWordSelection() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;
    const selectedText = selection.toString().trim();
    if (!selectedText || /\s/.test(selectedText)) return;
    const anchorNode = selection.anchorNode;
    if (!anchorNode) return;
    const parentEl = anchorNode.nodeType === Node.TEXT_NODE ? anchorNode.parentElement : anchorNode;
    if (!parentEl || !parentEl.closest('.hebrew-text')) return;
    const baseWord = selectedText.replace(/[\u0591-\u05C7]/g, '');
    if (!baseWord) return;
    lookupHebrewWordSefaria(baseWord, selectedText);
}

function hebrewConsonantMatchScore(selectedConsonants, headword) {
    const headConsonants = headword.replace(/[\u0591-\u05C7]/g, '');
    if (!headConsonants) return 0;
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
    for (let i = 0; i < candidates.length; i++) {
        if (candidates[i] === headConsonants) return 3 - i;
    }
    for (const cand of candidates) {
        if (cand.length >= 2 && headConsonants.length >= 2) {
            if (cand.startsWith(headConsonants) || headConsonants.startsWith(cand)) return 0.5;
        }
    }
    return 0;
}

function renderSefariaEntry(entry, displayWord, showSource) {
    const headword = entry.headword || displayWord;
    const morphology = (entry.content && entry.content.morphology) ? entry.content.morphology.trim() : '';
    const senses = (entry.content && entry.content.senses) ? entry.content.senses : [];
    const translit = transliterateHebrew(headword);
    const source = entry.parent_lexicon || '';
    let html = `<div class="sefaria-dict"><div class="sdict-header">`;
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
            const plain = sense.definition.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
            html += `<span class="sdict-def">${escapeHtmlLocal(plain)}</span>`;
        }
        if (sense.senses && sense.senses.length > 0) {
            html += renderSefariaSenses(sense.senses, level + 1);
        }
        html += `</li>`;
    });
    html += `</ol>`;
    return html;
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

        const headerTranslit = transliterateHebrew(displayWord);
        let html = `<div class="sdict-word-header">`;
        html += `<span class="sdict-word-display">${escapeHtmlLocal(displayWord)}</span>`;
        if (headerTranslit) html += `<span class="sdict-word-translit">· ${escapeHtmlLocal(headerTranslit)}</span>`;
        html += `</div>`;

        html += renderSefariaEntry(primary, displayWord, false);

        if (others.length > 0) {
            html += `<details class="sdict-other-wrap">`;
            html += `<summary class="sdict-other-toggle">See other definitions (${others.length})</summary>`;
            html += `<div class="sdict-other-entries">`;
            others.forEach(entry => { html += renderSefariaEntry(entry, displayWord, true); });
            html += `</div></details>`;
        }

        infoContent.innerHTML = html;
        showInfoPanel();
    } catch (err) {
        console.error('Sefaria lexicon lookup failed:', err);
        showKeywordDefinition(displayWord, 'Could not load definition. Please try again.');
    }
}

function setupHebrewWordSelection() {
    const versesEl = document.getElementById('psalms-verses');
    if (!versesEl) return;
    versesEl.addEventListener('mouseup', handleHebrewWordSelection);
    versesEl.addEventListener('touchend', () => {
        setTimeout(handleHebrewWordSelection, 120);
    });

    // Close panel button
    const closeBtn = document.getElementById('close-panel-button');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            const panel = document.getElementById('info-panel');
            if (panel) {
                panel.classList.remove('is-visible');
                setTimeout(() => panel.classList.add('hidden'), 250);
                document.body.style.overflow = '';
            }
        });
    }
}

window.addEventListener('beforeunload', () => {
    if (currentUserId) { try { markUserOffline(currentUserId); } catch { /* non-critical */ } }
});

document.addEventListener('DOMContentLoaded', init);
