/**
 * journal.js — Spiritual Journal for "A Letter in the Scroll"
 *
 * Private per-user journal stored in Firestore `journalEntries` collection.
 * Entries are only readable/writable by the owning user.
 */

import { initAuth, getCurrentUserId, db } from './firebase.js';
import {
    collection, addDoc, query, where,
    getDocs, deleteDoc, doc, updateDoc, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// ── Constants ────────────────────────────────────────────────────────────────
const COLLECTION = 'journalEntries';
const GOALS_COLLECTION = 'growthGoals';

// ── State ────────────────────────────────────────────────────────────────────
let allEntries = [];
let currentFilter = 'all';
let searchQuery = '';
let currentType = 'reflection';
let selectedMood = '';
let selectedTags = new Set();
let deleteTargetId = null;

// ── Inspirational Quotes ─────────────────────────────────────────────────────
const INSPIRATIONS = [
    { text: "Who is wise? One who learns from every person.", source: "Pirkei Avot 4:1" },
    { text: "It is not your responsibility to finish the work, but neither are you free to desist from it.", source: "Pirkei Avot 2:16" },
    { text: "In a place where there are no worthy people, strive to be a worthy person.", source: "Pirkei Avot 2:5" },
    { text: "The world stands on three things: Torah, service to God, and acts of loving-kindness.", source: "Pirkei Avot 1:2" },
    { text: "Do not be daunted by the enormity of the world's grief. Walk humbly now. You are not obligated to complete the work, but neither are you free to abandon it.", source: "Talmud" },
    { text: "Every person should have two pockets. In one, a note that says 'For my sake the world was created.' In the other, 'I am but dust and ashes.'", source: "Rabbi Simcha Bunim" },
    { text: "The righteous do not grow old — they grow.", source: "Rebbe Nachman of Breslov" },
    { text: "Begin with yourself, but do not end with yourself. Start with yourself, but do not aim at yourself.", source: "Rabbi Hillel" },
    { text: "A little light dispels a lot of darkness.", source: "Rabbi Schneur Zalman of Liadi" },
    { text: "When you feel far from God, know that it is you who has moved, not God.", source: "Baal Shem Tov" },
    { text: "Do not look at the container but at what is in it.", source: "Pirkei Avot 4:20" },
    { text: "The Torah was given to make people holy, not to make people perfect.", source: "Rabbi Jonathan Sacks" },
    { text: "If I am not for myself, who will be for me? But if I am only for myself, what am I?", source: "Hillel, Pirkei Avot 1:14" },
    { text: "Every day, let a person consider themselves as if they were reborn.", source: "Talmud, Sanhedrin 37a" },
    { text: "Make your Torah study a fixed practice.", source: "Pirkei Avot 1:15" },
    { text: "Pray as if everything depended on God. Act as if everything depended on you.", source: "Jewish Proverb" },
    { text: "Whoever saves a single life, it is as if they saved an entire world.", source: "Mishnah Sanhedrin 4:5" },
    { text: "Before you speak, ask yourself: Is it kind? Is it necessary? Is it true?", source: "Jewish Wisdom" },
    { text: "God is closest to those with broken hearts.", source: "Psalms 34:19" },
    { text: "Teshuvah — return — can be done at any moment. It only takes a moment to change.", source: "Rambam, Hilchot Teshuvah" }
];

// ── Growth Suggestions ───────────────────────────────────────────────────────
const SUGGESTIONS = [
    { category: "torah",    text: "Study a verse of Torah and reflect on how it applies to your life today" },
    { category: "kindness", text: "Reach out to someone you haven't spoken to in a while with a kind word" },
    { category: "prayer",   text: "Spend 5 minutes in quiet meditation or prayer before starting your day" },
    { category: "kindness", text: "Perform an anonymous act of chesed (kindness) for a stranger" },
    { category: "gratitude",text: "Write down three things you are grateful for right now" },
    { category: "growth",   text: "Reflect on a middah (character trait) you'd like to strengthen this week" },
    { category: "prayer",   text: "Take a moment to forgive someone — even silently in your heart" },
    { category: "growth",   text: "Set an intention for tomorrow: one small thing you can do to be better" },
    { category: "shabbat",  text: "Light Shabbat candles this week with extra kavanah (intention)" },
    { category: "kindness", text: "Give tzedakah today, even a small amount, with a joyful heart" },
    { category: "speech",   text: "Commit to guarding your speech today — avoid lashon hara" },
    { category: "prayer",   text: "Listen to or sing a niggun (melody) and let it lift your spirits" },
    { category: "torah",    text: "Learn a halacha (Jewish law) today and apply it in a practical situation" },
    { category: "kindness", text: "Visit or call someone who is lonely, sick, or in need of support (bikur cholim)" },
    { category: "gratitude",text: "Say the Modeh Ani prayer mindfully when you wake up, feeling true gratitude" },
    { category: "growth",   text: "Identify one negative habit and commit to replacing it with something positive this week" },
    { category: "prayer",   text: "Daven (pray) slowly today — focus on each word of a single blessing" },
    { category: "torah",    text: "Read a chapter of Tehillim (Psalms) aloud and sit quietly afterward" },
    { category: "kindness", text: "Leave a generous tip or express sincere thanks to someone who serves you" },
    { category: "shabbat",  text: "Prepare for Shabbat in advance — cook a dish, buy flowers, dress nicely" },
    { category: "growth",   text: "Spend 10 minutes in hitbonenut — deep contemplation on a divine concept" },
    { category: "speech",   text: "Before speaking, pause and ask: Is it true, kind, and necessary?" },
    { category: "torah",    text: "Review the weekly parasha and find one lesson that speaks to your current situation" },
    { category: "kindness", text: "Smile genuinely at every person you pass today — it is a form of giving" },
    { category: "gratitude",text: "Write a thank-you note to someone who has positively influenced your life" },
    { category: "prayer",   text: "Say the Shema at night with full intention, feeling protected and loved" },
    { category: "growth",   text: "Study mussar — pick one teaching from Orchot Tzaddikim and apply it today" },
    { category: "torah",    text: "Memorize a pasuk (verse) and carry it in your heart throughout the day" },
    { category: "kindness", text: "Help someone without being asked — notice a need and quietly fill it" },
    { category: "shabbat",  text: "Make Havdalah with your family and feel the transition back into the week" },
    { category: "gratitude",text: "Recite all 100 brachos (blessings) today with true awareness and joy" },
    { category: "speech",   text: "Study two halachos of shmirat halashon (guarding your speech) today" },
    { category: "growth",   text: "Write about a challenge you faced and how you grew from it spiritually" },
    { category: "prayer",   text: "Go to a quiet place and speak to Hashem in your own words — hitbodedut" },
    { category: "kindness", text: "Donate to a cause that helps those in need in Israel or your community" },
    { category: "torah",    text: "Study the daily Rambam chapter and write down one insight" },
    { category: "gratitude",text: "Reflect on how far you have come spiritually in the past year" },
    { category: "growth",   text: "Identify your strongest middah and think about how to use it in service of others" },
    { category: "kindness", text: "Invite someone to your Shabbat table who might otherwise be alone" },
];

// ── For You Recommendations ──────────────────────────────────────────────────
const FOR_YOU = [
    "Begin a daily learning seder — even 10 minutes of consistent Torah study transforms the soul",
    "Try hitbodedut: speak to Hashem freely in your own words for five minutes each morning",
    "Keep a gratitude list in this journal — writing what you're thankful for shifts your perspective",
    "Strengthen one specific middah this month — choose humility, patience, or generosity and focus on it daily",
    "Commit to giving tzedakah before each prayer — it opens the heart and purifies intention",
    "Study one teaching from Pirkei Avot each week and let it guide how you act toward others",
    "Write down your personal mission statement — what kind of person do you want to become?",
    "Choose a Jewish book to read this month — Tanya, Mesillat Yesharim, or Alei Shur",
    "Practice responding to frustration with silence before speaking — just three seconds of pause",
    "Visit the mikveh before Shabbat and feel the spiritual renewal that comes with it",
    "Create a personal tefillah (prayer) for something you deeply want to improve in yourself",
    "Study one halacha each morning from the Kitzur Shulchan Aruch — knowledge brings confidence"
];

// ── Milestones ───────────────────────────────────────────────────────────────

// ── Placeholders per type ────────────────────────────────────────────────────
const PLACEHOLDERS = {
    reflection: "What's on your heart today? Reflect on a moment, a mitzvah, or something you're grateful for...",
    mitzvah: "Which mitzvah did you do today? How did it make you feel?",
    gratitude: "What are you thankful for right now? Think of the big and small blessings...",
    prayer: "What did you pray for today? Did you feel a connection during prayer?",
    kindness: "Describe an act of kindness you did or witnessed today..."
};

// ── Init ─────────────────────────────────────────────────────────────────────
initAuth(async (user) => {
    if (!user) {
        window.location.href = '/?redirect=' + encodeURIComponent(window.location.pathname);
        return;
    }
    document.getElementById('loading-state').style.display = 'none';
    document.getElementById('main-content').classList.remove('hidden');
    const heroEl = document.getElementById('journal-hero-section');
    if (heroEl) heroEl.style.display = '';
    renderInspiration();
    renderForYou();
    renderSuggestions();
    renderGoals();
    setupListeners();
    try { await loadEntries(); } catch (e) { console.error('Journal load error:', e); }
    try { await loadGoals(); } catch (e) { console.error('Goals load error:', e); }
});

// ── Firestore: Load entries ──────────────────────────────────────────────────
async function loadEntries() {
    const uid = getCurrentUserId();
    if (!uid) return;

    const q = query(
        collection(db, COLLECTION),
        where('userId', '==', uid)
    );

    const snap = await getDocs(q);
    allEntries = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
            const ta = a.createdAt ? a.createdAt.toMillis() : 0;
            const tb = b.createdAt ? b.createdAt.toMillis() : 0;
            return tb - ta;
        });

    renderTimeline();
    updateStats();
    document.getElementById('load-more-container').style.display = 'none';
}

