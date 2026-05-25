/**
 * @file Hook for MapLibre GL map initialization, marker rendering,
 * and boundary coloring on the hybrid deployment map view.
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { format } from 'date-fns';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';
import { useHybridStore } from '@/lib/store/hybrid_store';
import { getVehicleColor } from '../utils';
import type { HybridSchedule } from '../types';

export interface UseHybridMapRendererReturn {
  mapContainer: React.RefObject<HTMLDivElement | null>;
  isMapLoading: boolean;
}

/**
 * Manages the full MapLibre GL lifecycle for the hybrid deployment map.
 */
export function useHybridMapRenderer(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  boundariesData: any,
  dailyGroupedData: HybridSchedule[],
  setEditingShift: (s: HybridSchedule | null) => void,
): UseHybridMapRendererReturn {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const [isMapLoading, setIsMapLoading] = useState(true);
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = resolvedTheme || theme;

  const { tabView, mapTimeSlot, isReadOnly, weeklySchedules, setWeeklySchedules, setHasChanges } =
    useHybridStore();

  /** Clear existing markers and re-render. */
  const renderMarkers = useCallback(() => {
    if (!map.current || !map.current.loaded()) return;
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    if (tabView !== 'map') return;

    const dataToRender = dailyGroupedData.filter((d) => d.timeSlot === mapTimeSlot);

    dataToRender.forEach((item) => {
      const vColor = getVehicleColor(item.vehicleName);
      const cursorClass = isReadOnly ? 'cursor-default' : 'cursor-grab active:cursor-grabbing';
      const el = document.createElement('div');
      el.className = `flex flex-col items-center ${cursorClass} group hover:z-50`;
      el.innerHTML = `
        <div class="px-2 py-1 ${vColor.bg} ${vColor.text} rounded-full flex items-center justify-center shadow-lg border-2 border-white transform transition-transform group-hover:scale-110">
           <span class="font-bold text-[10px] whitespace-nowrap">${item.vehicleName}</span>
        </div>
        <div class="hidden group-hover:block bg-black text-white text-[10px] px-2 py-1 rounded mt-1 whitespace-nowrap z-50">
           ${item.vehicleName} - ${item.timeSlot}
        </div>`;

      const marker = new maplibregl.Marker({ element: el, draggable: !isReadOnly })
        .setLngLat([item.lng, item.lat])
        .addTo(map.current!);

      if (!isReadOnly) {
        marker.getElement().addEventListener('click', () => setEditingShift(item));
        marker.on('dragend', () => {
          const lngLat = marker.getLngLat();
          setWeeklySchedules(
            weeklySchedules.map((s) =>
              s.id === item.id
                ? { ...s, lat: lngLat.lat, lng: lngLat.lng, locationLabel: `Lat: ${lngLat.lat.toFixed(4)}, Lng: ${lngLat.lng.toFixed(4)}` }
                : s,
            ),
          );
          setHasChanges(true);
          toast.success(`${item.vehicleName} position updated.`, {
            description: `New location pinned on the map.`,
          });
        });
      }
      markersRef.current.set(item.id, marker);
    });

    // Boundary source + layers
    if (boundariesData && map.current) {
      if (!map.current.getSource('boundaries-source')) {
        map.current.addSource('boundaries-source', { type: 'geojson', data: boundariesData });
        map.current.addLayer({
          id: 'boundary-fill', type: 'fill', source: 'boundaries-source',
          paint: { 'fill-color': '#3b82f6', 'fill-opacity': 0 },
          filter: ['==', '$type', 'Polygon'],
        });
        map.current.addLayer({
          id: 'boundary-line', type: 'line', source: 'boundaries-source',
          paint: { 'line-color': '#1d4ed8', 'line-width': 1, 'line-dasharray': [2, 2], 'line-opacity': 0.3 },
        });
      } else {
        const source = map.current.getSource('boundaries-source') as maplibregl.GeoJSONSource;
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

      if (dataToRender.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const colorMatch: any[] = ['match', ['get', 'Brgy_Name']];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const opacityMatch: any[] = ['match', ['get', 'Brgy_Name']];
        const processedAreas = new Set<string>();

        dataToRender.forEach((item) => {
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
  }, [dailyGroupedData, tabView, mapTimeSlot, boundariesData, isReadOnly, weeklySchedules, setWeeklySchedules, setHasChanges, setEditingShift]);

  useEffect(() => { renderMarkers(); }, [renderMarkers]);

  // Initialize Map Once
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
          center: [122.5447, 10.7769], zoom: 13, pitch: 45,
        });
        map.current.on('load', () => {
          setIsMapLoading(false);
          renderMarkers();
          setTimeout(() => { if (map.current) map.current.resize(); }, 100);
        });
        setTimeout(() => setIsMapLoading(false), 10000);
      } catch {
        setIsMapLoading(false);
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      if (map.current) { map.current.remove(); map.current = null; }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  // Resize map when it becomes visible
  useEffect(() => {
    if (tabView === 'map' && map.current) {
      setTimeout(() => map.current?.resize(), 100);
    }
  }, [tabView]);

  const prevThemeRef = useRef(currentTheme);

  // Handle theme changes via setStyle
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
