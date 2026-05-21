/**
 * @file Hook for loading base data required by the Hybrid Deployment page.
 *
 * Fetches boundaries, risk data, patrol cars, saved plans for the
 * selected date, and history weeks. Reads/writes via the Zustand store.
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  getHybridDeploymentForDate,
  getHybridHistoryWeeks,
} from '@/lib/optimization/hybrid-optimizer';
import { getBoundariesGeoJSON } from '@/lib/actions/geo';
import { getPatrolCars } from '@/lib/actions/resources';
import {
  getBarangayRiskAnalysis,
  type BarangayRiskData,
} from '@/app/dashboard/riskanalysis/risk-actons';
import { useHybridStore } from '@/lib/store/hybrid-store';

export interface UseHybridBaseDataReturn {
  riskMap: Map<string, number>;
  maxRisk: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  boundariesData: any;
  allPatrolCars: { id: number; name: string; type: string; plateNumber: string; isAvailable: boolean; isActive: boolean }[];
  isLoadingPlan: boolean;
  historyWeeks: Date[];
  isLoadingHistory: boolean;
  loadHistoryWeeks: () => Promise<void>;
}

export function useHybridBaseData(): UseHybridBaseDataReturn {
  const {
    selectedDate,
    viewMode,
    hasChanges,
    setWeeklySchedules,
    setIsReadOnly,
    setHasChanges,
  } = useHybridStore();

  const [riskMap, setRiskMap] = useState<Map<string, number>>(new Map());
  const [maxRisk, setMaxRisk] = useState(1);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [boundariesData, setBoundariesData] = useState<any>(null);
  const [allPatrolCars, setAllPatrolCars] = useState<UseHybridBaseDataReturn['allPatrolCars']>([]);
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);
  const [historyWeeks, setHistoryWeeks] = useState<Date[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  /** Fetch boundaries, risk scores, and patrol cars on mount. */
  useEffect(() => {
    const load = async () => {
      try {
        const borders = await getBoundariesGeoJSON();
        if (borders) setBoundariesData(borders);
      } catch { /* non-critical */ }

      try {
        const res = await getBarangayRiskAnalysis(180);
        if (res.success && res.data) {
          const m = new Map<string, number>();
          let max = 1;
          res.data.forEach((b: BarangayRiskData) => {
            m.set(b.name, b.totalRisk);
            m.set(b.name.toUpperCase(), b.totalRisk);
            if (b.totalRisk > max) max = b.totalRisk;
          });
          setRiskMap(m);
          setMaxRisk(max);
        }
      } catch { /* non-critical */ }

      try {
        const res = await getPatrolCars();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (res.success && res.data) setAllPatrolCars(res.data as any);
      } catch { /* non-critical */ }
    };
    load();
  }, []);

  /** Load the saved hybrid deployment plan when the selected date changes. */
  useEffect(() => {
    if (hasChanges && viewMode === 'planning') return;
    if (viewMode !== 'planning') return;

    const loadPlan = async () => {
      setIsLoadingPlan(true);
      try {
        const res = await getHybridDeploymentForDate(selectedDate);
        if (useHybridStore.getState().hasChanges && viewMode === 'planning') return;

        if (res.success && res.data) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setWeeklySchedules(res.data as any[]);
          if (res.data.length > 0) {
            setIsReadOnly(true);
            setHasChanges(false);
          } else {
            setIsReadOnly(false);
          }
        } else {
          if (!useHybridStore.getState().hasChanges) setWeeklySchedules([]);
        }
      } catch {
        toast.error('Could not load the saved deployment plan. Please try refreshing.');
      } finally {
        setIsLoadingPlan(false);
      }
    };
    loadPlan();
  }, [selectedDate, hasChanges, viewMode]);

  /** Load history week dates for the history view. */
  const loadHistoryWeeks = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const res = await getHybridHistoryWeeks();
      if (res.success && res.data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setHistoryWeeks(res.data.map((d: any) => new Date(d)));
      }
    } catch { /* non-critical */ }
    finally { setIsLoadingHistory(false); }
  }, []);

  useEffect(() => {
    if (viewMode === 'history') {
      loadHistoryWeeks();
      setWeeklySchedules([]);
    }
  }, [viewMode, loadHistoryWeeks, setWeeklySchedules]);

  return {
    riskMap, maxRisk, boundariesData, allPatrolCars,
    isLoadingPlan, historyWeeks, isLoadingHistory, loadHistoryWeeks,
  };
}
