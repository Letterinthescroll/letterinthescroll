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

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Georgia,'Times New Roman',Times,serif;color:#222;line-height:1.6;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#ffffff;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;width:100%;">

        <tr><td style="font-size:16px;color:#222;padding:0 8px;">
          <p style="margin:0 0 16px;">${escapeHtml(greeting)}</p>

          <p style="margin:0 0 16px;">
            ${p.isHoliday
              ? `Wishing you a beautiful ${escapeHtml(p.holidayName || 'holiday')} this week.`
              : `Just a quick note &mdash; we haven&rsquo;t seen you on the site yet this week, and your chavruta is missing you.`}
          </p>

          <p style="margin:0 0 16px;">
            ${p.isHoliday
              ? `This week takes us out of the regular parsha cycle for the holiday readings. Here&rsquo;s a short preview:`
              : `This week we&rsquo;re reading <strong>${escapeHtml(parshaLine)}</strong>. Here&rsquo;s a quick taste of what&rsquo;s coming:`}
          </p>

          <p style="margin:0 0 20px;padding-left:16px;border-left:3px solid #c89a35;color:#3d4555;font-style:italic;">
            ${escapeHtml(p.teaser)}
          </p>

          <p style="margin:0 0 16px;">
            You can read it together with your chavruta here:<br>
            <a href="${attr(p.studyUrl)}" style="color:#1e3d7a;">${attr(p.studyUrl)}</a>
          </p>

          <p style="margin:0 0 16px;">
            Even five minutes counts. Hope to see you in the study room soon.
          </p>

          <p style="margin:0 0 4px;">Warmly,</p>
          <p style="margin:0 0 28px;">Yair</p>
          <p style="margin:0 0 28px;color:#777;font-size:14px;font-style:italic;">A Letter in the Scroll</p>

          <p style="margin:0;font-size:12px;color:#999;">
            If you&rsquo;d rather not get these weekly notes, you can
            <a href="${attr(p.unsubscribeUrl)}" style="color:#999;">unsubscribe here</a>
            or <a href="${attr(p.siteUrl)}/settings#sec-parsha-reminder" style="color:#999;">change it in your settings</a>.
          </p>
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
      ? `This week takes us out of the regular parsha cycle for the holiday readings. Here's a short preview:`
      : `This week we're reading ${parshaLine}. Here's a quick taste of what's coming:`,
    '',
    `  ${p.teaser}`,
    '',
    `You can read it together with your chavruta here:`,
    `  ${p.studyUrl}`,
    '',
    `Even five minutes counts. Hope to see you in the study room soon.`,
    '',
    `Warmly,`,
    `Yair`,
    `A Letter in the Scroll`,
    '',
    '---',
    `If you'd rather not get these weekly notes, you can unsubscribe here:`,
    `  ${p.unsubscribeUrl}`,
    `Or manage it in your settings: ${p.siteUrl}/settings#sec-parsha-reminder`
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
