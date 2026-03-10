/**
 * Shared Presence Module - Tracks user online status across all pages
 * This module handles Firebase auth state, presence tracking, and online user display
 * for secondary pages (songs, prayers, about, song-detail) that don't load the full main.js
 */

import {
    initAuth,
    getCurrentUserId,
    getCurrentUserEmail,
    updateUserPresence,
    markUserOffline,
    listenForOnlineUsers,
    stopListeningForOnlineUsers,
    getUserInfo,
    getUsersWithinThreeWeeks
} from './firebase.js';

import {
    displayOnlineUsers,
    hideOnlineUsers,
    displayLastLogin,
    hideLastLogin,
    setCurrentUserEmail
} from './ui.js';

import { getDisplayNameFromEmail } from './name-utils.js';

// Presence tracking state
let lastUserId = null;
let presenceIntervalId = null;
let friendLoginsRefreshIntervalId = null;
let currentUserProfile = null;
let trackedOnlineFriends = [];
let trackedRecentFriendLogins = [];
let isPresenceInitialized = false;

// Constants
const PRESENCE_UPDATE_INTERVAL = 30000; // 30 seconds
const FRIEND_LOGINS_REFRESH_INTERVAL = 90000; // 90 seconds
const FRIEND_PRESENCE_WINDOW_MS = 21 * 24 * 60 * 60 * 1000; // 3 weeks

/**
 * Convert various timestamp formats to milliseconds
 */
function timestampToMillis(timestamp) {
    if (!timestamp) return null;
    if (typeof timestamp === 'number') return timestamp;
    if (timestamp instanceof Date) return timestamp.getTime();
    if (typeof timestamp.toMillis === 'function') return timestamp.toMillis();
    if (typeof timestamp.toDate === 'function') return timestamp.toDate().getTime();
    if (typeof timestamp === 'string') {
        const parsed = Date.parse(timestamp);
        return isNaN(parsed) ? null : parsed;
    }
    return null;
}

/**
 * Pick the more recent of two timestamps
 */
function pickMostRecentTimestamp(existing, candidate) {
    const existingMs = timestampToMillis(existing);
    const candidateMs = timestampToMillis(candidate);
    if (!existingMs) return candidate;
    if (!candidateMs) return existing;
    return candidateMs > existingMs ? candidate : existing;
}

/**
 * Normalize user data from Firebase to consistent format
 */
function normalizePresenceUser(user) {
    if (!user) return null;

    const docId = user.docId || user.id || user.userId || null;
    const canonicalUserId = user.canonicalUserId || docId;
    const emails = Array.isArray(user.emails) ? user.emails : [];
    const primaryEmail = emails.length > 0
        ? emails[0]
        : (typeof user.email === 'string' ? user.email : null);

    let displayName = user.username;
    if (!displayName || (typeof displayName === 'string' && displayName.includes('@'))) {
        displayName = primaryEmail ? getDisplayNameFromEmail(primaryEmail) : 'Friend';
    }

    return {
        docId,
        canonicalUserId,
        username: displayName,
        email: primaryEmail,
        emails,
        isOnline: user.isOnline || false,
        lastLogin: user.lastLogin || null,
        lastSeen: user.lastSeen || null,
        isAlias: user.isAlias || false,
        aliasOf: user.aliasOf || null
    };
}

/**
 * Filter out current user and alias records from presence list
 */
function preparePresenceCandidates(users) {
    const currentUserId = getCurrentUserId();
    if (!Array.isArray(users)) return [];

    return users
        .map(normalizePresenceUser)
        .filter(user => {
            if (!user) return false;
            if (user.isAlias) return false;
            // Filter out current user
            if (currentUserId && (user.docId === currentUserId || user.canonicalUserId === currentUserId)) {
                return false;
            }
            return true;
        });
}

/**
 * Combine online users and recent logins, deduplicating by canonical ID
 */