// ── Firestore: Save entry ────────────────────────────────────────────────────
async function saveEntry() {
    const uid = getCurrentUserId();
    if (!uid) return;

    const text = document.getElementById('entry-text').value.trim();
    if (!text) return;

    const title = document.getElementById('entry-title').value.trim();
    const btn = document.getElementById('save-entry-btn');
    const status = document.getElementById('save-status');

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Saving...';

    try {
        await addDoc(collection(db, COLLECTION), {
            userId: uid,
            type: currentType,
            title: title || null,
            text: text,
            mood: selectedMood || null,
            tags: [...selectedTags],
            createdAt: serverTimestamp()
        });

        // Reset form
        document.getElementById('entry-text').value = '';
        document.getElementById('entry-title').value = '';
        selectedMood = '';
        selectedTags.clear();
        document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
        document.querySelectorAll('.tag-pill').forEach(b => b.classList.remove('selected'));

        status.textContent = 'Saved!';
        status.style.color = 'var(--accent-mint)';
        setTimeout(() => { status.textContent = ''; }, 2500);

        // Reload
        lastDoc = null;
        await loadEntries();
    } catch (err) {
        console.error('Save error:', err);
        status.textContent = 'Error saving. Please try again.';
        status.style.color = 'var(--danger)';
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Save Entry';
    }
}

