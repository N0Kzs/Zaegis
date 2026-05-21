import { PrismaClient } from '@prisma/client';
import solver from 'javascript-lp-solver';
import prisma from '@/lib/db'; // Use existing singleton

// ---------------------------
// Types / Interfaces
// ---------------------------
export interface Barangay {
  name: string;
  riskScore: number;
  crimeCount: number;
  hourlyRiskPerDay?: Map<string, Map<number, number>>;
  hourlyRisk?: Map<number, number>;
}

export interface Personnel {
  id: number;
  name: string;
  position: {
    name: string;
    rank: number;
    canPatrol: boolean;
  };
  role: {
    name: string;
    canPatrol: boolean;
    canPatrolAtNight: boolean;
  };
  dutyDays: string[];  // ["Mon", "Tue", "Wed", ...]
  weeklyHours: number;
  availability: boolean;
}

export interface Vehicle {
  id: number;
  name: string;
  type: 'car' | 'bike';
  capacity: number;
}

export interface TimeSlot {
  startHour: number;
  endHour: number;
  date: Date;
  label: string;
  dayName: string;
}

export interface DeploymentPlan {
  scheduleId: number;
  timeSlot: string;
  date: Date;
  areas: string[];
  vehicleId: number;
  personnelIds: number[];
  priority: number;
}

export interface OptimizationWeights {
  crimeClockWeight: number;          // How much hourly patterns matter vs base risk
  randomnessFactor: number;          // Noise to avoid predictability
  neighborContinuityBonus: number;   // Preference for adjacent patrols
  repeatAreaPenalty: number;         // Discourage staying in same area
  criticalAreaThreshold: number;     // Stay if risk > threshold of max
}

export interface ClusteringConfig {
  maxAreasPerCluster: number;
  minRiskRatioForExpansion: number;  // Stop if neighbor < ratio of seed risk
  neighborSwapChance: number;        // Natural movement probability
}

export interface TeamSizingConfig {
  riskPerOfficer: number;            // Risk points per officer
  maxPersonnelPerTeam: number;
}

export interface OptimizationConfig {
  // Constraints
  minPersonnelPerTeam: number;
  minPersonnelPerVehicle: { car: number; bike: number };
  maxWeeklyHours: number;
  minWeeklyHours?: number;
  maxShiftHours?: number;  // NEW: Maximum hours per shift (default 8)
  
  // Algorithm Settings
  aggregationWindow: 1 | 2 | 3 | 4;
  lookbackDays?: number;
  hourSimilarityPct?: number;
  allowBackToBackIfScarce?: boolean;
  
  // Logic Switches
  recencyHalfLifeDays?: number; 
  nightShiftStartHour?: number; 
  allowNonPatrolAtNight?: boolean; 
  patrolPositionName?: string;
  
  // Extracted Magic Numbers (NEW)
  weights?: Partial<OptimizationWeights>;
  clustering?: Partial<ClusteringConfig>;
  teamSizing?: Partial<TeamSizingConfig>;
}

interface Team {
  vehicle: Vehicle;
  personnel: Personnel[];
  assignedAreas: string[];
  score?: number;
}

// Personnel state tracking (Fix: No more mutation)
interface PersonnelState {
  person: Personnel;
  currentWeekHours: number;
  isAvailable: boolean;
}

// Schedule quality metrics (NEW)
export interface ScheduleMetrics {
  coverage: {
    barangaysCovered: number;
    totalBarangays: number;
    coveragePercent: number;
    highRiskCoveragePercent: number;
  };
  fairness: {
    personnelUtilization: { id: number; name: string; hours: number }[];
    hoursStdDev: number;
    underutilizedCount: number;
  };
  efficiency: {
    avgTeamSize: number;
    vehicleUtilization: number;
    totalDeployments: number;
  };
  riskReduction: {
    totalRiskCovered: number;
    weightedCoverageScore: number;
  };
}

export interface ScheduleResult {
  plans: DeploymentPlan[];
  metrics: ScheduleMetrics;
  warnings: string[];
}

// ---------------------------
// DeploymentOptimizer Class
// ---------------------------
export class DeploymentOptimizer {
  private config: OptimizationConfig;
  private weights: OptimizationWeights;
  private clustering: ClusteringConfig;
  private teamSizing: TeamSizingConfig;
  private adjacencyMap: Record<string, string[]> | null = null;

  constructor(config: OptimizationConfig) {
    // Set defaults
    this.config = {
      lookbackDays: 180,
      hourSimilarityPct: 0.2,
      allowBackToBackIfScarce: true,
      recencyHalfLifeDays: 14,
      nightShiftStartHour: 17,
      allowNonPatrolAtNight: false,
      patrolPositionName: 'Patrol Officer',
      minWeeklyHours: 24,
      maxShiftHours: 8,  // NEW: Default max 8 hours per shift
      ...config,
    };

    // Extract magic numbers to configuration
    this.weights = {
      crimeClockWeight: 0.9,
      randomnessFactor: 0.15,
      neighborContinuityBonus: 1.25,
      repeatAreaPenalty: 0.4,
      criticalAreaThreshold: 0.85,
      ...config.weights,
    };

    this.clustering = {
      maxAreasPerCluster: 6,
      minRiskRatioForExpansion: 0.15,
      neighborSwapChance: 0.35,
      ...config.clustering,
    };

    this.teamSizing = {
      riskPerOfficer: 15,
      maxPersonnelPerTeam: 4,
      ...config.teamSizing,
    };

    this.validateConfig();
  }

