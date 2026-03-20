// Standalone Weekly Mitzvah Challenge loader for the dashboard.
// Mirrors the essential logic from main.js without pulling in Torah-study state.
import { fetchCurrentParsha, getCachedCurrentParsha, loadMitzvahChallenges } from './api.js';
import {
    initAuth,
    getCurrentUserId,
    getActiveChavrutaId,
    setActiveChavrutaId,
    getUserChavrutaIds,
    getChavrutaBasicInfo,
    listenForMitzvahReflections,
    stopListeningForMitzvahReflections,
    submitMitzvahReflection,
    editMitzvahReflection,
    deleteMitzvahReflection,
    submitMitzvahReflectionReaction,
    getMitzvahCompletionStatus,
    setMitzvahCompletionStatus,
    updateMitzvahLeaderboard,
    decrementMitzvahLeaderboard,
    getMitzvahLeaderboard,
    formatTimeAgo
} from './firebase.js';

// ─── Module state ─────────────────────────────────────────────────────────────
let challengeId       = null;
let currentCompletion = false;
let currentUserId     = null;
let allChavrutas      = [];   // [{id, name}, ...]
let reflectionsUnsub  = null; // current unsubscribe fn

// ─── Utilities ───────────────────────────────────────────────────────────────

function escapeHtml(text) {
    const d = document.createElement('div');
    d.textContent = String(text || '');
    return d.innerHTML;
}

function formatText(text) {
    if (!text) return '';
    return text.split(/\n\s*\n/)
        .map(b => b.trim())
        .filter(Boolean)
        .map(block => {
            let html = escapeHtml(block);
            html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
            html = html.replace(/\*([^*]+)\*/g, '<strong>$1</strong>');
            return `<p>${html}</p>`;
        })
        .join('');
}

function buildMitzvahLabel(challenge) {
    const heb      = challenge.mitzvahHebrew;
    const translit = challenge.mitzvahTransliteration;
    const english  = challenge.mitzvahEnglish;
    const legacy   = challenge.mitzvah;
    if (heb || translit || english) {
        const hebrewLine = heb
            ? `<span class="mitzvah-label__he" dir="rtl" lang="he">${escapeHtml(heb)}</span>`
            : '';
        const subParts = [];
        if (translit) subParts.push(`<span class="mitzvah-label__translit">${escapeHtml(translit)}</span>`);
        if (english)  subParts.push(`<span class="mitzvah-label__eng">${escapeHtml(english)}</span>`);
        const subLine = subParts.length
            ? `<span class="mitzvah-label__sub">${subParts.join('<span class="mitzvah-label__divider">·</span>')}</span>`
            : '';
        return `<span class="mitzvah-label">${hebrewLine}${subLine}</span>`;
    }
    return escapeHtml(legacy || '');
}

// ─── Rendering ───────────────────────────────────────────────────────────────

