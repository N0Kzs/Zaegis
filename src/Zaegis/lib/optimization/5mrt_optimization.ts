"use server";

import { PrismaClient, Personnel, patrolCar, Position, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { format, startOfWeek, addDays, getDay } from "date-fns";

const prisma = new PrismaClient();

// ==========================================
// TYPES
// ==========================================

export type PersonnelWithRelations = Personnel & {
  position: Position;
  role: Role;
};

export interface DeploymentConfig {
  shiftDuration: number;
  startHour: number;
  minPerTeam: number;
  maxPerTeam: number;
  allowNonPatrol: boolean;
  patrolMinHours: number;
  patrolMaxHours: number;
  targetDate?: Date;
  lookbackDays?: number;
  ignoreDutySchedule?: boolean;
}

export interface ProposedSchedule {
  id: string;
  day: string;
  date: Date;
  timeSlot: string;
  vehicleId: number;
  vehicleName: string;
  lat: number;
  lng: number;
  locationLabel: string;
  assignedPersonnel: PersonnelWithRelations[];
  coverageAreas: string[];
  riskScore?: number;
  isActive: boolean;
}

interface BoundaryPolygon {
  id: number;
  name: string;
  coordinates: { lat: number; lng: number }[];
}

// ==========================================
// CONSTANTS
// ==========================================

const RANK_ORDER = [
  "NUP", "Pat", "PCpl", "PSSg", "PMSg", "PCMS", "PSMS", "PEMS",
  "PINSP", "PLT", "PCPT", "PCINSP", "PMAJ", "PSUPT", "PLTCOL", "PCOL", "PBGEN"
];

const ROLE_PRIORITY: Record<string, number> = {
  "Patrol": 0,
  "Operation": 1,
  "PCR": 99,
  "Intel": 99,
  "Investigation": 99,
  "Supply": 99,
  "HRDD": 99,
  "Admin": 99,
  "Radio Operator": 99,
  "Station Supervisor": 99,
  "Chief of Police": 99
};

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

function toRadians(deg: number) {
  return (deg * Math.PI) / 180;
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function normalizeBarangayName(name: string): string {
  return name.trim().toUpperCase().replace(/\s+/g, ' ');
}

async function getAdjacencyGraph(): Promise<Map<string, string[]>> {
  try {
    // @ts-ignore 
    const adj = await prisma.barangayAdjacency.findMany({});
    const graph = new Map<string, string[]>();

    adj.forEach((record: any) => {
      const a = normalizeBarangayName(record.barangayA);
      const b = normalizeBarangayName(record.barangayB);
      if (!graph.has(a)) graph.set(a, []);
      if (!graph.has(b)) graph.set(b, []);
      if (!graph.get(a)!.includes(b)) graph.get(a)!.push(b);
      if (!graph.get(b)!.includes(a)) graph.get(b)!.push(a);
    });

    console.log(`[ADJ GRAPH] Raw records: ${adj.length}, Unique nodes: ${graph.size}`);
    if (graph.size > 0) {
      const sample = Array.from(graph.entries()).slice(0, 3);
      sample.forEach(([k, v]) => console.log(`  ${k} → [${v.join(', ')}]`));
    }

    return graph;
  } catch (e) {
    console.error('[ADJ GRAPH] Error fetching adjacency:', e);
    return new Map();
  }
}

// ✅ NEW: Ray-Casting Algorithm for In-Memory Check
function isPointInPolygon(
  lat: number,
  lng: number,
  polygon: { lat: number; lng: number }[]
): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng, yi = polygon[i].lat;
    const xj = polygon[j].lng, yj = polygon[j].lat;

    const intersect = ((yi > lat) !== (yj > lat))
      && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);

    if (intersect) inside = !inside;
  }
  return inside;
}

