// Firebase Module - "A Letter in the Scroll" Torah Study Platform
// Most collaborative data is stored under chavrutas/{chavrutaId}/... subcollections.
// Reactions/bookmarks are synchronized across all chavrutot that a user belongs to.
import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    setPersistence,
    browserLocalPersistence,
    sendPasswordResetEmail
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {
    getFirestore,
    collection,
    collectionGroup,
    addDoc,
    query,
    where,
    onSnapshot,
    serverTimestamp,
    getDocs,
    deleteDoc,
    doc,
    getDoc,
    setDoc,
    orderBy,
    limit,
    runTransaction
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getDisplayNameFromEmail } from './name-utils.js';

// Firebase configuration — letterinthescroll project
const firebaseConfig = {
  apiKey: "AIzaSyCpDtcBpKvjLwihnL2bizxBFxXD6Qn8Lb4",
  authDomain: "letterinthescroll.firebaseapp.com",
  projectId: "letterinthescroll",
  storageBucket: "letterinthescroll.firebasestorage.app",
  messagingSenderId: "625129870318",
  appId: "1:625129870318:web:a654e97b734faa3b4df4ff",
  measurementId: "G-LYSXTDEPVG"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

// Set persistence to LOCAL so user stays logged in even after browser closes
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log('Persistence enabled - users will stay logged in');
  })
  .catch((error) => {
    console.error('Persistence setup error:', error);
  });

// ========================================
// CHAVRUTA CONTEXT
// ========================================

export function getActiveChavrutaId() {
  return sessionStorage.getItem('activeChavrutaId');
}

export function setActiveChavrutaId(id) {
  if (id) {
    sessionStorage.setItem('activeChavrutaId', id);
  } else {
    sessionStorage.removeItem('activeChavrutaId');
  }
}

/**
 * Returns a Firestore collection reference scoped to the active chavruta.
 * Throws if no chavruta is active.
 */
function chavrutaCollection(subcollectionName) {
  const chavrutaId = getActiveChavrutaId();
  if (!chavrutaId) {
    throw new Error('No active chavruta selected');
  }
  return collection(db, 'chavrutas', chavrutaId, subcollectionName);
}

/**
 * Returns a Firestore document reference scoped to the active chavruta.
 */
function chavrutaDoc(subcollectionName, docId) {
  const chavrutaId = getActiveChavrutaId();
  if (!chavrutaId) {
    throw new Error('No active chavruta selected');
  }
  return doc(db, 'chavrutas', chavrutaId, subcollectionName, docId);
}

const USER_CHAVRUTA_CACHE_TTL_MS = 45000;
const userChavrutaCache = new Map();

function getTimestampMillis(timestamp) {
  if (!timestamp) {
    return 0;
  }
  if (typeof timestamp.toMillis === 'function') {
    return timestamp.toMillis();
  }
  if (timestamp instanceof Date) {
    return timestamp.getTime();
  }
  return 0;
}

async function getUserChavrutaIds(userId, options = {}) {
  if (!userId) {
    return [];
  }

  const forceRefresh = options.forceRefresh === true;
  const now = Date.now();
  const cached = userChavrutaCache.get(userId);
  if (!forceRefresh && cached && (now - cached.fetchedAt) < USER_CHAVRUTA_CACHE_TTL_MS) {
    return [...cached.ids];
  }

  try {
    const membershipsQuery = query(
      collection(db, 'chavrutas'),
      where('members', 'array-contains', userId)
    );
    const snapshot = await getDocs(membershipsQuery);
    const ids = snapshot.docs.map((docSnap) => docSnap.id);
    userChavrutaCache.set(userId, { ids, fetchedAt: now });
    return [...ids];
  } catch (error) {
    console.error('Error loading user chavruta memberships:', error);
    const activeChavrutaId = getActiveChavrutaId();
    return activeChavrutaId ? [activeChavrutaId] : [];
  }
}

async function getWritableChavrutaIdsForUser(userId) {
  const ids = await getUserChavrutaIds(userId);
  if (ids.length > 0) {
    return ids;
  }

  const activeChavrutaId = getActiveChavrutaId();
  if (activeChavrutaId) {
    return [activeChavrutaId];
  }

  throw new Error('No chavruta memberships found for user');
}

// ========================================
// AUTH
// ========================================

let currentUser = null;

function updateLoginRequiredOverlayOffset() {
  const header = document.querySelector('header, .header-main');
  let overlayTop = 0;

  if (header) {
    const rect = header.getBoundingClientRect();
    overlayTop = Math.max(0, Math.round(rect.bottom || 0));
    if (!overlayTop) {
      overlayTop = Math.max(0, Math.round(header.offsetHeight || 0));
    }
  }

  document.documentElement.style.setProperty('--login-required-overlay-top', `${overlayTop}px`);
}

