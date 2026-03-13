// UI Module - Handles all DOM manipulation - NO EMOJIS
import { state } from './state.js';
import { getDisplayNameFromEmail } from './name-utils.js';

/**
 * Show loading state
 */
export function showLoading() {
    document.getElementById('loading-message').classList.remove('hidden');
    document.getElementById('parsha-text').innerHTML = '';
}

/**
 * Hide loading state
 */
export function hideLoading() {
    document.getElementById('loading-message').classList.add('hidden');
}

/**
 * Show error message
 */
export function showError(message) {
    const errorElement = document.getElementById('error-message');
    document.getElementById('error-text').textContent = message;
    errorElement.classList.remove('hidden');
}

/**
 * Hide error message
 */
export function hideError() {
    document.getElementById('error-message').classList.add('hidden');
}

/**
 * Update parsha header
 */
export function updateParshaHeader(title, reference) {
    document.getElementById('parsha-title').textContent = title;
    document.getElementById('parsha-reference').textContent = reference;
}

/**
 * Highlight current week's parsha
 */
export function highlightCurrentParsha(parshaRef) {
    const contentArea = document.getElementById('content-area');
    if (parshaRef === state.currentParshaRef) {
        contentArea.classList.add('current-parsha-highlight');
    } else {
        contentArea.classList.remove('current-parsha-highlight');
    }
}

/**
 * Update navigation buttons state
 */
export function updateNavigationButtons() {
    const prevButton = document.getElementById('prev-parsha');
    const nextButton = document.getElementById('next-parsha');
    
    prevButton.disabled = state.currentParshaIndex <= 0;
    nextButton.disabled = state.currentParshaIndex >= state.allParshas.length - 1;
}

/**
 * Populate parsha selector dropdown
 */
export function populateParshaSelector() {
    // Get ALL select elements with id 'parsha-selector' (desktop and mobile)
    const selectors = document.querySelectorAll('select#parsha-selector');

    // Populate each select element with all parshas
    selectors.forEach((selector) => {
        selector.innerHTML = '';

        state.allParshas.forEach((parsha, index) => {
            const option = document.createElement('option');
            option.value = parsha.reference;
            option.textContent = `${parsha.name} (${parsha.reference})`;
            if (parsha.reference === state.currentParshaRef) {
                option.selected = true;
            }
            selector.appendChild(option);
        });
    });
}

/**
 * Show info panel (modal)
 */
export function showInfoPanel() {
    const panel = document.getElementById('info-panel');
    panel.classList.remove('hidden');
    requestAnimationFrame(() => panel.classList.add('is-visible'));
    document.body.style.overflow = 'hidden';
    // Hide text size control (and close any portalled menu) while popup is open
    const textSizeCtrl = document.querySelector('.text-size-control');
    if (textSizeCtrl) {
        textSizeCtrl.style.visibility = 'hidden';
        textSizeCtrl.classList.remove('open');
    }
    // Also hide the menu if it was portalled to body
    const textSizeMenu = document.querySelector('.text-size-menu');
    if (textSizeMenu) textSizeMenu.style.display = 'none';
}

/**
 * Hide info panel (modal)
 */
export function hideInfoPanel() {
    const panel = document.getElementById('info-panel');
    panel.classList.remove('is-visible');
    setTimeout(() => panel.classList.add('hidden'), 250);
    const infoContent = document.getElementById('info-content');
    if (infoContent) {
        infoContent.classList.remove('info-content-bookmarks');
    }
    document.body.style.overflow = 'auto';
    // Restore text size control
    const textSizeCtrl = document.querySelector('.text-size-control');
    if (textSizeCtrl) textSizeCtrl.style.visibility = '';
    // Restore portalled menu display (it manages its own open/close state)
    const textSizeMenu = document.querySelector('.text-size-menu');
    if (textSizeMenu) textSizeMenu.style.display = '';
}

/**
 * Display keyword definition in info panel - NO EMOJIS
 */
export function showKeywordDefinition(word, definition) {
    const titleEl = document.querySelector('.info-panel-title');
    if (titleEl) titleEl.textContent = 'Definition';
    const infoContent = document.getElementById('info-content');
    infoContent.classList.remove('info-content-bookmarks');
    infoContent.innerHTML = `
        <div class="definition-container">
            <div class="definition-word">${escapeHtml(word)}</div>
            <div class="definition-text">${formatText(definition)}</div>
        </div>
    `;
    showInfoPanel();
}