// ── Firestore: Delete entry ──────────────────────────────────────────────────
async function deleteEntry(entryId) {
    try {
        await deleteDoc(doc(db, COLLECTION, entryId));
        allEntries = allEntries.filter(e => e.id !== entryId);
        renderTimeline();
        updateStats();
    } catch (err) {
        console.error('Delete error:', err);
    }
}

// ── Render: Timeline ─────────────────────────────────────────────────────────
function renderTimeline() {
    const container = document.getElementById('timeline');
    const emptyState = document.getElementById('empty-state');

    let filtered = allEntries;

    // Filter by type
    if (currentFilter !== 'all') {
        filtered = filtered.filter(e => e.type === currentFilter);
    }

    // Filter by search
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(e =>
            (e.text && e.text.toLowerCase().includes(q)) ||
            (e.title && e.title.toLowerCase().includes(q)) ||
            (e.tags && e.tags.some(t => t.toLowerCase().includes(q)))
        );
    }

    if (filtered.length === 0) {
        container.innerHTML = '';
        emptyState.style.display = '';
        if (allEntries.length > 0 && (currentFilter !== 'all' || searchQuery)) {
            emptyState.querySelector('.empty-title').textContent = 'No matching entries';
            emptyState.querySelector('.empty-desc').textContent = 'Try adjusting your filters or search.';
            emptyState.querySelector('.empty-icon').innerHTML = '&#x1f50d;';
        } else {
            emptyState.querySelector('.empty-title').textContent = 'Begin Your Journey';
            emptyState.querySelector('.empty-desc').textContent = 'Every great journey starts with a single step. Write your first entry and watch your spiritual growth unfold over time.';
            emptyState.querySelector('.empty-icon').innerHTML = '&#x1f4d6;';
        }
        return;
    }

    emptyState.style.display = 'none';

    let html = '';
    let lastMonth = '';

    filtered.forEach((entry, i) => {
        const date = entry.createdAt ? entry.createdAt.toDate() : new Date();
        const monthKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });

        if (monthKey !== lastMonth) {
            lastMonth = monthKey;
            html += `
                <div class="month-divider">
                    <span class="month-divider-label">${monthKey}</span>
                    <div class="month-divider-line"></div>
                </div>`;
        }

        const typeClass = 'type-' + (entry.type || 'reflection');
        const badgeClass = 'badge-' + (entry.type || 'reflection');
        const typeName = (entry.type || 'reflection').charAt(0).toUpperCase() + (entry.type || 'reflection').slice(1);
        const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        const moodHtml = entry.mood ? `<span class="entry-mood" title="${entry.mood}">${getMoodEmoji(entry.mood)}</span>` : '';

        const tagsHtml = (entry.tags || []).map(t =>
            `<span class="entry-tag">${t}</span>`
        ).join('');

        // Sanitize text for safe display
        const safeText = escapeHtml(entry.text || '').replace(/\n/g, '<br>');
        const safeTitle = entry.title ? escapeHtml(entry.title) : '';

        html += `
            <div class="timeline-entry ${typeClass}" data-id="${entry.id}" style="animation-delay:${Math.min(i * 0.04, 0.4)}s">
                <div class="timeline-dot"></div>
                <div class="entry-card">
                    <div class="flex items-center justify-between gap-2">
                        <div class="flex items-center gap-2 flex-wrap">
                            <span class="entry-date">${dateStr} &middot; ${timeStr}</span>
                            <span class="entry-type-badge ${badgeClass}">${typeName}</span>
                            ${moodHtml}
                        </div>
                        <div class="entry-actions">
                            <button class="entry-action-btn delete-btn" data-id="${entry.id}" title="Delete entry">
                                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                            </button>
                        </div>
                    </div>
                    ${safeTitle ? `<h3 style="font-family:'Fraunces',serif;font-size:1rem;font-weight:600;color:var(--ink-950);margin-top:0.4rem;">${safeTitle}</h3>` : ''}
                    <div class="entry-text">${safeText}</div>
                    ${tagsHtml ? `<div class="entry-tags">${tagsHtml}</div>` : ''}
                </div>
            </div>`;
    });

    container.innerHTML = html;
}

