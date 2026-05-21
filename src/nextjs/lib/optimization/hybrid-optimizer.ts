"use server";

import { PrismaClient, patrolCar, Personnel } from "@prisma/client";
import { format } from "date-fns";

const prisma = new PrismaClient();

// ==========================================
// 1. CONSTANTS & CONFIGURATION
// ==========================================
const TIME_BLOCKS = [
    { id: 1, label: "00:00 - 04:00", startHour: 0, endHour: 4 },
    { id: 2, label: "04:00 - 08:00", startHour: 4, endHour: 8 },
    { id: 3, label: "08:00 - 12:00", startHour: 8, endHour: 12 },
    { id: 4, label: "12:00 - 16:00", startHour: 12, endHour: 16 },
    { id: 5, label: "16:00 - 20:00", startHour: 16, endHour: 20 },
    { id: 6, label: "20:00 - 00:00", startHour: 20, endHour: 24 }
];

const STATION_LAT = 10.7769;
const STATION_LNG = 122.5447;

// ==========================================
// 2. SPATIAL HELPER FUNCTIONS 
// ==========================================
const toRadians = (deg: number) => (deg * Math.PI) / 180;

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
    const R = 6371;
    const dLat = toRadians(lat2 - lat1);
    const dLng = toRadians(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ==========================================
// 3. UTILITY FUNCTIONS
// ==========================================

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

        return graph;
    } catch (e) {
        return new Map();
    }
}

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
// =========================================================
function selectSpreadSeeds(
    adjacencyGraph: Map<string, string[]>,
    allBarangays: string[],
    k: number,
    barangayRiskMap: Map<string, number>,
    rotationIndex: number = 0
): string[] {
    if (allBarangays.length <= k) return [...allBarangays];

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
    const sortedByRisk = [...allBarangays].sort((a, b) =>
        (barangayRiskMap.get(b) || 0) - (barangayRiskMap.get(a) || 0)
    );
    const seedPoolSize = Math.max(k, Math.min(sortedByRisk.length, k * 2));
    const firstSeedIdx = rotationIndex % seedPoolSize;
    seeds.push(sortedByRisk[firstSeedIdx]);

    const allDistances: Map<string, number>[] = [bfsDistances(seeds[0])];

    while (seeds.length < k) {
        let bestCandidate: string | null = null;
        let bestMinDist = -1;
        for (const name of allBarangays) {
            if (seeds.includes(name)) continue;
            let minDist = Infinity;
            for (const distMap of allDistances) {
                const d = distMap.get(name);
                if (d !== undefined && d < minDist) minDist = d;
            }
            if (minDist === Infinity) minDist = 100;
            if (minDist > bestMinDist) {
                bestMinDist = minDist;
                bestCandidate = name;
            }
        }
        if (bestCandidate) {
            seeds.push(bestCandidate);
            allDistances.push(bfsDistances(bestCandidate));
        } else break;
    }
    return seeds;
}

