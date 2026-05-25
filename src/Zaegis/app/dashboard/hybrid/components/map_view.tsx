import React from 'react';
import { format } from 'date-fns';
import { MapPin, Car } from 'lucide-react';
import { DeploymentMapSkeleton } from '@/components/skeletons/DeploymentSkeletons';

import type { HybridSchedule } from '../types';
import { TIME_BLOCKS_FULL } from '../utils';

interface MapViewProps {
    weeklySchedules: HybridSchedule[];
    isGenerating: boolean;
    isMapLoading: boolean;
    mapTimeSlot: string;
    setMapTimeSlot: (slot: string) => void;
    mapContainer: React.RefObject<HTMLDivElement>;
    dailyGroupedData: HybridSchedule[];
    selectedDate: Date;
}

export function MapView({
    weeklySchedules,
    isGenerating,
    isMapLoading,
    mapTimeSlot,
    setMapTimeSlot,
    mapContainer,
    dailyGroupedData,
    selectedDate
}: MapViewProps) {
    return (
        <div className="animate-in fade-in duration-200">
            {weeklySchedules.length === 0 ? (
                <div className="text-center py-16 bg-card rounded-xl border border-dashed">
                    <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                        <MapPin className="w-7 h-7 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm text-muted-foreground">Generate a plan to view map shipments</p>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="bg-card px-2 py-3 rounded-xl border shadow-sm flex items-center gap-4">
                        <div className="text-sm font-semibold text-foreground/80 ml-2">Time Slot Filter:</div>
                        <select
                            className="border-border border rounded-md text-sm p-1.5 focus:outline-none focus:ring-2 focus:ring-brand bg-card"
                            value={mapTimeSlot}
                            onChange={e => setMapTimeSlot(e.target.value)}
                        >
                            {TIME_BLOCKS_FULL.map(slot => (
                                <option key={slot} value={slot}>{slot}</option>
                            ))}
                        </select>
                    </div>
                    <div className="bg-card rounded-xl border shadow-sm p-1 relative h-[600px] group">
                        {(isGenerating || isMapLoading) && (
                            <div className="absolute inset-0 z-50 bg-card rounded-xl flex items-center justify-center"><DeploymentMapSkeleton /></div>
                        )}
                        <div ref={mapContainer} className="w-full h-full rounded-lg bg-muted/30" />
                        {(!isGenerating && !isMapLoading) && (
                            <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
                                <div className="bg-card/95 px-4 py-3 rounded-md shadow-md border border-border font-medium z-10 flex flex-col gap-1 backdrop-blur-sm pointer-events-auto">
                                    <div className="text-muted-foreground text-[10px] uppercase tracking-wider font-bold">Planned Units To Assign</div>
                                    <div className="text-2xl font-bold text-brand flex items-center gap-2">
                                        <Car className="w-5 h-5" />
                                        {dailyGroupedData.filter(d => d.timeSlot === mapTimeSlot).length}
                                        <span className="text-sm font-normal text-muted-foreground">
                                            Units on {format(selectedDate, 'MMM d')} ({mapTimeSlot})
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
