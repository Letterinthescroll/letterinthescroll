# LetterInTheScroll — Project Memory

## Architecture
- **Firebase** app: `letterinthescroll` project
- **Auth**: Firebase Auth with localStorage persistence
- Main pages: `dashboard.html` (main.js + Firebase), `study.html` (main.js)
- Secondary pages: `prayers.html`, `songs.html`, `about.html`, `song-detail.html`

## Header System
- CSS classes in `css/style.css` (header section ~line 2478, modern dropdown ~end of file)
- `dashboard.html` + `study.html`: user dropdown built dynamically by **main.js** `updateHeaderUserDropdown()`
- Secondary pages (prayers, songs, about): user dropdown built by **`js/page-auth.js`** (ES module)
- `js/header-fallback.js`: handles redirect wiring for nav links on secondary pages

## Header Nav Structure (all pages)
Nav buttons: Home, Study, Holidays, Prayers, Songs
User dropdown (pill): About, Bookmarks, Account Settings, Sign Out
**About and Bookmarks are in the dropdown — NOT in the main nav**

## Text Size Control
- Only on `study.html` (has `data-enable-text-size="true"` + loads `js/text-size-control.js`)
- Removed from about/prayers/songs pages

## Presence / Community Bar
- `js/presence.js` removed from about, prayers, songs pages
- Secondary pages use `js/page-auth.js` instead (no community bar, just auth + dropdown)

## Key CSS Classes
- `.header-user-pill` — the name/avatar button in header
- `.header-user-avatar` — gold circle with initial
- `.header-dropdown` — dropdown panel (toggled with `.open` class)
- `.header-dropdown-item` — link/button row inside dropdown
- `.header-dropdown-item--danger` — red sign-out style

## User Name Display
- `js/name-utils.js` exports `getDisplayNameFromEmail(email)` — maps emails to real names
- Used in both main.js and page-auth.js