// ✅ FIX: K-Means++ Initialization + Weighted Fallback
function weightedKMeans(
  dataPoints: { lat: number, lng: number, weight: number, riskScore?: number }[],
  k: number
) {
  const STATION_LAT = 10.776;
  const STATION_LNG = 122.545;

  if (dataPoints.length === 0) {
    return Array(k).fill(0).map((_, i) => ({
      lat: STATION_LAT + (Math.random() * 0.01 - 0.005),
      lng: STATION_LNG + (Math.random() * 0.01 - 0.005),
      label: `Patrol Area ${i + 1}`,
      riskScore: 0
    }));
  }

  let centroids: { lat: number; lng: number; label: string; riskScore: number }[] = [];

  // 1. K-Means++ Initialization
  const sortedPoints = [...dataPoints].sort((a, b) => b.weight - a.weight);
  centroids.push({
    lat: sortedPoints[0].lat,
    lng: sortedPoints[0].lng,
    label: 'Hotspot 1',
    riskScore: sortedPoints[0].weight
  });

  while (centroids.length < k) {
    let maxDistSq = -1;
    let nextCentroid = null;
    let nextWeight = 0;

    for (const p of dataPoints) {
      let minDistSq = Infinity;
      for (const c of centroids) {
        const d = haversine(p.lat, p.lng, c.lat, c.lng);
        const dSq = d * d;
        if (dSq < minDistSq) minDistSq = dSq;
      }

      // ✅ FIX: Removed weight multiplier as requested
      const weightedDist = minDistSq; // Pure distance based

      if (weightedDist > maxDistSq) {
        maxDistSq = weightedDist;
        nextCentroid = p;
        nextWeight = p.weight;
      }
    }

    if (nextCentroid) {
      centroids.push({
        lat: nextCentroid.lat,
        lng: nextCentroid.lng,
        label: `Patrol Area ${centroids.length + 1}`,
        riskScore: nextWeight
      });
    } else {
      const randomBase = centroids[Math.floor(Math.random() * centroids.length)];
      centroids.push({
        lat: randomBase.lat + 0.005,
        lng: randomBase.lng + 0.005,
        label: `Secondary Area ${centroids.length + 1}`,
        riskScore: 0
      });
    }
  }

  // 2. Standard K-Means Iterations
  const MAX_ITERATIONS = 15;
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const clusters: typeof dataPoints[] = Array(k).fill(null).map(() => []);

    dataPoints.forEach(p => {
      let minDist = Infinity, idx = 0;
      centroids.forEach((cent, ci) => {
        const dist = haversine(p.lat, p.lng, cent.lat, cent.lng);
        if (dist < minDist) { minDist = dist; idx = ci; }
      });
      clusters[idx].push(p);
    });

    centroids = centroids.map((currentCentroid, idx) => {
      const cluster = clusters[idx];
      if (!cluster || cluster.length === 0) return currentCentroid;

      const weightSum = cluster.reduce((sum, c) => sum + c.weight, 0);
      let newLat = cluster.reduce((sum, c) => sum + c.lat * c.weight, 0) / weightSum;
      let newLng = cluster.reduce((sum, c) => sum + c.lng * c.weight, 0) / weightSum;

      if (isNaN(newLat) || isNaN(newLng)) {
        newLat = currentCentroid.lat;
        newLng = currentCentroid.lng;
      }

      const clusterRiskScore = weightSum / cluster.length;

      return {
        lat: newLat,
        lng: newLng,
        label: `Area ${idx + 1}`,
        riskScore: clusterRiskScore
      };
    });
  }
  return centroids;
}

// ✅ REMOVED: isPointInBoundary (Database version)
// ✅ REMOVED: snapCoordinatesToRoads

async function getAllBarangaysWithCentroids(): Promise<Array<{ name: string; lat: number; lng: number; risk: number; areaSqm: number; population: number }>> {
  try {
    const barangays: any[] = await prisma.$queryRaw`
      SELECT b.brgy_name,
             ST_Y(ST_Centroid(b.geometry)) as lat,
             ST_X(ST_Centroid(b.geometry)) as lng,
             ST_Area(ST_Transform(b.geometry, 32651)) as area_sqm,
             COALESCE(p.population, b.population, 0) as pop
      FROM boundaries b
      LEFT JOIN population p ON UPPER(p.barangays) = UPPER(b.brgy_name)
      WHERE b.brgy_name IS NOT NULL
      ORDER BY b.brgy_name
    `;
    return barangays.map(b => ({
      name: normalizeBarangayName(b.brgy_name),
      lat: Number(b.lat),
      lng: Number(b.lng),
      risk: 1,
      areaSqm: Number(b.area_sqm || 0),
      population: Number(b.pop || 0)
    }));
  } catch (error) {
    console.error('getAllBarangaysWithCentroids error:', error);
    return [];
  }
}

// =========================================================
//  BFS-BASED SEED SELECTION
//  Picks k seeds maximally spread across the adjacency graph
// =========================================================
function selectSpreadSeeds(
  adjacencyGraph: Map<string, string[]>,
  allBarangays: string[],
  k: number,
  barangayRiskMap: Map<string, number>,
  rotationIndex: number = 0
): string[] {
  if (allBarangays.length <= k) return [...allBarangays];

  // BFS distance from a source node to all reachable nodes
  const bfsDistances = (source: string): Map<string, number> => {
    const dist = new Map<string, number>();
    dist.set(source, 0);
    const queue = [source];
    let head = 0;
    while (head < queue.length) {
      const current = queue[head++];
      const neighbors = adjacencyGraph.get(current) || [];
      for (const n of neighbors) {
        if (!dist.has(n)) {
          dist.set(n, (dist.get(current) || 0) + 1);
          queue.push(n);
        }
      }
    }
    return dist;
  };

  const seeds: string[] = [];

  // First seed = rotate among the top-weighted barangays based on rotationIndex
  // This ensures different shifts/days start from different areas
  const sortedByRisk = [...allBarangays].sort((a, b) =>
    (barangayRiskMap.get(b) || 0) - (barangayRiskMap.get(a) || 0)
  );
  const seedPoolSize = Math.max(k, Math.min(sortedByRisk.length, k * 2));
  const firstSeedIdx = rotationIndex % seedPoolSize;
  const firstSeed = sortedByRisk[firstSeedIdx];
  seeds.push(firstSeed);

  // Store BFS distances from each seed
  const allDistances: Map<string, number>[] = [bfsDistances(firstSeed)];

  // Subsequent seeds = max min-BFS-distance from all existing seeds
  while (seeds.length < k) {
    let bestCandidate: string | null = null;
    let bestMinDist = -1;

    for (const name of allBarangays) {
      if (seeds.includes(name)) continue;
      // Minimum BFS distance from this candidate to any existing seed
      let minDist = Infinity;
      for (const distMap of allDistances) {
        const d = distMap.get(name);
        if (d !== undefined && d < minDist) minDist = d;
      }
      // If unreachable (disconnected), treat as maximum spread
      if (minDist === Infinity) minDist = 100;
      if (minDist > bestMinDist) {
        bestMinDist = minDist;
        bestCandidate = name;
      }
    }

    if (bestCandidate) {
      seeds.push(bestCandidate);
      allDistances.push(bfsDistances(bestCandidate));
    } else {
      break;
    }
  }

  return seeds;
}

