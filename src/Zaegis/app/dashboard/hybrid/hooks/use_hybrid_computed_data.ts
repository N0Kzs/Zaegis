/**
 * @file Hook for memoized computed data derived from hybrid deployment state.
 */

'use client';

import { useMemo } from 'react';
import { format, startOfWeek, addDays } from 'date-fns';
import { useHybridStore } from '@/lib/store/hybrid_store';
import { getRole } from '../utils';
import type { HybridSchedule, HybridPerson } from '../types';

export interface UseHybridComputedDataReturn {
  weekStart: Date;
  weekEnd: Date;
  weekDays: Date[];
  dailyGroupedData: HybridSchedule[];
  schedulesByDay: Record<string, HybridSchedule[]>;
  vehiclesInPlan: Map<number, string>;
  draftedPersonnel: HybridPerson[];
  allBarangaysInSchedule: string[];
  officerStats: { id: number; name: string; role: string; shifts: number; hours: number }[];
}

export function useHybridComputedData(): UseHybridComputedDataReturn {
  const { weeklySchedules, selectedDate } = useHybridStore();

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const dailyGroupedData = useMemo(() => {
    const currentDayStr = format(selectedDate, 'yyyy-MM-dd');
    return weeklySchedules
      .filter((d) => format(new Date(d.date), 'yyyy-MM-dd') === currentDayStr)
      .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));
  }, [weeklySchedules, selectedDate]);

  const schedulesByDay = useMemo(() => {
    const grouped: Record<string, HybridSchedule[]> = {};
    weekDays.forEach((day) => { grouped[format(day, 'yyyy-MM-dd')] = []; });
    weeklySchedules.forEach((schedule) => {
      const dayKey = format(new Date(schedule.date), 'yyyy-MM-dd');
      if (grouped[dayKey]) grouped[dayKey].push(schedule);
    });
    return grouped;
  }, [weeklySchedules, weekDays]);

  const vehiclesInPlan = useMemo(() => {
    const m = new Map<number, string>();
    weeklySchedules.forEach((s) => m.set(s.vehicleId, s.vehicleName));
    return m;
  }, [weeklySchedules]);

  const draftedPersonnel = useMemo(() => {
    const uniqueStaff = new Map<number, HybridPerson>();
    weeklySchedules.forEach((schedule) => {
      schedule.assignedPersonnel.forEach((person) => {
        if (!uniqueStaff.has(person.id)) uniqueStaff.set(person.id, person);
      });
    });
    return Array.from(uniqueStaff.values());
  }, [weeklySchedules]);

  const allBarangaysInSchedule = useMemo(() => {
    const set = new Set<string>();
    weeklySchedules.forEach((s) => { s.coverageAreas?.forEach((a) => set.add(a)); });
    return Array.from(set).sort();
  }, [weeklySchedules]);

  const officerStats = useMemo(() => {
    const stats: Record<number, { id: number; name: string; role: string; shifts: number; hours: number }> = {};
    weeklySchedules.forEach((d) => {
      d.assignedPersonnel.forEach((p) => {
        if (!stats[p.id]) {
          stats[p.id] = { id: p.id, name: p.name, role: getRole(p), shifts: 0, hours: 0 };
        }
        stats[p.id].shifts += 1;
        stats[p.id].hours += 4;
      });
    });
    return Object.values(stats).sort((a, b) => b.hours - a.hours);
  }, [weeklySchedules]);

  return {
    weekStart, weekEnd, weekDays,
    dailyGroupedData, schedulesByDay,
    vehiclesInPlan, draftedPersonnel, allBarangaysInSchedule, officerStats,
  };
}
