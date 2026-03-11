/**
 * page-auth.js - Lightweight Firebase auth for secondary pages
 * Adds the user dropdown (name, About, Bookmarks, Settings, Sign Out)
 * WITHOUT community presence tracking.
 */

import { initAuth, getUserInfo } from './firebase.js';
import { getDisplayNameFromEmail } from './name-utils.js';

// ── Inject skeleton pill immediately (prevents layout shift) ──────────────
(function injectSkeleton() {
    const headerActions = document.getElementById('header-actions');
    if (!headerActions) return;
    const skeleton = document.createElement('div');
    skeleton.id = 'header-user-dropdown-container';
    skeleton.style.cssText = 'position:relative;display:flex;align-items:center;';
    skeleton.innerHTML = `
        <div class="header-user-pill" style="opacity:0;pointer-events:none;min-width:88px;" aria-hidden="true">
            <div class="header-user-avatar"></div>
            <span class="header-btn-text" style="min-width:42px;">&nbsp;</span>
        </div>`;
    headerActions.appendChild(skeleton);
})();

function buildHeaderDropdown(firstName, email) {
    const headerActions = document.getElementById('header-actions');
    if (!headerActions) return;

    // Remove old standalone buttons and the skeleton
    ['logout-btn', 'my-bookmarks-btn', 'header-user-dropdown-container'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.remove();
    });

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
                <a href="/about" class="header-dropdown-item" role="menuitem">
                    <svg class="header-dropdown-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    About
                </a>
                <a href="/bookmarks" id="my-bookmarks-btn" class="header-dropdown-item" role="menuitem">
                    <svg class="header-dropdown-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
                    </svg>
                    Bookmarks
                </a>
                <a href="/settings" class="header-dropdown-item" role="menuitem">
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

    logoutBtn.addEventListener('click', () => {
        window.location.href = '/';
    });
}

// Initialize - initAuth will redirect to index.html if not signed in
initAuth(async (user) => {
    if (!user) return;
    const email = user.email || '';

    // Try Firestore displayName first, fall back to email-derived name
    let firstName = '';
    try {
        const profile = await getUserInfo(user.uid);
        if (profile && profile.displayName && profile.displayName !== 'Friend') {
            firstName = profile.displayName.split(' ')[0];
        }
    } catch (e) { /* ignore */ }

    if (!firstName) {
        const fullName = getDisplayNameFromEmail(email);
        firstName = fullName.split(' ')[0];
    }

    buildHeaderDropdown(firstName, email);
});
