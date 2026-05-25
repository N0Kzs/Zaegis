/**
 * @file Shared type definitions and re-exports for the 5MRT deployment module.
 *
 * Centralizes domain types, re-exports optimization types for convenience,
 * and defines local computed-data shapes used across hooks and components.
 */

import type {
  ProposedSchedule,
  PersonnelWithRelations,
  DeploymentConfig,
} from '@/lib/optimization/5mrt_optimization';

export type { ProposedSchedule, PersonnelWithRelations, DeploymentConfig };

/** Aggregated officer workload statistics for the utilization view. */
export interface OfficerStat {
  id: string;
  name: string;
  role: string;
  position: string;
  shifts: number;
  hours: number;
}

/** Pre-computed roster matrix passed to the RosterMatrixView component. */
export interface RosterMatrix {
  days: Date[];
  slots: string[];
  data: {
    person: PersonnelWithRelations;
    schedule: Record<string, string>;
  }[];
}

/** Daily shifts grouped by time-slot key. */
export type DailyGroupedData = Record<string, ProposedSchedule[]>;

/** Available shift filter values for the map overlay. */
export const SHIFT_FILTERS = ['All', 'Shift 1', 'Shift 2', 'Shift 3'] as const;