function showLoginRequiredOverlayAndRedirect() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }
  if (window.__loginRedirectPending) {
    return;
  }
  window.__loginRedirectPending = true;

  if (!document.getElementById('login-required-overlay-style')) {
    const style = document.createElement('style');
    style.id = 'login-required-overlay-style';
    style.textContent = `
      body.login-required-pending {
        --login-required-overlay-top: 0px;
      }
      body.login-required-pending #shabbat-banner {
        display: none !important;
      }
      @media (min-width: 961px) {
        body.login-required-pending header,
        body.login-required-pending .header-main {
          z-index: 2147483647 !important;
          filter: none !important;
          -webkit-filter: none !important;
        }
        body.login-required-pending .header-container {
          padding: 1.25rem 1.5rem !important;
        }
        body.shabbat-mode.login-required-pending .header-main {
          background: linear-gradient(138deg, #16285e 0%, #203a82 50%, #2b4e9e 100%) !important;
          box-shadow: 0 4px 20px rgba(15, 23, 42, 0.45) !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
        }
        body.shabbat-mode.login-required-pending .header-main::before,
        body.shabbat-mode.login-required-pending .header-main::after {
          display: none !important;
        }
        body.shabbat-mode.login-required-pending .header-title {
          color: #fff !important;
          text-shadow: none !important;
        }
        body.shabbat-mode.login-required-pending .header-subtitle {
          color: rgba(255, 255, 255, 0.85) !important;
          text-shadow: none !important;
        }
        body.shabbat-mode.login-required-pending .header-btn-primary {
          color: #fff !important;
          background: rgba(255, 255, 255, 0.15) !important;
          border-color: rgba(255, 255, 255, 0.3) !important;
          box-shadow: none !important;
        }
        body.shabbat-mode.login-required-pending .header-btn-secondary {
          color: rgba(255, 255, 255, 0.9) !important;
          background: rgba(255, 255, 255, 0.08) !important;
          border-color: rgba(255, 255, 255, 0.2) !important;
          box-shadow: none !important;
        }
        body.shabbat-mode.login-required-pending .header-user-pill {
          color: #fff !important;
          background: rgba(255, 255, 255, 0.12) !important;
          border-color: rgba(255, 255, 255, 0.25) !important;
        }
        body.shabbat-mode.login-required-pending .header-user-chevron,
        body.shabbat-mode.login-required-pending .header-user-avatar {
          color: #fff !important;
        }
        body.shabbat-mode.login-required-pending #community-status-bar {
          background: rgba(0, 0, 0, 0.15) !important;
        }
        body.shabbat-mode.login-required-pending #community-status-bar * {
          color: rgba(255, 255, 255, 0.85) !important;
        }
      }
      @media (max-width: 960px) {
        body.login-required-pending .header-main {
          z-index: auto !important;
        }
        #login-required-overlay {
          top: 0 !important;
        }
      }
      #login-required-overlay {
        position: fixed;
        top: var(--login-required-overlay-top, 0px);
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 2147483646;
        background: radial-gradient(circle at 15% 15%, rgba(59, 130, 246, 0.22), transparent 36%), rgba(3, 10, 28, 0.62);
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
      }
      #login-required-overlay .login-required-card {
        position: relative;
        overflow: hidden;
        width: min(92vw, 520px);
        background: linear-gradient(160deg, #ffffff 0%, #f4f8ff 46%, #eef5ff 100%);
        border: 1px solid rgba(37, 99, 235, 0.2);
        border-radius: 22px;
        box-shadow: 0 26px 80px rgba(15, 23, 42, 0.34);
        text-align: center;
        padding: 1.35rem 1.3rem 1.4rem;
        animation: loginRequiredPopIn 220ms ease-out;
      }
      #login-required-overlay .login-required-card::before {
        content: '';
        position: absolute;
        top: -110px;
        left: -40px;
        width: 270px;
        height: 220px;
        background: radial-gradient(circle, rgba(191, 219, 254, 0.72) 0%, rgba(191, 219, 254, 0.08) 72%, transparent 100%);
        pointer-events: none;
      }
      #login-required-overlay .login-required-logo-wrap {
        position: relative;
        z-index: 1;
        margin: 0 auto 0.75rem;
        width: 82px;
        height: 82px;
        border-radius: 20px;
        background: linear-gradient(165deg, #fefefe 0%, #edf4ff 100%);
        border: 1px solid rgba(37, 99, 235, 0.2);
        box-shadow: 0 12px 28px rgba(37, 99, 235, 0.2);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      #login-required-overlay .login-required-logo {
        width: 56px;
        height: 56px;
        object-fit: contain;
      }
      #login-required-overlay .login-required-kicker {
        margin: 0;
        color: #1d4ed8;
        font-size: 0.72rem;
        letter-spacing: 0.13em;
        text-transform: uppercase;
        font-weight: 700;
      }
      #login-required-overlay .login-required-title {
        margin: 0.34rem 0 0.46rem 0;
        color: #0a1f46;
        font-size: clamp(1.16rem, 2.8vw, 1.48rem);
        font-weight: 700;
        line-height: 1.28;
      }
      #login-required-overlay .login-required-text {
        margin: 0 auto;
        max-width: 35ch;
        color: #1e3a8a;
        font-size: 0.95rem;
        line-height: 1.52;
      }
      #login-required-overlay .login-required-subtext {
        margin: 0.58rem 0 0;
        color: #334155;
        font-size: 0.9rem;
      }
      #login-required-overlay .login-required-btn {
        margin-top: 1rem;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 45px;
        min-width: 220px;
        padding: 0.68rem 1.08rem;
        border: 1px solid rgba(30, 64, 175, 0.32);
        border-radius: 999px;
        background: linear-gradient(180deg, #2463de 0%, #1d4ed8 46%, #1e40af 100%);
        color: #ffffff;
        font-size: 0.92rem;
        font-weight: 700;
        letter-spacing: 0.012em;
        cursor: pointer;
        text-decoration: none;
        box-shadow: 0 12px 24px rgba(29, 78, 216, 0.3);
      }
      #login-required-overlay .login-required-btn:hover {
        transform: translateY(-1px);
        background: linear-gradient(180deg, #2b6ef0 0%, #1e5cf0 46%, #1d4ed8 100%);
      }
      #login-required-overlay .login-required-btn:focus-visible {
        outline: 3px solid rgba(29, 78, 216, 0.35);
        outline-offset: 2px;
      }
      @keyframes loginRequiredPopIn {
        from {
          opacity: 0;
          transform: translateY(8px) scale(0.985);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
    `;
    document.head.appendChild(style);
  }

  if (document.body) {
    document.body.classList.add('login-required-pending');
  }
  updateLoginRequiredOverlayOffset();
  if (!window.__loginOverlayOffsetBound) {
    window.__loginOverlayOffsetBound = true;
    window.addEventListener('resize', updateLoginRequiredOverlayOffset);
  }
  window.requestAnimationFrame(updateLoginRequiredOverlayOffset);
  window.setTimeout(updateLoginRequiredOverlayOffset, 120);

  if (!document.getElementById('login-required-overlay')) {
    const overlay = document.createElement('div');
    overlay.id = 'login-required-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-live', 'assertive');
    overlay.innerHTML = `
      <div class="login-required-card">
        <div class="login-required-logo-wrap">
          <img class="login-required-logo" src="/media/images/Icon.png" alt="A Letter in the Scroll logo" />
        </div>
        <p class="login-required-kicker">Welcome Home</p>
        <p class="login-required-title">Welcome to A Letter in the Scroll</p>
        <p class="login-required-text">Study Torah with heart, wisdom, and community.</p>
        <p class="login-required-subtext">Please login or create an account first to continue.</p>
        <button type="button" id="login-required-cta" class="login-required-btn">Login / Create Account</button>
      </div>
    `;
    (document.body || document.documentElement).appendChild(overlay);

    const cta = overlay.querySelector('#login-required-cta');
    if (cta) {
      cta.addEventListener('click', () => {
        window.location.assign('/');
      });
    }
  }
  updateLoginRequiredOverlayOffset();
}

function initAuth(onAuthReady) {
  let authRedirectTimer = null;

  onAuthStateChanged(auth, (user) => {
    if (user) {
      // Cancel any pending redirect from an earlier null state.
      if (authRedirectTimer) { clearTimeout(authRedirectTimer); authRedirectTimer = null; }

      // Remove login overlay if it was shown prematurely.
      window.__loginRedirectPending = false;
      const overlay = document.getElementById('login-required-overlay');
      if (overlay) overlay.remove();
      document.body?.classList.remove('login-required-pending');
      document.documentElement.style.removeProperty('--login-required-overlay-top');

      currentUser = user;
      console.log('User authenticated:', user.email);
      if (onAuthReady) onAuthReady(user);
    } else {
      currentUser = null;
      console.log('No user authenticated');
      // Redirect unauthenticated users away from protected app pages.
      // Login and invite onboarding routes are public.
      const path = window.location.pathname.replace(/\/+$/, '') || '/';
      const publicPaths = ['', '/', '/invite', '/join', '/about'];
      const isPublic = publicPaths.includes(path);
      if (!isPublic) {
        // Firebase fires null initially while loading persisted session.
        // Delay the redirect so the real auth state can cancel it.
        if (!authRedirectTimer) {
          authRedirectTimer = setTimeout(() => {
            if (!currentUser) {
              showLoginRequiredOverlayAndRedirect();
            }
          }, 200);
        }
        return;
      }
      if (onAuthReady) onAuthReady(null);
    }
  });
}

