// State Management Module
export const state = {
    commentaryData: null,
    mitzvahChallenges: null,
    currentParshaRef: null,
    currentParshaIndex: -1,
    weeklyParshaRef: null,
    weeklyParshaIndex: -1,
    weeklyParshaWeekStart: null,
    allParshas: [],
    specialReadings: [],
    isLoading: false,
    currentParshaSignificance: null,
    currentParshaSignificanceName: null,
    currentMitzvahChallenge: null,
    currentMitzvahChallengeId: null,
    currentMitzvahWeekStart: null,
    currentMitzvahDeadline: null,
    mitzvahLeaderboard: [],
    isDoubleParsha: false,
    doubleParshaFirstIndex: -1,
    doubleParshaDisplayName: null,
    // When a festival reading replaces the weekly parsha (e.g. "Pesach — Day
    // 1"), this holds the display name so the header can show it instead of
    // the generic book name. Null on regular weeks.
    currentHolidayName: null,
    // This week's reading as resolved from js/parsha-calendar.js:
    // { kind, name, ref, isDouble, parshas, specialShabbat, ... }. Drives the
    // "special week" notice above the reading. Null before the first lookup.
    weeklyReading: null
};

export function setState(updates) {
    Object.assign(state, updates);
}

export function getState() {
    return { ...state };
}
