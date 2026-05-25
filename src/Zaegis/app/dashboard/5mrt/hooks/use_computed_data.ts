/**
 * @file Hook for memoized computed data derived from deployment state.
 *
 * Produces the roster matrix, daily grouped shifts, officer utilization
 * stats, and week-date helpers consumed by the various tab views.
 */

'use client';

import { useMemo } from 'react';
import { format, startOfWeek, addDays } from 'date-fns';
import { useDeploymentStore } from '@/lib/store/deployment_store';
import { getShiftLabel } from '../utils';
import type { OfficerStat, RosterMatrix, DailyGroupedData } from '../types';

/** Public API exposed by the `useComputedData` hook. */
export interface UseComputedDataReturn {
  weekStart: Date;
  weekEnd: Date;
  weekDays: Date[];
  rosterMatrix: RosterMatrix;
  dailyGroupedData: DailyGroupedData;
  officerStats: OfficerStat[];
}

/**
 * Derives all read-only computed values from the Zustand deployment store.
 * Each value is memoized and only recomputed when its dependencies change.
 */
export function useComputedData(): UseComputedDataReturn {
  const {
    deploymentData,
    allPersonnelPool,
    selectedDate,
    shiftPattern,
    activeShiftFilter,
  } = useDeploymentStore();

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  /** Per-officer assignment matrix for the roster view. */
  const rosterMatrix = useMemo<RosterMatrix>(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const days = Array.from({ length: 7 }).map((_, i) => addDays(start, i));

    const rawSlots = new Set<string>();
    deploymentData.forEach((d) => rawSlots.add(d.timeSlot));
    const uniqueSlots = Array.from(rawSlots).sort((a, b) => {
      return parseInt(a.split(':')[0]) - parseInt(b.split(':')[0]);
    });
    const defaultSlots =
      shiftPattern === 12
        ? ['08:00 - 20:00', '20:00 - 08:00']
        : ['08:00 - 16:00', '16:00 - 00:00', '00:00 - 08:00'];
    const displaySlots = uniqueSlots.length > 0 ? uniqueSlots : defaultSlots;

    const matrix: Record<
      string,
      { person: (typeof allPersonnelPool)[0]; schedule: Record<string, string> }
    > = {};

    const filtered = allPersonnelPool.filter((p) => {
      const r = (p.role?.name || '').toLowerCase();
      const pos = (p.position?.name || '').toLowerCase();
      return (
        r.includes('patrol') ||
        pos.includes('patrol') ||
        r.includes('operation') ||
        pos.includes('operation')
      );
    });

    filtered.forEach((p) => {
      matrix[p.id] = { person: p, schedule: {} };
    });

    deploymentData.forEach((d) => {
      const dateKey = format(new Date(d.date), 'yyyy-MM-dd');
      d.assignedPersonnel?.forEach((p) => {
        if (matrix[p.id]) {
          const key = `${dateKey}_${d.timeSlot}`;
          matrix[p.id].schedule[key] = d.vehicleName || 'On Duty';
        }
      });
    });

    return {
      days,
      slots: displaySlots,
      data: Object.values(matrix).sort((a, b) =>
        a.person.name.localeCompare(b.person.name),
      ),
    };
  }, [deploymentData, allPersonnelPool, selectedDate, shiftPattern]);

  /** Current day's shifts grouped by time-slot, filtered by active shift. */
  const dailyGroupedData = useMemo<DailyGroupedData>(() => {
    const currentDayStr = format(selectedDate, 'yyyy-MM-dd');
    return deploymentData
      .filter(
        (d) =>
          format(new Date(d.date), 'yyyy-MM-dd') === currentDayStr &&
          (activeShiftFilter === 'All' ||
            getShiftLabel(d.timeSlot, shiftPattern) === activeShiftFilter),
      )
      .reduce((acc, curr) => {
        if (!acc[curr.timeSlot]) acc[curr.timeSlot] = [];
        acc[curr.timeSlot].push(curr);
        return acc;
      }, {} as DailyGroupedData);
  }, [deploymentData, selectedDate, activeShiftFilter, shiftPattern]);

  /** Per-officer shift count and total hours for the utilization view. */
  const officerStats = useMemo<OfficerStat[]>(() => {
    const stats: Record<string, OfficerStat> = {};
    allPersonnelPool.forEach((p) => {
      stats[p.id] = {
        id: String(p.id),
        name: p.name,
        role: p.role.name,
        position: p.position.name,
        shifts: 0,
        hours: 0,
      };
    });
    deploymentData.forEach((d) => {
      d.assignedPersonnel.forEach((p) => {
        if (stats[p.id]) {
          stats[p.id].shifts += 1;
          stats[p.id].hours += shiftPattern;
        }
      });
    });
    return Object.values(stats)
      .filter((s) => s.shifts > 0)
      .sort((a, b) => b.hours - a.hours);
  }, [deploymentData, allPersonnelPool, shiftPattern]);

  return {
    weekStart,
    weekEnd,
    weekDays,
    rosterMatrix,
    dailyGroupedData,
    officerStats,
  };
}
