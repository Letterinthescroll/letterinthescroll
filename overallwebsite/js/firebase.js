// Firebase Module - Initialize Firebase services
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
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
    increment,
    orderBy,
    limit,
    runTransaction
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getDisplayNameFromEmail } from './name-utils.js';

// Known email aliases that should resolve to the same canonical account.
// Extend this map as needed to keep multi-email friends unified.
const EMAIL_ALIAS_MAP = {
  'loripreci03@gmail.com': 'lpreci1@jh.edu',
  'lpreci1@jh.edu': 'lpreci1@jh.edu',
  'aidanitaischurr@gmail.com': 'aidan.schurr@gwmail.gwu.edu',
  'aidan.schurr@gwmail.gwu.edu': 'aidan.schurr@gwmail.gwu.edu'
};

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC3KsU8fdztSCQ5b7sgMUWWbDDJVrQ0ymU",
  authDomain: "dvartorah-d1fad.firebaseapp.com",
  projectId: "dvartorah-d1fad",
  storageBucket: "dvartorah-d1fad.appspot.com",
  messagingSenderId: "368154467911",
  appId: "1:368154467911:web:7af511f96100559a7e9b62"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
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

// Current user state
let currentUser = null;

// Initialize authentication with listener
function initAuth(onAuthReady) {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      currentUser = user;
      console.log('User authenticated:', user.email);
      hideLoginModal();
      if (onAuthReady) onAuthReady(user);
    } else {
      currentUser = null;
      console.log('No user authenticated');
      showLoginModal();
      if (onAuthReady) onAuthReady(null);
    }
  });
}

