// Daily Psalms (Tehillim) page module
import { fetchDailyPsalms, fetchParshaText } from './api.js';
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
    recordUserLogin,
    updateUserPresence,
    markUserOffline
} from './firebase.js';
import {
    showInfoPanel,
    showKeywordDefinition
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


    try {
        const psalmsInfo = await fetchDailyPsalms();
        if (!psalmsInfo || !psalmsInfo.ref) {
            throw new Error("Could not determine today's Psalms portion.");
        }

        // Update hero header
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