async function signInWithEmail(email, password) {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();
    const result = await signInWithEmailAndPassword(auth, normalizedEmail, normalizedPassword);
    currentUser = result.user;
    return result.user;
  } catch (error) {
    console.error('Sign-in error:', error);
    throw error;
  }
}

async function createAccountWithEmail(email, password) {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();
    const result = await createUserWithEmailAndPassword(auth, normalizedEmail, normalizedPassword);
    currentUser = result.user;
    return result.user;
  } catch (error) {
    console.error('Account creation error:', error);
    throw error;
  }
}

async function signOutUser() {
  try {
    await signOut(auth);
    currentUser = null;
    console.log('User signed out');
  } catch (error) {
    console.error('Sign-out error:', error);
    throw error;
  }
}

function getCurrentUserId() {
  return currentUser ? currentUser.uid : null;
}

function getCurrentUserEmail() {
  return currentUser ? currentUser.email : null;
}

// No-op — auth is handled on a separate page now
function hideLoginModal() {}

async function sendPasswordReset(email) {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return { success: false, error: error.message };
  }
}

// Creates/updates the top-level user profile doc at users/{userId}
async function recordUserLogin(userId, email) {
  if (!userId || !email) {
    console.error('Cannot record login: missing userId or email');
    return null;
  }

  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : null;

  try {
    const userDocRef = doc(db, 'users', userId);

    // Check if user already has a displayName set — don't overwrite it
    const existingDoc = await getDoc(userDocRef);
    const existingData = existingDoc.exists() ? existingDoc.data() : {};
    const emailDerivedName = getDisplayNameFromEmail(normalizedEmail || email);

    const payload = {
      userId,
      email: normalizedEmail,
      isOnline: true,
      lastLogin: serverTimestamp(),
      lastSeen: serverTimestamp()
    };

    // Only set username if no displayName exists yet
    if (!existingData.displayName) {
      payload.username = emailDerivedName || 'Friend';
    }

    await setDoc(userDocRef, payload, { merge: true });
    console.log(`User login recorded for ${email}`);
    return { ...payload, displayName: existingData.displayName || payload.username || emailDerivedName };
  } catch (error) {
    console.error('Error recording user login:', error);
    throw error;
  }
}

// ========================================
// COMMENTS (chavruta-scoped)
// ========================================

let currentCommentsUnsubscribe = null;

async function submitComment(verseRef, text, userId, username) {
  if (!userId) {
    throw new Error('User not authenticated');
  }
  if (!text || text.trim().length === 0) {
    throw new Error('Comment text is empty');
  }
  if (!username || username.trim().length === 0) {
    throw new Error('Username is required');
  }
  if (username.trim().length > 50) {
    throw new Error('Username must be 50 characters or less');
  }

  try {
    const commentData = {
      verseRef: verseRef,
      text: text.trim(),
      userId: userId,
      username: username.trim(),
      timestamp: serverTimestamp()
    };

    const docRef = await addDoc(chavrutaCollection('comments'), commentData);
    return docRef.id;
  } catch (error) {
    console.error('Error adding comment:', error);
    throw error;
  }
}

function listenForComments(verseRef, callback) {
  if (currentCommentsUnsubscribe) {
    currentCommentsUnsubscribe();
    currentCommentsUnsubscribe = null;
  }

  try {
    const commentsQuery = query(
      chavrutaCollection('comments'),
      where('verseRef', '==', verseRef)
    );

    currentCommentsUnsubscribe = onSnapshot(commentsQuery,
      (querySnapshot) => {
        const comments = [];
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          comments.push({
            id: docSnap.id,
            verseRef: data.verseRef,
            text: data.text,
            userId: data.userId,
            username: data.username || 'Anonymous',
            timestamp: data.timestamp
          });
        });

        comments.sort((a, b) => {
          if (!a.timestamp) return 1;
          if (!b.timestamp) return -1;
          return b.timestamp.toMillis() - a.timestamp.toMillis();
        });

        callback(comments);
      },
      (error) => {
        console.error('Error listening to comments:', error);
        callback([]);
      }
    );
  } catch (error) {
    console.error('Error setting up comment listener:', error);
    callback([]);
  }
}

function stopListeningForComments() {
  if (currentCommentsUnsubscribe) {
    currentCommentsUnsubscribe();
    currentCommentsUnsubscribe = null;
  }
}

// ========================================
// REACTIONS (synchronized across user's chavrutot)
// ========================================

async function submitReaction(verseRef, reactionType, userId) {
  if (!userId) {
    throw new Error('User not authenticated');
  }
  if (!['emphasize', 'heart'].includes(reactionType)) {
    throw new Error('Invalid reaction type');
  }

  try {
    const reactionKey = `${encodeURIComponent(verseRef)}__${userId}__${reactionType}`;
    const chavrutaIds = await getWritableChavrutaIdsForUser(userId);
    const reactionDocRefs = chavrutaIds.map((chavrutaId) =>
      doc(db, 'chavrutas', chavrutaId, 'reactions', reactionKey)
    );

    const existingSnapshots = await Promise.all(reactionDocRefs.map((reactionDocRef) => getDoc(reactionDocRef)));
    const existsAnywhere = existingSnapshots.some((snapshot) => snapshot.exists());

    const reactionData = {
      verseRef: verseRef,
      userId: userId,
      reactionType: reactionType,
      timestamp: serverTimestamp()
    };

    if (existsAnywhere) {
      await Promise.all(reactionDocRefs.map((reactionDocRef) => deleteDoc(reactionDocRef)));
      return { action: 'removed', reactionType };
    }

    await Promise.all(reactionDocRefs.map((reactionDocRef) => setDoc(reactionDocRef, reactionData)));
    return { action: 'added', reactionType, id: reactionKey };
  } catch (error) {
    console.error('Error submitting reaction:', error);
    throw error;
  }
}

async function getUserReactions(userId, verseRefs) {
  const userReactions = {};

  if (!userId || !verseRefs || verseRefs.length === 0) {
    return userReactions;
  }

  try {
    const verseRefSet = new Set(verseRefs);
    const fallbackToUserOnlyQuery = async () => {
      const reactionsQuery = query(collectionGroup(db, 'reactions'), where('userId', '==', userId));
      return getDocs(reactionsQuery);
    };

    let querySnapshot;
    try {
      const boundedVerseRefs = Array.from(verseRefSet).slice(0, 30);
      const reactionsQuery = query(
        collectionGroup(db, 'reactions'),
        where('userId', '==', userId),
        where('verseRef', 'in', boundedVerseRefs)
      );
      querySnapshot = await getDocs(reactionsQuery);
    } catch (error) {
      const message = typeof error?.message === 'string' ? error.message.toLowerCase() : '';
      const shouldFallback = error?.code === 'failed-precondition' || message.includes('index');
      if (!shouldFallback) {
        throw error;
      }
      querySnapshot = await fallbackToUserOnlyQuery();
    }

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const verseRef = data.verseRef;
      const reactionType = data.reactionType;
      if (!verseRefSet.has(verseRef)) {
        return;
      }

      if (!userReactions[verseRef]) {
        userReactions[verseRef] = [];
      }
      if (!userReactions[verseRef].includes(reactionType)) {
        userReactions[verseRef].push(reactionType);
      }
    });

    return userReactions;
  } catch (error) {
    console.error('Error getting user reactions:', error);
    return userReactions;
  }
}

