"use client"

import React, { useEffect, useState, useMemo, useRef } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  AlertTriangle,
  MapPin,
  TrendingUp,
  Shield,
  RefreshCw,
  Clock,
  CalendarDays,
  Calendar,
  Activity,
  PieChart as PieChartIcon,
  ChevronsUpDown,
  Clipboard
} from "lucide-react"

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts'

import { toBlob } from 'html-to-image'
import { toast } from "sonner"
import ComparisonCharts from "./comparisoncharts"

// --- INTERFACES ---
interface CrimeData {
  id?: string | number
  date: string
  offense: string
  offenseType: string
  incidentType: string
  barangay: string
  time?: string
}

interface DashboardState {
  allData: CrimeData[]
  loading: boolean
  error: string | null
}

// --- HELPERS ---
const getQuarter = (date: Date) => Math.floor(date.getMonth() / 3) + 1;

// 1. UPDATED: Added barangays to filter logic
const filterData = (
  data: CrimeData[],
  filters: {
    years?: string[],
    months?: string[],
    categories?: string[],
    crimes?: string[],
    barangays?: string[]
  }
) => {
  return data.filter(item => {
    const itemDate = new Date(item.date);

    if (filters.years && filters.years.length > 0) {
      if (!filters.years.includes(itemDate.getFullYear().toString())) return false;
    }

    if (filters.months && filters.months.length > 0) {
      if (!filters.months.includes((itemDate.getMonth() + 1).toString())) return false;
    }

    if (filters.categories && filters.categories.length > 0) {
      if (!filters.categories.includes(item.offenseType)) return false;
    }

    if (filters.crimes && filters.crimes.length > 0) {
      if (!filters.crimes.includes(item.offense)) return false;
    }

    // New Barangay Filter Logic
    if (filters.barangays && filters.barangays.length > 0) {
      if (!filters.barangays.includes(item.barangay)) return false;
    }

    return true;
  });
};

const getUniqueValues = (data: CrimeData[], key: keyof CrimeData) => {
  return Array.from(new Set(data.map(item => item[key] as string))).filter(Boolean).sort();
};

const getYears = (data: CrimeData[]) => {
  return Array.from(new Set(data.map(item => new Date(item.date).getFullYear()))).sort((a, b) => b - a);
};

const COLORS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#84cc16", "#6366f1"
];

interface MultiSelectProps {
  label: string
  options: string[]
  selected: string[]
  onChange: (selected: string[]) => void
  disabled?: boolean
  width?: string
  align?: "start" | "center" | "end"
}

