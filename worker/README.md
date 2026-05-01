# Weekly Parsha Reminder Worker

Cloudflare Worker that:
1. Every Wednesday at 17:00 UTC (12:00 PM EST / 1:00 PM EDT) emails users in
   any chavruta who haven't visited the site since Sunday 00:00 ET.
2. Handles `GET /unsubscribe?token=...` to one-click opt out.

The worker is bound to `aletterinthescroll.com` only — `catalyst-magazine.com`
is a separate zone and is not touched.

## One-time setup

You only do this once. Run all commands from this `worker/` directory.

```bash
# 1. Install wrangler globally if you don't have it
npm install -g wrangler

# 2. Log in to Cloudflare (opens a browser)
wrangler login

# 3. Set the Resend API key as a secret
wrangler secret put RESEND_API_KEY
#   → paste the key from your Resend dashboard

# 4. Set the Firebase service account JSON as a secret.
#    Generate the key first:
#      https://console.firebase.google.com/project/letterinthescroll/settings/serviceaccounts/adminsdk
#      → "Generate new private key" → downloads a JSON file
#    Then run:
wrangler secret put FIREBASE_SERVICE_ACCOUNT_JSON
#   → paste the entire contents of the downloaded JSON file
#     (yes, the whole thing including the {} braces)

# 5. Deploy
wrangler deploy
```

You'll see something like `Published alits-parsha-reminder (1.23 sec)` and
the routes bound to your domain.

## Verifying it works

```bash
# Tail logs in real time
wrangler tail

# Manually trigger the cron (from another terminal — uses the deployed worker)
curl -X POST "https://api.cloudflare.com/client/v4/accounts/<ACCOUNT_ID>/workers/scripts/alits-parsha-reminder/schedules" \
  -H "Authorization: Bearer <CF_API_TOKEN>"
```

Or simply wait until Wednesday and check `wrangler tail` from 17:00 UTC.

## Updating

Whenever you change a file in `src/`, just re-run:
```bash
wrangler deploy
```
Secrets persist across deploys; you don't need to re-set them.

## Environment

| Variable | Where set | What it is |
|---|---|---|
| `RESEND_API_KEY` | `wrangler secret put` | Resend dashboard |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | `wrangler secret put` | Firebase admin SDK service account JSON |
| `SITE_URL` | `wrangler.toml` `[vars]` | `https://www.aletterinthescroll.com` |
| `FROM_EMAIL` | `wrangler.toml` `[vars]` | `A Letter in the Scroll <hello@aletterinthescroll.com>` |
| `FIREBASE_PROJECT_ID` | `wrangler.toml` `[vars]` | `letterinthescroll` |