async function getReactionCountsForBook(bookName) {
  const counts = {};

  try {
    const startRef = `${bookName} `;
    const endRef = `${bookName}~`;

    const reactionsQuery = query(
      chavrutaCollection('reactions'),
      where('verseRef', '>=', startRef),
      where('verseRef', '<=', endRef)
    );

    const querySnapshot = await getDocs(reactionsQuery);

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const verseRef = data.verseRef;
      const reactionType = data.reactionType;

      if (!counts[verseRef]) {
        counts[verseRef] = { emphasize: 0, heart: 0 };
      }
      counts[verseRef][reactionType] = (counts[verseRef][reactionType] || 0) + 1;
    });

    return counts;
  } catch (error) {
    console.error('Error getting reaction counts for book:', error);
    return counts;
  }
}

async function getVerseInteractors(verseRef, interactionType) {
  const MAX_USERS = 20;

  try {
    const isIndexError = (error) => {
      if (!error) return false;
      if (error.code === 'failed-precondition') return true;
      const message = typeof error.message === 'string' ? error.message.toLowerCase() : '';
      return message.includes('index');
    };

    const buildQuery = (col, constraints, includeOrderBy) => {
      const queryConstraints = [...constraints];
      if (includeOrderBy) {
        queryConstraints.push(orderBy('timestamp', 'desc'));
      }
      queryConstraints.push(limit(MAX_USERS));
      return query(col, ...queryConstraints);
    };

    const col = chavrutaCollection(interactionType === 'bookmark' ? 'bookmarks' : 'reactions');
    const baseConstraints = interactionType === 'bookmark'
      ? [where('verseRef', '==', verseRef)]
      : [
          where('verseRef', '==', verseRef),
          where('reactionType', '==', interactionType)
        ];

    let snapshot;
    try {
      snapshot = await getDocs(buildQuery(col, baseConstraints, true));
    } catch (error) {
      if (isIndexError(error)) {
        snapshot = await getDocs(buildQuery(col, baseConstraints, false));
      } else {
        throw error;
      }
    }

    const userPromises = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.userId) {
        userPromises.push(
          getUserInfo(data.userId).then(userInfo => ({
            user: userInfo,
            timestamp: data.timestamp
          }))
        );
      }
    });

    const userResults = await Promise.all(userPromises);
    return userResults.filter(r => r.user !== null);
  } catch (error) {
    console.error(`Error fetching ${interactionType} users for ${verseRef}:`, error);
    return [];
  }
}

// ========================================
// BOOKMARKS (synchronized across user's chavrutot)
// ========================================

async function addBookmark(userId, verseRef, bookmarkMeta = {}) {
  if (!userId) {
    throw new Error('User not authenticated');
  }
  if (!verseRef || verseRef.trim().length === 0) {
    throw new Error('Verse reference is required');
  }

  try {
    const bookmarkKey = `${userId}__${encodeURIComponent(verseRef)}`;
    const chavrutaIds = await getWritableChavrutaIdsForUser(userId);

    const bookmarkData = {
      verseRef: verseRef,
      userId: userId,
      verseText: bookmarkMeta.verseText || '',
      timestamp: serverTimestamp()
    };

    await Promise.all(
      chavrutaIds.map((chavrutaId) =>
        setDoc(doc(db, 'chavrutas', chavrutaId, 'bookmarks', bookmarkKey), bookmarkData)
      )
    );
    return { action: 'added', verseRef, id: bookmarkKey };
  } catch (error) {
    console.error('Error adding bookmark:', error);
    throw error;
  }
}

async function removeBookmark(userId, verseRef) {
  if (!userId) {
    throw new Error('User not authenticated');
  }

  try {
    const bookmarkKey = `${userId}__${encodeURIComponent(verseRef)}`;
    const chavrutaIds = await getWritableChavrutaIdsForUser(userId);
    await Promise.all(
      chavrutaIds.map((chavrutaId) =>
        deleteDoc(doc(db, 'chavrutas', chavrutaId, 'bookmarks', bookmarkKey))
      )
    );
    return { action: 'removed', verseRef };
  } catch (error) {
    console.error('Error removing bookmark:', error);
    throw error;
  }
}

async function isVerseBookmarked(userId, verseRef) {
  if (!userId || !verseRef) {
    return false;
  }

  try {
    const chavrutaIds = await getUserChavrutaIds(userId);
    if (!chavrutaIds.length) {
      return false;
    }

    const bookmarkKey = `${userId}__${encodeURIComponent(verseRef)}`;
    const snapshots = await Promise.all(
      chavrutaIds.map((chavrutaId) =>
        getDoc(doc(db, 'chavrutas', chavrutaId, 'bookmarks', bookmarkKey))
      )
    );
    return snapshots.some((snapshot) => snapshot.exists());
  } catch (error) {
    console.error('Error checking bookmark:', error);
    return false;
  }
}

// Helper: get all chavruta IDs the current user belongs to
// Helper: query a subcollection across all user's chavrutas
async function queryAcrossChavrutas(userId, subcollectionName, constraints) {
  const chavrutaIds = await getUserChavrutaIds(userId);
  if (chavrutaIds.length === 0) return [];

  const snapshots = await Promise.all(
    chavrutaIds.map(cId => {
      const ref = collection(db, 'chavrutas', cId, subcollectionName);
      const q = constraints.length > 0 ? query(ref, ...constraints) : ref;
      return getDocs(q).catch(() => null);
    })
  );

  const docs = [];
  snapshots.forEach(snap => {
    if (!snap) return;
    snap.forEach(docSnap => docs.push(docSnap));
  });
  return docs;
}

async function getUserBookmarks(userId) {
  if (!userId) {
    return [];
  }

  try {
    const allDocs = await queryAcrossChavrutas(userId, 'bookmarks', [
      where('userId', '==', userId)
    ]);
    const bookmarksByVerseRef = new Map();

    allDocs.forEach((docSnap) => {
      const data = docSnap.data();
      const verseRef = data.verseRef;
      if (!verseRef) {
        return;
      }

      const next = {
        id: docSnap.id,
        verseRef,
        userId: data.userId,
        timestamp: data.timestamp,
        verseText: data.verseText || null
      };

      const existing = bookmarksByVerseRef.get(verseRef);
      if (!existing || getTimestampMillis(next.timestamp) > getTimestampMillis(existing.timestamp)) {
        bookmarksByVerseRef.set(verseRef, next);
      } else if (existing && !existing.verseText && next.verseText) {
        bookmarksByVerseRef.set(verseRef, { ...existing, verseText: next.verseText });
      }
    });

    const bookmarks = Array.from(bookmarksByVerseRef.values());
    bookmarks.sort((a, b) => {
      return getTimestampMillis(b.timestamp) - getTimestampMillis(a.timestamp);
    });

    return bookmarks;
  } catch (error) {
    console.error('Error getting user bookmarks:', error);
    return [];
  }
}