// =========================================================
//  CRIME-WEIGHT-BALANCED GRAPH PARTITIONING
//  Zones are balanced by total crime weight, not count
// =========================================================
function distributeBarangaysAcrossTeams(
  allBarangays: Array<{ name: string; lat: number; lng: number; risk: number; areaSqm?: number; population?: number }>,
  adjacencyGraph: Map<string, string[]>,
  numTeams: number,
  barangayRiskMap: Map<string, number>,
  rotationIndex: number = 0
): string[][] {
  const totalBrgys = allBarangays.length;
  const assignments: string[][] = Array.from({ length: numTeams }, () => []);
  const teamWeights: number[] = Array(numTeams).fill(0);
  const unassigned = new Set(allBarangays.map(b => b.name));

  // Build lookup
  const brgyLookup = new Map<string, typeof allBarangays[0]>();
  allBarangays.forEach(b => brgyLookup.set(b.name, b));

  // Crime weight per barangay (use the actual weights from crime_weights table)
  const getWeight = (name: string): number => barangayRiskMap.get(name) || 0;

  // Total crime weight across all barangays
  const totalWeight = allBarangays.reduce((sum, b) => sum + getWeight(b.name), 0);
  const avgWeightPerTeam = totalWeight / numTeams;

  // Identify high-risk barangays (top-k by weight — each gets its own team)
  const sortedByWeight = [...allBarangays]
    .map(b => ({ name: b.name, weight: getWeight(b.name) }))
    .sort((a, b) => b.weight - a.weight);
  const highRiskBarangays = new Set<string>();
  sortedByWeight.slice(0, numTeams).forEach(e => {
    if (e.weight > 0) highRiskBarangays.add(e.name);
  });

  // Get adjacent unassigned neighbors
  const getAdjacentCandidates = (cluster: string[]): string[] => {
    const neighbors = new Set<string>();
    cluster.forEach(brgyName => {
      const adj = adjacencyGraph.get(brgyName) || [];
      adj.forEach(n => { if (unassigned.has(n)) neighbors.add(n); });
    });
    return Array.from(neighbors);
  };

  // ====================================================
  // PHASE 1: Select spread seeds via BFS distance
  // ====================================================
  const seeds = selectSpreadSeeds(
    adjacencyGraph,
    allBarangays.map(b => b.name),
    numTeams,
    barangayRiskMap,
    rotationIndex
  );

  console.log(`[PARTITION] Seeds (BFS-spread): [${seeds.join(', ')}]`);
  console.log(`[PARTITION] Total crime weight: ${totalWeight}, Avg per team: ${avgWeightPerTeam.toFixed(1)}`);
  console.log(`[PARTITION] High-risk areas: [${Array.from(highRiskBarangays).join(', ')}]`);

  // Assign seeds to teams
  seeds.forEach((seed, i) => {
    if (i < numTeams && unassigned.has(seed)) {
      assignments[i].push(seed);
      teamWeights[i] += getWeight(seed);
      unassigned.delete(seed);
    }
  });

  // ====================================================
  // PHASE 2: Balanced growth by CRIME WEIGHT
  //   Lightest-load team picks first each round.
  //   STRICT adjacency enforcement.
  //   High-risk separation: max 1 high-risk per team.
  // ====================================================
  let rounds = 0;
  const MAX_ROUNDS = totalBrgys * 2;
  while (unassigned.size > 0 && rounds < MAX_ROUNDS) {
    rounds++;
    let anyProgress = false;

    // Sort teams by TOTAL CRIME WEIGHT ascending — lightest-load picks first
    const sortedTeamIndices = Array.from({ length: numTeams }, (_, i) => i)
      .sort((a, b) => teamWeights[a] - teamWeights[b]);

    for (const ti of sortedTeamIndices) {
      if (unassigned.size === 0) break;

      let candidates = getAdjacentCandidates(assignments[ti]);

      // High-risk separation: if team already has one, filter others out
      const teamHasHighRisk = assignments[ti].some(a => highRiskBarangays.has(a));
      if (teamHasHighRisk) {
        const filtered = candidates.filter(c => !highRiskBarangays.has(c));
        if (filtered.length > 0) candidates = filtered;
      }

      // STRICT: only adjacent candidates
      if (candidates.length === 0) continue;

      // Pick candidate that best balances the team's weight
      // Prefer: adjacent, higher crime weight (gives balanced spread),
      //         higher population, larger area
      let bestName: string | null = null;
      let bestScore = -Infinity;
      for (const name of candidates) {
        const b = brgyLookup.get(name);
        if (!b) continue;
        const crimeW = getWeight(name);
        const pop = b.population || 0;
        const area = b.areaSqm || 0;
        // Score: crime weight * 10 (primary) + population + area
        const score = (crimeW * 10) + (pop / 1000) + (area / 500_000);
        if (score > bestScore) { bestScore = score; bestName = name; }
      }

      if (bestName) {
        assignments[ti].push(bestName);
        teamWeights[ti] += getWeight(bestName);
        unassigned.delete(bestName);
        anyProgress = true;
      }
    }

    if (!anyProgress) break;
  }

  // ====================================================
  // PHASE 3: Orphans — assign to lightest-weight team
  //   that shares an adjacency edge, or lightest overall.
  // ====================================================
  if (unassigned.size > 0) {
    const orphans = Array.from(unassigned);
    for (const name of orphans) {
      const teamsByWeight = Array.from({ length: numTeams }, (_, i) => i)
        .sort((a, b) => teamWeights[a] - teamWeights[b]);

      let bestTeam = -1;
      for (const t of teamsByWeight) {
        const isAdj = assignments[t].some(a => {
          const adj = adjacencyGraph.get(a) || [];
          return adj.includes(name);
        });
        if (isAdj) { bestTeam = t; break; }
      }
      if (bestTeam < 0) bestTeam = teamsByWeight[0];

      assignments[bestTeam].push(name);
      teamWeights[bestTeam] += getWeight(name);
      unassigned.delete(name);
    }
  }

  // DEBUG: Final assignments with weights
  console.log(`[PARTITION] Final assignments (${rounds} rounds):`);
  assignments.forEach((a, i) =>
    console.log(`  Team ${i} (weight=${teamWeights[i].toFixed(0)}, count=${a.length}): [${a.join(', ')}]`)
  );

  return assignments;
}