// ── Render: Stats ────────────────────────────────────────────────────────────
function updateStats() {
    document.getElementById('stat-entries').textContent = allEntries.length;

    const mitzvotCount = allEntries.filter(e => e.type === 'mitzvah' || (e.tags && e.tags.includes('mitzvah'))).length;
    document.getElementById('stat-mitzvot').textContent = mitzvotCount;

    // Calculate streak
    const streak = calculateStreak();
    document.getElementById('stat-streak').textContent = streak;

    const streakBadge = document.getElementById('streak-badge');
    if (streak >= 2) {
        streakBadge.style.display = '';
        document.getElementById('streak-text').textContent = streak + ' day streak!';
    } else {
        streakBadge.style.display = 'none';
    }
}

function calculateStreak() {
    if (allEntries.length === 0) return 0;

    const dates = allEntries
        .filter(e => e.createdAt)
        .map(e => {
            const d = e.createdAt.toDate();
            return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
        });

    const unique = [...new Set(dates)].sort((a, b) => b - a);
    if (unique.length === 0) return 0;

    const today = new Date();
    const todayMs = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const DAY = 86400000;

    // Streak must start today or yesterday
    if (unique[0] < todayMs - DAY) return 0;

    let streak = 1;
    for (let i = 1; i < unique.length; i++) {
        if (unique[i - 1] - unique[i] === DAY) {
            streak++;
        } else {
            break;
        }
    }
    return streak;
}