/**
 * Display commentary in info panel - NO EMOJIS
 */
export function showCommentary(verseRef, commentaries) {
    if (!commentaries || commentaries.length === 0) return;
    const titleEl = document.querySelector('.info-panel-title');
    if (titleEl) titleEl.textContent = 'Commentary & Insights';
    const infoContent = document.getElementById('info-content');
    infoContent.classList.remove('info-content-bookmarks');
    let html = `<h4 class="text-lg font-bold mb-4 text-blue-900 border-b-2 border-blue-200 pb-2">${escapeHtml(verseRef)}</h4>`;
    
    commentaries.forEach(commentary => {
        const formattedExplanation = commentary.source === 'Mishpatim Laws Explained'
            ? formatMishpatimCommentaryText(commentary.explanation)
            : formatText(commentary.explanation);

        html += `
            <div class="commentary-item">
                <div class="commentary-source">${escapeHtml(commentary.source)}</div>
                <div class="commentary-text">${formattedExplanation}</div>
            </div>
        `;
    });
    
    infoContent.innerHTML = html;
    showInfoPanel();
}

/**
 * Show verse significance explanation
 */
export function showVerseSignificance(verseRef, explanation) {
    const modal = document.getElementById('verse-significance-modal');
    const referenceElement = document.getElementById('verse-significance-reference');
    const contentElement = document.getElementById('verse-significance-content');

    // Set the verse reference
    referenceElement.textContent = verseRef;

    // Set the explanation content
    contentElement.innerHTML = `<p class="text-lg">${escapeHtml(explanation)}</p>`;

    // Show the modal
    modal.classList.remove('hidden');

    // Close button handler
    const closeBtn = document.getElementById('close-verse-significance');
    closeBtn.onclick = () => {
        modal.classList.add('hidden');
    };

    // Close on overlay click
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    };
}

// ========================================
// COMMENT PANEL FUNCTIONS
// ========================================

/**
 * Open comments panel for a specific verse or general parsha chat
 */
export function openCommentsPanel(verseRef, onOpen, customTitle = null) {
    const panel = document.getElementById('comment-panel');
    const overlay = document.getElementById('comment-overlay');
    const titleElement = document.getElementById('comment-panel-title');
    const verseRefInput = document.getElementById('current-comment-verse-ref');
    const commentsList = document.getElementById('comments-list');
    
    // Store verse reference
    verseRefInput.value = verseRef;
    
    // Update title - use custom title for general chat, or verse reference otherwise
    if (customTitle) {
        titleElement.textContent = `General Discussion: ${customTitle}`;
    } else {
        titleElement.textContent = `Discussion: ${verseRef}`;
    }
    
    // Update placeholder text based on type of chat
    const commentInput = document.getElementById('comment-input');
    if (verseRef.startsWith('PARSHA:')) {
        commentInput.placeholder = 'Share your thoughts about this parsha...';
    } else {
        commentInput.placeholder = 'Share your insights on this verse...';
    }
    
    // Show loading state
    commentsList.innerHTML = '<div class="loading-comments">Loading comments...</div>';
    
    // Show panel and overlay
    overlay.classList.remove('hidden');
    panel.classList.add('active');
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    
    // Check and display username status
    updateUsernameDisplay();
    
    // Restore any persistent comment status messages
    restoreCommentStatus();
    
    // Call the onOpen callback to start listening for comments
    if (onOpen) {
        onOpen(verseRef);
    }
}

/**
 * Close comments panel
 */
export function closeCommentsPanel(onClose) {
    const panel = document.getElementById('comment-panel');
    const overlay = document.getElementById('comment-overlay');
    
    // Hide panel and overlay
    panel.classList.remove('active');
    overlay.classList.add('hidden');
    
    // Restore body scroll
    document.body.style.overflow = 'auto';
    
    // Clear input but DON'T clear the status message (it should persist)
    document.getElementById('comment-input').value = '';
    
    // Call the onClose callback to stop listening
    if (onClose) {
        onClose();
    }
}