async function getBookmarkCountsForBook(bookName) {
  const counts = {};

  try {
    const startRef = `${bookName} `;
    const endRef = `${bookName}~`;

    const bookmarksQuery = query(
      chavrutaCollection('bookmarks'),
      where('verseRef', '>=', startRef),
      where('verseRef', '<=', endRef)
    );

    const querySnapshot = await getDocs(bookmarksQuery);

    // Count bookmarks per verse directly from the bookmarks subcollection
    const verseCounts = {};
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const verseRef = data.verseRef;
      verseCounts[verseRef] = (verseCounts[verseRef] || 0) + 1;
    });

    Object.entries(verseCounts).forEach(([verseRef, count]) => {
      counts[verseRef] = Math.max(0, count);
    });

    return counts;
  } catch (error) {
    console.error('Error getting bookmark counts for book:', error);
    return counts;
  }
}

async function getBookmarkCountsForVerses(verseRefs) {
  const counts = {};

  if (!Array.isArray(verseRefs) || verseRefs.length === 0) {
    return counts;
  }

  try {
    const maxBatchSize = 10;

    for (let i = 0; i < verseRefs.length; i += maxBatchSize) {
      const batch = verseRefs.slice(i, i + maxBatchSize);
      const bookmarksQuery = query(
        chavrutaCollection('bookmarks'),
        where('verseRef', 'in', batch)
      );

      const querySnapshot = await getDocs(bookmarksQuery);

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const verseRef = data.verseRef;
        counts[verseRef] = (counts[verseRef] || 0) + 1;
      });
    }

    return counts;
  } catch (error) {
    console.error('Error getting bookmark counts for verses:', error);
    return counts;
  }
}

// ========================================
// DAILY QUOTE BOOKMARKS (synchronized across user's chavrutot)
// ========================================

async function addDailyQuoteBookmark(userId, quoteId, quoteData) {
  if (!userId) {
    throw new Error('User not authenticated');
  }
  if (quoteId == null) {
    throw new Error('Quote id is required');
  }

  const qid = String(quoteId);

  try {
    const bookmarkKey = `${userId}__dailyQuote__${qid}`;
    const chavrutaIds = await getWritableChavrutaIdsForUser(userId);

    const data = quoteData || {};
    const bookmarkPayload = {
      quoteId: qid,
      userId,
      hebrew: data.hebrew || '',
      translation: data.translation || '',
      source: data.source || '',
      reflection: data.reflection || '',
      savedOn: data.displayDate || data.savedOn || null,
      timestamp: serverTimestamp()
    };

    // Delete first to avoid update-denied (rules allow create, not update)
    await Promise.all(
      chavrutaIds.map((chavrutaId) =>
        deleteDoc(doc(db, 'chavrutas', chavrutaId, 'dailyQuoteBookmarks', bookmarkKey)).catch(() => null)
      )
    );

    await Promise.all(
      chavrutaIds.map((chavrutaId) =>
        setDoc(doc(db, 'chavrutas', chavrutaId, 'dailyQuoteBookmarks', bookmarkKey), bookmarkPayload)
      )
    );
    return { action: 'added', quoteId: qid, id: bookmarkKey };
  } catch (error) {
    console.error('Error adding daily quote bookmark:', error);
    throw error;
  }
}

async function removeDailyQuoteBookmark(userId, quoteId) {
  if (!userId) {
    throw new Error('User not authenticated');
  }
  if (quoteId == null) {
    throw new Error('Quote id is required');
  }

  try {
    const bookmarkKey = `${userId}__dailyQuote__${quoteId}`;
    const chavrutaIds = await getWritableChavrutaIdsForUser(userId);
    await Promise.all(
      chavrutaIds.map((chavrutaId) =>
        deleteDoc(doc(db, 'chavrutas', chavrutaId, 'dailyQuoteBookmarks', bookmarkKey))
      )
    );
    return { action: 'removed', quoteId };
  } catch (error) {
    console.error('Error removing daily quote bookmark:', error);
    throw error;
  }
}

async function isDailyQuoteBookmarked(userId, quoteId) {
  if (!userId || quoteId == null) {
    return false;
  }

  try {
    const chavrutaIds = await getUserChavrutaIds(userId);
    if (!chavrutaIds.length) {
      return false;
    }

    const bookmarkKey = `${userId}__dailyQuote__${quoteId}`;
    const snapshots = await Promise.all(
      chavrutaIds.map((chavrutaId) =>
        getDoc(doc(db, 'chavrutas', chavrutaId, 'dailyQuoteBookmarks', bookmarkKey))
      )
    );
    return snapshots.some((snapshot) => snapshot.exists());
  } catch (error) {
    console.error('Error checking daily quote bookmark:', error);
    return false;
  }
}

async function getUserDailyQuoteBookmarks(userId) {
  if (!userId) {
    return [];
  }

  try {
    const allDocs = await queryAcrossChavrutas(userId, 'dailyQuoteBookmarks', [
      where('userId', '==', userId)
    ]);
    const bookmarksByQuoteId = new Map();

    allDocs.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      const quoteIdValue = data.quoteId;
      if (quoteIdValue == null) {
        return;
      }

      const next = {
        id: docSnapshot.id,
        quoteId: String(quoteIdValue),
        userId: data.userId,
        hebrew: data.hebrew || '',
        translation: data.translation || '',
        source: data.source || '',
        reflection: data.reflection || '',
        savedOn: data.savedOn || null,
        timestamp: data.timestamp
      };

      const existing = bookmarksByQuoteId.get(next.quoteId);
      if (!existing || getTimestampMillis(next.timestamp) > getTimestampMillis(existing.timestamp)) {
        bookmarksByQuoteId.set(next.quoteId, next);
      } else if (existing) {
        bookmarksByQuoteId.set(next.quoteId, {
          ...existing,
          hebrew: existing.hebrew || next.hebrew,
          translation: existing.translation || next.translation,
          source: existing.source || next.source,
          reflection: existing.reflection || next.reflection,
          savedOn: existing.savedOn || next.savedOn
        });
      }
    });

    const bookmarks = Array.from(bookmarksByQuoteId.values());
    bookmarks.sort((a, b) => {
      return getTimestampMillis(b.timestamp) - getTimestampMillis(a.timestamp);
    });

    return bookmarks;
  } catch (error) {
    console.error('Error getting daily quote bookmarks:', error);
    return [];
  }
}

