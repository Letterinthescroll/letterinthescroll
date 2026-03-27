/**
 * page-auth.js - Lightweight Firebase auth for secondary pages
 * Adds the user dropdown (name, About, Bookmarks, Settings, Sign Out)
 * WITHOUT community presence tracking.
 *
 * Uses sessionStorage cache so the pill renders instantly across tab switches.
 */

import { initAuth, getUserInfo, signOutUser, db } from './firebase.js';
import { getDisplayNameFromEmail } from './name-utils.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const CACHE_KEY = 'headerUserCache';

// ── Try to render from cache immediately (no skeleton flash) ────────────
(function injectFromCacheOrSkeleton() {
    const headerActions = document.getElementById('header-actions');
    if (!headerActions) return;

    let cached = null;
    try { cached = JSON.parse(sessionStorage.getItem(CACHE_KEY)); } catch (_) { /* ignore */ }

    if (cached && cached.firstName && cached.email) {
        // Render the real dropdown instantly from cache
        buildHeaderDropdown(cached.firstName, cached.email);
    } else {
        // No cache — show skeleton pill to reserve space
        const skeleton = document.createElement('div');
        skeleton.id = 'header-user-dropdown-container';
        skeleton.style.cssText = 'position:relative;display:flex;align-items:center;';
        skeleton.innerHTML = `
            <div class="header-user-pill" style="opacity:0;pointer-events:none;min-width:88px;" aria-hidden="true">
                <div class="header-user-avatar"></div>
                <span class="header-btn-text" style="min-width:42px;">&nbsp;</span>
            </div>`;
        headerActions.appendChild(skeleton);
    }
})();

