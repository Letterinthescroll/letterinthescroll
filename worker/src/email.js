// Resend send + the HTML email template.

const RESEND_API = 'https://api.resend.com/emails';

export async function sendEmail({ apiKey, from, to, subject, html, replyTo }) {
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
 * Build the email HTML.
 * @param {object} p
 * @param {string} p.firstName
 * @param {string} p.parshaName     - English parsha or holiday name
 * @param {string} p.hebrewName     - Hebrew name (optional)
 * @param {string} p.teaser         - Teaser paragraph
 * @param {string} p.studyUrl       - Link to /study
 * @param {string} p.unsubscribeUrl - Token-bound URL
 * @param {boolean} p.isHoliday
 * @param {string|null} p.holidayName
 * @param {string} p.siteUrl
 */
export function buildEmailHtml(p) {
  const greeting = p.firstName ? `Hi ${escapeHtml(p.firstName)},` : 'Hi friend,';
  const titleLine = p.isHoliday
    ? `Chag Sameach! 🌿`
    : `This week's parsha is here`;
  const subhead = p.isHoliday
    ? `Wishing you a beautiful ${escapeHtml(p.holidayName || 'holiday')}`
    : `${escapeHtml(p.parshaName)}${p.hebrewName ? ` <span style="font-family:'Frank Ruhl Libre',Georgia,serif;color:#c89a35;">· ${escapeHtml(p.hebrewName)}</span>` : ''}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>This Week's Parsha — A Letter in the Scroll</title>
</head>
<body style="margin:0;padding:0;background:#f5f0e6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1a2744;">
  <div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(p.parshaName)} — open the scroll with your chavruta this week.</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f5f0e6;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 20px 50px rgba(23,42,95,0.10);border:1px solid rgba(200,154,53,0.18);">

        <!-- Top accent bar -->
        <tr><td style="height:5px;background:linear-gradient(90deg,#1e3d7a 0%,#c89a35 50%,#1e3d7a 100%);font-size:0;line-height:0;">&nbsp;</td></tr>

        <!-- Header / logo -->
        <tr><td style="padding:36px 40px 16px 40px;text-align:center;background:linear-gradient(170deg,#ffffff 0%,#fdfcf9 100%);">
          <a href="${attr(p.siteUrl)}" style="text-decoration:none;display:inline-block;">
            <img src="${attr(p.siteUrl)}/media/images/logonew.png" alt="A Letter in the Scroll" width="80" height="80" style="display:block;margin:0 auto 12px;border:0;">
            <div style="font-size:14px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;color:#1e3d7a;">A Letter in the Scroll</div>
          </a>
        </td></tr>

        <!-- Greeting + parsha -->
        <tr><td style="padding:24px 40px 12px 40px;">
          <p style="margin:0 0 14px;font-size:16px;color:#3d4555;line-height:1.6;">${greeting}</p>
          <p style="margin:0 0 22px;font-size:15px;color:#5a6478;line-height:1.7;">
            We noticed you haven't stopped by this week, and your chavruta is waiting. There's a beautiful parsha in front of us, and the world is just a little bit better when we open the scroll together.
          </p>

          <h1 style="margin:8px 0 6px;font-size:13px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#c89a35;">${titleLine}</h1>
          <h2 style="margin:0 0 18px;font-size:30px;font-weight:700;color:#1a2744;letter-spacing:-0.01em;line-height:1.25;">${subhead}</h2>
        </td></tr>

        <!-- Teaser card -->
        <tr><td style="padding:0 40px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:linear-gradient(170deg,#fdf8ed 0%,#fef6e0 100%);border:1px solid rgba(200,154,53,0.25);border-radius:14px;">
            <tr><td style="padding:22px 24px;">
              <p style="margin:0;font-size:15.5px;line-height:1.75;color:#3d4555;">${escapeHtml(p.teaser)}</p>
            </td></tr>
          </table>
        </td></tr>

        <!-- CTA -->
        <tr><td style="padding:28px 40px 12px 40px;text-align:center;">
          <a href="${attr(p.studyUrl)}" style="display:inline-block;background:linear-gradient(135deg,#1e3d7a 0%,#274d94 100%);color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 36px;border-radius:10px;letter-spacing:0.02em;box-shadow:0 4px 16px rgba(30,61,122,0.25);">
            Open this week's parsha →
          </a>
          <p style="margin:14px 0 0;font-size:13px;color:#8b8579;">
            Takes you straight to the Study room.
          </p>
        </td></tr>

        <!-- Closing -->
        <tr><td style="padding:24px 40px 8px 40px;">
          <p style="margin:0;font-size:14.5px;line-height:1.7;color:#5a6478;">
            Whether it's just five minutes or a full hour, every word you read becomes part of the story. Your chavruta is part of yours, and you of theirs.
          </p>
          <p style="margin:14px 0 0;font-size:14.5px;line-height:1.7;color:#5a6478;font-style:italic;">
            Every Jewish soul is a letter in the Torah — and the Torah is incomplete without yours.
          </p>
        </td></tr>

        <!-- Divider -->
        <tr><td style="padding:28px 40px 0 40px;">
          <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(200,154,53,0.45),transparent);"></div>
        </td></tr>

        <!-- Footer / unsubscribe -->
        <tr><td style="padding:18px 40px 32px 40px;text-align:center;">
          <p style="margin:0 0 8px;font-size:12px;color:#8b8579;">
            You're receiving this because you joined a chavruta on A Letter in the Scroll.
          </p>
          <p style="margin:0 0 6px;font-size:12px;color:#8b8579;">
            <a href="${attr(p.unsubscribeUrl)}" style="color:#1e3d7a;text-decoration:underline;font-weight:600;">Opt out of weekly reminder emails</a>
            &nbsp;·&nbsp;
            <a href="${attr(p.siteUrl)}/settings#sec-parsha-reminder" style="color:#1e3d7a;text-decoration:underline;font-weight:600;">Manage in settings</a>
          </p>
          <p style="margin:14px 0 0;font-size:11px;color:#a8a293;">
            A Letter in the Scroll · A free non-profit Torah study community
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
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
