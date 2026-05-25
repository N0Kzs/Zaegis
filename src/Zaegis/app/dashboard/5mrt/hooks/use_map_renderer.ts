/**
 * @file Hook for MapLibre GL map initialization, marker rendering,
 * and boundary coloring on the deployment map view.
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { format } from 'date-fns';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useTheme } from 'next-themes';
import { useDeploymentStore } from '@/lib/store/deployment_store';
import { getShiftLabel, getVehicleColor } from '../utils';
import type { ProposedSchedule } from '../types';

/** Public API exposed by the `useMapRenderer` hook. */
export interface UseMapRendererReturn {
  mapContainer: React.RefObject<HTMLDivElement | null>;
  isMapLoading: boolean;
}

/**
 * Manages the full MapLibre GL lifecycle: initialization, marker placement,
 * boundary coloring, and cleanup. Renders markers based on current date,
 * shift filter, and deployment data from the Zustand store.
 *
 * @param boundariesData - GeoJSON feature collection for barangay boundaries
 * @param openEditModal - callback to open the edit modal when a marker is clicked
 */
export function useMapRenderer(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  boundariesData: any,
  openEditModal: (team: ProposedSchedule) => void,
  handleLocalUpdate: (id: string, updates: Partial<ProposedSchedule>) => void,
): UseMapRendererReturn {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const [isMapLoading, setIsMapLoading] = useState(true);
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = resolvedTheme || theme;

  const {
    deploymentData,
    selectedDate,
    shiftPattern,
    activeShiftFilter,
    isReadOnly,
    tabView,
    viewMode,
  } = useDeploymentStore();

  /** Clear existing markers and re-render based on current filters. */
  const renderMarkers = useCallback(() => {
    if (!map.current || !map.current.loaded()) return;
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    if (tabView !== 'daily' || viewMode !== 'planning') return;

    const visibleData = deploymentData.filter((d) => {
      const dataDate = format(new Date(d.date), 'yyyy-MM-dd');
      const viewDate = format(selectedDate, 'yyyy-MM-dd');
      const shiftLbl = getShiftLabel(d.timeSlot, shiftPattern);
      return (
        dataDate === viewDate &&
        (activeShiftFilter === 'All' || shiftLbl === activeShiftFilter)
      );
    });

    visibleData.forEach((item) => {
      const vColor = getVehicleColor(item.vehicleName);
      const el = document.createElement('div');
      const cursorClass = isReadOnly
        ? 'cursor-default'
        : 'cursor-grab active:cursor-grabbing';
      el.className = `flex flex-col items-center ${cursorClass} group hover:z-50`;
      el.innerHTML = `
        <div class="px-2 py-1 ${vColor.bg} ${vColor.text} rounded-full flex items-center justify-center shadow-lg border-2 border-white transform transition-transform group-hover:scale-110">
           <span class="font-bold text-[10px] whitespace-nowrap">${item.vehicleName}</span>
        </div>
        <div class="hidden group-hover:block bg-black text-white text-[10px] px-2 py-1 rounded mt-1 whitespace-nowrap z-50">
           ${item.vehicleName} - ${item.timeSlot}
        </div>`;

      const marker = new maplibregl.Marker({
        element: el,
        draggable: !isReadOnly,
      })
        .setLngLat([item.lng, item.lat])
        .addTo(map.current!);

      if (!isReadOnly) {
        marker.on('dragend', () => {
          const { lat, lng } = marker.getLngLat();
          handleLocalUpdate(item.id, { lat, lng });
        });
        marker.getElement().addEventListener('click', () => openEditModal(item));
      }
      markersRef.current.set(item.id, marker);
    });

    // Boundary source + layers
    if (boundariesData && map.current) {
      if (!map.current.getSource('boundaries-source')) {
        map.current.addSource('boundaries-source', {
          type: 'geojson',
          data: boundariesData,
        });
        map.current.addLayer({
          id: 'boundary-fill',
          type: 'fill',
          source: 'boundaries-source',
          paint: { 'fill-color': '#3b82f6', 'fill-opacity': 0 },
          filter: ['==', '$type', 'Polygon'],
        });
        map.current.addLayer({
          id: 'boundary-line',
          type: 'line',
          source: 'boundaries-source',
          paint: {
            'line-color': '#1d4ed8',
            'line-width': 1,
            'line-dasharray': [2, 2],
            'line-opacity': 0.3,
          },
        });
      } else {
        const source = map.current.getSource(
          'boundaries-source',
        ) as maplibregl.GeoJSONSource;
        source.setData(boundariesData);
      }
    }

    // Boundary coloring
    if (map.current?.getLayer('boundary-fill') && boundariesData) {
      const allBrgyNames = new Set<string>();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      boundariesData.features?.forEach((f: any) => {
        if (f.properties?.Brgy_Name) allBrgyNames.add(f.properties.Brgy_Name);
      });

      if (visibleData.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const colorMatch: any[] = ['match', ['get', 'Brgy_Name']];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const opacityMatch: any[] = ['match', ['get', 'Brgy_Name']];
        const processedAreas = new Set<string>();

        visibleData.forEach((item) => {
          const vColor = getVehicleColor(item.vehicleName);
          if (Array.isArray(item.coverageAreas) && item.coverageAreas.length > 0) {
            item.coverageAreas.forEach((areaString) => {
              if (!areaString || typeof areaString !== 'string') return;
              const areas = areaString.split(',').map((a) => a.trim()).filter(Boolean);
              areas.forEach((area) => {
                let matchName = area;
                if (!allBrgyNames.has(matchName)) matchName = area.toUpperCase();
                if (!processedAreas.has(matchName)) {
                  processedAreas.add(matchName);
                  colorMatch.push(matchName, vColor.hex);
                  opacityMatch.push(matchName, 0.35);
                }
              });
            });
          }
        });

        colorMatch.push('#E8E8E8');
        opacityMatch.push(0);

        if (colorMatch.length > 3) {
          try {
            map.current.setPaintProperty('boundary-fill', 'fill-color', colorMatch);
            map.current.setPaintProperty('boundary-fill', 'fill-opacity', opacityMatch);
          } catch {
            map.current.setPaintProperty('boundary-fill', 'fill-color', '#3b82f6');
            map.current.setPaintProperty('boundary-fill', 'fill-opacity', 0.1);
          }
        } else {
          map.current.setPaintProperty('boundary-fill', 'fill-opacity', 0);
        }
      } else {
        map.current.setPaintProperty('boundary-fill', 'fill-opacity', 0);
      }
    }

    setIsMapLoading(false);
  }, [
    deploymentData, selectedDate, shiftPattern, activeShiftFilter,
    isReadOnly, tabView, viewMode, boundariesData, openEditModal, handleLocalUpdate,
  ]);

  // Re-render markers when data or filters change.
  useEffect(() => {
    renderMarkers();
  }, [renderMarkers]);

  // Initialize the map on component mount
  useEffect(() => {
    if (map.current) return;
    if (!mapContainer.current) return;

    setIsMapLoading(true);

    const timer = setTimeout(() => {
      if (!mapContainer.current) return;
      try {
        map.current = new maplibregl.Map({
          container: mapContainer.current,
          style: currentTheme === 'dark' ? 'https://tiles.openfreemap.org/styles/dark' : 'https://tiles.openfreemap.org/styles/liberty',
          center: [122.5447, 10.7769],
          zoom: 13,
          pitch: 45,
        });
        map.current.on('load', () => {
          setIsMapLoading(false);
          renderMarkers();
          setTimeout(() => {
            if (map.current) map.current.resize();
          }, 100);
        });
        setTimeout(() => setIsMapLoading(false), 10000);
      } catch {
        setIsMapLoading(false);
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resize map when it becomes visible
  useEffect(() => {
    if (tabView === 'daily' && viewMode === 'planning' && map.current) {
      setTimeout(() => map.current?.resize(), 100);
    }
  }, [tabView, viewMode]);

  const prevThemeRef = useRef(currentTheme);

  // Handle dynamic theme changes without re-instantiating the map
  useEffect(() => {
    if (!map.current || isMapLoading) return;
    if (prevThemeRef.current === currentTheme) return;
    
    prevThemeRef.current = currentTheme;
    const styleUrl = currentTheme === 'dark' 
      ? 'https://tiles.openfreemap.org/styles/dark' 
      : 'https://tiles.openfreemap.org/styles/liberty';
      
    map.current.setStyle(styleUrl);
    
    map.current.once('style.load', () => {
      renderMarkers();
    });
  }, [currentTheme, isMapLoading, renderMarkers]);

  return { mapContainer, isMapLoading };
}