async function getCommunityQuoteBookmarks(quoteId) {
  try {
    const currentUserId = getCurrentUserId();
    const constraints = quoteId != null
      ? [where('quoteId', '==', String(quoteId))]
      : [];
    const allDocs = await queryAcrossChavrutas(currentUserId, 'dailyQuoteBookmarks', constraints);

    const quoteMap = new Map();
    const allUserIds = new Set();

    allDocs.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      const qid = data.quoteId != null ? String(data.quoteId) : '';
      if (!qid) return;
      const timestampMillis = getTimestampMillis(data.timestamp);

      if (data.userId) {
        allUserIds.add(data.userId);
      }

      if (!quoteMap.has(qid)) {
        quoteMap.set(qid, {
          quoteId: qid,
          translation: data.translation || '',
          hebrew: data.hebrew || '',
          source: data.source || '',
          reflection: data.reflection || '',
          saverTimestamps: new Map(),
          latestTimestampMillis: timestampMillis
        });
      }

      const entry = quoteMap.get(qid);
      if (timestampMillis >= entry.latestTimestampMillis) {
        entry.translation = data.translation || entry.translation;
        entry.hebrew = data.hebrew || entry.hebrew;
        entry.source = data.source || entry.source;
        entry.reflection = data.reflection || entry.reflection;
        entry.latestTimestampMillis = timestampMillis;
      } else {
        entry.translation = entry.translation || data.translation || '';
        entry.hebrew = entry.hebrew || data.hebrew || '';
        entry.source = entry.source || data.source || '';
        entry.reflection = entry.reflection || data.reflection || '';
      }

      if (data.userId) {
        const existingTs = entry.saverTimestamps.get(data.userId) || 0;
        if (timestampMillis > existingTs) {
          entry.saverTimestamps.set(data.userId, timestampMillis);
        }
      }
    });

    const userNameMap = new Map();
    await Promise.all(
      Array.from(allUserIds).map(async (uid) => {
        try {
          const info = await getUserInfo(uid);
          const name = info
            ? (info.username || info.displayName || getDisplayNameFromEmail(info.email) || 'A Friend')
            : 'A Friend';
          userNameMap.set(uid, name);
        } catch (_) {
          userNameMap.set(uid, 'A Friend');
        }
      })
    );

    const results = Array.from(quoteMap.values())
      .map((entry) => {
        const orderedSaverIds = Array.from(entry.saverTimestamps.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([uid]) => uid);
        const saverPreviewIds = orderedSaverIds.slice(0, 5);

        return {
          quoteId: entry.quoteId,
          translation: entry.translation,
          hebrew: entry.hebrew,
          source: entry.source,
          reflection: entry.reflection,
          saverIds: saverPreviewIds,
          savers: saverPreviewIds.map((uid) => userNameMap.get(uid) || 'A Friend'),
          count: orderedSaverIds.length,
          latestTimestampMillis: entry.latestTimestampMillis
        };
      })
      .sort((a, b) => {
        if (b.count !== a.count) {
          return b.count - a.count;
        }
        return (b.latestTimestampMillis || 0) - (a.latestTimestampMillis || 0);
      });

    return results;
  } catch (error) {
    console.error('Error getting community quote bookmarks:', error);
    return [];
  }
}

async function getDailyQuoteBookmarkCount(quoteId) {
  try {
    if (quoteId == null) {
      return 0;
    }
    const currentUserId = getCurrentUserId();
    const allDocs = await queryAcrossChavrutas(currentUserId, 'dailyQuoteBookmarks', [
      where('quoteId', '==', String(quoteId))
    ]);
    const uniqueUsers = new Set();
    allDocs.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      if (data.userId) {
        uniqueUsers.add(data.userId);
      }
    });
    return uniqueUsers.size;
  } catch (error) {
    console.error('Error getting daily quote bookmark count:', error);
    return 0;
  }
}

async function getDailyQuoteInteractors(quoteId) {
  try {
    if (quoteId == null) {
      return [];
    }
    const currentUserId = getCurrentUserId();
    const allDocs = await queryAcrossChavrutas(currentUserId, 'dailyQuoteBookmarks', [
      where('quoteId', '==', String(quoteId))
    ]);

    const latestByUser = new Map();
    allDocs.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      if (data.userId) {
        const existing = latestByUser.get(data.userId);
        if (!existing || getTimestampMillis(data.timestamp) > getTimestampMillis(existing)) {
          latestByUser.set(data.userId, data.timestamp);
        }
      }
    });

    const sortedUserIds = Array.from(latestByUser.entries())
      .sort((a, b) => getTimestampMillis(b[1]) - getTimestampMillis(a[1]))
      .slice(0, 15)
      .map(([uid]) => uid);

    const results = await Promise.all(
      sortedUserIds.map(async (uid) => {
        try {
          const info = await getUserInfo(uid);
          return { user: info, timestamp: latestByUser.get(uid) };
        } catch (_) {
          return { user: null, timestamp: latestByUser.get(uid) };
        }
      })
    );
    return results.filter(r => r.user !== null);
  } catch (error) {
    console.error('Error getting daily quote interactors:', error);
    return [];
  }
}

// ========================================
// PRESENCE (chavruta-scoped)
// ========================================

async function updateUserPresence(userId) {
  if (!userId) {
    return null;
  }

  try {
    // Also read top-level user for displayName/email
    const userDocRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userDocRef);
    const userData = userSnap.exists() ? userSnap.data() : {};

    const presenceDocRef = chavrutaDoc('presence', userId);
    await setDoc(
      presenceDocRef,
      {
        isOnline: true,
        lastSeen: serverTimestamp(),
        displayName: userData.displayName || userData.username || 'Friend',
        email: userData.email || null
      },
      { merge: true }
    );
  } catch (error) {
    console.error('Error updating user presence:', error);
  }
}

async function markUserOffline(userId) {
  if (!userId) {
    return null;
  }

  try {
    const presenceDocRef = chavrutaDoc('presence', userId);
    await setDoc(
      presenceDocRef,
      {
        isOnline: false,
        lastSeen: serverTimestamp()
      },
      { merge: true }
    );
    console.log('User marked as offline');
  } catch (error) {
    console.error('Error marking user offline:', error);
  }
}

let onlineUsersUnsubscribe = null;

function listenForOnlineUsers(callback) {
  if (onlineUsersUnsubscribe) {
    onlineUsersUnsubscribe();
    onlineUsersUnsubscribe = null;
  }

  try {
    const presenceQuery = query(
      chavrutaCollection('presence'),
      where('isOnline', '==', true)
    );

    onlineUsersUnsubscribe = onSnapshot(presenceQuery,
      (querySnapshot) => {
        const onlineUsers = [];
        querySnapshot.forEach((docSnapshot) => {
          const data = docSnapshot.data();
          onlineUsers.push({
            docId: docSnapshot.id,
            userId: docSnapshot.id,
            email: data.email || null,
            username: data.displayName || 'Friend',
            displayName: data.displayName || 'Friend',
            isOnline: true,
            lastSeen: data.lastSeen || null
          });
        });
        callback(onlineUsers);
      },
      (error) => {
        console.error('Error listening to online users:', error);
        callback([]);
      }
    );
  } catch (error) {
    console.error('Error setting up online users listener:', error);
    callback([]);
  }
}

function stopListeningForOnlineUsers() {
  if (onlineUsersUnsubscribe) {
    onlineUsersUnsubscribe();
    onlineUsersUnsubscribe = null;
  }
}

