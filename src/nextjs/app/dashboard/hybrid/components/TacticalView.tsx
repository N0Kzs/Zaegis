import React from 'react';
import { Clock, Car, ShieldAlert, Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DeploymentTableSkeleton } from '@/components/skeletons/DeploymentPageSkeleton';
import { getBarangayRiskColor } from '@/lib/utils/risk-colors';

import type { HybridSchedule } from '../types';
import { getRole, getBlockPeriod } from '../utils';

interface TacticalViewProps {
    isGenerating: boolean;
    weeklySchedules: HybridSchedule[];
    dailyGroupedData: HybridSchedule[];
    isReadOnly: boolean;
    setEditingShift: (shift: HybridSchedule) => void;
    riskMap: Map<string, number>;
    maxRisk: number;
}

export function TacticalView({
    isGenerating,
    weeklySchedules,
    dailyGroupedData,
    isReadOnly,
    setEditingShift,
    riskMap,
    maxRisk
}: TacticalViewProps) {
    if (isGenerating) {
        return <div className="space-y-6 animate-in fade-in duration-200"><DeploymentTableSkeleton /></div>;
    }
    if (weeklySchedules.length === 0) {
        return (
            <div className="space-y-6 animate-in fade-in duration-200">
                <div className="text-center py-16 bg-card rounded-xl border border-dashed">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                        <ShieldAlert className="w-8 h-8 text-muted-foreground/50" />
                    </div>
                    <h3 className="text-foreground font-medium mb-1">No AI Routes Generated</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                        Click "Generate Hybrid Plan" to let the AI process crime data, draft available personnel,
                        and plot 5MRT hotspots.
                    </p>
                </div>
            </div>
        );
    }

    // Group by time block
    const grouped: Record<string, HybridSchedule[]> = {};
    dailyGroupedData.forEach(d => {
        if (!grouped[d.timeSlot]) grouped[d.timeSlot] = [];
        grouped[d.timeSlot].push(d);
    });

    const sortedSlots = Object.keys(grouped).sort((a, b) => {
        const ha = parseInt(a.split(':')[0]);
        const hb = parseInt(b.split(':')[0]);
        return ha - hb;
    });

    if (sortedSlots.length === 0) {
        return (
            <div className="space-y-6 animate-in fade-in duration-200">
                <div className="bg-card rounded-xl border shadow-sm p-8 text-center text-muted-foreground text-sm">
                    No deployments for this day.
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-200">
            <div className="space-y-6">
                {sortedSlots.map(slot => {
                    const shifts = grouped[slot];
                    const period = getBlockPeriod(slot);
                    return (
                        <div key={slot} className="bg-card rounded-xl border shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <div className={`px-4 py-3 border-b flex items-center justify-between bg-muted/40`}>
                                <h3 className="font-semibold text-sm flex items-center gap-2 text-foreground/90">
                                    <Clock className="w-4 h-4" />
                                    {slot}
                                    <Badge className={`${period.bg} ${period.text} border-0 text-[10px] ml-2`}>
                                        {period.label}
                                    </Badge>
                                </h3>
                                <Badge variant="secondary" className="text-xs bg-card">{shifts.length} Teams</Badge>
                            </div>
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-muted-foreground uppercase bg-muted/30 border-b">
                                    <tr>
                                        <th className="px-6 py-3 font-medium w-[140px]">Vehicle</th>
                                        <th className="px-6 py-3 font-medium">Personnel</th>
                                        <th className="px-6 py-3 font-medium">Coverage Areas</th>
                                        {!isReadOnly && <th className="px-6 py-3 text-right">Actions</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {shifts.sort((a, b) => a.vehicleName.localeCompare(b.vehicleName)).map(d => (
                                        <tr key={d.id} className="hover:bg-muted/50/50 transition-colors group">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                                    <Car className="w-4 h-4 text-brand" />
                                                    {d.vehicleName}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    {d.assignedPersonnel.map((p) => (
                                                        <div key={p.id} className="text-xs text-foreground/80 flex items-center gap-1.5">
                                                            <span className="font-medium">{p.name}</span>
                                                            <span className="text-muted-foreground/70">·</span>
                                                            <span className="text-muted-foreground/70">{getRole(p)}</span>
                                                        </div>
                                                    ))}
                                                    {d.assignedPersonnel.length === 0 && (
                                                        <span className="text-xs text-muted-foreground/70 italic">No personnel assigned</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-1.5">
                                                    {d.coverageAreas.map((area) => {
                                                        const rc = getBarangayRiskColor(area, riskMap, maxRisk);
                                                        return (
                                                            <Badge key={area} variant="outline" className={`font-normal ${rc.bg} ${rc.text} ${rc.border}`}>
                                                                {area}
                                                            </Badge>
                                                        );
                                                    })}
                                                    {d.coverageAreas.length === 0 && (
                                                        <span className="text-xs text-muted-foreground/70 italic">—</span>
                                                    )}
                                                </div>
                                            </td>
                                            {!isReadOnly && (
                                                <td className="px-6 py-4 text-right">
                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-end gap-1">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-brand" onClick={() => setEditingShift(d)}>
                                                            <Pencil className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