// =========================================================
//  PART 1: SLOT GENERATION (Crime-Weighted Graph Partition)
// =========================================================
async function generateShiftsForDay(
  date: Date,
  config: DeploymentConfig,
  resources: { allVehicles: patrolCar[], allCrimes: any[], adjacencyGraph: Map<string, string[]> },
  barangayRiskMap: Map<string, number>,
  allBarangaysWithLocations: any[],
  boundaries: BoundaryPolygon[]
): Promise<ProposedSchedule[]> {

  const { allVehicles, allCrimes, adjacencyGraph } = resources;
  const shiftsPerDay = 24 / config.shiftDuration;
  const dayShifts: ProposedSchedule[] = [];
  const dayName = format(date, 'EEEE');

  const vehicleCount = allVehicles.length || 1;

  for (let i = 0; i < shiftsPerDay; i++) {
    const startH = (config.startHour + (i * config.shiftDuration)) % 24;
    const endH = (startH + config.shiftDuration) % 24;
    const timeSlot = `${startH.toString().padStart(2, '0')}:00 - ${endH.toString().padStart(2, '0')}:00`;

    // Build time-specific risk map (crimes in this time slot on this day)
    const shiftRiskMap = new Map<string, number>();
    allCrimes.forEach(c => {
      if (!c.timeCommitted || !c.lat || !c.lng) return;
      const cDate = new Date(c.timeCommitted);
      if (format(cDate, 'EEEE') !== dayName) return;
      const h = cDate.getHours();
      const inSlot = startH < endH ? (h >= startH && h < endH) : (h >= startH || h < endH);
      if (!inSlot) return;

      const name = normalizeBarangayName(c.barangay || '');
      if (name) {
        const weight = c.weight?.weight || 1;
        shiftRiskMap.set(name, (shiftRiskMap.get(name) || 0) + weight);
      }
    });

    // Use the overall barangayRiskMap merged with shift-specific data
    // (shift-specific amplifies areas active in this time slot)
    const combinedRiskMap = new Map(barangayRiskMap);
    shiftRiskMap.forEach((shiftWeight, name) => {
      const baseWeight = combinedRiskMap.get(name) || 0;
      // Shift-specific crimes count 2x to emphasize temporal patterns
      combinedRiskMap.set(name, baseWeight + shiftWeight);
    });

    // ====================================================
    // GRAPH PARTITION: Crime-Weight-Balanced Assignment
    //   rotationIndex varies per day + shift for zone rotation
    // ====================================================
    const dayOfWeekIdx = getDay(date); // 0=Sun, 1=Mon, ...
    const rotationIndex = dayOfWeekIdx * shiftsPerDay + i;
    const assignments = distributeBarangaysAcrossTeams(
      allBarangaysWithLocations,
      adjacencyGraph,
      vehicleCount,
      combinedRiskMap,
      rotationIndex
    );

    // ====================================================
    // PATROL POSITIONING: Crime-Weighted Centroid per Zone
    //   Position = Σ(brgy_pos × crime_weight) / Σ(crime_weight)
    //   Falls back to geographic centroid if no crimes
    // ====================================================
    const currentShifts = allVehicles.map((v, idx) => {
      const zoneBarangays = assignments[idx] || [];
      let lat: number, lng: number;
      let totalZoneWeight = 0;

      if (zoneBarangays.length > 0) {
        let wLat = 0, wLng = 0;
        zoneBarangays.forEach(name => {
          const b = allBarangaysWithLocations.find((x: any) => x.name === name);
          if (!b) return;
          const w = Math.max(combinedRiskMap.get(name) || 0, 1); // min weight 1
          wLat += b.lat * w;
          wLng += b.lng * w;
          totalZoneWeight += w;
        });
        lat = wLat / totalZoneWeight;
        lng = wLng / totalZoneWeight;
      } else {
        // No zone assigned — use center of all barangays
        lat = allBarangaysWithLocations.reduce((s: number, b: any) => s + b.lat, 0) / allBarangaysWithLocations.length;
        lng = allBarangaysWithLocations.reduce((s: number, b: any) => s + b.lng, 0) / allBarangaysWithLocations.length;
      }

      // Validate position is within boundaries
      let isValid = false;
      for (const poly of boundaries) {
        if (isPointInPolygon(lat, lng, poly.coordinates)) {
          isValid = true;
          break;
        }
      }
      if (!isValid) {
        // Snap to nearest zone barangay centroid
        let nearest = allBarangaysWithLocations[0];
        let minDist = Infinity;
        const searchPool = zoneBarangays.length > 0
          ? zoneBarangays.map(n => allBarangaysWithLocations.find((x: any) => x.name === n)).filter(Boolean)
          : allBarangaysWithLocations;
        for (const b of searchPool) {
          const d = haversine(lat, lng, b.lat, b.lng);
          if (d < minDist) { minDist = d; nearest = b; }
        }
        if (nearest) { lat = nearest.lat; lng = nearest.lng; }
      }

      return {
        id: `shift-${format(date, 'yyyyMMdd')}-${i}-${v.id}`,
        day: dayName,
        date: date,
        timeSlot,
        vehicleId: v.id,
        vehicleName: v.name,
        lat,
        lng,
        locationLabel: `Sector ${idx + 1}`,
        assignedPersonnel: [],
        coverageAreas: zoneBarangays,
        riskScore: totalZoneWeight,
        isActive: true
      };
    });

    dayShifts.push(...currentShifts);
  }
  return dayShifts;
}