// ── Render: Inspiration ──────────────────────────────────────────────────────
function renderInspiration() {
    const idx = Math.floor(Math.random() * INSPIRATIONS.length);
    const q = INSPIRATIONS[idx];
    document.getElementById('inspiration-text').textContent = q.text;
    document.getElementById('inspiration-source').textContent = '— ' + q.source;
}

// ── Render: For You ──────────────────────────────────────────────────────────
function renderForYou() {
    const grid = document.getElementById('for-you-grid');
    // Pick 3 random items from FOR_YOU
    const picks = [...FOR_YOU].sort(() => Math.random() - 0.5).slice(0, 3);
    const starSvg = `<svg width="11" height="11" fill="currentColor" viewBox="0 0 24 24" style="color:var(--accent-warm)"><path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>`;
    const plusSvg = `<svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.8" d="M12 4v16m8-8H4"/></svg>`;
    grid.innerHTML = picks.map(text => `
        <div class="for-you-item">
            <div class="for-you-star">${starSvg}</div>
            <span class="for-you-text">${escapeHtml(text)}</span>
            <button class="add-goal-btn" data-text="${text.replace(/"/g,'&quot;')}" title="Save to Growth Goals">${plusSvg} Save</button>
        </div>
    `).join('');
}

// ── Render: Suggestions ──────────────────────────────────────────────────────
const CATEGORY_COLORS = {
    torah:    'rgba(94,138,110,0.12)',
    kindness: 'rgba(196,146,154,0.12)',
    prayer:   'rgba(155,142,196,0.12)',
    gratitude:'rgba(196,162,101,0.12)',
    growth:   'rgba(106,159,168,0.12)',
    shabbat:  'rgba(196,162,101,0.1)',
    speech:   'rgba(74,98,116,0.1)',
};
const CATEGORY_SVGS = {
    torah:    `<svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="color:var(--accent-sage-deep)"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>`,
    kindness: `<svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="color:var(--accent-rose)"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>`,
    prayer:   `<svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="color:var(--accent-lavender)"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/></svg>`,
    gratitude:`<svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="color:var(--accent-warm)"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg>`,
    growth:   `<svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="color:var(--accent-teal)"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>`,
    shabbat:  `<svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="color:var(--accent-warm)"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>`,
    speech:   `<svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="color:var(--ink-600)"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>`,
};

function renderSuggestions() {
    const grid = document.getElementById('suggestions-grid');
    const shuffled = [...SUGGESTIONS].sort(() => Math.random() - 0.5).slice(0, 5);
    grid.innerHTML = shuffled.map(s => {
        const bg = CATEGORY_COLORS[s.category] || 'rgba(100,100,100,0.08)';
        const svg = CATEGORY_SVGS[s.category] || '';
        const plusSvg = `<svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.8" d="M12 4v16m8-8H4"/></svg>`;
        return `
        <div class="suggestion-item">
            <div class="suggestion-icon" style="background:${bg}">${svg}</div>
            <span class="suggestion-text">${escapeHtml(s.text)}</span>
            <button class="add-goal-btn" data-text="${s.text.replace(/"/g,'&quot;')}" title="Save to Growth Goals">${plusSvg} Save</button>
        </div>`;
    }).join('');
}


// ── Growth Goals ─────────────────────────────────────────────────────────────
let allGoals = [];

async function loadGoals() {
    const uid = getCurrentUserId();
    if (!uid) return;
    const q = query(collection(db, GOALS_COLLECTION), where('userId', '==', uid));
    const snap = await getDocs(q);
    allGoals = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
            // incomplete first, then by createdAt desc
            if (a.done !== b.done) return a.done ? 1 : -1;
            const ta = a.createdAt ? a.createdAt.toMillis() : 0;
            const tb = b.createdAt ? b.createdAt.toMillis() : 0;
            return tb - ta;
        });
    renderGoals();
    updateGoalsStat();
}

async function saveGoal(text) {
    const uid = getCurrentUserId();
    if (!uid || !text.trim()) return;
    if (allGoals.some(g => g.text.trim() === text.trim())) return;
    const docRef = await addDoc(collection(db, GOALS_COLLECTION), {
        userId: uid,
        text: text.trim(),
        done: false,
        createdAt: serverTimestamp()
    });
    allGoals.unshift({ id: docRef.id, userId: uid, text: text.trim(), done: false, createdAt: null });
    renderGoals();
    updateGoalsStat();
}

