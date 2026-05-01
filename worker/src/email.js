// Resend send + the HTML email template.

const RESEND_API = 'https://api.resend.com/emails';

export async function sendEmail({ apiKey, from, to, subject, html, text, replyTo }) {
  const res = await fetch(RESEND_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      ...(text ? { text } : {}),
      ...(replyTo ? { reply_to: replyTo } : {})
    })
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Resend ${res.status}: ${txt}`);
  }
  return res.json();
}

/**
 * Build the email body. Returns { html, text } — Resend sends the
 * multipart/alternative with both, which Gmail uses for classification.
 *
 * Design philosophy: this looks like a short personal note, not a
 * designed newsletter. Heavy gradients, brand-banner headers, and big
 * CTA buttons trigger Gmail's Promotions classifier. We avoid all three.
 *
 * @param {object} p
 * @param {string} p.firstName
 * @param {string} p.parshaName
 * @param {string} p.hebrewName
 * @param {string} p.teaser
 * @param {string} p.studyUrl
 * @param {string} p.unsubscribeUrl
 * @param {boolean} p.isHoliday
 * @param {string|null} p.holidayName
 * @param {string} p.siteUrl
 */
export function buildEmail(p) {
  const name = (p.firstName || '').trim();
  const greeting = name ? `Hi ${name},` : 'Hi,';
  const parshaLine = p.isHoliday
    ? `${p.holidayName || 'a special week'}`
    : `${p.parshaName}${p.hebrewName ? ` (${p.hebrewName})` : ''}`;

  const parshaDisplay = p.isHoliday
    ? `<span style="font-family:Georgia,'Times New Roman',serif;color:#1a2744;">${escapeHtml(p.holidayName || 'a special week')}</span>`
    : `<span style="font-family:Georgia,'Times New Roman',serif;color:#1a2744;">${escapeHtml(p.parshaName)}</span>${p.hebrewName ? `<br><span style="font-family:'Frank Ruhl Libre','Times New Roman',serif;color:#c89a35;font-size:30px;font-weight:400;">${escapeHtml(p.hebrewName)}</span>` : ''}`;

  // The design avoids classic Promotions-tab triggers:
  //   • No gradient CTA button (uses an underlined gold link instead)
  //   • No hidden display:none preheader
  //   • No "you're receiving this because…" footer block
  //   • Personal sign-off, first-name greeting, single-column layout
  // ...while still feeling like a beautiful, intentional letter.
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#fdfaf3;font-family:Georgia,'Times New Roman',Times,serif;color:#1a2744;line-height:1.65;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#fdfaf3;">
    <tr><td align="center" style="padding:40px 16px 32px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;width:100%;">

        <!-- Small logo, no banner -->
        <tr><td align="center" style="padding:0 0 24px;">
          <img src="${attr(p.siteUrl)}/media/images/logonew.png" alt="" width="56" height="56" style="display:block;border:0;opacity:0.92;">
        </td></tr>

        <!-- Letter body -->
        <tr><td style="font-size:17px;color:#1a2744;padding:0 4px;">
          <p style="margin:0 0 18px;font-size:17px;">${escapeHtml(greeting)}</p>

          <p style="margin:0 0 18px;">
            ${p.isHoliday
              ? `Wishing you a beautiful ${escapeHtml(p.holidayName || 'holiday')} this week.`
              : `Just a quick note &mdash; we haven&rsquo;t seen you on the site yet this week, and your chavruta is missing you.`}
          </p>

          <p style="margin:0 0 22px;">
            ${p.isHoliday
              ? `This week takes us out of the regular parsha cycle for the special holiday readings. Here&rsquo;s a taste of what&rsquo;s coming:`
              : `This week we&rsquo;re reading:`}
          </p>

          ${p.isHoliday ? '' : `
          <!-- Parsha title -->
          <p style="margin:0 0 6px;font-size:13px;font-weight:400;letter-spacing:0.16em;text-transform:uppercase;color:#c89a35;">
            This week&rsquo;s parsha
          </p>
          <p style="margin:0 0 26px;font-size:34px;font-weight:700;line-height:1.15;color:#1a2744;letter-spacing:-0.01em;">
            ${parshaDisplay}
          </p>
          `}

          <!-- Teaser with the gold border quote treatment -->
          <p style="margin:0 0 26px;padding:4px 0 4px 18px;border-left:3px solid #c89a35;color:#3d4555;font-style:italic;font-size:16px;line-height:1.7;">
            ${escapeHtml(p.teaser)}
          </p>

          <!-- Inline link, not a marketing button -->
          <p style="margin:0 0 22px;">
            You can open it together with your chavruta here &rarr;
            <a href="${attr(p.studyUrl)}" style="color:#1e3d7a;text-decoration:underline;text-decoration-color:#c89a35;text-underline-offset:3px;font-weight:600;">aletterinthescroll.com/study</a>
          </p>

          <p style="margin:0 0 22px;">
            Even five minutes counts. Every word you read becomes part of the story.
          </p>

          <p style="margin:0 0 22px;font-style:italic;color:#5a6478;">
            Every Jewish soul is a letter in the Torah &mdash; and the Torah is incomplete without yours.
          </p>

          <!-- Personal sign-off -->
          <p style="margin:32px 0 4px;">Warmly,</p>
          <p style="margin:0 0 4px;font-family:Georgia,serif;font-size:18px;color:#1a2744;">Yair</p>
          <p style="margin:0 0 0;font-size:13px;color:#8b8579;font-style:italic;">A Letter in the Scroll</p>
        </td></tr>

        <!-- Subtle gold rule -->
        <tr><td style="padding:32px 0 16px;">
          <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(200,154,53,0.4),transparent);font-size:0;line-height:0;">&nbsp;</div>
        </td></tr>

        <!-- Quiet, single-line footer (no "you're receiving this because…") -->
        <tr><td style="font-size:12px;color:#9b958a;line-height:1.6;padding:0 4px;">
          Don&rsquo;t want these weekly notes?
          <a href="${attr(p.unsubscribeUrl)}" style="color:#9b958a;text-decoration:underline;">Unsubscribe</a>
          or
          <a href="${attr(p.siteUrl)}/settings#sec-parsha-reminder" style="color:#9b958a;text-decoration:underline;">change it in your settings</a>.
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    greeting,
    '',
    p.isHoliday
      ? `Wishing you a beautiful ${p.holidayName || 'holiday'} this week.`
      : `Just a quick note — we haven't seen you on the site yet this week, and your chavruta is missing you.`,
    '',
    p.isHoliday
      ? `This week takes us out of the regular parsha cycle for the special holiday readings. Here's a taste of what's coming:`
      : `This week we're reading ${parshaLine}:`,
    '',
    `  ${p.teaser}`,
    '',
    `You can open it together with your chavruta here:`,
    `  ${p.studyUrl}`,
    '',
    `Even five minutes counts. Every word you read becomes part of the story.`,
    '',
    `Every Jewish soul is a letter in the Torah — and the Torah is incomplete without yours.`,
    '',
    `Warmly,`,
    `Yair`,
    `A Letter in the Scroll`,
    '',
    `---`,
    `Don't want these weekly notes? Unsubscribe: ${p.unsubscribeUrl}`,
    `Or change it in your settings: ${p.siteUrl}/settings#sec-parsha-reminder`
  ].join('\n');

  return { html, text };
}

// Back-compat shim — older code paths that just want the HTML.
export function buildEmailHtml(p) { return buildEmail(p).html; }

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