const MultiSelectFilter = ({ label, options, selected, onChange, disabled, width = "w-[180px]", align = "start" }: MultiSelectProps) => {
  const [open, setOpen] = useState(false)

  const handleSelectAll = () => onChange(options)
  const handleClear = () => onChange([])

  const toggleOption = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter(item => item !== option))
    } else {
      onChange([...selected, option])
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={`justify-between ${width} h-10 text-sm`}
          disabled={disabled}
        >
          <span className="truncate">
            {selected.length === 0
              ? `All ${label}s`
              : selected.length === options.length
                ? `All ${label}s`
                : `${selected.length} ${label}${selected.length > 1 ? 's' : ''}`}
          </span>
          <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-0" align={align}>
        <div className="grid grid-cols-2 gap-2 p-2 border-b sticky top-0 z-10 bg-popover backdrop-blur-sm">
          <Button variant="ghost" size="sm" onClick={handleSelectAll} className="h-8 text-sm px-2 w-full">Select All</Button>
          <Button variant="ghost" size="sm" onClick={handleClear} className="h-8 text-sm px-2 w-full text-destructive hover:text-destructive/90 hover:bg-destructive/10">Clear</Button>
        </div>
        <ScrollArea className="h-[240px] p-2">
          {options.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-4">No options available</div>
          ) : (
            <div className="space-y-1">
              {options.map((option) => (
                <div
                  key={option}
                  className="flex items-center space-x-2 rounded-sm p-2 hover:bg-accent cursor-pointer"
                  onClick={() => toggleOption(option)}
                >
                  <Checkbox
                    id={`${label}-${option}`}
                    checked={selected.includes(option)}
                    onCheckedChange={() => toggleOption(option)}
                  />
                  <label
                    htmlFor={`${label}-${option}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1 break-words whitespace-normal"
                  >
                    {option}
                  </label>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}


export default function DashboardPage() { // --- STATE ---
  const [state, setState] = useState<DashboardState>({
    allData: [],
    loading: true,
    error: null
  })

  // Refs for chart exports
  const yearChartRef = useRef<HTMLDivElement>(null)
  const distChartRef = useRef<HTMLDivElement>(null)
  const monthChartRef = useRef<HTMLDivElement>(null)
  const quarterChartRef = useRef<HTMLDivElement>(null)
  const clockChartRef = useRef<HTMLDivElement>(null)
  const dayChartRef = useRef<HTMLDivElement>(null)

  const copyChartToClipboard = async (ref: React.RefObject<HTMLDivElement | null>) => {
    if (ref.current === null) return
    try {
      // Use toBlob for better clipboard compatibility
      const blob = await toBlob(ref.current, { cacheBust: true, backgroundColor: '#ffffff', pixelRatio: 2 })
      if (blob) {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
        toast.success("Chart image copied to clipboard.")
      }
    } catch (err) {
      console.error(err)
      toast.error("Could not copy the chart. Please try again.")
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
  // 2. UPDATED: Added barangays array to filter states
  const [yearlyFilter, setYearlyFilter] = useState<{ categories: string[], crimes: string[], barangays: string[] }>({
    categories: [], crimes: [], barangays: []
  });

  const [distFilter, setDistFilter] = useState<{ years: string[], months: string[], barangays: string[] }>({
    years: [], months: [], barangays: []
  });

  const [monthlyFilter, setMonthlyFilter] = useState<{ years: string[], categories: string[], crimes: string[], barangays: string[] }>({
    years: [], categories: [], crimes: [], barangays: []
  });

  const [quarterlyFilter, setQuarterlyFilter] = useState<{ years: string[], categories: string[], crimes: string[], barangays: string[] }>({
    years: [], categories: [], crimes: [], barangays: []
  });

  const [clockFilter, setClockFilter] = useState<{ years: string[], months: string[], categories: string[], crimes: string[], barangays: string[] }>({
    years: [], months: [], categories: [], crimes: [], barangays: []
  });

  const [dayFilter, setDayFilter] = useState<{ years: string[], months: string[], categories: string[], crimes: string[], barangays: string[] }>({
    years: [], months: [], categories: [], crimes: [], barangays: []
  });




  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/ciras");
        if (!res.ok) throw new Error("API Network Error");
        const json = await res.json();

        let flatData: any[] = [];

        if (Array.isArray(json)) {
          flatData = json;
        } else if (json.data && Array.isArray(json.data)) {
          flatData = json.data;
        } else if (json.incidents && Array.isArray(json.incidents)) {
          flatData = json.incidents;
        }

        const mappedData: CrimeData[] = flatData.map((item: any) => {
          let timeStr = "00:00";
          if (item.time) {
            timeStr = item.time;
          } else if (item.timeCommitted) {
            const d = new Date(item.timeCommitted);
            if (!isNaN(d.getTime())) {
              const hours = d.getUTCHours().toString().padStart(2, '0');
              const minutes = d.getUTCMinutes().toString().padStart(2, '0');
              timeStr = `${hours}:${minutes}`;
            }
          }

          return {
            id: item.id || item._id || item.blotterno || Math.random().toString(),
            date: item.date || item.dateCommitted || item.createdAt || new Date().toISOString(),
            offense: item.offense || item.crime || "Unknown",
            offenseType: item.offenseType || item.category || "Uncategorized",
            incidentType: item.incidentType || "Crime",
            barangay: item.barangay || "Unknown",
            time: timeStr
          };
        });

        setState({ allData: mappedData, loading: false, error: null });
      } catch (err) {
        console.error(err);
        setState(prev => ({ ...prev, loading: false, error: "Failed to load data" }));
      }
    };
    fetchData();
  }, []);

  const years = useMemo(() => getYears(state.allData).map(y => y.toString()), [state.allData]);
  const categories = useMemo(() => getUniqueValues(state.allData, 'offenseType'), [state.allData]);
  // 3. UPDATED: Memoize barangay list for dropdowns
  const barangays = useMemo(() => getUniqueValues(state.allData, 'barangay'), [state.allData]);

  const monthOptions = useMemo(() => Array.from({ length: 12 }, (_, i) => (i + 1).toString()), []);
  const getMonthName = (m: string) => new Date(0, parseInt(m) - 1).toLocaleString('default', { month: 'short' });

  const crimesByCategory = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    state.allData.forEach(d => {
      const cat = d.offenseType;
      const crime = d.offense;
      if (cat && crime) {
        if (!map[cat]) map[cat] = new Set();
        map[cat].add(crime);
      }
    });
    const result: Record<string, string[]> = {};
    Object.keys(map).forEach(k => {
      result[k] = Array.from(map[k]).sort();
    });
    return result;
  }, [state.allData]);

  const allCrimes = useMemo(() => getUniqueValues(state.allData, 'offense'), [state.allData]);

  const getAvailableCrimes = (selectedCats: string[]) => {
    if (selectedCats.length === 0) return allCrimes;
    const available = new Set<string>();
    selectedCats.forEach(cat => {
      if (crimesByCategory[cat]) {
        crimesByCategory[cat].forEach(c => available.add(c));
      }
    });
    return Array.from(available).sort();
  }

  // Replace const kpiData = useMemo(...) with this:
  const dashboardData = useMemo(() => {
    const total = state.allData.length;

    if (total === 0) {
      return {
        total: 0,
        highestIncidentType: { type: 'N/A', count: 0 },
        highestArea: { area: 'N/A', count: 0 },
        highestMonth: { month: 'N/A', count: 0 },
        peakTimeOfDay: { label: 'N/A', count: 0 },
        topOffenseCategory: { label: 'N/A', count: 0 },
        yoyChange: { current: 0, previous: 0, pct: 0 }
      };
    }

    const crimeCounts: Record<string, number> = {};
    const brgyCounts: Record<string, number> = {};
    const monthCounts: Record<string, number> = {};
    const catCounts: Record<string, number> = {};
    const hourCounts = Array(24).fill(0);
    const yearCounts: Record<string, number> = {};

    state.allData.forEach(d => {
      crimeCounts[d.offense] = (crimeCounts[d.offense] || 0) + 1;
      brgyCounts[d.barangay] = (brgyCounts[d.barangay] || 0) + 1;
      const date = new Date(d.date);
      const monthName = date.toLocaleString('default', { month: 'long' });
      monthCounts[monthName] = (monthCounts[monthName] || 0) + 1;
      if (d.offenseType) catCounts[d.offenseType] = (catCounts[d.offenseType] || 0) + 1;
      const yr = date.getFullYear().toString();
      yearCounts[yr] = (yearCounts[yr] || 0) + 1;
      if (d.time) {
        const h = parseInt(d.time.split(':')[0], 10);
        if (!isNaN(h) && h >= 0 && h < 24) hourCounts[h]++;
      }
    });

    const getTop = (obj: Record<string, number>) => {
      const entries = Object.entries(obj);
      if (entries.length === 0) return { key: 'N/A', val: 0 };
      const sorted = entries.sort((a, b) => b[1] - a[1]);
      return { key: sorted[0][0], val: sorted[0][1] };
    };

    // Peak time of day
    const timeSlots = [
      { label: 'Morning', hours: [6,7,8,9,10,11] },
      { label: 'Afternoon', hours: [12,13,14,15,16,17] },
      { label: 'Evening', hours: [18,19,20,21,22,23] },
      { label: 'Night', hours: [0,1,2,3,4,5] },
    ];
    let peakSlot = { label: 'N/A', count: 0 };
    timeSlots.forEach(slot => {
      const cnt = slot.hours.reduce((s, h) => s + hourCounts[h], 0);
      if (cnt > peakSlot.count) peakSlot = { label: slot.label, count: cnt };
    });

    // YoY change: compare last two complete years
    const sortedYears = Object.keys(yearCounts).sort((a, b) => parseInt(b) - parseInt(a));
    const latestYear = sortedYears[0] || '0';
    const prevYear = sortedYears[1] || '0';
    const currentCount = yearCounts[latestYear] || 0;
    const prevCount = yearCounts[prevYear] || 0;
    const yoyPct = prevCount > 0 ? Math.round(((currentCount - prevCount) / prevCount) * 100) : 0;

    const topCrime = getTop(crimeCounts);
    const topBarangay = getTop(brgyCounts);
    const topMonth = getTop(monthCounts);
    const topCat = getTop(catCounts);

    return {
      total,
      highestIncidentType: { type: topCrime.key, count: topCrime.val },
      highestArea: { area: topBarangay.key, count: topBarangay.val },
      highestMonth: { month: topMonth.key, count: topMonth.val },
      peakTimeOfDay: peakSlot,
      topOffenseCategory: { label: topCat.key, count: topCat.val },
      yoyChange: { current: currentCount, previous: prevCount, pct: yoyPct, year: latestYear }
    };
  }, [state.allData]);
  const totalCrimes = dashboardData.total;

  // 4. UPDATED: Passed barangay filter to filterData calls
  const yearlyTrendData = useMemo(() => {
    const filtered = filterData(state.allData, {
      categories: yearlyFilter.categories,
      crimes: yearlyFilter.crimes,
      barangays: yearlyFilter.barangays
    });
    const counts: Record<string, number> = {};
    years.forEach(y => counts[y] = 0);
    filtered.forEach(d => {
      const y = new Date(d.date).getFullYear().toString();
      counts[y] = (counts[y] || 0) + 1;
    });
    return years.sort((a, b) => parseInt(a) - parseInt(b)).map(y => ({ year: y, count: counts[y] }));
  }, [state.allData, years, yearlyFilter]);

  const distData = useMemo(() => {
    const filtered = filterData(state.allData, {
      years: distFilter.years,
      months: distFilter.months,
      barangays: distFilter.barangays
    });

    const catCounts: Record<string, number> = {};
    filtered.forEach(d => catCounts[d.offenseType] = (catCounts[d.offenseType] || 0) + 1);
    const pieData = Object.entries(catCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const brgyCounts: Record<string, number> = {};
    filtered.forEach(d => brgyCounts[d.barangay] = (brgyCounts[d.barangay] || 0) + 1);
    const hotspots = Object.entries(brgyCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    return { pieData, hotspots };
  }, [state.allData, distFilter]);

  const monthlyDistData = useMemo(() => {
    const filtered = filterData(state.allData, {
      years: monthlyFilter.years,
      categories: monthlyFilter.categories,
      crimes: monthlyFilter.crimes,
      barangays: monthlyFilter.barangays
    });
    const counts = Array(12).fill(0);
    filtered.forEach(d => {
      const m = new Date(d.date).getMonth();
      counts[m]++;
    });
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return months.map((m, i) => ({ name: m, count: counts[i] }));
  }, [state.allData, monthlyFilter]);

  const quarterlyDistData = useMemo(() => {
    const filtered = filterData(state.allData, {
      years: quarterlyFilter.years,
      categories: quarterlyFilter.categories,
      crimes: quarterlyFilter.crimes,
      barangays: quarterlyFilter.barangays
    });
    const counts = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
    filtered.forEach(d => {
      const q = getQuarter(new Date(d.date));
      if (q === 1) counts.Q1++;
      if (q === 2) counts.Q2++;
      if (q === 3) counts.Q3++;
      if (q === 4) counts.Q4++;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [state.allData, quarterlyFilter]);

  const clockData = useMemo(() => {
    const filtered = filterData(state.allData, {
      years: clockFilter.years,
      months: clockFilter.months,
      categories: clockFilter.categories,
      crimes: clockFilter.crimes,
      barangays: clockFilter.barangays
    });

    const hourCounts = Array(24).fill(0);

    filtered.forEach(d => {
      if (d.time) {
        const parts = d.time.split(':');
        if (parts.length > 0) {
          const h = parseInt(parts[0], 10);
          if (!isNaN(h) && h >= 0 && h < 24) {
            hourCounts[h]++;
          }
        }
      }
    });

    return hourCounts.map((count, i) => {
      const hourLabel = `${i.toString().padStart(2, '0')}:00`;
      return {
        hour: hourLabel,
        count
      };
    });
  }, [state.allData, clockFilter]);

  const dayOfWeekData = useMemo(() => {
    const filtered = filterData(state.allData, {
      years: dayFilter.years,
      months: dayFilter.months,
      categories: dayFilter.categories,
      crimes: dayFilter.crimes,
      barangays: dayFilter.barangays
    });
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dayCounts = Array(7).fill(0);
    filtered.forEach(d => {
      const day = new Date(d.date).getDay();
      dayCounts[day]++;
    });
    return days.map((d, i) => ({ name: d, count: dayCounts[i] }));
  }, [state.allData, dayFilter]);

  if (state.loading) {
    return (
      <div className="min-h-screen p-6 space-y-8 animate-in fade-in duration-500">
        {/* Header Skeleton */}
        <div className="flex justify-between items-center mb-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-[250px]" />
            <Skeleton className="h-4 w-[350px]" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-[120px]" />
            <Skeleton className="h-9 w-[120px]" />
          </div>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="border-2">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-[100px]" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                <Skeleton className="h-8 w-[60px] mb-1" />
                <Skeleton className="h-4 w-[100px]" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Chart Skeleton */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row justify-between gap-4">
              <Skeleton className="h-6 w-[200px]" />
              <div className="flex gap-2">
                <Skeleton className="h-9 w-[100px]" />
                <Skeleton className="h-9 w-[100px]" />
                <Skeleton className="h-9 w-[100px]" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>

        {/* Secondary Charts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-[200px] mb-4" />
              <div className="flex gap-2">
                <Skeleton className="h-9 w-[100px]" />
                <Skeleton className="h-9 w-[100px]" />
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full rounded-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-[200px] mb-4" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-6 w-6 rounded-full" />
                      <Skeleton className="h-4 w-[150px]" />
                    </div>
                    <Skeleton className="h-4 w-[40px]" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 space-y-8 animate-in fade-in duration-500">

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">CRIME ANALYTICS DASHBOARD</h1>
          <p className="text-sm md:text-base text-muted-foreground">Comprehensive analysis of crime incidents over time.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <Button onClick={() => window.location.reload()} variant="outline" className="gap-2 w-full sm:w-auto h-10 px-4">
            <RefreshCw className="h-4 w-4" /> Refresh Data
          </Button>
        </div>
      </div>

      {state.error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-md border border-destructive/20">
          Error: {state.error}. Please check your connection or database.
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            title: "Total Cases",
            value: totalCrimes.toLocaleString(),
            sub: "all recorded incidents",
            icon: Shield,
            iconBg: "bg-blue-100 dark:bg-blue-950",
            iconColor: "text-blue-600 dark:text-blue-400",
            colSpan: "col-span-2 md:col-span-2"
          },
          {
            title: "YoY Change",
            value: dashboardData.yoyChange.pct === 0
              ? '—'
              : `${dashboardData.yoyChange.pct > 0 ? '+' : ''}${dashboardData.yoyChange.pct}%`,
            sub: `vs previous year (${dashboardData.yoyChange.current} cases)`,
            icon: TrendingUp,
            iconBg: dashboardData.yoyChange.pct <= 0
              ? "bg-green-100 dark:bg-green-950"
              : "bg-rose-100 dark:bg-rose-950",
            iconColor: dashboardData.yoyChange.pct <= 0
              ? "text-green-600 dark:text-green-400"
              : "text-rose-600 dark:text-rose-400",
            colSpan: "col-span-2 md:col-span-2"
          },
          {
            title: "Most Common Crime",
            value: dashboardData.highestIncidentType.type,
            sub: `${dashboardData.highestIncidentType.count} cases`,
            icon: AlertTriangle,
            iconBg: "bg-red-100 dark:bg-red-950",
            iconColor: "text-red-600 dark:text-red-400",
            colSpan: "col-span-1 md:col-span-1"
          },
          {
            title: "Highest Risk Area",
            value: dashboardData.highestArea.area,
            sub: `${dashboardData.highestArea.count} incidents`,
            icon: MapPin,
            iconBg: "bg-orange-100 dark:bg-orange-950",
            iconColor: "text-orange-600 dark:text-orange-400",
            colSpan: "col-span-1 md:col-span-1"
          },
          {
            title: "Peak Month",
            value: dashboardData.highestMonth.month,
            sub: `${dashboardData.highestMonth.count} cases`,
            icon: Calendar,
            iconBg: "bg-purple-100 dark:bg-purple-950",
            iconColor: "text-purple-600 dark:text-purple-400",
            colSpan: "col-span-1 md:col-span-1"
          },
          {
            title: "Peak Time of Day",
            value: dashboardData.peakTimeOfDay.label,
            sub: `${dashboardData.peakTimeOfDay.count} incidents`,
            icon: Clock,
            iconBg: "bg-yellow-100 dark:bg-yellow-950",
            iconColor: "text-yellow-600 dark:text-yellow-400",
            colSpan: "col-span-1 md:col-span-1"
          },
        ].map((card, i) => {
          const Icon = card.icon;
          return (
            <Card key={i} className={`hover:shadow-lg transition-all duration-300 border-2 h-[140px] flex flex-col justify-between ${card.colSpan}`}>
              <CardHeader className="p-4 pb-0 shrink-0">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground mt-1">
                    {card.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg shrink-0 ${card.iconBg}`}>
                    <Icon className={`h-4 w-4 ${card.iconColor}`} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-2 flex flex-col gap-1 overflow-hidden">
                <h3
                  className="font-bold text-xl text-foreground line-clamp-2 leading-tight"
                  title={card.value || 'N/A'}
                >
                  {card.value || 'N/A'}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-1" title={card.sub}>
                  {card.sub}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card ref={yearChartRef}>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <CardTitle className="flex items-center gap-2 flex-1">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              Incidents by Year
              <CopyButton targetRef={yearChartRef} />
            </CardTitle>
            <div className="grid grid-cols-2 md:flex md:flex-wrap gap-2 w-full md:w-auto">
              <MultiSelectFilter
                label="Categorie"
                options={categories}
                selected={yearlyFilter.categories}
                onChange={(v) => setYearlyFilter(prev => ({ ...prev, categories: v, crimes: [] }))}
              />
              <MultiSelectFilter
                label="Specific Crime"
                options={getAvailableCrimes(yearlyFilter.categories)}
                selected={yearlyFilter.crimes}
                onChange={(v) => setYearlyFilter(prev => ({ ...prev, crimes: v }))}
                disabled={false}
              />
              {/* 5. UPDATED: Added Barangay Filter to Year Chart */}
              <MultiSelectFilter
                label="Barangay"
                options={barangays}
                selected={yearlyFilter.barangays}
                onChange={(v) => setYearlyFilter(prev => ({ ...prev, barangays: v }))}
                align="end"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={yearlyTrendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="year" axisLine={false} tickLine={false} dy={10} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#3b82f6", strokeWidth: 2, stroke: "#fff" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card ref={distChartRef}>
          <CardHeader>
            <div className="flex flex-col gap-4">
              <CardTitle className="flex items-center gap-2">
                <PieChartIcon className="h-5 w-5 text-amber-500" />
                Distribution by Category
                <CopyButton targetRef={distChartRef} />
              </CardTitle>
              <div className="grid grid-cols-2 md:flex md:flex-wrap gap-2">
                <MultiSelectFilter
                  label="Year"
                  options={years}
                  selected={distFilter.years}
                  onChange={(v) => setDistFilter(prev => ({ ...prev, years: v }))}
                  width="w-[120px]"
                />
                <MultiSelectFilter
                  label="Month"
                  options={monthOptions.map(m => getMonthName(m))}
                  selected={distFilter.months.map(m => getMonthName(m))}
                  onChange={(v) => {
                    const monthNums = v.map(name => {
                      const idx = monthOptions.findIndex(m => getMonthName(m) === name);
                      return (idx + 1).toString();
                    });
                    setDistFilter(prev => ({ ...prev, months: monthNums }));
                  }}
                  width="w-[120px]"
                />
                {/* 5. UPDATED: Added Barangay Filter to Distribution Chart */}
                <MultiSelectFilter
                  label="Barangay"
                  options={barangays}
                  selected={distFilter.barangays}
                  onChange={(v) => setDistFilter(prev => ({ ...prev, barangays: v }))}
                  width="w-[140px]"
                  align="end"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distData.pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {distData.pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  {/* UPDATED LEGEND */}
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconSize={8}
                    wrapperStyle={{ fontSize: "10px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4">
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-rose-500" />
                Geographic Hotspots
              </CardTitle>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="font-normal text-muted-foreground">
                  {distFilter.years.length === 0 ? 'All Years' : `${distFilter.years.length} Year(s)`}
                </Badge>
                {distFilter.months.length > 0 && <Badge variant="outline">{distFilter.months.length} Month(s)</Badge>}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {distData.hotspots.map((item, idx) => (
                <div key={item.name} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 border border-transparent hover:border-border transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`
                      flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold
                      ${idx < 3 ? 'bg-rose-100 text-rose-600' : 'bg-muted text-muted-foreground'}
                    `}>
                      {idx + 1}
                    </div>
                    <span className="font-medium text-sm">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden hidden sm:block">
                      <div
                        className="h-full bg-rose-500 rounded-full"
                        style={{ width: `${(item.value / (distData.hotspots[0]?.value || 1)) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-foreground/80 w-8 text-right">{item.value}</span>
                  </div>
                </div>
              ))}
              {distData.hotspots.length === 0 && (
                <div className="text-center py-10 text-muted-foreground text-sm">No data available for this selection.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card ref={monthChartRef}>
        <CardHeader>
          <div className="flex flex-col xl:flex-row justify-between xl:items-center gap-4">
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-indigo-500" />
              Monthly Distribution
              <CopyButton targetRef={monthChartRef} />
            </CardTitle>
            <div className="grid grid-cols-2 md:flex md:flex-wrap gap-2">
              <MultiSelectFilter
                label="Year"
                options={years}
                selected={monthlyFilter.years}
                onChange={(v) => setMonthlyFilter(prev => ({ ...prev, years: v }))}
                width="w-[100px]"
              />
              <MultiSelectFilter
                label="Categorie"
                options={categories}
                selected={monthlyFilter.categories}
                onChange={(v) => setMonthlyFilter(prev => ({ ...prev, categories: v, crimes: [] }))}
                width="w-[140px]"
              />
              <MultiSelectFilter
                label="Specific Crime"
                options={getAvailableCrimes(monthlyFilter.categories)}
                selected={monthlyFilter.crimes}
                onChange={(v) => setMonthlyFilter(prev => ({ ...prev, crimes: v }))}
                disabled={false}
                width="w-[140px]"
              />
              {/* 5. UPDATED: Added Barangay Filter to Monthly Chart */}
              <MultiSelectFilter
                label="Barangay"
                options={barangays}
                selected={monthlyFilter.barangays}
                onChange={(v) => setMonthlyFilter(prev => ({ ...prev, barangays: v }))}
                width="w-[140px]"
                align="end"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyDistData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} dy={10} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px' }} />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={60} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card ref={quarterChartRef}>
        <CardHeader>
          <div className="flex flex-col xl:flex-row justify-between xl:items-center gap-4">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-emerald-500" />
              Quarterly Distribution
              <CopyButton targetRef={quarterChartRef} />
            </CardTitle>
            <div className="grid grid-cols-2 md:flex md:flex-wrap gap-2">
              <MultiSelectFilter
                label="Year"
                options={years}
                selected={quarterlyFilter.years}
                onChange={(v) => setQuarterlyFilter(prev => ({ ...prev, years: v }))}
                width="w-[100px]"
              />
              <MultiSelectFilter
                label="Categorie"
                options={categories}
                selected={quarterlyFilter.categories}
                onChange={(v) => setQuarterlyFilter(prev => ({ ...prev, categories: v, crimes: [] }))}
                width="w-[140px]"
              />
              <MultiSelectFilter
                label="Specific Crime"
                options={getAvailableCrimes(quarterlyFilter.categories)}
                selected={quarterlyFilter.crimes}
                onChange={(v) => setQuarterlyFilter(prev => ({ ...prev, crimes: v }))}
                disabled={false}
                width="w-[140px]"
              />
              {/* 5. UPDATED: Added Barangay Filter to Quarterly Chart */}
              <MultiSelectFilter
                label="Barangay"
                options={barangays}
                selected={quarterlyFilter.barangays}
                onChange={(v) => setQuarterlyFilter(prev => ({ ...prev, barangays: v }))}
                width="w-[140px]"
                align="end"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={quarterlyDistData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} dy={10} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px' }} />
                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={80} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card ref={clockChartRef}>
        <CardHeader>
          <div className="flex flex-col xl:flex-row justify-between xl:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-purple-500" />
                Crime Clock (Time of Day)
                <CopyButton targetRef={clockChartRef} />
              </CardTitle>
              <CardDescription>Incidents by hour of the day (00:00 - 23:00)</CardDescription>
            </div>
            <div className="grid grid-cols-2 md:flex md:flex-wrap gap-2">
              <MultiSelectFilter
                label="Year"
                options={years}
                selected={clockFilter.years}
                onChange={(v) => setClockFilter(prev => ({ ...prev, years: v }))}
                width="w-[100px]"
              />
              <MultiSelectFilter
                label="Month"
                options={monthOptions.map(m => getMonthName(m))}
                selected={clockFilter.months.map(m => getMonthName(m))}
                onChange={(v) => {
                  const monthNums = v.map(name => {
                    const idx = monthOptions.findIndex(m => getMonthName(m) === name);
                    return (idx + 1).toString();
                  });
                  setClockFilter(prev => ({ ...prev, months: monthNums }));
                }}
                width="w-[100px]"
              />
              <MultiSelectFilter
                label="Categorie"
                options={categories}
                selected={clockFilter.categories}
                onChange={(v) => setClockFilter(prev => ({ ...prev, categories: v, crimes: [] }))}
                width="w-[140px]"
              />
              <MultiSelectFilter
                label="Specific Crime"
                options={getAvailableCrimes(clockFilter.categories)}
                selected={clockFilter.crimes}
                onChange={(v) => setClockFilter(prev => ({ ...prev, crimes: v }))}
                disabled={false}
                width="w-[140px]"
              />
              {/* 5. UPDATED: Added Barangay Filter to Clock Chart */}
              <MultiSelectFilter
                label="Barangay"
                options={barangays}
                selected={clockFilter.barangays}
                onChange={(v) => setClockFilter(prev => ({ ...prev, barangays: v }))}
                width="w-[140px]"
                align="end"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={clockData} margin={{ top: 10, right: 0, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                <XAxis
                  dataKey="hour"
                  axisLine={false}
                  tickLine={false}
                  dy={10}
                  fontSize={10}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px' }} />
                <Bar dataKey="count" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card ref={dayChartRef}>
        <CardHeader>
          <div className="flex flex-col xl:flex-row justify-between xl:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-orange-500" />
                Day of the Week
                <CopyButton targetRef={dayChartRef} />
              </CardTitle>
              <CardDescription>Incidents frequency by day</CardDescription>
            </div>
            <div className="grid grid-cols-2 md:flex md:flex-wrap gap-2">
              <MultiSelectFilter
                label="Year"
                options={years}
                selected={dayFilter.years}
                onChange={(v) => setDayFilter(prev => ({ ...prev, years: v }))}
                width="w-[100px]"
              />
              <MultiSelectFilter
                label="Month"
                options={monthOptions.map(m => getMonthName(m))}
                selected={dayFilter.months.map(m => getMonthName(m))}
                onChange={(v) => {
                  const monthNums = v.map(name => {
                    const idx = monthOptions.findIndex(m => getMonthName(m) === name);
                    return (idx + 1).toString();
                  });
                  setDayFilter(prev => ({ ...prev, months: monthNums }));
                }}
                width="w-[100px]"
              />
              <MultiSelectFilter
                label="Categorie"
                options={categories}
                selected={dayFilter.categories}
                onChange={(v) => setDayFilter(prev => ({ ...prev, categories: v, crimes: [] }))}
                width="w-[140px]"
              />
              <MultiSelectFilter
                label="Specific Crime"
                options={getAvailableCrimes(dayFilter.categories)}
                selected={dayFilter.crimes}
                onChange={(v) => setDayFilter(prev => ({ ...prev, crimes: v }))}
                disabled={false}
                width="w-[140px]"
              />
              {/* 5. UPDATED: Added Barangay Filter to Day Chart */}
              <MultiSelectFilter
                label="Barangay"
                options={barangays}
                selected={dayFilter.barangays}
                onChange={(v) => setDayFilter(prev => ({ ...prev, barangays: v }))}
                width="w-[140px]"
                align="end"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dayOfWeekData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} dy={10} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px' }} />
                <Bar dataKey="count" fill="#f97316" radius={[4, 4, 0, 0]} maxBarSize={60} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6">
        <ComparisonCharts />
      </div>

    </div>
  )
}