// Sign in with email and password
async function signInWithEmail(email, password) {
  try {
    // Normalize email while leaving password case intact
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

// Create account with email and password
async function createAccountWithEmail(email, password) {
  try {
    // Normalize email while leaving password case intact
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

// Sign out current user
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

// Get current user ID
function getCurrentUserId() {
  return currentUser ? currentUser.uid : null;
}

// Get current user email
function getCurrentUserEmail() {
  return currentUser ? currentUser.email : null;
}

// Show login modal (to be implemented in UI)
function showLoginModal() {
  const modal = document.getElementById('login-modal');
  if (modal) {
    modal.classList.remove('hidden');
  }
}

// Hide login modal (to be implemented in UI)
function hideLoginModal() {
  const modal = document.getElementById('login-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

// Submit a comment to Firestore with username
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

    const docRef = await addDoc(collection(db, 'comments'), commentData);
    return docRef.id;
  } catch (error) {
    console.error('Error adding comment:', error);
    throw error;
  }
}

// Listen for comments on a specific verse
let currentCommentsUnsubscribe = null;

function listenForComments(verseRef, callback) {
  // Stop previous listener if exists
  if (currentCommentsUnsubscribe) {
    currentCommentsUnsubscribe();
    currentCommentsUnsubscribe = null;
  }

  try {
    // SIMPLIFIED QUERY - No orderBy to avoid needing an index
    // We'll sort in JavaScript instead
    const commentsQuery = query(
      collection(db, 'comments'),
      where('verseRef', '==', verseRef)
      // orderBy removed temporarily - will sort in code
    );

    currentCommentsUnsubscribe = onSnapshot(commentsQuery, 
      (querySnapshot) => {
        const comments = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          comments.push({
            id: doc.id,
            verseRef: data.verseRef,
            text: data.text,
            userId: data.userId,
            username: data.username || 'Anonymous',
            timestamp: data.timestamp
          });
        });
        
        // Sort by timestamp in JavaScript (newest first)
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

// Stop listening for comments
function stopListeningForComments() {
  if (currentCommentsUnsubscribe) {
    currentCommentsUnsubscribe();
    currentCommentsUnsubscribe = null;
  }
}

// ========================================
// REACTION FUNCTIONS (Emphasize & Heart)
// ========================================

// Submit or toggle a reaction (emphasize or heart)
async function submitReaction(verseRef, reactionType, userId) {
  if (!userId) {
    throw new Error('User not authenticated');
  }

  if (!['emphasize', 'heart'].includes(reactionType)) {
    throw new Error('Invalid reaction type');
  }

  try {
    const reactionKey = `${encodeURIComponent(verseRef)}__${userId}__${reactionType}`;
    const reactionDocRef = doc(db, 'reactions', reactionKey);

    const existingDoc = await getDoc(reactionDocRef);

    if (existingDoc.exists()) {
      await deleteDoc(reactionDocRef);
      return { action: 'removed', reactionType };
    }

    const reactionData = {
      verseRef: verseRef,
      userId: userId,
      reactionType: reactionType,
      timestamp: serverTimestamp()
    };

    await setDoc(reactionDocRef, reactionData);
    return { action: 'added', reactionType, id: reactionKey };
  } catch (error) {
    console.error('Error submitting reaction:', error);
    throw error;
  }
}

// Get reaction counts for multiple verses
async function getReactionCounts(verseRefs) {
  const counts = {};

  // Initialize counts for all verses
  verseRefs.forEach(ref => {
    counts[ref] = { emphasize: 0, heart: 0 };
  });

  try {
    // Query all reactions for these verses
    const reactionsQuery = query(
      collection(db, 'reactions'),
      where('verseRef', 'in', verseRefs.slice(0, 30)) // Firestore 'in' limit is 30
    );

    const querySnapshot = await getDocs(reactionsQuery);

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const verseRef = data.verseRef;
      const reactionType = data.reactionType;

      if (counts[verseRef]) {
        counts[verseRef][reactionType] = (counts[verseRef][reactionType] || 0) + 1;
      }
    });

    return counts;
  } catch (error) {
    console.error('Error getting reaction counts:', error);
    return counts;
  }
}

// Get user's reactions for specific verses
async function getUserReactions(userId, verseRefs) {
  const userReactions = {};

  if (!userId || !verseRefs || verseRefs.length === 0) {
    return userReactions;
  }

  try {
    const reactionsQuery = query(
      collection(db, 'reactions'),
      where('userId', '==', userId),
      where('verseRef', 'in', verseRefs.slice(0, 30))
    );

    const querySnapshot = await getDocs(reactionsQuery);

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const verseRef = data.verseRef;
      const reactionType = data.reactionType;

      if (!userReactions[verseRef]) {
        userReactions[verseRef] = [];
      }
      userReactions[verseRef].push(reactionType);
    });

    return userReactions;
  } catch (error) {
    console.error('Error getting user reactions:', error);
    return userReactions;
  }
}

// Get reaction counts for a specific book range (for parsha loading)
async function getReactionCountsForBook(bookName) {
  const counts = {};

  try {
    const startRef = `${bookName} `;
    const endRef = `${bookName}~`;

    const reactionsQuery = query(
      collection(db, 'reactions'),
      where('verseRef', '>=', startRef),
      where('verseRef', '<=', endRef)
    );

    const querySnapshot = await getDocs(reactionsQuery);

    querySnapshot.forEach((doc) => {
      const data = doc.data();
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

// ========================================
// BOOKMARK COUNTING FUNCTIONS
// ========================================

async function getBookmarkCountsForBook(bookName) {
  const counts = {};

  try {
    const startRef = `${bookName} `;
    const endRef = `${bookName}~`;

    const bookmarksQuery = query(
      collection(db, 'bookmarkCounts'),
      where('verseRef', '>=', startRef),
      where('verseRef', '<=', endRef)
    );

    const querySnapshot = await getDocs(bookmarksQuery);

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const verseRef = data.verseRef;

      const value = typeof data.count === 'number' ? data.count : 0;
      counts[verseRef] = Math.max(0, value);
    });

    return counts;
  } catch (error) {
    console.error('Error getting bookmark counts for book:', error);
    return counts;
  }
}

// Get users who have interacted with a specific verse (for hover tooltips)
async function getVerseInteractors(verseRef, interactionType) {
  // interactionType: 'emphasize', 'heart', or 'bookmark'
  const MAX_USERS = 20; // Limit to prevent overwhelming tooltips

  try {
    const isIndexError = (error) => {
      if (!error) return false;
      if (error.code === 'failed-precondition') return true;
      const message = typeof error.message === 'string' ? error.message.toLowerCase() : '';
      return message.includes('index');
    };

    const buildQuery = (collectionName, constraints, includeOrderBy) => {
      const queryConstraints = [...constraints];
      if (includeOrderBy) {
        queryConstraints.push(orderBy('timestamp', 'desc'));
      }
      queryConstraints.push(limit(MAX_USERS));
      return query(collection(db, collectionName), ...queryConstraints);
    };

    const collectionName = interactionType === 'bookmark' ? 'bookmarks' : 'reactions';
    const baseConstraints = interactionType === 'bookmark'
      ? [where('verseRef', '==', verseRef)]
      : [
          where('verseRef', '==', verseRef),
          where('reactionType', '==', interactionType)
        ];

    let snapshot;
    try {
      snapshot = await getDocs(buildQuery(collectionName, baseConstraints, true));
    } catch (error) {
      if (isIndexError(error)) {
        snapshot = await getDocs(buildQuery(collectionName, baseConstraints, false));
      } else {
        throw error;
      }
    }

    // Fetch user info for each userId
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
    const filteredResults = userResults.filter(r => r.user !== null);

    return filteredResults;

  } catch (error) {
    console.error(`Error fetching ${interactionType} users for ${verseRef}:`, error);
    return [];
  }
}

async function getBookmarkCountsForVerses(verseRefs) {
  const counts = {};

  if (!Array.isArray(verseRefs) || verseRefs.length === 0) {
    return counts;
  }

  try {
    const maxBatchSize = 10; // Firestore 'in' clause limit

    for (let i = 0; i < verseRefs.length; i += maxBatchSize) {
      const batch = verseRefs.slice(i, i + maxBatchSize);
      const bookmarksQuery = query(
        collection(db, 'bookmarkCounts'),
        where('verseRef', 'in', batch)
      );

      const querySnapshot = await getDocs(bookmarksQuery);

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const verseRef = data.verseRef;
        const value = typeof data.count === 'number' ? data.count : 0;
        counts[verseRef] = Math.max(0, value);
      });
    }

    return counts;
  } catch (error) {
    console.error('Error getting bookmark counts for verses:', error);
    return counts;
  }
}

// ========================================
// BOOKMARKING FUNCTIONS
// ========================================

// Add a bookmark for a verse
async function addBookmark(verseRef, userId, options = {}) {
  if (!userId) {
    throw new Error('User not authenticated');
  }

  if (!verseRef || verseRef.trim().length === 0) {
    throw new Error('Verse reference is required');
  }

  try {
    const bookmarkKey = `${userId}__${encodeURIComponent(verseRef)}`;
    const bookmarkDocRef = doc(db, 'bookmarks', bookmarkKey);

    const bookmarkData = {
      verseRef: verseRef,
      userId: userId,
      timestamp: serverTimestamp()
    };

    if (options.verseText && typeof options.verseText === 'string') {
      bookmarkData.verseText = options.verseText.trim();
    }

    await setDoc(bookmarkDocRef, bookmarkData);

    const statsDocRef = doc(db, 'bookmarkCounts', encodeURIComponent(verseRef));
    await setDoc(
      statsDocRef,
      {
        verseRef: verseRef,
        count: increment(1),
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
    return { action: 'added', verseRef, id: bookmarkKey };
  } catch (error) {
    console.error('Error adding bookmark:', error);
    throw error;
  }
}

// Remove a bookmark
async function removeBookmark(verseRef, userId) {
  if (!userId) {
    throw new Error('User not authenticated');
  }

  try {
    const bookmarkKey = `${userId}__${encodeURIComponent(verseRef)}`;
    const bookmarkDocRef = doc(db, 'bookmarks', bookmarkKey);
    await deleteDoc(bookmarkDocRef);

    const statsDocRef = doc(db, 'bookmarkCounts', encodeURIComponent(verseRef));
    const statsSnapshot = await getDoc(statsDocRef);
    if (statsSnapshot.exists()) {
      await setDoc(
        statsDocRef,
        {
          verseRef: verseRef,
          count: increment(-1),
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
    }
    return { action: 'removed', verseRef };
  } catch (error) {
    console.error('Error removing bookmark:', error);
    throw error;
  }
}

// Check if a verse is bookmarked by user
async function isVerseBookmarked(verseRef, userId) {
  if (!userId) {
    return false;
  }

  try {
    const bookmarkKey = `${userId}__${encodeURIComponent(verseRef)}`;
    const bookmarkDocRef = doc(db, 'bookmarks', bookmarkKey);
    const docSnap = await getDoc(bookmarkDocRef);
    return docSnap.exists();
  } catch (error) {
    console.error('Error checking bookmark:', error);
    return false;
  }
}

// Get all bookmarks for a user
async function getUserBookmarks(userId) {
  if (!userId) {
    return [];
  }

  try {
    const bookmarksQuery = query(
      collection(db, 'bookmarks'),
      where('userId', '==', userId)
    );

    const querySnapshot = await getDocs(bookmarksQuery);
    const bookmarks = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      bookmarks.push({
        id: doc.id,
        verseRef: data.verseRef,
        userId: data.userId,
        timestamp: data.timestamp,
        verseText: data.verseText || null
      });
    });

    // Sort by timestamp (newest first)
    bookmarks.sort((a, b) => {
      if (!a.timestamp) return 1;
      if (!b.timestamp) return -1;
      return b.timestamp.toMillis() - a.timestamp.toMillis();
    });

    return bookmarks;
  } catch (error) {
    console.error('Error getting user bookmarks:', error);
    return [];
  }
}

// Get user bookmarks for specific verses (for UI state)
async function getUserBookmarksForVerses(userId, verseRefs) {
  const userBookmarks = {};

  if (!userId || !verseRefs || verseRefs.length === 0) {
    return userBookmarks;
  }

  try {
    const bookmarksQuery = query(
      collection(db, 'bookmarks'),
      where('userId', '==', userId),
      where('verseRef', 'in', verseRefs.slice(0, 30))
    );

    const querySnapshot = await getDocs(bookmarksQuery);

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      userBookmarks[data.verseRef] = true;
    });

    return userBookmarks;
  } catch (error) {
    console.error('Error getting user bookmarks for verses:', error);
    return userBookmarks;
  }
}

// ========================================
// DAILY QUOTE BOOKMARKING
// ========================================

async function addDailyQuoteBookmark(quote, userId, options = {}) {
  if (!userId) {
    throw new Error('User not authenticated');
  }

  if (!quote || (quote.id == null && quote.quoteId == null)) {
    throw new Error('Quote id is required');
  }

  const quoteId = String(quote.quoteId ?? quote.id);

  try {
    const bookmarkKey = `${userId}__dailyQuote__${quoteId}`;
    const bookmarkDocRef = doc(db, 'dailyQuoteBookmarks', bookmarkKey);

    const bookmarkData = {
      quoteId,
      userId,
      hebrew: quote.hebrew || '',
      translation: quote.translation || '',
      source: quote.source || '',
      reflection: quote.reflection || '',
      savedOn: options.displayDate || quote.displayDate || null,
      timestamp: serverTimestamp()
    };

    await setDoc(bookmarkDocRef, bookmarkData);
    return { action: 'added', quoteId, id: bookmarkKey };
  } catch (error) {
    console.error('Error adding daily quote bookmark:', error);
    throw error;
  }
}

async function removeDailyQuoteBookmark(quoteId, userId) {
  if (!userId) {
    throw new Error('User not authenticated');
  }

  if (quoteId == null) {
    throw new Error('Quote id is required');
  }

  try {
    const bookmarkKey = `${userId}__dailyQuote__${quoteId}`;
    const bookmarkDocRef = doc(db, 'dailyQuoteBookmarks', bookmarkKey);
    await deleteDoc(bookmarkDocRef);
    return { action: 'removed', quoteId };
  } catch (error) {
    console.error('Error removing daily quote bookmark:', error);
    throw error;
  }
}

async function isDailyQuoteBookmarked(quoteId, userId) {
  if (!userId) {
    return false;
  }

  if (quoteId == null) {
    return false;
  }

  try {
    const bookmarkKey = `${userId}__dailyQuote__${quoteId}`;
    const bookmarkDocRef = doc(db, 'dailyQuoteBookmarks', bookmarkKey);
    const docSnap = await getDoc(bookmarkDocRef);
    return docSnap.exists();
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
    const bookmarksQuery = query(
      collection(db, 'dailyQuoteBookmarks'),
      where('userId', '==', userId)
    );

    const querySnapshot = await getDocs(bookmarksQuery);
    const bookmarks = [];

    querySnapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      bookmarks.push({
        id: docSnapshot.id,
        quoteId: data.quoteId,
        userId: data.userId,
        hebrew: data.hebrew || '',
        translation: data.translation || '',
        source: data.source || '',
        reflection: data.reflection || '',
        savedOn: data.savedOn || null,
        timestamp: data.timestamp
      });
    });

    bookmarks.sort((a, b) => {
      if (!a.timestamp) return 1;
      if (!b.timestamp) return -1;
      return b.timestamp.toMillis() - a.timestamp.toMillis();
    });

    return bookmarks;
  } catch (error) {
    console.error('Error getting daily quote bookmarks:', error);
    return [];
  }
}