function combinePresenceSources(onlineUsers, recentUsers) {
    const combined = new Map();
    const now = Date.now();
    const windowMs = FRIEND_PRESENCE_WINDOW_MS;

    // Helper to add/update user in map
    const addUser = (user) => {
        if (!user || !user.canonicalUserId) return;

        const existing = combined.get(user.canonicalUserId);
        if (existing) {
            // Merge: keep most recent timestamps, prefer online status
            existing.isOnline = existing.isOnline || user.isOnline;
            existing.lastSeen = pickMostRecentTimestamp(existing.lastSeen, user.lastSeen);
            existing.lastLogin = pickMostRecentTimestamp(existing.lastLogin, user.lastLogin);
        } else {
            combined.set(user.canonicalUserId, { ...user });
        }
    };

    // Add online users first (they take priority)
    onlineUsers.forEach(addUser);
    recentUsers.forEach(addUser);

    // Convert to array and filter by time window
    let result = Array.from(combined.values()).filter(user => {
        const lastSeenMs = timestampToMillis(user.lastSeen);
        const lastLoginMs = timestampToMillis(user.lastLogin);
        const mostRecentMs = Math.max(lastSeenMs || 0, lastLoginMs || 0);
        return mostRecentMs && (now - mostRecentMs) < windowMs;
    });

    // Sort by most recent activity (newest first)
    result.sort((a, b) => {
        const aMs = Math.max(timestampToMillis(a.lastSeen) || 0, timestampToMillis(a.lastLogin) || 0);
        const bMs = Math.max(timestampToMillis(b.lastSeen) || 0, timestampToMillis(b.lastLogin) || 0);
        return bMs - aMs;
    });

    // Limit to 10 users
    return result.slice(0, 10);
}

/**
 * Update the friend presence view with combined online + recent users
 */
function updateFriendPresenceView() {
    const combined = combinePresenceSources(trackedOnlineFriends, trackedRecentFriendLogins);
    displayOnlineUsers(combined);
}

/**
 * Clear friend presence data and hide UI
 */
function clearFriendPresence() {
    trackedOnlineFriends = [];
    trackedRecentFriendLogins = [];
    hideOnlineUsers();
}

/**
 * Refresh the list of friends who logged in within the last 3 weeks
 */
async function refreshFriendLogins() {
    const currentUserId = getCurrentUserId();
    if (!currentUserId) {
        trackedRecentFriendLogins = [];
        updateFriendPresenceView();
        return;
    }

    try {
        const users = await getUsersWithinThreeWeeks(10);
        if (!Array.isArray(users) || users.length === 0) {
            trackedRecentFriendLogins = [];
            updateFriendPresenceView();
            return;
        }

        trackedRecentFriendLogins = preparePresenceCandidates(users);
        updateFriendPresenceView();
    } catch (error) {
        console.error('[Presence] Error loading friends from last 3 weeks:', error);
        trackedRecentFriendLogins = [];
        updateFriendPresenceView();
    }
}

/**
 * Start polling for friend logins
 */
function startFriendLoginsPolling() {
    stopFriendLoginsPolling();
    refreshFriendLogins();
    friendLoginsRefreshIntervalId = setInterval(() => {
        refreshFriendLogins();
    }, FRIEND_LOGINS_REFRESH_INTERVAL);
}

/**
 * Stop polling for friend logins
 */
function stopFriendLoginsPolling() {
    if (friendLoginsRefreshIntervalId) {
        clearInterval(friendLoginsRefreshIntervalId);
        friendLoginsRefreshIntervalId = null;
    }
    trackedRecentFriendLogins = [];
}

/**
 * Update the current user's status display
 */
function updateCurrentUserStatusDisplay(userProfile, fallbackEmail) {
    const profileEmails = Array.isArray(userProfile?.emails) ? userProfile.emails : [];
    const primaryProfileEmail = profileEmails.length > 0
        ? profileEmails[0]
        : (typeof userProfile?.email === 'string' ? userProfile.email : null);
    const normalizedFallbackEmail = typeof fallbackEmail === 'string' && fallbackEmail.trim()
        ? fallbackEmail.trim().toLowerCase()
        : null;

    let displayName = userProfile?.username;
    if (!displayName || (typeof displayName === 'string' && displayName.includes('@'))) {
        if (primaryProfileEmail) {
            displayName = getDisplayNameFromEmail(primaryProfileEmail);
        } else if (normalizedFallbackEmail) {
            displayName = getDisplayNameFromEmail(normalizedFallbackEmail);
        } else {
            displayName = 'Friend';
        }
    }

    const loginTime = userProfile?.lastLogin || userProfile?.lastSeen || new Date();
    displayLastLogin(displayName, loginTime);
}

/**
 * Refresh current user profile from Firebase
 */
