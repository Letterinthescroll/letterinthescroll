/**
 * tutorial.js — First-time user walkthrough for A Letter in the Scroll.
 *
 * Desktop-only guided tour. Spans the dashboard AND study page via
 * sessionStorage hand-off so the user sees the real study room.
 *
 * Usage:
 *   Dashboard: <script src="/js/tutorial.js"></script> + call startTutorialIfNew(uid)
 *   Study:     <script src="/js/tutorial.js"></script> (auto-resumes if mid-tour)
 */
(function () {
    'use strict';

    var STORAGE_KEY = 'alits_tutorial_completed';
    var SESSION_KEY = 'alits_tutorial_state';       // cross-page hand-off
    var DESKTOP_MIN_WIDTH = 900;
    var currentStep = 0;
    var overlay = null;
    var tooltip = null;
    var spotlight = null;
    var steps = [];
    var totalStepsGlobal = 0;   // total across both pages (for dot count)
    var stepOffset = 0;         // how many dashboard steps came before this page
    var fakeGroupEl = null;

    /* ── Which page are we on? ─────────────────────────────────────────── */
    var ON_STUDY = /\/study/i.test(window.location.pathname);
    var ON_DASHBOARD = !ON_STUDY;

    /* ── SVG icons ─────────────────────────────────────────────────────── */
    var ICONS = {
        welcome: '<img src="/media/images/Icon.png" width="26" height="26" alt="A Letter in the Scroll" style="border-radius:4px;">',
        nav: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><path d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z"/></svg>',
        inspiration: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" stroke-width="1.8"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 017 7c0 2.38-1.19 4.47-3 5.74V17H8v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 017-7z"/></svg>',
        tehillim: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" stroke-width="1.8"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>',
        groups: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" stroke-width="1.8"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>',
        explore: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" stroke-width="1.8"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
        mitzvah: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" stroke-width="1.8"><path d="M12 15l-3 3 1.5 1.5L12 18l1.5 1.5L15 18l-3-3z"/><path d="M6 3v7a6 6 0 0012 0V3"/><path d="M4 3h16"/></svg>',
        study: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" stroke-width="1.8"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>',
        bookmark: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" stroke-width="1.8"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>',
        account: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>',
        done: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" stroke-width="1.8"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
    };

    /*
     * STEP COUNTS (keep in sync):
     *   Dashboard part 1: steps 0-8  (9 steps)
     *   Study page:       steps 9-10 (2 steps)
     *   Dashboard part 2: steps 11-12 (2 steps)
     *   Total: 13
     */
    var TOTAL_STEPS = 13;
    var DASHBOARD_PART1_COUNT = 9;  // steps 0-8
    var STUDY_STEP_COUNT = 2;       // steps 9-10

    /* ══════════════════════════════════════════════════════════════════════
       DASHBOARD STEPS (part 1: 0-7)
       ══════════════════════════════════════════════════════════════════════ */
    function buildDashboardStepsPart1() {
        return [
            /* 0 */ {
                type: 'modal',
                icon: ICONS.welcome,
                title: 'Welcome to A Letter in the Scroll!',
                body: 'We\'re so glad you\'re here. Let us give you a quick tour of the site so you can get the most out of your experience.',
                cta: 'Let\'s Go'
            },
            /* 1 */ {
                target: function () {
                    return document.querySelector('.header-nav') || document.querySelector('.header-actions');
                },
                icon: ICONS.nav,
                title: 'Navigation Bar',
                body: 'Use these buttons to move between the main sections of the site: <strong>Home</strong>, <strong>Study</strong>, <strong>Holidays</strong>, <strong>Prayers</strong>, <strong>Songs</strong>, and <strong>About</strong>.',
                position: 'below'
            },
            /* 2 */ {
                target: function () { return document.getElementById('daily-inspiration'); },
                icon: ICONS.inspiration,
                title: 'Daily Inspiration',
                body: 'Each day features a new teaching \u2014 a Hebrew quote with translation and reflection to start your morning with intention. You can <strong>bookmark</strong> any quote you love.',
                position: 'below'
            },
            /* 3 */ {
                target: function () { return document.getElementById('daily-tehillim-card'); },
                icon: ICONS.tehillim,
                title: 'Daily Tehillim (Psalms)',
                body: 'Follow the traditional Chabad monthly Psalm cycle. See which chapters to read today and click <strong>Begin Reading</strong> to dive in.',
                position: 'below'
            },
            /* 4 */ {
                target: function () { return document.getElementById('chavrutas-section'); },
                icon: ICONS.groups,
                title: 'Study Groups (Chavrutot)',
                body: 'Create or join a study group to learn with friends. Each group has its own <strong>private comment threads</strong> on the weekly parsha, plus shared bookmarks and reflections.',
                position: 'above',
                onEnter: injectFakeGroupCard,
                onLeave: removeFakeGroupCard
            },
            /* 5 */ {
                target: function () { return document.getElementById('explore-section'); },
                icon: ICONS.explore,
                title: 'Explore the Site',
                body: 'Quick links to every section: <strong>Weekly Parsha</strong> study, <strong>Holidays</strong> with full guides, <strong>Prayers</strong>, <strong>Songs & Poems</strong>, your <strong>Bookmarks</strong>, and <strong>Daily Psalms</strong>.',
                position: 'above'
            },
            /* 6 */ {
                target: function () { return document.querySelector('.dash-explore-card.tone-bookmarks'); },
                icon: ICONS.bookmark,
                title: 'Your Bookmarks',
                body: 'All the verses and quotes you bookmark are saved here. You can revisit them anytime from this card or from the <strong>Bookmarks</strong> page.',
                position: 'above'
            },
            /* 7 */ {
                target: function () { return document.getElementById('mitzvah-challenge-section'); },
                icon: ICONS.mitzvah,
                title: 'Weekly Mitzvah Challenge',
                body: 'Each week features a new mitzvah connected to the parsha. Complete it, share your reflection, and see how your community is doing on the <strong>leaderboard</strong>.',
                position: 'above',
                onEnter: function () {
                    var section = document.getElementById('mitzvah-challenge-section');
                    if (section) section.classList.remove('hidden');
                }
            },
            /* 8 — Navigate to study page */ {
                type: 'modal',
                icon: ICONS.study,
                title: 'The Study Room',
                body: 'Let\'s visit the Study Room \u2014 this is where the magic happens. You\'ll read the weekly Torah portion with full <strong>Hebrew text and English translation</strong>, and interact with your community.',
                cta: 'Visit Study Room',
                navigateTo: '/study'
            }
        ];
    }

    /* ══════════════════════════════════════════════════════════════════════
       STUDY PAGE STEPS (9-10)
       ══════════════════════════════════════════════════════════════════════ */
    function buildStudySteps() {
        return [
            /* 0 (global 9) */ {
                target: function () {
                    var bar = document.getElementById('community-status-bar');
                    if (!bar) return null;
                    // Also include the status content inside
                    var content = document.getElementById('community-status-content');
                    return content || bar;
                },
                icon: ICONS.groups,
                title: 'Community Bar',
                body: 'This bar shows <strong>who\'s studying right now</strong>. You\'ll see your friends\' names appear here whenever they\'re online in the study room.',
                position: 'below',
                spotlightPad: 6,
                onEnter: injectFakeCommunityBar
            },
            /* 1 (global 10) */ {
                target: function () {
                    var verse = document.querySelector('.verse-container');
                    return verse;
                },
                icon: ICONS.study,
                title: 'Verse Reactions',
                body: 'On each verse, you can tap the <strong style="color:#dc2626;">heart</strong> to love it, the <strong style="color:#d97706;">exclamation</strong> to emphasize it, or the <strong style="color:#2563eb;">bookmark</strong> to save it for later. Your study group can see these reactions too!',
                position: 'below',
                spotlightPad: 8,
                navigateTo: '/dashboard/?tutreturn=1',
                onLeave: function () {
                    // Clean up tutorial lock on community bar
                    var bar = document.getElementById('community-status-bar');
                    if (bar) delete bar.dataset.tutorialLock;
                }
            }
        ];
    }

    /* ══════════════════════════════════════════════════════════════════════
       DASHBOARD STEPS PART 2 (11-12)  — after returning from study
       ══════════════════════════════════════════════════════════════════════ */
    function buildDashboardStepsPart2() {
        return [
            /* 0 (global 11) */ {
                target: function () {
                    return document.querySelector('#header-user-dropdown-container') || document.querySelector('.header-user-pill');
                },
                icon: ICONS.account,
                title: 'Your Account',
                body: 'Click your name in the top-right to access your <strong>Settings</strong>, manage your profile, or <strong>sign out</strong>. You can also replay this tutorial from the Settings page.',
                position: 'below'
            },
            /* 1 (global 12) */ {
                type: 'modal',
                icon: ICONS.done,
                title: 'You\'re All Set!',
                body: 'That\'s the overview. Explore at your own pace \u2014 every page has something meaningful waiting for you. <em>B\'hatzlacha!</em>',
                cta: 'Start Exploring'
            }
        ];
    }

    /* ── Fake group card ───────────────────────────────────────────────── */
    function injectFakeGroupCard() {
        removeFakeGroupCard();
        var grid = document.getElementById('chavrutas-grid');
        if (!grid) return;

        fakeGroupEl = document.createElement('div');
        fakeGroupEl.id = 'tut-fake-group';
        fakeGroupEl.style.cssText = 'pointer-events:none;opacity:0;transition:opacity 0.35s ease;';
        fakeGroupEl.innerHTML =
            '<div class="chavruta-glow-host">' +
            '  <div class="cg-border" aria-hidden="true"></div>' +
            '  <div class="cg-edge" aria-hidden="true"></div>' +
            '  <div class="chavruta-card">' +
            '    <div class="px-5 pt-5 pb-4" style="background:linear-gradient(135deg,#16285e 0%,#2f56ab 100%)">' +
            '      <div class="flex items-start justify-between mb-3">' +
            '        <h3 class="font-semibold text-white text-base leading-snug pr-2">Dvar Torah Friends</h3>' +
            '        <span class="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border shrink-0 border-blue-300/40 text-blue-200 bg-blue-500/20">Member</span>' +
            '      </div>' +
            '      <div class="flex items-center gap-1">' +
            '        <div class="flex">' +
            '          <div style="width:28px;height:28px;border-radius:50%;background:#c89a35;display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:700;border:2px solid #16285e;margin-right:-6px;">S</div>' +
            '          <div style="width:28px;height:28px;border-radius:50%;background:#2f9f84;display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:700;border:2px solid #16285e;margin-right:-6px;">R</div>' +
            '          <div style="width:28px;height:28px;border-radius:50%;background:#0f7b8f;display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:700;border:2px solid #16285e;">D</div>' +
            '        </div>' +
            '        <span class="ml-2 text-blue-200/80 text-xs">3/8 members</span>' +
            '      </div>' +
            '    </div>' +
            '    <div class="px-5 py-4 space-y-2.5 chavruta-actions">' +
            '      <span class="flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-bold text-white text-sm shadow-lg" style="background:linear-gradient(135deg,#b7871e,#c89a35)">' +
            '        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>' +
            '        Enter Study Room' +
            '      </span>' +
            '      <span class="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-slate-500 border border-slate-200">' +
            '        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>' +
            '        View Members' +
            '      </span>' +
            '    </div>' +
            '  </div>' +
            '</div>';

        var empty = document.getElementById('empty-state');
        var skeletons = grid.querySelectorAll('.group-skeleton');
        if (empty) empty.dataset.tutHidden = empty.classList.contains('hidden') ? '' : '1';
        if (empty && !empty.classList.contains('hidden')) empty.classList.add('hidden');
        skeletons.forEach(function (s) { s.style.display = 'none'; });

        grid.insertBefore(fakeGroupEl, grid.firstChild);
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                if (fakeGroupEl) fakeGroupEl.style.opacity = '1';
            });
        });
    }

    function removeFakeGroupCard() {
        if (fakeGroupEl && fakeGroupEl.parentNode) {
            fakeGroupEl.parentNode.removeChild(fakeGroupEl);
        }
        fakeGroupEl = null;
        var empty = document.getElementById('empty-state');
        if (empty && empty.dataset.tutHidden === '1') {
            empty.classList.remove('hidden');
            delete empty.dataset.tutHidden;
        }
        var grid = document.getElementById('chavrutas-grid');
        if (grid) {
            grid.querySelectorAll('.group-skeleton').forEach(function (s) { s.style.display = ''; });
        }
    }

    /* ── Inject fake names into community bar on study page ────────────── */
    function injectFakeCommunityBar() {
        var bar = document.getElementById('community-status-bar');
        if (!bar) return;
        // Flag to prevent real presence system from overwriting fake data
        bar.dataset.tutorialLock = '1';
        // Make bar visible
        bar.classList.remove('hidden');
        bar.style.display = '';
        var onlineSection = document.getElementById('header-online-section');
        if (onlineSection) onlineSection.classList.remove('hidden');
        var usersList = document.getElementById('header-online-users-list');
        if (usersList) {
            var dotStyle = 'display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:4px;flex-shrink:0;';
            var nameStyle = 'font-size:12px;font-weight:500;display:inline-flex;align-items:center;';
            var timeStyle = 'font-size:10px;color:#94a3b8;margin-left:2px;';
            var sepStyle = 'color:#cbd5e1;font-size:10px;margin:0 6px;';
            usersList.innerHTML =
                '<span style="' + nameStyle + 'color:#15803d;">' +
                '  <span style="' + dotStyle + 'background:#22c55e;animation:pulse 2s infinite;"></span>' +
                '  Sarah M. <span style="' + timeStyle + '">just now</span>' +
                '</span>' +
                '<span style="' + sepStyle + '">\u00b7</span>' +
                '<span style="' + nameStyle + 'color:#15803d;">' +
                '  <span style="' + dotStyle + 'background:#22c55e;animation:pulse 2s infinite;"></span>' +
                '  David K. <span style="' + timeStyle + '">2m ago</span>' +
                '</span>' +
                '<span style="' + sepStyle + '">\u00b7</span>' +
                '<span style="' + nameStyle + 'color:#92400e;">' +
                '  <span style="' + dotStyle + 'background:#eab308;"></span>' +
                '  Rachel B. <span style="' + timeStyle + '">18m ago</span>' +
                '</span>';
            usersList.dataset.tutFake = '1';
        }
        var yourStatus = document.getElementById('header-your-status');
        if (yourStatus) yourStatus.classList.remove('hidden');
    }

    /* ── Styles ────────────────────────────────────────────────────────── */
    function injectStyles() {
        if (document.getElementById('tutorial-styles')) return;
        var style = document.createElement('style');
        style.id = 'tutorial-styles';
        style.textContent =
            '#tutorial-overlay{position:fixed;inset:0;z-index:99990;pointer-events:none;}' +
            '#tutorial-overlay.active{pointer-events:auto;}' +
            '#tutorial-backdrop{position:fixed;inset:0;z-index:99991;background:rgba(3,10,28,0.68);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);transition:opacity 0.3s ease;pointer-events:auto;}' +
            '#tutorial-spotlight{position:fixed;z-index:99992;border-radius:16px;box-shadow:0 0 0 9999px rgba(3,10,28,0.68);pointer-events:none;' +
            'transition:top 0.4s cubic-bezier(0.22,1,0.36,1),left 0.4s cubic-bezier(0.22,1,0.36,1),width 0.4s cubic-bezier(0.22,1,0.36,1),height 0.4s cubic-bezier(0.22,1,0.36,1),opacity 0.25s ease;}' +
            '#tutorial-tooltip{position:fixed;z-index:99995;width:min(420px,calc(100vw - 2rem));' +
            'background:linear-gradient(168deg,#ffffff 0%,#f4f8ff 46%,#eef5ff 100%);' +
            'border:1px solid rgba(37,99,235,0.2);border-radius:20px;' +
            'box-shadow:0 24px 72px rgba(15,23,42,0.32);padding:1.5rem 1.6rem 1.2rem;' +
            'pointer-events:auto;}' +
            '@keyframes tutPopIn{from{opacity:0;transform:translateY(10px) scale(0.97);}to{opacity:1;transform:translateY(0) scale(1);}}' +
            '.tut-icon{display:none;}' +
            '.tut-title{margin:0 0 0.4rem;font-family:Fraunces,serif;font-size:1.22rem;font-weight:700;color:#0a1f46;line-height:1.25;}' +
            '.tut-body{margin:0;font-size:0.92rem;line-height:1.6;color:#334155;}' +
            '.tut-body strong{color:#1e3a8a;font-weight:700;}' +
            '.tut-body em{color:#1d4ed8;}' +
            '.tut-footer{display:flex;align-items:center;justify-content:space-between;margin-top:1.1rem;gap:0.5rem;flex-wrap:nowrap;}' +
            '.tut-progress{display:flex;gap:4px;align-items:center;flex-shrink:1;min-width:0;flex-wrap:wrap;}' +
            '.tut-dot{width:6px;height:6px;border-radius:50%;background:rgba(37,99,235,0.18);transition:background 0.25s ease,transform 0.25s ease;flex-shrink:0;}' +
            '.tut-dot.active{background:#1d4ed8;transform:scale(1.35);}' +
            '.tut-dot.done{background:rgba(37,99,235,0.45);}' +
            '.tut-actions{display:flex;gap:0.5rem;align-items:center;flex-shrink:0;}' +
            '.tut-btn{border:none;border-radius:999px;padding:0.55rem 1.15rem;font-size:0.84rem;font-weight:700;cursor:pointer;' +
            'transition:transform 0.15s ease,box-shadow 0.15s ease,background 0.15s ease;letter-spacing:0.01em;}' +
            '.tut-btn:hover{transform:translateY(-1px);}' +
            '.tut-btn-primary{color:#fff;background:linear-gradient(180deg,#2463de 0%,#1d4ed8 46%,#1e40af 100%);' +
            'border:1px solid rgba(30,64,175,0.3);box-shadow:0 8px 20px rgba(29,78,216,0.28);}' +
            '.tut-btn-primary:hover{background:linear-gradient(180deg,#2b6ef0 0%,#1e5cf0 46%,#1d4ed8 100%);box-shadow:0 10px 28px rgba(29,78,216,0.35);}' +
            '.tut-btn-ghost{color:#64748b;background:transparent;padding:0.55rem 0.8rem;}' +
            '.tut-btn-ghost:hover{color:#334155;background:rgba(100,116,139,0.08);}' +
            '.tut-skip{position:absolute;top:0.75rem;right:0.75rem;width:28px;height:28px;border:none;border-radius:50%;' +
            'background:rgba(100,116,139,0.1);color:#94a3b8;font-size:1rem;cursor:pointer;' +
            'display:flex;align-items:center;justify-content:center;transition:background 0.15s ease,color 0.15s ease;line-height:1;}' +
            '.tut-skip:hover{background:rgba(100,116,139,0.18);color:#475569;}' +
            '.tut-step-label{font-size:0.68rem;color:#94a3b8;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;white-space:nowrap;flex-shrink:0;}' +
            '#tutorial-tooltip.tut-modal{top:50%!important;left:50%!important;transform:translate(-50%,-50%);text-align:center;animation:tutModalIn 350ms cubic-bezier(0.22,1,0.36,1)!important;}' +
            '#tutorial-tooltip.tut-modal .tut-icon{display:none;}' +
            '#tutorial-tooltip.tut-modal .tut-footer{justify-content:center;}' +
            '#tutorial-tooltip.tut-modal .tut-progress{display:none;}' +
            '@keyframes tutModalIn{from{opacity:0;transform:translate(-50%,-46%) scale(0.96);}to{opacity:1;transform:translate(-50%,-50%) scale(1);}}';
        document.head.appendChild(style);
    }

    /* ── Helpers ────────────────────────────────────────────────────────── */

    function getTargetRect(step) {
        if (step.type === 'modal') return null;
        var el = typeof step.target === 'function' ? step.target() : step.target;
        if (!el) return null;
        if (step.fallbackIfHidden && (el.classList.contains('hidden') || el.offsetParent === null)) return null;
        var r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) return null;
        return r;
    }

    function scrollToElement(rect) {
        if (!rect) return;
        var viewH = window.innerHeight;
        var pad = 120;
        var elTop = rect.top + window.scrollY;
        var elBot = rect.bottom + window.scrollY;
        var scrollTop = window.scrollY;
        if (elTop - pad < scrollTop || elBot + pad > scrollTop + viewH) {
            window.scrollTo({ top: Math.max(0, elTop - pad), behavior: 'smooth' });
        }
    }

    /* ── Cross-page state ──────────────────────────────────────────────── */
    function saveState(globalStepIndex) {
        try { sessionStorage.setItem(SESSION_KEY, JSON.stringify({ step: globalStepIndex, key: STORAGE_KEY })); } catch (_) {}
    }
    function loadState() {
        try {
            var s = JSON.parse(sessionStorage.getItem(SESSION_KEY));
            return s && typeof s.step === 'number' ? s : null;
        } catch (_) { return null; }
    }
    function clearState() {
        try { sessionStorage.removeItem(SESSION_KEY); } catch (_) {}
    }

    /* ── Overlay / rendering ───────────────────────────────────────────── */

    function createOverlay() {
        overlay = document.createElement('div');
        overlay.id = 'tutorial-overlay';
        overlay.className = 'active';
        var backdrop = document.createElement('div');
        backdrop.id = 'tutorial-backdrop';
        backdrop.addEventListener('click', function (e) { e.stopPropagation(); });
        spotlight = document.createElement('div');
        spotlight.id = 'tutorial-spotlight';
        tooltip = document.createElement('div');
        tooltip.id = 'tutorial-tooltip';
        overlay.appendChild(backdrop);
        overlay.appendChild(spotlight);
        overlay.appendChild(tooltip);
        document.body.appendChild(overlay);
    }

    function renderStep(index) {
        var step = steps[index];
        if (!step) return;
        if (step.onEnter) step.onEnter();
        var needsDelay = step.onEnter ? 250 : 0;
        setTimeout(function () { renderStepInner(index, step); }, needsDelay);
    }

    function renderStepInner(index, step) {
        var rect = getTargetRect(step);
        var isModal = step.type === 'modal' || (!rect && !step.fallbackIfHidden);

        // If target hidden and skippable, skip
        if (!rect && step.fallbackIfHidden) {
            if (step.onLeave) step.onLeave();
            if (index < steps.length - 1) { currentStep++; renderStep(currentStep); }
            return;
        }

        var backdropEl = overlay.querySelector('#tutorial-backdrop');
        if (isModal) {
            spotlight.style.display = 'none';
            backdropEl.style.display = 'block';
        } else {
            backdropEl.style.display = 'none';
            var pad = step.spotlightPad != null ? step.spotlightPad : 12;
            // Pre-position at target and hide BEFORE making visible to avoid flash
            spotlight.style.transition = 'none';
            spotlight.style.opacity = '0';
            spotlight.style.top = (rect.top - pad) + 'px';
            spotlight.style.left = (rect.left - pad) + 'px';
            spotlight.style.width = (rect.width + pad * 2) + 'px';
            spotlight.style.height = (rect.height + pad * 2) + 'px';
            spotlight.style.display = 'block';
            // Force layout so the above styles are applied before restoring transitions
            spotlight.offsetHeight;
            spotlight.style.transition = '';
            // Scroll, then re-measure and fade in after scroll settles
            scrollToElement(rect);
            setTimeout(function () {
                var freshRect = getTargetRect(step);
                if (!freshRect) freshRect = rect;
                spotlight.style.top = (freshRect.top - pad) + 'px';
                spotlight.style.left = (freshRect.left - pad) + 'px';
                spotlight.style.width = (freshRect.width + pad * 2) + 'px';
                spotlight.style.height = (freshRect.height + pad * 2) + 'px';
                spotlight.style.opacity = '1';
            }, 500);
        }

        // Global index for dots
        var globalIndex = stepOffset + index;

        // Progress dots — show all TOTAL_STEPS
        var dotsHtml = '';
        for (var i = 0; i < TOTAL_STEPS; i++) {
            var cls = 'tut-dot';
            if (i === globalIndex) cls += ' active';
            else if (i < globalIndex) cls += ' done';
            dotsHtml += '<div class="' + cls + '"></div>';
        }

        var stepLabel = 'Step ' + (globalIndex + 1) + ' of ' + TOTAL_STEPS;

        var prevBtn = (globalIndex > 0 && index > 0)
            ? '<button class="tut-btn tut-btn-ghost" id="tut-prev">Back</button>'
            : '';
        var nextLabel = step.cta || (globalIndex === TOTAL_STEPS - 1 ? 'Finish' : 'Next');
        var nextBtn = '<button class="tut-btn tut-btn-primary" id="tut-next">' + nextLabel + '</button>';

        tooltip.className = isModal ? 'tut-modal' : '';
        // Reset tooltip positioning state from previous step
        tooltip.style.opacity = '';
        tooltip.style.visibility = '';
        tooltip.style.transition = '';
        tooltip.style.top = '';
        tooltip.style.left = '';
        tooltip.innerHTML =
            '<button class="tut-skip" id="tut-close" title="Skip tutorial">&times;</button>' +
            '<div class="tut-icon">' + step.icon + '</div>' +
            '<h3 class="tut-title">' + step.title + '</h3>' +
            '<p class="tut-body">' + step.body + '</p>' +
            '<div class="tut-footer">' +
            '  <div class="tut-progress">' + dotsHtml + '</div>' +
            '  <span class="tut-step-label">' + stepLabel + '</span>' +
            '  <div class="tut-actions">' + prevBtn + nextBtn + '</div>' +
            '</div>';

        if (!isModal) {
            // Hide tooltip completely until scroll settles and we can position it
            tooltip.style.opacity = '0';
            tooltip.style.visibility = 'hidden';
            setTimeout(function () {
                var freshRect = getTargetRect(step);
                positionTooltip(freshRect || rect, step.position);
                tooltip.style.visibility = 'visible';
                tooltip.style.opacity = '1';
                tooltip.style.transition = 'opacity 0.25s ease';
            }, 520);
        }

        document.getElementById('tut-next').addEventListener('click', function () { goNext(); });
        var prevEl = document.getElementById('tut-prev');
        if (prevEl) prevEl.addEventListener('click', function () { goPrev(); });
        document.getElementById('tut-close').addEventListener('click', function () { finish(); });
    }

    function positionTooltip(rect, preferredPos) {
        tooltip.style.top = '';
        tooltip.style.left = '';
        tooltip.style.transform = '';
        var ttW = tooltip.offsetWidth;
        var ttH = tooltip.offsetHeight;
        var gap = 18;
        var viewW = window.innerWidth;
        var viewH = window.innerHeight;
        var top, left;
        if (preferredPos === 'above' && rect.top - ttH - gap > 10) {
            top = rect.top - ttH - gap; left = rect.left + rect.width / 2 - ttW / 2;
        } else if (preferredPos === 'below' && rect.bottom + ttH + gap < viewH - 10) {
            top = rect.bottom + gap; left = rect.left + rect.width / 2 - ttW / 2;
        } else if (rect.bottom + ttH + gap < viewH - 10) {
            top = rect.bottom + gap; left = rect.left + rect.width / 2 - ttW / 2;
        } else {
            top = rect.top - ttH - gap; left = rect.left + rect.width / 2 - ttW / 2;
        }
        if (left < 10) left = 10;
        if (left + ttW > viewW - 10) left = viewW - ttW - 10;
        if (top < 10) top = 10;
        if (top + ttH > viewH - 10) top = viewH - ttH - 10;
        tooltip.style.top = top + 'px';
        tooltip.style.left = left + 'px';
    }

    /* ── Navigation ────────────────────────────────────────────────────── */

    function goNext() {
        var cur = steps[currentStep];
        if (cur && cur.onLeave) cur.onLeave();

        // If this step has a navigateTo, save state and navigate
        if (cur && cur.navigateTo) {
            var globalNext = stepOffset + currentStep + 1;
            saveState(globalNext);
            window.location.href = cur.navigateTo;
            return;
        }

        if (currentStep < steps.length - 1) {
            currentStep++;
            renderStep(currentStep);
        } else {
            finish();
        }
    }

    function goPrev() {
        var cur = steps[currentStep];
        if (cur && cur.onLeave) cur.onLeave();
        if (currentStep > 0) {
            currentStep--;
            renderStep(currentStep);
        }
    }

    function finish() {
        var cur = steps[currentStep];
        if (cur && cur.onLeave) cur.onLeave();
        clearState();
        if (overlay) {
            overlay.style.transition = 'opacity 0.3s ease';
            overlay.style.opacity = '0';
            setTimeout(function () {
                if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
                overlay = null; tooltip = null; spotlight = null;
            }, 300);
        }
        try { localStorage.setItem(STORAGE_KEY, 'true'); } catch (_) {}
    }

    function handleResize() {
        if (!overlay || !steps[currentStep]) return;
        renderStepInner(currentStep, steps[currentStep]);
    }

    /* ── Launch helpers ─────────────────────────────────────────────────── */

    function startTour(stepList, offset) {
        if (window.innerWidth < DESKTOP_MIN_WIDTH) return;
        injectStyles();
        steps = stepList;
        stepOffset = offset;
        totalStepsGlobal = TOTAL_STEPS;
        currentStep = 0;
        if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
        createOverlay();
        renderStep(0);
        window.addEventListener('resize', handleResize);
    }

    /* ══════════════════════════════════════════════════════════════════════
       PUBLIC API — called from dashboard
       ══════════════════════════════════════════════════════════════════════ */

    var tutorialStarted = false;

    window.startTutorialIfNew = function (userId) {
        if (tutorialStarted) return;
        if (window.innerWidth < DESKTOP_MIN_WIDTH) return;
        // Only start the tutorial from the dashboard, never from other pages
        if (!ON_DASHBOARD) return;

        var key = STORAGE_KEY + ':' + userId;
        STORAGE_KEY = key;
        tutorialStarted = true;

        // Check if returning from study page (part 2) — must happen BEFORE
        // the localStorage completion check, because a replay mid-flight
        // still has the old completion marker set.
        // Check both URL param AND sessionStorage (fallback if server redirect strips query)
        var params = new URLSearchParams(window.location.search);
        var savedState = loadState();
        var isTutReturn = params.get('tutreturn') === '1' ||
            (savedState && savedState.step === DASHBOARD_PART1_COUNT + STUDY_STEP_COUNT);
        if (isTutReturn) {
            // Clean URL if param present
            if (params.get('tutreturn')) {
                params.delete('tutreturn');
                var clean = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
                window.history.replaceState({}, '', clean);
            }
            // Restore the user-specific STORAGE_KEY from cross-page state before clearing
            var returnSaved = savedState || loadState();
            if (returnSaved && returnSaved.key) STORAGE_KEY = returnSaved.key;
            // Clear cross-page state
            clearState();
            // Start dashboard part 2
            setTimeout(function () {
                startTour(buildDashboardStepsPart2(), DASHBOARD_PART1_COUNT + STUDY_STEP_COUNT);
            }, 800);
            return;
        }

        // If tutorial already completed and this isn't a return/replay, skip
        try { if (localStorage.getItem(key)) return; } catch (_) {}

        // Only show the tutorial on fresh account creation — not when an
        // existing user logs in from a new browser or device.
        var justCreated = false;
        try { justCreated = sessionStorage.getItem('alits_just_created') === '1'; } catch (_) {}
        if (!justCreated) {
            // Mark as completed so we never check again for this user/browser
            try { localStorage.setItem(key, 'true'); } catch (_) {}
            return;
        }
        // Consume the flag so it doesn't persist across sessions
        try { sessionStorage.removeItem('alits_just_created'); } catch (_) {}

        // Check for cross-page resume (shouldn't happen on dashboard normally, but safety)
        var saved = loadState();
        if (saved) {
            clearState();
            // If state says we should be on study page, just start fresh
        }

        setTimeout(function () {
            if (window.innerWidth < DESKTOP_MIN_WIDTH) return;
            startTour(buildDashboardStepsPart1(), 0);
        }, 1200);
    };

    window.replayTutorial = function () {
        if (window.innerWidth < DESKTOP_MIN_WIDTH) return;
        tutorialStarted = true;
        clearState();
        // Clear the completion marker so the return from study page works
        try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
        startTour(buildDashboardStepsPart1(), 0);
    };

    /* ══════════════════════════════════════════════════════════════════════
       AUTO-RESUME on /study page
       ══════════════════════════════════════════════════════════════════════ */
    if (ON_STUDY) {
        var saved = loadState();
        if (saved && saved.step === DASHBOARD_PART1_COUNT) {
            // Restore the user-specific STORAGE_KEY from the cross-page state
            if (saved.key) STORAGE_KEY = saved.key;
            // We arrived from the dashboard tutorial — start study steps
            // Wait for the page to render (verses load, community bar available)
            var startStudyTour = function () {
                if (window.innerWidth < DESKTOP_MIN_WIDTH) { clearState(); return; }
                startTour(buildStudySteps(), DASHBOARD_PART1_COUNT);
            };
            // Wait for verses to appear, up to 6 seconds
            var attempts = 0;
            var waitForVerses = function () {
                attempts++;
                var verse = document.querySelector('.verse-container');
                if (verse || attempts > 30) {
                    startStudyTour();
                } else {
                    setTimeout(waitForVerses, 200);
                }
            };
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', function () { setTimeout(waitForVerses, 500); });
            } else {
                setTimeout(waitForVerses, 500);
            }
        }
    }
})();