function renderMessages(messages) {
    const container = document.getElementById('mitzvah-chat-messages');
    if (!container) return;
    container.innerHTML = '';
    if (!messages || messages.length === 0) {
        container.innerHTML = '<p class="mitzvah-chat-empty">Share how the mitzvah went this week.</p>';
        return;
    }
    messages.forEach(msg => {
        const wrapper = document.createElement('div');
        wrapper.classList.add('mitzvah-chat-message');
        const isOwn = msg.userId && currentUserId && msg.userId === currentUserId;
        if (isOwn) {
            wrapper.classList.add('mitzvah-chat-message--self');
        }

        const meta = document.createElement('div');
        meta.classList.add('mitzvah-chat-message__meta');

        const author = document.createElement('span');
        author.classList.add('mitzvah-chat-message__author');
        author.textContent = msg.username || 'Friend';

        const time = document.createElement('span');
        time.classList.add('mitzvah-chat-message__time');
        time.textContent = formatTimeAgo(msg.createdAt || msg.updatedAt);

        meta.appendChild(author);
        meta.appendChild(time);

        const body = document.createElement('div');
        body.classList.add('mitzvah-chat-message__body');
        body.textContent = msg.message || '';

        wrapper.appendChild(meta);
        wrapper.appendChild(body);

        // Footer row: reactions + actions
        const footerRow = document.createElement('div');
        footerRow.classList.add('mitzvah-message-footer');

        // Reaction buttons
        const reactions = msg.reactions || {};
        const reactRow = document.createElement('div');
        reactRow.classList.add('mitzvah-message-reactions');

        [['emphasize', reactions.emphasize || []], ['heart', reactions.heart || []]].forEach(([type, arr]) => {
            const btn = document.createElement('button');
            btn.className = `reaction-btn ${type}-btn`;
            if (currentUserId && arr.includes(currentUserId)) btn.classList.add('active');
            btn.setAttribute('aria-label', `${type} this reflection`);
            btn.innerHTML = `<span class="reaction-icon ${type}-icon"></span><span class="reaction-count">${arr.length || ''}</span>`;
            btn.addEventListener('click', e => {
                e.stopPropagation();
                if (currentUserId && msg.id) {
                    submitMitzvahReflectionReaction(challengeId, msg.id, type, currentUserId).catch(console.error);
                }
            });
            reactRow.appendChild(btn);
        });

        footerRow.appendChild(reactRow);

        // Edit / Delete actions for own messages
        if (isOwn && msg.id) {
            const actions = document.createElement('div');
            actions.classList.add('mitzvah-message-actions');

            const editBtn = document.createElement('button');
            editBtn.className = 'mitzvah-action-btn mitzvah-action-edit';
            editBtn.setAttribute('aria-label', 'Edit reflection');
            editBtn.textContent = 'Edit';
            editBtn.addEventListener('click', () => startEditReflection(wrapper, msg));

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'mitzvah-action-btn mitzvah-action-delete';
            deleteBtn.setAttribute('aria-label', 'Delete reflection');
            deleteBtn.textContent = 'Delete';
            deleteBtn.addEventListener('click', () => handleDeleteReflection(msg.id));

            actions.appendChild(editBtn);
            actions.appendChild(deleteBtn);
            footerRow.appendChild(actions);
        }

        wrapper.appendChild(footerRow);
        container.appendChild(wrapper);
    });
    container.scrollTop = container.scrollHeight;
}

function startEditReflection(wrapper, msg) {
    // Prevent opening multiple editors
    if (wrapper.querySelector('.mitzvah-edit-form')) return;

    const body = wrapper.querySelector('.mitzvah-chat-message__body');
    const originalText = msg.message || '';
    body.style.display = 'none';

    const form = document.createElement('div');
    form.classList.add('mitzvah-edit-form');

    const textarea = document.createElement('textarea');
    textarea.classList.add('mitzvah-edit-textarea');
    textarea.value = originalText;
    textarea.rows = 3;

    const btnRow = document.createElement('div');
    btnRow.classList.add('mitzvah-edit-actions');

    const saveBtn = document.createElement('button');
    saveBtn.className = 'mitzvah-action-btn mitzvah-action-save';
    saveBtn.textContent = 'Save';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'mitzvah-action-btn mitzvah-action-cancel';
    cancelBtn.textContent = 'Cancel';

    btnRow.appendChild(saveBtn);
    btnRow.appendChild(cancelBtn);
    form.appendChild(textarea);
    form.appendChild(btnRow);

    // Insert form after the body
    body.parentNode.insertBefore(form, body.nextSibling);
    textarea.focus();

    cancelBtn.addEventListener('click', () => {
        form.remove();
        body.style.display = '';
    });

    saveBtn.addEventListener('click', async () => {
        const newText = textarea.value.trim();
        if (!newText) return;
        if (newText === originalText) { form.remove(); body.style.display = ''; return; }
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving…';
        try {
            await editMitzvahReflection(msg.id, newText);
            // The live listener will re-render, but update locally for instant feedback
            body.textContent = newText;
            form.remove();
            body.style.display = '';
        } catch (err) {
            console.error('[mitzvah-dash] Error editing reflection:', err);
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save';
        }
    });
}

async function handleDeleteReflection(reflectionId) {
    if (!confirm('Delete this reflection?')) return;
    try {
        await deleteMitzvahReflection(reflectionId);
        // Undo completion and remove from leaderboard
        if (currentUserId && challengeId) {
            await setMitzvahCompletionStatus(challengeId, currentUserId, false);
            await decrementMitzvahLeaderboard(currentUserId);
            currentCompletion = false;
            updateChecklistUI();
            getMitzvahLeaderboard(challengeId).then(lb => renderLeaderboard(lb)).catch(() => {});
        }
    } catch (err) {
        console.error('[mitzvah-dash] Error deleting reflection:', err);
    }
}