async function refreshCurrentUserProfile() {
    const userId = getCurrentUserId();
    if (!userId) return;

    try {
        const profile = await getUserInfo(userId);
        if (profile) {
            currentUserProfile = profile;
            updateCurrentUserStatusDisplay(profile, getCurrentUserEmail());
        }
    } catch (error) {
        console.error('[Presence] Error refreshing current user profile:', error);
    }
}

/**
 * Start tracking user presence
 */
function startPresenceTracking(userId) {
    lastUserId = userId;

    // Clear existing interval if any
    if (presenceIntervalId) {
        clearInterval(presenceIntervalId);
    }

    // Update presence immediately
    updateUserPresence(userId).catch(error => console.error('[Presence] Error updating presence:', error));

    // Then update every 30 seconds
    presenceIntervalId = setInterval(() => {
        if (getCurrentUserId() === userId) {
            updateUserPresence(userId).catch(error => console.error('[Presence] Error updating presence:', error));
        }
    }, PRESENCE_UPDATE_INTERVAL);

    // Set up real-time listener for online users
    listenForOnlineUsers((onlineUsers) => {
        trackedOnlineFriends = preparePresenceCandidates(onlineUsers);
        updateFriendPresenceView();
    });

    // Start polling for friend logins
    startFriendLoginsPolling();

    console.log('[Presence] Started tracking for user:', userId);
}

/**
 * Stop tracking user presence
 */
function stopPresenceTracking() {
    if (presenceIntervalId) {
        clearInterval(presenceIntervalId);
        presenceIntervalId = null;
    }

    stopListeningForOnlineUsers();
    stopFriendLoginsPolling();
    clearFriendPresence();
    hideLastLogin();

    console.log('[Presence] Stopped tracking');
}

/**
 * Handle user going offline (tab close, navigation away, etc.)
 */
async function handleUserOffline() {
    const userId = lastUserId || getCurrentUserId();
    if (userId) {
        try {
            // Use sendBeacon for reliability on page unload
            await markUserOffline(userId);
            console.log('[Presence] User marked offline');
        } catch (error) {
            console.error('[Presence] Error marking user offline:', error);
        }
    }
}

/**
 * Handle visibility change (tab becomes hidden/visible)
 */
function handleVisibilityChange() {
    const userId = getCurrentUserId();
    if (!userId) return;

    if (document.hidden) {
        // Tab is hidden - we could mark as less active, but keep online
        // The 30-second interval will stop updating if page is in background
        console.log('[Presence] Tab hidden');
    } else {
        // Tab is visible again - update presence immediately
        console.log('[Presence] Tab visible - updating presence');
        updateUserPresence(userId).catch(error =>
            console.error('[Presence] Error updating presence on visibility:', error)
        );
    }
}

/**
 * Handle auth state changes
 */
async function handleAuthStateChange(user) {
    if (user) {
        setCurrentUserEmail(user.email);

        // Fetch user profile
        let userProfile = null;
        try {
            userProfile = await getUserInfo(user.uid);
        } catch (error) {
            console.error('[Presence] Error loading user profile:', error);
        }

        currentUserProfile = userProfile;
        updateCurrentUserStatusDisplay(userProfile, user.email);

        // Start presence tracking
        startPresenceTracking(user.uid);

        // Refresh profile after a delay (for server timestamp resolution)
        setTimeout(() => {
            refreshCurrentUserProfile();
        }, 2000);

    } else {
        setCurrentUserEmail(null);
        currentUserProfile = null;

        // Mark user as offline
        if (lastUserId) {
            try {
                await markUserOffline(lastUserId);
            } catch (error) {
                console.error('[Presence] Error marking offline:', error);
            }
        }

        stopPresenceTracking();
    }
}

/**
 * Initialize the presence system
 */
export async function initPresence() {
    if (isPresenceInitialized) {
        console.log('[Presence] Already initialized');
        return;
    }

    console.log('[Presence] Initializing...');

    // Set up page lifecycle event handlers

    // Handle page unload (closing tab, navigating away)
    window.addEventListener('beforeunload', () => {
        handleUserOffline();
    });

    // Handle page hide (more reliable for mobile browsers)
    window.addEventListener('pagehide', () => {
        handleUserOffline();
    });

    // Handle visibility changes (tab switching)
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Initialize Firebase auth and listen for auth state changes
    initAuth(handleAuthStateChange);

    isPresenceInitialized = true;
    console.log('[Presence] Initialized successfully');
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPresence);
} else {
    initPresence();
}