async function toggleGoal(goalId) {
    const goal = allGoals.find(g => g.id === goalId);
    if (!goal) return;
    const newDone = !goal.done;
    goal.done = newDone;
    renderGoals();
    updateGoalsStat();
    try {
        await updateDoc(doc(db, GOALS_COLLECTION, goalId), { done: newDone });
    } catch (err) {
        console.error('Toggle goal error:', err);
        goal.done = !newDone;
        renderGoals();
        updateGoalsStat();
    }
}

async function deleteGoal(goalId) {
    allGoals = allGoals.filter(g => g.id !== goalId);
    renderGoals();
    updateGoalsStat();
    try {
        await deleteDoc(doc(db, GOALS_COLLECTION, goalId));
    } catch (err) {
        console.error('Delete goal error:', err);
    }
}

function renderGoals() {
    const list = document.getElementById('goals-list');
    const empty = document.getElementById('goals-empty');
    const progress = document.getElementById('goals-progress');
    const progressFill = document.getElementById('goals-progress-fill');
    const progressLabel = document.getElementById('goals-progress-label');

    if (allGoals.length === 0) {
        list.innerHTML = '';
        empty.style.display = '';
        progress.style.display = 'none';
        return;
    }

    empty.style.display = 'none';
    progress.style.display = '';

    const done = allGoals.filter(g => g.done).length;
    const pct = Math.round((done / allGoals.length) * 100);
    progressFill.style.width = pct + '%';
    progressLabel.textContent = done + ' / ' + allGoals.length + ' done';

    const checkSvg = `<svg width="10" height="10" fill="none" stroke="white" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>`;
    list.innerHTML = allGoals.map(g => `
        <div class="goal-item${g.done ? ' done' : ''}" data-id="${g.id}">
            <div class="goal-checkbox toggle-goal" data-id="${g.id}">${checkSvg}</div>
            <span class="goal-text">${escapeHtml(g.text)}</span>
            <button class="goal-delete-btn delete-goal" data-id="${g.id}" title="Remove">
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
        </div>
    `).join('');
}

function updateGoalsStat() {
    const done = allGoals.filter(g => g.done).length;
    const el = document.getElementById('stat-goals');
    if (el) el.textContent = done;
}

