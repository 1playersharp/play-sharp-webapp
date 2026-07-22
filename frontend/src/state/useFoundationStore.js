import create from 'zustand';
import { persist } from 'zustand/middleware';

const useFoundationStore = create(
  persist(
    (set) => ({
      reactionResult: null,
      decisionResult: null,
      scanningResult: null,
      pressingResult: null,
      tacticalQuizResult: null,
      passMoveResult: null,
      markingResult: null,
      setFoundationResult: (gameType, payload) => {
        const value = { score: payload.score, reactionTime: payload.reactionTime ?? null };
        switch (gameType) {
          case 'reaction':      set({ reactionResult: value }); break;
          case 'decision':      set({ decisionResult: value }); break;
          case 'scanning':      set({ scanningResult: value }); break;
          case 'pressing':      set({ pressingResult: value }); break;
          case 'tactical_quiz': set({ tacticalQuizResult: value }); break;
          case 'pass_move':     set({ passMoveResult: value }); break;
          case 'marking':       set({ markingResult: value }); break;
          default: break;
        }
      },
    }),
    {
      name: 'playsharp-foundation-results',
      partialize: (state) => ({
        reactionResult: state.reactionResult,
        decisionResult: state.decisionResult,
        scanningResult: state.scanningResult,
        pressingResult: state.pressingResult,
        tacticalQuizResult: state.tacticalQuizResult,
        passMoveResult: state.passMoveResult,
        markingResult: state.markingResult,
      }),
    }
  )
);

export default useFoundationStore;
