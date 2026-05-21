import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db" // Ensure this matches your actual Prisma import path

// Focus crimes mapping
const FOCUS_CRIMES = [
  "Physical Injury",
  "Homicide", 
  "Murder",
  "Rape",
  "Robbery",
  "Theft",
  "Carnapping",
  "Motornapping"
]

// Helper to identify vehicular incidents
const isVehicularIncident = (incidentType: string) => {
  return incidentType?.toLowerCase().includes("vehicular accident")
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    
    // 1. Get Parameters (Aligned with new Frontend naming)
    const recentStart = searchParams.get("recentStart")
    const recentEnd = searchParams.get("recentEnd")
    const pastStart = searchParams.get("pastStart")
    const pastEnd = searchParams.get("pastEnd")
    const recentLabel = searchParams.get("recentLabel") || "Recent Period"
    const pastLabel = searchParams.get("pastLabel") || "Reference Period"

    // 2. Validation
    if (!recentStart || !recentEnd || !pastStart || !pastEnd) {
      return NextResponse.json(
        { error: "All date range parameters are required" },
        { status: 400 }
      )
    }

    // 3. Parallel Database Queries
    const [recentCrimes, pastCrimes] = await Promise.all([
      prisma.ciras_data.findMany({
        where: {
          dateCommitted: {
            gte: new Date(recentStart),
            lte: new Date(recentEnd)
          }
        },
        select: {
          incidentType: true,
          offenseType: true
        }
      }),
      prisma.ciras_data.findMany({
        where: {
          dateCommitted: {
            gte: new Date(pastStart),
            lte: new Date(pastEnd)
          }
        },
        select: {
          incidentType: true,
          offenseType: true
        }
      })
    ])

    // 4. Data Processing Helper
    // This processes the raw DB rows into the counts needed for the charts
    const processCrimeData = (crimes: any[]) => {
      // Focus Crimes Count
      const focusCounts = FOCUS_CRIMES.map(crimeLabel => {
        const count = crimes.filter(c => {
          const type = c.incidentType || ""
          return type.toLowerCase().includes(crimeLabel.toLowerCase()) && !isVehicularIncident(type)
        }).length
        return count
      })

      // POI (Peace and Order) - Everything EXCEPT vehicular
      const poi = crimes.filter(c => !isVehicularIncident(c.incidentType || "")).length

      // PSI (Public Safety) - ONLY vehicular
      const psi = crimes.filter(c => isVehicularIncident(c.incidentType || "")).length

      return { focusCounts, poi, psi, total: crimes.length }
    }

    const recentStats = processCrimeData(recentCrimes)
    const pastStats = processCrimeData(pastCrimes)

    // 5. Return JSON Response
    return NextResponse.json({
      recentLabel,
      pastLabel,
      
      // Data for the Focus Crime Bar Chart
      focusCrimes: {
        labels: FOCUS_CRIMES,
        recentData: recentStats.focusCounts,
        pastData: pastStats.focusCounts
      },

      // Data for Pie Charts and Distribution Bars
      tciDistribution: {
        recent: { 
          poi: recentStats.poi, 
          psi: recentStats.psi 
        },
        past: { 
          poi: pastStats.poi, 
          psi: pastStats.psi 
        }
      },

      // Data for Top Summary Cards
      totalCrimes: {
        recent: recentStats.total,
        past: pastStats.total
      }
    })

  } catch (error) {
    console.error("Comparison API Error:", error)
    return NextResponse.json(
      { error: "Failed to fetch comparison data" },
      { status: 500 }
    )
  }
}