  private normalizeName(s: string | null | undefined) {
    return s ? s.trim().toLowerCase() : '';
  }

  private denormalizeName(norm: string): string {
    return norm.toUpperCase();
  }

  async loadSpatialData() {
    try {
      this.adjacencyMap = await this.getBarangayAdjacencyMap();
    } catch (e) {
      console.warn('[Optimizer] Spatial data unavailable - using empty adjacency map');
      this.adjacencyMap = {};
    }
  }

  async getBarangayAdjacencyMap(): Promise<Record<string, string[]>> {
    const rows = await prisma.barangayAdjacency.findMany({
      select: { barangayA: true, barangayB: true },
    });
    const map: Record<string, string[]> = {};
    rows.forEach(r => {
      const a = this.normalizeName(r.barangayA);
      const b = this.normalizeName(r.barangayB);
      if (!map[a]) map[a] = [];
      if (!map[b]) map[b] = [];
      if (!map[a].includes(b)) map[a].push(b);
      if (!map[b].includes(a)) map[b].push(a);
    });
    return map;
  }

    // ✅ NEW: Expose risk analysis publicly
  async analyzeBarangayRisks(lookbackDays?: number): Promise<{
    barangays: Array<{
      name: string;
      totalRisk: number;
      crimeCount: number;
      hourlyPatterns: Map<string, Map<number, number>>;
      topRiskHours: Array<{ day: string; hour: number; risk: number }>;
    }>;
    crimes: any[];
  }> {
    const crimes = await this.fetchCrimeData(lookbackDays || this.config.lookbackDays || 180);
    const riskScores = this.calculateBarangayRiskScores(crimes);
    const { byBarangay } = this.buildHourlyPatterns(crimes, this.config.aggregationWindow);

    const barangayList = Array.from(byBarangay.entries()).map(([name, data]) => {
      // Find top 5 risk hours across all days
      const allRiskHours: Array<{ day: string; hour: number; risk: number }> = [];
      
      for (const [day, hourMap] of data.hourlyPerDay.entries()) {
        for (const [hour, risk] of hourMap.entries()) {
          if (risk > 0) {
            allRiskHours.push({ day, hour, risk });
          }
        }
      }
      
      allRiskHours.sort((a, b) => b.risk - a.risk);

      return {
        name: this.denormalizeName(name),
        totalRisk: riskScores.get(name) || 0,
        crimeCount: data.total,
        hourlyPatterns: data.hourlyPerDay,
        topRiskHours: allRiskHours.slice(0, 5)
      };
    });

    // Sort by total risk descending
    barangayList.sort((a, b) => b.totalRisk - a.totalRisk);

    return { barangays: barangayList, crimes };
  }

  private calculateBarangayRiskScores(crimes: any[]): Map<string, number> {
    const map = new Map<string, number>();
    const halfLife = this.config.recencyHalfLifeDays || 14; 
    
    let referenceDate = new Date().getTime();
    if (crimes.length > 0) {
        const maxDate = crimes.reduce((max: number, c: any) => {
            const t = c.dateCommitted ? new Date(c.dateCommitted).getTime() : 0;
            return t > max ? t : max;
        }, 0);
        if (new Date().getTime() - maxDate > 1000 * 60 * 60 * 24 * 30) {
            referenceDate = maxDate;
        }
    }

    for (const c of crimes) {
      if (!c.dateCommitted) continue;
      const nm = this.normalizeName(c.barangay);
      const baseWeight = c.weight?.weight || 1;
      const crimeMs = new Date(c.dateCommitted).getTime();
      const daysOld = Math.max(0, (referenceDate - crimeMs) / (1000 * 60 * 60 * 24));
      const decayFactor = Math.pow(0.5, daysOld / halfLife);
      const finalRisk = Math.max(0.01, baseWeight * decayFactor);
      map.set(nm, (map.get(nm) || 0) + finalRisk);
    }
    return map;
  }

  private buildHourlyPatterns(crimes: any[], aggregationWindow: number = 1) {
    const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
    const hourlyTotalsPerDay: Record<string, number[]> = {};
    days.forEach(d => hourlyTotalsPerDay[d] = new Array(24).fill(0));

    const byBarangay = new Map<string, { hourlyPerDay: Map<string, Map<number, number>>, total: number }>();

    for (const c of crimes) {
      if (!c.timeCommitted || !c.dateCommitted) continue;
      const dayName = new Date(c.dateCommitted).toLocaleDateString('en-US', { weekday: 'long' });
      const t = new Date(c.timeCommitted);
      const hour = t.getHours();
      const aggHour = Math.floor(hour / aggregationWindow) * aggregationWindow;
      const weight = c.weight?.weight || 1; 

      if (!hourlyTotalsPerDay[dayName]) hourlyTotalsPerDay[dayName] = new Array(24).fill(0);
      hourlyTotalsPerDay[dayName][aggHour] += weight;

      const nm = this.normalizeName(c.barangay);
      if (!byBarangay.has(nm)) byBarangay.set(nm, { hourlyPerDay: new Map(), total: 0 });
      const ent = byBarangay.get(nm)!;
      ent.total += weight;
      if (!ent.hourlyPerDay.has(dayName)) ent.hourlyPerDay.set(dayName, new Map());
      const dayMap = ent.hourlyPerDay.get(dayName)!;
      dayMap.set(aggHour, (dayMap.get(aggHour) || 0) + weight);
    }
    return { hourlyTotalsPerDay, byBarangay };
  }