// Get the total bookmark count for a specific daily quote
async function getDailyQuoteBookmarkCount(quoteId) {
  try {
    const q = query(
      collection(db, 'dailyQuoteBookmarks'),
      where('quoteId', '==', String(quoteId))
    );
    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.error('Error getting daily quote bookmark count:', error);
    return 0;
  }
}

// Get users who bookmarked a specific daily quote (for hover tooltips)
async function getDailyQuoteInteractors(quoteId) {
  try {
    const q = query(
      collection(db, 'dailyQuoteBookmarks'),
      where('quoteId', '==', String(quoteId)),
      orderBy('timestamp', 'desc'),
      limit(15)
    );
    let snapshot;
    try {
      snapshot = await getDocs(q);
    } catch (indexErr) {
      // Fallback without orderBy if index doesn't exist
      const fallbackQ = query(
        collection(db, 'dailyQuoteBookmarks'),
        where('quoteId', '==', String(quoteId)),
        limit(15)
      );
      snapshot = await getDocs(fallbackQ);
    }
    const userIds = [];
    const timestamps = new Map();
    snapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      if (data.userId) {
        userIds.push(data.userId);
        timestamps.set(data.userId, data.timestamp);
      }
    });
    // Fetch user info objects (same shape as getVerseInteractors, so resolveDisplayName works)
    const results = await Promise.all(
      userIds.map(async (userId) => {
        try {
          const info = await getUserInfo(userId);
          return { user: info, timestamp: timestamps.get(userId) };
        } catch (_) {
          return { user: null, timestamp: timestamps.get(userId) };
        }
      })
    );
    return results.filter(r => r.user !== null);
  } catch (error) {
    console.error('Error getting daily quote interactors:', error);
    return [];
  }
}

