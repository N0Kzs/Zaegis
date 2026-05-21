import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ProposedSchedule, PersonnelWithRelations } from '@/lib/optimization/5mrt-optimization';

// Define the interface for the store
export interface DeploymentState {
    // Data
    deploymentData: ProposedSchedule[];
    allPersonnelPool: PersonnelWithRelations[];

    // UI State
    selectedDate: Date;
    viewMode: 'planning' | 'history';
    tabView: 'daily' | 'weekly' | 'roster' | 'utilization';

    // Controls / Settings
    shiftPattern: 8 | 12;
    ignoreSchedule: boolean;
    activeShiftFilter: string;

    // State 
    hasChanges: boolean;
    isReadOnly: boolean;

    // Actions
    setDeploymentData: (data: ProposedSchedule[]) => void;
    setAllPersonnelPool: (pool: PersonnelWithRelations[]) => void;
    setSelectedDate: (date: Date) => void;
    setViewMode: (mode: 'planning' | 'history') => void;
    setTabView: (view: 'daily' | 'weekly' | 'roster' | 'utilization') => void;
    setShiftPattern: (pattern: 8 | 12) => void;
    setIgnoreSchedule: (ignore: boolean) => void;
    setActiveShiftFilter: (filter: string) => void;
    setHasChanges: (hasChanges: boolean) => void;
    setIsReadOnly: (isReadOnly: boolean) => void;

    // Helper Actions
    updateDeployment: (id: string, updates: Partial<ProposedSchedule>) => void;
    removeDeployment: (id: string) => void;
    resetDraft: () => void;
}

export const useDeploymentStore = create<DeploymentState>()(
    persist(
        (set) => ({
            // Initial State
            deploymentData: [],
            allPersonnelPool: [],
            selectedDate: new Date(),
            viewMode: 'planning',
            tabView: 'daily',
            shiftPattern: 12,
            ignoreSchedule: false,
            activeShiftFilter: 'Shift 1',
            hasChanges: false,
            isReadOnly: false,

            // Actions
            setDeploymentData: (data) => set({ deploymentData: data }),
            setAllPersonnelPool: (pool) => set({ allPersonnelPool: pool }),
            setSelectedDate: (date) => set({ selectedDate: date }),
            setViewMode: (mode) => set({ viewMode: mode }),
            setTabView: (view) => set({ tabView: view }),
            setShiftPattern: (pattern) => set({ shiftPattern: pattern }),
            setIgnoreSchedule: (ignore) => set({ ignoreSchedule: ignore }),
            setActiveShiftFilter: (filter) => set({ activeShiftFilter: filter }),
            setHasChanges: (changed) => set({ hasChanges: changed }),
            setIsReadOnly: (readOnly) => set({ isReadOnly: readOnly }),

            // Helpers
            updateDeployment: (id, updates) => set((state) => ({
                deploymentData: state.deploymentData.map((d) =>
                    d.id === id ? { ...d, ...updates } : d
                ),
                hasChanges: true
            })),

            removeDeployment: (id) => set((state) => ({
                deploymentData: state.deploymentData.filter((d) => d.id !== id),
                hasChanges: true
            })),

            resetDraft: () => set({
                deploymentData: [],
                hasChanges: false,
                isReadOnly: false,
                // Don't reset view preferences
            })
        }),
        {
            name: 'deployment-storage', // name of the item in the storage (must be unique)
            partialize: (state) => ({
                // Persist only these fields to localStorage
                deploymentData: state.deploymentData,
                selectedDate: state.selectedDate,
                shiftPattern: state.shiftPattern,
                ignoreSchedule: state.ignoreSchedule,
                viewMode: state.viewMode,
                tabView: state.tabView,
                hasChanges: state.hasChanges,
                isReadOnly: state.isReadOnly
            }),
            onRehydrateStorage: () => (state) => {
                if (state) {
                    if (typeof state.selectedDate === 'string') {
                        state.selectedDate = new Date(state.selectedDate);
                    }
                    if (Array.isArray(state.deploymentData)) {
                        state.deploymentData = state.deploymentData.map((d) => ({
                            ...d,
                            date: new Date(d.date)
                        }));
                    }
                }
            },
        }
    )
);