function buildHeaderDropdown(firstName, email) {
    const headerActions = document.getElementById('header-actions');
    if (!headerActions) return;

    // Remove old standalone buttons and the skeleton
    ['logout-btn', 'my-bookmarks-btn', 'header-user-dropdown-container'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.remove();
    });
    // Also remove any body-level dropdown/backdrop from a previous build
    const oldDrop = document.getElementById('header-user-dropdown');
    const oldBack = document.getElementById('header-dropdown-backdrop');
    if (oldDrop) oldDrop.remove();
    if (oldBack) oldBack.remove();

    const container = document.createElement('div');
    container.id = 'header-user-dropdown-container';
    container.style.cssText = 'position:relative;display:flex;align-items:center;';

    const initial = firstName.charAt(0).toUpperCase();

    // Pill button stays inside the header
    container.innerHTML = `
        <button id="header-user-menu-btn"
                class="header-user-pill"
                title="Account Menu"
                aria-haspopup="true"
                aria-expanded="false">
            <div class="header-user-avatar" aria-hidden="true">${initial}</div>
            <span class="header-btn-text">${firstName}</span>
            <svg class="header-user-chevron" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/>
            </svg>
        </button>
    `;
    headerActions.appendChild(container);

    // Dropdown panel + backdrop live on document.body — nothing can clip them
    const backdrop = document.createElement('div');
    backdrop.id = 'header-dropdown-backdrop';
    backdrop.className = 'header-dropdown-backdrop';
    document.body.appendChild(backdrop);

    const dropdown = document.createElement('div');
    dropdown.id = 'header-user-dropdown';
    dropdown.className = 'header-dropdown';
    dropdown.setAttribute('role', 'menu');
    dropdown.setAttribute('aria-hidden', 'true');
    dropdown.innerHTML = `
            <div class="header-dropdown-header">
                <div class="header-dropdown-avatar-lg" aria-hidden="true">${initial}</div>
                <div class="header-dropdown-user-info">
                    <p class="header-dropdown-display-name">${firstName}</p>
                    <p class="header-dropdown-email" title="${email}">${email}</p>
                </div>
            </div>
            <div class="header-dropdown-section">
                <a href="/bookmarks" id="my-bookmarks-btn" class="header-dropdown-item" role="menuitem">
                    <svg class="header-dropdown-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
                    </svg>
                    Bookmarks
                </a>
                <a href="/flashcards" class="header-dropdown-item" role="menuitem" onclick="if(localStorage.getItem('alits_hebrew_study_mode')!=='true'){event.preventDefault();showStudyModeModal();}">
                    <svg class="header-dropdown-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <rect x="3" y="6" width="15" height="11" rx="1.5" stroke-width="2"/>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 4h13a1.5 1.5 0 011.5 1.5V15"/>
                    </svg>
                    Flashcards
                </a>
                <a href="/journal" class="header-dropdown-item" role="menuitem">
                    <svg class="header-dropdown-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                    Spiritual Journal
                </a>
                <a href="/settings" id="header-settings-link" class="header-dropdown-item" role="menuitem">
                    <svg class="header-dropdown-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                    Account Settings
                </a>
            </div>
            <div class="header-dropdown-section">
                <button id="page-auth-logout-btn" class="header-dropdown-item header-dropdown-item--danger" role="menuitem">
                    <svg class="header-dropdown-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                    </svg>
                    Sign Out
                </button>
            </div>
    `;
    document.body.appendChild(dropdown);

    const menuBtn    = container.querySelector('#header-user-menu-btn');
    const logoutBtn  = dropdown.querySelector('#page-auth-logout-btn');

    function positionDropdown() {
        const rect = menuBtn.getBoundingClientRect();
        dropdown.style.top = (rect.bottom + 8) + 'px';
        dropdown.style.right = Math.max(8, window.innerWidth - rect.right) + 'px';
    }

    function openDropdown() {
        positionDropdown();
        dropdown.classList.add('open');
        backdrop.classList.add('open');
        menuBtn.setAttribute('aria-expanded', 'true');
        dropdown.setAttribute('aria-hidden', 'false');
    }

    function closeDropdown() {
        dropdown.classList.remove('open');
        backdrop.classList.remove('open');
        menuBtn.setAttribute('aria-expanded', 'false');
        dropdown.setAttribute('aria-hidden', 'true');
    }

    menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.contains('open') ? closeDropdown() : openDropdown();
    });

    backdrop.addEventListener('click', closeDropdown);

    document.addEventListener('click', (e) => {
        if (!container.contains(e.target) && !dropdown.contains(e.target)) closeDropdown();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeDropdown();
    });

    logoutBtn.addEventListener('click', async () => {
        sessionStorage.removeItem(CACHE_KEY);
        sessionStorage.setItem('justSignedOut', '1');
        try { await signOutUser(); } catch (_) { /* proceed to redirect */ }
        window.location.href = '/';
    });

}