/**
 * Display comments in the panel with username
 */
export function displayComments(commentsArray) {
    const commentsList = document.getElementById('comments-list');

    if (!commentsList) {
        console.error('comments-list element not found!');
        return;
    }

    if (!commentsArray || commentsArray.length === 0) {
        commentsList.innerHTML = `
            <div class="no-comments">
                <p>No comments yet.</p>
                <p class="text-sm">Be the first to share your insights!</p>
            </div>
        `;
        return;
    }

    let html = '';
    commentsArray.forEach(comment => {
        const displayName = comment.username || 'Anonymous';
        const timestamp = formatTimestamp(comment.timestamp);

        html += `
            <div class="comment-item">
                <div class="comment-meta">
                    <span class="comment-user">${escapeHtml(displayName)}</span>
                    <span class="comment-time">${escapeHtml(timestamp)}</span>
                </div>
                <div class="comment-text">${escapeHtml(comment.text)}</div>
            </div>
        `;
    });

    commentsList.innerHTML = html;
}

/**
 * Update comment input state based on authentication
 */
export function updateCommentInputState(isLoggedIn) {
    const commentInput = document.getElementById('comment-input');
    const submitButton = document.getElementById('submit-comment-btn');
    
    if (isLoggedIn) {
        commentInput.disabled = false;
        submitButton.disabled = false;
        commentInput.placeholder = 'Share your insights on this verse...';
    } else {
        commentInput.disabled = true;
        submitButton.disabled = true;
        commentInput.placeholder = 'Connecting...';
    }
}

// Name extraction handled in shared name-utils module

/**
 * Update name display in comment panel based on current user email
 */
export function updateUsernameDisplay() {
    const nameDisplay = document.getElementById('name-display');
    const currentUsernameSpan = document.getElementById('current-username');

    // Pages without a comment panel won't have these elements
    if (!nameDisplay || !currentUsernameSpan) return;

    // Get the current user's email from localStorage (set during authentication)
    const userEmail = localStorage.getItem('currentUserEmail');

    if (userEmail) {
        // Show name display
        nameDisplay.classList.remove('hidden');
        const displayName = getDisplayNameFromEmail(userEmail);
        currentUsernameSpan.textContent = displayName;
    } else {
        // Hide name display if no email
        nameDisplay.classList.add('hidden');
    }
}

/**
 * Set current user email (called during authentication)
 */
export function setCurrentUserEmail(email) {
    if (email) {
        localStorage.setItem('currentUserEmail', email);
    } else {
        localStorage.removeItem('currentUserEmail');
    }
    updateUsernameDisplay();
}

/**
 * Get display name from email
 */
export function getSavedUsername() {
    const userEmail = localStorage.getItem('currentUserEmail');
    return userEmail ? getDisplayNameFromEmail(userEmail) : 'Anonymous';
}

/**
 * Deprecated - for backward compatibility
 * Use getSavedUsername() instead
 */
export function saveUsername(email) {
    if (email) {
        setCurrentUserEmail(email);
        return true;
    }
    return false;
}

/**
 * Show comment status message - PERSISTENT (stores in sessionStorage)
 */
export function showCommentStatus(message, isError = false) {
    const statusElement = document.getElementById('comment-status');
    statusElement.textContent = message;
    statusElement.className = 'comment-status ' + (isError ? 'error' : 'success');
    
    // Store success messages in sessionStorage so they persist across refreshes
    if (!isError) {
        sessionStorage.setItem('torahStudyCommentStatus', JSON.stringify({
            message: message,
            timestamp: Date.now()
        }));
    }
    
    // Only clear error messages after 5 seconds
    if (isError) {
        setTimeout(() => {
            statusElement.textContent = '';
            statusElement.className = 'comment-status';
        }, 5000);
    }
}

/**
 * Clear comment status message
 */
export function clearCommentStatus() {
    const statusElement = document.getElementById('comment-status');
    statusElement.textContent = '';
    statusElement.className = 'comment-status';
    sessionStorage.removeItem('torahStudyCommentStatus');
}

/**
 * Restore comment status from sessionStorage (call on panel open)
 */
