import { Prisma } from '@prisma/client';

export interface CrimeIncident {
  blotterno: string;
  lat: number;
  lng: number;
  weight: number;
  offense: string;
  dateCommitted: Date | null;
  timeCommitted: Date | null;
}

export interface PatrolPosition {
  id?: number;
  lng: number;
  lat: number;
  label?: string;
}

export interface OptimizationConfig {
  numPatrolCars: number;
  urbanSpeed: number; // km/h
  mainRoadSpeed: number; // km/h
  rushHourMultiplier: number;
  algorithm: 'weighted-kmeans' | 'mclp';
  filterDateStart?: string;
  filterDateEnd?: string;
  filterTimeStart?: string;
  filterTimeEnd?: string;
  filterOffenseTypes?: string[];
  filterBarangays?: string[];
}

export interface ResponseTimeAnalytics {
  avgResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  medianResponseTime: number;
  coverageUnder5Min: number;
  coverageUnder10Min: number;
  coverageUnder15Min: number;
  totalIncidents: number;
  coveredIncidents: number;
}

/**
 * Check if a point is within Pavia boundaries using GeoJSON polygon
 * Works with individual barangay boundaries (union = Pavia)
 */
function isPointInPavia(lat: number, lng: number, boundaryGeoJSON: any): boolean {
  if (!boundaryGeoJSON || !boundaryGeoJSON.features) return true; // Fallback if no boundary data
  
  // First quick check: Is point within Pavia's bounding box?
  const bounds = getPaviaBounds(boundaryGeoJSON);
  if (lat < bounds.minLat || lat > bounds.maxLat || 
      lng < bounds.minLng || lng > bounds.maxLng) {
    return false; // Outside bounding box = definitely outside Pavia
  }
  
  // Detailed check: Is point in ANY barangay? (Union of barangays = Pavia)
  for (const feature of boundaryGeoJSON.features) {
    if (feature.geometry.type === 'Polygon') {
      if (isPointInPolygon([lng, lat], feature.geometry.coordinates[0])) {
        return true; // Found in a barangay = inside Pavia
      }
    } else if (feature.geometry.type === 'MultiPolygon') {
      for (const polygon of feature.geometry.coordinates) {
        if (isPointInPolygon([lng, lat], polygon[0])) {
          return true; // Found in a barangay = inside Pavia
        }
      }
    }
  }
  return false; // Not in any barangay = outside Pavia
}

/**
 * Point-in-polygon test using ray casting algorithm
 */
function isPointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
  const [x, y] = point;
  let inside = false;
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    
    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    
    if (intersect) inside = !inside;
  }
  
  return inside;
}

/**
 * Get bounding box of Pavia from GeoJSON
 */
function getPaviaBounds(boundaryGeoJSON: any): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
  if (!boundaryGeoJSON || !boundaryGeoJSON.features) {
    // Fallback bounds for Pavia if no boundary data
    return {
      minLat: 10.770,
      maxLat: 10.785,
      minLng: 122.535,
      maxLng: 122.550
    };
  }
  
  let minLat = Infinity, maxLat = -Infinity;
  let minLng = Infinity, maxLng = -Infinity;
  
  boundaryGeoJSON.features.forEach((feature: any) => {
    const coords = feature.geometry.type === 'Polygon' 
      ? feature.geometry.coordinates[0]
      : feature.geometry.coordinates[0][0];
    
    coords.forEach(([lng, lat]: [number, number]) => {
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
    });
  });
  
  return { minLat, maxLat, minLng, maxLng };
}

/**
 * Constrain a position to be within Pavia boundaries
 */
function constrainToPaviaBounds(
  position: PatrolPosition,
  boundaryGeoJSON: any
): PatrolPosition {
  if (isPointInPavia(position.lat, position.lng, boundaryGeoJSON)) {
    return position; // Already inside
  }
  
  // If outside, find nearest point inside Pavia
  const bounds = getPaviaBounds(boundaryGeoJSON);
  const centerLat = (bounds.minLat + bounds.maxLat) / 2;
  const centerLng = (bounds.minLng + bounds.maxLng) / 2;
  
  // Move point towards center in small steps until inside
  let adjustedLat = position.lat;
  let adjustedLng = position.lng;
  const steps = 20;
  
  for (let i = 1; i <= steps; i++) {
    adjustedLat = position.lat + (centerLat - position.lat) * (i / steps);
    adjustedLng = position.lng + (centerLng - position.lng) * (i / steps);
    
    if (isPointInPavia(adjustedLat, adjustedLng, boundaryGeoJSON)) {
      return { ...position, lat: adjustedLat, lng: adjustedLng };
    }
  }
  
  // Fallback to center
  return { ...position, lat: centerLat, lng: centerLng };
}

