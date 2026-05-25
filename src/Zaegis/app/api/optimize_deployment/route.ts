import { createOptimizer, OptimizationConfig } from '@/lib/optimization/deployment_optimizer';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db'; // Use your existing singleton

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    
    if (body.action === 'confirm' && body.plans) {
      return await handleConfirmation(body.plans);
    }

    const previewOnly = body.previewOnly === true;

    // --- MAP CONFIG ---
    const config: OptimizationConfig = {
      minPersonnelPerTeam: body.minPersonnelPerTeam || 2,
      minPersonnelPerVehicle: {
        car: body.minPersonnelPerCar || 2,
        bike: body.minPersonnelPerBike || 1,
      },
      maxWeeklyHours: body.maxWeeklyHours || 48,
      minWeeklyHours: body.minWeeklyHours || 24,
      
      // Algorithm Settings
      aggregationWindow: body.aggregationWindow || 1,
      lookbackDays: body.lookbackDays || 180,
      hourSimilarityPct: body.hourSimilarityPct || 0.2,
      recencyHalfLifeDays: body.recencyHalfLifeDays || 14, 
      nightShiftStartHour: body.nightShiftStartHour || 17, 
      allowNonPatrolAtNight: body.allowNonPatrolAtNight === true,
      patrolPositionName: body.patrolPositionName || 'Patrol Officer',
      
      // NEW: Configurable weights (use defaults if not provided)
      weights: {
        crimeClockWeight: body.crimeClockWeight ?? 0.9,
        randomnessFactor: body.randomnessFactor ?? 0.15,
        neighborContinuityBonus: body.neighborContinuityBonus ?? 1.25,
        repeatAreaPenalty: body.repeatAreaPenalty ?? 0.4,
        criticalAreaThreshold: body.criticalAreaThreshold ?? 0.85,
      },
      
      clustering: {
        maxAreasPerCluster: body.maxAreasPerCluster || 6,
        minRiskRatioForExpansion: body.minRiskRatioForExpansion ?? 0.15,
        neighborSwapChance: body.neighborSwapChance ?? 0.35,
      },
      
      teamSizing: {
        riskPerOfficer: body.riskPerOfficer || 15,
        maxPersonnelPerTeam: body.maxPersonnelPerTeam || 4,
      },
    };

    const optimizer = createOptimizer(config); // Uses prisma singleton internally

    const validation = optimizer.validateConfig();
    if (!validation.valid) {
      return NextResponse.json({ 
        success: false, 
        errors: validation.errors 
      }, { status: 400 });
    }

    const weekStartDate = body.weekStartDate ? new Date(body.weekStartDate) : getMonday(new Date());

    await optimizer.loadSpatialData();
    
    // NEW: Returns { plans, metrics, warnings }
    const result = await optimizer.generateWeeklyScheduleDynamic(weekStartDate);
    
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 7);

    if (previewOnly) {
      return NextResponse.json({
        success: true,
        message: `Generated ${result.plans.length} deployment plans (preview mode)`,
        plans: result.plans.map(p => ({
          ...p,
          date: p.date.toISOString(),
        })),
        metrics: result.metrics, // NEW: Include quality metrics
        warnings: result.warnings, // NEW: Include validation warnings
        totalPlans: result.plans.length,
        durationSeconds: (Date.now() - startTime) / 1000,
        statistics: {
          weekStart: weekStartDate.toISOString(),
          weekEnd: weekEndDate.toISOString(),
          // Include new metrics in statistics
          coverage: result.metrics.coverage,
          fairness: {
            hoursStdDev: result.metrics.fairness.hoursStdDev,
            underutilizedCount: result.metrics.fairness.underutilizedCount,
          },
          efficiency: result.metrics.efficiency,
        },
      });
    }

    // Save to database
    await savePlansToDatabase(result.plans);

    return NextResponse.json({
      success: true,
      message: `Generated and saved ${result.plans.length} deployment plans`,
      totalPlans: result.plans.length,
      durationSeconds: (Date.now() - startTime) / 1000,
      metrics: result.metrics,
      warnings: result.warnings,
      statistics: {
        weekStart: weekStartDate.toISOString(),
        weekEnd: weekEndDate.toISOString(),
        coverage: result.metrics.coverage,
        fairness: {
          hoursStdDev: result.metrics.fairness.hoursStdDev,
          underutilizedCount: result.metrics.fairness.underutilizedCount,
        },
        efficiency: result.metrics.efficiency,
      },
    });

  } catch (error) {
    console.error('[Deployment API] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to generate deployment plan',
        stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
      },
      { status: 500 }
    );
  }
}