// Gets user profile from top-level users/{userId}
async function getUserInfo(userId) {
  if (!userId) {
    return null;
  }

  try {
    const userDocRef = doc(db, 'users', userId);
    const docSnap = await getDoc(userDocRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        docId: docSnap.id,
        userId: data.userId || docSnap.id,
        email: data.email || null,
        username: data.displayName || data.username || 'Friend',
        displayName: data.displayName || data.username || 'Friend',
        displayNameChanged: !!data.displayNameChanged,
        lastLogin: data.lastLogin || null,
        isOnline: !!data.isOnline,
        lastSeen: data.lastSeen || null
      };
    }

    return null;
  } catch (error) {
    console.error('Error getting user info:', error);
    return null;
  }
}

// Reads from chavruta's presence subcollection, returns users active in last 3 weeks
async function getUsersWithinThreeWeeks(limitCount = 10) {
  try {
    const threeWeeksAgo = new Date();
    threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21);
    const threeWeeksAgoTimestamp = threeWeeksAgo.getTime();

    let presenceQuery;
    try {
      presenceQuery = query(
        chavrutaCollection('presence'),
        orderBy('lastSeen', 'desc'),
        limit(limitCount * 2)
      );
    } catch (e) {
      // If no chavruta is active, return empty
      return [];
    }

    const querySnapshot = await getDocs(presenceQuery);
    const users = [];

    querySnapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      const lastSeen = data.lastSeen;
      const lastSeenMs = lastSeen?.toMillis?.()
        || (lastSeen instanceof Date ? lastSeen.getTime() : null);

      if (lastSeenMs && lastSeenMs > threeWeeksAgoTimestamp) {
        users.push({
          docId: docSnapshot.id,
          userId: docSnapshot.id,
          email: data.email || null,
          username: data.displayName || 'Friend',
          displayName: data.displayName || 'Friend',
          isOnline: !!data.isOnline,
          lastSeen: data.lastSeen || null,
          lastLogin: data.lastSeen || null
        });
      }

      if (users.length >= limitCount) {
        return;
      }
    });

    return users.slice(0, limitCount);
  } catch (error) {
    console.error('Error getting users within 3 weeks:', error);
    return [];
  }
}

// ========================================
// MITZVAH (chavruta-scoped — chavrutas/{id}/mitzvah-data)
// ========================================

let mitzvahReflectionsUnsubscribe = null;

function listenForMitzvahReflections(parshaName, callback) {
  if (mitzvahReflectionsUnsubscribe) {
    mitzvahReflectionsUnsubscribe();
    mitzvahReflectionsUnsubscribe = null;
  }

  if (!parshaName) {
    callback([]);
    return;
  }

  try {
    const reflectionsQuery = query(
      chavrutaCollection('mitzvah-data'),
      where('type', '==', 'reflection'),
      where('parshaName', '==', parshaName),
      orderBy('createdAt', 'asc'),
      limit(100)
    );

    mitzvahReflectionsUnsubscribe = onSnapshot(reflectionsQuery,
      (querySnapshot) => {
        const reflections = [];
        querySnapshot.forEach((docSnapshot) => {
          const data = docSnapshot.data();
          reflections.push({
            id: docSnapshot.id,
            challengeId: data.parshaName || data.challengeId,
            parshaName: data.parshaName,
            message: data.message,
            userId: data.userId,
            username: data.username,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            reactions: data.reactions
          });
        });
        callback(reflections);
      },
      (error) => {
        console.error('Error listening to mitzvah reflections:', error);
        // Fallback: try without orderBy in case index doesn't exist yet
        try {
          const fallbackQuery = query(
            chavrutaCollection('mitzvah-data'),
            where('type', '==', 'reflection'),
            where('parshaName', '==', parshaName),
            limit(100)
          );
          mitzvahReflectionsUnsubscribe = onSnapshot(fallbackQuery,
            (querySnapshot) => {
              const reflections = [];
              querySnapshot.forEach((docSnapshot) => {
                const data = docSnapshot.data();
                reflections.push({
                  id: docSnapshot.id,
                  challengeId: data.parshaName || data.challengeId,
                  parshaName: data.parshaName,
                  message: data.message,
                  userId: data.userId,
                  username: data.username,
                  createdAt: data.createdAt,
                  updatedAt: data.updatedAt,
                  reactions: data.reactions
                });
              });
              // Sort manually
              reflections.sort((a, b) => {
                if (!a.createdAt) return -1;
                if (!b.createdAt) return 1;
                return a.createdAt.toMillis() - b.createdAt.toMillis();
              });
              callback(reflections);
            },
            () => callback([])
          );
        } catch (_) {
          callback([]);
        }
      }
    );
  } catch (error) {
    console.error('Error setting up mitzvah reflections listener:', error);
    callback([]);
  }
}

function stopListeningForMitzvahReflections() {
  if (mitzvahReflectionsUnsubscribe) {
    mitzvahReflectionsUnsubscribe();
    mitzvahReflectionsUnsubscribe = null;
  }
}

