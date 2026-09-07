// Weekly Torah Reading Calendar
// ─────────────────────────────────────────────────────────────────────────────
// Answers "what is read this Shabbat?" from a precomputed, exact schedule
// (js/parsha-calendar-data.js) instead of asking an API and string-matching the
// answer. That earlier approach produced two real bugs:
//
//   • Double parshiyot ("Nitzavim-Vayeilech") matched only the second half, so
//     the reader was sent to Vayeilech alone with no sign it was a double week.
//   • Holiday Shabbatot ("Rosh Hashana I") matched nothing, and the page fell
//     all the way back to Bereshit.
//
// The table covers both the Diaspora and Israel schedules and is verified
// against Sefaria's live calendar by dev/verify_parsha_calendar.py.

import { TORAH_PARSHAS } from './config.js';
import { PARSHA_CALENDAR } from './parsha-calendar-data.js';

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

const TOKENS = {
    diaspora: PARSHA_CALENDAR.weeks.diaspora.split(','),
    israel: PARSHA_CALENDAR.weeks.israel.split(',')
};

/** Midnight-UTC timestamp of a local calendar date — DST-proof week arithmetic. */
function utcDayOf(date) {
    return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

const BASE_UTC = (() => {
    const [y, m, d] = PARSHA_CALENDAR.meta.firstShabbat.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
})();

/** "YYYY-MM-DD" for a local calendar date — never shifted by toISOString(). */
export function toLocalDateString(date) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * The Shabbat whose reading belongs to `date`'s week.
 * Weeks run Sunday → Saturday, so Sunday through Saturday all resolve to the
 * upcoming (or current) Saturday. This matches how Sefaria and Hebcal roll the
 * weekly portion over.
 */
export function getShabbatOfWeek(date = new Date()) {
    const shabbat = new Date(date);
    shabbat.setHours(0, 0, 0, 0);
    shabbat.setDate(shabbat.getDate() + (6 - shabbat.getDay()));
    return shabbat;
}

function weekIndexOf(shabbat) {
    return Math.round((utcDayOf(shabbat) - BASE_UTC) / MS_PER_WEEK);
}

function tokensFor(isDiaspora) {
    return isDiaspora === false ? TOKENS.israel : TOKENS.diaspora;
}

/**
 * Merge two consecutive parsha references into the combined range a double
 * parsha is read as: "Deuteronomy 29:9-30:20" + "Deuteronomy 31:1-31:30"
 * → "Deuteronomy 29:9-31:30".
 */
function combineReferences(first, second) {
    const start = first.reference.split('-')[0];              // "Deuteronomy 29:9"
    const end = second.reference.split('-').pop();            // "31:30"
    return `${start}-${end}`;
}

function decodeToken(token, shabbat) {
    const [core, labelIndex] = token.split('@');
    const specialShabbat = labelIndex === undefined
        ? null
        : (PARSHA_CALENDAR.labels[Number(labelIndex)] || null);

    const shabbatDate = toLocalDateString(shabbat);

    if (core.charAt(0) === 'H') {
        const holiday = PARSHA_CALENDAR.holidays[Number(core.slice(1))];
        if (!holiday) return null;
        return {
            kind: 'holiday',
            shabbatDate,
            name: holiday.name,
            // Stable identity key (a "special:…" id), so comments, reactions
            // and bookmarks on a festival reading persist year to year even
            // though the maftir itself can shift.
            ref: holiday.id,
            hebrewName: holiday.nameHe || null,
            sections: holiday.sections,
            megillah: holiday.megillah || null,
            specialShabbat,
            isDouble: false,
            parshas: [],
            parshaIndexes: []
        };
    }

    const numbers = core.split('+').map(Number);
    const parshas = numbers.map(n => TORAH_PARSHAS[n - 1]).filter(Boolean);
    if (parshas.length !== numbers.length) return null;

    const isDouble = parshas.length > 1;
    return {
        kind: 'parsha',
        shabbatDate,
        name: parshas.map(p => p.name).join('-'),
        // Maqaf (־), the joiner Hebrew uses for a double portion.
        hebrewName: numbers.map(n => PARSHA_CALENDAR.hebrewNames[n - 1]).join('\u05be'),
        // Identity ref stays the last parsha's own reference so comment /
        // reaction / bookmark keys are unchanged from before.
        ref: parshas[parshas.length - 1].reference,
        combinedRef: isDouble ? combineReferences(parshas[0], parshas[1]) : parshas[0].reference,
        specialShabbat,
        isDouble,
        parshas,
        parshaIndexes: numbers.map(n => n - 1)
    };
}

/**
 * The reading for `date`'s week.
 * Returns null only when the date falls outside the shipped table, in which
 * case the caller should fall back to the live calendar API.
 */
export function getReadingForDate(date = new Date(), isDiaspora = true) {
    const shabbat = getShabbatOfWeek(date);
    const index = weekIndexOf(shabbat);
    const tokens = tokensFor(isDiaspora);
    if (index < 0 || index >= tokens.length) return null;
    return decodeToken(tokens[index], shabbat);
}

/**
 * The reading for the Shabbat `weeks` weeks after `date`'s week.
 * Used to find when a given parsha is next read.
 */
function getReadingOffsetBy(weeks, date, isDiaspora) {
    const shabbat = getShabbatOfWeek(date);
    shabbat.setDate(shabbat.getDate() + weeks * 7);
    const index = weekIndexOf(shabbat);
    const tokens = tokensFor(isDiaspora);
    if (index < 0 || index >= tokens.length) return null;
    return decodeToken(tokens[index], shabbat);
}

/**
 * Is this parsha read together with its neighbour in the reading year the user
 * is currently in? Returns the combined reading, or null when it stands alone.
 *
 * Which pairs combine changes from year to year — it depends on the Hebrew
 * leap year, which day Rosh Hashanah falls on, and (for a stretch each spring)
 * whether you keep the Israel or Diaspora schedule. Rather than reimplement
 * those rules, we look up the parsha's next occurrence in the table.
 */
export function getReadingForParsha(parshaIndex, date = new Date(), isDiaspora = true) {
    if (!Number.isInteger(parshaIndex) || parshaIndex < 0) return null;
    // A parsha is read exactly once a year, so it is within 54 weeks either
    // way. Look forward first: "when is this next read" is the more useful
    // answer while browsing ahead.
    for (const direction of [1, -1]) {
        for (let offset = 0; offset <= 54; offset++) {
            const reading = getReadingOffsetBy(direction * offset, date, isDiaspora);
            if (reading && reading.kind === 'parsha'
                && reading.parshaIndexes.includes(parshaIndex)) {
                return reading;
            }
        }
    }
    return null;
}

/**
 * Which Shabbat a parsha falls on in the annual cycle the reader is currently
 * in. The cycle restarts at Simchat Torah — the Shabbat after it reads
 * Bereshit — so this answers "when was/is this portion read *this* year",
 * looking back to the start of the cycle rather than jumping to next year's.
 *
 * Returns null for V'Zot HaBerachah, which is read on Simchat Torah itself and
 * so has no Shabbat of its own in the Diaspora cycle.
 */
export function getCycleReading(parshaIndex, date = new Date(), isDiaspora = true) {
    if (!Number.isInteger(parshaIndex) || parshaIndex < 0) return null;

    // Walk back to the Shabbat this cycle opened on.
    let cycleStart = null;
    for (let offset = 0; offset <= 56; offset++) {
        const reading = getReadingOffsetBy(-offset, date, isDiaspora);
        if (!reading) break;
        if (reading.kind === 'parsha' && reading.parshaIndexes.includes(0)) {
            cycleStart = -offset;
            break;
        }
    }

    // Before the first Bereshit the table covers: fall back to the nearest
    // occurrence in either direction.
    if (cycleStart === null) {
        return getReadingForParsha(parshaIndex, date, isDiaspora);
    }

    for (let offset = cycleStart; offset <= cycleStart + 56; offset++) {
        const reading = getReadingOffsetBy(offset, date, isDiaspora);
        if (!reading) break;
        if (reading.kind !== 'parsha') continue;
        // Bereshit coming round again means we've run into the next cycle.
        if (offset > cycleStart && reading.parshaIndexes.includes(0)) break;
        if (reading.parshaIndexes.includes(parshaIndex)) return reading;
    }
    return null;
}

/**
 * The parsha the annual cycle has most recently reached as of `date`.
 *
 * On a festival Shabbat no weekly portion is read at all, which leaves the
 * prev/next browser with nothing to anchor to. Anchoring it to the last parsha
 * actually read keeps stepping forward and back sensible through Tishrei and
 * Pesach. Returns -1 when nothing is found.
 */
export function getNearestParshaIndex(date = new Date(), isDiaspora = true) {
    for (let offset = 0; offset <= 5; offset++) {
        const reading = getReadingOffsetBy(-offset, date, isDiaspora);
        if (reading && reading.kind === 'parsha') {
            return reading.parshaIndexes[reading.parshaIndexes.length - 1];
        }
    }
    return -1;
}

export const CALENDAR_RANGE = PARSHA_CALENDAR.meta;