// =========================================================
//  CRIME-WEIGHT-BALANCED GRAPH PARTITIONING
//  Hybrid: prioritizes HIGH-RISK areas when vehicles are
//  scarce; expands to all areas when vehicles are sufficient.
// =========================================================
function distributeBarangaysAcrossTeams(
    allBarangays: Array<{ name: string; lat: number; lng: number; risk: number; areaSqm?: number; population?: number }>,
    adjacencyGraph: Map<string, string[]>,
    numTeams: number,
    barangayRiskMap: Map<string, number>,
    rotationIndex: number = 0
): string[][] {
    // -------------------------------------------------------
    // ALL BARANGAYS ARE ALWAYS INCLUDED
    // Risk scores only influence which zones get seeded first
    // (high-risk areas get a patrol car focused on them first).
    // We never exclude barangays — Purok I/II/III/IV and other
    // low-crime areas are still part of the partition so every
    // area gets at least some patrol coverage.
    // -------------------------------------------------------
    const workingBarangays = [...allBarangays];

    console.log(`[HYBRID PARTITION] Full coverage: ${workingBarangays.length} barangays, ${numTeams} teams, rotationIndex=${rotationIndex}`);

    const assignments: string[][] = Array.from({ length: numTeams }, () => []);
    const teamWeights: number[] = Array(numTeams).fill(0);
    const unassigned = new Set(workingBarangays.map(b => b.name));

    const brgyLookup = new Map<string, typeof allBarangays[0]>();
    workingBarangays.forEach(b => brgyLookup.set(b.name, b));

    const getWeight = (name: string): number => barangayRiskMap.get(name) || 0;

    const totalWeight = workingBarangays.reduce((sum, b) => sum + getWeight(b.name), 0);

    // High-risk = top-k by weight (for separation logic)
    const sortedByWeight = [...workingBarangays]
        .map(b => ({ name: b.name, weight: getWeight(b.name) }))
        .sort((a, b) => b.weight - a.weight);
    const highRiskBarangays = new Set<string>();
    sortedByWeight.slice(0, numTeams).forEach(e => {
        if (e.weight > 0) highRiskBarangays.add(e.name);
    });

    const getAdjacentCandidates = (cluster: string[]): string[] => {
        const neighbors = new Set<string>();
        cluster.forEach(brgyName => {
            const adj = adjacencyGraph.get(brgyName) || [];
            adj.forEach(n => { if (unassigned.has(n)) neighbors.add(n); });
        });
        return Array.from(neighbors);
    };

    // PHASE 1: BFS-spread seeds
    const seeds = selectSpreadSeeds(
        adjacencyGraph,
        workingBarangays.map(b => b.name),
        numTeams,
        barangayRiskMap,
        rotationIndex
    );

    seeds.forEach((seed, i) => {
        if (i < numTeams && unassigned.has(seed)) {
            assignments[i].push(seed);
            teamWeights[i] += getWeight(seed);
            unassigned.delete(seed);
        }
    });

    // PHASE 2: Balanced growth by crime weight (lightest-load first)
    let rounds = 0;
    const MAX_ROUNDS = workingBarangays.length * 2;
    while (unassigned.size > 0 && rounds < MAX_ROUNDS) {
        rounds++;
        let anyProgress = false;

        const sortedTeamIndices = Array.from({ length: numTeams }, (_, i) => i)
            .sort((a, b) => teamWeights[a] - teamWeights[b]);

        for (const ti of sortedTeamIndices) {
            if (unassigned.size === 0) break;

            let candidates = getAdjacentCandidates(assignments[ti]);

            // High-risk separation
            const teamHasHighRisk = assignments[ti].some(a => highRiskBarangays.has(a));
            if (teamHasHighRisk) {
                const filtered = candidates.filter(c => !highRiskBarangays.has(c));
                if (filtered.length > 0) candidates = filtered;
            }

            if (candidates.length === 0) continue;

            let bestName: string | null = null;
            let bestScore = -Infinity;
            for (const name of candidates) {
                const b = brgyLookup.get(name);
                if (!b) continue;
                const crimeW = getWeight(name);
                const pop = b.population || 0;
                const area = b.areaSqm || 0;
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

    // PHASE 3: Orphans
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

    console.log(`[HYBRID PARTITION] Final (${rounds} rounds, total weight ${totalWeight}):`);
    assignments.forEach((a, i) =>
        console.log(`  Team ${i} (weight=${teamWeights[i].toFixed(0)}, count=${a.length}): [${a.join(', ')}]`)
    );

    return assignments;
}

// ==========================================
// 4. MAIN ORCHESTRATOR 
// ==========================================
export async function generateWeeklyHybridDeployment(weekStart: Date, ignoreDutySchedule: boolean = false) {
    try {
        const dbPersonnel = await prisma.personnel.findMany({
            where: { isActive: true },
            include: { position: true, role: true }
        });

        const allVehicles = await prisma.patrolCar.findMany({
            where: { isActive: true, isAvailable: true }
        });

        const allCrimes = await prisma.ciras_data.findMany({
            include: { weight: true }
        });

        const adjacencyGraph = await getAdjacencyGraph();
        const allBarangaysWithLocations = await getAllBarangaysWithCentroids();

        const barangayRiskMap = new Map<string, number>();
        allCrimes.forEach(c => {
            const name = normalizeBarangayName(c.barangay || '');
            if (name) {
                const current = barangayRiskMap.get(name) || 0;
                const weight = (c.weight as any)?.weight || 1;
                barangayRiskMap.set(name, current + weight);
            }
        });

        allBarangaysWithLocations.forEach(b => b.risk = barangayRiskMap.get(b.name) || 1);

        const staffPool = dbPersonnel.map(p => ({
            ...p,
            positionName: p.position?.name || 'Unknown',
            roleName: p.role?.name || 'Unknown'
        }));

        const isPatrol = (p: any) =>
            p.roleName.toLowerCase().includes('patrol') ||
            p.positionName.toLowerCase().includes('patrol');

        const patrolStaff = staffPool.filter(isPatrol);
        const otherStaff = staffPool.filter(p => !isPatrol(p));

        const finalDeploymentPlan = [];
        const officerHours: Record<number, number> = {};
        staffPool.forEach(p => officerHours[p.id] = 0);

        const workingHistory: Record<number, Set<number>> = {};
        staffPool.forEach(p => workingHistory[p.id] = new Set());

        const weekBlocks = Array.from({ length: 42 }).map((_, i) => ({
            bIdx: i,
            dayOffset: Math.floor(i / 6),
            blockDef: TIME_BLOCKS[i % 6]
        }));

        const activeContinuousShifts: Record<number, { vehicle: typeof allVehicles[0], officers: typeof staffPool, remainingBlocks: number, point: any, barangays?: string[] }[]> = {};
        for (let i = 0; i < 42; i++) activeContinuousShifts[i] = [];

        for (const wBlock of weekBlocks) {
            const { bIdx, dayOffset, blockDef } = wBlock;
            const currentDate = new Date(weekStart.getTime() + dayOffset * 24 * 60 * 60 * 1000);

            const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            const SHORT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

            const targetDayOfWeek = (1 + dayOffset) % 7;
            const targetDayName = DAYS_OF_WEEK[targetDayOfWeek];
            const shiftDayCode = SHORT_DAYS[targetDayOfWeek];

            const isRestDay = (pId: number, dutyDays: string | null) => {
                if (!ignoreDutySchedule && dutyDays) {
                    const availableDays = dutyDays.split(',').map(d => d.trim().substring(0, 3).toLowerCase());
                    return !availableDays.includes(shiftDayCode.toLowerCase());
                }
                const shift = pId % 7;
                return targetDayOfWeek === shift || targetDayOfWeek === ((shift + 1) % 7);
            };

            const getAvailableOfficers = (pool: typeof staffPool, L: number, relaxed: boolean = false) => {
                return pool.filter(p => {
                    // Relaxed mode raises weekly cap to 56h to guarantee coverage
                    const maxHours = relaxed ? 56 : 40;
                    if (officerHours[p.id] + (L * 4) > maxHours) return false;

                    if (!relaxed) {
                        // ENFORCE 1 SHIFT PER DAY: An officer can only have ONE continuous assignment per day.
                        const dayStartIdx = dayOffset * 6;
                        const dayEndIdx = dayStartIdx + 5;
                        for (let i = dayStartIdx; i <= dayEndIdx; i++) {
                            if (workingHistory[p.id].has(i)) return false;
                        }
                    }

                    for (let step = 0; step < L; step++) {
                        const stepDayOffset = Math.floor((bIdx + step) / 6);
                        const sDow = (1 + stepDayOffset) % 7;
                        const sDcode = SHORT_DAYS[sDow];
                        const checkRest = () => {
                            if (!ignoreDutySchedule && p.dutyDays) {
                                const avail = p.dutyDays.split(',').map(d => d.trim().substring(0, 3).toLowerCase());
                                return !avail.includes(sDcode.toLowerCase());
                            }
                            const shift = p.id % 7;
                            return sDow === shift || sDow === ((shift + 1) % 7);
                        };
                        if (checkRest()) return false;
                    }
                    for (let step = 0; step < L; step++) {
                        if (workingHistory[p.id].has(bIdx + step)) return false;
                    }

                    return true;
                });
            };

            const blockCrimes = allCrimes.filter(c => {
                if (!c.timeCommitted) return false;
                const h = new Date(c.timeCommitted).getHours();
                const latNum = Number(c.lat);
                const lngNum = Number(c.lng);
                if (isNaN(latNum) || isNaN(lngNum) || latNum === 0 || lngNum === 0) return false;
                return h >= blockDef.startHour && h < blockDef.endHour;
            });

            const totalRisk = blockCrimes.length;
            let blocksToAssign = 2; // Strict 8-hour shift
            blocksToAssign = Math.min(blocksToAssign, 42 - bIdx);

            // HYBRID: Always deploy ALL available vehicles every block
            const requiredCars = allVehicles.length;

            const carriedOver = activeContinuousShifts[bIdx];
            const newAssignmentsNeeded = Math.max(0, requiredCars - carriedOver.length);

            const assignedTeams: { vehicle: typeof allVehicles[0], officers: typeof staffPool, remainingBlocks: number, point: any, barangays?: string[] }[] = [...carriedOver];

            const availableVehicles = allVehicles.filter(v => !assignedTeams.some(t => t.vehicle.id === v.id));

            // ====================================================
            // GRAPH PARTITION for this block — all cars at once
            // Block-specific risk amplification
            // ====================================================
            const blockRiskMap = new Map(barangayRiskMap);
            blockCrimes.forEach(c => {
                const name = normalizeBarangayName(c.barangay || '');
                if (name) {
                    const base = blockRiskMap.get(name) || 0;
                    const w = (c.weight as any)?.weight || 1;
                    blockRiskMap.set(name, base + w);
                }
            });

            const rotationIndex = dayOffset * 7 + (blockDef.id - 1); // Ensure unique index per block
            const totalCarsThisBlock = carriedOver.length + newAssignmentsNeeded;
            const zoneAssignments = totalCarsThisBlock > 0
                ? distributeBarangaysAcrossTeams(
                    allBarangaysWithLocations,
                    adjacencyGraph,
                    totalCarsThisBlock,
                    blockRiskMap,
                    rotationIndex
                )
                : [];

            // Shuffle vehicle-to-zone mapping per day so different cars get different zones
            // Use Fisher-Yates seeded by dayOffset to deterministically shuffle
            const zoneOrder = Array.from({ length: zoneAssignments.length }, (_, i) => i);
            for (let si = zoneOrder.length - 1; si > 0; si--) {
                const sj = (dayOffset * 13 + si * 7 + blockDef.id) % (si + 1);
                [zoneOrder[si], zoneOrder[sj]] = [zoneOrder[sj], zoneOrder[si]];
            }
            const shuffledZones = zoneOrder.map(i => zoneAssignments[i] || []);

            // Create new assignments
            let vehiclesUsed = 0;
            for (let i = 0; i < newAssignmentsNeeded; i++) {
                if (vehiclesUsed >= availableVehicles.length) break;

                const team: typeof staffPool = [];
                let assignedBlocks = blocksToAssign;
                let candidates = getAvailableOfficers(patrolStaff, assignedBlocks);

                if (candidates.length < 2) {
                    assignedBlocks = 1;
                    candidates = getAvailableOfficers(patrolStaff, assignedBlocks);
                }
                if (candidates.length < 2) {
                    assignedBlocks = 1;
                    candidates = getAvailableOfficers(otherStaff, assignedBlocks);
                }
                // FALLBACK: Relax constraints (raise weekly cap) to guarantee coverage
                if (candidates.length < 2) {
                    assignedBlocks = 1;
                    candidates = getAvailableOfficers(patrolStaff, assignedBlocks, true);
                }
                if (candidates.length < 2) {
                    assignedBlocks = 1;
                    candidates = getAvailableOfficers(otherStaff, assignedBlocks, true);
                }
                // LAST RESORT: accept even a single officer
                if (candidates.length < 2) {
                    assignedBlocks = 1;
                    candidates = getAvailableOfficers([...patrolStaff, ...otherStaff], assignedBlocks, true);
                }

                const crewSize = Math.min(candidates.length, 2);
                if (crewSize >= 1) {
                    for (let ci = 0; ci < crewSize; ci++) {
                        team.push(candidates[ci]);
                    }

                    for (const officer of team) {
                        for (let step = 0; step < assignedBlocks; step++) {
                            workingHistory[officer.id].add(bIdx + step);
                        }
                        officerHours[officer.id] += (assignedBlocks * 4);
                    }

                    const vehicle = availableVehicles[vehiclesUsed];
                    vehiclesUsed++;

                    // Zone for this team — use shuffled zones so each day has different assignments
                    const newZoneIdx = carriedOver.length + i;
                    const zoneBarangays = shuffledZones[newZoneIdx] || [];

                    // Place patrol car in the Nth highest-risk barangay, rotating by block index
                    let lat = STATION_LAT, lng = STATION_LNG;
                    if (zoneBarangays.length > 0) {
                        // Sort zone barangays by risk descending
                        const sortedZoneBrgys = [...zoneBarangays]
                            .map(name => ({
                                name,
                                brgy: allBarangaysWithLocations.find(x => x.name === name),
                                weight: Math.max(blockRiskMap.get(name) || 0, 1)
                            }))
                            .filter(x => x.brgy)
                            .sort((a, b) => b.weight - a.weight);

                        if (sortedZoneBrgys.length > 0) {
                            // Rotate through top positions based on block index
                            const posIdx = bIdx % sortedZoneBrgys.length;
                            const pick = sortedZoneBrgys[posIdx];
                            lat = pick.brgy!.lat;
                            lng = pick.brgy!.lng;
                        }
                    }

                    const point = { lat, lng };

                    const shiftData = {
                        vehicle,
                        officers: team,
                        remainingBlocks: assignedBlocks,
                        point
                        // NOTE: barangays NOT stored here — zones are recomputed fresh every block
                    };

                    assignedTeams.push(shiftData as any);

                    for (let offset = 1; offset < assignedBlocks; offset++) {
                        if (bIdx + offset < 42) {
                            activeContinuousShifts[bIdx + offset].push({
                                ...shiftData,
                                remainingBlocks: assignedBlocks - offset
                            });
                        }
                    }
                }
            }

            if (assignedTeams.length === 0) continue;

            for (let tIdx = 0; tIdx < assignedTeams.length; tIdx++) {
                const team = assignedTeams[tIdx];

                // Always use freshly computed shuffled zones — NEVER fall back to carry-over barangays
                // This is what makes each day tab show different patrol areas
                const zoneBarangays = shuffledZones[tIdx] || [];

                // Rotate position: use (blockIndex + vehicleId) for unique parking spot per car per block
                let lat = STATION_LAT, lng = STATION_LNG;
                if (zoneBarangays.length > 0) {
                    const sortedZoneBrgys = [...zoneBarangays]
                        .map(name => ({
                            name,
                            brgy: allBarangaysWithLocations.find(x => x.name === name),
                            weight: Math.max(blockRiskMap.get(name) || 0, 1)
                        }))
                        .filter(x => x.brgy)
                        .sort((a, b) => b.weight - a.weight);

                    if (sortedZoneBrgys.length > 0) {
                        const posIdx = (bIdx + team.vehicle.id) % sortedZoneBrgys.length;
                        const pick = sortedZoneBrgys[posIdx];
                        lat = pick.brgy!.lat;
                        lng = pick.brgy!.lng;
                    }
                }

                finalDeploymentPlan.push({
                    id: `hybrid-${format(currentDate, 'yyyyMMdd')}-B${blockDef.id}-V${team.vehicle.id}`,
                    day: targetDayName,
                    date: new Date(currentDate),
                    timeSlot: blockDef.label,
                    vehicleId: team.vehicle.id,
                    vehicleName: team.vehicle.name,
                    lat: lat,
                    lng: lng,
                    locationLabel: `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`,
                    assignedPersonnel: team.officers.map(o => ({
                        ...o,
                        position: o.positionName
                    })),
                    coverageAreas: zoneBarangays,
                    isActive: true
                });
            }
        }

        return { success: true, data: finalDeploymentPlan };

    } catch (error) {
        console.error("Hybrid Optimization Error:", error);
        return { success: false, error: "Failed to generate weekly hybrid plan" };
    }
}

// ==========================================
// 5. HYBRID PERSISTENCE 
// ==========================================

import { startOfWeek } from 'date-fns';

export async function commitHybridDeploymentToDatabase(shiftsToSave: any[], weekStartGiven: Date) {
    if (!shiftsToSave || shiftsToSave.length === 0) {
        return { success: false, error: "No deployment data to save." };
    }

    try {
        const weekStartDate = startOfWeek(weekStartGiven, { weekStartsOn: 1 });

        let createdPlanId: string | null = null;

        await prisma.$transaction(async (tx) => {
            await tx.deploymentPlan.deleteMany({
                where: {
                    weekStartDate: weekStartDate,
                    parameters: { path: ['type'], equals: 'hybrid' }
                }
            });

            const uniqueRunId = `HYBRID-${Date.now()}`;

            const plan = await tx.deploymentPlan.create({
                data: {
                    runId: uniqueRunId,
                    weekStartDate: weekStartDate,
                    parameters: { type: 'hybrid' },
                    shifts: {
                        create: shiftsToSave
                            .filter(s => s.isActive)
                            .map(s => ({
                                date: new Date(s.date),
                                dayOfWeek: s.day,
                                timeSlot: s.timeSlot,
                                lat: s.lat,
                                lng: s.lng,
                                locationLabel: JSON.stringify({ label: s.locationLabel, areas: s.coverageAreas }),
                                patrolCarId: s.vehicleId,
                                officers: {
                                    create: s.assignedPersonnel.map((p: any) => ({
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
            await prisma.$executeRawUnsafe(`UPDATE "DeploymentPlan" SET plan_type = 'hybrid' WHERE id = $1`, createdPlanId);
        }

        return { success: true };
    } catch (error) {
        console.error("Commit Hybrid Error:", error);
        return { success: false, error: "Database commit failed" };
    }
}

export async function getHybridDeploymentForDate(date: Date) {
    try {
        const weekStart = startOfWeek(date, { weekStartsOn: 1 });

        const latestPlan = await prisma.deploymentPlan.findFirst({
            where: {
                weekStartDate: weekStart,
                parameters: { path: ['type'], equals: 'hybrid' }
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

        const mappedData = latestPlan.shifts.map(s => {
            let parsedLocation = s.locationLabel;
            let areas: string[] = [];

            try {
                const parsed = JSON.parse(s.locationLabel);
                if (parsed && parsed.label) {
                    parsedLocation = parsed.label;
                    areas = parsed.areas || [];
                }
            } catch (e) {
                // Ignore JSON parse errors for backwards compatibility
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
                locationLabel: parsedLocation,
                assignedPersonnel: s.officers.map(o => ({
                    ...o.personnel,
                    positionName: (o.personnel as any).position?.name || 'Unknown',
                    roleName: (o.personnel as any).role?.name || 'Unknown',
                })),
                coverageAreas: areas,
                isActive: true
            };
        });

        return { success: true, data: mappedData };

    } catch (error) {
        console.error("Get Hybrid Plan Error:", error);
        return { success: false, error: "Failed to fetch plan" };
    }
}

export async function getHybridHistoryWeeks() {
    try {
        const plans = await prisma.deploymentPlan.findMany({
            where: {
                parameters: { path: ['type'], equals: 'hybrid' }
            },
            select: { weekStartDate: true },
            orderBy: { weekStartDate: 'desc' },
            distinct: ['weekStartDate']
        });
        return { success: true, data: plans.map(p => p.weekStartDate) };
    } catch (error) {
        console.error("Get Hybrid History Error:", error);
        return { success: false, error: "Failed to fetch history" };
    }
}