async function handleConfirmation(plans: any[]) {
  try {
    if (!plans || !Array.isArray(plans) || plans.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid plans' 
      }, { status: 400 });
    }
    
    await savePlansToDatabase(plans);
    
    return NextResponse.json({ 
      success: true, 
      message: `Saved ${plans.length} plans` 
    });
  } catch (error) {
    console.error('[Deployment API] Confirmation error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Save failed' 
    }, { status: 500 });
  }
}

async function savePlansToDatabase(plans: any[]) {
  if (!plans || plans.length === 0) {
    throw new Error('No plans to save');
  }

  // Group plans by week to handle deletion properly
  const weekStart = getMonday(new Date(plans[0].date));
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  // Use a transaction to ensure all-or-nothing save
  await prisma.$transaction(async (tx) => {
    // Step 1: Find all schedule IDs for this week
    const existingSchedules = await tx.patrolSchedule.findMany({
      where: { 
        date: { 
          gte: weekStart, 
          lt: weekEnd 
        } 
      },
      select: { id: true }
    });

    const scheduleIds = existingSchedules.map(s => s.id);

    // Step 2: Delete PersonnelOnSchedule records first (child records)
    if (scheduleIds.length > 0) {
      await tx.personnelOnSchedule.deleteMany({
        where: {
          scheduleId: {
            in: scheduleIds
          }
        }
      });
    }

    // Step 3: Reset weekly hours for this week (we'll recalculate from new schedules)
    await tx.weeklyHours.deleteMany({
      where: {
        weekStartDate: weekStart
      }
    });

    // Step 4: Delete PatrolSchedule records (parent records)
    await tx.patrolSchedule.deleteMany({
      where: { 
        date: { 
          gte: weekStart, 
          lt: weekEnd 
        } 
      },
    });

    // Step 5: Create new schedules
    for (const plan of plans) {
      const schedule = await tx.patrolSchedule.create({
        data: {
          date: new Date(plan.date),
          timeSlot: plan.timeSlot,
          areas: plan.areas,
          carId: plan.vehicleId, 
        },
      });

      // Step 6: Assign personnel to the schedule
      if (plan.personnelIds?.length) {
        await tx.personnelOnSchedule.createMany({
          data: plan.personnelIds.map((pid: number) => ({
            scheduleId: schedule.id,
            personnelId: pid,
          })),
        });
      }

      // Step 7: Update weekly hours
      const shiftHours = calculateShiftHours(plan.timeSlot);
      
      for (const pid of plan.personnelIds || []) {
        await tx.weeklyHours.upsert({
          where: { 
            personnelId_weekStartDate: { 
              personnelId: pid, 
              weekStartDate: weekStart 
            } 
          },
          create: { 
            personnelId: pid, 
            weekStartDate: weekStart, 
            hours: shiftHours 
          },
          update: { 
            hours: { increment: shiftHours } 
          },
        });
        
        // Step 8: Update last shift date
        await tx.lastShift.upsert({
          where: { personnelId: pid },
          create: { 
            personnelId: pid, 
            date: new Date(plan.date) 
          },
          update: { 
            date: new Date(plan.date) 
          },
        });
      }
    }
  });
}

function calculateShiftHours(timeSlot: string): number {
  try {
    // Handle format: "HH:MM - HH:MM" or "HH:MM-HH:MM"
    const parts = timeSlot.split('-').map(s => s.trim());
    if (parts.length !== 2) return 8; // default
    
    const [startStr, endStr] = parts;
    const start = parseInt(startStr.split(':')[0]);
    const end = parseInt(endStr.split(':')[0]);
    
    let duration = end - start;
    if (duration < 0) duration += 24; // Handle overnight shifts
    
    return duration;
  } catch (error) {
    console.warn('[calculateShiftHours] Failed to parse timeSlot:', timeSlot);
    return 8; // default to 8 hours
  }
}

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  const monday = new Date(date.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const weekStart = searchParams.get('weekStart');
    
    if (!weekStart) {
      return NextResponse.json({ 
        success: true, 
        schedules: [] 
      });
    }

    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);

    // Fetch schedules with includes to avoid N+1 queries
    const schedules = await prisma.patrolSchedule.findMany({
      where: {
        date: {
          gte: start,
          lt: end,
        },
      },
      include: {
        personnel: {
          include: {
            personnel: true,
          },
        },
        patrolCar: true, // Fetch vehicle info immediately
      },
    });

    // Map patrolCar to car to match expected frontend structure
    const schedulesWithCars = schedules.map((schedule) => {
      const { patrolCar, ...rest } = schedule;
      return { ...rest, car: patrolCar };
    });

    return NextResponse.json({ 
      success: true, 
      schedules: schedulesWithCars 
    });
  } catch (error) {
    console.error('[Deployment API] GET error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch schedules' 
      },
      { status: 500 }
    );
  }
}