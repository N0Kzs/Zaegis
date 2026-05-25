'use server'

import { createOptimizer, OptimizationConfig, ScheduleResult } from '@/lib/optimization/deployment_optimizer';

interface GenerateScheduleParams {
  weekStartDate: string;
  config: {
    minPersonnelPerTeam: number;
    minPersonnelPerCar: number;
    minPersonnelPerBike: number;
    maxWeeklyHours: number;
    minWeeklyHours: number;
    aggregationWindow: number;
    lookbackDays: number;
    nightShiftStartHour: number;
    allowNonPatrolAtNight: boolean;
    maxAreasPerCluster: number;
  };
}

export async function generateDeploymentSchedule(params: GenerateScheduleParams): Promise<{
  success: boolean;
  data?: ScheduleResult;
  error?: string;
}> {
  try {
    const optimizer = createOptimizer({
      minPersonnelPerTeam: params.config.minPersonnelPerTeam,
      minPersonnelPerVehicle: {
        car: params.config.minPersonnelPerCar,
        bike: params.config.minPersonnelPerBike
      },
      maxWeeklyHours: params.config.maxWeeklyHours,
      minWeeklyHours: params.config.minWeeklyHours,
      aggregationWindow: params.config.aggregationWindow as 1 | 2 | 3 | 4,
      lookbackDays: params.config.lookbackDays,
      nightShiftStartHour: params.config.nightShiftStartHour,
      allowNonPatrolAtNight: params.config.allowNonPatrolAtNight,
      clustering: {
        maxAreasPerCluster: params.config.maxAreasPerCluster
      }
    });

    // Load spatial data
    await optimizer.loadSpatialData();
    
    // Generate the schedule
    const result = await optimizer.generateWeeklyScheduleDynamic(
      new Date(params.weekStartDate)
    );

    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error('[Server Action] Schedule generation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}