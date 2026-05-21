"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { useTheme } from "next-themes"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import {
  TrendingDown,
  TrendingUp,
  Minus,
  Loader2,
  ArrowRight,
  Info,
  Clipboard
} from "lucide-react"
import { toBlob } from 'html-to-image'
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Bar, Pie } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from "chart.js"

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
)

// --- TYPES ---
type ComparisonMode = "quarter" | "month" | "semi-annual" | "year"

interface ComparisonData {
  recentLabel: string
  pastLabel: string
  focusCrimes: {
    labels: string[]
    recentData: number[]
    pastData: number[]
  }
  tciDistribution: {
    recent: { poi: number; psi: number }
    past: { poi: number; psi: number }
  }
  totalCrimes: {
    recent: number
    past: number
  }
}

interface PeriodOption {
  value: string
  label: string
  dateObj: Date
}

// --- HELPERS ---
const getPeriodDateRange = (periodValue: string, mode: ComparisonMode) => {
  if (!periodValue) return null;

  if (mode === "quarter") {
    const [year, q] = periodValue.split("-")
    const quarter = parseInt(q.replace("Q", ""))
    const startMonth = (quarter - 1) * 3
    const start = new Date(parseInt(year), startMonth, 1)
    const end = new Date(parseInt(year), startMonth + 3, 0)
    return { start, end, label: `Q${quarter} ${year}` }
  } else if (mode === "month") {
    const [year, month] = periodValue.split("-")
    const start = new Date(parseInt(year), parseInt(month) - 1, 1)
    const end = new Date(parseInt(year), parseInt(month), 0)
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    return { start, end, label: `${monthNames[parseInt(month) - 1]} ${year}` }
  } else if (mode === "semi-annual") {
    const [year, h] = periodValue.split("-")
    const isH1 = h === "H1"
    const start = new Date(parseInt(year), isH1 ? 0 : 6, 1)
    const end = new Date(parseInt(year), isH1 ? 6 : 12, 0)
    return { start, end, label: `H${isH1 ? "1" : "2"} ${year}` }
  } else {
    const year = parseInt(periodValue)
    const start = new Date(year, 0, 1)
    const end = new Date(year, 11, 31)
    return { start, end, label: `${year}` }
  }
}

const calculateRate = (current: number, previous: number) => {
  if (previous === 0) return { value: 0, label: "N/A", direction: "same" };
  const diff = current - previous;
  const percent = (diff / previous) * 100;
  return {
    value: Math.abs(percent),
    label: `${Math.abs(percent).toFixed(1)}%`,
    direction: diff > 0 ? "up" : diff < 0 ? "down" : "same"
  };
}

