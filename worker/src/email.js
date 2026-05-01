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

  const SAN_STACK = "-apple-system,BlinkMacSystemFont,'SF Pro Text','SF Pro Display','Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  const HEB_STACK = "'SBL Hebrew','Frank Ruhl Libre','David',Georgia,'Times New Roman',serif";

  // The design philosophy:
  //   • Apple-newsletter style: white card on warm cream, generous padding,
  //     confident typography, lots of breathing room, restrained color
  //   • Logo treated like a real mark: in a soft circle ring instead of a
  //     bare image
  //   • No gradient CTA button — single styled inline link with gold accent
  //   • Hebrew name big and confident, set in a Hebrew-friendly serif
  //   • Personal first-name greeting and warm sign-off keep this in Primary
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f5efe2;font-family:${SAN_STACK};color:#1a2744;line-height:1.6;-webkit-font-smoothing:antialiased;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f5efe2;">
    <tr><td align="center" style="padding:40px 16px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background:#ffffff;border-radius:24px;box-shadow:0 1px 2px rgba(15,23,42,0.04),0 12px 32px rgba(15,23,42,0.06);overflow:hidden;">

        <!-- Logo (already a circle, no ring needed) -->
        <tr><td align="center" style="padding:36px 56px 0;">
          <img src="${attr(p.siteUrl)}/media/images/logonew.png" alt="" width="52" height="52" style="display:block;margin:0 auto;border:0;">
          <p style="margin:10px 0 0;font-size:10px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:#a08a4f;">
            A Letter in the Scroll
          </p>
        </td></tr>

        <!-- Hairline separator below the logo block -->
        <tr><td style="padding:22px 56px 0;">
          <div style="height:1px;background:rgba(200,154,53,0.18);font-size:0;line-height:0;">&nbsp;</div>
        </td></tr>

        <!-- Letter body -->
        <tr><td style="padding:36px 56px 0;font-size:17px;line-height:1.65;color:#1a2744;">
          <p style="margin:0 0 20px;font-size:17px;">${escapeHtml(greeting)}</p>

          <p style="margin:0 0 32px;color:#3d4555;">
            ${p.isHoliday
              ? `Wishing you a beautiful ${escapeHtml(p.holidayName || 'holiday')} this week. We haven&rsquo;t seen you on the site yet, and your chavruta is missing you.`
              : `Just a quick note &mdash; we haven&rsquo;t seen you on the site yet this week, and your chavruta is missing you.`}
          </p>
        </td></tr>

        ${p.isHoliday ? '' : `
        <!-- Parsha hero card -->
        <tr><td style="padding:0 56px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#fdfaf3;border-radius:18px;border:1px solid rgba(200,154,53,0.18);">
            <tr><td align="center" style="padding:36px 32px 32px;">
              <p style="margin:0 0 14px;font-size:11px;font-weight:600;letter-spacing:0.24em;text-transform:uppercase;color:#a08a4f;">
                This Week&rsquo;s Parsha
              </p>
              <p style="margin:0 0 ${p.hebrewName ? '8px' : '0'};font-family:Georgia,'Times New Roman',serif;font-size:42px;font-weight:600;line-height:1.1;color:#1a2744;letter-spacing:-0.02em;">
                ${escapeHtml(p.parshaName)}
              </p>
              ${p.hebrewName ? `<p style="margin:0;font-family:${HEB_STACK};font-size:34px;color:#c89a35;font-weight:400;line-height:1.2;direction:rtl;">${escapeHtml(p.hebrewName)}</p>` : ''}
            </td></tr>
          </table>
        </td></tr>
        `}

        ${p.isHoliday ? `
        <!-- Holiday hero (slightly different framing) -->
        <tr><td style="padding:0 56px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#fdfaf3;border-radius:18px;border:1px solid rgba(200,154,53,0.18);">
            <tr><td align="center" style="padding:36px 32px;">
              <p style="margin:0 0 14px;font-size:11px;font-weight:600;letter-spacing:0.24em;text-transform:uppercase;color:#a08a4f;">
                This Week
              </p>
              <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:36px;font-weight:600;line-height:1.15;color:#1a2744;letter-spacing:-0.015em;">
                ${escapeHtml(p.holidayName || 'A special week')}
              </p>
            </td></tr>
          </table>
        </td></tr>
        ` : ''}

        <!-- Teaser -->
        <tr><td style="padding:36px 56px 0;font-size:17px;line-height:1.7;color:#3d4555;">
          <p style="margin:0;">${escapeHtml(p.teaser)}</p>
        </td></tr>

        <!-- Inline link instead of a marketing button -->
        <tr><td style="padding:32px 56px 0;font-size:16px;line-height:1.7;color:#3d4555;">
          <p style="margin:0;">
            You can open it together with your chavruta here &rarr;
            <a href="${attr(p.studyUrl)}" style="color:#1e3d7a;text-decoration:underline;text-decoration-color:#c89a35;text-decoration-thickness:2px;text-underline-offset:4px;font-weight:600;">aletterinthescroll.com/study</a>
          </p>
        </td></tr>

        <!-- Closing notes -->
        <tr><td style="padding:28px 56px 0;font-size:16px;line-height:1.7;color:#5a6478;">
          <p style="margin:0 0 18px;">Even five minutes counts. Every word you read becomes part of the story.</p>
          <p style="margin:0;font-style:italic;">Every Jewish soul is a letter in the Torah &mdash; and the Torah is incomplete without yours.</p>
        </td></tr>

        <!-- Personal sign-off -->
        <tr><td style="padding:32px 56px 0;font-size:16px;color:#1a2744;line-height:1.5;">
          <p style="margin:0 0 6px;color:#5a6478;">Warmly,</p>
          <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:20px;color:#1a2744;">Yair</p>
        </td></tr>

        <!-- Hairline separator -->
        <tr><td style="padding:40px 56px 0;">
          <div style="height:1px;background:rgba(200,154,53,0.18);font-size:0;line-height:0;">&nbsp;</div>
        </td></tr>

        <!-- Quiet footer with unsubscribe -->
        <tr><td style="padding:20px 56px 48px;font-size:12px;line-height:1.7;color:#9b958a;">
          Don&rsquo;t want these weekly notes?
          <a href="${attr(p.unsubscribeUrl)}" style="color:#9b958a;text-decoration:underline;">Unsubscribe</a>
          or
          <a href="${attr(p.siteUrl)}/settings#sec-parsha-reminder" style="color:#9b958a;text-decoration:underline;">change it in your settings</a>.
        </td></tr>

      </table>

      <!-- Tiny mark below the card -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;">
        <tr><td align="center" style="padding:20px 16px 0;font-size:11px;color:#a8a293;font-family:${SAN_STACK};">
          A Letter in the Scroll &middot; <a href="${attr(p.siteUrl)}" style="color:#a8a293;text-decoration:none;">aletterinthescroll.com</a>
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
