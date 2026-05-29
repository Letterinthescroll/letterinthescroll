// Hebrew weekly-parsha email. Body is mostly Hebrew (RTL), with a thin
// English link strip at the very top so the "View in browser" fallback is
// readable even if the user's mail client is set to LTR.

const HEB_BOOK_NAMES = {
  Genesis: 'בְּרֵאשִׁית',
  Exodus: 'שְׁמוֹת',
  Leviticus: 'וַיִּקְרָא',
  Numbers: 'בְּמִדְבַּר',
  Deuteronomy: 'דְּבָרִים'
};

/**
 * @param {object} p
 * @param {string} p.parshaName        English, e.g. "Nasso"
 * @param {string} p.hebrewName        Hebrew, e.g. "נשא"
 * @param {string} p.heRef             e.g. "במדבר ד׳:כ״א-ז׳:פ״ט"
 * @param {string} p.ref               e.g. "Numbers 4:21-7:89"
 * @param {string} p.book              e.g. "Numbers" (derived from ref)
 * @param {Array<{chapter:number, verse:number, he:string}>} p.verses
 * @param {string} p.readerUrl         "View in browser" / public-page link
 * @param {string} p.siteUrl
 * @param {object} [p.significance]    Optional { nameMeaning, context, summary, significance }
 *                                     fields. Hebrew preferred; English used as a graceful fallback.
 */
export function buildParshaEmail(p) {
  const HEB_STACK = "'SBL Hebrew','Frank Ruhl Libre','Noto Serif Hebrew','David','Times New Roman',serif";
  const SAN_STACK = "-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',Roboto,Helvetica,Arial,sans-serif";

  const heBook = HEB_BOOK_NAMES[p.book] || '';
  const hebrewName = (p.hebrewName || '').trim();
  const parshaLabel = hebrewName ? `פָּרָשַׁת ${hebrewName}` : `הפרשה`;

  // Group verses by chapter so we can emit a chapter header before each run.
  const chapters = [];
  let current = null;
  for (const v of p.verses) {
    if (!current || current.chapter !== v.chapter) {
      current = { chapter: v.chapter, verses: [] };
      chapters.push(current);
    }
    current.verses.push(v);
  }

  // Significance / context / summary block. Each field is optional;
  // we skip blocks that have no Hebrew (and no English) text so the email
  // stays clean if the data file is partial.
  const SIG_FIELDS = [
    { key: 'nameMeaning',  he: 'משמעות השם' },
    { key: 'context',      he: 'הקשר' },
    { key: 'summary',      he: 'סיכום' },
    { key: 'significance', he: 'משמעות' }
  ];
  const sig = p.significance || {};
  const sigBlocks = SIG_FIELDS
    .map(f => {
      const text = cleanSig(sig[f.key]);
      if (!text) return '';
      return `
        <div style="margin:0 0 18px;">
          <p style="margin:0 0 6px;font-family:${SAN_STACK};font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#a08a4f;direction:rtl;text-align:right;">
            ${escapeHtml(f.he)}
          </p>
          <p style="margin:0;font-family:${HEB_STACK};direction:rtl;text-align:right;font-size:16px;line-height:1.9;color:#1a2744;">
            ${escapeHtml(text)}
          </p>
        </div>`;
    })
    .join('');

  const significanceHtml = sigBlocks ? `
        <!-- Significance / context -->
        <tr><td style="padding:24px 56px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" dir="rtl" style="background:#fdfaf3;border-radius:18px;border:1px solid rgba(200,154,53,0.18);direction:rtl;">
            <tr><td style="padding:28px 32px;">
              <p style="margin:0 0 18px;font-family:${SAN_STACK};font-size:11px;font-weight:700;letter-spacing:0.24em;text-transform:uppercase;color:#a08a4f;text-align:center;direction:ltr;">
                About this Parsha &middot; על הפרשה
              </p>
              ${sigBlocks}
            </td></tr>
          </table>
        </td></tr>
  ` : '';

  const chaptersHtml = chapters.map(ch => `
    <tr><td style="padding:28px 56px 8px;">
      <p style="margin:0;font-family:${HEB_STACK};direction:rtl;text-align:center;font-size:18px;color:#a08a4f;letter-spacing:0.02em;">
        ${escapeHtml(toHebrewNumeral(ch.chapter))}&nbsp;&middot;&nbsp;פֶּרֶק ${escapeHtml(String(ch.chapter))}
      </p>
    </td></tr>
    <tr><td style="padding:0 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" dir="rtl" style="direction:rtl;">
        ${ch.verses.map(v => `
        <tr>
          <td valign="top" align="left" width="42" style="padding:6px 0 6px 12px;font-family:${SAN_STACK};font-size:12px;font-weight:600;color:#c89a35;line-height:1.9;direction:ltr;text-align:left;">
            ${v.chapter}:${v.verse}
          </td>
          <td valign="top" style="padding:6px 0;font-family:${HEB_STACK};direction:rtl;text-align:right;font-size:19px;line-height:1.95;color:#1a2744;">
            ${escapeHtml(v.he)}
          </td>
        </tr>`).join('')}
      </table>
    </td></tr>
  `).join('');

  const html = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(parshaLabel)}</title>