function renderLeaderboard(leaderboard) {
    const listEl = document.getElementById('mitzvah-leaderboard-list');
    if (!listEl) return;
    if (!Array.isArray(leaderboard) || leaderboard.length === 0) {
        listEl.innerHTML = '<p class="mitzvah-leaderboard__empty">Complete mitzvah challenges to appear on the leaderboard.</p>';
        return;
    }
    listEl.innerHTML = '';
    const medals = ['🥇', '🥈', '🥉'];
    leaderboard.slice(0, 10).forEach((entry, i) => {
        const item = document.createElement('div');
        item.classList.add('mitzvah-leaderboard__item');
        if (currentUserId && (entry.userId === currentUserId || entry.canonicalUserId === currentUserId)) {
            item.classList.add('mitzvah-leaderboard__item--self');
        }
        const rank  = document.createElement('span');
        rank.classList.add('mitzvah-leaderboard__rank');
        rank.textContent = medals[i] || `${i + 1}.`;
        const name  = document.createElement('span');
        name.classList.add('mitzvah-leaderboard__name');
        name.textContent = entry.username || entry.displayName || 'Friend';
        const count = document.createElement('span');
        count.classList.add('mitzvah-leaderboard__count');
        count.textContent = `${entry.totalCompleted || entry.completedCount || entry.count || 0} ✓`;
        item.appendChild(rank);
        item.appendChild(name);
        item.appendChild(count);
        listEl.appendChild(item);
    });
}

function updateAuthUI() {
    const chatInput  = document.getElementById('mitzvah-chat-input');
    const chatSubmit = document.getElementById('mitzvah-chat-submit');
    const authMsg    = document.getElementById('mitzvah-chat-auth');
    const checkbox   = document.getElementById('mitzvah-challenge-checkbox');

    if (currentUserId) {
        if (chatInput)  { chatInput.disabled = false; chatInput.placeholder = 'How did the mitzvah go for you this week?'; }
        if (chatSubmit) chatSubmit.disabled = false;
        if (authMsg)    authMsg.textContent = '';
        if (checkbox)   { checkbox.disabled = true; checkbox.checked = currentCompletion; }
    } else {
        if (chatInput)  { chatInput.disabled = true; chatInput.placeholder = 'Sign in to share how your mitzvah went.'; }
        if (chatSubmit) chatSubmit.disabled = true;
        if (authMsg)    authMsg.textContent = 'Sign in to share your reflection.';
        if (checkbox)   { checkbox.disabled = true; checkbox.checked = false; }
    }
    updateChecklistUI();
}

function updateChecklistUI() {
    const helper = document.getElementById('mitzvah-checklist-helper');
    if (!helper) return;
    if (!currentUserId) {
        helper.textContent = 'Sign in to track your challenge progress.';
        helper.dataset.state = '';
    } else if (currentCompletion) {
        helper.textContent = 'Completed! Feel free to revisit or share how it went.';
        helper.dataset.state = 'success';
    } else {
        helper.textContent = 'Share your reflection below to mark this challenge complete.';
        helper.dataset.state = 'status';
    }
}

// ─── Chavruta Switcher ────────────────────────────────────────────────────────

function renderChavrutaSwitcher() {
    const tabsEl = document.getElementById('mitzvah-chavruta-tabs');
    if (!tabsEl) return;
    if (allChavrutas.length <= 1) {
        tabsEl.classList.add('hidden');
        return;
    }
    tabsEl.classList.remove('hidden');
    tabsEl.innerHTML = '';

    const activeId = getActiveChavrutaId();
    allChavrutas.forEach(({ id, name }) => {
        const btn = document.createElement('button');
        btn.className = 'mc-tab' + (id === activeId ? ' active' : '');
        btn.textContent = name;
        btn.dataset.id = id;
        btn.addEventListener('click', () => switchChavruta(id));
        tabsEl.appendChild(btn);
    });
}

async function switchChavruta(newId) {
    if (newId === getActiveChavrutaId()) return;
    setActiveChavrutaId(newId);

    // Update tab active states
    document.querySelectorAll('.mc-tab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.id === newId);
    });

    if (!challengeId) return;

    // Restart reflection listener for new chavruta
    if (reflectionsUnsub) { try { reflectionsUnsub(); } catch {} reflectionsUnsub = null; }
    stopListeningForMitzvahReflections(challengeId);
    reflectionsUnsub = listenForMitzvahReflections(challengeId, msgs => renderMessages(msgs));

    getMitzvahLeaderboard(challengeId).then(lb => renderLeaderboard(lb)).catch(() => {});
    if (currentUserId) {
        currentCompletion = false;
        updateAuthUI();
        getMitzvahCompletionStatus(challengeId, currentUserId)
            .then(s => { currentCompletion = Boolean(s.completed); updateAuthUI(); })
            .catch(() => {});
    }
}

