

'use client';

import { useState, useEffect, useCallback } from 'react';
import { getBoundariesGeoJSON, getZoningGeoJSON } from '@/lib/actions/geo';
import type { LayerType } from '../types';

interface GeoJSONCollection {
  type: string;
  features: GeoJSONFeature[];
}

interface GeoJSONFeature {
  properties?: Record<string, unknown>;
  [key: string]: unknown;
}

interface UseGeoLayersReturn {
  boundaryData: GeoJSONCollection | null;
  boundaryNameField: string | null;
  zoningData: GeoJSONCollection | null;
  zoningNameField: string | null;
  selectedLayer: LayerType;
  setSelectedLayer: (layer: LayerType) => void;
  layerError: string | null;
  setLayerError: (error: string | null) => void;
}

// Property names to check when detecting the display name field in GeoJSON features.
const NAME_FIELD_CANDIDATES = [
  'Brgy_Name', 'ADM4_EN', 'NAME', 'name', 'Name',
  'BRGY', 'brgy', 'Barangay', 'BARANGAY', 'barangay',
  'AREA', 'area', 'Area', 'ZONE', 'zone', 'Zone', 'ZONA_LU',
  'REGION', 'region', 'Region', 'DISTRICT', 'district', 'District',
];

export function useGeoLayers(): UseGeoLayersReturn {
  const [boundaryData, setBoundaryData] = useState<GeoJSONCollection | null>(null);
  const [boundaryNameField, setBoundaryNameField] = useState<string | null>(null);
  const [zoningData, setZoningData] = useState<GeoJSONCollection | null>(null);
  const [zoningNameField, setZoningNameField] = useState<string | null>(null);
  const [selectedLayer, setSelectedLayer] = useState<LayerType>('none');
  const [layerError, setLayerError] = useState<string | null>(null);

  // Detect the best display-name property from the first feature.
  const detectNameField = useCallback((features: GeoJSONFeature[]): string | null => {
    if (!features || features.length === 0) return null;

    const properties = features[0].properties;
    if (!properties) return null;

    for (const candidate of NAME_FIELD_CANDIDATES) {
      if (
        Object.prototype.hasOwnProperty.call(properties, candidate) &&
        properties[candidate]
      ) {
        return candidate;
      }
    }

    for (const key of Object.keys(properties)) {
      if (typeof properties[key] === 'string' && (properties[key] as string).trim()) {
        return key;
      }
    }

    return null;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchLayers() {
      try {
        const [boundariesResult, zoningResult] = await Promise.all([
          getBoundariesGeoJSON(),
          getZoningGeoJSON(),
        ]);

        if (cancelled) return;

        if (boundariesResult) {
          const nameField = detectNameField(
            (boundariesResult as GeoJSONCollection).features || [],
          );
          setBoundaryData(boundariesResult as GeoJSONCollection);
          setBoundaryNameField(nameField);
        }

        if (zoningResult) {
          const nameField = detectNameField(
            (zoningResult as GeoJSONCollection).features || [],
          );
          setZoningData(zoningResult as GeoJSONCollection);
          setZoningNameField(nameField);
        }
      } catch {
        if (!cancelled) {
          setLayerError('Failed to load layer data from database');
        }
      }
    }

    fetchLayers();

    return () => {
      cancelled = true;
    };
  }, [detectNameField]);

  return {
    boundaryData,
    boundaryNameField,
    zoningData,
    zoningNameField,
    selectedLayer,
    setSelectedLayer,
    layerError,
    setLayerError,
  };
}
