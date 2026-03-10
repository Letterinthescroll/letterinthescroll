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
    isLoading: false,
    currentParshaSignificance: null,
    currentParshaSignificanceName: null,
    currentMitzvahChallenge: null,
    currentMitzvahChallengeId: null,
    currentMitzvahWeekStart: null,
    currentMitzvahDeadline: null,
    mitzvahLeaderboard: []
};

export function setState(updates) {
    Object.assign(state, updates);
}

export function getState() {
    return { ...state };
}