export function restoreCommentStatus() {
    const stored = sessionStorage.getItem('torahStudyCommentStatus');
    if (stored) {
        try {
            const { message, timestamp } = JSON.parse(stored);
            // Only show if less than 5 minutes old
            if (Date.now() - timestamp < 5 * 60 * 1000) {
                const statusElement = document.getElementById('comment-status');
                statusElement.textContent = message;
                statusElement.className = 'comment-status success';
            } else {
                sessionStorage.removeItem('torahStudyCommentStatus');
            }
        } catch (e) {
            console.error('Error restoring comment status:', e);
        }
    }
}

/**
 * Format timestamp for display
 */
function formatTimestamp(timestamp) {
    if (!timestamp || !timestamp.toDate) {
        return 'Just now';
    }
    
    const date = timestamp.toDate();
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Format text with basic markdown-style formatting
 * Converts *text* to <strong>text</strong> for bold
 * While still escaping dangerous HTML
 * FIXED: Now properly removes asterisks and applies bold formatting
 */
function formatText(text) {
    if (!text) return '';

    // First escape all HTML to prevent XSS
    let escaped = escapeHtml(text);

    // Then apply safe formatting:
    // Convert *text* to <strong>text</strong> for bold
    // Use non-greedy match and replace the entire pattern including asterisks
    escaped = escaped.replace(/\*([^*]+)\*/g, '<strong>$1</strong>');

    return escaped;
}

function formatMishpatimCommentaryText(text) {
    if (!text) return '';

    // Escape first to keep rendering safe.
    let escaped = escapeHtml(text).replace(/\r\n/g, '\n').trim();

    // Remove markdown markers so no stray asterisks appear.
    escaped = escaped.replace(/\*\*([^*]+)\*\*/g, '$1');
    escaped = escaped.replace(/\*([^*]+)\*/g, '$1');

    // Split law section from explanatory section if present.
    const logicSplit = escaped.split(/\n*\s*(?:The Logic|The Why|Explanation)\s*:?\s*\n*/i);
    const lawRaw = (logicSplit[0] || '').trim();
    const logicRaw = (logicSplit[1] || '').trim();

    const parts = [];

    const lawBlocks = lawRaw
        ? lawRaw.split(/\n\s*\n/).map(block => block.trim()).filter(Boolean)
        : [];

    if (lawBlocks.length > 0) {
        const summary = lawBlocks[0]
            .replace(/^The Law\s*:?\s*\n?/i, '')
            .replace(/^Law:\s*/i, '')
            .replace(/\n/g, '<br>');
        parts.push(`<div><strong>Law:</strong> ${summary}</div>`);

        lawBlocks.slice(1).forEach((block) => {
            const match = block.match(/^(How to follow today|How to follow|Practical takeaway|What to do|In simple terms|Context|Explanation)\s*:?\s*\n?([\s\S]*)$/i);
            if (match) {
                const label = match[1].toLowerCase();
                const heading = label.startsWith('how to follow') ? 'How to follow'
                    : label.startsWith('practical') ? 'Practical takeaway'
                    : label.startsWith('what to do') ? 'What to do'
                    : label.startsWith('in simple') ? 'In simple terms'
                    : label.startsWith('context') ? 'Context'
                    : label.startsWith('explanation') ? 'Explanation'
                    : match[1];
                const body = (match[2] || '').trim();
                parts.push(`<div style="margin-top: 0.6rem;"><strong>${heading}</strong></div>`);
                if (body) {
                    parts.push(`<div>${body.replace(/\n/g, '<br>')}</div>`);
                }
                return;
            }

            parts.push(`<div style="margin-top: 0.55rem;">${block.replace(/\n/g, '<br>')}</div>`);
        });
    }

    if (logicRaw) {
        const hasExplanationHeading = /\bExplanation\s*\n/i.test(escaped);
        const detailHeading = hasExplanationHeading ? 'Explanation' : 'The Logic';
        parts.push(`<div style="margin-top: 1.9rem;"><strong style="font-weight: 800;">${detailHeading}</strong></div>`);
        parts.push(`<div>${logicRaw.replace(/\n/g, '<br>')}</div>`);
    }

    if (parts.length === 0) {
        return escaped.replace(/\n/g, '<br>');
    }

    return parts.join('');
}

// ========================================
// USER STATUS DISPLAY FUNCTIONS (HEADER BAR)
// ========================================

let lastLoginIntervalId = null;
let lastLoginTimestamp = null;

const THIRTY_MINUTES_MS = 30 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const THREE_WEEKS_MS = 21 * ONE_DAY_MS;
const ONLINE_STALE_THRESHOLD_MS = 2 * 60 * 1000;

const BADGE_STATUS_CLASSES = ['status-badge--green', 'status-badge--yellow', 'status-badge--gray'];
const DOT_STATUS_CLASSES = ['status-dot--green', 'status-dot--yellow', 'status-dot--gray'];
const TEXT_STATUS_CLASSES = ['status-text--green', 'status-text--yellow', 'status-text--gray'];

function updateCommunityStatusLayout() {
    const statusBar = document.getElementById('community-status-bar');
    if (!statusBar) {
        return;
    }

    const sections = [
        document.getElementById('header-online-section'),
        document.getElementById('header-your-status')
    ];

    const visibleSections = [];

    sections.forEach((section) => {
        if (!section) {
            return;
        }
        section.classList.remove('status-section--with-divider');
        if (!section.classList.contains('hidden')) {
            visibleSections.push(section);
        }
    });

    visibleSections.forEach((section, index) => {
        if (index > 0) {
            section.classList.add('status-section--with-divider');
        }
    });

    if (visibleSections.length === 0 && !statusBar.dataset.alwaysVisible) {
        statusBar.classList.add('hidden');
    } else {
        statusBar.classList.remove('hidden');
    }
}

function convertToDate(timestamp) {
    if (!timestamp) {
        return null;
    }

    if (typeof timestamp.toDate === 'function') {
        return timestamp.toDate();
    }

    if (typeof timestamp.toMillis === 'function') {
        return new Date(timestamp.toMillis());
    }

    return new Date(timestamp);
}

export function formatRelativeTime(timestamp) {
    const date = convertToDate(timestamp);
    if (!date) {
        return 'just now';
    }

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 45) {
        return 'just now';
    }
    if (diffMinutes < 60) {
        return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
    }
    if (diffHours < 24) {
        return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    }
    if (diffDays < 7) {
        return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    }

    return date.toLocaleDateString();
}

