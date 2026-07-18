import create from 'zustand';
import { persist } from 'zustand/middleware';

// Latest-attempt persistence. Retaking the quiz overwrites the previous
// attempt everywhere it is surfaced (results screen, PlayerBanner IQ chip,
// PositionSelect card). Only the LATEST attempt is retained.
//
// Attempt shape:
//   {
//     positionKey: 'defender' | 'midfielder' | 'winger' | 'striker',
//     scorePercent: 0..100,           // rounded
//     topicBreakdown: { topic: 0..1 } // per-topic pickedWeight / MAX_WEIGHT
//     recommendations: [{ skillId, path, label, colour, topic, why }, ...],
//     completedAt: ISO string,
//   }
const useTacticsQuizStore = create(
    persist(
        (set) => ({
            latestAttempt: null,
            recordAttempt: (attempt) =>
                set(() => ({
                    latestAttempt: {
                        ...attempt,
                        // Never persist non-serialisable pieces (icon
                        // components) — strip them before storing.
                        recommendations: (attempt.recommendations || []).map(
                            ({ Icon, ...rest }) => rest,
                        ),
                        completedAt: new Date().toISOString(),
                    },
                })),
            reset: () => set({ latestAttempt: null }),
        }),
        {
            name: 'playsharp-tactics-quiz',
            partialize: (state) => ({ latestAttempt: state.latestAttempt }),
        },
    ),
);

export default useTacticsQuizStore;
