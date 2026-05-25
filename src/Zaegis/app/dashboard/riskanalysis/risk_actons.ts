'use server'

import { createOptimizer } from '@/lib/optimization/deployment_optimizer';

export interface BarangayRiskData {
  name: string;
  totalRisk: number;
  crimeCount: number;
  hourlyPatterns: {
    day: string;
    hours: { hour: number; risk: number }[];
  }[];
  topRiskHours: {
    day: string;
    hour: number;
    risk: number;
  }[];
}

export async function getBarangayRiskAnalysis(lookbackDays: number = 180): Promise<{
  success: boolean;
  data?: BarangayRiskData[];
  error?: string;
}> {
  try {
    // ✅ REUSE OPTIMIZER - No code duplication!
    const optimizer = createOptimizer({
      minPersonnelPerTeam: 2,
      minPersonnelPerVehicle: { car: 2, bike: 1 },
      maxWeeklyHours: 48,
      aggregationWindow: 1, // 1-hour granularity for detailed view
      lookbackDays: lookbackDays
    });

    // Use optimizer's existing analysis methods
    const analysis = await optimizer.analyzeBarangayRisks(lookbackDays);

    // Transform to our format
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    const barangayRiskData: BarangayRiskData[] = analysis.barangays.map(barangay => {
      const hourlyPatterns = days.map(day => {
        const dayMap = barangay.hourlyPatterns.get(day) || new Map();
        const hours = Array.from({ length: 24 }, (_, hour) => ({
          hour,
          risk: dayMap.get(hour) || 0
        }));
        return { day, hours };
      });

      return {
        name: barangay.name,
        totalRisk: barangay.totalRisk,
        crimeCount: barangay.crimeCount,
        hourlyPatterns,
        topRiskHours: barangay.topRiskHours
      };
    });

    return {
      success: true,
      data: barangayRiskData
    };
  } catch (error) {
    console.error('[Risk Analysis] Failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}