// =========================================================
//  PART 2: RESOURCE ALLOCATION (Optimization Solver)
// =========================================================
function assignPersonnelToShifts(
  emptyShifts: ProposedSchedule[],
  allPersonnel: PersonnelWithRelations[],
  config: DeploymentConfig
): ProposedSchedule[] {

  // ✅ CHANGED: Sort Chronologically for Fatigue Management
  const sortedShifts = [...emptyShifts].sort((a, b) => {
    // 1. Date (Ascending)
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    if (dateA !== dateB) return dateA - dateB;

    // 2. Start Time (Ascending)
    const startA = parseInt(a.timeSlot.split(':')[0]);
    const startB = parseInt(b.timeSlot.split(':')[0]);
    return startA - startB;
  });

  const hoursTracker = new Map<number, number>();
  const lastShiftEndTime = new Map<number, Date>();
  const consecutiveHoursTracker = new Map<number, number>();

  // --- ASSIGNMENT LOOP ---
  return sortedShifts.map(shift => {
    const staffNeeded = config.minPerTeam;
    const assigned: PersonnelWithRelations[] = [];
    const [startStr, endStr] = shift.timeSlot.split(' - ');

    // Determine exact Shift Times
    const shiftStart = new Date(shift.date);
    shiftStart.setHours(parseInt(startStr.split(':')[0]), 0, 0, 0);

    const shiftEnd = new Date(shift.date);
    let endHour = parseInt(endStr.split(':')[0]);
    if (endHour < parseInt(startStr.split(':')[0])) {
      shiftEnd.setDate(shiftEnd.getDate() + 1); // Crosses midnight
    }
    shiftEnd.setHours(endHour, 0, 0, 0);

    const isAvailableForShift = (person: PersonnelWithRelations) => {
      // 1. FATIGUE MANAGEMENT (Zombie Fix)
      // MUST be fresh (at least 8h break since last shift)
      const lastEnd = lastShiftEndTime.get(person.id);
      if (lastEnd) {
        // Enforce 8-hour break between unconnected shifts
        const diffMs = shiftStart.getTime() - lastEnd.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);

        // REJECT scattered shifts: if the gap is greater than 0 but less than 8 hours
        if (diffHours > 0 && diffHours < 8) return false;

        // Allow contiguous shifts (diffHours === 0), but CAP at 12 consecutive hours
        if (diffHours === 0) {
          const currentConsecutive = consecutiveHoursTracker.get(person.id) || config.shiftDuration;
          if (currentConsecutive + config.shiftDuration > 12) return false;
        }
      }

      // 2. Role Check (ALWAYS enforced)
      if (person.role.name !== "Patrol" && person.role.name !== "Operation") return false;

      // 3. Status Check (ALWAYS enforced)
      // "Ignore Schedule" should not override "Suspended/On Leave" (isAvailable=false)
      if (!person.isActive || !person.isAvailable) return false;

      // 4. Schedule/Duty Constraints
      // If ignoreDutySchedule is TRUE, we skip these specific checks
      if (!config.ignoreDutySchedule) {
        // Duty Days Check
        if (person.dutyDays) {
          const availableDays = person.dutyDays.split(',').map(d => d.trim().substring(0, 3));
          const shiftDay = format(shift.date, 'EEE');
          if (!availableDays.includes(shiftDay)) return false;
        }

        // Night Patrol Check
        const startH = parseInt(startStr.split(':')[0]);
        const isNight = startH >= 20 || startH < 8;
        if (isNight && person.role.canPatrolAtNight === false) return false;
      }

      return true;
    };

    const candidates = allPersonnel.filter(p => isAvailableForShift(p));

    // ✅ REFINED PRIORITY LOGIC
    const getPriorityScore = (p: PersonnelWithRelations) => {
      const currentHours = hoursTracker.get(p.id) || 0;
      const maxHours = 48; // Operations Max
      const patrolMax = config.patrolMaxHours || 48;

      const role = p.role.name;
      const willBeOvertime = currentHours + config.shiftDuration > (role === 'Patrol' ? patrolMax : maxHours);

      if (!willBeOvertime) {
        if (role === 'Operation') return 1; // Highest Priority: Operations filling their quota
        if (role === 'Patrol') return 2;    // Second Priority: Patrol filling their quota
      } else {
        // OVERTIME CASE
        if (config.ignoreDutySchedule && role === 'Patrol') return 3; // Allowed Overtime for Patrol only
      }
      return 99; // Not eligible
    };

    candidates.sort((a, b) => {
      const scoreA = getPriorityScore(a);
      const scoreB = getPriorityScore(b);

      // 1. Primary: Priority Score (Lower is better)
      if (scoreA !== scoreB) return scoreA - scoreB;

      // 2. Secondary: Fewest Hours (Balance load within same priority)
      const hoursA = hoursTracker.get(a.id) || 0;
      const hoursB = hoursTracker.get(b.id) || 0;
      return hoursA - hoursB;
    });

    for (const person of candidates) {
      if (assigned.length >= staffNeeded) break;

      const score = getPriorityScore(person);
      if (score === 99) continue; // Skip ineligible

      assigned.push(person);
      const currentHours = hoursTracker.get(person.id) || 0;
      hoursTracker.set(person.id, currentHours + config.shiftDuration);

      const lastEnd = lastShiftEndTime.get(person.id);
      if (lastEnd && shiftStart.getTime() === lastEnd.getTime()) {
        const currentConsecutive = consecutiveHoursTracker.get(person.id) || config.shiftDuration;
        consecutiveHoursTracker.set(person.id, currentConsecutive + config.shiftDuration);
      } else {
        // Reset consecutive hours
        consecutiveHoursTracker.set(person.id, config.shiftDuration);
      }

      lastShiftEndTime.set(person.id, shiftEnd);
    }

    return { ...shift, assignedPersonnel: assigned };
  });
}

