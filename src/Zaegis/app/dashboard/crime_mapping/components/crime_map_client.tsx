'use client';

import { useCallback, useMemo, useState } from 'react';
import type { CrimeMapClientProps, FilterState } from '../types';
import { MONTHS, DAYS_OF_WEEK } from '../types';
import { useFilters } from '../hooks/use_filters';
import { useGeoLayers } from '../hooks/use_geo_layers';
import { useAnimation } from '../hooks/use_animation';
import { useHeatmap } from '../hooks/use_heatmap';
import MapToolbar from './map_toolbar';
import AnimationControls from './animation_controls';
import FilterDrawer from './filter_drawer';
import StatusBanners from './status_banners';
import MapView from './map_view';

// Returns a human-readable label for the current temporal context.
function buildTemporalDescription(
  appliedFilters: FilterState,
  animationMode: string,
  timeSteps: { label: string }[],
  currentTimeIndex: number,
): string {
  if (animationMode !== 'none' && timeSteps.length > 0) {
    return timeSteps[currentTimeIndex]?.label || 'Animation';
  }

  if (appliedFilters.temporalView === 'year' && appliedFilters.selectedYear) {
    return `Year: ${appliedFilters.selectedYear}`;
  }
  if (appliedFilters.temporalView === 'month' && appliedFilters.selectedMonth) {
    const month = MONTHS.find((m) => m.value === appliedFilters.selectedMonth);
    return `All ${month?.label}s`;
  }
  if (
    appliedFilters.temporalView === 'dayOfWeek' &&
    appliedFilters.selectedDayOfWeek !== undefined
  ) {
    const day = DAYS_OF_WEEK.find(
      (d) => d.value === appliedFilters.selectedDayOfWeek,
    );
    return `Every ${day?.label}`;
  }

  return 'All Time';
}

export default function CrimeMapClient({
  allLocations,
  barangayOptions,
}: CrimeMapClientProps) {
  const [, setIsMapReady] = useState(false);

  const animation = useAnimation({ allLocations });

  const filters = useFilters({
    allLocations,
    animationMode: animation.animationMode,
  });

  const geoLayers = useGeoLayers();

  const heatmap = useHeatmap({
    appliedFilters: filters.appliedFilters,
    animationMode: animation.animationMode,
    currentTimeIndex: animation.currentTimeIndex,
    timeSteps: animation.timeSteps,
  });

  const temporalDescription = useMemo(
    () =>
      buildTemporalDescription(
        filters.appliedFilters,
        animation.animationMode,
        animation.timeSteps,
        animation.currentTimeIndex,
      ),
    [
      filters.appliedFilters,
      animation.animationMode,
      animation.timeSteps,
      animation.currentTimeIndex,
    ],
  );

  const combinedLayerError = geoLayers.layerError || heatmap.layerError;

  const handleDismissError = useCallback(() => {
    geoLayers.setLayerError(null);
    heatmap.setLayerError(null);
  }, [geoLayers, heatmap]);

  const handleToggleHeatmap = useCallback(() => {
    heatmap.setShowHeatmap(!heatmap.showHeatmap);
  }, [heatmap]);

  const handleMapReady = useCallback(() => {
    setIsMapReady(true);
  }, []);

  const handleStartAnimation = useCallback(
    (mode: 'years' | 'months') => {
      animation.startAnimation(mode);
      heatmap.setShowHeatmap(true);
    },
    [animation, heatmap],
  );

  return (
    <div className="container mx-auto p-4 sm:p-6 min-h-screen flex flex-col">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            CRIME MAPPING
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visualize and analyze crime incidents geographically
          </p>
        </div>
      </div>

      <MapToolbar
        totalCount={allLocations.length}
        filteredCount={filters.filteredLocations.length}
        temporalDescription={temporalDescription}
        selectedLayer={geoLayers.selectedLayer}
        onLayerChange={geoLayers.setSelectedLayer}
        boundaryDataLoaded={!!geoLayers.boundaryData}
        zoningDataLoaded={!!geoLayers.zoningData}
        showHeatmap={heatmap.showHeatmap}
        isLoadingHeatmap={heatmap.isLoadingHeatmap}
        onToggleHeatmap={handleToggleHeatmap}
        activeFilterCount={filters.activeFilterCount}
        onOpenFilters={() => filters.setFiltersOpen(true)}
      />

      {heatmap.showHeatmap && (
        <AnimationControls
          animationMode={animation.animationMode}
          isAnimating={animation.isAnimating}
          currentTimeIndex={animation.currentTimeIndex}
          animationSpeed={animation.animationSpeed}
          animationProgress={animation.animationProgress}
          timeSteps={animation.timeSteps}
          onStartAnimation={handleStartAnimation}
          onStopAnimation={animation.stopAnimation}
          onTogglePlayPause={animation.togglePlayPause}
          onSkipToStart={animation.skipToStart}
          onSkipToEnd={animation.skipToEnd}
          onTimeIndexChange={animation.setCurrentTimeIndex}
          onSpeedChange={animation.setAnimationSpeed}
          onPause={() => animation.setIsAnimating(false)}
        />
      )}

      <StatusBanners
        showNoLayerBanner={!geoLayers.boundaryData && !geoLayers.zoningData}
        layerError={combinedLayerError}
        onDismissError={handleDismissError}
      />

      <div className="w-full h-[calc(100vh-250px)] min-h-[600px] relative rounded-xl overflow-hidden border border-border shadow-sm bg-card">
        <MapView
          markerFeatures={filters.markerFeatures}
          showHeatmap={heatmap.showHeatmap}
          heatmapData={heatmap.heatmapData}
          selectedLayer={geoLayers.selectedLayer}
          boundaryData={geoLayers.boundaryData}
          boundaryNameField={geoLayers.boundaryNameField}
          zoningData={geoLayers.zoningData}
          zoningNameField={geoLayers.zoningNameField}
          isLoadingHeatmap={heatmap.isLoadingHeatmap}
          isAnimating={animation.isAnimating}
          animationProgress={animation.animationProgress}
          onMapReady={handleMapReady}
        />
      </div>

      <FilterDrawer
        open={filters.filtersOpen}
        onOpenChange={filters.setFiltersOpen}
        draftFilters={filters.draftFilters}
        activeFilterCount={filters.activeFilterCount}
        availableYears={animation.availableYears}
        barangayOptions={barangayOptions}
        filterOptions={filters.filterOptions}
        onUpdateDraftFilter={filters.updateDraftFilter}
        onToggleFilter={filters.toggleFilter}
        onApply={filters.applyFilters}
        onClear={filters.clearFilters}
      />
    </div>
  );
}