// Get all daily quote bookmarks across all users, grouped by quoteId
async function getCommunityQuoteBookmarks() {
  try {
    const querySnapshot = await getDocs(collection(db, 'dailyQuoteBookmarks'));

    const quoteMap = new Map();
    const allUserIds = new Set();

    querySnapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      const quoteId = data.quoteId;
      if (!quoteId) return;

      if (data.userId) allUserIds.add(data.userId);

      if (!quoteMap.has(quoteId)) {
        quoteMap.set(quoteId, {
          quoteId,
          translation: data.translation || '',
          hebrew: data.hebrew || '',
          source: data.source || '',
          reflection: data.reflection || '',
          saverIds: [],
          count: 0
        });
      }

      const entry = quoteMap.get(quoteId);
      entry.count++;
      if (entry.saverIds.length < 5) {
        entry.saverIds.push(data.userId);
      }
    });

    // Look up display names for all unique savers
    const userNameMap = new Map();
    await Promise.all(
      Array.from(allUserIds).map(async (userId) => {
        try {
          const info = await getUserInfo(userId);
          const name = info
            ? (info.username || info.displayName || getDisplayNameFromEmail(info.email) || 'A Friend')
            : 'A Friend';
          userNameMap.set(userId, name);
        } catch (_) {
          userNameMap.set(userId, 'A Friend');
        }
      })
    );

    const results = Array.from(quoteMap.values())
      .map((entry) => ({
        ...entry,
        savers: entry.saverIds.map((uid) => userNameMap.get(uid) || 'A Friend')
      }))
      .sort((a, b) => b.count - a.count);

    return results;
  } catch (error) {
    console.error('Error getting community quote bookmarks:', error);
    return [];
  }
}

// Send password reset email
async function sendPasswordReset(email) {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return { success: false, error: error.message };
  }
}

// ========================================
// USER TRACKING FUNCTIONS (Login & Online Status)
// ========================================

function normalizeEmailsField(record = {}) {
  const raw = [];

  if (Array.isArray(record.emails)) {
    raw.push(...record.emails);
  }

  if (record.email) {
    raw.push(record.email);
  }

  const seen = new Set();
  const normalized = [];

  raw.forEach((value) => {
    if (typeof value !== 'string') {
      return;
    }
    const trimmed = value.trim().toLowerCase();
    if (!trimmed || seen.has(trimmed)) {
      return;
    }
    seen.add(trimmed);
    normalized.push(trimmed);
  });

  return normalized;
}

function resolveCanonicalEmail(email) {
  if (!email || typeof email !== 'string') {
    return null;
  }

  const normalized = email.trim().toLowerCase();
  return EMAIL_ALIAS_MAP[normalized] || normalized;
}

function mapUserDocument(data = {}, docId = null) {
  const emailSet = new Set(normalizeEmailsField(data));
  if (typeof data.email === 'string') {
    emailSet.add(data.email.trim().toLowerCase());
  }

  const emails = Array.from(emailSet).filter(Boolean);
  const canonicalUserId = data.canonicalUserId || data.userId || docId || null;
  const primaryEmail = data.email
    ? data.email.trim().toLowerCase()
    : (emails.length > 0 ? emails[0] : null);

  const orderedEmails = Array.from(
    new Set(
      [primaryEmail, ...emails].filter(Boolean).map((value) => value.trim().toLowerCase())
    )
  );

  if (primaryEmail) {
    orderedEmails.sort((a, b) => {
      if (a === primaryEmail) {
        return -1;
      }
      if (b === primaryEmail) {
        return 1;
      }
      return a.localeCompare(b);
    });
  } else {
    orderedEmails.sort();
  }

  const usernameCandidate = typeof data.username === 'string' ? data.username.trim() : '';
  const usernameResolved = usernameCandidate && !usernameCandidate.includes('@')
    ? usernameCandidate
    : (primaryEmail ? getDisplayNameFromEmail(primaryEmail) : 'Friend');

  const authIdsSet = new Set(
    Array.isArray(data.authUserIds)
      ? data.authUserIds.map((value) => (typeof value === 'string' ? value : null)).filter(Boolean)
      : []
  );
  if (docId) {
    authIdsSet.add(docId);
  }
  if (typeof data.userId === 'string') {
    authIdsSet.add(data.userId);
  }
  if (canonicalUserId) {
    authIdsSet.add(canonicalUserId);
  }

  const isAlias = Boolean(
    (data.isAlias || (canonicalUserId && docId && canonicalUserId !== docId))
    && canonicalUserId
    && docId
    && canonicalUserId !== docId
  );

  return {
    docId: docId || null,
    userId: canonicalUserId,
    canonicalUserId,
    authUserIds: Array.from(authIdsSet),
    email: primaryEmail || orderedEmails[0] || null,
    emails: orderedEmails,
    username: usernameResolved || 'Friend',
    lastLogin: data.lastLogin || null,
    isOnline: !!data.isOnline,
    lastSeen: data.lastSeen || null,
    isAlias
  };
}

