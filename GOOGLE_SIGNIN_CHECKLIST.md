# Google Sign-In — Console Verification Checklist

The code paths for Google sign-in were hardened on 2026-06-14 (see `index.html`,
`teachers/index.html`). The remaining causes of "users can't log in with Google"
live in the **Firebase Console** and **Google Cloud Console** — they can't be
fixed from code. Work through these in order; each step says exactly what to
click and what "correct" looks like.

## Verified facts about this site (already checked)

- Live origin is always **`https://www.aletterinthescroll.com`**.
  The apex `aletterinthescroll.com` 301-redirects to `www.`, so every user
  ends up on `www` before signing in.
- Firebase `authDomain` is **`letterinthescroll.firebaseapp.com`** (do **not**
  change this — switching it to the custom domain 404s the OAuth handler).
- The OAuth handler `https://letterinthescroll.firebaseapp.com/__/auth/handler`
  is reachable (returns 200).

Because the handler lives on `letterinthescroll.firebaseapp.com`, that is the
domain Google redirects through. The custom domain only needs to be an
**authorized domain** in Firebase — it does **not** need its own OAuth redirect
URI.

---

## 1. Firebase Authorized Domains  ← most likely culprit

**Firebase Console → Authentication → Settings → Authorized domains**
(direct: https://console.firebase.google.com/project/letterinthescroll/authentication/settings)

The list **must** contain all of:

- [ ] `www.aletterinthescroll.com`   ← the real origin; if missing, **every**
      Google sign-in fails with `auth/unauthorized-domain`
- [ ] `aletterinthescroll.com`        ← belt-and-suspenders (in case the apex
      redirect is ever removed or a user hits the handler pre-redirect)
- [ ] `letterinthescroll.firebaseapp.com`  (added by default — leave it)
- [ ] `localhost`  (added by default — leave it; needed for local testing)

If `www.aletterinthescroll.com` is **not** there, add it. This alone explains a
total Google-login outage.

> How to confirm this is the failure mode: open the live site, open DevTools →
> Console, click "Continue with Google" on **desktop**. If you see
> `auth/unauthorized-domain`, this list is the problem.

---

## 2. Google sign-in provider is actually enabled

**Firebase Console → Authentication → Sign-in method**
(direct: https://console.firebase.google.com/project/letterinthescroll/authentication/providers)

- [ ] **Google** row shows **Enabled**.
- [ ] A **support email** is set on the Google provider (Firebase refuses the
      provider without one — symptom: `auth/operation-not-allowed`).

---

## 3. Google Cloud OAuth client — Authorized redirect URIs

**Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs →
(the "Web client" Firebase created)**
(direct: https://console.cloud.google.com/apis/credentials?project=letterinthescroll)

Under **Authorized redirect URIs**, confirm this exact entry exists:

- [ ] `https://letterinthescroll.firebaseapp.com/__/auth/handler`

Under **Authorized JavaScript origins**, it's fine (and recommended) to have:

- [ ] `https://letterinthescroll.firebaseapp.com`
- [ ] `https://www.aletterinthescroll.com`

> Firebase normally manages this client automatically, but if anyone edited the
> OAuth client by hand, the redirect URI can get dropped — which breaks the
> popup with `redirect_uri_mismatch` (visible in the popup window itself before
> it closes).

---

## 4. OAuth consent screen is not stuck in "Testing"

**Google Cloud Console → APIs & Services → OAuth consent screen**
(direct: https://console.cloud.google.com/apis/credentials/consent?project=letterinthescroll)

- [ ] **Publishing status = In production.**
      If it says **Testing**, only the hand-listed "Test users" can sign in —
      everyone else gets blocked (`access_denied` / "app not verified" wall).
      This is a very common cause of "it works for me but not for my users."
- [ ] **User type = External.**

---

## 5. Re-test after any change

Changes to authorized domains/redirect URIs can take a few minutes to
propagate. Then test all four paths:

- [ ] **Desktop, normal browser** — popup flow. Should land on `/dashboard`.
- [ ] **Mobile Safari (iOS)** — full-page redirect flow. Should return and land
      on `/dashboard` without bouncing back to login.
- [ ] **Mobile Chrome (Android)** — redirect flow.
- [ ] **Inside Instagram/Facebook in-app browser** — should now show the
      "open in Safari/Chrome" guidance instead of failing silently.

If any path still fails, capture the **exact `auth/...` error code** from the
DevTools console (desktop) or the visible on-page error, and match it to the
section above:

| Error code / symptom                | Section |
|-------------------------------------|---------|
| `auth/unauthorized-domain`          | 1       |
| `auth/operation-not-allowed`        | 2       |
| `redirect_uri_mismatch` (in popup)  | 3       |
| `access_denied` / "app not verified"| 4       |
| popup opens then closes, no error   | code fix already handles success-misreported-as-closed; if still stuck, check 3 |
