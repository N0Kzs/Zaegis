/**
 * @file Map view panel for the daily deployment tab.
 *
 * Renders the day selector, map container with skeleton overlay,
 * shift legend/filter, and daily schedule tables grouped by shift.
 */

'use client';

import React from 'react';
import { format } from 'date-fns';
import { CalendarDays } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DeploymentMapSkeleton } from '@/components/skeletons/DeploymentSkeletons';
import { ShiftTableBlock } from './ShiftTableBlock';
import { getShiftLabel } from '../utils';
import type { ProposedSchedule, DailyGroupedData } from '../types';

interface MapViewPanelProps {
  selectedDate: Date;
  setSelectedDate: (d: Date) => void;
  weekDays: Date[];
  mapContainer: React.RefObject<HTMLDivElement | null>;
  isGenerating: boolean;
  isMapLoading: boolean;
  isReadOnly: boolean;
  activeShiftFilter: string;
  setActiveShiftFilter: (v: string) => void;
  shiftPattern: number;
  dailyGroupedData: DailyGroupedData;
  openEditModal: (team: ProposedSchedule) => void;
  riskMap: Map<string, number>;
  maxRisk: number;
}

export function MapViewPanel({
  selectedDate, setSelectedDate, weekDays, mapContainer,
  isGenerating, isMapLoading, isReadOnly,
  activeShiftFilter, setActiveShiftFilter, shiftPattern,
  dailyGroupedData, openEditModal, riskMap, maxRisk,
}: MapViewPanelProps) {
  const flatShifts = Object.values(dailyGroupedData).flat();
  const shiftsByLabel = flatShifts.reduce((acc, curr) => {
    const lbl = getShiftLabel(curr.timeSlot, shiftPattern);
    if (!acc[lbl]) acc[lbl] = [];
    acc[lbl].push(curr);
    return acc;
  }, {} as Record<string, ProposedSchedule[]>);

  return (
    <div className="space-y-6">
      {/* Day selector */}
      <Tabs value={selectedDate.toISOString()} onValueChange={(v) => setSelectedDate(new Date(v))} className="w-full">
        <TabsList className="grid grid-cols-7 w-full h-auto p-1 bg-card border shadow-sm rounded-xl">
          {weekDays.map((day) => (
            <TabsTrigger
              key={day.toISOString()}
              value={day.toISOString()}
              className="flex flex-col py-2.5 rounded-lg data-[state=active]:bg-brand/10 data-[state=active]:text-brand transition-all border-transparent border-2 data-[state=active]:border-brand/20"
            >
              <span className="text-xs font-medium text-muted-foreground mb-0.5">{format(day, 'EEE')}</span>
              <span className="text-lg font-bold">{format(day, 'd')}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Map container */}
      <div className="bg-card rounded-xl border shadow-sm p-1 relative h-[600px] group">
        {(isGenerating || isMapLoading) && (
          <div className="absolute inset-0 z-50 bg-card rounded-xl">
            <DeploymentMapSkeleton />
          </div>
        )}
        <div ref={mapContainer} className="w-full h-full rounded-lg bg-muted/30" />
        {!isGenerating && !isMapLoading && (
          <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
            <div className="bg-card/95 px-3 py-3 rounded-md shadow-md border border-border text-xs font-medium z-10 flex flex-col gap-2 backdrop-blur-sm pointer-events-auto">
              <div className="text-muted-foreground/70 text-[10px] uppercase tracking-wider font-bold">Shift Legend</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500 border border-white shadow-sm" /> Shift 1</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-purple-500 border border-white shadow-sm" /> Shift 2</div>
            </div>
            <div className="bg-card/95 p-1 rounded-md shadow-md border border-border z-10 backdrop-blur-sm flex gap-1 pointer-events-auto">
              {['Shift 1', 'Shift 2'].map((shift) => (
                <button
                  key={shift}
                  onClick={() => setActiveShiftFilter(shift)}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                    activeShiftFilter === shift
                      ? 'bg-brand/10 text-brand'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {shift}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Daily schedule tables */}
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-muted-foreground" /> Daily Schedule ({format(selectedDate, 'EEEE, MMM d')})
          </h3>
        </div>
        {flatShifts.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-xl border border-dashed text-muted-foreground text-sm">
            No shifts scheduled for this day.
          </div>
        ) : (
          Object.entries(shiftsByLabel)
            .sort()
            .map(([label, shifts]) => (
              <ShiftTableBlock
                key={label}
                shiftLabel={label}
                shifts={shifts}
                isReadOnly={isReadOnly}
                openEditModal={openEditModal}
                riskMap={riskMap}
                maxRisk={maxRisk}
              />
            ))
        )}
      </div>
    </div>
  );
}