async function recordUserLogin(userId, email) {
  if (!userId || !email) {
    console.error('Cannot record login: missing userId or email');
    return null;
  }

  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : null;
  const fallbackEmail = typeof email === 'string' ? email.trim() : '';
  const canonicalEmailKey = resolveCanonicalEmail(normalizedEmail || fallbackEmail);

  try {
    const userDocRef = doc(db, 'users', userId);
    const existingSnapshot = await getDoc(userDocRef);
    const candidateMap = new Map();

    const emailVariants = new Set(
      [normalizedEmail, canonicalEmailKey, fallbackEmail?.toLowerCase?.()].filter(Boolean)
    );

    const addCandidate = (docId, data, force = false) => {
      if (!docId || !data) {
        return;
      }

      const entry = candidateMap.get(docId) || {
        data: {},
        emails: new Set(),
        authIds: new Set(),
        force: false
      };

      entry.data = { ...entry.data, ...data };

      normalizeEmailsField(data).forEach((value) => {
        if (value) {
          entry.emails.add(value);
        }
      });

      if (typeof data.email === 'string') {
        entry.emails.add(data.email.trim().toLowerCase());
      }

      const authIds = Array.isArray(data.authUserIds)
        ? data.authUserIds.map((value) => (typeof value === 'string' ? value : null)).filter(Boolean)
        : [];
      authIds.forEach((id) => entry.authIds.add(id));

      entry.authIds.add(docId);
      if (typeof data.userId === 'string') {
        entry.authIds.add(data.userId);
      }

      entry.force = entry.force || force;
      candidateMap.set(docId, entry);
    };

    if (existingSnapshot.exists()) {
      addCandidate(existingSnapshot.id, existingSnapshot.data(), true);
    }

    const queryPromises = [];

    emailVariants.forEach((variant) => {
      const trimmed = variant?.trim();
      if (!trimmed) {
        return;
      }
      queryPromises.push(
        getDocs(query(collection(db, 'users'), where('emails', 'array-contains', trimmed)))
      );
      queryPromises.push(
        getDocs(query(collection(db, 'users'), where('email', '==', trimmed)))
      );
    });

    const displayNameLookup = getDisplayNameFromEmail(canonicalEmailKey || normalizedEmail || fallbackEmail);
    if (displayNameLookup && displayNameLookup !== 'Anonymous' && displayNameLookup !== 'Friend') {
      queryPromises.push(
        getDocs(query(collection(db, 'users'), where('username', '==', displayNameLookup)))
      );
    }

    const querySnapshots = await Promise.all(queryPromises);
    querySnapshots.forEach((snapshot) => {
      snapshot.forEach((docSnapshot) => {
        addCandidate(docSnapshot.id, docSnapshot.data());
      });
    });

    const candidateEntries = Array.from(candidateMap.entries()).map(([docId, entry]) => ({
      id: docId,
      data: entry.data || {},
      emails: entry.emails || new Set(),
      authIds: entry.authIds || new Set(),
      force: entry.force || false
    }));

    const relevantEntries = candidateEntries.filter((entry) => {
      if (entry.force) {
        return true;
      }
      return Array.from(emailVariants).some((emailValue) => entry.emails.has(emailValue));
    });

    const effectiveEntries = relevantEntries.length > 0 ? relevantEntries : candidateEntries;

    let canonicalEntry = effectiveEntries.find(
      (entry) => entry.data && entry.data.canonicalUserId && entry.data.canonicalUserId === entry.id
    );

    if (!canonicalEntry && canonicalEmailKey) {
      canonicalEntry = effectiveEntries.find((entry) => entry.emails.has(canonicalEmailKey));
    }

    if (!canonicalEntry) {
      canonicalEntry = effectiveEntries.find((entry) => entry.id === userId);
    }

    if (!canonicalEntry && effectiveEntries.length > 0) {
      canonicalEntry = effectiveEntries[0];
    }

    const canonicalId = canonicalEntry ? canonicalEntry.id : userId;
    const canonicalData = canonicalEntry ? canonicalEntry.data : {};

    const mergedEmailsSet = new Set();
    effectiveEntries.forEach((entry) => entry.emails.forEach((value) => mergedEmailsSet.add(value)));
    emailVariants.forEach((value) => mergedEmailsSet.add(value));

    const consolidatedEmails = Array.from(mergedEmailsSet)
      .filter(Boolean)
      .map((value) => value.trim().toLowerCase());

    const uniqueEmails = Array.from(new Set(consolidatedEmails));
    const canonicalEmail = canonicalEmailKey && uniqueEmails.includes(canonicalEmailKey)
      ? canonicalEmailKey
      : (typeof canonicalData.email === 'string'
          ? canonicalData.email.trim().toLowerCase()
          : (uniqueEmails[0] || null));

    if (canonicalEmail) {
      uniqueEmails.sort((a, b) => {
        if (a === canonicalEmail) {
          return -1;
        }
        if (b === canonicalEmail) {
          return 1;
        }
        return a.localeCompare(b);
      });
    } else {
      uniqueEmails.sort();
    }

    const authIdsSet = new Set();
    effectiveEntries.forEach((entry) => entry.authIds.forEach((id) => authIdsSet.add(id)));
    authIdsSet.add(userId);
    authIdsSet.add(canonicalId);

    let username = typeof canonicalData.username === 'string'
      ? canonicalData.username.trim()
      : '';
    const fallbackName = getDisplayNameFromEmail(canonicalEmail || normalizedEmail || fallbackEmail);

    if (!username || username.includes('@') || username.toLowerCase() === 'friend') {
      username = fallbackName;
    }

    const allDocIds = new Set(effectiveEntries.map((entry) => entry.id));
    allDocIds.add(userId);
    allDocIds.add(canonicalId);
    allDocIds.forEach((id) => {
      if (id) {
        authIdsSet.add(id);
      }
    });
    const orderedAuthUserIds = Array.from(new Set(authIdsSet)).filter(Boolean);
    if (canonicalId) {
      orderedAuthUserIds.sort((a, b) => {
        if (a === canonicalId) {
          return -1;
        }
        if (b === canonicalId) {
          return 1;
        }
        return a.localeCompare(b);
      });
    } else {
      orderedAuthUserIds.sort();
    }

    const canonicalPayload = {
      userId: canonicalId,
      canonicalUserId: canonicalId,
      authUserIds: orderedAuthUserIds,
      username,
      email: canonicalEmail || null,
      emails: uniqueEmails,
      isAlias: false,
      isOnline: true,
      lastLogin: serverTimestamp(),
      lastSeen: serverTimestamp()
    };

    await setDoc(doc(db, 'users', canonicalId), canonicalPayload, { merge: true });

    for (const docId of allDocIds) {
      if (!docId) {
        continue;
      }

      if (docId === canonicalId) {
        continue;
      }

      const aliasPayload = {
        userId: canonicalId,
        canonicalUserId: canonicalId,
        authUserIds: orderedAuthUserIds,
        username,
        email: canonicalEmail || null,
        emails: uniqueEmails,
        isAlias: true,
        aliasOf: canonicalId,
        isOnline: true,
        lastLogin: serverTimestamp(),
        lastSeen: serverTimestamp()
      };

      await setDoc(doc(db, 'users', docId), aliasPayload, { merge: true });
    }

    console.log(`User login recorded for ${email} (canonical ID: ${canonicalId})`);
    return canonicalPayload;
  } catch (error) {
    console.error('Error recording user login:', error);
    throw error;
  }
}