window.showStudyModeModal = showStudyModeModal;
function showStudyModeModal() {
    if (document.getElementById('study-mode-gate-modal')) return;
    const overlay = document.createElement('div');
    overlay.id = 'study-mode-gate-modal';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.45);backdrop-filter:blur(4px);animation:fadeIn .18s ease';
    overlay.innerHTML = `
        <style>
            @keyframes fadeIn{from{opacity:0}to{opacity:1}}
            @keyframes slideUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
            #study-mode-gate-modal .smg-card{background:#fff;border-radius:1.35rem;padding:2rem 2rem 1.6rem;max-width:380px;width:90%;box-shadow:0 24px 60px rgba(0,0,0,.18);animation:slideUp .22s ease;text-align:center}
            #study-mode-gate-modal .smg-icon{width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#f0f7ff,#ede9fe);display:flex;align-items:center;justify-content:center;margin:0 auto 1rem}
            #study-mode-gate-modal .smg-title{font-family:'Poppins',sans-serif;font-size:1.1rem;font-weight:700;color:#1a1a2e;margin-bottom:.45rem}
            #study-mode-gate-modal .smg-body{font-size:.82rem;color:#6b7280;line-height:1.6;margin-bottom:1.4rem}
            #study-mode-gate-modal .smg-actions{display:flex;gap:.55rem;justify-content:center}
            #study-mode-gate-modal .smg-btn{padding:.52rem 1.2rem;border-radius:2rem;font-size:.78rem;font-weight:600;cursor:pointer;border:none;font-family:'Poppins',sans-serif;transition:all .15s}
            #study-mode-gate-modal .smg-btn-primary{background:#1a1a2e;color:#fff}
            #study-mode-gate-modal .smg-btn-primary:hover{background:#2d2d4e}
            #study-mode-gate-modal .smg-btn-secondary{background:#f3f4f6;color:#374151}
            #study-mode-gate-modal .smg-btn-secondary:hover{background:#e5e7eb}
        </style>
        <div class="smg-card">
            <div class="smg-icon">
                <svg width="22" height="22" fill="none" stroke="#6d28d9" viewBox="0 0 24 24"><rect x="3" y="6" width="15" height="11" rx="1.5" stroke-width="2"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 4h13a1.5 1.5 0 011.5 1.5V15"/></svg>
            </div>
            <div class="smg-title">Hebrew Study Mode is off</div>
            <div class="smg-body">Flashcards are part of Hebrew Study Mode — a feature that lets you save words as you read and review them with spaced repetition.<br><br>Turn it on in Settings to get started.</div>
            <div class="smg-actions">
                <button class="smg-btn smg-btn-secondary" id="smg-close">Maybe later</button>
                <button class="smg-btn smg-btn-primary" id="smg-settings">Go to Settings</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('#smg-close').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#smg-settings').addEventListener('click', () => { window.location.href = '/settings#sec-hebrew-study'; });
}

// Initialize - initAuth will redirect to index.html if not signed in
initAuth(async (user) => {
    if (!user) {
        sessionStorage.removeItem(CACHE_KEY);
        return;
    }
    const email = user.email || '';

    // Build dropdown immediately with email-derived name so it's functional
    // while we fetch the Firestore displayName in the background.
    const fallbackName = getDisplayNameFromEmail(email).split(' ')[0];
    buildHeaderDropdown(fallbackName, email);

    // Try Firestore displayName — if different, rebuild with the real name
    let firstName = '';
    try {
        const profile = await getUserInfo(user.uid);
        if (profile && profile.displayName && profile.displayName !== 'Friend') {
            firstName = profile.displayName.split(' ')[0];
        }
    } catch (e) { /* ignore */ }

    if (!firstName) firstName = fallbackName;

    // Cache for instant rendering on next page load
    try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ firstName, email, uid: user.uid }));
    } catch (_) { /* ignore */ }

    // Rebuild dropdown with authoritative name (only if different from fallback)
    if (firstName !== fallbackName) {
        buildHeaderDropdown(firstName, email);
    }

    // Show notification dot on avatar + Settings link if birthday is missing
    try {
        const userSnap = await getDoc(doc(db, 'users', user.uid));
        if (userSnap.exists() && !userSnap.data().birthDateGregorian) {
            // Red dot on the header avatar
            const avatar = document.querySelector('#header-user-menu-btn .header-user-avatar');
            if (avatar && !avatar.querySelector('.profile-incomplete-dot')) {
                const avatarDot = document.createElement('span');
                avatarDot.className = 'profile-incomplete-dot';
                avatarDot.title = 'Complete your profile';
                avatar.appendChild(avatarDot);
            }
            // Red dot on the Settings dropdown link
            const settingsLink = document.getElementById('header-settings-link');
            if (settingsLink && !settingsLink.querySelector('.settings-notif-dot')) {
                settingsLink.href = '/settings/?section=birthday';
                const dot = document.createElement('span');
                dot.className = 'settings-notif-dot';
                dot.title = 'Complete your profile';
                settingsLink.appendChild(dot);
            }
        }
    } catch (_) {}
});