export default function ComparisonCharts() {
  const currentYear = new Date().getFullYear()

  // --- STATE ---
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>("quarter")
  const [filterYear, setFilterYear] = useState<string>(currentYear.toString())
  const [recentPeriod, setRecentPeriod] = useState<string>("")
  const [pastPeriod, setPastPeriod] = useState<string>("")
  const [data, setData] = useState<ComparisonData | null>(null)
  const [loading, setLoading] = useState(false)
  const { theme, resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const chartColors = {
    recent: isDark ? "#3b82f6" : "#1e3a8a",
    past: isDark ? "#fb7185" : "#c2410c",
    grid: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
    text: isDark ? "#94a3b8" : "#64748b"
  }

  // Refs for export
  const totalChartRef = useRef<HTMLDivElement>(null)
  const distChartRef = useRef<HTMLDivElement>(null)
  const focusChartRef = useRef<HTMLDivElement>(null)

  const copyChartToClipboard = async (ref: React.RefObject<HTMLDivElement | null>) => {
    if (ref.current === null) return
    try {
      const blob = await toBlob(ref.current, { cacheBust: true, backgroundColor: '#ffffff', pixelRatio: 2 })
      if (blob) {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
        toast.success("Chart copied to clipboard")
      }
    } catch (err) {
      console.error(err)
      toast.error("Failed to copy chart")
    }
  }

  const CopyButton = ({ targetRef }: { targetRef: React.RefObject<HTMLDivElement | null> }) => (
    <Button
      variant="ghost"
      size="icon"
      className="h-6 w-6 text-muted-foreground hover:text-foreground shrink-0"
      onClick={() => copyChartToClipboard(targetRef)}
      title="Copy Chart Image"
    >
      <Clipboard className="h-3 w-3" />
    </Button>
  )

  // --- OPTION GENERATION ---
  const generateOptions = (mode: ComparisonMode, yearFilter: string | null): PeriodOption[] => {
    const options: PeriodOption[] = []
    const startYear = yearFilter ? parseInt(yearFilter) : currentYear
    const endYear = yearFilter ? parseInt(yearFilter) : currentYear - 10

    for (let year = startYear; year >= endYear; year--) {
      if (mode === "year") {
        options.push({ value: `${year}`, label: `${year}`, dateObj: new Date(year, 0, 1) })
      } else if (mode === "semi-annual") {
        options.push({ value: `${year}-H2`, label: `H2 ${year}`, dateObj: new Date(year, 6, 1) })
        options.push({ value: `${year}-H1`, label: `H1 ${year}`, dateObj: new Date(year, 0, 1) })
      } else if (mode === "quarter") {
        for (let q = 4; q >= 1; q--) {
          options.push({ value: `${year}-Q${q}`, label: `Q${q} ${year}`, dateObj: new Date(year, (q - 1) * 3, 1) })
        }
      } else if (mode === "month") {
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        for (let m = 11; m >= 0; m--) {
          options.push({ value: `${year}-${m + 1}`, label: `${monthNames[m]} ${year}`, dateObj: new Date(year, m, 1) })
        }
      }
    }
    return options
  }

  const targetOptions = useMemo(() => {
    const useFilter = comparisonMode !== "year" ? filterYear : null
    return generateOptions(comparisonMode, useFilter)
  }, [comparisonMode, filterYear])

  const referenceOptions = useMemo(() => {
    const allHistory = generateOptions(comparisonMode, null)
    if (!recentPeriod) return allHistory
    const selectedTarget = targetOptions.find(opt => opt.value === recentPeriod) || allHistory.find(opt => opt.value === recentPeriod)
    if (!selectedTarget) return allHistory
    // Filter: Strictly older than selected target
    return allHistory.filter(opt => opt.dateObj < selectedTarget.dateObj)
  }, [comparisonMode, recentPeriod, targetOptions])

  const fetchComparisonData = async () => {
    if (!recentPeriod || !pastPeriod) return
    setLoading(true)
    try {
      const recentRange = getPeriodDateRange(recentPeriod, comparisonMode)
      const pastRange = getPeriodDateRange(pastPeriod, comparisonMode)
      if (!recentRange || !pastRange) return

      const params = new URLSearchParams({
        recentStart: recentRange.start.toISOString(),
        recentEnd: recentRange.end.toISOString(),
        pastStart: pastRange.start.toISOString(),
        pastEnd: pastRange.end.toISOString(),
        recentLabel: recentRange.label,
        pastLabel: pastRange.label
      })

      const res = await fetch(`/api/comparison?${params}`)
      const result: ComparisonData = await res.json()
      setData(result)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // --- SIMPLE CHANGE COMPONENT ---
  const ChangeText = ({ current, previous }: { current: number, previous: number }) => {
    const { label, direction } = calculateRate(current, previous);
    if (direction === "same") return <span className="text-muted-foreground ml-2 text-xs">(- 0%)</span>;

    // Logic: Crime Increasing (Up) is BAD (Red), Decreasing (Down) is GOOD (Green)
    const isBad = direction === "up";
    const colorClass = isBad ? "text-red-600" : "text-green-600";
    const Arrow = isBad ? TrendingUp : TrendingDown;

    return (
      <span className={`flex items-center gap-1 text-xs font-bold ml-2 ${colorClass}`}>
        <Arrow className="h-3 w-3" /> {label}
      </span>
    );
  }

  // --- PROGRESSIVE DISCLOSURE (TOOLTIP) ---
  const GlossaryTooltip = ({ term, definition }: { term: string, definition: string }) => (
    <Popover>
      <PopoverTrigger asChild>
        <span className="inline-flex items-center gap-1 cursor-help border-b border-dotted border-slate-400 leading-none">
          {term}
          <Info className="h-3 w-3 text-muted-foreground" />
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3 z-50">
        <div className="space-y-1">
          <h4 className="font-medium text-sm text-foreground">{term}</h4>
          <p className="text-xs text-muted-foreground">{definition}</p>
        </div>
      </PopoverContent>
    </Popover>
  )

  // --- SKELETON LOADER ---
  const ComparisonSkeleton = () => (
    <div className="grid gap-6 animate-in fade-in duration-500">
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base"><Skeleton className="h-6 w-32" /></CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-[100px] w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md bg-muted/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base"><Skeleton className="h-6 w-48" /></CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 flex flex-col items-center">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-32 w-32 rounded-full" />
              </div>
              <div className="space-y-2 flex flex-col items-center">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-32 w-32 rounded-full" />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 pt-2 border-t">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base"><Skeleton className="h-6 w-40" /></CardTitle></CardHeader>
        <CardContent>
          <Skeleton className="h-[80px] w-full mb-6" />
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-md" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="space-y-6">

      {/* 1. SIMPLE CONFIGURATION */}
      <Card>
        <CardHeader><CardTitle className="text-base">Comparison Charts</CardTitle></CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">

            <div className="space-y-2">
              <Label>Mode</Label>
              <Select
                value={comparisonMode}
                onValueChange={(v) => {
                  setComparisonMode(v as ComparisonMode)
                  setRecentPeriod("")
                  setPastPeriod("")
                  setData(null)
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="quarter">Quarterly</SelectItem>
                  <SelectItem value="month">Monthly</SelectItem>
                  <SelectItem value="semi-annual">Semi-Annual</SelectItem>
                  <SelectItem value="year">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {comparisonMode !== "year" && (
              <div className="space-y-2">
                <Label>Year</Label>
                <Select
                  value={filterYear}
                  onValueChange={(v) => {
                    setFilterYear(v)
                    setRecentPeriod("")
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 10 }).map((_, i) => {
                      const yr = currentYear - i
                      return <SelectItem key={yr} value={yr.toString()}>{yr}</SelectItem>
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-brand">Recent (Target)</Label>
              <Select value={recentPeriod} onValueChange={setRecentPeriod}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent className="max-h-[250px]">
                  {targetOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-orange-500">Past (Reference)</Label>
              <Select value={pastPeriod} onValueChange={setPastPeriod} disabled={!recentPeriod}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent className="max-h-[250px]">
                  {referenceOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={fetchComparisonData}
              disabled={!recentPeriod || !pastPeriod || loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Compare"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 2. CHARTS */}
      {loading && <ComparisonSkeleton />}
      {!loading && data && (
        <div className="grid gap-6 animate-in fade-in duration-500">

          {/* A. TOTAL CRIME & PIE CHARTS ROW */}
          <div className="grid md:grid-cols-2 gap-6">

            {/* TOTAL CRIME */}
            <Card ref={totalChartRef}>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  Total Crime Incidents
                  <CopyButton targetRef={totalChartRef} />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  <Bar
                    data={{
                      labels: [data.pastLabel, data.recentLabel],
                      datasets: [{
                        label: "Total",
                        data: [data.totalCrimes.past, data.totalCrimes.recent],
                        backgroundColor: [chartColors.past, chartColors.recent]
                      }]
                    }}
                    options={{
                      responsive: true,
                      plugins: { legend: { display: false } },
                      scales: {
                        x: { grid: { color: chartColors.grid }, ticks: { color: chartColors.text } },
                        y: { grid: { color: chartColors.grid }, ticks: { color: chartColors.text } }
                      }
                    }}
                    height={100}
                  />
                  <div className="flex items-center justify-center p-3 bg-muted/30 rounded border">
                    <span className="text-sm font-medium">Rate of Change:</span>
                    <ChangeText current={data.totalCrimes.recent} previous={data.totalCrimes.past} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* PIE CHARTS (SIDE BY SIDE) */}
            <Card ref={distChartRef}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="flex-1">Distribution (
                    <GlossaryTooltip term="POI" definition="Peace and Order Indicators: 8 focused crimes" />
                    vs
                    <GlossaryTooltip term="PSI" definition="Public Safety Index: Vehicular incidents" />
                    )</span>
                  <CopyButton targetRef={distChartRef} />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {/* Past */}
                  <div className="text-center space-y-2">
                    <span className="text-xs text-muted-foreground font-bold">{data.pastLabel}</span>
                    <div className="h-32 flex justify-center">
                      <Pie
                        data={{
                          labels: ["POI", "PSI"],
                          datasets: [{
                            data: [data.tciDistribution.past.poi, data.tciDistribution.past.psi],
                            backgroundColor: [chartColors.recent, chartColors.past]
                          }]
                        }}
                        options={{ plugins: { legend: { display: false } } }}
                      />
                    </div>
                  </div>
                  {/* Recent */}
                  <div className="text-center space-y-2">
                    <span className="text-xs text-brand font-bold">{data.recentLabel}</span>
                    <div className="h-32 flex justify-center">
                      <Pie
                        data={{
                          labels: ["POI", "PSI"],
                          datasets: [{
                            data: [data.tciDistribution.recent.poi, data.tciDistribution.recent.psi],
                            backgroundColor: [chartColors.recent, chartColors.past]
                          }]
                        }}
                        options={{ plugins: { legend: { display: false } } }}
                      />
                    </div>
                  </div>
                </div>

                {/* RATE OF CHANGE FOR PIE */}
                <div className="mt-4 grid grid-cols-2 gap-2 text-sm border-t pt-2">
                  <div className="flex justify-between">
                    <span>POI:</span>
                    <ChangeText
                      current={data.tciDistribution.recent.poi}
                      previous={data.tciDistribution.past.poi}
                    />
                  </div>
                  <div className="flex justify-between">
                    <span>PSI:</span>
                    <ChangeText
                      current={data.tciDistribution.recent.psi}
                      previous={data.tciDistribution.past.psi}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* B. FOCUS CRIMES (BAR CHART + STAT GRID) */}
          <Card ref={focusChartRef}>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                Focus Crimes Comparison
                <CopyButton targetRef={focusChartRef} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Main Chart */}
              <Bar
                data={{
                  labels: data.focusCrimes.labels,
                  datasets: [
                    {
                      label: data.pastLabel,
                      data: data.focusCrimes.pastData,
                      backgroundColor: chartColors.past
                    },
                    {
                      label: data.recentLabel,
                      data: data.focusCrimes.recentData,
                      backgroundColor: chartColors.recent
                    }
                  ]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: true,
                  plugins: { 
                    legend: { position: "top", labels: { color: chartColors.text } } 
                  },
                  scales: {
                    x: { grid: { color: chartColors.grid }, ticks: { color: chartColors.text } },
                    y: { grid: { color: chartColors.grid }, ticks: { color: chartColors.text } }
                  }
                }}
                height={80}
              />

              {/* RATE OF CHANGE GRID */}
              <div className="mt-6">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">Rate of Change per Crime</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
                  {data.focusCrimes.labels.map((label, i) => {
                    const recent = data.focusCrimes.recentData[i]
                    const past = data.focusCrimes.pastData[i]
                    return (
                      <div key={label} className="border rounded p-2 flex flex-col items-center justify-center text-center bg-muted/30/50">
                        <span className="text-[10px] text-muted-foreground truncate w-full" title={label}>{label}</span>
                        <ChangeText current={recent} previous={past} />
                        <span className="text-[10px] text-muted-foreground/70 mt-1">{past} <ArrowRight className="inline w-2 h-2" /> {recent}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

            </CardContent>
          </Card>

        </div>
      )}
    </div>
  )
}