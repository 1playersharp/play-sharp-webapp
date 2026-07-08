import create from 'zustand';
import { persist } from 'zustand/middleware';

export const POSITIONS = [
  { value: 'GK',  label: 'Goalkeeper (GK)' },
  { value: 'RB',  label: 'Right Back (RB)' },
  { value: 'RCB', label: 'Right Centre Back (RCB)' },
  { value: 'LCB', label: 'Left Centre Back (LCB)' },
  { value: 'LB',  label: 'Left Back (LB)' },
  { value: 'CDM', label: 'Defensive Midfielder (CDM)' },
  { value: 'CM',  label: 'Central Midfielder (CM)' },
  { value: 'CAM', label: 'Attacking Midfielder (CAM)' },
  { value: 'RW',  label: 'Right Wing (RW)' },
  { value: 'LW',  label: 'Left Wing (LW)' },
  { value: 'ST',  label: 'Striker (ST)' },
];

export const isProfileComplete = (profile) =>
  Boolean(
    profile &&
      profile.name?.trim() &&
      profile.position &&
      profile.team?.trim() &&
      profile.foot
  );

export const missingProfileFields = (profile) => {
  const bits = [];
  if (!profile?.name?.trim()) bits.push('name');
  if (!profile?.position)     bits.push('position');
  if (!profile?.team?.trim()) bits.push('team');
  if (!profile?.foot)         bits.push('preferred foot');
  return bits;
};

export const FOOT_OPTIONS = [
  { value: 'right', label: 'Right' },
  { value: 'left',  label: 'Left' },
  { value: 'both',  label: 'Both' },
];

const DEFAULT_PROFILE = {
  name: '',
  position: '',
  avatar: null,
  team: '',
  foot: '',
};

const useProfileStore = create(
  persist(
    (set) => ({
      profile: { ...DEFAULT_PROFILE },
      setName: (name) =>
        set((state) => ({ profile: { ...state.profile, name } })),
      setPosition: (position) =>
        set((state) => ({ profile: { ...state.profile, position } })),
      setAvatar: (avatar) =>
        set((state) => ({ profile: { ...state.profile, avatar } })),
      setTeam: (team) =>
        set((state) => ({ profile: { ...state.profile, team } })),
      setFoot: (foot) =>
        set((state) => ({ profile: { ...state.profile, foot } })),
      setProfile: (patch) =>
        set((state) => ({ profile: { ...state.profile, ...patch } })),
      resetProfile: () => set({ profile: { ...DEFAULT_PROFILE } }),
    }),
    {
      name: 'playsharp-profile',
      partialize: (state) => ({ profile: state.profile }),
    }
  )
);

export default useProfileStore;