function formatPresenceBadgeValue(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
        return '';
    }

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (60 * 1000));

    if (diffMinutes < 1) {
        return '1m ago';
    }
    if (diffMinutes < 60) {
        return `${diffMinutes}m ago`;
    }

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
        return `${diffHours || 1}h ago`;
    }

    const options = { month: 'short', day: 'numeric' };
    if (now.getFullYear() !== date.getFullYear()) {
        options.year = 'numeric';
    }

    return date.toLocaleDateString(undefined, options);
}

function getStatusAppearance(timestamp) {
    const date = convertToDate(timestamp);

    if (!date) {
        return {
            tone: 'gray',
            badgeClass: 'status-badge--gray',
            dotClass: 'status-dot--gray',
            textClass: 'status-text--gray',
            relative: 'No recent activity',
            date: null
        };
    }

    const diff = Date.now() - date.getTime();
    let tone = 'gray';

    if (diff <= THIRTY_MINUTES_MS) {
        tone = 'green';
    } else if (diff <= ONE_DAY_MS) {
        tone = 'yellow';
    }

    return {
        tone,
        badgeClass: `status-badge--${tone}`,
        dotClass: `status-dot--${tone}`,
        textClass: `status-text--${tone}`,
        relative: formatRelativeTime(timestamp),
        date
    };
}

function buildStatusTooltip(prefix, appearance, timestamp) {
    if (!appearance || !appearance.date) {
        return `${prefix}: No recent activity yet`;
    }

    const relativeText = appearance.relative || formatRelativeTime(timestamp);
    return `${prefix}: ${appearance.date.toLocaleString()} (${relativeText})`;
}

function applyStatusClasses(element, classPool, newClass) {
    if (!element) {
        return;
    }

    if (Array.isArray(classPool) && classPool.length > 0) {
        element.classList.remove(...classPool);
    }

    if (newClass) {
        element.classList.add(newClass);
    }
}

