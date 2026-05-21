"use client"

import { useEffect, useState } from "react"
import { Pie, PieChart, Sector, Cell } from "recharts"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { PieSectorDataItem } from "recharts/types/polar/Pie"

export function IncidentPieChart() {
  const [incidentData, setIncidentData] = useState<{ type: string; count: number; percentage: number; fill: string }[]>([])
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [totalCases, setTotalCases] = useState(0)

  // Vibrant color palette
  const vibrantColors = [
    "#EF4444", // Red
    "#F59E0B", // Amber
    "#10B981", // Emerald
    "#3B82F6", // Blue
    "#8B5CF6", // Violet
    "#EC4899", // Pink
    "#14B8A6", // Teal
    "#F97316", // Orange
    "#06B6D4", // Cyan
    "#6366F1", // Indigo
    "#84CC16", // Lime
    "#D946EF", // Fuchsia
    "#0EA5E9", // Sky
    "#A855F7", // Purple
    "#22C55E", // Green
    "#EAB308", // Yellow
    "#DC2626", // Red (darker)
    "#7C3AED", // Violet (darker)
  ]

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("/api/ciras")
        const data = await response.json()

        if (data.offenseTypeDistribution) {
          const total = data.offenseTypeDistribution.reduce(
            (sum: number, item: { count: number }) => sum + item.count,
            0
          )
          setTotalCases(total)

          const formattedData = data.offenseTypeDistribution
            .filter((item: { type: string | null; count: number }) => item.type) // Filter out null types
            .map((item: { type: string | null; count: number }, index: number) => ({
              type: item.type || 'Unknown',
              count: item.count,
              percentage: parseFloat(((item.count / total) * 100).toFixed(1)),
              fill: vibrantColors[index % vibrantColors.length],
            }))
            .sort((a: any, b: any) => b.count - a.count) // Sort by count descending

          setIncidentData(formattedData)
        }
      } catch (error) {
        console.error("Error fetching incident data:", error)
      }
    }
    fetchData()
  }, [])

  const chartConfig = incidentData.reduce((acc, item) => {
    acc[item.type] = {
      label: item.type,
      color: item.fill,
    }
    return acc
  }, {} as ChartConfig)

  return (
    <Card className="hover:shadow-lg transition-all duration-300 border-2">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">
          Offense Types Distribution
        </CardTitle>
        <CardDescription>All offense type categories by percentage</CardDescription>
      </CardHeader>
      <CardContent className="h-[500px] pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[500px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload
                  return (
                    <div className="rounded-lg border bg-background p-3 shadow-md">
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: data.fill }}
                        />
                        <span className="font-semibold text-sm">{data.type}</span>
                      </div>
                      <div className="text-xs space-y-0.5">
                        <p className="text-muted-foreground">
                          Cases: <span className="font-bold text-foreground">{data.count}</span>
                        </p>
                        <p className="text-muted-foreground">
                          Percentage: <span className="font-bold text-foreground">{data.percentage}%</span>
                        </p>
                      </div>
                    </div>
                  )
                }
                return null
              }}
            />
            <Pie
              data={incidentData}
              dataKey="count"
              nameKey="type"
              innerRadius={100}
              outerRadius={160}
              strokeWidth={3}
              stroke="#ffffff"
              activeIndex={activeIndex}
              activeShape={({ outerRadius = 0, ...props }: PieSectorDataItem) => (
                <Sector {...props} outerRadius={outerRadius + 15} />
              )}
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              {incidentData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-0 pt-4">
        <div className="w-full mb-3 pb-3 border-b">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold">Total Cases</span>
            <span className="text-lg font-bold text-primary">{totalCases.toLocaleString()}</span>
          </div>
        </div>
        <div className="w-full max-h-[200px] overflow-y-auto pr-2 space-y-2">
          {incidentData.map((item, index) => (
            <div
              key={index}
              className="flex justify-between items-center py-1.5 px-2 rounded hover:bg-muted/50 transition-colors"
            >
              <span className="flex items-center text-sm">
                <span
                  className="w-3 h-3 mr-2 rounded-full ring-2 ring-background shadow-sm"
                  style={{ backgroundColor: item.fill }}
                />
                <span className="font-medium">{item.type}</span>
              </span>
              <span className="text-sm font-semibold text-primary">{item.percentage}%</span>
            </div>
          ))}
        </div>
      </CardFooter>
    </Card>
  )
}