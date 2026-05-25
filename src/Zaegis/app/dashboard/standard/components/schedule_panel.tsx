"use client";

import { Clock, PlusCircle, Edit2, Trash2, Car } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DeploymentTableSkeleton } from '@/components/skeletons/DeploymentPageSkeleton';
import { getBarangayRiskColor } from '@/lib/utils/risk_colors';
import type { PatrolSchedule } from "../utils";

interface SchedulePanelProps {
    weekDates: { date: string; dayName: string; dayNumber: string }[];
    schedules: PatrolSchedule[];
    weekHasBeenSaved: boolean;
    isTableLoading: boolean;
    riskMap: Map<string, number>;
    maxRisk: number;
    onAddTimeSlot: (date: string) => void;
    onEditSchedule: (schedule: PatrolSchedule) => void;
    onRemoveTimeSlot: (id: string) => void;
}

export function SchedulePanel({
    weekDates,
    schedules,
    weekHasBeenSaved,
    isTableLoading,
    riskMap,
    maxRisk,
    onAddTimeSlot,
    onEditSchedule,
    onRemoveTimeSlot,
}: SchedulePanelProps) {
    return (
        <div className="animate-in fade-in duration-200">
            <Tabs defaultValue={weekDates[0].date} className="w-full">
                <TabsList className="grid grid-cols-7 w-full h-auto p-1 bg-card border shadow-sm rounded-xl mb-4">
                    {weekDates.map(day => (
                        <TabsTrigger
                            key={day.date}
                            value={day.date}
                            className="flex flex-col py-2.5 rounded-lg data-[state=active]:bg-brand/15 data-[state=active]:text-brand transition-all border-transparent border-2 data-[state=active]:border-brand/20"
                        >
                            <span className="text-xs font-medium text-muted-foreground mb-0.5">{day.dayName}</span>
                            <span className="text-lg font-bold">{day.dayNumber}</span>
                        </TabsTrigger>
                    ))}
                </TabsList>

                {weekDates.map(day => {
                    const daySchedules = schedules.filter(s => s.date === day.date);
                    return (
                        <TabsContent key={day.date} value={day.date} className="animate-in fade-in duration-300">
                            <Card className="border-none shadow-sm ring-1 ring-border">
                                <CardHeader className="flex flex-row items-center justify-between py-4 px-6 border-b bg-muted/30/30">
                                    <div>
                                        <CardTitle className="text-base font-semibold text-foreground">
                                            {format(new Date(day.date), 'EEEE, MMMM d')}
                                        </CardTitle>
                                        <CardDescription className="text-xs mt-0.5">
                                            {daySchedules.length} active deployment{daySchedules.length !== 1 ? 's' : ''}
                                        </CardDescription>
                                    </div>
                                    {!weekHasBeenSaved && (
                                        <Button variant="outline" size="sm" onClick={() => onAddTimeSlot(day.date)} className="h-8">
                                            <PlusCircle className="mr-2 h-3.5 w-3.5" />
                                            Add Shift
                                        </Button>
                                    )}
                                </CardHeader>
                                <div className="overflow-x-auto">
                                    {isTableLoading ? (
                                        <DeploymentTableSkeleton />
                                    ) : (
                                        daySchedules.length === 0 ? (
                                            <div className="text-center py-16">
                                                <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-4 border border-border">
                                                    <Clock className="w-8 h-8 text-muted-foreground/50" />
                                                </div>
                                                <h3 className="text-foreground font-medium mb-1">No shifts scheduled</h3>
                                                <p className="text-sm text-muted-foreground">
                                                    {weekHasBeenSaved ? "This day has no deployments." : "Generate a schedule or add shifts manually."}
                                                </p>
                                            </div>
                                        ) : (
                                            <table className="w-full text-sm text-left">
                                                <thead className="text-xs text-muted-foreground uppercase bg-muted/30 border-b">
                                                    <tr>
                                                        <th className="px-6 py-3 font-medium">Time Slot</th>
                                                        <th className="px-6 py-3 font-medium">Team & Resources</th>
                                                        <th className="px-6 py-3 font-medium">Patrol Areas</th>
                                                        {!weekHasBeenSaved && <th className="px-6 py-3 text-right">Actions</th>}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border">
                                                    {daySchedules.map((schedule) => (
                                                        <tr key={schedule.id} className="hover:bg-muted/50/50 transition-colors group">
                                                            <td className="px-6 py-4 whitespace-nowrap font-medium text-foreground w-[180px]">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-brand/80"></div>
                                                                    {schedule.timeSlot}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <div className="space-y-3">
                                                                    {/* Personnel */}
                                                                    <div className="flex flex-col gap-1">
                                                                        {schedule.personnel?.map((p, i) => (
                                                                            <div key={i} className="text-xs text-foreground/80">
                                                                                {p.name}
                                                                            </div>
                                                                        ))}
                                                                        {(!schedule.personnel || schedule.personnel.length === 0) && (
                                                                            <span className="text-xs text-muted-foreground/70 italic">No personnel assigned</span>
                                                                        )}
                                                                    </div>
                                                                    {/* Car */}
                                                                    {schedule.patrolCar && (
                                                                        <div className="flex items-center gap-2 text-xs text-brand bg-brand/10 w-fit px-2 py-1 rounded-md">
                                                                            <Car className="w-3.5 h-3.5" />
                                                                            {schedule.patrolCar}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <div className="flex flex-wrap gap-1.5">
                                                                    {schedule.areas?.map((area, i) => {
                                                                        const rc = getBarangayRiskColor(area, riskMap, maxRisk);
                                                                        return (
                                                                            <Badge key={i} variant="outline" className={`font-normal ${rc.bg} ${rc.text} ${rc.border}`}>
                                                                                {area}
                                                                            </Badge>
                                                                        );
                                                                    })}
                                                                    {(!schedule.areas || schedule.areas.length === 0) && (
                                                                        <span className="text-xs text-muted-foreground/70 italic">—</span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            {!weekHasBeenSaved && (
                                                                <td className="px-6 py-4 text-right">
                                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-end gap-1">
                                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-brand hover:bg-brand/10" onClick={() => onEditSchedule(schedule)}>
                                                                            <Edit2 className="w-4 h-4" />
                                                                        </Button>
                                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => onRemoveTimeSlot(schedule.id!)}>
                                                                            <Trash2 className="w-4 h-4" />
                                                                        </Button>
                                                                    </div>
                                                                </td>
                                                            )}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )
                                    )}
                                </div>
                            </Card>
                        </TabsContent>
                    );
                })}
            </Tabs>
        </div>
    );
}