// ── Event Listeners ──────────────────────────────────────────────────────────
function setupListeners() {
    // Save entry
    document.getElementById('save-entry-btn').addEventListener('click', saveEntry);

    // Entry type tabs
    document.getElementById('composer-tabs').addEventListener('click', (e) => {
        const tab = e.target.closest('.composer-tab');
        if (!tab) return;
        document.querySelectorAll('.composer-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentType = tab.dataset.type;
        document.getElementById('entry-text').placeholder = PLACEHOLDERS[currentType] || PLACEHOLDERS.reflection;
    });

    // Mood selector
    document.getElementById('mood-selector').addEventListener('click', (e) => {
        const btn = e.target.closest('.mood-btn');
        if (!btn) return;
        const mood = btn.dataset.mood;
        if (selectedMood === mood) {
            selectedMood = '';
            btn.classList.remove('selected');
        } else {
            selectedMood = mood;
            document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
        }
    });

    // Tag selector
    document.getElementById('tag-selector').addEventListener('click', (e) => {
        const pill = e.target.closest('.tag-pill');
        if (!pill) return;
        const tag = pill.dataset.tag;
        if (selectedTags.has(tag)) {
            selectedTags.delete(tag);
            pill.classList.remove('selected');
        } else {
            selectedTags.add(tag);
            pill.classList.add('selected');
        }
    });

    // Filter bar
    document.getElementById('filter-bar').addEventListener('click', (e) => {
        const chip = e.target.closest('.filter-chip');
        if (!chip) return;
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        currentFilter = chip.dataset.filter;
        renderTimeline();
    });

    // Search
    let searchTimeout;
    document.getElementById('search-entries').addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            searchQuery = e.target.value.trim();
            renderTimeline();
        }, 250);
    });

    // Load more
    document.getElementById('load-more-btn').addEventListener('click', () => loadEntries(true));

    // Delete flow
    document.getElementById('timeline').addEventListener('click', (e) => {
        const delBtn = e.target.closest('.delete-btn');
        if (!delBtn) return;
        deleteTargetId = delBtn.dataset.id;
        document.getElementById('confirm-overlay').classList.add('show');
    });

    document.getElementById('confirm-cancel').addEventListener('click', () => {
        document.getElementById('confirm-overlay').classList.remove('show');
        deleteTargetId = null;
    });

    document.getElementById('confirm-delete').addEventListener('click', async () => {
        if (deleteTargetId) {
            await deleteEntry(deleteTargetId);
            deleteTargetId = null;
        }
        document.getElementById('confirm-overlay').classList.remove('show');
    });

    document.getElementById('confirm-overlay').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) {
            e.currentTarget.classList.remove('show');
            deleteTargetId = null;
        }
    });

    // Inspiration refresh — click the card itself
    document.getElementById('inspiration-card').addEventListener('click', renderInspiration);

    // Shuffle suggestions button
    document.getElementById('shuffle-suggestions-btn').addEventListener('click', () => {
        const btn = document.getElementById('shuffle-suggestions-btn');
        btn.classList.add('spinning');
        renderSuggestions();
        renderForYou();
        setTimeout(() => btn.classList.remove('spinning'), 400);
    });

    // Suggestion click → populate composer
    // Save-to-goals button on both suggestion items and for-you items
    function handleAddGoalClick(e) {
        const btn = e.target.closest('.add-goal-btn');
        if (!btn) return;
        if (btn.classList.contains('saved')) return;
        const text = btn.dataset.text;
        if (!text) return;
        btn.classList.add('saved');
        const plusSvg = `<svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.8" d="M5 13l4 4L19 7"/></svg>`;
        btn.innerHTML = plusSvg + ' Saved';
        saveGoal(text);
        setTimeout(() => {
            const resetSvg = `<svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.8" d="M12 4v16m8-8H4"/></svg>`;
            btn.classList.remove('saved');
            btn.innerHTML = resetSvg + ' Save';
        }, 2500);
    }
    document.getElementById('suggestions-grid').addEventListener('click', handleAddGoalClick);
    document.getElementById('for-you-grid').addEventListener('click', handleAddGoalClick);

    // Keyboard: Ctrl+Enter to save
    document.getElementById('entry-text').addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            saveEntry();
        }
    });

    // Goals: show/hide add input
    document.getElementById('goals-add-btn').addEventListener('click', () => {
        const row = document.getElementById('goals-input-row');
        row.style.display = '';
        document.getElementById('goals-input').focus();
        document.getElementById('goals-add-btn').style.display = 'none';
    });

    document.getElementById('goals-cancel-btn').addEventListener('click', () => {
        document.getElementById('goals-input-row').style.display = 'none';
        document.getElementById('goals-input').value = '';
        document.getElementById('goals-add-btn').style.display = '';
    });

    document.getElementById('goals-save-btn').addEventListener('click', async () => {
        const input = document.getElementById('goals-input');
        const text = input.value.trim();
        if (!text) return;
        input.value = '';
        document.getElementById('goals-input-row').style.display = 'none';
        document.getElementById('goals-add-btn').style.display = '';
        await saveGoal(text);
    });

    document.getElementById('goals-input').addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('goals-save-btn').click();
        } else if (e.key === 'Escape') {
            document.getElementById('goals-cancel-btn').click();
        }
    });

    // Goals list: toggle & delete via delegation
    document.getElementById('goals-list').addEventListener('click', async (e) => {
        const toggle = e.target.closest('.toggle-goal');
        const del = e.target.closest('.delete-goal');
        if (toggle) await toggleGoal(toggle.dataset.id);
        else if (del) await deleteGoal(del.dataset.id);
    });

}

// ── Helpers ──────────────────────────────────────────────────────────────────
function getMoodEmoji(mood) {
    // Returns a small dot indicator color for the mood — no emoji
    const colors = {
        grateful: '#7ba08a', peaceful: '#9b8ec4', inspired: '#c4a265',
        hopeful: '#7ba08a', joyful: '#c4a265', reflective: '#6a9fa8',
        determined: '#c4929a', humble: '#9b8ec4'
    };
    const color = colors[mood] || 'var(--ink-500)';
    return `<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${color};margin-bottom:1px;" title="${mood}"></span>`;
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

