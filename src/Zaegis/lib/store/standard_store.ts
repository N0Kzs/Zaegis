/**
 * @file Zustand store for the Standard Deployment module.
 *
 * Replaces the raw localStorage caching with a persistent, rehydratable store.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PatrolSchedule, OptimizationConfig } from '@/app/dashboard/standard/utils';

function getCurrentWeekMonday(): string {
  const now = new Date();
  const day = now.getDay(); // 0 = Sun, 1 = Mon …
  const diff = day === 0 ? -6 : 1 - day; // shift so Monday = 0
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().split('T')[0]; // 'yyyy-MM-dd'
}

interface StandardState {
  selectedWeekStart: string;
  schedules: PatrolSchedule[];
  weekHasBeenSaved: boolean;
  viewMode: 'planning' | 'history';
  contentTab: 'schedule' | 'utilization';
  config: OptimizationConfig;

  schedulesHistory: PatrolSchedule[][];
  schedulesRedoStack: PatrolSchedule[][];

  setSelectedWeekStart: (week: string) => void;
  setSchedules: (schedules: PatrolSchedule[]) => void;
  setWeekHasBeenSaved: (saved: boolean) => void;
  setViewMode: (mode: 'planning' | 'history') => void;
  setContentTab: (tab: 'schedule' | 'utilization') => void;
  setConfig: (config: OptimizationConfig) => void;

  pushHistory: (prev: PatrolSchedule[]) => void;
  undo: () => PatrolSchedule[] | null;
  redo: () => PatrolSchedule[] | null;
  clearHistory: () => void;
  resetDraft: () => void;
}

const DEFAULT_CONFIG: OptimizationConfig = {
  minPersonnelPerTeam: 2,
  minPersonnelPerCar: 2,
  minPersonnelPerBike: 1,
  maxWeeklyHours: 48,
  minWeeklyHours: 24,
  aggregationWindow: 2,
  lookbackDays: 180,
  nightShiftStartHour: 17,
  allowNonPatrolAtNight: false,
  maxAreasPerCluster: 6,
};

export const useStandardStore = create<StandardState>()(
  persist(
    (set, get) => ({
      selectedWeekStart: getCurrentWeekMonday(),
      schedules: [],
      weekHasBeenSaved: false,
      viewMode: 'planning',
      contentTab: 'schedule',
      config: DEFAULT_CONFIG,
      schedulesHistory: [],
      schedulesRedoStack: [],

      setSelectedWeekStart: (week) => set({ selectedWeekStart: week }),
      setSchedules: (schedules) => set({ schedules }),
      setWeekHasBeenSaved: (saved) => set({ weekHasBeenSaved: saved }),
      setViewMode: (mode) => set({ viewMode: mode }),
      setContentTab: (tab) => set({ contentTab: tab }),
      setConfig: (config) => set({ config }),

      pushHistory: (prev) => {
        const { schedulesHistory } = get();
        set({
          schedulesHistory: [...schedulesHistory.slice(-30), prev],
          schedulesRedoStack: [],
        });
      },

      undo: () => {
        const { schedulesHistory, schedules } = get();
        if (schedulesHistory.length === 0) return null;
        const prev = schedulesHistory[schedulesHistory.length - 1];
        set({
          schedulesRedoStack: [schedules, ...get().schedulesRedoStack],
          schedulesHistory: schedulesHistory.slice(0, -1),
        });
        return prev;
      },

      redo: () => {
        const { schedulesRedoStack, schedules } = get();
        if (schedulesRedoStack.length === 0) return null;
        const next = schedulesRedoStack[0];
        set({
          schedulesHistory: [...get().schedulesHistory, schedules],
          schedulesRedoStack: schedulesRedoStack.slice(1),
        });
        return next;
      },

      clearHistory: () => set({ schedulesHistory: [], schedulesRedoStack: [] }),

      resetDraft: () => set({
        schedules: [],
        schedulesHistory: [],
        schedulesRedoStack: [],
      }),
    }),
    {
      name: 'standard-deployment-store',
      partialize: (state) => ({
        selectedWeekStart: state.selectedWeekStart,
        schedules: state.schedules,
        weekHasBeenSaved: state.weekHasBeenSaved,
        viewMode: state.viewMode,
        contentTab: state.contentTab,
        config: state.config,
      }),
    },
  ),
);
