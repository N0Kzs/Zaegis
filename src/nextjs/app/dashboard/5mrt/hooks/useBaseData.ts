/**
 * @file Hook for loading base data required by the 5MRT deployment page.
 *
 * Fetches risk analysis, personnel pool, barangay list, GeoJSON boundaries,
 * and the saved deployment plan for the selected date. Respects draft
 * protection to avoid overwriting unsaved changes.
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  getDeploymentForDate,
  getAllPersonnel,
  getHistoryWeeks,
} from '@/lib/optimization/5mrt-optimization';
import { useDeploymentStore } from '@/lib/store/deployment-store';
import { getBoundariesGeoJSON } from '@/lib/actions/geo';
import { getBarangays } from '@/lib/actions/resources';
import {
  getBarangayRiskAnalysis,
  type BarangayRiskData,
} from '@/app/dashboard/riskanalysis/risk-actons';

/** Public API exposed by the `useBaseData` hook. */
export interface UseBaseDataReturn {
  riskMap: Map<string, number>;
  maxRisk: number;
  allBarangays: string[];
  boundariesData: GeoJSON.FeatureCollection | null;
  isLoadingPlan: boolean;
  historyWeeks: Date[];
  isLoadingHistory: boolean;
  loadHistoryWeeks: () => Promise<void>;
}

/**
 * Loads all foundational data for the deployment page:
 * risk scores, personnel, barangays, boundaries, and saved plans.
 */
export function useBaseData(): UseBaseDataReturn {
  const {
    allPersonnelPool,
    setAllPersonnelPool,
    selectedDate,
    viewMode,
    hasChanges,
    setDeploymentData,
    setShiftPattern,
    setIsReadOnly,
    setHasChanges,
  } = useDeploymentStore();

  const [riskMap, setRiskMap] = useState<Map<string, number>>(new Map());
  const [maxRisk, setMaxRisk] = useState(1);
  const [allBarangays, setAllBarangays] = useState<string[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [boundariesData, setBoundariesData] = useState<any>(null);
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);
  const [historyWeeks, setHistoryWeeks] = useState<Date[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  /** Fetch barangay risk scores for boundary heat-coloring. */
  useEffect(() => {
    const fetchRiskData = async () => {
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
      } catch {
        /* risk data is non-critical */
      }
    };
    fetchRiskData();
  }, []);

  /** Fetch personnel pool, barangay list, and GeoJSON boundaries on mount. */
  useEffect(() => {
    const loadBase = async () => {
      if (allPersonnelPool.length === 0) {
        const p = await getAllPersonnel();
        if (p.success && p.data) setAllPersonnelPool(p.data);
      }

      const b = await getBarangays();
      if (b.success && b.data) {
        const mapped = Array.isArray(b.data)
          ? b.data.map(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (item: any) =>
                typeof item === 'string'
                  ? item
                  : item.brgy_name || item.barangays || item.name,
            )
          : [];
        setAllBarangays(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          mapped.filter((x: any) => typeof x === 'string' && x.trim() !== '').sort(),
        );
      }

      try {
        const geoData = await getBoundariesGeoJSON();
        if (geoData) setBoundariesData(geoData);
      } catch {
        /* boundaries are non-critical */
      }
    };
    loadBase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Load the saved deployment plan when the selected date changes. */
  useEffect(() => {
    if (useDeploymentStore.getState().hasChanges && viewMode === 'planning')
      return;

    const loadPlan = async () => {
      setIsLoadingPlan(true);
      try {
        const res = await getDeploymentForDate(selectedDate);

        if (
          useDeploymentStore.getState().hasChanges &&
          viewMode === 'planning'
        )
          return;

        if (res.success && res.data) {
          setDeploymentData(res.data);
          if (res.data.length > 0) {
            setIsReadOnly(true);
            setHasChanges(false);
          } else {
            setIsReadOnly(false);
          }
          if (res.shiftPattern)
            setShiftPattern(res.shiftPattern as 8 | 12);
        } else {
          if (!useDeploymentStore.getState().hasChanges)
            setDeploymentData([]);
        }
      } catch {
        toast.error('Error loading plan');
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
      // @ts-ignore
      const res = await getHistoryWeeks();
      if (res.success && res.data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setHistoryWeeks(res.data.map((d: any) => new Date(d)));
      }
    } catch {
      /* history weeks are non-critical */
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (viewMode === 'history') loadHistoryWeeks();
  }, [viewMode, loadHistoryWeeks]);

  return {
    riskMap,
    maxRisk,
    allBarangays,
    boundariesData,
    isLoadingPlan,
    historyWeeks,
    isLoadingHistory,
    loadHistoryWeeks,
  };
}
