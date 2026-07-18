import create from 'zustand';
import { persist } from 'zustand/middleware';

export const OBJECTIVE_CATEGORIES = [
  { value: 'team',       label: 'Team Training' },
  { value: 'individual', label: 'Individual Training' },
  { value: 'match',      label: 'Upcoming Match' },
  { value: 'season',     label: 'Season Goals', comingSoon: true },
];

const genId = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `o_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const seed = () => [
  {
    id: genId(),
    category: 'individual',
    title: 'Weak-foot crosses',
    target: 10,
    unit: 'reps',
    current: 0,
    completed: false,
    createdAt: Date.now(),
  },
  {
    id: genId(),
    category: 'individual',
    title: 'Scan frequency',
    target: 10,
    unit: 'sec interval',
    current: 0,
    completed: false,
    createdAt: Date.now(),
  },
  {
    id: genId(),
    category: 'match',
    title: 'Interceptions',
    target: 5,
    unit: 'count',
    current: 0,
    completed: false,
    createdAt: Date.now(),
  },
  {
    id: genId(),
    category: 'team',
    title: 'Line-breaking passes',
    target: 8,
    unit: 'count',
    current: 0,
    completed: false,
    createdAt: Date.now(),
  },
];

const useObjectivesStore = create(
  persist(
    (set, get) => ({
      objectives: seed(),
      addObjective: ({ category, title, target, unit, matchId }) =>
        set((state) => ({
          objectives: [
            ...state.objectives,
            {
              id: genId(),
              category,
              title: String(title || '').trim(),
              target: Math.max(1, Number(target) || 1),
              unit: String(unit || '').trim(),
              current: 0,
              completed: false,
              createdAt: Date.now(),
              matchId: matchId || null,
            },
          ],
        })),
      /**
       * Auto-created placeholder objective linked to a Match activity.
       * Idempotent: if a matchId already has any objective linked, no-op —
       * we don't spawn duplicate blank rows on re-edit of the match.
       */
      createForMatch: ({ matchId, title, category = 'match', target, unit }) =>
        set((state) => {
          if (!matchId) return {};
          if (state.objectives.some((o) => o.matchId === matchId)) return {};
          return {
            objectives: [
              ...state.objectives,
              {
                id: genId(),
                category,
                title: String(title || '').trim(),
                target: target == null ? null : Math.max(1, Number(target) || 1),
                unit: String(unit || '').trim(),
                current: 0,
                completed: false,
                createdAt: Date.now(),
                matchId,
              },
            ],
          };
        }),
      updateObjective: (id, patch) =>
        set((state) => ({
          objectives: state.objectives.map((o) =>
            o.id === id ? { ...o, ...patch } : o
          ),
        })),
      incrementObjective: (id, by = 1) =>
        set((state) => ({
          objectives: state.objectives.map((o) => {
            if (o.id !== id) return o;
            const current = Math.max(0, Math.min(o.target, o.current + by));
            return { ...o, current, completed: current >= o.target ? o.completed : o.completed };
          }),
        })),
      completeObjective: (id) =>
        set((state) => ({
          objectives: state.objectives.map((o) =>
            o.id === id
              ? { ...o, completed: !o.completed, current: !o.completed ? o.target : o.current }
              : o
          ),
        })),
      removeObjective: (id) =>
        set((state) => ({
          objectives: state.objectives.filter((o) => o.id !== id),
        })),
    }),
    {
      name: 'playsharp-objectives',
      partialize: (state) => ({ objectives: state.objectives }),
    }
  )
);

export default useObjectivesStore;