/**
 * Weighted K-means clustering algorithm with boundary constraint
 * Based on: Camacho-Collados & Liberatore (2015) - Police resource allocation
 */
export function weightedKMeans(
  crimes: CrimeIncident[],
  k: number,
  maxIterations = 100,
  boundaryGeoJSON?: any
): PatrolPosition[] {
  if (crimes.length === 0) {
    throw new Error('No crime data available for optimization');
  }

  if (k > crimes.length) {
    k = crimes.length;
  }

  // Initialize centroids using weighted random selection from crimes
  let centroids: PatrolPosition[] = [];
  const totalWeight = crimes.reduce((sum, c) => sum + c.weight, 0);
  const usedIndices = new Set<number>();

  while (centroids.length < k) {
    let random = Math.random() * totalWeight;
    let sum = 0;
    
    for (let i = 0; i < crimes.length; i++) {
      if (usedIndices.has(i)) continue;
      sum += crimes[i].weight;
      if (random <= sum) {
        centroids.push({
          lng: crimes[i].lng,
          lat: crimes[i].lat,
          label: `Patrol ${centroids.length + 1}`
        });
        usedIndices.add(i);
        break;
      }
    }
  }

  let iterations = 0;
  let converged = false;

  while (!converged && iterations < maxIterations) {
    // Assign crimes to nearest centroid
    const clusters: CrimeIncident[][] = Array(k).fill(null).map(() => []);
    
    crimes.forEach(crime => {
      let minDist = Infinity;
      let closestCentroid = 0;
      
      centroids.forEach((centroid, cIdx) => {
        const dist = haversineDistance(
          crime.lat, crime.lng,
          centroid.lat, centroid.lng
        );
        if (dist < minDist) {
          minDist = dist;
          closestCentroid = cIdx;
        }
      });
      
      clusters[closestCentroid].push(crime);
    });

    // Update centroids based on weighted average
    const newCentroids = clusters.map((cluster, idx) => {
      if (cluster.length === 0) {
        // Keep existing centroid if no crimes assigned
        return centroids[idx];
      }
      
      const totalWeight = cluster.reduce((sum, c) => sum + c.weight, 0);
      const weightedLng = cluster.reduce((sum, c) => sum + c.lng * c.weight, 0) / totalWeight;
      const weightedLat = cluster.reduce((sum, c) => sum + c.lat * c.weight, 0) / totalWeight;
      
      let newPosition: PatrolPosition = {
        lng: weightedLng,
        lat: weightedLat,
        label: centroids[idx].label
      };
      
      // Constrain to Pavia boundaries if boundary data provided
      if (boundaryGeoJSON) {
        newPosition = {
          ...constrainToPaviaBounds(newPosition, boundaryGeoJSON),
          label: centroids[idx].label
        };
      }
      
      return newPosition;
    });

    // Check convergence (centroids moved less than 0.0001 degrees ~11 meters)
    converged = centroids.every((c, idx) => 
      Math.abs(c.lng - newCentroids[idx].lng) < 0.0001 &&
      Math.abs(c.lat - newCentroids[idx].lat) < 0.0001
    );

    centroids = newCentroids;
    iterations++;
  }

  // Final boundary check for all positions
  if (boundaryGeoJSON) {
    centroids = centroids.map(pos => constrainToPaviaBounds(pos, boundaryGeoJSON));
  }

  return centroids;
}

/**
 * Maximum Coverage Location Problem (MCLP) approach with boundary constraint
 * Based on: Church & ReVelle (1974) - Emergency service optimization
 */
