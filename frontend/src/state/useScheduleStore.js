import create from 'zustand';
import { persist } from 'zustand/middleware';

export const SLOTS = ['AM', 'PM', 'EVE'];

export const ACTIVITY_TYPES = [
  { value: 'team_training',       label: 'Team Training',       accent: 'ps-red' },
  { value: 'individual_training', label: 'Individual Training', accent: 'ps-turf' },
  { value: 'match',               label: 'Match',               accent: 'ps-gold' },
  { value: 'gym',                 label: 'Gym / S&C',            accent: 'ps-orange' },
  { value: 'recovery',            label: 'Recovery',             accent: 'ps-blue' },
  { value: 'video',               label: 'Video / Analysis',     accent: 'ps-pink' },
  { value: 'mobility',            label: 'Mobility / Stretching', accent: 'ps-purple' },
  { value: 'physio',              label: 'Physio / Treatment',   accent: 'ps-redDeep' },
  { value: 'warm_up',             label: 'Warm-up',              accent: 'ps-turf' },
  { value: 'nutrition',           label: 'Nutrition',            accent: 'ps-orange' },
  { value: 'travel',              label: 'Travel',               accent: 'ps-blue' },
  { value: 'rest',                label: 'Rest' ,                accent: 'ps-line' },
  { value: 'holiday',             label: 'Holiday',              accent: 'ps-purple' },
];

export const activityTypeMeta = (value) =>
  ACTIVITY_TYPES.find((t) => t.value === value) || ACTIVITY_TYPES[0];

const emptyDay = () => ({ AM: [], PM: [], EVE: [] });
const emptyWeek = () => ({ 0: emptyDay(), 1: emptyDay(), 2: emptyDay(), 3: emptyDay(), 4: emptyDay(), 5: emptyDay(), 6: emptyDay() });

const ensureWeek = (weeks, weekStartISO) =>
  weeks[weekStartISO] ? weeks : { ...weeks, [weekStartISO]: emptyWeek() };

const genId = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `a_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const useScheduleStore = create(
  persist(
    (set) => ({
      weeks: {},
      addActivity: (weekStartISO, dayIndex, slot, activity) =>
        set((state) => {
          const weeks = ensureWeek(state.weeks, weekStartISO);
          const week = weeks[weekStartISO];
          const day = week[dayIndex];
          const next = {
            ...day,
            [slot]: [...day[slot], { id: genId(), ...activity }],
          };
          return {
            weeks: {
              ...weeks,
              [weekStartISO]: { ...week, [dayIndex]: next },
            },
          };
        }),
      updateActivity: (weekStartISO, dayIndex, slot, id, patch) =>
        set((state) => {
          const week = state.weeks[weekStartISO];
          if (!week) return {};
          const day = week[dayIndex];
          const next = {
            ...day,
            [slot]: day[slot].map((a) => (a.id === id ? { ...a, ...patch } : a)),
          };
          return {
            weeks: {
              ...state.weeks,
              [weekStartISO]: { ...week, [dayIndex]: next },
            },
          };
        }),
      removeActivity: (weekStartISO, dayIndex, slot, id) =>
        set((state) => {
          const week = state.weeks[weekStartISO];
          if (!week) return {};
          const day = week[dayIndex];
          const next = {
            ...day,
            [slot]: day[slot].filter((a) => a.id !== id),
          };
          return {
            weeks: {
              ...state.weeks,
              [weekStartISO]: { ...week, [dayIndex]: next },
            },
          };
        }),
    }),
    {
      name: 'playsharp-schedule',
      partialize: (state) => ({ weeks: state.weeks }),
    }
  )
);

export default useScheduleStore;