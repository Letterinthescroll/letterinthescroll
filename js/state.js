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
    // When Sefaria returns a holiday reading in place of the weekly parsha
    // (e.g., "Pesach Day 1"), this holds the display name so the header can
    // show it instead of the generic book name. Null on regular weeks.
    currentHolidayName: null
};

export function setState(updates) {
    Object.assign(state, updates);
}

export function getState() {
    return { ...state };
}
