/**
 * @file Toolbar component for the hybrid planning mode view.
 *
 * Renders week navigation, status badges, and contextual action buttons
 * based on the current draft state.
 */

'use client';

import { format, startOfWeek, addDays } from 'date-fns';
import {
  ChevronLeft, ChevronRight, ChevronDown, RefreshCw, Download, Zap, Save,
  CheckCircle2, FileText, FileSpreadsheet, Calendar as CalendarIcon, Car,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface HybridToolbarProps {
  selectedDate: Date;
  setSelectedDate: (d: Date) => void;
  weekStart: Date;
  weekEnd: Date;
  isReadOnly: boolean;
  hasChanges: boolean;
  schedulesLength: number;
  isGenerating: boolean;
  ignoreSchedule: boolean;
  setIgnoreSchedule: (v: boolean) => void;
  onGenerate: () => void;
  onSaveConfirm: () => void;
  onClearConfirm: () => void;
  onVehicleDialog: () => void;
  onExportWord: () => void;
  onExportExcel: () => void;
}

export function HybridToolbar({
  selectedDate, setSelectedDate, weekStart, weekEnd,
  isReadOnly, hasChanges, schedulesLength, isGenerating,
  ignoreSchedule, setIgnoreSchedule,
  onGenerate, onSaveConfirm, onClearConfirm, onVehicleDialog,
  onExportWord, onExportExcel,
}: HybridToolbarProps) {
  return (
    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-card p-4 rounded-xl border shadow-sm">
      {/* Left: Week Navigation */}
      <div className="flex items-center gap-3 w-full xl:w-auto">
        <div className="flex items-center bg-muted/30 rounded-lg p-1 border">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => setSelectedDate(startOfWeek(addDays(selectedDate, -7), { weekStartsOn: 1 }))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" className="px-4 text-sm font-semibold text-foreground min-w-[200px] hover:bg-transparent">
                <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground/70" />
                {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <Calendar
                mode="single" selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(startOfWeek(date, { weekStartsOn: 1 }))}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => setSelectedDate(startOfWeek(addDays(selectedDate, 7), { weekStartsOn: 1 }))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {isReadOnly && (
          <Badge variant="secondary" className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/20 px-3 py-1">
            <CheckCircle2 className="w-3 h-3 mr-1.5" /> Locked & Saved
          </Badge>
        )}
        {!isReadOnly && hasChanges && (
          <Badge variant="secondary" className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20 px-3 py-1">
            Draft Mode
          </Badge>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 w-full xl:w-auto justify-end flex-wrap">
        {isReadOnly && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" /> Export <ChevronDown className="w-3 h-3 ml-2 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onExportWord}>
                <FileText className="w-4 h-4 mr-2" /> Export to Word
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onExportExcel}>
                <FileSpreadsheet className="w-4 h-4 mr-2" /> Export to Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {!isReadOnly && hasChanges && (
          <>
            <Button variant="outline" size="sm" onClick={onVehicleDialog} className="gap-2">
              <Car className="w-4 h-4" /> Manage Vehicles
            </Button>
            <div className="w-px h-4 bg-muted mx-1" />
            <Button variant="ghost" size="sm" onClick={onClearConfirm}
              className="text-red-600 hover:bg-red-500/10 hover:text-red-700 dark:hover:text-red-400">
              Clear
            </Button>
            <Button onClick={onSaveConfirm} size="sm"
              className="bg-brand hover:bg-brand/90 text-brand-foreground shadow-sm min-w-[120px]">
              <Save className="w-4 h-4 mr-2" /> Save
            </Button>
          </>
        )}

        {!isReadOnly && !hasChanges && schedulesLength === 0 && (
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Checkbox id="ignore-schedule" checked={ignoreSchedule}
                onCheckedChange={(checked) => setIgnoreSchedule(checked as boolean)} />
              <label htmlFor="ignore-schedule" className="text-sm font-medium text-foreground/80 cursor-pointer">
                Optimization: Ignore Duty Schedule
              </label>
            </div>
            <Button onClick={onGenerate} disabled={isGenerating} size="sm"
              className="bg-brand hover:bg-brand/90 text-brand-foreground shadow-sm min-w-[180px]">
              {isGenerating
                ? <><RefreshCw className="h-4 w-4 animate-spin mr-2" /> Generating...</>
                : <><Zap className="h-4 w-4 mr-2" /> Generate Hybrid Plan</>}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
