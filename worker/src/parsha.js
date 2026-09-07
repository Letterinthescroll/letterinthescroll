import { PARSHA_TEASERS, HOLIDAY_TEASERS } from './teasers.js';
import { getReadingForDate } from '../../js/parsha-calendar.js';

// The weekly email used to ask Sefaria's calendar API what to read and trust
// its display name. That broke the same two ways the study page did: a double
// portion came through as one hyphenated string nothing matched, and a festival
// Shabbat ("Rosh Hashana I") was reported as if it were the week's parsha.
//
// It now reads the same precomputed calendar the site ships, so the email and
// the website can never disagree about which parsha it is. Emails follow the
// Diaspora schedule.
const DIASPORA = true;

/**
 * Look up the upcoming Shabbat's reading. Returns:
 *   { name, hebrewName, ref, heRef, sefariaUrl, teaser, isHoliday, holidayName,
 *     parts, isDouble, shabbatDate }
 *
 * On a festival Shabbat with no weekly portion (Pesach/Sukkot/Rosh Hashanah
 * etc.) isHoliday is true and holidayName carries the festival.
 */
export function getCurrentParsha() {
  const reading = getReadingForDate(new Date(), DIASPORA);
  if (!reading) {
    throw new Error(
      'Date falls outside the shipped Torah-reading calendar — regenerate ' +
      'js/parsha-calendar-data.js with dev/generate_parsha_calendar.py'
    );
  }

  if (reading.kind === 'holiday') {
    const holidayName = matchHoliday(reading.name) || reading.name;
    const ref = (reading.sections[0] && reading.sections[0].ref) || '';
    return {
      name: reading.name,
      hebrewName: reading.hebrewName || '',
      ref,
      heRef: '',
      sefariaUrl: sefariaUrl(ref),
      teaser: HOLIDAY_TEASERS[holidayName]
        || `It's ${holidayName} this week — a special time in the Jewish calendar with its own meaningful readings. Take a moment to study together with your chavruta.`,
      isHoliday: true,
      holidayName,
      parts: [],
      isDouble: false,
      shabbatDate: reading.shabbatDate
    };
  }

  // A double portion is read as one continuous passage, so the email links to
  // the combined range rather than half of it.
  const ref = reading.combinedRef;
  const parts = reading.parshas.map(p => p.name);

  return {
    name: reading.name,
    hebrewName: reading.hebrewName || '',
    ref,
    heRef: '',
    sefariaUrl: sefariaUrl(ref),
    teaser: teaserFor(reading.name, parts),
    isHoliday: false,
    holidayName: null,
    parts,
    isDouble: reading.isDouble,
    shabbatDate: reading.shabbatDate
  };
}

function sefariaUrl(ref) {
  return ref ? `https://www.sefaria.org/${encodeURIComponent(ref.replace(/\s+/g, '_'))}` : '';
}

/**
 * Transliterations of parsha names vary ("Vayera" / "Vayeira", "Sh'lach" /
 * "Shlach", "V'Zot HaBerachah" / "Vezot Haberakhah"), and teasers.js was
 * written with its own spellings. Reducing a name to its consonant skeleton
 * matches them all without a hand-maintained alias table.
 */
function nameSkeleton(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/kh/g, 'ch')
    .replace(/[^a-z]/g, '')
    .replace(/[aeiou]/g, '')
    .replace(/h+$/, '');
}

const TEASERS_BY_SKELETON = new Map(
  Object.keys(PARSHA_TEASERS).map(key => [nameSkeleton(key), PARSHA_TEASERS[key]])
);

/** Teaser for the week: the combined portion's own, else either half's. */
function teaserFor(name, parts) {
  for (const candidate of [name, ...parts]) {
    const teaser = PARSHA_TEASERS[candidate] || TEASERS_BY_SKELETON.get(nameSkeleton(candidate));
    if (teaser) return teaser;
  }
  return `This week we read ${name} — a beautiful portion of the Torah waiting for you. Open it together with your chavruta and discover what speaks to you this Shabbat.`;
}

function matchHoliday(display) {
  const map = [
    ['Pesach', 'Pesach'], ['Passover', 'Pesach'],
    ['Sukkot', 'Sukkot'],
    ['Shavuot', 'Shavuot'],
    ['Rosh Hashanah', 'Rosh Hashanah'], ['Rosh Hashana', 'Rosh Hashanah'],
    ['Yom Kippur', 'Yom Kippur'],
    ['Shemini Atzeret', 'Shemini Atzeret'], ['Shmini Atzeret', 'Shemini Atzeret'],
    ['Simchat Torah', 'Simchat Torah']
  ];
  for (const [needle, key] of map) {
    if (display.toLowerCase().includes(needle.toLowerCase())) return key;
  }
  return null;
}
