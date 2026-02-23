import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type MatchState = {
  matchId: string | null;
  targetTimeMinutes: number | null;
  totalDistanceMeters: number;
  setMatchId: (matchId: string | null) => void;
  setTargetTimeMinutes: (minutes: number | null) => void;
  setTotalDistanceMeters: (meters: number) => void;
  addDistanceMeters: (meters: number) => void;
  resetMatch: () => void;
};

const initialState = {
  matchId: null,
  targetTimeMinutes: null,
  totalDistanceMeters: 0,
};

export const useMatchStore = create<MatchState>()(
  persist(
    (set) => ({
      ...initialState,
      setMatchId: (matchId) => set({ matchId }),
      setTargetTimeMinutes: (targetTimeMinutes) => set({ targetTimeMinutes }),
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
        targetTimeMinutes: state.targetTimeMinutes,
        totalDistanceMeters: state.totalDistanceMeters,
      }),
    }
  )
);
