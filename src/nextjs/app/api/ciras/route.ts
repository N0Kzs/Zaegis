import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    // Build date filter
    const dateFilter = startDate && endDate
      ? {
          dateCommitted: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        }
      : {}

    // Fetch all crime data
    const crimes = await prisma.ciras_data.findMany({
      where: dateFilter,
      include: {
        weight: true,
      },
      orderBy: {
        dateCommitted: 'desc'
      }
    })

    // Return raw data - all processing is done client-side
    return NextResponse.json({
      data: crimes,
    })
  } catch (error) {
    console.error("Error fetching crime data:", error)
    return NextResponse.json(
      { error: "Failed to fetch crime data" },
      { status: 500 }
    )
  }
}