// API Service Module
import { API_CONFIG } from './config.js';

// ─── localStorage cache helpers ───────────────────────────────────────────────
const CACHE_V = 'v1';
const TEXT_TTL  = 8  * 24 * 60 * 60 * 1000; // 8 days  — text never changes
const REF_TTL   = 7  * 24 * 60 * 60 * 1000; // 7 days   — parsha changes weekly

function _cacheGet(key) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const { data, expires } = JSON.parse(raw);
        return Date.now() < expires ? data : null;
    } catch { return null; }
}

function _cacheSet(key, data, ttl) {
    try {
        localStorage.setItem(key, JSON.stringify({ data, expires: Date.now() + ttl }));
    } catch { /* storage full or unavailable — silently skip */ }
}

/** Return cached parsha text for `parshaRef`, or null if absent/stale. */
function getCachedParshaText(parshaRef) {
    return _cacheGet(`sefaria_text_${CACHE_V}_${parshaRef}`);
}

function cacheParshaText(parshaRef, data) {
    _cacheSet(`sefaria_text_${CACHE_V}_${parshaRef}`, data, TEXT_TTL);
}

/** Return { name, ref } for this week's parsha from cache, or null. */
export function getCachedCurrentParsha() {
    return _cacheGet(`sefaria_weekly_${CACHE_V}`);
}

/** Persist this week's parsha { name, ref } so next visit starts instantly. */
export function cacheCurrentParsha(name, ref) {
    _cacheSet(`sefaria_weekly_${CACHE_V}`, { name, ref }, REF_TTL);
}
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Fetch current week's parsha from Sefaria calendar
 */
export async function fetchCurrentParsha() {
    try {
        const response = await fetch(`${API_CONFIG.SEFARIA_BASE}/calendars`);
        if (!response.ok) return null;
        
        const data = await response.json();
        if (data.calendar_items) {
            const parashatHashavua = data.calendar_items.find(
                item => item.title && item.title.en === 'Parashat Hashavua'
            );
            if (parashatHashavua && parashatHashavua.displayValue) {
                return parashatHashavua.displayValue.en;
            }
        }
        return null;
    } catch (error) {
        return null;
    }
}

/**
 * Fetch Torah text for a specific parsha reference using v3 API.
 * Returns cached data instantly on repeat visits (8-day TTL).
 */
export async function fetchParshaText(parshaRef) {
    const cached = getCachedParshaText(parshaRef);
    if (cached) {
        return cached;
    }
    return _fetchAndCacheParshaText(parshaRef);
}

