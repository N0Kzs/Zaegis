import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Grid3X3, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DeploymentTableSkeleton } from '@/components/skeletons/DeploymentPageSkeleton';

import type { HybridSchedule, HybridPerson } from '../types';
import { getRole, TIME_BLOCKS_FULL, ROSTER_BLOCKS } from '../utils';

interface RosterViewProps {
    isGenerating: boolean;
    weeklySchedules: HybridSchedule[];
    draftedPersonnel: HybridPerson[];
    weekDays: Date[];
    schedulesByDay: Record<string, HybridSchedule[]>;
}

const ROSTER_PAGE_SIZE = 12;

export function RosterView({
    isGenerating,
    weeklySchedules,
    draftedPersonnel,
    weekDays,
    schedulesByDay
}: RosterViewProps) {
    const [rosterSearch, setRosterSearch] = useState('');
    const [rosterDayFilter, setRosterDayFilter] = useState('All');
    const [rosterPage, setRosterPage] = useState(1);
    const [rosterView, setRosterView] = useState<'4-hour' | '8-hour' | '12-hour'>('4-hour');

    const filteredRosterPersonnel = useMemo(() => {
        if (!rosterSearch.trim()) return draftedPersonnel;
        const q = rosterSearch.toLowerCase();
        return draftedPersonnel.filter(p =>
            p.name.toLowerCase().includes(q) ||
            getRole(p).toLowerCase().includes(q)
        );
    }, [draftedPersonnel, rosterSearch]);

    const filteredWeekDays = useMemo(() => {
        if (rosterDayFilter === 'All') return weekDays;
        return weekDays.filter(d => format(d, 'EEE') === rosterDayFilter);
    }, [weekDays, rosterDayFilter]);

    const getAssignedVehicle = (personId: number, targetDate: Date, timeSlot: string): string | null => {
        const dayKey = format(targetDate, 'yyyy-MM-dd');
        const daySchedules = schedulesByDay[dayKey] || [];
        const shift = daySchedules.find(s =>
            s.timeSlot === timeSlot &&
            s.assignedPersonnel.some(p => p.id === personId)
        );
        return shift ? shift.vehicleName : null;
    };

    if (isGenerating) {
        return <div className="animate-in fade-in duration-200"><DeploymentTableSkeleton /></div>;
    }

    if (weeklySchedules.length === 0) {
        return (
            <div className="animate-in fade-in duration-200">
                <div className="text-center py-16 bg-card rounded-xl border border-dashed">
                    <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                        <Grid3X3 className="w-7 h-7 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm text-muted-foreground">Generate a plan to see the roster matrix</p>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in duration-200">
            <div className="bg-card rounded-xl border shadow-sm overflow-auto">
                <div className="bg-muted/30/50 px-6 py-4 border-b flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-semibold text-foreground">Personnel Roster</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Shows assigned patrol car per time block.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            placeholder="Search personnel..."
                            className="border rounded-md px-2 h-8 text-xs outline-none focus:ring-1 focus:ring-brand w-36"
                            value={rosterSearch}
                            onChange={e => {
                                setRosterSearch(e.target.value);
                                setRosterPage(1);
                            }}
                        />
                        <select
                            className="border rounded-md px-2 h-8 text-xs outline-none focus:ring-1 focus:ring-brand"
                            value={rosterDayFilter}
                            onChange={e => setRosterDayFilter(e.target.value)}
                        >
                            <option value="All">All Days</option>
                            {weekDays.map(d => (
                                <option key={d.toString()} value={format(d, 'EEE')}>{format(d, 'EEEE')}</option>
                            ))}
                        </select>
                        <div className="w-px h-6 bg-muted mx-1"></div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8"
                            onClick={() => setRosterPage(p => Math.max(1, p - 1))}
                            disabled={rosterPage === 1}
                        >
                            <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                        </Button>
                        <span className="text-xs font-medium text-muted-foreground min-w-[60px] text-center">
                            Page {rosterPage} of {Math.ceil(filteredRosterPersonnel.length / ROSTER_PAGE_SIZE) || 1}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8"
                            onClick={() => setRosterPage(p => Math.min(Math.ceil(filteredRosterPersonnel.length / ROSTER_PAGE_SIZE), p + 1))}
                            disabled={rosterPage >= Math.ceil(filteredRosterPersonnel.length / ROSTER_PAGE_SIZE) || filteredRosterPersonnel.length === 0}
                        >
                            Next <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse min-w-[1300px]">
                        <thead className="bg-muted/30 text-muted-foreground uppercase tracking-wider">
                            <tr>
                                <th className="p-3 border-r border-b sticky left-0 z-20 bg-muted/30 w-52">
                                    <div className="text-[10px] font-bold">Personnel / Role</div>
                                </th>
                                {filteredWeekDays.map(d => (
                                    <th key={d.toString()} colSpan={ROSTER_BLOCKS[rosterView].labels.length}
                                        className="p-2 border-r border-b text-center font-bold text-[11px]">
                                        {format(d, 'EEE d')}
                                    </th>
                                ))}
                            </tr>
                            <tr>
                                <th className="p-2 border-r border-b bg-muted/30 sticky left-0 z-20" />
                                {filteredWeekDays.map((d, dIdx) =>
                                    ROSTER_BLOCKS[rosterView].labels.map((block, bIdx) => (
                                        <th key={`${dIdx}-${bIdx}`}
                                            className="p-1 border-r border-b text-center text-[9px] font-medium text-muted-foreground/70 bg-muted/30 w-12">
                                            {block}
                                        </th>
                                    ))
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredRosterPersonnel.length === 0 ? (
                                <tr>
                                    <td colSpan={100} className="p-8 text-center text-muted-foreground/70">
                                        No personnel matches the filter.
                                    </td>
                                </tr>
                            ) : (
                                filteredRosterPersonnel
                                    .slice((rosterPage - 1) * ROSTER_PAGE_SIZE, rosterPage * ROSTER_PAGE_SIZE)
                                    .map((person, idx) => {
                                        const role = getRole(person);
                                        return (
                                            <tr key={person.id} className={idx % 2 === 0 ? 'bg-card' : 'bg-muted/30/30'}>
                                                <td className="p-2 border-r border-b bg-card sticky left-0 z-10 max-w-[210px]">
                                                    <div className="font-bold text-foreground/90 truncate text-xs">
                                                        {person.name}
                                                    </div>
                                                    <div className="flex items-center gap-1 mt-0.5">
                                                        <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-brand" />
                                                        <span className="text-[10px] font-medium truncate text-brand">
                                                            {role}
                                                        </span>
                                                    </div>
                                                </td>
                                                {filteredWeekDays.map((day, dIdx) => {
                                                    const shiftWindow = (() => {
                                                        const patrolIndices = [0, 1, 2, 3, 4, 5].filter(i => getAssignedVehicle(person.id, day, TIME_BLOCKS_FULL[i]));
                                                        if (patrolIndices.length === 0) {
                                                            const isDayShift = (person.id + day.getDate()) % 2 === 0;
                                                            return isDayShift ? [2, 3, 4] : [5, 0, 1];
                                                        }
                                                        const blocks = new Set(patrolIndices);
                                                        let min = Math.min(...patrolIndices);
                                                        let max = Math.max(...patrolIndices);
                                                        while (blocks.size < 3) {
                                                            if (max < 5) { max++; blocks.add(max); }
                                                            else if (min > 0) { min--; blocks.add(min); }
                                                            else break;
                                                        }
                                                        return Array.from(blocks);
                                                    })();

                                                    let isOff = false;
                                                    if (person.dutyDays) {
                                                        const availableDays = person.dutyDays.split(',').map((d: string) => d.trim().substring(0, 3).toLowerCase());
                                                        const dayCode = format(day, 'EEE').toLowerCase();
                                                        isOff = !availableDays.includes(dayCode);
                                                    } else {
                                                        const targetDayOfWeek = day.getDay();
                                                        const shift = person.id % 7;
                                                        isOff = targetDayOfWeek === shift || targetDayOfWeek === ((shift + 1) % 7);
                                                    }

                                                    return ROSTER_BLOCKS[rosterView].labels.map((blockLabel, bIdx) => {
                                                        const indices = ROSTER_BLOCKS[rosterView].indices[bIdx];
                                                        const vehicles = indices.map(i => getAssignedVehicle(person.id, day, TIME_BLOCKS_FULL[i])).filter(Boolean);
                                                        const vehicleName = vehicles[0] || null;

                                                        const isEndOfDay = bIdx === ROSTER_BLOCKS[rosterView].labels.length - 1;

                                                        const isActiveShift = indices.some(i => shiftWindow.includes(i));
                                                        const statusText = isOff ? 'Off' : (isActiveShift ? 'Office' : 'Rest');

                                                        return (
                                                            <td key={`${dIdx}-${bIdx}`}
                                                                title={vehicleName ? `${vehicleName} — ${blockLabel}` : undefined}
                                                                className={`border-r border-b p-0 ${isEndOfDay ? 'border-r-gray-300 border-r-2' : ''}`}>
                                                                <div className="w-full h-full min-h-[36px] flex items-center justify-center px-0.5">
                                                                    {vehicleName ? (
                                                                        <span className="text-[10px] font-medium text-foreground/80 block truncate max-w-[80px] mx-auto" title={vehicleName}>
                                                                            {vehicleName}
                                                                        </span>
                                                                    ) : (
                                                                        <span className={`text-[10px] ${isOff ? 'text-red-400' : 'text-muted-foreground/70'} block truncate mx-auto`}>
                                                                            {statusText}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        );
                                                    });
                                                })}
                                            </tr>
                                        );
                                    })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