// ==========================================
// SERVER ACTIONS
// ==========================================

let stagedDeploymentCache: {
  config: DeploymentConfig,
  shifts: ProposedSchedule[],
  runId: string
} | null = null;

// Helper to fetch boundaries
async function fetchBoundaries(): Promise<BoundaryPolygon[]> {
  try {
    const rawBoundaries: any[] = await prisma.$queryRaw`
            SELECT id, brgy_name, ST_AsGeoJSON(geometry) as geojson 
            FROM boundaries 
            WHERE geometry IS NOT NULL
        `;
    return rawBoundaries.map(b => {
      try {
        const geo = JSON.parse(b.geojson);
        let coords: { lat: number, lng: number }[] = [];
        // Handle Polygon and MultiPolygon (take first ring of first polygon)
        if (geo.type === 'Polygon') {
          coords = geo.coordinates[0].map((p: number[]) => ({ lat: p[1], lng: p[0] }));
        } else if (geo.type === 'MultiPolygon') {
          coords = geo.coordinates[0][0].map((p: number[]) => ({ lat: p[1], lng: p[0] }));
        }
        return { id: b.id, name: b.brgy_name, coordinates: coords };
      } catch (e) {
        return null;
      }
    }).filter(Boolean) as BoundaryPolygon[];
  } catch (e) {
    console.error("Failed to fetch boundaries:", e);
    return [];
  }
}

export async function generateStagedDeployment(config: DeploymentConfig) {
  try {
    const [allPersonnel, allVehicles, allCrimes, adjacencyGraph, boundaries] = await Promise.all([
      prisma.personnel.findMany({
        where: { isActive: true },
        include: { position: true, role: true }
      }),
      prisma.patrolCar.findMany({ where: { isActive: true, isAvailable: true } }),
      prisma.ciras_data.findMany({
        where: { lat: { not: null }, lng: { not: null }, timeCommitted: { not: null } },
        include: { weight: true }
      }),
      getAdjacencyGraph(),
      fetchBoundaries() // ✅ Fetch once
    ]);

    if (allVehicles.length === 0) {
      return { success: false, error: "No active vehicles found." };
    }

    const barangayRiskMap = new Map<string, number>();
    allCrimes.forEach(c => {
      const name = normalizeBarangayName(c.barangay || '');
      if (name) {
        const current = barangayRiskMap.get(name) || 0;
        const weight = c.weight?.weight || 1;
        barangayRiskMap.set(name, current + weight);
      }
    });

    const allBarangaysWithLocations = await getAllBarangaysWithCentroids();
    allBarangaysWithLocations.forEach(b => b.risk = barangayRiskMap.get(b.name) || 1);

    const targetDate = config.targetDate ? new Date(config.targetDate) : new Date();

    const daySlots = await generateShiftsForDay(
      targetDate,
      config,
      { allVehicles, allCrimes, adjacencyGraph },
      barangayRiskMap,
      allBarangaysWithLocations,
      boundaries
    );

    const filledSchedule = assignPersonnelToShifts(daySlots, allPersonnel, config);

    if (filledSchedule.length === 0) {
      return { success: false, error: "No deployments generated." };
    }

    const runId = `RUN-${Date.now()}`;
    stagedDeploymentCache = { config, shifts: filledSchedule, runId };

    return { success: true, data: filledSchedule, runId, allPersonnel };
  } catch (error) {
    console.error("Optimization Error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Optimization Failed" };
  }
}