async function _fetchAndCacheParshaText(parshaRef) {
    try {
        // Use v3 API endpoint with text_only format to strip all annotations
        const apiUrl = `${API_CONFIG.SEFARIA_BASE}/v3/texts/${encodeURIComponent(parshaRef)}?version=english&version=hebrew&return_format=text_only`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

        const response = await fetch(apiUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();

        // Transform v3 response to expected format and cache it
        const result = transformV3Response(data);
        cacheParshaText(parshaRef, result);
        return result;
    } catch (error) {
        console.error('Error in fetchParshaText:', error);
        // Fallback to v1 API if v3 fails
        return fetchParshaTextV1(parshaRef);
    }
}

/**
 * Fallback to v1 API if v3 fails
 */
async function fetchParshaTextV1(parshaRef) {
    const apiUrl = `${API_CONFIG.SEFARIA_BASE}/texts/${encodeURIComponent(parshaRef)}?context=0&commentary=0`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    try {
        const response = await fetch(apiUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();

        // Clean the v1 API response text as well
        if (data.text) {
            data.text = cleanTextArray(data.text);
        }

        return data;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

/**
 * Minimal text cleanup (safety layer)
 * Since we're using return_format=text_only, most cleaning is done by Sefaria
 * This just handles any edge cases or HTML entities that might remain
 */
function cleanSefariaAnnotations(text) {
    if (!text || typeof text !== 'string') return text;
    
    let cleaned = text;
    
    // Decode any HTML entities that might remain
    const temp = document.createElement('textarea');
    temp.innerHTML = cleaned;
    cleaned = temp.value;
    
    // Remove any stray HTML tags (shouldn't be any with text_only, but just in case)
    cleaned = cleaned.replace(/<[^>]+>/g, '');
    
    // Clean up extra whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    return cleaned;
}

/**
 * Recursively clean text arrays
 */
function cleanTextArray(textArray) {
    if (!Array.isArray(textArray)) {
        return cleanSefariaAnnotations(textArray);
    }
    
    return textArray.map(item => {
        if (Array.isArray(item)) {
            return cleanTextArray(item);
        }
        return cleanSefariaAnnotations(item);
    });
}

/**
 * Transform v3 API response to expected format
 */
function transformV3Response(v3Data) {
    // v3 API returns versions array with text and language info
    const englishVersion = v3Data.versions?.find(v => 
        v.languageFamilyName === 'english' || v.language === 'en'
    );
    const hebrewVersion = v3Data.versions?.find(v => 
        v.languageFamilyName === 'hebrew' || v.language === 'he'
    );
    
    // If no versions found, try to use the data directly
    const rawEnglishText = englishVersion?.text || v3Data.text || [];
    const hebrewText = hebrewVersion?.text || v3Data.he || [];
    
    // Clean the English text of all Sefaria annotations
    const englishText = cleanTextArray(rawEnglishText);
    
    return {
        book: v3Data.indexTitle || v3Data.title || 'Torah',
        sections: v3Data.sections || [1],
        text: englishText,
        he: hebrewText,
        ref: v3Data.ref,
        heRef: v3Data.heRef,
        indexTitle: v3Data.indexTitle,
        sectionRef: v3Data.sectionRef
    };
}

/**
 * Load local commentary data from data.json
 */
export async function loadCommentaryData() {
    try {
        const response = await fetch('data/data.json');
        if (!response.ok) {
            throw new Error('Failed to load commentary data');
        }
        return await response.json();
    } catch (error) {
        console.error('Error loading commentary data:', error);
        return { parshas: [] };
    }
}

// ─── Daily Psalms — Chabad 30-day monthly cycle ───────────────────────────────
const PSALMS_TTL = 24 * 60 * 60 * 1000;

const _PORTIONS = [
    null,
    { ref: 'Psalms 1-9',        display: 'Psalms 1–9'         },
    { ref: 'Psalms 10-17',      display: 'Psalms 10–17'       },
    { ref: 'Psalms 18-22',      display: 'Psalms 18–22'       },
    { ref: 'Psalms 23-28',      display: 'Psalms 23–28'       },
    { ref: 'Psalms 29-34',      display: 'Psalms 29–34'       },
    { ref: 'Psalms 35-38',      display: 'Psalms 35–38'       },
    { ref: 'Psalms 39-43',      display: 'Psalms 39–43'       },
    { ref: 'Psalms 44-48',      display: 'Psalms 44–48'       },
    { ref: 'Psalms 49-54',      display: 'Psalms 49–54'       },
    { ref: 'Psalms 55-59',      display: 'Psalms 55–59'       },
    { ref: 'Psalms 60-65',      display: 'Psalms 60–65'       },
    { ref: 'Psalms 66-68',      display: 'Psalms 66–68'       },
    { ref: 'Psalms 69-71',      display: 'Psalms 69–71'       },
    { ref: 'Psalms 72-76',      display: 'Psalms 72–76'       },
    { ref: 'Psalms 77-78',      display: 'Psalms 77–78'       },
    { ref: 'Psalms 79-82',      display: 'Psalms 79–82'       },
    { ref: 'Psalms 83-87',      display: 'Psalms 83–87'       },
    { ref: 'Psalms 88-89',      display: 'Psalms 88–89'       },
    { ref: 'Psalms 90-96',      display: 'Psalms 90–96'       },
    { ref: 'Psalms 97-103',     display: 'Psalms 97–103'      },
    { ref: 'Psalms 104-105',    display: 'Psalms 104–105'     },
    { ref: 'Psalms 106-107',    display: 'Psalms 106–107'     },
    { ref: 'Psalms 108-112',    display: 'Psalms 108–112'     },
    { ref: 'Psalms 113-118',    display: 'Psalms 113–118'     },
    { ref: 'Psalms 119:1-96',   display: 'Psalm 119 (א–ל)',  ps119: 'a' },
    { ref: 'Psalms 119:97-176', display: 'Psalm 119 (מ–ת)', ps119: 'b' },
    { ref: 'Psalms 120-134',    display: 'Psalms 120–134'     },
    { ref: 'Psalms 135-139',    display: 'Psalms 135–139'     },
    { ref: 'Psalms 140-144',    display: 'Psalms 140–144'     },
    { ref: 'Psalms 145-150',    display: 'Psalms 145–150'     },
];

function _getHebrewInfo() {
    const fmt = new Intl.DateTimeFormat('en-US-u-ca-hebrew', { day: 'numeric', month: 'numeric', year: 'numeric' });
    const now = new Date();
    const tp = Object.fromEntries(fmt.formatToParts(now).map(p => [p.type, p.value]));
    const hebrewDay = parseInt(tp.day, 10);
    const hebrewMonth = parseInt(tp.month, 10);
    const probe = new Date(now);
    probe.setDate(now.getDate() + (30 - hebrewDay));
    const pp = Object.fromEntries(fmt.formatToParts(probe).map(p => [p.type, p.value]));
    const daysInMonth = (parseInt(pp.month, 10) === hebrewMonth) ? 30 : 29;
    return { hebrewDay, daysInMonth };
}

export function getCachedDailyPsalms() {
    return _cacheGet(`sefaria_psalms_${CACHE_V}`);
}

export async function fetchDailyPsalms() {
    const cached = getCachedDailyPsalms();
    if (cached) return cached;
    try {
        const { hebrewDay, daysInMonth } = _getHebrewInfo();
        const day = Math.min(Math.max(hebrewDay, 1), 30);
        const combined = (day === 29 && daysInMonth === 29);
        let result;
        if (combined) {
            result = { ref: 'Psalms 140-150', display: 'Psalms 140–150', displayNote: '(29th & 30th combined)', hebrewDay: day, daysInMonth, combined: true };
        } else {
            const p = _PORTIONS[day];
            result = { ref: p.ref, display: p.display, ps119: p.ps119 || null, hebrewDay: day, daysInMonth, combined: false };
        }
        _cacheSet(`sefaria_psalms_${CACHE_V}`, result, PSALMS_TTL);
        return result;
    } catch {
        return null;
    }
}
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Load mitzvah challenge data
 */
export async function loadMitzvahChallenges() {
    try {
        const response = await fetch('data/mitzvah-challenges.json');
        if (!response.ok) {
            throw new Error('Failed to load mitzvah challenge data');
        }
        const data = await response.json();
        if (!data || !Array.isArray(data.challenges)) {
            return { challenges: [] };
        }
        return data;
    } catch (error) {
        console.error('Error loading mitzvah challenges:', error);
        return { challenges: [] };
    }
}
