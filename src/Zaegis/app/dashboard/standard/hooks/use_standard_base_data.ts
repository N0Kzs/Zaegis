/**
 * @file Hook for loading base data (personnel, vehicles, barangays, risk, saved plans).
 */

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';
import { getPatrolCars, getPersonnel, getBarangays } from '@/lib/actions/resources';
import { getDeploymentPlans, getSavedDeploymentWeeks } from '@/lib/actions/deployment';
import { getBarangayRiskAnalysis, type BarangayRiskData } from '@/app/dashboard/riskanalysis/risk_actons';
import { useStandardStore } from '@/lib/store/standard_store';
import type { Personnel, PatrolCar, Barangay, PatrolSchedule } from '../utils';

export function useStandardBaseData() {
  const {
    selectedWeekStart, setSchedules, setWeekHasBeenSaved,
  } = useStandardStore();

  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [patrolCars, setPatrolCars] = useState<PatrolCar[]>([]);
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTableLoading, setIsTableLoading] = useState(false);

  const [riskMap, setRiskMap] = useState<Map<string, number>>(new Map());
  const [maxRisk, setMaxRisk] = useState(1);

  const [historyWeeks, setHistoryWeeks] = useState<string[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const weekDates = useMemo(() => {
    const raw = new Date(selectedWeekStart);
    const start = isNaN(raw.getTime()) ? (() => {
      const now = new Date();
      const diff = now.getDay() === 0 ? -6 : 1 - now.getDay();
      const mon = new Date(now);
      mon.setDate(now.getDate() + diff);
      return mon;
    })() : raw;

    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(start, i);
      return {
        date: format(date, 'yyyy-MM-dd'),
        dayName: format(date, 'EEE'),
        dayNumber: format(date, 'd'),
      };
    });
  }, [selectedWeekStart]);

  useEffect(() => {
    const fetchRiskData = async () => {
      try {
        const res = await getBarangayRiskAnalysis(180);
        if (res.success && res.data) {
          const map = new Map<string, number>();
          let max = 1;
          res.data.forEach((b: BarangayRiskData) => {
            map.set(b.name, b.totalRisk);
            map.set(b.name.toUpperCase(), b.totalRisk);
            if (b.totalRisk > max) max = b.totalRisk;
          });
          setRiskMap(map);
          setMaxRisk(max);
        }
      } catch {
        // Risk data is non-critical
      }
    };
    fetchRiskData();
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [personnelRes, carsRes, barangaysRes] = await Promise.all([
        getPersonnel(), getPatrolCars(), getBarangays(),
      ]);

      const personnelData = personnelRes.success
        ? personnelRes.data.map((p: any) => ({
          id: String(p.id), name: `${p.firstName} ${p.lastName}`,
          position: p.position, contact: p.contact,
          weeklyHours: 0, hoursRemaining: 48, lastShiftDate: null,
          canStartShift: p.isAvailable && p.isActive,
          onDuty: false, currentTimeSlot: null,
        }))
        : [];

      setPersonnel(personnelData);
      setPatrolCars(carsRes.success ? carsRes.data : []);
      setBarangays(barangaysRes.success ? barangaysRes.data : []);
    } catch {
      toast.error('Could not load the required information. Please refresh the page.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkIfWeekSaved = useCallback(async () => {
    try {
      setIsTableLoading(true);
      let hasSavedData = false;
      const loadedSchedules: PatrolSchedule[] = [];

      for (const day of weekDates) {
        const result = await getDeploymentPlans(day.date);
        if (result.success && result.data?.schedules?.length > 0) {
          hasSavedData = true;
          const daySchedules = result.data.schedules.map((s: any) => ({
            id: String(s.id), timeSlot: s.timeSlot, date: s.date,
            patrolCar: s.patrolCar,
            personnel: Array.isArray(s.personnel)
              ? s.personnel.map((p: any) => ({
                id: String(p.id), name: p.name, position: p.position || '',
                contact: p.contact || '', weeklyHours: p.weeklyHours || 0,
                hoursRemaining: p.hoursRemaining || 48, lastShiftDate: p.lastShiftDate || null,
                canStartShift: p.canStartShift ?? true, onDuty: p.onDuty ?? false,
                currentTimeSlot: p.currentTimeSlot || null,
              }))
              : [],
            areas: Array.isArray(s.areas) ? s.areas : [],
            priority: s.priority,
          }));
          loadedSchedules.push(...daySchedules);
        }
      }

      setWeekHasBeenSaved(hasSavedData);
      if (hasSavedData && loadedSchedules.length > 0) {
        setSchedules(loadedSchedules);
      } else if (hasSavedData && loadedSchedules.length === 0) {
        toast.error('Could not load the saved schedules for this week. Please refresh and try again.');
      }
    } catch {
      toast.error('Could not load the deployment plans for this week. Please try again.');
    } finally {
      setIsTableLoading(false);
    }
  }, [weekDates, setSchedules, setWeekHasBeenSaved]);

  const fetchHistoryWeeks = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const result = await getSavedDeploymentWeeks();
      if (result.success && result.data) setHistoryWeeks(result.data);
    } catch {
      // Fail silently
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => { checkIfWeekSaved(); }, [selectedWeekStart]);
  useEffect(() => { fetchData(); fetchHistoryWeeks(); }, []);

  return {
    personnel, patrolCars, barangays,
    isLoading, isTableLoading,
    riskMap, maxRisk, weekDates,
    historyWeeks, isLoadingHistory, fetchHistoryWeeks,
    checkIfWeekSaved,
  };
}
