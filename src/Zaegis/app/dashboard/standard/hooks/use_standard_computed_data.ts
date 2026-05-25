/**
 * @file Memoized computed data: weekly stats, workload balance, filtered personnel/areas.
 */

'use client';

import { useMemo } from 'react';
import { useStandardStore } from '@/lib/store/standard_store';
import type { Personnel, Barangay, WeeklyStats } from '../utils';
import { convertTimeToMinutes, calculateWorkloadBalance } from '../utils';

interface UseStandardComputedDataOptions {
  personnel: Personnel[];
  barangays: Barangay[];
  searchPersonnel: string;
  searchAreas: string;
}

export function useStandardComputedData({
  personnel, barangays, searchPersonnel, searchAreas,
}: UseStandardComputedDataOptions) {
  const { schedules } = useStandardStore();

  const weeklyStats = useMemo((): WeeklyStats => {
    const personnelHours = new Map<string, number>();
    const areasSet = new Set<string>();
    const vehicleCount = new Map<string, number>();

    schedules.forEach((schedule) => {
      schedule.personnel?.forEach((p) => {
        const current = personnelHours.get(p.id) || 0;
        let slotHours = 120;
        if (schedule.timeSlot) {
          const parts = schedule.timeSlot.split(/\s*-\s*/);
          if (parts.length === 2) {
            const start = convertTimeToMinutes(parts[0].trim());
            let end = convertTimeToMinutes(parts[1].trim());
            if (end < start) end += 24 * 60; // Handle midnight crossing
            slotHours = end - start;
          }
        }
        personnelHours.set(p.id, current + slotHours / 60);
      });

      schedule.areas?.forEach((area) => areasSet.add(area));

      if (schedule.patrolCar) {
        vehicleCount.set(schedule.patrolCar, (vehicleCount.get(schedule.patrolCar) || 0) + 1);
      }
    });

    const avgHours = Array.from(personnelHours.values()).reduce((sum, h) => sum + h, 0) / Math.max(personnelHours.size, 1);

    const personnelUtilization = personnel.map((p) => {
      const hours = personnelHours.get(p.id) || 0;
      let status: 'underutilized' | 'balanced' | 'overworked' = 'balanced';
      if (hours < avgHours * 0.5 && hours > 0) status = 'underutilized';
      else if (hours > 48) status = 'overworked';
      return { id: p.id, name: p.name, hours, status };
    });

    const avgTeamSize = schedules.reduce((sum, s) => sum + (s.personnel?.length || 0), 0) / Math.max(schedules.length, 1);

    return {
      personnelUtilization,
      areasCovered: Array.from(areasSet),
      vehicleUsage: Array.from(vehicleCount.entries()).map(([name, shifts]) => ({ name, shifts })),
      totalShifts: schedules.length,
      avgTeamSize,
      coveragePercent: (areasSet.size / Math.max(barangays.length, 1)) * 100,
    };
  }, [schedules, personnel, barangays]);

  const workloadBalance = useMemo(() => {
    const personnelHours = new Map<string, number>();
    schedules.forEach((schedule) => {
      schedule.personnel?.forEach((p) => {
        const current = personnelHours.get(p.id) || 0;
        let slotHours = 120;
        if (schedule.timeSlot && schedule.timeSlot.includes('-')) {
          const parts = schedule.timeSlot.split(/\s*-\s*/);
          if (parts.length === 2) {
            const start = convertTimeToMinutes(parts[0].trim());
            let end = convertTimeToMinutes(parts[1].trim());
            if (end < start) end += 24 * 60; // Handle midnight crossing
            slotHours = end - start;
          }
        }
        personnelHours.set(p.id, current + slotHours / 60);
      });
    });
    return calculateWorkloadBalance(personnelHours);
  }, [schedules]);

  const getPersonnelAvailability = (person: Personnel) => {
    const hasReachedLimit = person.weeklyHours >= 48;
    return { isAvailable: !hasReachedLimit, reason: hasReachedLimit ? 'Weekly hours limit reached' : null };
  };

  const filteredPersonnel = useMemo(() =>
    personnel.filter((p) => {
      const match = p.name.toLowerCase().includes(searchPersonnel.toLowerCase());
      return match && getPersonnelAvailability(p).isAvailable;
    }), [personnel, searchPersonnel]);

  const unavailablePersonnel = useMemo(() =>
    personnel
      .filter((p) => {
        const match = p.name.toLowerCase().includes(searchPersonnel.toLowerCase());
        return match && !getPersonnelAvailability(p).isAvailable;
      })
      .map((p) => ({ ...p, unavailabilityReason: getPersonnelAvailability(p).reason })),
    [personnel, searchPersonnel]);

  const filteredAreas = useMemo(() =>
    barangays
      .filter((b) => b.barangays.toLowerCase().includes(searchAreas.toLowerCase()))
      .map((b) => b.barangays),
    [barangays, searchAreas]);

  return {
    weeklyStats, workloadBalance,
    filteredPersonnel, unavailablePersonnel, filteredAreas,
  };
}
