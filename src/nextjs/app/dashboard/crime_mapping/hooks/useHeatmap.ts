

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { getHeatmapData } from '@/lib/heatmapping/kde';
import type { FilterState, TimeStep, HeatmapPoint } from '../types';

interface UseHeatmapArgs {
  appliedFilters: FilterState;
  animationMode: 'none' | 'years' | 'months';
  currentTimeIndex: number;
  timeSteps: TimeStep[];
}

interface UseHeatmapReturn {
  showHeatmap: boolean;
  setShowHeatmap: (show: boolean) => void;
  heatmapData: HeatmapPoint[];
  isLoadingHeatmap: boolean;
  layerError: string | null;
  setLayerError: (error: string | null) => void;
}

// Fetches KDE data on filter change (static mode) or per-frame (animation mode).
export function useHeatmap({
  appliedFilters,
  animationMode,
  currentTimeIndex,
  timeSteps,
}: UseHeatmapArgs): UseHeatmapReturn {
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [heatmapData, setHeatmapData] = useState<HeatmapPoint[]>([]);
  const [isLoadingHeatmap, setIsLoadingHeatmap] = useState(false);
  const [layerError, setLayerError] = useState<string | null>(null);

  const heatmapCacheRef = useRef<Map<string, HeatmapPoint[]>>(new Map());

  const buildCacheKey = useCallback(
    (step: TimeStep): string => {
      return [
        step.year,
        step.month ?? 'year',
        appliedFilters.offenseTypes.join(','),
        appliedFilters.offenses.join(','),
        appliedFilters.incidentTypes.join(','),
        appliedFilters.barangays.join(','),
      ].join('-');
    },
    [appliedFilters],
  );


  const getHeatmapForTimeStep = useCallback(
    async (step: TimeStep): Promise<HeatmapPoint[]> => {
      const key = buildCacheKey(step);
      const cached = heatmapCacheRef.current.get(key);
      if (cached) return cached;

      const filters = {
        offenseTypes: appliedFilters.offenseTypes,
        offenses: appliedFilters.offenses,
        incidentTypes: appliedFilters.incidentTypes,
        barangays: appliedFilters.barangays,
        startDate: appliedFilters.startDate
          ? format(appliedFilters.startDate, 'yyyy-MM-dd')
          : undefined,
        endDate: appliedFilters.endDate
          ? format(appliedFilters.endDate, 'yyyy-MM-dd')
          : undefined,
        temporalView: step.month ? ('month' as const) : ('year' as const),
        selectedYear: step.year,
        selectedMonth: step.month,
        selectedDayOfWeek: undefined,
        isAnimating: true,
      };

      const data = await getHeatmapData(filters);
      heatmapCacheRef.current.set(key, data);
      return data;
    },
    [appliedFilters, buildCacheKey],
  );


  const updateStaticHeatmap = useCallback(async () => {
    try {
      setIsLoadingHeatmap(true);

      const filters = {
        offenseTypes: appliedFilters.offenseTypes,
        offenses: appliedFilters.offenses,
        incidentTypes: appliedFilters.incidentTypes,
        barangays: appliedFilters.barangays,
        startDate: appliedFilters.startDate
          ? format(appliedFilters.startDate, 'yyyy-MM-dd')
          : undefined,
        endDate: appliedFilters.endDate
          ? format(appliedFilters.endDate, 'yyyy-MM-dd')
          : undefined,
        temporalView: appliedFilters.temporalView,
        selectedYear: appliedFilters.selectedYear,
        selectedMonth: appliedFilters.selectedMonth,
        selectedDayOfWeek: appliedFilters.selectedDayOfWeek,
        isAnimating: false,
      };

      const data = await getHeatmapData(filters);
      setHeatmapData(data);
    } catch (error) {
      setLayerError(
        error instanceof Error ? error.message : 'Failed to generate heatmap',
      );
    } finally {
      setIsLoadingHeatmap(false);
    }
  }, [appliedFilters]);


  useEffect(() => {
    if (animationMode !== 'none' && showHeatmap && timeSteps[currentTimeIndex]) {
      getHeatmapForTimeStep(timeSteps[currentTimeIndex]).then(setHeatmapData);
    }
  }, [currentTimeIndex, animationMode, showHeatmap, timeSteps, getHeatmapForTimeStep]);


  useEffect(() => {
    if (showHeatmap && animationMode === 'none') {
      updateStaticHeatmap();
    }
  }, [showHeatmap, animationMode, updateStaticHeatmap]);


  useEffect(() => {
    if (animationMode === 'none') {
      heatmapCacheRef.current = new Map();
    }
  }, [animationMode]);

  return {
    showHeatmap,
    setShowHeatmap,
    heatmapData,
    isLoadingHeatmap,
    layerError,
    setLayerError,
  };
}
