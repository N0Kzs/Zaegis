

'use client';

import { useEffect, useRef, useCallback, memo, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useTheme } from 'next-themes';
import type { CrimeMarkerFeature, HeatmapPoint } from '../types';
import { Layers } from 'lucide-react';

interface MapViewProps {
  markerFeatures: CrimeMarkerFeature[];
  showHeatmap: boolean;
  heatmapData: HeatmapPoint[];
  selectedLayer: 'none' | 'boundaries' | 'zoning';
  boundaryData: GeoJSONCollection | null;
  boundaryNameField: string | null;
  zoningData: GeoJSONCollection | null;
  zoningNameField: string | null;
  isLoadingHeatmap: boolean;
  isAnimating: boolean;
  animationProgress?: number;
  onMapReady: () => void;
}


interface GeoJSONCollection {
  type: string;
  features: GeoJSONFeature[];
}


interface GeoJSONFeature {
  properties?: Record<string, unknown>;
  [key: string]: unknown;
}


const HEATMAP_RADIUS_STOPS: [string, ...unknown[]] = [
  'interpolate',
  ['exponential', 2],
  ['zoom'],
  0, 2,
  8, 8,
  10, 12,
  12, 20,
  14, 30,
  16, 40,
  18, 50,
];



const MapView = memo(({
  markerFeatures,
  showHeatmap,
  heatmapData,
  selectedLayer,
  boundaryData,
  boundaryNameField,
  zoningData,
  zoningNameField,
  isLoadingHeatmap,
  isAnimating,
  animationProgress = 0,
  onMapReady,
}: MapViewProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [styleRevision, setStyleRevision] = useState(0);
  const [legendItems, setLegendItems] = useState<{name: string, color: string}[]>([]);
  const [is3D, setIs3D] = useState(false);
  const previousHeatmapDataRef = useRef<HeatmapPoint[]>([]);
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = resolvedTheme || theme;




  const easeInOutCubic = useCallback((t: number): number => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }, []);

  // Generates a distinct hex colour per boundary using the golden-angle hue approach.
  const generateColor = useCallback((index: number): string => {
    const goldenAngle = 137.508;
    const hue = (index * goldenAngle) % 360;
    const saturation = 60 + (index % 4) * 10;
    const lightness = 55 + (index % 3) * 10;

    const h = hue / 360;
    const s = saturation / 100;
    const l = lightness / 100;

    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    let r: number, g: number, b: number;
    if (s === 0) {
      r = g = b = l;
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    const toHex = (x: number) => {
      const hex = Math.round(x * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }, []);

  // Builds a MapLibre `match` expression mapping each feature name to a colour.
  const generateBoundaryColors = useCallback(
    (features: GeoJSONFeature[], nameField: string | null): unknown => {
      if (!nameField) return '#E8E8E8';

      const uniqueNames = new Map<string, number>();
      features.forEach((feature, index) => {
        const name = feature.properties?.[nameField] as string | undefined;
        if (name && !uniqueNames.has(name)) {
          uniqueNames.set(name, index);
        }
      });

      const colorExpression: unknown[] = ['match', ['get', nameField]];

      const items: {name: string, color: string}[] = [];
      Array.from(uniqueNames.entries()).forEach(([name, index]) => {
        const color = generateColor(index);
        colorExpression.push(name, color);
        items.push({ name, color });
      });

      colorExpression.push('#E8E8E8');
      
      items.sort((a, b) => a.name.localeCompare(b.name));
      setTimeout(() => setLegendItems(items), 0);
      
      return colorExpression;
    },
    [generateColor],
  );



  // Remove layers/sources safely, ignoring errors if they don't exist.
  const safeRemoveLayers = useCallback(
    (map: maplibregl.Map, layerIds: string[], sourceId?: string) => {
      layerIds.forEach((id) => {
        try {
          if (map.getLayer(id)) map.removeLayer(id);
        } catch {
          /* layer may already be removed */
        }
      });
      if (sourceId) {
        try {
          if (map.getSource(sourceId)) map.removeSource(sourceId);
        } catch {
          /* source may already be removed */
        }
      }
    },
    [],
  );


  const addBoundaryLayers = useCallback(
    (
      map: maplibregl.Map,
      data: GeoJSONCollection | null,
      nameField: string | null,
    ) => {
      const layerIds = ['boundary-labels', 'boundary-line', 'boundary-fill'];

      if (!data || !data.features || data.features.length === 0) {
        safeRemoveLayers(map, layerIds, 'boundaries');
        return;
      }

      safeRemoveLayers(map, layerIds, 'boundaries');

      map.addSource('boundaries', { type: 'geojson', data: data as never });

      let beforeLayerId: string | undefined;
      const layers = map.getStyle().layers;
      if (layers) {
        for (const layer of layers) {
          if (layer.id === 'heatmap' || layer.id === 'crime-markers') {
            beforeLayerId = layer.id;
            break;
          }
        }
      }

      const fillColor = generateBoundaryColors(data.features, nameField);

      map.addLayer(
        {
          id: 'boundary-fill',
          type: 'fill',
          source: 'boundaries',
          paint: {
            'fill-color': fillColor as never,
            'fill-opacity': 0.2,
          },
          filter: ['==', '$type', 'Polygon'],
        },
        beforeLayerId,
      );

      map.addLayer(
        {
          id: 'boundary-line',
          type: 'line',
          source: 'boundaries',
          paint: {
            'line-color': currentTheme === 'dark' ? '#fb7185' : '#d90a07',
            'line-width': 1.5,
            'line-opacity': currentTheme === 'dark' ? 0.6 : 0.4,
          },
        },
        beforeLayerId,
      );

      const labelField = nameField
        ? ['get', nameField]
        : [
            'coalesce',
            ['get', 'Brgy_Name'],
            ['get', 'ADM4_EN'],
            ['get', 'NAME'],
            ['get', 'name'],
            ['get', 'Name'],
            '',
          ];

      map.addLayer(
        {
          id: 'boundary-labels',
          type: 'symbol',
          source: 'boundaries',
          layout: {
            'text-field': labelField as never,
            'text-font': ['Noto Sans Regular'],
            'text-size': 12,
            'text-anchor': 'center',
            'text-max-width': 8,
            'text-allow-overlap': false,
            'text-ignore-placement': false,
          },
          paint: {
            'text-color': currentTheme === 'dark' ? '#f3f4f6' : '#374151',
            'text-halo-color': currentTheme === 'dark' ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.8)',
            'text-halo-width': 1.5,
          },
        },
        beforeLayerId,
      );
    },
    [generateBoundaryColors, safeRemoveLayers],
  );


  const addMarkerLayers = useCallback(
    (map: maplibregl.Map) => {
      if (map.getLayer('crime-markers')) map.removeLayer('crime-markers');
      if (map.getSource('crime-points')) map.removeSource('crime-points');

      if (markerFeatures.length === 0) return;

      map.addSource('crime-points', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: markerFeatures as never[],
        },
      });

      map.addLayer({
        id: 'crime-markers',
        type: 'circle',
        source: 'crime-points',
        paint: {
          'circle-color': currentTheme === 'dark' ? '#f43f5e' : '#d62323',
          'circle-radius': 6,
          'circle-stroke-width': 2,
          'circle-stroke-color': currentTheme === 'dark' ? '#1e293b' : '#ffffff',
          'circle-opacity': 0.9,
        },
      });

      map.on('click', 'crime-markers', (e) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: ['crime-markers'],
        });
        if (!features.length) return;

        const coordinates = (
          features[0].geometry as GeoJSON.Point
        ).coordinates.slice() as [number, number];
        const props = features[0].properties;

        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
          coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
        }

        const dateString = props?.dateCommitted
          ? new Date(props.dateCommitted as string).toLocaleString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            })
          : 'N/A';

        new maplibregl.Popup({ className: 'modern-popup' })
          .setLngLat(coordinates)
          .setHTML(
            `<div class="p-4 bg-card rounded-lg shadow-lg">
              <div class="font-semibold text-foreground text-lg mb-2">
                ${props?.incidentType || props?.offense || 'Crime Incident'}
              </div>
              <div class="space-y-1 text-sm text-muted-foreground">
                <div><span class="font-medium">Date &amp; Time:</span> ${dateString}</div>
                <div><span class="font-medium">Type:</span> ${props?.incidentType || 'N/A'}</div>
                <div><span class="font-medium">Offense:</span> ${props?.offense || 'N/A'}</div>
                <div><span class="font-medium">Category:</span> ${props?.offenseType || 'N/A'}</div>
                <div><span class="font-medium">Location:</span> ${props?.barangay || 'N/A'}</div>
              </div>
            </div>`,
          )
          .addTo(map);
      });

      map.on('mouseenter', 'crime-markers', () => {
        map.getCanvas().style.cursor = 'pointer';
      });

      map.on('mouseleave', 'crime-markers', () => {
        map.getCanvas().style.cursor = '';
      });
    },
    [markerFeatures],
  );



  // Converts weighted points to a GeoJSON FeatureCollection.
  const pointsToFeatureCollection = useCallback(
    (points: HeatmapPoint[]): GeoJSON.FeatureCollection => ({
      type: 'FeatureCollection',
      features: points.map((p) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [p.lng, p.lat],
        },
        properties: { weight: p.weight },
      })),
    }),
    [],
  );

  // Updates (or creates) the heatmap layer, morphing between frames during animation.
  const updateHeatmap = useCallback(
    (map: maplibregl.Map, data: HeatmapPoint[], morphProgress?: number) => {
      let finalData = data;
      let shouldStorePrevious = true;

      if (
        morphProgress !== undefined &&
        morphProgress > 0 &&
        morphProgress < 1 &&
        previousHeatmapDataRef.current.length > 0 &&
        isAnimating
      ) {
        const prevData = previousHeatmapDataRef.current;
        const easedProgress = easeInOutCubic(morphProgress);
        const dataMap = new Map<string, HeatmapPoint>();

        prevData.forEach((point) => {
          const key = `${point.lat.toFixed(6)},${point.lng.toFixed(6)}`;
          dataMap.set(key, {
            lat: point.lat,
            lng: point.lng,
            weight: point.weight * (1 - easedProgress),
          });
        });

        data.forEach((point) => {
          const key = `${point.lat.toFixed(6)},${point.lng.toFixed(6)}`;
          const existing = dataMap.get(key);
          if (existing) {
            dataMap.set(key, {
              lat: point.lat,
              lng: point.lng,
              weight: existing.weight + point.weight * easedProgress,
            });
          } else {
            dataMap.set(key, {
              lat: point.lat,
              lng: point.lng,
              weight: point.weight * easedProgress,
            });
          }
        });

        finalData = Array.from(dataMap.values()).filter((p) => p.weight > 0.01);
        shouldStorePrevious = false;
      }

      const source = map.getSource('heatmap-data') as
        | maplibregl.GeoJSONSource
        | undefined;

      if (source) {
        source.setData(pointsToFeatureCollection(finalData));
      } else {
        if (finalData.length === 0) return;

        map.addSource('heatmap-data', {
          type: 'geojson',
          data: pointsToFeatureCollection(finalData),
        });

        const paintProperties = isAnimating
          ? {
              'heatmap-weight': [
                'interpolate',
                ['linear'],
                ['get', 'weight'],
                0, 0,
                1, 1,
              ],
              'heatmap-intensity': [
                'interpolate',
                ['linear'],
                ['zoom'],
                0, 0.8,
                9, 1.2,
                14, 1.8,
              ],
              'heatmap-color': [
                'interpolate',
                ['linear'],
                ['heatmap-density'],
                0, 'rgba(33,102,172,0)',
                0.1, 'rgba(103,169,207,0.3)',
                0.3, 'rgba(209,229,240,0.5)',
                0.5, 'rgba(253,219,199,0.7)',
                0.7, 'rgba(239,138,98,0.85)',
                0.9, 'rgba(178,24,43,0.95)',
                1, 'rgba(103,0,31,1)',
              ],
              'heatmap-radius': HEATMAP_RADIUS_STOPS,
              'heatmap-opacity': 0.8,
            }
          : {
              'heatmap-weight': [
                'interpolate',
                ['linear'],
                ['get', 'weight'],
                0, 0,
                1, 1,
              ],
              'heatmap-intensity': [
                'interpolate',
                ['linear'],
                ['zoom'],
                0, 1,
                9, 1.5,
                14, 2,
              ],
              'heatmap-color': [
                'interpolate',
                ['linear'],
                ['heatmap-density'],
                0, 'rgba(33,102,172,0)',
                0.2, 'rgb(103,169,207)',
                0.4, 'rgb(209,229,240)',
                0.6, 'rgb(253,219,199)',
                0.8, 'rgb(239,138,98)',
                1, 'rgb(178,24,43)',
              ],
              'heatmap-radius': HEATMAP_RADIUS_STOPS,
              'heatmap-opacity': [
                'interpolate',
                ['linear'],
                ['zoom'],
                7, 0.85,
                14, 0.7,
              ],
            };

        map.addLayer({
          id: 'heatmap',
          type: 'heatmap',
          source: 'heatmap-data',
          minzoom: 8,
          maxzoom: isAnimating ? 20 : 16,
          paint: paintProperties as never,
        });
      }

      if (
        shouldStorePrevious &&
        (morphProgress === undefined ||
          morphProgress === 0 ||
          morphProgress >= 0.99)
      ) {
        previousHeatmapDataRef.current = data;
      }
    },
    [isAnimating, easeInOutCubic, pointsToFeatureCollection],
  );

  // Map initialisation

  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: currentTheme === 'dark' 
        ? 'https://tiles.openfreemap.org/styles/dark' 
        : 'https://tiles.openfreemap.org/styles/liberty',
      center: [122.5419, 10.7775],
      zoom: 12,
      bearing: 0,
      pitch: 0,
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    map.on('load', () => {
      setIsMapLoaded(true);
      map.resize();
      onMapReady();
    });

    const resizeObserver = new ResizeObserver(() => {
      map.resize();
    });
    resizeObserver.observe(mapContainerRef.current);

    mapRef.current = map;

    return () => {
      resizeObserver.disconnect();
      if (map) map.remove();
      mapRef.current = null;
      setIsMapLoaded(false);
    };
  }, [onMapReady, currentTheme]);

  // Handle theme changes via setStyle
  useEffect(() => {
    if (!mapRef.current || !isMapLoaded) return;
    
    const styleUrl = currentTheme === 'dark' 
      ? 'https://tiles.openfreemap.org/styles/dark' 
      : 'https://tiles.openfreemap.org/styles/liberty';
    
    // Only set style if it's actually different from current
    // Note: In a more robust implementation we'd check current style URL
    mapRef.current.setStyle(styleUrl);
    
    const handleStyleLoad = () => {
      setStyleRevision(prev => prev + 1);
    };

    mapRef.current.once('style.load', handleStyleLoad);
  }, [currentTheme]);

  // Reactive layer updates

  useEffect(() => {
    if (!mapRef.current || !isMapLoaded) return;
    const map = mapRef.current;

    addMarkerLayers(map);

    if (markerFeatures.length > 0 && !showHeatmap) {
      const bounds = new maplibregl.LngLatBounds();
      markerFeatures.forEach((feature) => {
        bounds.extend(feature.geometry.coordinates);
      });

      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 50, maxZoom: 15, duration: 1000 });
      }
    }
  }, [markerFeatures, addMarkerLayers, showHeatmap, isMapLoaded, styleRevision]);

  useEffect(() => {
    if (!mapRef.current || !isMapLoaded) return;
    const map = mapRef.current;

    const layerIds = ['boundary-fill', 'boundary-line', 'boundary-labels'];

    layerIds.forEach((id) => {
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, 'visibility', 'none');
      }
    });

    if (selectedLayer === 'boundaries' && boundaryData) {
      addBoundaryLayers(map, boundaryData, boundaryNameField);
      layerIds.forEach((id) => {
        if (map.getLayer(id)) {
          map.setLayoutProperty(id, 'visibility', 'visible');
        }
      });
    } else if (selectedLayer === 'zoning' && zoningData) {
      addBoundaryLayers(map, zoningData, zoningNameField);
      layerIds.forEach((id) => {
        if (map.getLayer(id)) {
          map.setLayoutProperty(id, 'visibility', 'visible');
        }
      });
    } else if (selectedLayer === 'none') {
      safeRemoveLayers(map, layerIds, 'boundaries');
    }
  }, [
    selectedLayer,
    boundaryData,
    boundaryNameField,
    zoningData,
    zoningNameField,
    addBoundaryLayers,
    safeRemoveLayers,
    isMapLoaded,
    styleRevision,
  ]);

  useEffect(() => {
    if (!mapRef.current || !isMapLoaded) return;
    const map = mapRef.current;

    if (showHeatmap) {
      if (map.getLayer('crime-markers')) {
        map.setLayoutProperty('crime-markers', 'visibility', 'none');
      }

      if (!isLoadingHeatmap && heatmapData.length > 0) {
        updateHeatmap(
          map,
          heatmapData,
          isAnimating ? animationProgress : undefined,
        );
      }
    } else {
      safeRemoveLayers(map, ['heatmap'], 'heatmap-data');
      previousHeatmapDataRef.current = [];

      if (map.getLayer('crime-markers')) {
        map.setLayoutProperty('crime-markers', 'visibility', 'visible');
      }
    }
  }, [
    showHeatmap,
    heatmapData,
    isLoadingHeatmap,
    updateHeatmap,
    isMapLoaded,
    isAnimating,
    animationProgress,
    safeRemoveLayers,
    styleRevision,
  ]);



  return (
    <div className="relative w-full h-full">
      <div
        ref={mapContainerRef}
        className="w-full h-full rounded-xl bg-muted/30 z-10"
      />

      {/* Legend Overlay */}
      {selectedLayer !== 'none' && legendItems.length > 0 && (
        <div className="absolute top-4 left-4 z-20 bg-background/80 backdrop-blur-md border border-border/50 rounded-xl shadow-lg p-4 max-h-[70%] flex flex-col w-56 animate-in fade-in slide-in-from-left-4 duration-300">
          <div className="flex items-center gap-2 mb-3 shrink-0 text-muted-foreground">
            <Layers className="h-4 w-4" />
            <h4 className="text-xs font-semibold uppercase tracking-wider">
              {selectedLayer === 'boundaries' ? 'Barangay Legend' : 'Zoning Legend'}
            </h4>
          </div>
          <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-2 custom-scrollbar">
            {legendItems.map((item) => (
              <div key={item.name} className="flex items-center gap-3 text-sm group">
                <span 
                  className="w-3.5 h-3.5 rounded-md shrink-0 shadow-sm border border-black/10 dark:border-white/10 group-hover:scale-110 transition-transform" 
                  style={{ backgroundColor: item.color }} 
                />
                <span className="truncate text-foreground/80 group-hover:text-foreground transition-colors" title={item.name}>
                  {item.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3D / 2D Toggle */}
      <div className="absolute bottom-6 left-4 z-20 group">
        <button
          onClick={() => {
            const map = mapRef.current;
            if (!map) return;
            if (is3D) {
              map.easeTo({ pitch: 0, bearing: 0, duration: 1000 });
              setIs3D(false);
            } else {
              map.easeTo({ pitch: 60, bearing: -20, duration: 1000 });
              setIs3D(true);
            }
          }}
          className="flex items-center gap-2 px-4 py-2 bg-background/80 backdrop-blur-md hover:bg-background/90 text-sm font-medium border border-border/50 rounded-xl shadow-lg transition-all"
        >
          {is3D ? 'Switch to 2D' : 'Switch to 3D'}
        </button>
        
        {/* Instructions Popover */}
        <div className="absolute bottom-full left-0 mb-3 w-64 p-3 bg-popover/90 backdrop-blur-md text-popover-foreground text-xs rounded-xl shadow-xl border border-border/50 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none translate-y-2 group-hover:translate-y-0">
          <p className="mb-1 font-semibold">3D Navigation Tips</p>
          <p className="text-muted-foreground leading-relaxed">
            Hold <kbd className="px-1.5 py-0.5 bg-muted rounded-md text-[10px] font-sans border border-border">Ctrl</kbd> or <kbd className="px-1.5 py-0.5 bg-muted rounded-md text-[10px] font-sans border border-border">⌘</kbd> and <strong>drag the map</strong> to manually rotate and change the pitch angle.
          </p>
        </div>
      </div>

      <style jsx global>{`
        .maplibregl-popup-content {
          padding: 0 !important;
          border-radius: 12px !important;
          box-shadow:
            0 20px 25px -5px rgba(0, 0, 0, 0.1),
            0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
          border: none !important;
          background-color: transparent !important;
        }

        .maplibregl-popup-tip {
          border-top-color: white !important;
        }
        .dark .maplibregl-popup-tip {
          border-top-color: #1f2937 !important;
        }

        .maplibregl-popup-close-button {
          color: #6b7280 !important;
          font-size: 18px !important;
          padding: 4px !important;
          margin: 4px !important;
          right: 4px !important;
          top: 4px !important;
          background-color: rgba(255, 255, 255, 0.7) !important;
          border-radius: 50% !important;
          width: 24px !important;
          height: 24px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          line-height: 1 !important;
        }

        .dark .maplibregl-popup-close-button {
          color: #9ca3af !important;
          background-color: rgba(31, 41, 55, 0.7) !important;
        }

        .maplibregl-popup-close-button:hover {
          color: #111827 !important;
          background-color: rgba(243, 244, 246, 0.9) !important;
        }
        .dark .maplibregl-popup-close-button:hover {
          color: #f3f4f6 !important;
          background-color: rgba(55, 65, 81, 0.9) !important;
        }

        /* Maplibregl Controls Glassmorphism Theme */
        .maplibregl-ctrl-group {
          background-color: rgba(255, 255, 255, 0.6) !important;
          backdrop-filter: blur(12px) !important;
          -webkit-backdrop-filter: blur(12px) !important;
          border: 1px solid rgba(255, 255, 255, 0.4) !important;
          border-radius: 12px !important;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
          overflow: hidden !important;
        }
        
        .dark .maplibregl-ctrl-group {
          background-color: rgba(15, 23, 42, 0.6) !important; /* slate-900 with opacity */
          border-color: rgba(255, 255, 255, 0.1) !important;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3) !important;
        }
        
        .maplibregl-ctrl-group button {
          background-color: transparent !important;
          border-bottom: 1px solid rgba(0, 0, 0, 0.05) !important;
          width: 32px !important;
          height: 32px !important;
        }
        
        .dark .maplibregl-ctrl-group button {
          border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
        }
        
        .maplibregl-ctrl-group button:last-child {
          border-bottom: none !important;
        }

        .maplibregl-ctrl-icon {
          filter: brightness(0.3) !important;
        }
        
        .dark .maplibregl-ctrl-icon {
          filter: brightness(0.8) invert(1) !important;
        }

        .maplibregl-ctrl-group button:hover {
          background-color: rgba(0, 0, 0, 0.05) !important;
        }
        
        .dark .maplibregl-ctrl-group button:hover {
          background-color: rgba(255, 255, 255, 0.1) !important;
        }

        /* Custom Scrollbar for Legend */
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(156, 163, 175, 0.5);
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
});

MapView.displayName = 'MapView';

export default MapView;