  private generateDynamicSlotsPerWeek(weekStartDate: Date, hourlyTotalsPerDay: Record<string, number[]>): TimeSlot[] {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const pct = Math.max(0.01, (this.config.hourSimilarityPct ?? 0.2));
    const resultSlots: TimeSlot[] = [];

    for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
      const dayName = days[dayIdx];
      const totals = hourlyTotalsPerDay[dayName] || new Array(24).fill(0);
      
      // Check if we have ANY crime data for this day
      const hasCrimeData = totals.some(v => v > 0);
      
      if (!hasCrimeData) {
        // NO CRIME DATA: Generate baseline shifts (every 4 hours)
        const baselineShifts = [
          { start: 0, end: 4 },   // 00:00-04:00
          { start: 4, end: 8 },   // 04:00-08:00
          { start: 8, end: 12 },  // 08:00-12:00
          { start: 12, end: 16 }, // 12:00-16:00
          { start: 16, end: 20 }, // 16:00-20:00
          { start: 20, end: 24 }, // 20:00-00:00
        ];
        
        for (const shift of baselineShifts) {
          const date = new Date(weekStartDate);
          date.setDate(date.getDate() + dayIdx);
          date.setHours(shift.start, 0, 0, 0);
          
          resultSlots.push({
            startHour: shift.start,
            endHour: shift.end === 24 ? 0 : shift.end,
            date: new Date(date),
            label: `${shift.start.toString().padStart(2, '0')}:00-${(shift.end % 24).toString().padStart(2, '0')}:00`,
            dayName,
          });
        }
        continue; // Skip crime-based generation for this day
      }
      
      // HAS CRIME DATA: Use dynamic slot generation
      const smooth = new Array(24).fill(0);
      for (let h = 0; h < 24; h++) {
        const prev = totals[(h + 23) % 24];
        const cur = totals[h];
        const next = totals[(h + 1) % 24];
        smooth[h] = (prev + cur + next) / 3;
      }

      const segs: { start: number; end: number }[] = [];
      let segStart = 0;
      for (let h = 0; h < 24; h++) {
        const next = (h + 1) % 24;
        const denom = Math.max(1e-6, Math.max(Math.abs(smooth[h]), Math.abs(smooth[next])));
        const rel = Math.abs(smooth[next] - smooth[h]) / denom;
        if (rel > pct || h === 23) {
          const segEnd = h === 23 ? 24 : (h + 1);
          segs.push({ start: segStart, end: segEnd });
          segStart = (h + 1) % 24;
        }
      }

      // Safety: If no segments detected, use baseline
      if (segs.length === 0) {
        const baselineShifts = [
          { start: 0, end: 8 },
          { start: 8, end: 16 },
          { start: 16, end: 24 },
        ];
        segs.push(...baselineShifts);
      }
      
      const mergedSegs: { start: number; end: number }[] = [];
      const maxShiftHours = this.config.maxShiftHours || 8;
      
      for (const s of segs) {
        const len = s.end - s.start;
        
        if (mergedSegs.length > 0) {
          const last = mergedSegs[mergedSegs.length - 1];
          const lastLen = last.end - last.start;
          const combinedLen = s.end - last.start;
          
          if ((len < 4 || lastLen < 4) && combinedLen <= maxShiftHours) {
            last.end = s.end;
            continue;
          }
        }
        
        if (len > maxShiftHours) {
          let currentStart = s.start;
          while (currentStart < s.end) {
            const remainingHours = s.end - currentStart;
            let chunkSize = Math.min(maxShiftHours, remainingHours);
            // Balance the last two chunks if splitting normally leaves a tiny chunk
            if (remainingHours > maxShiftHours && remainingHours < maxShiftHours + 4) {
               chunkSize = Math.ceil(remainingHours / 2);
            }
            mergedSegs.push({ start: currentStart, end: currentStart + chunkSize });
            currentStart += chunkSize;
          }
        } else {
          mergedSegs.push({ start: s.start, end: s.end });
        }
      }

      // Post-process: Ensure no trailing tiny segments
      if (mergedSegs.length >= 2) {
          const last = mergedSegs[mergedSegs.length - 1];
          const prev = mergedSegs[mergedSegs.length - 2];
          if (last.end - last.start < 4) {
              const combined = last.end - prev.start;
              if (combined <= maxShiftHours) {
                  prev.end = last.end;
                  mergedSegs.pop();
              } else {
                  const half = Math.floor(combined / 2);
                  prev.end = prev.start + half;
                  last.start = prev.end;
              }
          }
      }

      for (const seg of mergedSegs) {
        const date = new Date(weekStartDate);
        date.setDate(date.getDate() + dayIdx);
        date.setHours(seg.start, 0, 0, 0);
        
        resultSlots.push({
          startHour: seg.start,
          endHour: seg.end === 24 ? 0 : seg.end,
          date: new Date(date),
          label: `${seg.start.toString().padStart(2, '0')}:00-${(seg.end % 24).toString().padStart(2, '0')}:00`,
          dayName,
        });
      }
    }
    return resultSlots;
  }

  private getHighRiskBarangaysForSlot(
    barangays: Barangay[], 
    slot: TimeSlot, 
    lastSlotCoveredAreas: Set<string>, 
    topFraction = 0.35
  ): Barangay[] {
    const hours: number[] = [];
    if (slot.endHour > slot.startHour) {
      for (let h = slot.startHour; h < slot.endHour; h++) hours.push(h % 24);
    } else {
      for (let h = slot.startHour; h < slot.startHour + ((24 - slot.startHour) + slot.endHour); h++) hours.push(h % 24);
    }

    const dayName = slot.dayName;
    const randomness = this.weights.randomnessFactor;
    const wTime = this.weights.crimeClockWeight;
    const wBase = 1.0 - wTime;

    const globalMaxRisk = barangays.reduce((max, b) => Math.max(max, b.riskScore), 0);

    const neighborsOfPrevious = new Set<string>();
    if (this.adjacencyMap && lastSlotCoveredAreas.size > 0) {
        lastSlotCoveredAreas.forEach(area => {
            const neighbors = this.adjacencyMap![area] || [];
            neighbors.forEach(n => neighborsOfPrevious.add(n));
        });
    }

    const scored = barangays.map(b => {
      let hourlySum = 0;
      if (b.hourlyRiskPerDay && b.hourlyRiskPerDay.has(dayName)) {
        const dayMap = b.hourlyRiskPerDay.get(dayName)!;
        for (const h of hours) hourlySum += (dayMap.get(h) || 0);
      } else if (b.hourlyRisk) {
        for (const h of hours) hourlySum += (b.hourlyRisk.get(h) || 0);
      }
      
      const baseRisk = b.riskScore * 0.1; 
      let combinedScore = (hourlySum * wTime) + (baseRisk * wBase);
      
      const noise = 1 + (Math.random() * randomness - (randomness / 2));
      combinedScore *= noise;

      const normName = this.normalizeName(b.name);
      if (lastSlotCoveredAreas.has(normName)) {
          combinedScore *= (b.riskScore > globalMaxRisk * this.weights.criticalAreaThreshold) 
            ? 1.5 
            : this.weights.repeatAreaPenalty;
      } else if (neighborsOfPrevious.has(normName)) {
          combinedScore *= this.weights.neighborContinuityBonus;
      }

      return { b, s: combinedScore };
    }).filter(x => x.s > 0).sort((a,b) => b.s - a.s);

    const take = Math.max(2, Math.ceil(barangays.length * topFraction));
    let selected = scored.slice(0, take).map(x => x.b);

    if (this.clustering.neighborSwapChance > 0 && this.adjacencyMap) {
        selected = selected.map(bar => {
            if (Math.random() < this.clustering.neighborSwapChance) {
                const neighbors = this.adjacencyMap![this.normalizeName(bar.name)] || [];
                if (neighbors.length > 0) {
                    const randomNeighborName = neighbors[Math.floor(Math.random() * neighbors.length)];
                    const neighborObj = barangays.find(b => this.normalizeName(b.name) === randomNeighborName);
                    if (neighborObj) return neighborObj;
                }
            }
            return bar;
        });
    }

    return selected;
  }

  private expandAdjClusterIfNeeded(
    hotspots: Barangay[], 
    adjacency: Record<string,string[]>, 
    availableVehiclesCount: number
  ): string[][] {
    const normToObj = new Map<string, Barangay>();
    hotspots.forEach(h => normToObj.set(this.normalizeName(h.name), h));

    const visited = new Set<string>();
    const clusters: string[][] = [];
    const maxClusterSize = this.clustering.maxAreasPerCluster;
    
    const sortedHotspots = [...hotspots].sort((a,b) => b.riskScore - a.riskScore);

    for (const seedBarangay of sortedHotspots) {
      const seedName = this.normalizeName(seedBarangay.name);
      if (visited.has(seedName)) continue;

      const currentCluster: string[] = [seedName];
      visited.add(seedName);

      const seedRisk = seedBarangay.riskScore || 0;

      while (currentCluster.length < maxClusterSize) {
        const candidates = new Set<string>();
        for (const member of currentCluster) {
            const neighbors = adjacency[member] || [];
            for (const neighbor of neighbors) {
                if (!visited.has(neighbor)) candidates.add(neighbor);
            }
        }
        if (candidates.size === 0) break;

        let bestCandidate: string | null = null;
        let bestScore = -1;

        for (const candidate of candidates) {
            const obj = normToObj.get(candidate);
            const score = obj ? obj.riskScore : (seedRisk * 0.05); 
            
            if (score > bestScore) {
                bestScore = score;
                bestCandidate = candidate;
            }
        }

        if (currentCluster.length >= 2) {
            if (bestScore < (seedRisk * this.clustering.minRiskRatioForExpansion)) {
                break; 
            }
        }

        if (bestCandidate) {
            currentCluster.push(bestCandidate);
            visited.add(bestCandidate);
        } else {
            break;
        }
      }
      clusters.push(currentCluster.map(x => this.denormalizeName(x)));
    }
    return clusters;
  }

  private async createTeamsFromClusters(
    clusters: string[][], 
    vehicles: Vehicle[], 
    personnelPool: Personnel[], 
    barangaysAll: Barangay[]
  ): Promise<Team[]> {
    if (!vehicles.length || !personnelPool.length || !clusters.length) return [];

    const clusterInfos = clusters.map((names, idx) => {
      const objs = this.mapNamesToBarangayObjects(names, barangaysAll);
      const riskSum = objs.reduce((s, o) => s + (o.riskScore || 0), 0);
      return { idx, names, objs, riskSum, avgRisk: (objs.length ? riskSum / objs.length : 0) };
    });

    const model: any = { optimize: 'obj', opType: 'max', constraints: {}, variables: {}, ints: {} };
    clusterInfos.forEach(ci => { model.constraints[`cluster_${ci.idx}`] = { max: 1 }; });
    vehicles.forEach((v, j) => { model.constraints[`vehicle_${j}`] = { max: 1 }; });
    model.constraints['personnel_capacity'] = { max: personnelPool.length };

    for (const ci of clusterInfos) {
      for (let j = 0; j < vehicles.length; j++) {
        const v = vehicles[j];
        const varName = `x_${ci.idx}_${j}`;
        const obj = ci.riskSum - (ci.names.length * 0.1); 
        const minPersonnel = v.type === 'car' ? this.config.minPersonnelPerVehicle.car : this.config.minPersonnelPerVehicle.bike;
        
        const varRow: any = { obj };
        varRow[`cluster_${ci.idx}`] = 1;
        varRow[`vehicle_${j}`] = 1;
        varRow['personnel_capacity'] = minPersonnel;
        model.variables[varName] = varRow;
        model.ints[varName] = 1;
      }
    }

    const { Worker } = require('worker_threads');
    const path = require('path');
    
    let sol: any;
    try {
      sol = await new Promise((resolve, reject) => {
        const workerPath = path.join(process.cwd(), 'lib/optimization/solver-worker.js');
        const worker = new Worker(workerPath);
        worker.on('message', (msg: any) => {
          if (msg.success) resolve(msg.sol);
          else reject(new Error(msg.error));
          worker.terminate();
        });
        worker.on('error', (err: Error) => {
          reject(err);
          worker.terminate();
        });
        worker.postMessage(model);
      });
    } catch (err) {
      console.error('[Optimizer Worker Error]', err);
      return this.greedyAssignment(clusterInfos, vehicles, personnelPool);
    }

    if (!sol || sol.feasible === false) return this.greedyAssignment(clusterInfos, vehicles, personnelPool);

    const selectedPairs: Array<{ ciIdx:number; vIdx:number }> = [];
    Object.keys(sol).forEach(k => {
      if (!k.startsWith('x_')) return;
      const val = (sol as any)[k];
      if (typeof val === 'number' && val >= 0.5) {
        const parts = k.split('_');
        selectedPairs.push({ ciIdx: parseInt(parts[1],10), vIdx: parseInt(parts[2],10) });
      }
    });
    selectedPairs.sort((a,b) => {
      const ra = clusterInfos.find(ci=>ci.idx===a.ciIdx)!.riskSum;
      const rb = clusterInfos.find(ci=>ci.idx===b.ciIdx)!.riskSum;
      return rb - ra;
    });

    const sortedPersonnel = personnelPool.slice().sort((a,b)=>a.weeklyHours - b.weeklyHours);
    let ptr = 0;
    const usedVehicles = new Set<number>();
    const teams: Team[] = [];

    for (const sp of selectedPairs) {
      const ci = clusterInfos.find(ci=>ci.idx===sp.ciIdx)!;
      const v = vehicles[sp.vIdx];
      if (usedVehicles.has(v.id)) continue;
      
      const minForVehicle = v.type === 'car' ? this.config.minPersonnelPerVehicle.car : this.config.minPersonnelPerVehicle.bike;
      let size = Math.min(
        this.teamSizing.maxPersonnelPerTeam, 
        Math.max(minForVehicle, Math.ceil(ci.avgRisk / this.teamSizing.riskPerOfficer) + 1)
      );
      
      const assigned: Personnel[] = [];
      for (let i = 0; i < size && ptr < sortedPersonnel.length; i++) assigned.push(sortedPersonnel[ptr++]);
      
      if (assigned.length < minForVehicle) continue;
      usedVehicles.add(v.id);
      teams.push({ vehicle: v, assignedAreas: ci.names, personnel: assigned, score: ci.riskSum });
    }
    return teams;
  }

  private greedyAssignment(clusterInfos: any[], vehicles: Vehicle[], personnelPool: Personnel[]): Team[] {
    clusterInfos.sort((a:any,b:any)=>b.riskSum - a.riskSum);
    const assignments: Team[] = [];
    const sortedPersonnel = personnelPool.slice().sort((a,b)=>a.weeklyHours - b.weeklyHours);
    let ptr = 0;
    for (let j = 0; j < vehicles.length && j < clusterInfos.length; j++) {
      const ci = clusterInfos[j];
      const v = vehicles[j];
      const needed = v.type === 'car' ? this.config.minPersonnelPerVehicle.car : this.config.minPersonnelPerVehicle.bike;
      const size = Math.min(
        this.teamSizing.maxPersonnelPerTeam, 
        Math.max(needed, Math.ceil(ci.avgRisk / 10) + 1)
      );
      const assigned = sortedPersonnel.slice(ptr, ptr + size);
      ptr += assigned.length;
      assignments.push({ vehicle: v, personnel: assigned, assignedAreas: ci.names, score: ci.riskSum });
    }
    return assignments;
  }

  private mapNamesToBarangayObjects(names: string[], barangays: Barangay[]): Barangay[] {
    const out: Barangay[] = [];
    for (const n of names) {
      const found = barangays.find(b => this.normalizeName(b.name) === this.normalizeName(n));
      if (found) out.push(found);
      else out.push({ name: n, riskScore: 0, crimeCount: 0 });
    }
    return out;
  }

  private async fetchCrimeData(lookbackDays: number): Promise<any[]> {
    const since = new Date();
    since.setDate(since.getDate() - lookbackDays);
    
    let crimes = await prisma.ciras_data.findMany({
      where: { dateCommitted: { gte: since }, timeCommitted: { not: null } },
      include: { weight: true },
    });
    
    if (crimes.length === 0) {
      console.warn(`[Optimizer] No data in window. Using latest 5000 fallback.`);
      crimes = await prisma.ciras_data.findMany({
        where: { timeCommitted: { not: null } },
        include: { weight: true },
        orderBy: { dateCommitted: 'desc' },
        take: 5000 
      });
    }
    
    return crimes;
  }

  private calculateScheduleMetrics(
    plans: DeploymentPlan[],
    barangays: Barangay[],
    personnelState: Map<number, PersonnelState>,
    vehicles: Vehicle[]
  ): ScheduleMetrics {
    const coveredBarangays = new Set(plans.flatMap(p => p.areas));
    const highRiskBarangays = barangays
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, Math.ceil(barangays.length * 0.2))
      .map(b => b.name);
    
    const highRiskCovered = highRiskBarangays.filter(b => coveredBarangays.has(b)).length;

    const hoursArray = Array.from(personnelState.values()).map(ps => ps.currentWeekHours);
    const avgHours = hoursArray.reduce((s, h) => s + h, 0) / hoursArray.length;
    const variance = hoursArray.reduce((s, h) => s + Math.pow(h - avgHours, 2), 0) / hoursArray.length;
    const underutilized = hoursArray.filter(h => h < (this.config.maxWeeklyHours * 0.5)).length;

    const avgTeamSize = plans.reduce((s, p) => s + p.personnelIds.length, 0) / (plans.length || 1);
    const uniqueVehicles = new Set(plans.map(p => p.vehicleId)).size;

    const totalRiskCovered = plans.reduce((sum, p) => {
      return sum + p.areas.reduce((areaSum, areaName) => {
        const brgy = barangays.find(b => b.name === areaName);
        return areaSum + (brgy?.riskScore || 0);
      }, 0);
    }, 0);

    const weightedCoverage = plans.reduce((sum, p) => {
      const slotHours = this.calculateSlotHours(p.timeSlot);
      return sum + p.areas.reduce((areaSum, areaName) => {
        const brgy = barangays.find(b => b.name === areaName);
        return areaSum + ((brgy?.riskScore || 0) * slotHours);
      }, 0);
    }, 0);

    return {
      coverage: {
        barangaysCovered: coveredBarangays.size,
        totalBarangays: barangays.length,
        coveragePercent: (coveredBarangays.size / barangays.length) * 100,
        highRiskCoveragePercent: (highRiskCovered / highRiskBarangays.length) * 100
      },
      fairness: {
        personnelUtilization: Array.from(personnelState.values()).map(ps => ({
          id: ps.person.id,
          name: ps.person.name,
          hours: ps.currentWeekHours
        })),
        hoursStdDev: Math.sqrt(variance),
        underutilizedCount: underutilized
      },
      efficiency: {
        avgTeamSize,
        vehicleUtilization: (uniqueVehicles / vehicles.length) * 100,
        totalDeployments: plans.length
      },
      riskReduction: {
        totalRiskCovered,
        weightedCoverageScore: weightedCoverage
      }
    };
  }

  private calculateSlotHours(timeSlot: string): number {
    const parts = timeSlot.split('-');
    if (parts.length !== 2) return 1;
    const start = parseInt(parts[0].split(':')[0]);
    const end = parseInt(parts[1].split(':')[0]);
    return end > start ? end - start : (24 - start + end);
  }

  private validatePlans(
    plans: DeploymentPlan[], 
    personnelState: Map<number, PersonnelState>,
    vehicles: Vehicle[]
  ): string[] {
    const warnings: string[] = [];
    
    const personnelByTime = new Map<string, Set<number>>();
    
    for (const plan of plans) {
      const key = `${plan.date.toISOString()}_${plan.timeSlot}`;
      if (!personnelByTime.has(key)) personnelByTime.set(key, new Set());
      
      const existing = personnelByTime.get(key)!;
      for (const pid of plan.personnelIds) {
        if (existing.has(pid)) {
          warnings.push(`Personnel ${pid} assigned to overlapping shifts at ${key}`);
        }
        existing.add(pid);
      }
    }
    
    for (const [pid, state] of personnelState) {
      if (state.currentWeekHours > this.config.maxWeeklyHours) {
        warnings.push(`Personnel ${state.person.name} exceeds max hours: ${state.currentWeekHours}h / ${this.config.maxWeeklyHours}h`);
      }
      if (this.config.minWeeklyHours && state.currentWeekHours < this.config.minWeeklyHours) {
        warnings.push(`Personnel ${state.person.name} under minimum hours: ${state.currentWeekHours}h / ${this.config.minWeeklyHours}h`);
      }
    }
    
    for (const plan of plans) {
      const vehicle = vehicles.find(v => v.id === plan.vehicleId);
      if (!vehicle) continue;
      
      const minRequired = vehicle.type === 'car' 
        ? this.config.minPersonnelPerVehicle.car 
        : this.config.minPersonnelPerVehicle.bike;
        
      if (plan.personnelIds.length < minRequired) {
        warnings.push(`Team for vehicle ${plan.vehicleId} has insufficient personnel: ${plan.personnelIds.length} < ${minRequired}`);
      }
    }
    
    return warnings;
  }

  async generateWeeklyScheduleDynamic(weekStartDate: Date): Promise<ScheduleResult> {
    const warnings: string[] = [];

    try {
      if (!this.adjacencyMap) {
        try {
          await this.loadSpatialData();
        } catch (e) {
          warnings.push('Spatial data unavailable - clustering may be suboptimal');
          this.adjacencyMap = {};
        }
      }

      const adjacency = this.adjacencyMap || {};
      const lookbackDays = this.config.lookbackDays ?? 180;

      const [crimesAll, brgyRows, personRows, vehicleRows] = await Promise.all([
        this.fetchCrimeData(lookbackDays),
        prisma.ciras_data.findMany({ select: { barangay: true }, distinct: ['barangay'] }),
        prisma.personnel.findMany({ 
          where: { isActive: true, isAvailable: true },
          include: { 
            weeklyHours: true,
            position: true,  // Include Position relation
            role: true       // Include Role relation
          } 
        }),
        prisma.patrolCar.findMany({ where: { isActive: true, isAvailable: true } })
      ]);

      if (crimesAll.length === 0) {
        throw new Error('No crime data available in database.');
      }

      const { hourlyTotalsPerDay, byBarangay } = this.buildHourlyPatterns(crimesAll, this.config.aggregationWindow);
      const timeSlots = this.generateDynamicSlotsPerWeek(weekStartDate, hourlyTotalsPerDay);
      
      if (timeSlots.length === 0) {
        throw new Error('No timeslots generated.');
      }

      const riskScores = this.calculateBarangayRiskScores(crimesAll);
      const barangays: Barangay[] = brgyRows.map(r => {
        const nm = this.normalizeName(r.barangay);
        const entry = byBarangay.get(nm);
        return {
          name: r.barangay,
          riskScore: riskScores.get(nm) || 0, 
          crimeCount: entry?.total || 0,
          hourlyRiskPerDay: entry?.hourlyPerDay || new Map(),
        };
      });

      const personnelPool: Personnel[] = personRows.map(p => {
        const wh = Array.isArray(p.weeklyHours) ? p.weeklyHours[0] : (p.weeklyHours as any);
        
        // Parse duty days from comma-separated string
        const dutyDaysStr = p.dutyDays || '';
        const dutyDays = dutyDaysStr ? dutyDaysStr.split(',').map(d => d.trim()) : [];
        
        return { 
          id: p.id, 
          name: p.name, 
          position: {
            name: p.position?.name || 'Unknown',
            rank: p.position?.rank || 0,
            canPatrol: p.position?.canPatrol ?? true
          },
          role: {
            name: p.role?.name || 'Unknown',
            canPatrol: p.role?.canPatrol ?? true,
            canPatrolAtNight: p.role?.canPatrolAtNight ?? false
          },
          dutyDays: dutyDays,
          weeklyHours: wh?.hours || 0, 
          availability: true 
        };
      });

      const personnelState = new Map<number, PersonnelState>(
        personnelPool.map(p => [p.id, {
          person: p,
          currentWeekHours: p.weeklyHours,
          isAvailable: true
        }])
      );

      if (!vehicleRows.length) {
        throw new Error('No active/available vehicles found.');
      }
      
      const vehicles: Vehicle[] = vehicleRows.map(v => {
        const isBike = v.type.toLowerCase().includes('bike') || v.type.toLowerCase().includes('motor');
        return { 
          id: v.id, 
          name: v.name, 
          type: isBike ? 'bike' : 'car', 
          capacity: isBike ? 2 : 4 
        };
      });

      const plans: DeploymentPlan[] = [];
      const planMap = new Map<string, DeploymentPlan>();
      const nightStart = this.config.nightShiftStartHour ?? 17;
      const allowAuxiliaryAtNight = this.config.allowNonPatrolAtNight ?? false; 
      const patrolTitle = (this.config.patrolPositionName || 'Patrol Officer').toLowerCase();

      let lastSlotCoveredAreas = new Set<string>();

      for (const slot of timeSlots) {
        const highRiskBar = this.getHighRiskBarangaysForSlot(barangays, slot, lastSlotCoveredAreas, 0.35);
        lastSlotCoveredAreas = new Set(highRiskBar.map(b => this.normalizeName(b.name)));

        if (highRiskBar.length === 0) continue;

        let availableVehicles = vehicles.slice();
        
        let availablePersonnel = Array.from(personnelState.values())
          .filter(ps => ps.isAvailable)
          .map(ps => ps.person);

        // DEBUG: Log personnel hours before filtering
        if (slot.label === '08:00-10:00' && slot.date.getDay() === 1) {
          console.log('=== SLOT DEBUG ===');
          console.log('Available personnel count:', availablePersonnel.length);
          console.log('Top 5 by hours:', availablePersonnel
            .slice()
            .sort((a,b) => a.weeklyHours - b.weeklyHours)
            .slice(0, 5)
            .map(p => `${p.name}: ${p.weeklyHours}h`)
          );
        }

        // Filter by Position and Role eligibility
        availablePersonnel = availablePersonnel.filter(p => {
          // Check if position allows patrol
          if (!p.position.canPatrol) return false;
          
          // Check if role allows patrol
          if (!p.role.canPatrol) return false;
          
          // Check duty days - personnel can only work on their assigned days
          if (p.dutyDays && p.dutyDays.length > 0) {
            const dayOfWeek = slot.dayName.substring(0, 3); // "Monday" -> "Mon"
            if (!p.dutyDays.includes(dayOfWeek)) {
              return false; // Not on duty this day
            }
          }
          
          // Always exclude Chiefs and Supervisors (even if their flags say they can patrol)
          const roleName = p.role.name.toLowerCase();
          const positionName = p.position.name.toUpperCase();
          
          if (roleName.includes('chief of police') || 
              roleName.includes('station chief') ||
              roleName.includes('station supervisor') ||
              positionName.includes('PCOL') ||
              positionName.includes('PLTCOL')) {
            return false;
          }
          
          // Night shift: Check if role allows night patrol
          const isNightShift = slot.startHour >= nightStart || slot.startHour < 5;
          if (isNightShift && !p.role.canPatrolAtNight) return false;
          
          return true;
        });

        if (availableVehicles.length === 0 || availablePersonnel.length === 0) continue;

        const clusters = this.expandAdjClusterIfNeeded(highRiskBar, adjacency, availableVehicles.length);
        let teams = await this.createTeamsFromClusters(clusters, availableVehicles, availablePersonnel, barangays);

        if (!teams || teams.length === 0) {
          const v = availableVehicles[0];
          const size = Math.min(4, availablePersonnel.length);
          teams = [{ 
              vehicle: v, 
              personnel: availablePersonnel.slice(0, size), 
              assignedAreas: highRiskBar.map(b => b.name).slice(0,3) 
          }];
        }

        for (const t of teams) {
          const planKey = `${slot.date.getTime()}_${t.vehicle.id}_${slot.label}`;
          const exists = planMap.get(planKey);
          
          if (exists) {
            exists.areas = Array.from(new Set([...exists.areas, ...t.assignedAreas]));
            exists.personnelIds = Array.from(new Set([...exists.personnelIds, ...t.personnel.map(pp => pp.id)]));
            continue;
          }

          const canonicalAreas = t.assignedAreas.map(a => {
              const f = barangays.find(b => this.normalizeName(b.name) === this.normalizeName(a));
              return f ? f.name : a;
          });

          const plan: DeploymentPlan = {
            scheduleId: 0,
            timeSlot: slot.label,
            date: slot.date,
            areas: canonicalAreas,
            vehicleId: t.vehicle.id,
            personnelIds: t.personnel.map(p => p.id),
            priority: 1
          };

          planMap.set(planKey, plan);

          for (const p of t.personnel) {
            const state = personnelState.get(p.id)!;
            const hours = (slot.endHour > slot.startHour) 
              ? slot.endHour - slot.startHour 
              : (24 - slot.startHour + slot.endHour);
            
            state.currentWeekHours += hours;
            
            // ✅ FIX: Update the person object's weeklyHours so sorting works
            state.person.weeklyHours = state.currentWeekHours;
            
            const scarcity = availablePersonnel.length <= Math.max(1, teams.length);
            if (!this.config.allowBackToBackIfScarce || !scarcity) {
               state.isAvailable = state.currentWeekHours < (this.config.maxWeeklyHours || 56);
            } else {
               state.isAvailable = true;
            }
          }
          
          const vIdx = availableVehicles.findIndex(v => v.id === t.vehicle.id);
          if (vIdx !== -1) availableVehicles.splice(vIdx, 1);
        }
      }

      const finalPlans = Array.from(planMap.values());

      const validationWarnings = this.validatePlans(finalPlans, personnelState, vehicles);
      warnings.push(...validationWarnings);

      const uncoveredHighRisk = this.findUncoveredHighRiskAreas(finalPlans, barangays);
      if (uncoveredHighRisk.length > 0) {
        warnings.push(`${uncoveredHighRisk.length} high-risk areas not covered: ${uncoveredHighRisk.slice(0, 3).join(', ')}${uncoveredHighRisk.length > 3 ? '...' : ''}`);
      }

      const metrics = this.calculateScheduleMetrics(finalPlans, barangays, personnelState, vehicles);

      return { plans: finalPlans, metrics, warnings };

    } catch (error) {
      console.error('[DeploymentOptimizer] Generation failed:', error);
      throw new Error(`Schedule generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private findUncoveredHighRiskAreas(plans: DeploymentPlan[], barangays: Barangay[]): string[] {
    const coveredAreas = new Set(plans.flatMap(p => p.areas));
    const highRiskAreas = barangays
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, Math.ceil(barangays.length * 0.2));
    
    return highRiskAreas
      .filter(b => !coveredAreas.has(b.name))
      .map(b => b.name);
  }

  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!this.config.minPersonnelPerTeam || this.config.minPersonnelPerTeam < 1) {
      errors.push('minPersonnelPerTeam must be >= 1');
    }
    if (!this.config.minPersonnelPerVehicle?.car || this.config.minPersonnelPerVehicle.car < 1) {
      errors.push('minPersonnelPerVehicle.car must be >= 1');
    }
    if (!this.config.minPersonnelPerVehicle?.bike || this.config.minPersonnelPerVehicle.bike < 1) {
      errors.push('minPersonnelPerVehicle.bike must be >= 1');
    }
    if (!this.config.maxWeeklyHours || this.config.maxWeeklyHours < 1) {
      errors.push('maxWeeklyHours must be >= 1');
    }
    return { valid: errors.length === 0, errors };
  }
}

export function createOptimizer(config: OptimizationConfig): DeploymentOptimizer {
  return new DeploymentOptimizer(config);
}