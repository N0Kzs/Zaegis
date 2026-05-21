/**
 * @file Zustand store for the Hybrid Deployment module.
 *
 * Provides persisted client-side state for the hybrid deployment page,
 * mirroring the pattern established by the 5MRT deployment-store.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { HybridSchedule } from '@/app/dashboard/hybrid/types';

export interface HybridDeploymentState {
  weeklySchedules: HybridSchedule[];
  selectedDate: Date;
  viewMode: 'planning' | 'history';
  tabView: 'tactical' | 'roster' | 'map' | 'utilization';
  hasChanges: boolean;
  isReadOnly: boolean;
  ignoreSchedule: boolean;
  mapTimeSlot: string;

  setWeeklySchedules: (data: HybridSchedule[]) => void;
  setSelectedDate: (date: Date) => void;
  setViewMode: (mode: 'planning' | 'history') => void;
  setTabView: (view: 'tactical' | 'roster' | 'map' | 'utilization') => void;
  setHasChanges: (v: boolean) => void;
  setIsReadOnly: (v: boolean) => void;
  setIgnoreSchedule: (v: boolean) => void;
  setMapTimeSlot: (slot: string) => void;

  updateSchedule: (id: string, updated: HybridSchedule) => void;
  resetDraft: () => void;
}

export const useHybridStore = create<HybridDeploymentState>()(
  persist(
    (set) => ({
      weeklySchedules: [],
      selectedDate: new Date(),
      viewMode: 'planning',
      tabView: 'tactical',
      hasChanges: false,
      isReadOnly: false,
      ignoreSchedule: false,
      mapTimeSlot: '00:00 - 04:00',

      setWeeklySchedules: (data) => set({ weeklySchedules: data }),
      setSelectedDate: (date) => set({ selectedDate: date }),
      setViewMode: (mode) => set({ viewMode: mode }),
      setTabView: (view) => set({ tabView: view }),
      setHasChanges: (v) => set({ hasChanges: v }),
      setIsReadOnly: (v) => set({ isReadOnly: v }),
      setIgnoreSchedule: (v) => set({ ignoreSchedule: v }),
      setMapTimeSlot: (slot) => set({ mapTimeSlot: slot }),

      updateSchedule: (id, updated) =>
        set((state) => ({
          weeklySchedules: state.weeklySchedules.map((s) =>
            s.id === id ? updated : s,
          ),
          hasChanges: true,
        })),

      resetDraft: () =>
        set({
          weeklySchedules: [],
          hasChanges: false,
          isReadOnly: false,
        }),
    }),
    {
      name: 'hybrid-deployment-storage',
      partialize: (state) => ({
        weeklySchedules: state.weeklySchedules,
        selectedDate: state.selectedDate,
        viewMode: state.viewMode,
        tabView: state.tabView,
        hasChanges: state.hasChanges,
        isReadOnly: state.isReadOnly,
        ignoreSchedule: state.ignoreSchedule,
        mapTimeSlot: state.mapTimeSlot,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          if (typeof state.selectedDate === 'string') {
            state.selectedDate = new Date(state.selectedDate);
          }
          if (Array.isArray(state.weeklySchedules)) {
            state.weeklySchedules = state.weeklySchedules.map((d) => ({
              ...d,
              date: new Date(d.date as string),
            }));
          }
        }
      },
    },
  ),
);
