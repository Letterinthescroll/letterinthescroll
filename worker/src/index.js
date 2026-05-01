// Cloudflare Worker — A Letter in the Scroll weekly parsha reminder.
//
// Triggers:
//   • cron (Wed 17:00 UTC) → email inactive chavruta members
//   • HTTP GET /unsubscribe?token=... → flip user's weeklyParshaEmails to false

import { FirestoreClient } from './firestore.js';
import { getCurrentParsha } from './parsha.js';
import { sendEmail, buildEmailHtml } from './email.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/unsubscribe' || url.pathname === '/unsubscribe/') {
      return handleUnsubscribe(url, env);
    }
    if (url.pathname === '/test-send' || url.pathname === '/test-send/') {
      return handleTestSend(url, env);
    }
    // Any other path that hits the Worker (because the Cloudflare route
    // pattern `*/unsubscribe*` is greedy and catches /unsubscribed/, etc.)
    // is transparently forwarded to the origin so GitHub Pages serves it.
    return fetch(request);
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(runWeeklyJob(env));
  }
};

// ───────────────── unsubscribe ─────────────────

async function handleUnsubscribe(url, env) {
  const token = url.searchParams.get('token');
  if (!token) return redirectToConfirmation(env, true);

  try {
    const fs = new FirestoreClient({
      projectId: env.FIREBASE_PROJECT_ID,
      serviceAccount: assembleServiceAccount(env)
    });
    // Look up user by unsubscribeToken.
    const matches = await fs.runQuery('users', [
      { fieldFilter: { field: { fieldPath: 'unsubscribeToken' }, op: 'EQUAL', value: { stringValue: token } } }
    ]);
    if (!matches.length) return redirectToConfirmation(env, true);
    const user = matches[0];
    await fs.patchDoc('users', user.id, { weeklyParshaEmails: false });
    return redirectToConfirmation(env, false);
  } catch (e) {
    console.error('unsubscribe error:', e);
    return redirectToConfirmation(env, true);
  }
}

function redirectToConfirmation(env, isError) {
  const dest = `${env.SITE_URL}/unsubscribed/${isError ? '?error=1' : ''}`;
  return Response.redirect(dest, 302);
}