</head>
<body style="margin:0;padding:0;background:#f5efe2;font-family:${SAN_STACK};color:#1a2744;line-height:1.6;-webkit-font-smoothing:antialiased;">

  <!-- View-in-browser strip (Hebrew) -->
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f5efe2;">
    <tr><td align="center" dir="rtl" style="padding:14px 16px 0;font-size:13px;color:#5a6478;font-family:${HEB_STACK};direction:rtl;">
      המייל לא נטען כראוי? <a href="${attr(p.readerUrl)}" style="color:#a08a4f;text-decoration:underline;font-weight:600;">לחצו כאן לפתיחה בדפדפן</a>
    </td></tr>
  </table>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f5efe2;">
    <tr><td align="center" style="padding:28px 16px 40px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="640" style="max-width:640px;width:100%;background:#ffffff;border-radius:24px;box-shadow:0 1px 2px rgba(15,23,42,0.04),0 12px 32px rgba(15,23,42,0.06);overflow:hidden;">

        <!-- Logo / brand -->
        <tr><td align="center" style="padding:36px 56px 0;">
          <img src="${attr(p.siteUrl)}/media/images/logonew.png" alt="" width="52" height="52" style="display:block;margin:0 auto;border:0;">
          <p style="margin:10px 0 0;font-size:10px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:#a08a4f;font-family:${SAN_STACK};">
            A Letter in the Scroll
          </p>
        </td></tr>

        <!-- Hairline -->
        <tr><td style="padding:22px 56px 0;">
          <div style="height:1px;background:rgba(200,154,53,0.18);font-size:0;line-height:0;">&nbsp;</div>
        </td></tr>

        <!-- Hebrew greeting -->
        <tr><td align="center" style="padding:30px 56px 0;font-family:${HEB_STACK};direction:rtl;">
          <p style="margin:0 0 12px;font-size:22px;color:#1a2744;">
            בוקר טוב,
          </p>
          <p style="margin:0 0 8px;font-size:17px;color:#3d4555;line-height:1.7;">
            תהנו מפרשת השבוע&nbsp;&mdash;
          </p>
        </td></tr>

        <!-- Parsha hero -->
        <tr><td style="padding:18px 56px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#fdfaf3;border-radius:18px;border:1px solid rgba(200,154,53,0.18);">
            <tr><td align="center" style="padding:32px 32px 28px;">
              <p style="margin:0 0 10px;font-size:11px;font-weight:600;letter-spacing:0.24em;text-transform:uppercase;color:#a08a4f;font-family:${SAN_STACK};">
                Parashat Hashavua
              </p>
              ${hebrewName ? `<p style="margin:0 0 6px;font-family:${HEB_STACK};direction:rtl;font-size:44px;font-weight:600;line-height:1.1;color:#1a2744;letter-spacing:-0.01em;">${escapeHtml(parshaLabel)}</p>` : ''}
              <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:18px;color:#a08a4f;font-weight:500;">
                ${escapeHtml(p.parshaName)}
              </p>
              ${p.heRef ? `<p style="margin:14px 0 0;font-family:${HEB_STACK};direction:rtl;font-size:15px;color:#5a6478;">${escapeHtml(p.heRef)}</p>` : `<p style="margin:14px 0 0;font-family:${SAN_STACK};font-size:13px;color:#5a6478;">${escapeHtml(p.ref)}</p>`}
            </td></tr>
          </table>
        </td></tr>

        ${significanceHtml}

        <!-- Verses, grouped by chapter -->
        ${chaptersHtml}

        <!-- Footer hairline -->
        <tr><td style="padding:40px 56px 0;">
          <div style="height:1px;background:rgba(200,154,53,0.18);font-size:0;line-height:0;">&nbsp;</div>
        </td></tr>

        <!-- Closing note (Hebrew) -->
        <tr><td align="center" style="padding:24px 56px 0;font-family:${HEB_STACK};direction:rtl;">
          <p style="margin:0;font-size:15px;color:#5a6478;line-height:1.8;">
            שבת שלום ומבורך
          </p>
        </td></tr>

        <!-- Reader link & quiet footer -->
        <tr><td align="center" dir="rtl" style="padding:18px 56px 40px;font-family:${HEB_STACK};font-size:13px;color:#5a6478;line-height:1.9;direction:rtl;">
          <a href="${attr(p.readerUrl)}" style="color:#a08a4f;text-decoration:underline;font-weight:600;">פתחו את הפרשה בדפדפן</a>
          <span style="color:#a8a293;">&middot;</span>
          <a href="${attr(p.siteUrl)}/study" style="color:#9b958a;text-decoration:underline;font-family:${SAN_STACK};direction:ltr;">aletterinthescroll.com/study</a>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  // Plain-text alternative — Hebrew right-to-left in mail clients that
  // honor it. Keep it short; the HTML carries the real content.
  const text = [
    'בוקר טוב,',
    '',
    `תהנו מפרשת ${hebrewName || p.parshaName}.`,
    '',
    `אם המייל לא נטען כראוי, לחצו כאן לפתיחה בדפדפן:`,
    p.readerUrl,
    '',
    `A Letter in the Scroll · ${p.siteUrl}`
  ].join('\n');

  return { html, text };
}