export function resolveDisplayName(user) {
    if (!user) {
        return 'Friend';
    }

    // Prefer displayName (set by user in Settings) over username (email-derived)
    if (user.displayName && typeof user.displayName === 'string' && user.displayName !== 'Friend' && !user.displayName.includes('@')) {
        return user.displayName;
    }

    const candidate = user.username;
    if (candidate && typeof candidate === 'string' && !candidate.includes('@')) {
        return candidate;
    }

    const primaryEmail = Array.isArray(user.emails) && user.emails.length > 0
        ? user.emails[0]
        : (typeof user.email === 'string' ? user.email : null);

    if (primaryEmail) {
        return getDisplayNameFromEmail(primaryEmail);
    }

    return 'Friend';
}

function isUserActive(user) {
    if (!user) {
        return false;
    }

    const timestamp = user.lastSeen || user.lastLogin;
    const date = convertToDate(timestamp);

    if (!date) {
        return false;
    }

    return (Date.now() - date.getTime()) <= ONLINE_STALE_THRESHOLD_MS;
}

function getPrimaryPresenceDetails(user) {
    if (!user) {
        return { timestamp: null, date: null, source: null };
    }

    const seenDate = convertToDate(user.lastSeen);
    const loginDate = convertToDate(user.lastLogin);

    if (seenDate && loginDate) {
        if (seenDate.getTime() >= loginDate.getTime()) {
            return { timestamp: user.lastSeen, date: seenDate, source: 'seen' };
        }
        return { timestamp: user.lastLogin, date: loginDate, source: 'login' };
    }

    if (seenDate) {
        return { timestamp: user.lastSeen, date: seenDate, source: 'seen' };
    }

    if (loginDate) {
        return { timestamp: user.lastLogin, date: loginDate, source: 'login' };
    }

    const fallbackTimestamp = user.lastLogin || user.lastSeen || null;
    const fallbackDate = convertToDate(fallbackTimestamp);

    if (fallbackDate) {
        const source = (user.lastSeen && fallbackTimestamp === user.lastSeen) ? 'seen' : 'login';
        return { timestamp: fallbackTimestamp, date: fallbackDate, source };
    }

    return { timestamp: null, date: null, source: null };
}

function buildPresenceSubtitle(user, primaryDetails) {
    if (!user) {
        return 'No recent activity yet';
    }

    const isActive = isUserActive(user);
    if (isActive) {
        return 'Online now';
    }

    const details = primaryDetails || getPrimaryPresenceDetails(user);
    const referenceDate = details.date
        || convertToDate(details.timestamp)
        || convertToDate(user.lastLogin)
        || convertToDate(user.lastSeen);

    if (!referenceDate) {
        return 'No recent activity yet';
    }

    const summary = formatPresenceBadgeValue(referenceDate);
    if (!summary) {
        return 'No recent activity yet';
    }

    return `Seen ${summary}`;
}

function buildPresenceTooltip(user) {
    if (!user) {
        return 'No recent activity yet';
    }

    const seenTimestamp = user.lastSeen || user.lastLogin || null;
    const seenDate = convertToDate(seenTimestamp);

    if (!seenDate) {
        return 'No recent activity yet';
    }

    const relative = isUserActive(user)
        ? 'Online now'
        : formatRelativeTime(seenTimestamp);

    return `Last seen: ${seenDate.toLocaleString()} (${relative})`;
}

/**
 * Display friends who logged in within last 3 weeks (up to 10 users)
 * Shows their names with subtle last login time indicators
 */