// ───────────────── manual test-send (token-guarded) ─────────────────
//
// GET /test-send?email=foo@bar.com&token=<TEST_TOKEN>&firstName=Yair
//   → sends one parsha-reminder email exactly like the Wednesday cron would.
// Token comes from the TEST_TOKEN secret. firstName is optional.
async function handleTestSend(url, env) {
  const provided = url.searchParams.get('token') || '';
  if (!env.TEST_TOKEN || provided !== env.TEST_TOKEN) {
    return new Response('Unauthorized', { status: 401 });
  }
  const email = (url.searchParams.get('email') || '').trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response('Provide ?email=<valid address>', { status: 400 });
  }
  const firstName = url.searchParams.get('firstName') || '';

  try {
    const parsha = await getCurrentParsha();
    const html = buildEmailHtml({
      firstName,
      parshaName: parsha.name,
      hebrewName: parsha.hebrewName,
      teaser: parsha.teaser,
      studyUrl: `${env.SITE_URL}/study`,
      unsubscribeUrl: `${env.SITE_URL}/unsubscribe?token=test-preview`,
      isHoliday: parsha.isHoliday,
      holidayName: parsha.holidayName,
      siteUrl: env.SITE_URL
    });
    const subject = parsha.isHoliday
      ? `Chag Sameach — ${parsha.holidayName || 'a special week'} is here 🌿`
      : `This week's parsha: ${parsha.name} — your chavruta is waiting`;
    const result = await sendEmail({
      apiKey: env.RESEND_API_KEY,
      from: env.FROM_EMAIL,
      to: email,
      subject,
      html
    });
    return new Response(JSON.stringify({
      ok: true,
      sentTo: email,
      parsha: parsha.name,
      isHoliday: parsha.isHoliday,
      resendId: result.id || null
    }, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(`Error: ${e.message}`, { status: 500 });
  }
}

// ───────────────── weekly cron ─────────────────

async function runWeeklyJob(env) {
  const fs = new FirestoreClient({
    projectId: env.FIREBASE_PROJECT_ID,
    serviceAccount: assembleServiceAccount(env)
  });

  // 1. Find every UID in any chavruta.
  const chavrutas = await fs.listAll('chavrutas');
  const memberUids = new Set();
  for (const c of chavrutas) {
    const members = c.data.members;
    if (Array.isArray(members)) {
      for (const uid of members) memberUids.add(uid);
    }
  }
  console.log(`Found ${memberUids.size} unique chavruta members across ${chavrutas.length} chavrutas`);
  if (memberUids.size === 0) return;

  // 2. Define "this week" as starting Sunday 00:00 ET. We want users whose
  //    lastLogin is BEFORE that boundary.
  const sundayBoundary = lastSundayMidnightET();
  console.log(`Inactivity boundary (Sunday 00:00 ET): ${sundayBoundary.toISOString()}`);

  // 3. Look up parsha once.
  const parsha = await getCurrentParsha();
  console.log(`This week's parsha: ${parsha.name} (holiday=${parsha.isHoliday})`);

  // 4. For each member UID, fetch their user doc & filter.
  const candidates = [];
  for (const uid of memberUids) {
    try {
      const userDoc = await fs.getDoc('users', uid);
      if (!userDoc) continue;
      const u = userDoc.data;

      if (!u.email) continue;
      if (u.weeklyParshaEmails === false) continue;
      // lastLogin is a Firestore timestamp (Date after parse); skip if missing
      const lastLogin = u.lastLogin instanceof Date ? u.lastLogin : null;
      if (lastLogin && lastLogin >= sundayBoundary) continue; // active this week

      candidates.push({ uid, ...u });
    } catch (e) {
      console.error(`Error fetching user ${uid}:`, e);
    }
  }
  console.log(`${candidates.length} users qualify for this week's reminder`);

  // 5. Ensure each candidate has an unsubscribeToken; mint if missing.
  for (const c of candidates) {
    if (!c.unsubscribeToken) {
      c.unsubscribeToken = randomToken();
      try {
        await fs.patchDoc('users', c.uid, { unsubscribeToken: c.unsubscribeToken });
      } catch (e) {
        console.error(`Could not store unsubscribeToken for ${c.uid}:`, e);
        continue;
      }
    }
  }

  // 6. Send.
  let sent = 0, failed = 0;
  for (const c of candidates) {
    try {
      const html = buildEmailHtml({
        firstName: c.firstName || (c.displayName ? c.displayName.split(' ')[0] : ''),
        parshaName: parsha.name,
        hebrewName: parsha.hebrewName,
        teaser: parsha.teaser,
        studyUrl: `${env.SITE_URL}/study`,
        unsubscribeUrl: `${env.SITE_URL}/unsubscribe?token=${encodeURIComponent(c.unsubscribeToken)}`,
        isHoliday: parsha.isHoliday,
        holidayName: parsha.holidayName,
        siteUrl: env.SITE_URL
      });
      const subject = parsha.isHoliday
        ? `Chag Sameach — ${parsha.holidayName || 'a special week'} is here 🌿`
        : `This week's parsha: ${parsha.name} — your chavruta is waiting`;
      await sendEmail({
        apiKey: env.RESEND_API_KEY,
        from: env.FROM_EMAIL,
        to: c.email,
        subject,
        html
      });
      sent++;
    } catch (e) {
      failed++;
      console.error(`Failed to send to ${c.email}:`, e);
    }
  }
  console.log(`Weekly reminder run complete — sent=${sent}, failed=${failed}, total=${candidates.length}`);
}

// Last Sunday at 00:00 America/New_York, expressed as a Date in UTC.
function lastSundayMidnightET() {
  // Get current ET wall time
  const now = new Date();
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false, weekday: 'short'
  });
  const parts = {};
  for (const p of fmt.formatToParts(now)) parts[p.type] = p.value;
  // weekday: Sun, Mon, Tue, Wed, Thu, Fri, Sat
  const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const dow = dayMap[parts.weekday] ?? 0;
  // Build a Date for current ET midnight, then subtract dow days.
  const etMidnightString = `${parts.year}-${parts.month}-${parts.day}T00:00:00`;
  // We need this ET-midnight expressed as UTC. The easiest way: assume
  // ET = UTC-5 (EST) or UTC-4 (EDT). We'll compute the offset by comparing
  // formatted now vs raw now.
  const etOffsetMinutes = computeEtOffsetMinutes(now);
  const etMidnight = new Date(`${etMidnightString}Z`); // pretend it's UTC
  // Convert from "ET wall time as if UTC" → real UTC by adding the offset
  // back. ET is behind UTC, so UTC time of ET midnight = etMidnight + |offset|.
  const utcOfEtMidnight = new Date(etMidnight.getTime() + (etOffsetMinutes * 60_000));
  // Subtract dow days to land on Sunday.
  return new Date(utcOfEtMidnight.getTime() - (dow * 24 * 60 * 60_000));
}

function computeEtOffsetMinutes(date) {
  // Returns the absolute number of minutes ET is behind UTC (e.g. 240 for EDT, 300 for EST).
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    timeZoneName: 'shortOffset'
  });
  const parts = fmt.formatToParts(date);
  const tz = parts.find(p => p.type === 'timeZoneName')?.value || 'GMT-5';
  const m = tz.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!m) return 300;
  const sign = m[1] === '-' ? 1 : -1; // ET is behind UTC, so "GMT-5" → +300 minutes
  const h = parseInt(m[2], 10);
  const min = parseInt(m[3] || '0', 10);
  return sign * (h * 60 + min);
}

function randomToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += bytes[i].toString(16).padStart(2, '0');
  return s;
}

// Assemble the service account from three individual Worker secrets.
// We split it up because the original JSON contains newlines + quotes that
// make `wrangler secret put` a pain to paste in one shot. The private_key
// secret should be the PEM as a single line with literal \n where the
// newlines were — we restore them here.
function assembleServiceAccount(env) {
  if (!env.FIREBASE_CLIENT_EMAIL || !env.FIREBASE_PRIVATE_KEY) {
    throw new Error('Missing FIREBASE_CLIENT_EMAIL or FIREBASE_PRIVATE_KEY secret');
  }
  // Restore real newlines whether the secret was pasted with literal \n or
  // with actual newlines.
  const privateKey = env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
  return {
    client_email: env.FIREBASE_CLIENT_EMAIL,
    private_key: privateKey,
    project_id: env.FIREBASE_PROJECT_ID
  };
}
