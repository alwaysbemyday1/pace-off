import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type MatchState = {
  matchId: string | null;
  targetDistanceMeters: number | null;
  totalDistanceMeters: number;
  setMatchId: (matchId: string | null) => void;
  setTargetDistanceMeters: (meters: number | null) => void;
  setTotalDistanceMeters: (meters: number) => void;
  addDistanceMeters: (meters: number) => void;
  resetMatch: () => void;
};

const initialState = {
  matchId: null,
  targetDistanceMeters: null,
  totalDistanceMeters: 0,
};

export const useMatchStore = create<MatchState>()(
  persist(
    (set) => ({
      ...initialState,
      setMatchId: (matchId) => set({ matchId }),
      setTargetDistanceMeters: (targetDistanceMeters) => set({ targetDistanceMeters }),
      setTotalDistanceMeters: (totalDistanceMeters) => set({ totalDistanceMeters }),
      addDistanceMeters: (meters) =>
        set((state) => ({ totalDistanceMeters: state.totalDistanceMeters + meters })),
      resetMatch: () => set(initialState),
    }),
    {
      name: 'pace-off-lite-match-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        matchId: state.matchId,
        targetDistanceMeters: state.targetDistanceMeters,
        totalDistanceMeters: state.totalDistanceMeters,
      }),
    }
  )
);