export function displayOnlineUsers(onlineUsers = []) {
    const onlineSection = document.getElementById('header-online-section');
    const usersList = document.getElementById('header-online-users-list');
    const concurrencyIndicator = document.getElementById('header-online-concurrency');

    if (!onlineSection || !usersList) {
        return;
    }

    // Filter and limit to 10 users
    const safeUsers = Array.isArray(onlineUsers) ? onlineUsers : [];
    const now = Date.now();

    const entries = safeUsers
        .map((user) => {
            const primary = getPrimaryPresenceDetails(user);
            if (primary.date) {
                return { user, primary };
            }

            const fallbackTimestamp = primary.timestamp || user.lastLogin || user.lastSeen || null;
            const fallbackDate = convertToDate(fallbackTimestamp);
            const fallbackSource = (user.lastSeen && fallbackTimestamp === user.lastSeen) ? 'seen' : 'login';

            return {
                user,
                primary: {
                    timestamp: fallbackTimestamp,
                    date: fallbackDate,
                    source: primary.source || fallbackSource
                }
            };
        })
        .filter(({ primary }) => {
            if (!(primary.date instanceof Date) || Number.isNaN(primary.date.getTime())) {
                return false;
            }
            return (now - primary.date.getTime()) <= THREE_WEEKS_MS;
        })
        .sort((a, b) => b.primary.date.getTime() - a.primary.date.getTime())
        .slice(0, 10);

    if (entries.length === 0) {
        // If cached data is still showing (alwaysVisible), keep it visible
        // instead of hiding — fresh data will replace it when it arrives
        const statusBar = document.getElementById('community-status-bar');
        if (statusBar && statusBar.dataset.alwaysVisible && usersList.innerHTML.trim()) {
            return;
        }
        hideOnlineUsers();
        return;
    }

    // Fresh data arrived — clear the alwaysVisible flag so normal logic applies
    const statusBarEl = document.getElementById('community-status-bar');
    if (statusBarEl && statusBarEl.dataset.alwaysVisible) {
        delete statusBarEl.dataset.alwaysVisible;
    }

    usersList.innerHTML = '';

    if (concurrencyIndicator) {
        const activeIds = new Set();
        entries.forEach((entry) => {
            if (isUserActive(entry.user)) {
                const id = entry.user?.canonicalUserId || entry.user?.userId || entry.user?.email;
                if (id) {
                    activeIds.add(id);
                }
            }
        });
        const activeCount = activeIds.size;

        if (activeCount >= 2) {
            const label = `• ${activeCount} friends online now`;
            concurrencyIndicator.textContent = label;
            concurrencyIndicator.classList.remove('hidden');
        } else {
            concurrencyIndicator.textContent = '';
            concurrencyIndicator.classList.add('hidden');
        }
    }

    entries.forEach(({ user, primary }) => {
        const appearance = getStatusAppearance(primary.timestamp || primary.date);
        const tooltip = buildPresenceTooltip(user);
        const activeNow = isUserActive(user);

        // Create badge container
        const badge = document.createElement('span');
        badge.classList.add('status-badge', 'status-badge--presence', appearance.badgeClass, 'status-tooltip');
        badge.setAttribute('aria-label', tooltip);
        badge.dataset.tooltip = tooltip;
        badge.dataset.statusTone = appearance.tone;
        badge.setAttribute('tabindex', '0');
        if (activeNow) {
            badge.classList.add('status-badge--active');
        }

        // Create status dot
        const dot = document.createElement('span');
        dot.classList.add('status-dot', 'status-dot--compact', appearance.dotClass);
        if (appearance.tone === 'green' && activeNow) {
            dot.classList.add('status-dot--pulse');
        }

        // Wrap name and subtitle
        const infoWrapper = document.createElement('span');
        infoWrapper.classList.add('status-badge__info');

        // Create name
        const nameSpan = document.createElement('span');
        nameSpan.classList.add('status-name', 'status-name--presence');
        nameSpan.textContent = resolveDisplayName(user);

        // Create time indicator (subtle, minimal)
        const timeSpan = document.createElement('span');
        timeSpan.classList.add('status-time', 'status-time--detail');
        timeSpan.textContent = buildPresenceSubtitle(user, primary);
        if (appearance.textClass) {
            nameSpan.classList.add(appearance.textClass);
            timeSpan.classList.add(appearance.textClass);
        }

        infoWrapper.appendChild(nameSpan);
        infoWrapper.appendChild(timeSpan);

        // Assemble badge structure: dot + info
        badge.appendChild(dot);
        badge.appendChild(infoWrapper);

        usersList.appendChild(badge);
    });

    onlineSection.classList.remove('hidden');
    updateCommunityStatusLayout();

    // Cache rendered HTML for instant restore on next page load
    try {
        var _un = document.getElementById('header-your-username');
        sessionStorage.setItem('presenceCache', JSON.stringify({
            html: usersList.innerHTML,
            you: _un ? _un.textContent : '',
            ts: Date.now()
        }));
    } catch (e) { /* quota or private mode — ignore */ }
}

