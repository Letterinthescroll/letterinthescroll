import { PARSHA_TEASERS, HOLIDAY_TEASERS } from './teasers.js';

// Sefaria's calendar API returns the upcoming Shabbat's parsha + the day's
// readings. https://www.sefaria.org/api/calendars
const SEFARIA_CALENDAR = 'https://www.sefaria.org/api/calendars?diaspora=1';

/**
 * Look up the upcoming parsha and a teaser. Returns:
 *   { name, hebrewName, ref, sefariaUrl, teaser, isHoliday, holidayName }
 *
 * If Sefaria flags the week as a holiday with no regular parsha (Pesach/
 * Sukkot/Shavuot etc.), we set isHoliday=true and return a holiday teaser
 * + the holiday name.
 */
export async function getCurrentParsha() {
  const res = await fetch(SEFARIA_CALENDAR, {
    headers: { 'User-Agent': 'aletterinthescroll.com weekly-reminder' }
  });
  if (!res.ok) throw new Error(`Sefaria API returned ${res.status}`);
  const data = await res.json();

  // Sefaria returns calendar_items[] — find the Parashat Hashavua entry.
  const items = Array.isArray(data.calendar_items) ? data.calendar_items : [];
  const parshaItem = items.find(it =>
    it.title && (it.title.en === 'Parashat Hashavua' || it.title.en === 'Torah Reading')
  );

  // Detect holiday weeks where no regular parsha is read. Sefaria sometimes
  // reports a Yom Tov reading as the parsha; we check for known holiday
  // markers in the displayValue.
  const holidayItem = items.find(it =>
    it.title && (it.title.en === 'Holiday Torah Reading' || (it.displayValue && /Pesach|Sukkot|Shavuot|Rosh Hashanah|Yom Kippur|Shemini Atzeret|Simchat Torah/i.test(it.displayValue.en || '')))
  );

  if (parshaItem && parshaItem.displayValue && parshaItem.displayValue.en) {
    const englishName = parshaItem.displayValue.en.trim();
    const hebrewName = (parshaItem.displayValue.he || '').trim();
    const ref = parshaItem.ref || '';
    const teaser = PARSHA_TEASERS[englishName] || PARSHA_TEASERS[normalizeName(englishName)] || defaultTeaser(englishName);

    return {
      name: englishName,
      hebrewName,
      ref,
      heRef: (parshaItem.heRef || '').trim(),
      sefariaUrl: ref ? `https://www.sefaria.org/${encodeURIComponent(ref.replace(/\s+/g, '_'))}` : '',
      teaser,
      isHoliday: false,
      holidayName: null
    };
  }

  // Fallback: holiday week
  if (holidayItem) {
    const display = (holidayItem.displayValue && holidayItem.displayValue.en) || '';
    const holidayName = matchHoliday(display) || 'this special week';
    return {
      name: display || holidayName,
      hebrewName: (holidayItem.displayValue && holidayItem.displayValue.he) || '',
      ref: holidayItem.ref || '',
      sefariaUrl: holidayItem.ref ? `https://www.sefaria.org/${encodeURIComponent(holidayItem.ref.replace(/\s+/g, '_'))}` : '',
      teaser: HOLIDAY_TEASERS[holidayName] || `It's ${holidayName} this week — a special time in the Jewish calendar with its own meaningful readings. Take a moment to study together with your chavruta.`,
      isHoliday: true,
      holidayName
    };
  }

  // Last resort
  throw new Error('Could not determine current parsha from Sefaria response');
}

// "Vayechi" / "Vayeshev" sometimes return with extra Hebrew transliteration variants
function normalizeName(name) {
  return name
    .replace(/'/g, "'")
    .replace(/[^A-Za-z\- ]/g, '')
    .trim();
}

function matchHoliday(display) {
  const map = [
    ['Pesach', 'Pesach'], ['Passover', 'Pesach'],
    ['Sukkot', 'Sukkot'],
    ['Shavuot', 'Shavuot'],
    ['Rosh Hashanah', 'Rosh Hashanah'],
    ['Yom Kippur', 'Yom Kippur'],
    ['Shemini Atzeret', 'Shemini Atzeret'],
    ['Simchat Torah', 'Simchat Torah']
  ];
  for (const [needle, key] of map) {
    if (display.toLowerCase().includes(needle.toLowerCase())) return key;
  }
  return null;
}

function defaultTeaser(name) {
  return `This week we read ${name} — a beautiful portion of the Torah waiting for you. Open it together with your chavruta and discover what speaks to you this Shabbat.`;
}
