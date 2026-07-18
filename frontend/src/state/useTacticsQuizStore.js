import create from 'zustand';
import { persist } from 'zustand/middleware';

// One record per position bucket. `bestScore` is the highest number of
// correctly-answered scenarios across all attempts; `total` is the number
// of scenarios that attempt had (so % can be recomputed if the quiz grows
// later). `attempts` counts every finished quiz.
const emptyResult = () => ({
    bestScore: 0,
    total: 0,
    lastCompletedAt: null,
    attempts: 0,
});

const POSITION_KEYS = ['defender', 'midfielder', 'winger', 'striker'];

const buildEmptyResults = () => {
    const out = {};
    POSITION_KEYS.forEach((k) => { out[k] = emptyResult(); });
    return out;
};

const useTacticsQuizStore = create(
    persist(
        (set) => ({
            results: buildEmptyResults(),
            /**
             * Merge a finished attempt into the store. Keeps the highest
             * bestScore seen and stamps the completion time so a UI can show
             * "last played 3 days ago".
             */
            recordResult: (positionKey, score, total) =>
                set((state) => {
                    if (!POSITION_KEYS.includes(positionKey)) return state;
                    const prev = state.results[positionKey] ?? emptyResult();
                    return {
                        results: {
                            ...state.results,
                            [positionKey]: {
                                bestScore: Math.max(prev.bestScore, score),
                                total,
                                lastCompletedAt: new Date().toISOString(),
                                attempts: prev.attempts + 1,
                            },
                        },
                    };
                }),
            reset: () => set({ results: buildEmptyResults() }),
        }),
        {
            name: 'playsharp-tactics-quiz',
            partialize: (state) => ({ results: state.results }),
        }
    )
);

export default useTacticsQuizStore;
