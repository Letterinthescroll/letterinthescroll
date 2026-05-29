// Fetches the full Hebrew text of a parsha (or any Sefaria ref) from the
// Sefaria v3 API and normalizes it into a flat list of { chapter, verse, he }
// rows so the email template doesn't have to think about nested arrays.

const SEFARIA_V3 = 'https://www.sefaria.org/api/v3/texts';

/**
 * @param {string} ref e.g. "Numbers 4:21-7:89"
 * @returns {Promise<{
 *   ref: string,
 *   heRef: string,
 *   startChapter: number,
 *   startVerse: number,
 *   endChapter: number,
 *   endVerse: number,
 *   verses: Array<{ chapter: number, verse: number, he: string }>
 * }>}
 */
export async function fetchParshaHebrew(ref) {
  if (!ref) throw new Error('fetchParshaHebrew: empty ref');
  const url = `${SEFARIA_V3}/${encodeURIComponent(ref)}?version=hebrew&return_format=text_only`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'aletterinthescroll.com weekly-reminder' }
  });
  if (!res.ok) throw new Error(`Sefaria v3 returned ${res.status} for ${ref}`);
  const data = await res.json();

  const versions = Array.isArray(data.versions) ? data.versions : [];
  const heVersion = versions.find(v => v && v.language === 'he' && Array.isArray(v.text))
    || versions.find(v => v && Array.isArray(v.text));
  if (!heVersion) throw new Error(`Sefaria v3: no Hebrew text for ${ref}`);

  const startChapter = parseInt((data.sections || [])[0], 10);
  const startVerse = parseInt((data.sections || [])[1], 10);
  const endChapter = parseInt((data.toSections || [])[0], 10);
  const endVerse = parseInt((data.toSections || [])[1], 10);

  const verses = [];
  const raw = heVersion.text;

  if (Array.isArray(raw) && raw.length && Array.isArray(raw[0])) {
    // Nested: [chapter][verse]. Chapter offset = startChapter.
    raw.forEach((chapterVerses, chapIdx) => {
      const chapter = startChapter + chapIdx;
      // The first chapter starts at startVerse, not 1. Subsequent chapters
      // start at 1.
      const verseOffset = chapIdx === 0 ? startVerse : 1;
      chapterVerses.forEach((he, vIdx) => {
        if (typeof he !== 'string') return;
        const cleaned = cleanHebrew(he);
        if (!cleaned) return;
        verses.push({ chapter, verse: verseOffset + vIdx, he: cleaned });
      });
    });
  } else if (Array.isArray(raw)) {
    // Flat: all verses are in startChapter.
    raw.forEach((he, vIdx) => {
      if (typeof he !== 'string') return;
      const cleaned = cleanHebrew(he);
      if (!cleaned) return;
      verses.push({ chapter: startChapter, verse: startVerse + vIdx, he: cleaned });
    });
  } else {
    throw new Error(`Sefaria v3: unexpected text shape for ${ref}`);
  }

  return {
    ref: data.ref || ref,
    heRef: data.heRef || '',
    startChapter,
    startVerse,
    endChapter,
    endVerse,
    verses
  };
}

// Strip the leftover formatting Sefaria text_only doesn't fully clean:
// stray HTML entities, parashah-break braces like {פ}/{ס}, and excess
// whitespace. We keep the niqqud / cantillation marks.
function cleanHebrew(s) {
  if (typeof s !== 'string') return '';
  let out = s;
  // Common HTML entities Sefaria leaves behind
  out = out.replace(/&nbsp;/g, ' ')
           .replace(/&thinsp;/g, ' ')
           .replace(/&amp;/g, '&')
           .replace(/&lt;/g, '<')
           .replace(/&gt;/g, '>')
           .replace(/&quot;/g, '"')
           .replace(/&#39;/g, "'");
  // Strip any residual HTML tags
  out = out.replace(/<[^>]+>/g, '');
  // Remove parashah/setumah markers like {פ}, {ס}, {ש}
  out = out.replace(/\{[פסש]\}/g, '');
  // Collapse whitespace
  out = out.replace(/\s+/g, ' ').trim();
  return out;
}
