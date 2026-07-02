import create from 'zustand';
import { persist } from 'zustand/middleware';

export type EliteResult = { score: number; reactionTime?: number | null } | null;

type EliteStore = {
  eliteDecisionResult: EliteResult;
  elitePressingResult: EliteResult;
  eliteMovementResult: EliteResult;
  eliteBodyShapeResult: EliteResult;
  eliteStrikerResult: EliteResult;
  setEliteResult: (gameType: string, payload: { score: number; reactionTime?: number | null }) => void;
};

const useEliteStore = create<EliteStore>(
  persist(
    (set) => ({
      eliteDecisionResult: null,
      elitePressingResult: null,
      eliteMovementResult: null,
      eliteBodyShapeResult: null,
      eliteStrikerResult: null,
      setEliteResult: (gameType, payload) => {
        const value = { score: payload.score, reactionTime: payload.reactionTime ?? null };
        switch (gameType) {
          case 'elite_decision':
            set({ eliteDecisionResult: value });
            break;
          case 'elite_pressing':
            set({ elitePressingResult: value });
            break;
          case 'elite_movement':
            set({ eliteMovementResult: value });
            break;
          case 'elite_body_shape':
            set({ eliteBodyShapeResult: value });
            break;
          case 'elite_striker':
            set({ eliteStrikerResult: value });
            break;
          default:
            // ignore unknown
            break;
        }
      },
    }),
    {
      name: 'playsharp-elite-results',
      partialize: (state) => ({
        eliteDecisionResult: state.eliteDecisionResult,
        elitePressingResult: state.elitePressingResult,
        eliteMovementResult: state.eliteMovementResult,
        eliteBodyShapeResult: state.eliteBodyShapeResult,
        eliteStrikerResult: state.eliteStrikerResult,
      }),
    }
  )
);

export default useEliteStore;


