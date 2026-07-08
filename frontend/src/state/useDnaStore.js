import create from 'zustand';
import { persist } from 'zustand/middleware';

const useDnaStore = create(
    persist(
        (set) => ({
            attributes: null,
            archetypeId: null,
            completedAt: null,
            setResult: ({ attributes, archetypeId }) =>
                set({
                    attributes,
                    archetypeId,
                    completedAt: new Date().toISOString(),
                }),
            reset: () =>
                set({ attributes: null, archetypeId: null, completedAt: null }),
        }),
        {
            name: 'playsharp-dna',
            partialize: (state) => ({
                attributes: state.attributes,
                archetypeId: state.archetypeId,
                completedAt: state.completedAt,
            }),
        }
    )
);

export default useDnaStore;
