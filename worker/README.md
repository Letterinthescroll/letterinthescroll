# Weekly Parsha Reminder Worker

Cloudflare Worker that:
1. Every Wednesday at 17:00 UTC (12:00 PM EST / 1:00 PM EDT) emails users in
   any chavruta who haven't visited the site since Sunday 00:00 ET.
2. Every Thursday at 06:00 UTC (1:00 AM EST / 2:00 AM EDT) emails the full
   Hebrew weekly parsha (verse-by-verse) to a private recipient list defined
   in the `THURSDAY_PARSHA_RECIPIENTS` secret. The list is **not** in this
   repo. See "Thursday Hebrew-parsha email" below.
3. Handles `GET /unsubscribe?token=...` to one-click opt out.

The worker is bound to `aletterinthescroll.com` only — `catalyst-magazine.com`
is a separate zone and is not touched.

## One-time setup

You only do this once. Run all commands from this `worker/` directory:

```bash
cd worker
npm install -g wrangler
wrangler login
```

The browser opens — log in with the Cloudflare account that owns
`aletterinthescroll.com`.

### Set the secrets

The Worker needs three secrets. We split the Firebase service account into
two pieces (`client_email` + `private_key`) so each is short enough to paste
into a terminal cleanly without newline trouble.

#### 1. Resend API key

```bash
wrangler secret put RESEND_API_KEY
```
Paste the API key from your Resend dashboard, press Enter.

#### 2. Generate the Firebase service account

Open https://console.firebase.google.com/project/letterinthescroll/settings/serviceaccounts/adminsdk
and click **"Generate new private key"**. A JSON file downloads. Open it in
any text editor — you'll see something like:

```json
{
  "type": "service_account",
  "project_id": "letterinthescroll",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@letterinthescroll.iam.gserviceaccount.com",
  ...
}
```

You only need TWO fields: `client_email` and `private_key`.

#### 3. Set FIREBASE_CLIENT_EMAIL

```bash
wrangler secret put FIREBASE_CLIENT_EMAIL
```
Paste only the `client_email` value (the part inside the quotes,
e.g. `firebase-adminsdk-xxxxx@letterinthescroll.iam.gserviceaccount.com`).
Press Enter.

#### 4. Set FIREBASE_PRIVATE_KEY

```bash
wrangler secret put FIREBASE_PRIVATE_KEY
```
Paste the `private_key` value — the **entire string between the quotes**,
including all the `\n` literals. It's a long single line that looks like:

```
-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----\n
```

Press Enter. The Worker will convert the `\n` literals back into real
newlines automatically.

> **Tip:** if your terminal mangles the long paste, save the value to a temp
> file and pipe it instead:
> ```bash
> echo "-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----\n" | wrangler secret put FIREBASE_PRIVATE_KEY
> ```

### Deploy

```bash
wrangler deploy
```

You'll see something like `Published alits-parsha-reminder` and the routes
bound to your domain.

## Verifying

```bash
# Tail logs in real time
wrangler tail

# Test the unsubscribe routing (should 302 to /unsubscribed/?error=1)
curl -I "https://www.aletterinthescroll.com/unsubscribe?token=test123"
```

To force-trigger the cron without waiting for Wednesday, the easiest path is
to temporarily change the cron in `wrangler.toml` to a near-future minute,
re-deploy, then change it back.

## Updating

Whenever you change a file in `src/`, just re-run:
```bash
wrangler deploy
```
Secrets persist across deploys; you don't need to re-set them.

## Environment

| Variable | Where set | What it is |
|---|---|---|
| `RESEND_API_KEY` | `wrangler secret put` | Resend dashboard key |
| `FIREBASE_CLIENT_EMAIL` | `wrangler secret put` | `client_email` field from Firebase service-account JSON |
| `FIREBASE_PRIVATE_KEY` | `wrangler secret put` | `private_key` field (single line, with `\n` literals) |
| `TEST_TOKEN` | `wrangler secret put` | Shared token for `/test-send` and `/test-thursday` |
| `THURSDAY_PARSHA_RECIPIENTS` | `wrangler secret put` | Comma-separated emails for the Thursday Hebrew parsha email |
| `SITE_URL` | `wrangler.toml` `[vars]` | `https://www.aletterinthescroll.com` |
| `FROM_EMAIL` | `wrangler.toml` `[vars]` | `A Letter in the Scroll <hello@aletterinthescroll.com>` |
| `FIREBASE_PROJECT_ID` | `wrangler.toml` `[vars]` | `letterinthescroll` |

## Thursday Hebrew-parsha email

A second cron (`0 6 * * 4` → Thursday 06:00 UTC) fetches the upcoming
parsha + its full Hebrew verses from Sefaria and emails them to every
address listed in the `THURSDAY_PARSHA_RECIPIENTS` secret. The recipients
never appear in the repo or in `wrangler.toml` — they live only in
Cloudflare Worker secret storage.

### Set or update the recipient list

```bash
wrangler secret put THURSDAY_PARSHA_RECIPIENTS
```

Paste a comma-separated list, e.g.:

```
orameridor@gmail.com, bendoryair@gmail.com
```

Re-run the same command to replace the list. To remove someone, paste the
list again without them.

### Preview before Thursday

```bash
# Send to a single test address (does NOT hit the real list)
curl "https://www.aletterinthescroll.com/test-thursday?token=$TEST_TOKEN&email=you@example.com"

# Fire a real run against the configured recipients (skip ?email=)
curl "https://www.aletterinthescroll.com/test-thursday?token=$TEST_TOKEN"
```

### Public reader page

The Thursday email links to `/parsha-reader/?ref=...&name=...` — a static,
no-login page that fetches and renders the full Hebrew parsha client-side
from Sefaria. Used as a "view in browser" fallback in case Gmail clips a
long email.
