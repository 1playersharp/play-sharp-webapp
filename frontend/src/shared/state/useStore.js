import create from 'zustand';

// Global store shared between foundation and elite tiers for session, player and analytics
export const useStore = create((set) => ({
  session: {
    userId: null,
    mode: 'foundation', // or 'elite'
  },
  setMode: (mode) => set((state) => ({ session: { ...state.session, mode } })),
  analytics: {
    events: [],
  },
  pushEvent: (evt) => set((state) => ({ analytics: { events: [...state.analytics.events, evt] } })),
  resetAnalytics: () => set({ analytics: { events: [] } }),
}));

export default useStore;