async function loadAllChavrutaNames() {
    const uid = getCurrentUserId();
    if (!uid) return;
    try {
        const ids = await getUserChavrutaIds(uid);
        if (ids.length === 0) return;
        const results = await Promise.all(ids.map(id => getChavrutaBasicInfo(id)));
        allChavrutas = results.filter(Boolean);
        renderChavrutaSwitcher();
    } catch { /* no-op */ }
}

// ─── Chavruta setup ───────────────────────────────────────────────────────────

async function ensureChavrutaActive() {
    if (getActiveChavrutaId()) return true;
    const uid = getCurrentUserId();
    if (!uid) return false;
    try {
        const ids = await getUserChavrutaIds(uid);
        if (ids.length > 0) { setActiveChavrutaId(ids[0]); return true; }
    } catch { /* no-op */ }
    return false;
}

// ─── Load & render ────────────────────────────────────────────────────────────

async function loadAndRender() {
    const section = document.getElementById('mitzvah-challenge-section');
    if (!section) return;

    let parshaName = null;
    try {
        const cached = getCachedCurrentParsha();
        parshaName = (cached && cached.name) ? cached.name : await fetchCurrentParsha();
    } catch { /* no-op */ }

    let challenges = [];
    try {
        const data = await loadMitzvahChallenges();
        challenges = Array.isArray(data.challenges) ? data.challenges : [];
    } catch { /* no-op */ }

    if (!parshaName || !challenges.length) { section.classList.add('hidden'); return; }

    const challenge = challenges.find(c => c?.parsha && c.parsha.toLowerCase() === parshaName.toLowerCase());
    if (!challenge) { section.classList.add('hidden'); return; }

    challengeId = `mitzvah-${parshaName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

    const g = id => document.getElementById(id);
    if (g('mitzvah-challenge-heading'))    g('mitzvah-challenge-heading').textContent   = `Weekly Mitzvah Challenge — ${parshaName}`;
    if (g('mitzvah-challenge-mitzvah'))    g('mitzvah-challenge-mitzvah').innerHTML     = buildMitzvahLabel(challenge);
    if (g('mitzvah-challenge-explanation')) g('mitzvah-challenge-explanation').innerHTML = formatText(challenge.explanation || '');
    if (g('mitzvah-challenge-connection'))  g('mitzvah-challenge-connection').innerHTML  = formatText(challenge.connection || '');
    if (g('mitzvah-challenge-action'))     g('mitzvah-challenge-action').innerHTML      = formatText(challenge.challenge || '');

    section.classList.remove('hidden');

    // Wait for auth before any Firestore calls — the modular SDK's
    // onAuthStateChanged must fire so Firestore has an auth token.
    await authReady;

    if (!currentUserId) {
        // User is not signed in; UI is already in guest mode via updateAuthUI.
        return;
    }

    const chavrutaReady = await ensureChavrutaActive();
    if (!chavrutaReady) {
        if (g('mitzvah-chat-input')) {
            g('mitzvah-chat-input').disabled = true;
            g('mitzvah-chat-input').placeholder = 'Join or create a study group to share reflections.';
        }
        if (g('mitzvah-chat-submit')) g('mitzvah-chat-submit').disabled = true;
        return;
    }

    // Load chavruta names for the switcher
    loadAllChavrutaNames();

    // Live reflections
    if (reflectionsUnsub) { try { reflectionsUnsub(); } catch {} reflectionsUnsub = null; }
    reflectionsUnsub = listenForMitzvahReflections(challengeId, msgs => renderMessages(msgs));

    getMitzvahLeaderboard(challengeId).then(lb => renderLeaderboard(lb)).catch(() => {});

    getMitzvahCompletionStatus(challengeId, currentUserId)
        .then(s => { currentCompletion = Boolean(s.completed); updateAuthUI(); })
        .catch(() => {});

    firestoreBootDone = true;
}

// ─── Event handlers ───────────────────────────────────────────────────────────

async function handleChatSubmit() {
    if (!currentUserId || !challengeId) return;
    const chatInput  = document.getElementById('mitzvah-chat-input');
    const statusEl   = document.getElementById('mitzvah-chat-status');
    const chatSubmit = document.getElementById('mitzvah-chat-submit');
    const message    = chatInput ? chatInput.value.trim() : '';
    if (!message) return;

    if (chatInput)  chatInput.disabled  = true;
    if (chatSubmit) chatSubmit.disabled = true;
    if (statusEl)   statusEl.textContent = 'Sharing…';

    try {
        const welcomeText = document.getElementById('welcome-heading')?.textContent || '';
        const username = welcomeText.replace(/^Shalom,?\s*/i, '').replace(/!$/, '').trim();
        await submitMitzvahReflection(challengeId, message, currentUserId, username);
        // Mark as completed and update leaderboard (only if not already completed)
        if (!currentCompletion) {
            await setMitzvahCompletionStatus(challengeId, currentUserId, true);
            await updateMitzvahLeaderboard(challengeId, currentUserId, username);
        }
        if (chatInput)  { chatInput.value = ''; chatInput.disabled = false; }
        if (chatSubmit) chatSubmit.disabled = false;
        if (statusEl)   {
            statusEl.textContent = 'Shared! Kol HaKavod!';
            statusEl.classList.add('mitzvah-chat-status--success');
        }
        currentCompletion = true;
        updateChecklistUI();
        getMitzvahLeaderboard(challengeId).then(lb => renderLeaderboard(lb)).catch(() => {});
    } catch (err) {
        console.error('[mitzvah-dash] Error submitting reflection:', err);
        if (chatInput)  chatInput.disabled  = false;
        if (chatSubmit) chatSubmit.disabled = false;
        if (statusEl)   {
            statusEl.textContent = 'Could not submit. Please try again.';
            statusEl.classList.remove('mitzvah-chat-status--success');
        }
    }
}

function setupEventListeners() {
    const chatSubmit = document.getElementById('mitzvah-chat-submit');
    if (chatSubmit) chatSubmit.addEventListener('click', handleChatSubmit);

    const chatInput = document.getElementById('mitzvah-chat-input');
    if (chatInput) {
        chatInput.addEventListener('keydown', e => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); handleChatSubmit(); }
        });
    }

    const toggleHeader       = document.getElementById('mitzvah-toggle-header');
    const collapsibleContent = document.getElementById('mitzvah-collapsible-content');
    const toggleIcon         = document.getElementById('mitzvah-toggle-icon');
    if (toggleHeader && collapsibleContent && toggleIcon) {
        toggleHeader.addEventListener('click', () => {
            const expanded = collapsibleContent.style.display !== 'none';
            collapsibleContent.style.display = expanded ? 'none' : 'block';
            toggleIcon.classList.toggle('expanded', !expanded);
        });
    }

    const checkbox = document.getElementById('mitzvah-challenge-checkbox');
    if (checkbox) {
        checkbox.addEventListener('click', e => {
            e.preventDefault();
            if (!currentCompletion && currentUserId) {
                const helper = document.getElementById('mitzvah-checklist-helper');
                if (helper) { helper.textContent = 'Share your reflection below to mark this challenge complete.'; helper.dataset.state = 'status'; }
            }
        });
    }
}

// ─── Auth gate ────────────────────────────────────────────────────────────────
// Firestore rules require authentication. We must wait for onAuthStateChanged
// to fire before making any Firestore requests, otherwise the modular SDK
// sends queries without an auth token and gets permission-denied.

let authReadyResolve;
const authReady = new Promise(resolve => { authReadyResolve = resolve; });
let firestoreBootDone = false; // tracks whether loadAndRender completed Firestore setup

initAuth(async user => {
    currentUserId = user ? user.uid : null;
    authReadyResolve();
    updateAuthUI();

    // If loadAndRender already finished its Firestore setup, a re-auth
    // (e.g. sign-out then sign-in) needs to restart listeners.
    if (firestoreBootDone && user && challengeId) {
        await ensureChavrutaActive();
        if (reflectionsUnsub) { try { reflectionsUnsub(); } catch {} reflectionsUnsub = null; }
        reflectionsUnsub = listenForMitzvahReflections(challengeId, msgs => renderMessages(msgs));
        getMitzvahLeaderboard(challengeId).then(lb => renderLeaderboard(lb)).catch(() => {});
        getMitzvahCompletionStatus(challengeId, currentUserId)
            .then(s => { currentCompletion = Boolean(s.completed); updateAuthUI(); })
            .catch(() => {});
        loadAllChavrutaNames();
    }
});

// ─── Boot ─────────────────────────────────────────────────────────────────────

function bootMitzvahDash() {
    setupEventListeners();
    loadAndRender();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootMitzvahDash);
} else {
    bootMitzvahDash();
}