/**
 * Hide online users display
 */
export function hideOnlineUsers() {
    const onlineSection = document.getElementById('header-online-section');
    const usersList = document.getElementById('header-online-users-list');
    const concurrencyIndicator = document.getElementById('header-online-concurrency');

    if (!onlineSection) {
        return;
    }

    if (usersList) {
        usersList.innerHTML = '';
    }

    // Clear cache so stale empty state isn't restored
    try { sessionStorage.removeItem('presenceCache'); } catch (e) { /* ignore */ }

    if (concurrencyIndicator) {
        concurrencyIndicator.textContent = '';
        concurrencyIndicator.classList.add('hidden');
    }

    onlineSection.classList.add('hidden');
    onlineSection.classList.remove('status-section--with-divider');
    updateCommunityStatusLayout();
}

/**
 * Display user's last login time in header status bar
 */
export function displayLastLogin(username, loginTime) {
    const yourStatusSection = document.getElementById('header-your-status');
    const usernameEl = document.getElementById('header-your-username');
    const timeElement = document.getElementById('header-your-login-time');

    if (!yourStatusSection || !usernameEl || !timeElement) {
        return;
    }

    if (!username || !loginTime) {
        hideLastLogin();
        return;
    }

    usernameEl.textContent = username;
    lastLoginTimestamp = loginTime;

    const appearance = getStatusAppearance(loginTime);
    timeElement.textContent = appearance.date ? appearance.relative : 'No recent activity';
    applyStatusClasses(timeElement, TEXT_STATUS_CLASSES, appearance.textClass);

    const tooltip = buildStatusTooltip('You last logged on', appearance, loginTime);
    yourStatusSection.setAttribute('aria-label', tooltip);
    yourStatusSection.classList.add('status-tooltip');
    yourStatusSection.dataset.tooltip = tooltip;

    if (lastLoginIntervalId) {
        clearInterval(lastLoginIntervalId);
    }

    lastLoginIntervalId = setInterval(updateLoginTimeDisplay, 60000);

    yourStatusSection.classList.remove('hidden');
    updateCommunityStatusLayout();

    // Update cache with username for instant restore
    try {
        var cached = JSON.parse(sessionStorage.getItem('presenceCache') || '{}');
        cached.you = username;
        cached.ts = Date.now();
        sessionStorage.setItem('presenceCache', JSON.stringify(cached));
    } catch (e) { /* ignore */ }
}

function updateLoginTimeDisplay() {
    const timeAgoElement = document.getElementById('header-your-login-time');
    const statusSection = document.getElementById('header-your-status');

    if (!timeAgoElement || !lastLoginTimestamp) {
        return;
    }

    const appearance = getStatusAppearance(lastLoginTimestamp);
    timeAgoElement.textContent = appearance.date ? appearance.relative : 'No recent activity';
    applyStatusClasses(timeAgoElement, TEXT_STATUS_CLASSES, appearance.textClass);

    if (statusSection) {
        const tooltip = buildStatusTooltip('You last logged on', appearance, lastLoginTimestamp);
        statusSection.setAttribute('aria-label', tooltip);
        statusSection.dataset.tooltip = tooltip;
    }
}

/**
 * Hide last login display
 */
export function hideLastLogin() {
    const yourStatusSection = document.getElementById('header-your-status');
    const timeElement = document.getElementById('header-your-login-time');

    if (yourStatusSection) {
        yourStatusSection.classList.add('hidden');
        yourStatusSection.classList.remove('status-section--with-divider');
        yourStatusSection.removeAttribute('aria-label');
        delete yourStatusSection.dataset.tooltip;
    }

    if (timeElement) {
        applyStatusClasses(timeElement, TEXT_STATUS_CLASSES, null);
        timeElement.textContent = 'just now';
    }

    if (lastLoginIntervalId) {
        clearInterval(lastLoginIntervalId);
        lastLoginIntervalId = null;
    }

    lastLoginTimestamp = null;
    updateCommunityStatusLayout();
}