// Update user's online status (call this periodically while user is active)
async function updateUserPresence(userId) {
  if (!userId) {
    return null;
  }

  try {
    const userDocRef = doc(db, 'users', userId);
    const snapshot = await getDoc(userDocRef);
    const canonicalId = snapshot.exists() ? snapshot.data()?.canonicalUserId : null;

    await setDoc(
      userDocRef,
      {
        isOnline: true,
        lastSeen: serverTimestamp()
      },
      { merge: true }
    );

    if (canonicalId && canonicalId !== userId) {
      await setDoc(
        doc(db, 'users', canonicalId),
        {
          isOnline: true,
          lastSeen: serverTimestamp()
        },
        { merge: true }
      );
    }
  } catch (error) {
    console.error('Error updating user presence:', error);
  }
}

// Mark user as offline
async function markUserOffline(userId) {
  if (!userId) {
    return null;
  }

  try {
    const userDocRef = doc(db, 'users', userId);
    const snapshot = await getDoc(userDocRef);
    const canonicalId = snapshot.exists() ? snapshot.data()?.canonicalUserId : null;

    await setDoc(
      userDocRef,
      {
        isOnline: false,
        lastSeen: serverTimestamp()
      },
      { merge: true }
    );
    console.log('User marked as offline');

    if (canonicalId && canonicalId !== userId) {
      await setDoc(
        doc(db, 'users', canonicalId),
        {
          isOnline: false,
          lastSeen: serverTimestamp()
        },
        { merge: true }
      );
    }
  } catch (error) {
    console.error('Error marking user offline:', error);
  }
}

// Get all online users
async function getOnlineUsers() {
  try {
    const usersQuery = query(
      collection(db, 'users'),
      where('isOnline', '==', true)
    );

    const querySnapshot = await getDocs(usersQuery);
    const onlineUsers = [];

    querySnapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      const mapped = mapUserDocument(data, docSnapshot.id);
      if (mapped.isAlias && mapped.canonicalUserId && mapped.docId && mapped.canonicalUserId !== mapped.docId) {
        return;
      }
      onlineUsers.push(mapped);
    });

    return onlineUsers;
  } catch (error) {
    console.error('Error getting online users:', error);
    return [];
  }
}

