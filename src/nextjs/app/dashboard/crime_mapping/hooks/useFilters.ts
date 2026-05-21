

'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import type { CrimeLocation } from '@/lib/types/crimes';
import type {
  FilterState,
  TemporalView,
  AnimationMode,
  CrimeMarkerFeature,
} from '../types';
import { DEFAULT_FILTER_STATE } from '../types';

interface UseFiltersArgs {
  allLocations: CrimeLocation[];
  animationMode: AnimationMode;
}

interface UseFiltersReturn {
  appliedFilters: FilterState;
  draftFilters: FilterState;
  filtersOpen: boolean;
  setFiltersOpen: (open: boolean) => void;
  updateDraftFilter: (key: keyof FilterState, value: FilterState[keyof FilterState]) => void;
  toggleFilter: (
    filterKey: 'offenseTypes' | 'offenses' | 'incidentTypes' | 'barangays',
    value: string,
  ) => void;
  applyFilters: () => void;
  clearFilters: () => void;
  activeFilterCount: number;
  filterOptions: {
    offenseTypes: string[];
    offenses: string[];
    incidentTypes: string[];
  };
  filteredLocations: CrimeLocation[];
  markerFeatures: CrimeMarkerFeature[];
}

// Uses a two-stage draft/applied model so changes in the filter drawer
// don't immediately affect the map.
export function useFilters({
  allLocations,
  animationMode,
}: UseFiltersArgs): UseFiltersReturn {
  const [appliedFilters, setAppliedFilters] = useState<FilterState>({ ...DEFAULT_FILTER_STATE });
  const [draftFilters, setDraftFilters] = useState<FilterState>({ ...DEFAULT_FILTER_STATE });
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    if (filtersOpen) {
      setDraftFilters(appliedFilters);
    }
  }, [filtersOpen, appliedFilters]);


  const updateDraftFilter = useCallback(
    (key: keyof FilterState, value: FilterState[keyof FilterState]) => {
      setDraftFilters((prev) => {
        const next = { ...prev, [key]: value };

        if (key === 'offenseTypes') {
          next.offenses = [];
          next.incidentTypes = [];
        } else if (key === 'offenses') {
          next.incidentTypes = [];
        } else if (key === 'temporalView') {
          if (value === 'year') {
            next.selectedMonth = undefined;
            next.selectedDayOfWeek = undefined;
          } else if (value === 'month') {
            next.selectedDayOfWeek = undefined;
          } else if (value === 'dayOfWeek') {
            next.selectedYear = undefined;
            next.selectedMonth = undefined;
          }
        }

        return next;
      });
    },
    [],
  );


  const toggleFilter = useCallback(
    (
      filterKey: 'offenseTypes' | 'offenses' | 'incidentTypes' | 'barangays',
      value: string,
    ) => {
      setDraftFilters((prev) => {
        const current = prev[filterKey];
        const updated = current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value];

        const next = { ...prev, [filterKey]: updated };

        if (filterKey === 'offenseTypes') {
          next.offenses = [];
          next.incidentTypes = [];
        } else if (filterKey === 'offenses') {
          next.incidentTypes = [];
        }

        return next;
      });
    },
    [],
  );


  const applyFilters = useCallback(() => {
    setAppliedFilters(draftFilters);
    setFiltersOpen(false);
  }, [draftFilters]);


  const clearFilters = useCallback(() => {
    setDraftFilters({ ...DEFAULT_FILTER_STATE });
    setAppliedFilters({ ...DEFAULT_FILTER_STATE });
  }, []);


  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (appliedFilters.offenseTypes.length > 0) count++;
    if (appliedFilters.offenses.length > 0) count++;
    if (appliedFilters.incidentTypes.length > 0) count++;
    if (appliedFilters.barangays.length > 0) count++;
    if (appliedFilters.startDate || appliedFilters.endDate) count++;
    return count;
  }, [appliedFilters]);

  // Available options that cascade based on current draft selections.
  const filterOptions = useMemo(() => {
    const offenseTypes = new Set<string>();
    const offenses = new Set<string>();
    const incidentTypes = new Set<string>();

    allLocations.forEach((loc) => {
      if (loc.offenseType) offenseTypes.add(loc.offenseType);

      if (
        draftFilters.offenseTypes.length === 0 ||
        draftFilters.offenseTypes.includes(loc.offenseType!)
      ) {
        if (loc.offense) offenses.add(loc.offense);
      }

      if (
        (draftFilters.offenses.length === 0 ||
          draftFilters.offenses.includes(loc.offense!)) &&
        (draftFilters.offenseTypes.length === 0 ||
          draftFilters.offenseTypes.includes(loc.offenseType!))
      ) {
        if (loc.incidentType) incidentTypes.add(loc.incidentType);
      }
    });

    return {
      offenseTypes: Array.from(offenseTypes).sort(),
      offenses: Array.from(offenses).sort(),
      incidentTypes: Array.from(incidentTypes).sort(),
    };
  }, [allLocations, draftFilters.offenseTypes, draftFilters.offenses]);


  const filteredLocations = useMemo(() => {
    return allLocations.filter((loc) => {
      if (
        appliedFilters.offenseTypes.length > 0 &&
        !appliedFilters.offenseTypes.includes(loc.offenseType!)
      )
        return false;

      if (
        appliedFilters.offenses.length > 0 &&
        !appliedFilters.offenses.includes(loc.offense!)
      )
        return false;

      if (
        appliedFilters.incidentTypes.length > 0 &&
        !appliedFilters.incidentTypes.includes(loc.incidentType!)
      )
        return false;

      if (
        appliedFilters.barangays.length > 0 &&
        !appliedFilters.barangays.includes(loc.barangay!)
      )
        return false;

      const locationDate = new Date(loc.dateCommitted!);

      if (animationMode === 'none') {
        if (
          appliedFilters.temporalView === 'year' &&
          appliedFilters.selectedYear &&
          locationDate.getFullYear() !== appliedFilters.selectedYear
        )
          return false;

        if (
          appliedFilters.temporalView === 'month' &&
          appliedFilters.selectedMonth &&
          locationDate.getMonth() + 1 !== appliedFilters.selectedMonth
        )
          return false;

        if (
          appliedFilters.temporalView === 'dayOfWeek' &&
          appliedFilters.selectedDayOfWeek !== undefined &&
          locationDate.getDay() !== appliedFilters.selectedDayOfWeek
        )
          return false;
      }

      if (appliedFilters.startDate) {
        const start = new Date(appliedFilters.startDate);
        start.setHours(0, 0, 0, 0);
        if (locationDate < start) return false;
      }

      if (appliedFilters.endDate) {
        const end = new Date(appliedFilters.endDate);
        end.setHours(23, 59, 59, 999);
        if (locationDate > end) return false;
      }

      return true;
    });
  }, [allLocations, appliedFilters, animationMode]);

  // GeoJSON features for map rendering.
  const markerFeatures = useMemo<CrimeMarkerFeature[]>(() => {
    return filteredLocations
      .filter((loc) => loc.lat != null && loc.lng != null)
      .map((loc) => ({
        type: 'Feature' as const,
        properties: {
          id: loc.id,
          offenseType: loc.offenseType,
          offense: loc.offense,
          incidentType: loc.incidentType,
          barangay: loc.barangay,
          dateCommitted: loc.dateCommitted,
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [loc.lng, loc.lat] as [number, number],
        },
      }));
  }, [filteredLocations]);

  return {
    appliedFilters,
    draftFilters,
    filtersOpen,
    setFiltersOpen,
    updateDraftFilter,
    toggleFilter,
    applyFilters,
    clearFilters,
    activeFilterCount,
    filterOptions,
    filteredLocations,
    markerFeatures,
  };
}