async function submitMitzvahReflection(parshaName, text, userId, username) {
  if (!parshaName || !text || !userId) {
    throw new Error('Missing required fields to submit reflection');
  }

  const trimmedMessage = text.trim();
  if (!trimmedMessage) {
    throw new Error('Reflection message cannot be empty');
  }

  try {
    const providedUsername = typeof username === 'string' ? username.trim() : '';
    const resolvedUsername = (providedUsername && !providedUsername.includes('@') && providedUsername.toLowerCase() !== 'friend')
      ? providedUsername
      : 'Friend';

    const reflection = {
      type: 'reflection',
      parshaName,
      challengeId: parshaName,
      message: trimmedMessage,
      userId,
      username: resolvedUsername,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await addDoc(chavrutaCollection('mitzvah-data'), reflection);
    return reflection;
  } catch (error) {
    console.error('Error submitting mitzvah reflection:', error);
    throw error;
  }
}

async function submitMitzvahReflectionReaction(parshaName, reflectionId, reactionType, userId) {
  if (!reflectionId || !reactionType || !userId) {
    throw new Error('Missing required fields for reaction');
  }

  const reflectionRef = chavrutaDoc('mitzvah-data', reflectionId);

  try {
    await runTransaction(db, async (transaction) => {
      const reflectionDoc = await transaction.get(reflectionRef);
      if (!reflectionDoc.exists()) {
        throw new Error('Reflection not found');
      }

      const reflectionData = reflectionDoc.data();
      const reactions = reflectionData.reactions || {};
      const reaction = reactions[reactionType] || [];

      if (reaction.includes(userId)) {
        const updatedReaction = reaction.filter((id) => id !== userId);
        reactions[reactionType] = updatedReaction;
      } else {
        reaction.push(userId);
        reactions[reactionType] = reaction;
      }

      transaction.update(reflectionRef, { reactions });
    });
  } catch (error) {
    console.error('Error submitting mitzvah reflection reaction:', error);
    throw error;
  }
}

async function getMitzvahCompletionStatus(parshaName, userId) {
  if (!userId || !parshaName) {
    return { completed: false };
  }

  try {
    const statusDocId = `completion__${userId}__${parshaName}`;
    const statusDocRef = chavrutaDoc('mitzvah-data', statusDocId);
    const snapshot = await getDoc(statusDocRef);
    if (snapshot.exists()) {
      const data = snapshot.data();
      return {
        completed: Boolean(data.completed),
        completedAt: data.completedAt || null,
        updatedAt: data.updatedAt || null
      };
    }
    return { completed: false };
  } catch (error) {
    console.error('Error fetching mitzvah completion status:', error);
    return { completed: false };
  }
}

async function setMitzvahCompletionStatus(parshaName, userId, completed) {
  if (!userId || !parshaName) {
    throw new Error('Missing required identifiers to update completion status');
  }

  try {
    const statusDocId = `completion__${userId}__${parshaName}`;
    const statusDocRef = chavrutaDoc('mitzvah-data', statusDocId);
    const payload = {
      type: 'completion',
      parshaName,
      userId,
      completed: Boolean(completed),
      updatedAt: serverTimestamp()
    };
    if (completed) {
      payload.completedAt = serverTimestamp();
    }
    await setDoc(statusDocRef, payload, { merge: true });
    return payload;
  } catch (error) {
    console.error('Error updating mitzvah completion status:', error);
    throw error;
  }
}

async function updateMitzvahLeaderboard(parshaName, userId, displayName) {
  if (!userId) {
    return;
  }

  try {
    const leaderboardRef = chavrutaDoc('mitzvah-data', `leaderboard__${userId}`);
    const resolvedName = (typeof displayName === 'string' && displayName.trim() && !displayName.includes('@'))
      ? displayName.trim()
      : 'Friend';

    // Count all completions for this user in this chavruta
    const completionsQuery = query(
      chavrutaCollection('mitzvah-data'),
      where('type', '==', 'completion'),
      where('userId', '==', userId),
      where('completed', '==', true)
    );
    const snapshot = await getDocs(completionsQuery);
    const total = snapshot.size;

    const payload = {
      type: 'leaderboard',
      userId,
      username: resolvedName,
      totalCompleted: total,
      updatedAt: serverTimestamp()
    };

    if (total > 0) {
      payload.lastCompletedAt = serverTimestamp();
    }

    await setDoc(leaderboardRef, payload, { merge: true });
  } catch (error) {
    console.error('Error updating mitzvah leaderboard:', error);
  }
}

async function recalculateMitzvahLeaderboard(parshaName, userId) {
  // parshaName is accepted for interface compatibility but we recalculate all completions
  if (!userId) {
    return null;
  }

  try {
    const completionsQuery = query(
      chavrutaCollection('mitzvah-data'),
      where('type', '==', 'completion'),
      where('userId', '==', userId),
      where('completed', '==', true)
    );
    const snapshot = await getDocs(completionsQuery);
    const total = snapshot.size;

    // Try to get the user's display name
    let username = 'Friend';
    try {
      const info = await getUserInfo(userId);
      if (info && info.username) {
        username = info.username;
      }
    } catch (_) {}

    const leaderboardRef = chavrutaDoc('mitzvah-data', `leaderboard__${userId}`);
    const payload = {
      type: 'leaderboard',
      userId,
      username,
      totalCompleted: total,
      updatedAt: serverTimestamp()
    };

    await setDoc(leaderboardRef, payload, { merge: true });
    return payload;
  } catch (error) {
    console.error('Error recalculating mitzvah leaderboard:', error);
    return null;
  }
}

async function getMitzvahLeaderboard(parshaName, limitCount = 10) {
  try {
    let snapshot;
    try {
      const leaderboardQuery = query(
        chavrutaCollection('mitzvah-data'),
        where('type', '==', 'leaderboard'),
        orderBy('totalCompleted', 'desc'),
        limit(limitCount * 2)
      );
      snapshot = await getDocs(leaderboardQuery);
    } catch (indexError) {
      console.warn('Leaderboard index not available, using fallback query:', indexError.message);
      const fallbackQuery = query(
        chavrutaCollection('mitzvah-data'),
        where('type', '==', 'leaderboard')
      );
      snapshot = await getDocs(fallbackQuery);
    }

    const entries = [];
    snapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      if (!data || typeof data.totalCompleted !== 'number' || data.totalCompleted <= 0) {
        return;
      }
      entries.push({
        id: docSnapshot.id,
        userId: data.userId || docSnapshot.id,
        username: data.username || 'Friend',
        totalCompleted: data.totalCompleted,
        firstCompletedAt: data.firstCompletedAt || null,
        lastCompletedAt: data.lastCompletedAt || null,
        updatedAt: data.updatedAt || null
      });
    });

    // De-duplicate by userId
    const byUser = new Map();
    for (const entry of entries) {
      const key = entry.userId;
      const existing = byUser.get(key);
      if (!existing || (entry.totalCompleted || 0) > (existing.totalCompleted || 0)) {
        byUser.set(key, entry);
      }
    }

    return Array.from(byUser.values())
      .sort((a, b) => (b.totalCompleted || 0) - (a.totalCompleted || 0))
      .slice(0, limitCount);
  } catch (error) {
    console.error('Error loading mitzvah leaderboard:', error);
    return [];
  }
}

// ========================================
// UTILITIES
// ========================================

function formatTimeAgo(timestamp) {
  if (!timestamp) {
    return 'never';
  }

  const now = new Date();
  const loginTime = new Date(timestamp.toMillis ? timestamp.toMillis() : timestamp);
  const diffMs = now - loginTime;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } else {
    return loginTime.toLocaleDateString();
  }
}

// ========================================
// EXPORTS
// ========================================

export {
  db,
  initAuth,
  getCurrentUserId,
  getCurrentUserEmail,
  signInWithEmail,
  createAccountWithEmail,
  signOutUser,
  hideLoginModal,
  sendPasswordReset,
  recordUserLogin,
  submitComment,
  listenForComments,
  stopListeningForComments,
  submitReaction,
  getUserReactions,
  getReactionCountsForBook,
  getVerseInteractors,
  addBookmark,
  removeBookmark,
  isVerseBookmarked,
  getUserBookmarks,
  getBookmarkCountsForBook,
  getBookmarkCountsForVerses,
  addDailyQuoteBookmark,
  removeDailyQuoteBookmark,
  isDailyQuoteBookmarked,
  getUserDailyQuoteBookmarks,
  getCommunityQuoteBookmarks,
  getUserChavrutaIds,
  getDailyQuoteBookmarkCount,
  getDailyQuoteInteractors,
  updateUserPresence,
  markUserOffline,
  listenForOnlineUsers,
  stopListeningForOnlineUsers,
  getUserInfo,
  getUsersWithinThreeWeeks,
  listenForMitzvahReflections,
  stopListeningForMitzvahReflections,
  submitMitzvahReflection,
  submitMitzvahReflectionReaction,
  getMitzvahCompletionStatus,
  setMitzvahCompletionStatus,
  updateMitzvahLeaderboard,
  recalculateMitzvahLeaderboard,
  getMitzvahLeaderboard,
  formatTimeAgo
};