export async function generateWeeklyDeployment(config: DeploymentConfig) {
  try {
    const [allPersonnel, allVehicles, allCrimes, adjacencyGraph, boundaries] = await Promise.all([
      prisma.personnel.findMany({
        where: { isActive: true },
        include: { position: true, role: true }
      }),
      prisma.patrolCar.findMany({ where: { isActive: true, isAvailable: true } }),
      prisma.ciras_data.findMany({
        where: { lat: { not: null }, lng: { not: null }, timeCommitted: { not: null } },
        include: { weight: true }
      }),
      getAdjacencyGraph(),
      fetchBoundaries() // ✅ Fetch once
    ]);

    if (allVehicles.length === 0) return { success: false, error: "No active vehicles found." };

    const barangayRiskMap = new Map<string, number>();
    allCrimes.forEach(c => {
      const name = normalizeBarangayName(c.barangay || '');
      if (name) {
        const current = barangayRiskMap.get(name) || 0;
        const weight = c.weight?.weight || 1;
        barangayRiskMap.set(name, current + weight);
      }
    });

    const allBarangaysWithLocations = await getAllBarangaysWithCentroids();
    allBarangaysWithLocations.forEach(b => b.risk = barangayRiskMap.get(b.name) || 1);

    const startDate = config.targetDate ? new Date(config.targetDate) : new Date();
    const weekStart = startOfWeek(startDate, { weekStartsOn: 1 });

    let allWeeklySlots: ProposedSchedule[] = [];
    for (let i = 0; i < 7; i++) {
      const currentDate = addDays(weekStart, i);
      const daySlots = await generateShiftsForDay(
        currentDate,
        config,
        { allVehicles, allCrimes, adjacencyGraph },
        barangayRiskMap,
        allBarangaysWithLocations,
        boundaries
      );
      allWeeklySlots.push(...daySlots);
    }

    const filledSchedule = assignPersonnelToShifts(allWeeklySlots, allPersonnel, config);

    if (filledSchedule.length === 0) return { success: false, error: "No deployments generated." };

    const runId = `WEEKLY-RUN-${Date.now()}`;
    stagedDeploymentCache = { config, shifts: filledSchedule, runId };

    return { success: true, data: filledSchedule, runId, allPersonnel };
  } catch (error) {
    console.error("Weekly Optimization Error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Weekly Optimization Failed" };
  }
}

export async function commitDeploymentToDatabase(finalData?: ProposedSchedule[]) {
  const shiftsToSave = finalData || stagedDeploymentCache?.shifts;

  if (!shiftsToSave || shiftsToSave.length === 0) {
    return { success: false, error: "No deployment data to save." };
  }

  try {
    const dateOfFirstShift = new Date(shiftsToSave[0].date);
    const weekStartDate = startOfWeek(dateOfFirstShift, { weekStartsOn: 1 });

    let createdPlanId: string | null = null;

    // ✅ FIXED: Transaction Wrapper
    await prisma.$transaction(async (tx) => {
      await tx.deploymentPlan.deleteMany({
        where: {
          weekStartDate: weekStartDate,
          OR: [
            { parameters: { path: ['type'], equals: '5MRT' } },
            { parameters: { path: ['type'], equals: 'MANUAL' } },
            { runId: { startsWith: 'WEEKLY-RUN' } },
            { runId: { startsWith: 'MANUAL' } },
          ]
        }
      });

      const uniqueRunId = stagedDeploymentCache?.runId || `MANUAL-${Date.now()}`;

      const plan = await tx.deploymentPlan.create({
        data: {
          runId: uniqueRunId,
          weekStartDate: weekStartDate,
          parameters: {
            ...(stagedDeploymentCache?.config as any || {}),
            type: '5MRT'
          },
          shifts: {
            create: shiftsToSave
              .filter(s => s.isActive)
              .map(s => ({
                date: new Date(s.date),
                dayOfWeek: s.day,
                timeSlot: s.timeSlot,
                lat: s.lat,
                lng: s.lng,
                locationLabel: JSON.stringify({ label: s.locationLabel, areas: s.coverageAreas ?? [] }),
                patrolCarId: s.vehicleId,
                officers: {
                  create: s.assignedPersonnel.map(p => ({
                    personnelId: p.id
                  }))
                }
              }))
          }
        }
      });
      createdPlanId = plan.id;
    });

    // Set plan_type via raw SQL outside transaction (column exists in DB but not in Prisma client yet)
    if (createdPlanId) {
      await prisma.$executeRawUnsafe(`UPDATE "DeploymentPlan" SET plan_type = '5MRT' WHERE id = $1`, createdPlanId);
    }

    stagedDeploymentCache = null;
    revalidatePath('/deployment');
    revalidatePath('/dashboard/5mrt');

    return { success: true };
  } catch (error) {
    console.error("Commit Error Details:", error);
    return { success: false, error: error instanceof Error ? error.message : "Database commit failed" };
  }
}

