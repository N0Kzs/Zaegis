'use server'

import prisma from '@/lib/db'
import { Prisma } from '@prisma/client'

interface HeatmapFilters {
  offenseTypes?: string[]
  offenses?: string[]
  incidentTypes?: string[]
  barangays?: string[]
  startDate?: string
  endDate?: string
  temporalView?: 'all' | 'year' | 'month' | 'dayOfWeek'
  selectedYear?: number
  selectedMonth?: number
  selectedDayOfWeek?: number
  isAnimating?: boolean // New flag to indicate animation mode
}

interface HeatmapPoint {
  lat: number
  lng: number
  weight: number
}

/**
 * Calculate recency weight using exponential decay
 * NOTE: This is ONLY used for heatmap visualization when NOT animating
 */
function calculateRecencyWeight(incidentDate: Date, currentDate: Date, halfLife: number = 180): number {
  const daysSince = Math.max(0, (currentDate.getTime() - incidentDate.getTime()) / (1000 * 60 * 60 * 24))
  const weight = Math.pow(2, -daysSince / halfLife)
  return weight
}

/**
 * Normalize weights to [0, 1] range
 */
function normalizeWeights(points: HeatmapPoint[]): HeatmapPoint[] {
  if (points.length === 0) return points

  const weights = points.map(p => p.weight)
  const minWeight = Math.min(...weights)
  const maxWeight = Math.max(...weights)

  if (maxWeight === minWeight) {
    return points.map(p => ({ ...p, weight: 1.0 }))
  }

  return points.map(p => ({
    ...p,
    weight: (p.weight - minWeight) / (maxWeight - minWeight)
  }))
}

export async function getHeatmapData(filters: HeatmapFilters): Promise<HeatmapPoint[]> {
  try {
    const whereConditions: Prisma.ciras_dataWhereInput = {
      lat: { not: null },
      lng: { not: null },
      dateCommitted: { not: null },
      weight: {
        weight: { not: null }
      }
    }

    if (filters.offenseTypes && filters.offenseTypes.length > 0 && !filters.offenseTypes.includes('All')) {
      whereConditions.offenseType = { in: filters.offenseTypes }
    }

    if (filters.offenses && filters.offenses.length > 0 && !filters.offenses.includes('All')) {
      whereConditions.offense = { in: filters.offenses }
    }

    if (filters.incidentTypes && filters.incidentTypes.length > 0 && !filters.incidentTypes.includes('All')) {
      whereConditions.incidentType = { in: filters.incidentTypes }
    }

    if (filters.barangays && filters.barangays.length > 0 && !filters.barangays.includes('All')) {
      whereConditions.barangay = { in: filters.barangays }
    }

    // Additional date range filters
    if (filters.startDate) {
      whereConditions.dateCommitted = {
        ...whereConditions.dateCommitted as Prisma.DateTimeNullableFilter,
        gte: new Date(filters.startDate)
      }
    }

    if (filters.endDate) {
      whereConditions.dateCommitted = {
        ...whereConditions.dateCommitted as Prisma.DateTimeNullableFilter,
        lte: new Date(filters.endDate)
      }
    }

    // Fetch data with dates
    const results = await prisma.ciras_data.findMany({
      where: whereConditions,
      select: {
        lat: true,
        lng: true,
        dateCommitted: true,
        weight: {
          select: {
            weight: true
          }
        }
      },
      orderBy: {
        dateCommitted: 'desc'
      }
    })

    // Filter valid results
    const validResults = results.filter(
      row => row.lat !== null &&
        row.lng !== null &&
        row.dateCommitted !== null &&
        row.weight?.weight !== null
    )

    if (validResults.length === 0) {
      return []
    }

    // Apply temporal filters in JavaScript
    let filteredResults = validResults.filter(row => {
      const date = new Date(row.dateCommitted!)

      // Year filter
      if (filters.temporalView === 'year' && filters.selectedYear) {
        if (date.getFullYear() !== filters.selectedYear) {
          return false
        }
      }

      // Month filter
      if (filters.temporalView === 'month' && filters.selectedMonth) {
        if (date.getMonth() + 1 !== filters.selectedMonth) {
          return false
        }
      }

      // Day of week filter
      if (filters.temporalView === 'dayOfWeek' && filters.selectedDayOfWeek !== undefined) {
        if (date.getDay() !== filters.selectedDayOfWeek) {
          return false
        }
      }

      return true
    })

    if (filteredResults.length === 0) {
      return []
    }

    let heatmapPoints: HeatmapPoint[]

    // If animating, use raw crime weights without any transformations
    if (filters.isAnimating) {
      heatmapPoints = filteredResults.map(row => ({
        lat: Number(row.lat),
        lng: Number(row.lng),
        weight: Number(row.weight!.weight) // Raw weight, no decay, no normalization
      }))
    } else {
      // When not animating, apply recency weighting for certain views
      const applyRecencyWeighting = filters.temporalView !== 'year'

      if (applyRecencyWeighting) {
        const mostRecentDate = new Date(
          Math.max(...filteredResults.map(r => new Date(r.dateCommitted!).getTime()))
        )

        heatmapPoints = filteredResults.map(row => {
          const incidentDate = new Date(row.dateCommitted!)
          const recencyWeight = calculateRecencyWeight(incidentDate, mostRecentDate)
          const baseCrimeWeight = Number(row.weight!.weight)
          const combinedWeight = baseCrimeWeight * recencyWeight

          return {
            lat: Number(row.lat),
            lng: Number(row.lng),
            weight: combinedWeight
          }
        })

        heatmapPoints = normalizeWeights(heatmapPoints)
      } else {
        heatmapPoints = filteredResults.map(row => ({
          lat: Number(row.lat),
          lng: Number(row.lng),
          weight: Number(row.weight!.weight)
        }))

        heatmapPoints = normalizeWeights(heatmapPoints)
      }
    }

    return heatmapPoints

  } catch (error) {
    if (error instanceof Error && error.message === 'Query timeout') {
      throw new Error('Database query timed out after 60 seconds. Please refine your filters.')
    }

    throw new Error(`Failed to fetch heatmap data: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}