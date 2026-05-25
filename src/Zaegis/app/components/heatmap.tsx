
'use client'; // Assuming this is for Next.js based on previous context

import React, { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export default function Heatmap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://tiles.stadiamaps.com/styles/alidade_smooth.json',
      center: [122.5419, 10.7775], // Same center as crime mapping
      zoom: 12,
    });

    // Add navigation control
    map.current.addControl(new maplibregl.NavigationControl());

    const currentMap = map.current;

    currentMap.on("load", async () => {
      console.log("Map loaded. Modifying style and adding heatmap data...");

      try {
        setIsLoading(true);
        // Fetch heatmap data from Flask API
        const response = await fetch('http://127.0.0.1:5000/heatmap-data');
        if (!response.ok) {
          throw new Error('Failed to fetch heatmap data');
        }
        const heatmapData = await response.json();

        // Add GeoJSON source for heatmap
        if (!currentMap.getSource("heatmap-data")) {
          currentMap.addSource("heatmap-data", {
            type: "geojson",
            data: {
              type: "FeatureCollection",
              features: heatmapData.map((point: [number, number, number]) => ({
                type: "Feature",
                geometry: {
                  type: "Point",
                  coordinates: [point[1], point[0]] // [lng, lat]
                },
                properties: {
                  intensity: point[2]
                }
              }))
            }
          });
          console.log("Heatmap source added with API data.");
        }

        // Add heatmap layer
        if (!currentMap.getLayer("heatmap")) {
          currentMap.addLayer({
            id: "heatmap",
            type: "heatmap",
            source: "heatmap-data",
            maxzoom: 15,
            paint: {
              "heatmap-weight": [
                "interpolate", ["linear"], ["get", "intensity"],
                0, 0,
                1, 1
              ],
              "heatmap-intensity": [
                "interpolate", ["linear"], ["zoom"],
                0, 1,
                15, 3
              ],
              "heatmap-color": [
                "interpolate", ["linear"], ["heatmap-density"],
                0, "rgba(33,102,172,0)",
                0.2, "rgb(103,169,207)",
                0.4, "rgb(209,229,240)",
                0.6, "rgb(253,219,199)",
                0.8, "rgb(239,138,98)",
                1, "rgb(178,24,43)"
              ],
              "heatmap-radius": [
                "interpolate", ["linear"], ["zoom"],
                0, 2,
                15, 20
              ],
              "heatmap-opacity": 0.7
            }
          });
          console.log("Heatmap layer added.");
        }
      } catch (error) {
        console.error("Error loading heatmap data:", error);
      } finally {
        setIsLoading(false);
      }
    });

    // Cleanup on unmount
    return () => {
      if (currentMap) {
        console.log("Map removing...");
        currentMap.remove();
        map.current = null;
      }
    };
  }, []);

  // useEffect to toggle heatmap layer opacity based on showHeatmap state
  useEffect(() => {
    if (map.current && map.current.isStyleLoaded() && map.current.getLayer("heatmap")) {
      console.log(`Setting heatmap opacity to: ${showHeatmap ? 1 : 0}`);
      map.current.setPaintProperty("heatmap", "heatmap-opacity", showHeatmap ? 0.7 : 0);
    }
  }, [showHeatmap]);

  return (
    <div className="relative w-full h-[600px] rounded-2xl overflow-hidden">
      <div
        ref={mapContainer}
        className="absolute inset-0 h-full w-full rounded-2xl overflow-hidden"
      />
      <button
        className={`absolute top-4 left-4 z-10 px-4 py-2 rounded-full border transition-all duration-200 ${
          showHeatmap 
            ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100' 
            : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
        }`}
        onClick={() => setShowHeatmap(!showHeatmap)}
        disabled={isLoading}
      >
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${showHeatmap ? 'bg-red-500' : 'bg-gray-400'}`}></div>
          <span className="text-sm font-medium">
            {isLoading ? "Loading..." : (showHeatmap ? "Hide Heatmap" : "Show Heatmap")}
          </span>
        </div>
      </button>
    </div>
  );
}