// Get users with logins in the last 3 weeks, sorted by most recent first
async function getUsersWithinThreeWeeks(limitCount = 10) {
  try {
    const threeWeeksAgo = new Date();
    threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21); // 3 weeks = 21 days
    const threeWeeksAgoTimestamp = threeWeeksAgo.getTime();

    const usersQuery = query(
      collection(db, 'users'),
      orderBy('lastLogin', 'desc'),
      limit(limitCount * 2) // Fetch more to account for filtering
    );

    const querySnapshot = await getDocs(usersQuery);
    const users = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const record = mapUserDocument(data, doc.id);
      const lastLoginSource = record.lastLogin || data.lastLogin;
      const lastLoginTimestamp = lastLoginSource?.toMillis?.()
        || (lastLoginSource instanceof Date ? lastLoginSource.getTime() : null);

      if (lastLoginTimestamp && lastLoginTimestamp > threeWeeksAgoTimestamp && !record.isAlias) {
        users.push(record);
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

// Get a specific user's info (for displaying their status)
async function getUserInfo(userId) {
  if (!userId) {
    return null;
  }

  try {
    const userDocRef = doc(db, 'users', userId);
    const docSnap = await getDoc(userDocRef);

    if (docSnap.exists()) {
      return mapUserDocument(docSnap.data(), docSnap.id);
    }

    return null;
  } catch (error) {
    console.error('Error getting user info:', error);
    return null;
  }
}

// Listen for online users in real-time
let onlineUsersUnsubscribe = null;
let mitzvahReflectionsUnsubscribe = null;

function listenForOnlineUsers(callback) {
  // Stop previous listener if exists
  if (onlineUsersUnsubscribe) {
    onlineUsersUnsubscribe();
    onlineUsersUnsubscribe = null;
  }

  try {
    const usersQuery = query(
      collection(db, 'users'),
      where('isOnline', '==', true)
    );

    onlineUsersUnsubscribe = onSnapshot(usersQuery,
      (querySnapshot) => {
        const onlineUsers = [];
        querySnapshot.forEach((docSnapshot) => {
          const data = docSnapshot.data();
          const mapped = mapUserDocument(data, docSnapshot.id);
          if (mapped.isAlias && mapped.canonicalUserId && mapped.docId && mapped.canonicalUserId !== mapped.docId) {
            return;
          }
          onlineUsers.push(mapped);
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

// Stop listening for online users
function stopListeningForOnlineUsers() {
  if (onlineUsersUnsubscribe) {
    onlineUsersUnsubscribe();
    onlineUsersUnsubscribe = null;
  }
}

function listenForMitzvahReflections(challengeId, callback) {
  if (mitzvahReflectionsUnsubscribe) {
    mitzvahReflectionsUnsubscribe();
    mitzvahReflectionsUnsubscribe = null;
  }

  if (!challengeId) {
    callback([]);
    return;
  }

  try {
    const reflectionsQuery = query(
      collection(db, 'mitzvahReflections'),
      where('challengeId', '==', challengeId),
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
            challengeId: data.challengeId,
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
        callback([]);
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

async function submitMitzvahReflection(challengeId, message, userId, username, userEmail = null) {
  if (!challengeId || !message || !userId) {
    throw new Error('Missing required fields to submit reflection');
  }

  const trimmedMessage = message.trim();
  if (!trimmedMessage) {
    throw new Error('Reflection message cannot be empty');
  }

  try {
    const normalizedEmail = typeof userEmail === 'string' ? userEmail.trim().toLowerCase() : null;
    const canonicalEmail = normalizedEmail ? resolveCanonicalEmail(normalizedEmail) : null;
    const effectiveEmail = canonicalEmail || normalizedEmail || null;
    const providedUsername = typeof username === 'string' ? username.trim() : '';
    const useProvidedUsername = providedUsername
      && !providedUsername.includes('@')
      && providedUsername.toLowerCase() !== 'friend'
      ? providedUsername
      : '';
    const fallbackUsername = effectiveEmail ? getDisplayNameFromEmail(effectiveEmail) : null;
    const resolvedUsername = useProvidedUsername || fallbackUsername || 'Friend';

    const reflection = {
      challengeId,
      message: trimmedMessage,
      userId,
      username: resolvedUsername,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await addDoc(collection(db, 'mitzvahReflections'), reflection);
    return reflection;
  } catch (error) {
    console.error('Error submitting mitzvah reflection:', error);
    throw error;
  }
}

async function submitMitzvahReflectionReaction(reflectionId, reactionType, userId) {
  if (!reflectionId || !reactionType || !userId) {
    throw new Error('Missing required fields for reaction');
  }

  const reflectionRef = doc(db, 'mitzvahReflections', reflectionId);

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
        // User has already reacted, so remove the reaction
        const updatedReaction = reaction.filter((id) => id !== userId);
        reactions[reactionType] = updatedReaction;
      } else {
        // User has not reacted, so add the reaction
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

async function getMitzvahCompletionStatus(userId, challengeId) {
  if (!userId || !challengeId) {
    return { completed: false };
  }

  try {
    const statusDocRef = doc(db, 'users', userId, 'mitzvahProgress', challengeId);
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

async function setMitzvahCompletionStatus(userId, challengeId, completed) {
  if (!userId || !challengeId) {
    throw new Error('Missing required identifiers to update completion status');
  }

  try {
    const statusDocRef = doc(db, 'users', userId, 'mitzvahProgress', challengeId);
    const payload = {
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

async function updateMitzvahLeaderboard(userId, username, delta, userEmail = null) {
  if (!userId) {
    return;
  }

  const deltaNumber = Number(delta);
  if (!Number.isFinite(deltaNumber) || deltaNumber === 0) {
    return;
  }

  const normalizedUserId = typeof userId === 'string' ? userId.trim() : String(userId);
  if (!normalizedUserId) {
    return;
  }

  try {
    // Resolve canonical user to keep leaderboard unified across multiple login IDs
    let canonicalId = normalizedUserId;
    let profileData = null;
    try {
      const userDocRef = doc(db, 'users', normalizedUserId);
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        profileData = snap.data() || {};
        if (profileData.canonicalUserId && typeof profileData.canonicalUserId === 'string') {
          canonicalId = profileData.canonicalUserId;
        }
      }
    } catch (e) {
      // Non-fatal: fallback to normalizedUserId
    }

    const leaderboardRef = doc(db, 'mitzvahLeaderboard', canonicalId);
    const normalizedUsername = typeof username === 'string' ? username.trim() : '';
    const sanitizedUsername = normalizedUsername
      && !normalizedUsername.includes('@')
      && normalizedUsername.toLowerCase() !== 'friend'
      ? normalizedUsername
      : '';

    const normalizedEmail = typeof userEmail === 'string' ? userEmail.trim().toLowerCase() : '';
    const canonicalEmail = normalizedEmail ? resolveCanonicalEmail(normalizedEmail) : null;
    const emailForFallback = canonicalEmail || normalizedEmail || '';
    const fallbackUsername = emailForFallback ? getDisplayNameFromEmail(emailForFallback) : '';
    const nameFromProfile = (profileData && typeof profileData.username === 'string' && !profileData.username.includes('@'))
      ? profileData.username.trim()
      : '';
    const resolvedUsername = sanitizedUsername || nameFromProfile || fallbackUsername || 'Friend';

    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(leaderboardRef);
      const existingData = snapshot.exists() ? snapshot.data() : {};
      const currentTotal = typeof existingData.totalCompleted === 'number'
        ? existingData.totalCompleted
        : 0;
      const newTotal = Math.max(0, currentTotal + deltaNumber);

      const now = serverTimestamp();
      const payload = {
        userId: canonicalId,
        username: resolvedUsername,
        totalCompleted: newTotal,
        updatedAt: now
      };

      if (deltaNumber > 0) {
        payload.lastCompletedAt = now;
        if (!existingData.firstCompletedAt || currentTotal <= 0) {
          payload.firstCompletedAt = now;
        }
      }

      transaction.set(leaderboardRef, payload, { merge: true });
    });
  } catch (error) {
    console.error('Error updating mitzvah leaderboard:', error);
  }
}

// Recalculate a user's leaderboard total from their recorded completions.
// Ensures accuracy if any incremental updates were missed.
async function recalculateMitzvahLeaderboard(userId, username, userEmail = null) {
  if (!userId) {
    return null;
  }

  const normalizedUserId = typeof userId === 'string' ? userId.trim() : String(userId);
  if (!normalizedUserId) {
    return null;
  }

  try {
    // Resolve canonical context and list of auth IDs to aggregate progress across aliases
    let canonicalId = normalizedUserId;
    let authIds = [normalizedUserId];
    let profileData = null;
    try {
      const userDocRef = doc(db, 'users', normalizedUserId);
      const userSnap = await getDoc(userDocRef);
      if (userSnap.exists()) {
        profileData = userSnap.data() || {};
        if (profileData.canonicalUserId && typeof profileData.canonicalUserId === 'string') {
          canonicalId = profileData.canonicalUserId;
        }
        const arr = Array.isArray(profileData.authUserIds) ? profileData.authUserIds : [];
        const set = new Set([normalizedUserId, canonicalId, ...arr].filter(Boolean));
        authIds = Array.from(set);
      }
    } catch (e) {
      // Non-fatal; fallback to single ID
    }

    let total = 0;
    let firstCompletedAt = null;
    let firstMs = Number.POSITIVE_INFINITY;
    let lastCompletedAt = null;
    let lastMs = 0;

    console.log('[Leaderboard Recalc] Counting completions for user:', {
      normalizedUserId,
      canonicalId,
      authIds
    });

    for (const aid of authIds) {
      try {
        const progressColRef = collection(db, 'users', aid, 'mitzvahProgress');
        const progressSnap = await getDocs(progressColRef);
        let countForThisId = 0;
        progressSnap.forEach((docSnap) => {
          const data = docSnap.data() || {};
          if (data.completed) {
            total += 1;
            countForThisId += 1;
            const ts = data.completedAt;
            const ms = ts && typeof ts.toMillis === 'function' ? ts.toMillis() : (ts ? new Date(ts).getTime() : NaN);
            if (Number.isFinite(ms)) {
              if (ms < firstMs) {
                firstMs = ms;
                firstCompletedAt = ts;
              }
              if (ms > lastMs) {
                lastMs = ms;
                lastCompletedAt = ts;
              }
            }
          }
        });
        console.log(`[Leaderboard Recalc] Auth ID ${aid}: ${countForThisId} completions`);
      } catch (e) {
        console.warn(`[Leaderboard Recalc] Error reading progress for auth ID ${aid}:`, e);
      }
    }

    console.log('[Leaderboard Recalc] Total completions:', total);

    const normalizedUsername = typeof username === 'string' ? username.trim() : '';
    const sanitizedUsername = normalizedUsername
      && !normalizedUsername.includes('@')
      && normalizedUsername.toLowerCase() !== 'friend'
      ? normalizedUsername
      : '';

    const normalizedEmail = typeof userEmail === 'string' ? userEmail.trim().toLowerCase() : '';
    const canonicalEmail = normalizedEmail ? resolveCanonicalEmail(normalizedEmail) : null;
    const emailForFallback = canonicalEmail || normalizedEmail || '';
    const fallbackUsername = emailForFallback ? getDisplayNameFromEmail(emailForFallback) : '';
    const resolvedUsername = sanitizedUsername || fallbackUsername || 'Friend';

    const leaderboardRef = doc(db, 'mitzvahLeaderboard', canonicalId);
    const payload = {
      userId: canonicalId,
      username: resolvedUsername,
      totalCompleted: Math.max(0, Number.isFinite(total) ? total : 0),
      updatedAt: serverTimestamp()
    };
    if (firstCompletedAt) {
      payload.firstCompletedAt = firstCompletedAt;
    }
    if (lastCompletedAt) {
      payload.lastCompletedAt = lastCompletedAt;
    }

    await setDoc(leaderboardRef, payload, { merge: true });
    return payload;
  } catch (error) {
    console.error('Error recalculating mitzvah leaderboard:', error);
    return null;
  }
}

async function getMitzvahLeaderboard(limitCount = 10) {
  try {
    // Try the optimized query with orderBy first
    let snapshot;
    try {
      const leaderboardQuery = query(
        collection(db, 'mitzvahLeaderboard'),
        orderBy('totalCompleted', 'desc'),
        limit(limitCount * 2) // fetch extra to allow local de-duplication
      );
      snapshot = await getDocs(leaderboardQuery);
    } catch (indexError) {
      // If orderBy fails (likely missing index), fall back to fetching all documents
      console.warn('Leaderboard index not available, using fallback query:', indexError.message);
      const fallbackQuery = query(collection(db, 'mitzvahLeaderboard'));
      snapshot = await getDocs(fallbackQuery);
    }

    const interim = [];
    snapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      if (!data || typeof data.totalCompleted !== 'number' || data.totalCompleted <= 0) {
        return;
      }
      interim.push({
        id: docSnapshot.id,
        userId: data.userId || docSnapshot.id,
        username: data.username || getDisplayNameFromEmail(docSnapshot.id),
        totalCompleted: data.totalCompleted,
        firstCompletedAt: data.firstCompletedAt || null,
        lastCompletedAt: data.lastCompletedAt || null,
        updatedAt: data.updatedAt || null
      });
    });

    // De-duplicate by userId only (already canonicalized on write)
    const byUser = new Map();
    for (const entry of interim) {
      const key = entry.userId || entry.id;
      const existing = byUser.get(key);
      if (!existing) {
        byUser.set(key, entry);
        continue;
      }
      if ((entry.totalCompleted || 0) > (existing.totalCompleted || 0)) {
        byUser.set(key, entry);
      } else if ((entry.totalCompleted || 0) === (existing.totalCompleted || 0)) {
        const a = existing.updatedAt && existing.updatedAt.toMillis ? existing.updatedAt.toMillis() : (existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0);
        const b = entry.updatedAt && entry.updatedAt.toMillis ? entry.updatedAt.toMillis() : (entry.updatedAt ? new Date(entry.updatedAt).getTime() : 0);
        if (b > a) {
          byUser.set(key, entry);
        }
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

// Format time difference for display (e.g., "10 minutes ago")
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

export {
  auth,
  db,
  initAuth,
  getCurrentUserId,
  getCurrentUserEmail,
  signInWithEmail,
  createAccountWithEmail,
  signOutUser,
  hideLoginModal,
  sendPasswordReset,
  submitComment,
  listenForComments,
  stopListeningForComments,
  submitReaction,
  getReactionCounts,
  getUserReactions,
  getReactionCountsForBook,
  getVerseInteractors,
  getBookmarkCountsForBook,
  getBookmarkCountsForVerses,
  addBookmark,
  removeBookmark,
  isVerseBookmarked,
  getUserBookmarks,
  getUserBookmarksForVerses,
  addDailyQuoteBookmark,
  removeDailyQuoteBookmark,
  isDailyQuoteBookmarked,
  getUserDailyQuoteBookmarks,
  getCommunityQuoteBookmarks,
  getDailyQuoteBookmarkCount,
  getDailyQuoteInteractors,
  recordUserLogin,
  updateUserPresence,
  markUserOffline,
  getOnlineUsers,
  getUsersWithinThreeWeeks,
  getUserInfo,
  listenForOnlineUsers,
  stopListeningForOnlineUsers,
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