// Subject line: short, Hebrew-first, personal-feel.
export function parshaEmailSubject(hebrewName, parshaName) {
  const he = (hebrewName || '').trim();
  const en = (parshaName || '').trim();
  if (he && en) return `פרשת ${he} — ${en}`;
  if (he) return `פרשת ${he}`;
  if (en) return `Parashat ${en}`;
  return 'Parashat Hashavua';
}

// Convert 1–199 to a simple Hebrew gematria string (ב, יד, כא, etc.).
// Used for the chapter labels above each verse block. Doesn't need to be
// rigorous — it's decorative.
function toHebrewNumeral(n) {
  if (!Number.isFinite(n) || n < 1) return '';
  const ones = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
  const tens = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'];
  const hundreds = ['', 'ק', 'ר', 'ש', 'ת'];
  let out = '';
  let x = Math.floor(n);
  if (x >= 100) {
    const h = Math.min(Math.floor(x / 100), 4);
    out += hundreds[h];
    x -= h * 100;
  }
  if (x === 15) { out += 'טו'; x = 0; }
  else if (x === 16) { out += 'טז'; x = 0; }
  if (x >= 10) {
    out += tens[Math.floor(x / 10)];
    x = x % 10;
  }
  if (x > 0) out += ones[x];
  if (out.length === 1) out += '׳';
  else if (out.length > 1) out = out.slice(0, -1) + '״' + out.slice(-1);
  return out;
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function attr(s) { return escapeHtml(s); }

// Strip escape-sequence artifacts (\", \', \n) and Markdown-style
// *emphasis* asterisks that some entries of parsha_significance.json
// were exported with. Keeps the visible text clean in the email.
function cleanSig(s) {
  if (typeof s !== 'string') return '';
  return s
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\n/g, ' ')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}
