/**
 * mobile-tutorial.js — First-time user walkthrough for mobile devices.
 *
 * Mobile-only guided tour. Uses bottom-sheet style tooltips optimised for
 * touch. Spans the dashboard AND study page via sessionStorage hand-off.
 *
 * Usage:
 *   Dashboard: <script src="/js/mobile-tutorial.js"></script>
 *              + call startMobileTutorialIfNew(uid)
 *   Study:     <script src="/js/mobile-tutorial.js"></script> (auto-resumes)
 */
(function () {
    'use strict';

    var STORAGE_KEY = 'alits_mobile_tutorial_completed';
    var SESSION_KEY = 'alits_mobile_tutorial_state';
    var MOBILE_MAX_WIDTH = 899;  // desktop tutorial starts at 900px — no overlap
    var currentStep = 0;
    var overlay = null;
    var tooltip = null;
    var spotlight = null;
    var steps = [];
    var totalStepsGlobal = 0;
    var stepOffset = 0;
    var fakeGroupEl = null;

    /* ── Which page are we on? ─────────────────────────────────────── */
    var ON_STUDY = /\/study/i.test(window.location.pathname);
    var ON_DASHBOARD = !ON_STUDY;

    /* ── Icons ────────────────────────────────────────────────────── */
    var ICONS = {
        welcome:     '<img src="/media/images/Logonewwhite.png" width="24" height="24" alt="" style="border-radius:50%;">',
        menu:        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
        inspiration: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" stroke-width="1.8"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 017 7c0 2.38-1.19 4.47-3 5.74V17H8v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 017-7z"/></svg>',
        tehillim:    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" stroke-width="1.8"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>',
        groups:      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" stroke-width="1.8"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>',
        explore:     '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" stroke-width="1.8"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
        bookmark:    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" stroke-width="1.8"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>',
        mitzvah:     '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" stroke-width="1.8"><path d="M12 15l-3 3 1.5 1.5L12 18l1.5 1.5L15 18l-3-3z"/><path d="M6 3v7a6 6 0 0012 0V3"/><path d="M4 3h16"/></svg>',
        study:       '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" stroke-width="1.8"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>',
        controls:    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" stroke-width="1.8"><path d="M12 5v14M5 12h14"/></svg>',
        verse:       '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" stroke-width="1.8"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>',
        done:        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" stroke-width="1.8"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
    };

    /*
     * STEP COUNTS (keep in sync):
     *   Dashboard part 1: steps 0-8  (9 steps)
     *   Study page:       steps 9-10 (2 steps)
     *   Dashboard part 2: steps 11   (1 step — finish modal)
     *   Total: 12
     */
    var TOTAL_STEPS = 12;
    var DASHBOARD_PART1_COUNT = 9;  // steps 0-8
    var STUDY_STEP_COUNT = 2;       // steps 9-10

    /* ── Fake group card ──────────────────────────────────────────── */
    function injectFakeGroupCard() {
        removeFakeGroupCard();
        var grid = document.getElementById('chavrutas-grid');
        if (!grid) return;

        fakeGroupEl = document.createElement('div');
        fakeGroupEl.id = 'mtut-fake-group';
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

    /* ── Inject fake names into community bar on study page ────────── */
    function injectFakeCommunityBar() {
        var bar = document.getElementById('community-status-bar');
        if (!bar) return;
        bar.dataset.tutorialLock = '1';
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

    /* ══════════════════════════════════════════════════════════════════
       DASHBOARD STEPS (part 1: 0-8)
       ══════════════════════════════════════════════════════════════════ */
    function buildDashboardStepsPart1() {
        return [
            /* 0 — Welcome */ {
                type: 'modal',
                icon: ICONS.welcome,
                title: 'Welcome to A Letter in the Scroll!',
                body: 'Let us give you a quick tour so you can get the most out of your experience on mobile.',
                cta: 'Let\u2019s Go'
            },
            /* 1 — Hamburger menu */ {
                target: function () { return document.getElementById('site-hamburger'); },
                icon: ICONS.menu,
                title: 'Navigation Menu',
                body: 'Tap the <strong>menu button</strong> to open the navigation drawer. From there you can reach <strong>Home</strong>, <strong>Study</strong>, <strong>Holidays</strong>, <strong>Prayers</strong>, <strong>Songs</strong>, <strong>About</strong>, and your <strong>Account</strong>.',
                position: 'below',
                spotlightPad: 8
            },
            /* 2 — Daily Inspiration */ {
                target: function () { return document.getElementById('daily-inspiration'); },
                icon: ICONS.inspiration,
                title: 'Daily Inspiration',
                body: 'Each day features a new teaching \u2014 a Hebrew quote with translation and reflection. You can <strong>bookmark</strong> any quote you love.',
                position: 'below'
            },
            /* 3 — Daily Tehillim (Psalms) */ {
                target: function () { return document.getElementById('daily-tehillim-card'); },
                icon: ICONS.tehillim,
                title: 'Daily Tehillim (Psalms)',
                body: 'Follow the traditional Chabad monthly Psalm cycle. See which chapters to read today and tap <strong>Begin Reading</strong> to dive in.',
                position: 'below'
            },
            /* 4 — Study Groups (Chavrutot) */ {
                target: function () { return document.getElementById('chavrutas-section'); },
                icon: ICONS.groups,
                title: 'Study Groups (Chavrutot)',
                body: 'Create or join a study group to learn with friends. Each group has its own <strong>private comment threads</strong> on the weekly parsha, plus shared bookmarks and reflections.',
                position: 'above',
                onEnter: injectFakeGroupCard,
                onLeave: removeFakeGroupCard
            },
            /* 5 — Explore section */ {
                target: function () { return document.getElementById('explore-section'); },
                icon: ICONS.explore,
                title: 'Explore the Site',
                body: 'Quick links to every section: <strong>Weekly Parsha</strong>, <strong>Holidays</strong>, <strong>Prayers</strong>, <strong>Songs</strong>, <strong>Bookmarks</strong>, and <strong>Daily Psalms</strong>.',
                position: 'above'
            },
            /* 6 — Bookmarks */ {
                target: function () { return document.querySelector('.dash-explore-card.tone-bookmarks'); },
                icon: ICONS.bookmark,
                title: 'Your Bookmarks',
                body: 'All the verses and quotes you bookmark are saved here. You can revisit them anytime from this card or from the <strong>Bookmarks</strong> page.',
                position: 'above'
            },
            /* 7 — Weekly Mitzvah Challenge */ {
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
                body: 'Let\u2019s visit the Study Room \u2014 read the weekly Torah portion with full <strong>Hebrew text and English translation</strong>, and interact with your community.',
                cta: 'Visit Study Room',
                navigateTo: '/study'
            }
        ];
    }

    /* ══════════════════════════════════════════════════════════════════
       STUDY PAGE STEPS (9-10)
       ══════════════════════════════════════════════════════════════════ */
    function buildStudySteps() {
        return [
            /* 0 (global 9) — Mobile controls */ {
                target: function () { return document.getElementById('nav-mobile'); },
                icon: ICONS.controls,
                title: 'Study Controls',
                body: 'Use the <strong>Torah Portion</strong> selector to choose a parsha. Tap <strong>Parsha Chat</strong> to discuss, <strong>Significance</strong> for deeper meaning, and <strong>Previous/Next</strong> to navigate.',
                position: 'below',
                spotlightPad: 6,
                onEnter: injectFakeCommunityBar
            },
            /* 1 (global 10) — Verse interaction */ {
                target: function () {
                    return document.querySelector('.verse-container');
                },
                icon: ICONS.verse,
                title: 'Verse Interactions',
                body: 'On each verse, tap the <strong style="color:#dc2626;">heart</strong> to love it, the <strong style="color:#d97706;">exclamation</strong> to emphasize, or the <strong style="color:#2563eb;">bookmark</strong> to save it. Your study group can see these too!',
                position: 'below',
                spotlightPad: 8,
                navigateTo: '/dashboard/?mtutreturn=1',
                onLeave: function () {
                    var bar = document.getElementById('community-status-bar');
                    if (bar) delete bar.dataset.tutorialLock;
                }
            }
        ];
    }

    /* ══════════════════════════════════════════════════════════════════
       DASHBOARD PART 2 (11) — finish modal after returning from study
       ══════════════════════════════════════════════════════════════════ */
    function buildDashboardStepsPart2() {
        return [
            /* 0 (global 11) — All set */ {
                type: 'modal',
                icon: ICONS.done,
                title: 'You\u2019re All Set!',
                body: 'That\u2019s the overview. Explore at your own pace \u2014 every page has something meaningful waiting for you. <em>B\u2019hatzlacha!</em>',
                cta: 'Start Exploring'
            }
        ];
    }

    /* ── Styles (mobile-optimised) ─────────────────────────────────── */
    function injectStyles() {
        if (document.getElementById('mobile-tutorial-styles')) return;
        var style = document.createElement('style');
        style.id = 'mobile-tutorial-styles';
        style.textContent =
            '#mtut-overlay{position:fixed;inset:0;z-index:99990;pointer-events:none;}' +
            '#mtut-overlay.active{pointer-events:auto;}' +

            '#mtut-backdrop{position:fixed;inset:0;z-index:99991;background:rgba(3,10,28,0.65);' +
            'transition:opacity 0.3s ease;pointer-events:auto;}' +

            '#mtut-spotlight{position:fixed;z-index:99992;border-radius:12px;' +
            'box-shadow:0 0 0 9999px rgba(3,10,28,0.65);pointer-events:none;' +
            'transition:top 0.35s cubic-bezier(0.22,1,0.36,1),' +
            'left 0.35s cubic-bezier(0.22,1,0.36,1),' +
            'width 0.35s cubic-bezier(0.22,1,0.36,1),' +
            'height 0.35s cubic-bezier(0.22,1,0.36,1),' +
            'opacity 0.25s ease;}' +

            /* Bottom-sheet tooltip for mobile */
            '#mtut-tooltip{position:fixed;z-index:99995;' +
            'left:0;right:0;bottom:0;' +
            'width:100%;max-width:100vw;' +
            'background:linear-gradient(168deg,#ffffff 0%,#f4f8ff 46%,#eef5ff 100%);' +
            'border-top:1px solid rgba(37,99,235,0.18);' +
            'border-radius:20px 20px 0 0;' +
            'box-shadow:0 -12px 48px rgba(15,23,42,0.25);' +
            'padding:1.4rem 1.2rem calc(1.2rem + env(safe-area-inset-bottom));' +
            'pointer-events:auto;' +
            'transform:translateY(100%);' +
            'transition:transform 0.35s cubic-bezier(0.22,1,0.36,1),opacity 0.25s ease;}' +

            '#mtut-tooltip.mtut-visible{transform:translateY(0);}' +

            '.mtut-icon{display:none;}' +
            '.mtut-title{margin:0 0 0.35rem;font-family:Fraunces,serif;font-size:1.1rem;font-weight:700;color:#0a1f46;line-height:1.25;}' +
            '.mtut-body{margin:0;font-size:0.88rem;line-height:1.6;color:#334155;}' +
            '.mtut-body strong{color:#1e3a8a;font-weight:700;}' +
            '.mtut-body em{color:#1d4ed8;}' +

            '.mtut-footer{display:flex;align-items:center;justify-content:space-between;margin-top:1rem;gap:0.5rem;flex-wrap:nowrap;}' +

            '.mtut-progress{display:flex;gap:4px;align-items:center;flex-shrink:1;min-width:0;flex-wrap:wrap;}' +
            '.mtut-dot{width:6px;height:6px;border-radius:50%;background:rgba(37,99,235,0.18);transition:background 0.25s,transform 0.25s;flex-shrink:0;}' +
            '.mtut-dot.active{background:#1d4ed8;transform:scale(1.4);}' +
            '.mtut-dot.done{background:rgba(37,99,235,0.45);}' +

            '.mtut-actions{display:flex;gap:0.5rem;align-items:center;flex-shrink:0;}' +

            '.mtut-btn{border:none;border-radius:999px;padding:0.6rem 1.2rem;font-size:0.84rem;font-weight:700;cursor:pointer;' +
            'transition:transform 0.15s,box-shadow 0.15s,background 0.15s;letter-spacing:0.01em;' +
            '-webkit-tap-highlight-color:transparent;touch-action:manipulation;}' +
            '.mtut-btn:active{transform:scale(0.96);}' +

            '.mtut-btn-primary{color:#fff;background:linear-gradient(180deg,#2463de 0%,#1d4ed8 46%,#1e40af 100%);' +
            'border:1px solid rgba(30,64,175,0.3);box-shadow:0 6px 16px rgba(29,78,216,0.28);}' +

            '.mtut-btn-ghost{color:#64748b;background:transparent;padding:0.6rem 0.8rem;}' +
            '.mtut-btn-ghost:active{color:#334155;background:rgba(100,116,139,0.08);}' +

            '.mtut-skip{position:absolute;top:0.75rem;right:0.75rem;width:32px;height:32px;border:none;border-radius:50%;' +
            'background:rgba(100,116,139,0.1);color:#94a3b8;font-size:1.15rem;cursor:pointer;' +
            'display:flex;align-items:center;justify-content:center;' +
            '-webkit-tap-highlight-color:transparent;touch-action:manipulation;}' +

            '.mtut-step-label{font-size:0.66rem;color:#94a3b8;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;white-space:nowrap;flex-shrink:0;}' +

            /* Modal variant — centered card instead of bottom sheet */
            '#mtut-tooltip.mtut-modal{' +
            'top:50%;left:50%!important;right:auto!important;bottom:auto!important;' +
            'width:calc(100vw - 2.5rem);max-width:380px;' +
            'transform:translate(-50%,-50%) scale(0.96);opacity:0;' +
            'border-radius:20px;text-align:center;' +
            'padding:1.6rem 1.3rem 1.3rem;' +
            'box-shadow:0 24px 64px rgba(15,23,42,0.35);}' +

            '#mtut-tooltip.mtut-modal.mtut-visible{transform:translate(-50%,-50%) scale(1);opacity:1;}' +
            '#mtut-tooltip.mtut-modal .mtut-footer{justify-content:center;}' +
            '#mtut-tooltip.mtut-modal .mtut-progress{display:none;}' +
            '#mtut-tooltip.mtut-modal .mtut-step-label{display:none;}';

        document.head.appendChild(style);
    }

    /* ── Helpers ────────────────────────────────────────────────────── */

    function getTargetRect(step) {
        if (step.type === 'modal') return null;
        var el = typeof step.target === 'function' ? step.target() : step.target;
        if (!el) return null;
        var r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) return null;
        return r;
    }

    function scrollToElement(rect) {
        if (!rect) return;
        var viewH = window.innerHeight;
        var pad = 100;
        var elTop = rect.top + window.scrollY;
        var elBot = rect.bottom + window.scrollY;
        var scrollTop = window.scrollY;
        if (elTop - pad < scrollTop || elBot + pad > scrollTop + viewH) {
            window.scrollTo({ top: Math.max(0, elTop - pad), behavior: 'smooth' });
        }
    }

    /* ── Cross-page state ──────────────────────────────────────────── */
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

    /* ── Overlay / rendering ───────────────────────────────────────── */

    function createOverlay() {
        overlay = document.createElement('div');
        overlay.id = 'mtut-overlay';
        overlay.className = 'active';

        var backdrop = document.createElement('div');
        backdrop.id = 'mtut-backdrop';
        backdrop.addEventListener('click', function (e) { e.stopPropagation(); });

        spotlight = document.createElement('div');
        spotlight.id = 'mtut-spotlight';

        tooltip = document.createElement('div');
        tooltip.id = 'mtut-tooltip';

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
        var isModal = step.type === 'modal' || !rect;

        var backdropEl = overlay.querySelector('#mtut-backdrop');

        // Reset tooltip styles
        tooltip.style.opacity = '';
        tooltip.style.visibility = '';
        tooltip.style.transition = '';
        tooltip.style.top = '';
        tooltip.style.left = '';
        tooltip.style.transform = '';
        tooltip.classList.remove('mtut-visible');

        if (isModal) {
            spotlight.style.display = 'none';
            backdropEl.style.display = 'block';
        } else {
            backdropEl.style.display = 'none';
            var pad = step.spotlightPad != null ? step.spotlightPad : 10;

            // Pre-position hidden
            spotlight.style.transition = 'none';
            spotlight.style.opacity = '0';
            spotlight.style.top = (rect.top - pad) + 'px';
            spotlight.style.left = (rect.left - pad) + 'px';
            spotlight.style.width = (rect.width + pad * 2) + 'px';
            spotlight.style.height = (rect.height + pad * 2) + 'px';
            spotlight.style.display = 'block';
            spotlight.offsetHeight; // force reflow

            spotlight.style.transition = '';

            // Scroll, then re-measure after scroll settles
            scrollToElement(rect);
            setTimeout(function () {
                var freshRect = getTargetRect(step);
                if (!freshRect) freshRect = rect;
                spotlight.style.top = (freshRect.top - pad) + 'px';
                spotlight.style.left = (freshRect.left - pad) + 'px';
                spotlight.style.width = (freshRect.width + pad * 2) + 'px';
                spotlight.style.height = (freshRect.height + pad * 2) + 'px';
                spotlight.style.opacity = '1';
            }, 450);
        }

        // Global index for dots
        var globalIndex = stepOffset + index;

        // Progress dots
        var dotsHtml = '';
        for (var i = 0; i < TOTAL_STEPS; i++) {
            var cls = 'mtut-dot';
            if (i === globalIndex) cls += ' active';
            else if (i < globalIndex) cls += ' done';
            dotsHtml += '<div class="' + cls + '"></div>';
        }

        var stepLabel = 'Step ' + (globalIndex + 1) + ' of ' + TOTAL_STEPS;

        var prevBtn = (globalIndex > 0 && index > 0)
            ? '<button class="mtut-btn mtut-btn-ghost" id="mtut-prev">Back</button>'
            : '';
        var nextLabel = step.cta || (globalIndex === TOTAL_STEPS - 1 ? 'Finish' : 'Next');
        var nextBtn = '<button class="mtut-btn mtut-btn-primary" id="mtut-next">' + nextLabel + '</button>';

        // Reset tooltip
        tooltip.className = isModal ? 'mtut-modal' : '';

        tooltip.innerHTML =
            '<button class="mtut-skip" id="mtut-close" title="Skip tutorial">&times;</button>' +
            '<div class="mtut-icon">' + (step.icon || '') + '</div>' +
            '<h3 class="mtut-title">' + step.title + '</h3>' +
            '<p class="mtut-body">' + step.body + '</p>' +
            '<div class="mtut-footer">' +
            '  <div class="mtut-progress">' + dotsHtml + '</div>' +
            '  <span class="mtut-step-label">' + stepLabel + '</span>' +
            '  <div class="mtut-actions">' + prevBtn + nextBtn + '</div>' +
            '</div>';

        // Animate in
        if (isModal) {
            requestAnimationFrame(function () {
                requestAnimationFrame(function () {
                    tooltip.classList.add('mtut-visible');
                });
            });
        } else {
            // Bottom-sheet: slide up after spotlight settles
            setTimeout(function () {
                tooltip.classList.add('mtut-visible');
            }, 480);
        }

        // Event listeners
        document.getElementById('mtut-next').addEventListener('click', function () { goNext(); });
        var prevEl = document.getElementById('mtut-prev');
        if (prevEl) prevEl.addEventListener('click', function () { goPrev(); });
        document.getElementById('mtut-close').addEventListener('click', function () { finish(); });
    }

    /* ── Navigation ────────────────────────────────────────────────── */

    function goNext() {
        var cur = steps[currentStep];
        if (cur && cur.onLeave) cur.onLeave();

        // Cross-page navigation
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
        removeFakeGroupCard();
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
        if (window.innerWidth > MOBILE_MAX_WIDTH) { finish(); return; }
        renderStepInner(currentStep, steps[currentStep]);
    }

    /* ── Launch helpers ─────────────────────────────────────────────── */

    function startTour(stepList, offset) {
        if (window.innerWidth > MOBILE_MAX_WIDTH) return;
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

    /* ══════════════════════════════════════════════════════════════════
       PUBLIC API — called from dashboard
       ══════════════════════════════════════════════════════════════════ */

    var mobileTutorialStarted = false;

    window.startMobileTutorialIfNew = function (userId) {
        if (mobileTutorialStarted) return;
        if (window.innerWidth > MOBILE_MAX_WIDTH) return;
        if (!ON_DASHBOARD) return;

        var key = STORAGE_KEY + ':' + userId;
        STORAGE_KEY = key;
        mobileTutorialStarted = true;

        // Check if returning from study page
        var params = new URLSearchParams(window.location.search);
        var savedState = loadState();
        var isTutReturn = params.get('mtutreturn') === '1' ||
            (savedState && savedState.step === DASHBOARD_PART1_COUNT + STUDY_STEP_COUNT);

        if (isTutReturn) {
            // Clean URL
            if (params.get('mtutreturn')) {
                params.delete('mtutreturn');
                var clean = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
                window.history.replaceState({}, '', clean);
            }
            // Restore STORAGE_KEY
            var returnSaved = savedState || loadState();
            if (returnSaved && returnSaved.key) STORAGE_KEY = returnSaved.key;
            clearState();
            // Start finish modal
            setTimeout(function () {
                startTour(buildDashboardStepsPart2(), DASHBOARD_PART1_COUNT + STUDY_STEP_COUNT);
            }, 800);
            return;
        }

        // Already completed? Skip
        try { if (localStorage.getItem(key)) return; } catch (_) {}

        // Only show the tutorial on fresh account creation — not when an
        // existing user logs in from a new browser or device.
        var justCreated = false;
        try { justCreated = sessionStorage.getItem('alits_just_created') === '1'; } catch (_) {}
        if (!justCreated) {
            try { localStorage.setItem(key, 'true'); } catch (_) {}
            return;
        }
        try { sessionStorage.removeItem('alits_just_created'); } catch (_) {}

        // Clear stale cross-page state
        var saved = loadState();
        if (saved) clearState();

        setTimeout(function () {
            if (window.innerWidth > MOBILE_MAX_WIDTH) return;
            startTour(buildDashboardStepsPart1(), 0);
        }, 1200);
    };

    window.replayMobileTutorial = function () {
        if (window.innerWidth > MOBILE_MAX_WIDTH) return;
        mobileTutorialStarted = true;
        clearState();
        try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
        startTour(buildDashboardStepsPart1(), 0);
    };

    /* ══════════════════════════════════════════════════════════════════
       AUTO-RESUME on /study page
       ══════════════════════════════════════════════════════════════════ */
    if (ON_STUDY) {
        var saved = loadState();
        if (saved && saved.step === DASHBOARD_PART1_COUNT) {
            if (saved.key) STORAGE_KEY = saved.key;
            var startStudyTour = function () {
                if (window.innerWidth > MOBILE_MAX_WIDTH) { clearState(); return; }
                startTour(buildStudySteps(), DASHBOARD_PART1_COUNT);
            };
            // Wait for verses to render
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