export function maximumCoverageOptimization(
  crimes: CrimeIncident[],
  k: number,
  coverageRadius = 2.0, // km
  boundaryGeoJSON?: any
): PatrolPosition[] {
  if (crimes.length === 0) {
    throw new Error('No crime data available for optimization');
  }

  const positions: PatrolPosition[] = [];
  const uncoveredCrimes = [...crimes];

  // If boundary data exists, also consider strategic points within Pavia
  let candidatePoints = [...crimes];
  
  if (boundaryGeoJSON) {
    // Add grid points across Pavia for better coverage
    const bounds = getPaviaBounds(boundaryGeoJSON);
    const gridSize = 5; // 5x5 grid
    
    for (let i = 0; i <= gridSize; i++) {
      for (let j = 0; j <= gridSize; j++) {
        const lat = bounds.minLat + (bounds.maxLat - bounds.minLat) * (i / gridSize);
        const lng = bounds.minLng + (bounds.maxLng - bounds.minLng) * (j / gridSize);
        
        if (isPointInPavia(lat, lng, boundaryGeoJSON)) {
          candidatePoints.push({
            blotterno: `grid-${i}-${j}`,
            lat,
            lng,
            weight: 0.1, // Lower weight for grid points
            offense: 'Grid Point',
            dateCommitted: null,
            timeCommitted: null
          });
        }
      }
    }
  }

  for (let i = 0; i < k && uncoveredCrimes.length > 0; i++) {
    let bestPosition: PatrolPosition | null = null;
    let maxCoverage = 0;

    // Try each candidate location
    candidatePoints.forEach(candidate => {
      let coverage = 0;
      
      uncoveredCrimes.forEach(crime => {
        const dist = haversineDistance(candidate.lat, candidate.lng, crime.lat, crime.lng);
        if (dist <= coverageRadius) {
          coverage += crime.weight;
        }
      });

      if (coverage > maxCoverage) {
        maxCoverage = coverage;
        const label = `Patrol ${i + 1}`;
        let position = {
          lng: candidate.lng,
          lat: candidate.lat,
          label
        };
        
        // Ensure position is within boundaries
        if (boundaryGeoJSON) {
          const constrained = constrainToPaviaBounds(position, boundaryGeoJSON);
          position = { ...constrained, label };
        }
        
        bestPosition = position;
      }
    });

    if (bestPosition) {
      positions.push(bestPosition);
      
      // Remove covered crimes
      const indicesToRemove: number[] = [];
      uncoveredCrimes.forEach((crime, idx) => {
        const dist = haversineDistance(
          bestPosition!.lat, bestPosition!.lng,
          crime.lat, crime.lng
        );
        if (dist <= coverageRadius) {
          indicesToRemove.push(idx);
        }
      });
      
      indicesToRemove.reverse().forEach(idx => {
        uncoveredCrimes.splice(idx, 1);
      });
    }
  }

  return positions;
}

/**
 * Calculate Haversine distance between two points (in km)
 */
export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * Math.PI / 180;
}

/**
 * Calculate response time analytics
 */
export function calculateResponseTimeAnalytics(
  positions: PatrolPosition[],
  crimes: CrimeIncident[],
  avgSpeed: number // km/h
): ResponseTimeAnalytics {
  if (positions.length === 0 || crimes.length === 0) {
    return {
      avgResponseTime: 0,
      maxResponseTime: 0,
      minResponseTime: 0,
      medianResponseTime: 0,
      coverageUnder5Min: 0,
      coverageUnder10Min: 0,
      coverageUnder15Min: 0,
      totalIncidents: crimes.length,
      coveredIncidents: 0
    };
  }

  const responseTimes = crimes.map(crime => {
    let minTime = Infinity;
    
    positions.forEach(pos => {
      const distance = haversineDistance(crime.lat, crime.lng, pos.lat, pos.lng);
      const time = (distance / avgSpeed) * 60; // Convert to minutes
      
      if (time < minTime) {
        minTime = time;
      }
    });
    
    return minTime;
  });

  responseTimes.sort((a, b) => a - b);

  return {
    avgResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
    maxResponseTime: Math.max(...responseTimes),
    minResponseTime: Math.min(...responseTimes),
    medianResponseTime: responseTimes[Math.floor(responseTimes.length / 2)],
    coverageUnder5Min: (responseTimes.filter(t => t <= 5).length / responseTimes.length) * 100,
    coverageUnder10Min: (responseTimes.filter(t => t <= 10).length / responseTimes.length) * 100,
    coverageUnder15Min: (responseTimes.filter(t => t <= 15).length / responseTimes.length) * 100,
    totalIncidents: crimes.length,
    coveredIncidents: responseTimes.filter(t => t <= 15).length
  };
}