import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DeploymentTableSkeleton } from '@/components/skeletons/DeploymentSkeletons';
import type { PersonnelWithRelations } from '@/lib/optimization/5mrt-optimization';
import { ROSTER_PAGE_SIZE } from '../utils';

interface RosterMatrixData {
    days: Date[];
    slots: string[];
    data: { person: PersonnelWithRelations; schedule: Record<string, string> }[];
}

interface RosterMatrixViewProps {
    isGenerating: boolean;
    rosterMatrix: RosterMatrixData;
}

export function RosterMatrixView({
    isGenerating,
    rosterMatrix
}: RosterMatrixViewProps) {
    const [rosterSearch, setRosterSearch] = useState('');
    const [rosterDayFilter, setRosterDayFilter] = useState('All');
    const [rosterPage, setRosterPage] = useState(1);

    const filteredRosterMatrix = useMemo(() => {
        let filteredData = rosterMatrix.data;
        if (rosterSearch.trim()) {
            const q = rosterSearch.toLowerCase();
            filteredData = filteredData.filter(row =>
                row.person.name.toLowerCase().includes(q) ||
                (row.person.role?.name || '').toLowerCase().includes(q) ||
                (row.person.position?.name || '').toLowerCase().includes(q)
            );
        }

        let filteredDays = rosterMatrix.days;
        if (rosterDayFilter !== 'All') {
            filteredDays = filteredDays.filter(d => format(d, 'EEE') === rosterDayFilter);
        }

        return { ...rosterMatrix, data: filteredData, days: filteredDays };
    }, [rosterMatrix, rosterSearch, rosterDayFilter]);

    const totalPages = Math.ceil(filteredRosterMatrix.data.length / ROSTER_PAGE_SIZE) || 1;

    if (isGenerating) {
        return <DeploymentTableSkeleton />;
    }

    return (
        <div className="bg-card rounded-xl border shadow-sm overflow-auto">
            <div className="bg-muted/30/50 px-6 py-4 border-b flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-semibold text-foreground">Personnel Roster (Patrol & Operations)</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Shows assigned patrol car per time block.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <input
                        placeholder="Search personnel..."
                        className="border border-border rounded-md px-2 h-8 text-xs outline-none focus:ring-1 focus:ring-brand w-36 bg-background"
                        value={rosterSearch}
                        onChange={e => {
                            setRosterSearch(e.target.value);
                            setRosterPage(1);
                        }}
                    />
                    <select
                        className="border border-border rounded-md px-2 h-8 text-xs outline-none focus:ring-1 focus:ring-brand bg-background"
                        value={rosterDayFilter}
                        onChange={e => setRosterDayFilter(e.target.value)}
                    >
                        <option value="All">All Days</option>
                        {rosterMatrix.days.map(d => (
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
                        Page {rosterPage} of {totalPages}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() => setRosterPage(p => Math.min(totalPages, p + 1))}
                        disabled={rosterPage >= totalPages || filteredRosterMatrix.data.length === 0}
                    >
                        Next <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                </div>
            </div>
            <table className="w-full text-left text-sm border-collapse min-w-[1000px]">
                <thead className="bg-muted/30 text-muted-foreground text-xs uppercase tracking-wider">
                    <tr>
                        <th className="p-3 border-r w-48 sticky left-0 z-20 bg-muted/30">Officer</th>
                        {filteredRosterMatrix.days.map(d => (
                            <th key={d.toString()} colSpan={filteredRosterMatrix.slots.length} className="p-2 border-r text-center">{format(d, 'EEE')}</th>
                        ))}
                    </tr>
                    <tr>
                        <th className="p-2 border-r bg-muted/30 border-b"></th>
                        {filteredRosterMatrix.days.map(d => (
                            filteredRosterMatrix.slots.map(slot => (
                                <th key={`${d.toISOString()}-${slot}`} className="p-1 border-r border-b text-center text-[10px] font-medium text-muted-foreground bg-muted/30/50">
                                    {slot.split(' - ').map(t => t.split(':')[0]).join('-')}
                                </th>
                            ))
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-border">
                    {filteredRosterMatrix.data.length === 0 ? (
                        <tr>
                            <td colSpan={100} className="p-8 text-center text-muted-foreground/70">
                                No personnel matches the filter.
                            </td>
                        </tr>
                    ) : (
                        filteredRosterMatrix.data
                            .slice((rosterPage - 1) * ROSTER_PAGE_SIZE, rosterPage * ROSTER_PAGE_SIZE)
                            .map((row, idx) => (
                                <tr key={row.person.id} className={idx % 2 === 0 ? 'bg-card' : 'bg-muted/30/30'}>
                                    <td className="p-2 border-r font-medium text-xs bg-card sticky left-0 z-10 truncate max-w-[200px]">
                                        <div className="font-bold text-foreground/90">{row.person.name}</div>
                                        <div className="text-[9px] text-muted-foreground/70 font-normal">{row.person.position?.name} • {row.person.role?.name}</div>
                                    </td>
                                    {filteredRosterMatrix.days.map(d => {
                                        const dateKey = format(d, 'yyyy-MM-dd');

                                        // Try to estimate Shift 1/2 visually
                                        const shiftWindow = (() => {
                                            const patrolIndices: number[] = [];
                                            filteredRosterMatrix.slots.forEach((slotStr, idx) => {
                                                if (row.schedule[`${dateKey}_${slotStr}`]) {
                                                    patrolIndices.push(idx);
                                                }
                                            });

                                            if (patrolIndices.length === 0) {
                                                const isDayShift = (Number(row.person.id) + d.getDate()) % 2 === 0;
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

                                        return filteredRosterMatrix.slots.map((slotStr, bIdx) => {
                                            const timeKey = `${dateKey}_${slotStr}`;
                                            const val = row.schedule[timeKey];

                                            const targetDayOfWeek = d.getDay();
                                            const shift = Number(row.person.id) % 7;
                                            let isOff = targetDayOfWeek === shift || targetDayOfWeek === ((shift + 1) % 7);

                                            if (val) isOff = false;

                                            let bgClass = "bg-card";
                                            if (val) {
                                                bgClass = "bg-green-500/15 text-green-700 dark:text-green-400 font-bold border-green-500/20 border";
                                            } else if (isOff) {
                                                bgClass = "bg-muted text-muted-foreground/50";
                                            } else if (shiftWindow.includes(bIdx)) {
                                                bgClass = "bg-brand/5 text-brand/50";
                                            }

                                            return (
                                                <td key={timeKey} className={`p-1 border-r text-[10px] text-center ${bgClass}`}>
                                                    <div className="w-full text-center truncate px-0.5">
                                                        {val ? val : (isOff ? 'OFF' : '')}
                                                    </div>
                                                </td>
                                            );
                                        });
                                    })}
                                </tr>
                            ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