// ✅ NEW ACTION: Save Schedule to Personnel (Duty Roster Sync)
export async function saveScheduleToPersonnel() {
  const shifts = stagedDeploymentCache?.shifts;
  if (!shifts || shifts.length === 0) {
    return { success: false, error: "No active schedule to save." };
  }

  try {
    const personUpdateMap = new Map<number, Set<string>>();

    // 1. Gather all assigned days for each person
    for (const shift of shifts) {
      const dayShort = format(shift.date, 'EEE'); // "Mon", "Tue"

      for (const person of shift.assignedPersonnel) {
        if (!personUpdateMap.has(person.id)) {
          personUpdateMap.set(person.id, new Set());
        }
        personUpdateMap.get(person.id)!.add(dayShort);
      }
    }

    // 2. Perform Batch Updates (Transaction)
    await prisma.$transaction(async (tx) => {
      for (const [personId, daysSet] of personUpdateMap.entries()) {
        const daysArray = Array.from(daysSet).sort((a, b) => {
          const order = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
          return order.indexOf(a) - order.indexOf(b);
        });
        const dutyString = daysArray.join(',');

        await tx.personnel.update({
          where: { id: personId },
          data: { dutyDays: dutyString }
        });
      }
    });

    revalidatePath('/dashboard/5mrt');
    return { success: true, message: `Updated duty roster for ${personUpdateMap.size} personnel.` };

  } catch (error) {
    console.error("Update Duty Roster Error:", error);
    return { success: false, error: "Failed to update personnel duty roster." };
  }
}

export async function getDeploymentForDate(date: Date) {
  try {
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });

    const latestPlan = await prisma.deploymentPlan.findFirst({
      where: {
        weekStartDate: weekStart,
        OR: [
          { parameters: { path: ['type'], equals: '5MRT' } },
          { parameters: { path: ['type'], equals: 'MANUAL' } },
          { runId: { startsWith: 'WEEKLY-RUN' } },
          { runId: { startsWith: 'MANUAL' } },
        ]
      },
      orderBy: { createdAt: 'desc' },
      include: {
        shifts: {
          include: {
            patrolCar: true,
            officers: {
              include: {
                personnel: {
                  include: { position: true, role: true }
                }
              }
            }
          }
        }
      }
    });

    if (!latestPlan) return { success: true, data: [] };

    const mappedData: ProposedSchedule[] = latestPlan.shifts.map(s => {
      let parsedLabel = s.locationLabel;
      let areas: string[] = [];
      try {
        const parsed = JSON.parse(s.locationLabel);
        if (parsed && parsed.label) {
          parsedLabel = parsed.label;
          areas = parsed.areas || [];
        }
      } catch {
        // Legacy plain-string locationLabel — leave areas empty
      }
      return {
        id: s.id,
        day: s.dayOfWeek,
        date: s.date,
        timeSlot: s.timeSlot,
        vehicleId: s.patrolCar.id,
        vehicleName: s.patrolCar.name,
        lat: Number(s.lat),
        lng: Number(s.lng),
        locationLabel: parsedLabel,
        assignedPersonnel: s.officers.map(o => o.personnel),
        coverageAreas: areas,
        isActive: true,
      };
    });

    // Cache config if needed for UI state (e.g., shift pattern)
    // We can guess pattern from first shift
    let shiftPattern = 12;
    if (mappedData.length > 0) {
      // ... logic to deduce shift pattern ...
    }

    return { success: true, data: mappedData, shiftPattern: (latestPlan.parameters as any)?.shiftDuration };

  } catch (error) {
    console.error("Get Plan Error:", error);
    return { success: false, error: "Failed to fetch plan" };
  }
}

export async function getAllPersonnel() {
  try {
    const personnel = await prisma.personnel.findMany({
      where: { isActive: true },
      include: { position: true, role: true },
      orderBy: { name: 'asc' }
    });
    return { success: true, data: personnel };
  } catch (e) {
    return { success: false, error: "Failed to fetch personnel" };
  }
}

// ✅ NEW: Get History Weeks
export async function getHistoryWeeks() {
  try {
    // Use OR to include: type='5MRT' OR type is missing (legacy records).
    // Prisma's NOT + JSON path filter excludes rows where the key doesn't exist
    // due to SQL 3-valued NULL logic, so we use explicit inclusive matching.
    const plans = await prisma.deploymentPlan.findMany({
      where: {
        OR: [
          { parameters: { path: ['type'], equals: '5MRT' } },
          { parameters: { path: ['type'], equals: 'MANUAL' } },
          // Legacy records without a type field: match anything NOT hybrid
          // by checking runId patterns (WEEKLY-RUN, MANUAL)
          { runId: { startsWith: 'WEEKLY-RUN' } },
          { runId: { startsWith: 'MANUAL' } },
        ]
      },
      select: { weekStartDate: true },
      orderBy: { weekStartDate: 'desc' },
      distinct: ['weekStartDate']
    });
    return { success: true, data: plans.map(p => p.weekStartDate) };
  } catch (e) {
    console.error('getHistoryWeeks error:', e);
    return { success: false, error: "Failed to fetch history" };
  }
}